const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { assertReadOnlyCommand } = require('./enforce');

const NODE_MANIFESTS = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
const PYTHON_MANIFESTS = ['pyproject.toml', 'poetry.lock', 'uv.lock'];

function listFiles(repoPath) {
  try {
    return fs.readdirSync(repoPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch (_error) {
    return [];
  }
}

function parseRequirements(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('-'))
    .map((line) => {
      const match = line.match(/^([^=<>!~\s]+)\s*([=<>!~]{1,2})?\s*(.+)?$/);
      return {
        name: match ? match[1] : line,
        specifier: match && match[2] ? `${match[2]}${match[3] ?? ''}` : '',
        raw: line,
      };
    });
}

function detectManifests(repoPath) {
  const files = listFiles(repoPath);
  const manifests = [];
  const unknowns = [];

  for (const name of NODE_MANIFESTS) {
    if (!files.includes(name)) continue;
    const manifest = { path: name, ecosystem: 'node', parsed: false };
    if (name === 'package.json') {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(repoPath, name), 'utf8'));
        manifest.parsed = true;
        manifest.name = data.name ?? null;
        manifest.dependencies = Object.keys(data.dependencies ?? {});
        manifest.devDependencies = Object.keys(data.devDependencies ?? {});
      } catch (error) {
        manifest.error = error.message;
        unknowns.push(`${name} could not be parsed as JSON.`);
      }
    }
    manifests.push(manifest);
  }

  for (const name of PYTHON_MANIFESTS) {
    if (files.includes(name)) {
      manifests.push({ path: name, ecosystem: 'python', parsed: false });
      unknowns.push(`${name} detected but deep parsing is not implemented without extra dependencies.`);
    }
  }

  for (const name of files.filter((file) => /^requirements.*\.txt$/i.test(file))) {
    try {
      const requirements = parseRequirements(fs.readFileSync(path.join(repoPath, name), 'utf8'));
      manifests.push({ path: name, ecosystem: 'python', parsed: true, requirements });
    } catch (error) {
      manifests.push({ path: name, ecosystem: 'python', parsed: false, error: error.message });
      unknowns.push(`${name} could not be read.`);
    }
  }

  return { manifests, unknowns };
}

function inferEcosystems(manifests, requested) {
  if (requested) return [requested];
  return [...new Set(manifests.map((manifest) => manifest.ecosystem))];
}

function runInspection(repoPath, command, args) {
  assertReadOnlyCommand([command, ...args].join(' '));
  try {
    return {
      checked: true,
      ok: true,
      command: [command, ...args].join(' '),
      stdout: execFileSync(command, args, {
        cwd: repoPath,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).toString(),
      stderr: '',
    };
  } catch (error) {
    return {
      checked: true,
      ok: false,
      command: [command, ...args].join(' '),
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : error.message,
    };
  }
}

function parseVersion(value) {
  if (!value) return null;
  const match = String(value).trim().replace(/^[^0-9]*/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function classifySemverChange(current, latest) {
  const from = parseVersion(current);
  const to = parseVersion(latest);
  if (!from || !to) return 'unknown';
  if (to.major !== from.major) return 'major';
  if (to.minor !== from.minor) return 'minor';
  if (to.patch !== from.patch) return 'patch';
  return 'none';
}

function bucketUpdates(items) {
  const buckets = { major: [], minor: [], patch: [], unknown: [] };
  for (const item of items) {
    const bucket = classifySemverChange(item.current, item.latest);
    if (bucket === 'none') continue;
    buckets[bucket] ? buckets[bucket].push(item) : buckets.unknown.push(item);
  }
  return buckets;
}

function parseNpmOutdated(output) {
  if (!output.trim()) return [];
  const data = JSON.parse(output);
  return Object.entries(data).map(([name, value]) => ({
    name,
    current: value.current ?? value.wanted ?? null,
    wanted: value.wanted ?? null,
    latest: value.latest ?? null,
    location: value.location ?? null,
  }));
}

function parsePipOutdated(output) {
  if (!output.trim()) return [];
  const data = JSON.parse(output);
  return data.map((item) => ({
    name: item.name,
    current: item.version,
    wanted: null,
    latest: item.latest_version,
    location: null,
  }));
}

function collectOutdated(repoPath, ecosystem) {
  if (ecosystem === 'npm' || ecosystem === 'node') {
    const result = runInspection(repoPath, 'npm', ['outdated', '--json']);
    const source = result.command;
    const output = result.stdout;
    try {
      const items = parseNpmOutdated(output);
      return { ecosystem: 'npm', checked: true, ok: true, source, items, buckets: bucketUpdates(items), raw: output, unknowns: [] };
    } catch (error) {
      return { ecosystem: 'npm', checked: true, ok: false, source, items: [], buckets: bucketUpdates([]), raw: output, unknowns: [`Unable to parse npm outdated output: ${error.message}`] };
    }
  }

  if (ecosystem === 'pip' || ecosystem === 'python') {
    const result = runInspection(repoPath, 'pip', ['list', '--outdated', '--format=json']);
    const source = result.command;
    try {
      const items = parsePipOutdated(result.stdout);
      return { ecosystem: 'pip', checked: true, ok: result.ok, source, items, buckets: bucketUpdates(items), raw: result.stdout, unknowns: result.ok ? [] : [result.stderr || 'pip outdated command failed.'] };
    } catch (error) {
      return { ecosystem: 'pip', checked: true, ok: false, source, items: [], buckets: bucketUpdates([]), raw: result.stdout, unknowns: [`Unable to parse pip outdated output: ${error.message}`] };
    }
  }

  if (ecosystem === 'pnpm') {
    const result = runInspection(repoPath, 'pnpm', ['outdated', '--format', 'json']);
    return { ecosystem: 'pnpm', checked: true, ok: result.ok, source: result.command, items: [], buckets: bucketUpdates([]), raw: result.stdout, unknowns: ['pnpm outdated output is kept raw in this dependency-free runtime.'] };
  }

  if (ecosystem === 'yarn') {
    const result = runInspection(repoPath, 'yarn', ['outdated', '--json']);
    return { ecosystem: 'yarn', checked: true, ok: result.ok, source: result.command, items: [], buckets: bucketUpdates([]), raw: result.stdout, unknowns: ['yarn outdated JSON-lines output is kept raw in this dependency-free runtime.'] };
  }

  if (ecosystem === 'poetry') {
    const result = runInspection(repoPath, 'poetry', ['show', '--outdated']);
    return { ecosystem: 'poetry', checked: true, ok: result.ok, source: result.command, items: [], buckets: bucketUpdates([]), raw: result.stdout, unknowns: ['poetry outdated output is kept raw in this dependency-free runtime.'] };
  }

  if (ecosystem === 'uv') {
    const result = runInspection(repoPath, 'uv', ['tree']);
    return { ecosystem: 'uv', checked: true, ok: result.ok, source: result.command, items: [], buckets: bucketUpdates([]), raw: result.stdout, unknowns: ['uv tree inspects installed dependency graph but does not confirm latest versions.'] };
  }

  return { ecosystem: ecosystem ?? 'unknown', checked: false, ok: false, source: null, items: [], buckets: bucketUpdates([]), raw: '', unknowns: ['No supported dependency ecosystem selected.'] };
}

function collectDependencyAnalysis(repoPath, options = {}) {
  const manifestReport = detectManifests(repoPath);
  const ecosystems = inferEcosystems(manifestReport.manifests, options.ecosystem);
  const outdated = ecosystems.length > 0
    ? ecosystems.map((ecosystem) => collectOutdated(repoPath, ecosystem))
    : [];

  return {
    manifests: manifestReport.manifests,
    ecosystems,
    outdated,
    unknowns: [
      ...manifestReport.unknowns,
      ...(ecosystems.length === 0 ? ['No dependency manifests or ecosystem hint found.'] : []),
      ...outdated.flatMap((item) => item.unknowns),
    ],
  };
}

module.exports = {
  parseRequirements,
  detectManifests,
  parseVersion,
  classifySemverChange,
  bucketUpdates,
  parseNpmOutdated,
  parsePipOutdated,
  collectDependencyAnalysis,
};
