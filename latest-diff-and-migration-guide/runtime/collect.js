const { execFileSync } = require('node:child_process');
const { assertReadOnlyCommand } = require('./enforce');

function commandText(command, args) {
  return [command, ...args].join(' ');
}

function runGit(repoPath, args, options = {}) {
  assertReadOnlyCommand(commandText('git', args));

  try {
    const stdout = execFileSync('git', args, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
    return { ok: true, stdout, stderr: '', command: commandText('git', args) };
  } catch (error) {
    if (options.allowFailure) {
      return {
        ok: false,
        stdout: error.stdout ? error.stdout.toString() : '',
        stderr: error.stderr ? error.stderr.toString() : error.message,
        command: commandText('git', args),
      };
    }
    throw error;
  }
}

function trimOutput(result) {
  return result.ok ? result.stdout.trim() : '';
}

function parseStatus(output) {
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3).trim() }));
}

function parseNameStatus(output) {
  return output
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      const status = parts[0];
      if (status.startsWith('R') || status.startsWith('C')) {
        return { status, path: parts[2] ?? parts[1] ?? '', previousPath: parts[1] ?? '' };
      }
      return { status, path: parts[1] ?? '' };
    })
    .filter((item) => item.path);
}

function affectedAreas(files) {
  const areas = new Set();
  for (const file of files) {
    const first = file.path.split('/')[0];
    areas.add(first || file.path);
  }
  return [...areas].sort();
}

function classifyImpact(files, subject, body) {
  const paths = files.map((file) => file.path);
  const lowerText = `${subject}\n${body}\n${paths.join('\n')}`.toLowerCase();

  if (paths.length === 0) return 'Unknown; no changed-file summary was captured.';
  if (paths.every((file) => /(^|\/)(docs?|readme|changelog|release)/i.test(file) || /\.md$/i.test(file))) {
    return 'Documentation-only impact likely.';
  }
  if (paths.every((file) => /(^|\/)(__tests__|tests?|specs?)(\/|$)/i.test(file) || /\.test\./i.test(file))) {
    return 'Test coverage or validation impact likely.';
  }
  if (paths.some((file) => /(package\.json|lock|pnpm-lock|yarn\.lock|requirements|pyproject\.toml|build|webpack|vite|rollup)/i.test(file))) {
    return 'Dependency or build behavior may be affected; inspect related release notes and tests.';
  }
  if (/breaking|migration|migrate|deprecat|remove|rename|config|env|cli|api/.test(lowerText)) {
    return 'Potential user-facing behavior or configuration impact; inspect this commit closely.';
  }
  return 'Runtime or project behavior may be affected; inspect changed files for user-facing impact.';
}

function classifyMigrationRelevance(files, subject, body) {
  const text = `${subject}\n${body}\n${files.map((file) => file.path).join('\n')}`.toLowerCase();
  if (/breaking|migration|migrate|required|deprecat|remove|rename/.test(text)) {
    return 'Potential required migration action; verify against diff and release notes.';
  }
  if (/config|env|cli|api|package\.json|lock|requirements|pyproject/.test(text)) {
    return 'Potential optional or contextual migration action; verify affected usage paths.';
  }
  return 'None identified by runtime heuristics.';
}

function parseCommitShow(output) {
  const [metadata = '', fileOutput = ''] = output.split('\x1e');
  const [hash = '', subject = '', author = '', authorDate = '', commitDate = '', ...bodyParts] = metadata.split('\x1f');
  const body = bodyParts.join('\x1f').trim();
  const changedFiles = parseNameStatus(fileOutput);

  return {
    hash: hash.trim(),
    subject: subject.trim(),
    author: author.trim(),
    authorDate: authorDate.trim(),
    commitDate: commitDate.trim(),
    body,
    changedFiles,
    affectedAreas: affectedAreas(changedFiles),
    impact: classifyImpact(changedFiles, subject, body),
    migrationRelevance: classifyMigrationRelevance(changedFiles, subject, body),
  };
}

function detectMode(target, mode) {
  if (mode && mode !== 'auto') return mode;
  if (target === 'deps' || target === 'dependencies') return 'deps';
  if (target === 'latest-tag') return 'tag';
  return 'branch';
}

function collectRepoState(repoPath) {
  const inside = runGit(repoPath, ['rev-parse', '--is-inside-work-tree'], { allowFailure: true });
  if (!inside.ok || trimOutput(inside) !== 'true') {
    return {
      repoPath,
      isGitRepo: false,
      warnings: ['Not a git repository.'],
      statuses: [],
      remote: '',
    };
  }

  const head = runGit(repoPath, ['rev-parse', 'HEAD'], { allowFailure: true });
  const branch = runGit(repoPath, ['branch', '--show-current'], { allowFailure: true });
  const remote = runGit(repoPath, ['remote', '-v'], { allowFailure: true });
  const status = runGit(repoPath, ['status', '--short'], { allowFailure: true });
  const statuses = parseStatus(trimOutput(status));
  const warnings = [];

  if (statuses.length > 0) {
    warnings.push('Working tree has uncommitted changes; comparison uses committed HEAD as baseline.');
  }

  return {
    repoPath,
    isGitRepo: true,
    head: trimOutput(head) || 'Unknown',
    branch: trimOutput(branch) || 'Unknown',
    remote: trimOutput(remote),
    statuses,
    warnings,
  };
}

function resolveTarget(repoPath, target, mode) {
  if (mode === 'tag' && target === 'latest-tag') {
    const tags = runGit(repoPath, ['tag', '--sort=-creatordate'], { allowFailure: true });
    const latestTag = trimOutput(tags).split('\n').filter(Boolean)[0];
    if (!latestTag) {
      return { ok: false, mode, target, warnings: ['No local tags found for latest-tag target.'] };
    }
    const resolved = runGit(repoPath, ['rev-parse', latestTag], { allowFailure: true });
    return {
      ok: resolved.ok,
      mode,
      requested: target,
      ref: latestTag,
      commit: trimOutput(resolved),
      warnings: resolved.ok ? [] : [`Unable to resolve latest tag ${latestTag}.`],
    };
  }

  const resolved = runGit(repoPath, ['rev-parse', target], { allowFailure: true });
  return {
    ok: resolved.ok,
    mode,
    requested: target,
    ref: target,
    commit: trimOutput(resolved),
    warnings: resolved.ok ? [] : [`Unable to resolve target ${target}.`],
  };
}

function collectCommits(repoPath, range) {
  const list = runGit(repoPath, ['rev-list', '--reverse', range], { allowFailure: true });
  if (!list.ok) {
    return { ok: false, range, items: [], count: 0, warnings: [`Unable to collect commit range ${range}.`] };
  }

  const hashes = trimOutput(list).split('\n').filter(Boolean);
  const items = [];
  const warnings = [];

  for (const hash of hashes) {
    const show = runGit(repoPath, ['show', '--name-status', '--format=%H%x1f%s%x1f%an%x1f%aI%x1f%cI%x1f%B%x1e', hash], { allowFailure: true });
    if (!show.ok) {
      warnings.push(`Unable to read commit ${hash}.`);
      continue;
    }
    items.push(parseCommitShow(show.stdout));
  }

  return { ok: true, range, items, count: items.length, warnings };
}

function collectDiff(repoPath, range) {
  const nameStatus = runGit(repoPath, ['diff', '--name-status', range], { allowFailure: true });
  const stat = runGit(repoPath, ['diff', '--stat', range], { allowFailure: true });
  return {
    range,
    nameStatus: parseNameStatus(trimOutput(nameStatus)),
    stat: trimOutput(stat),
    warnings: [
      ...(!nameStatus.ok ? [`Unable to collect name-status diff for ${range}.`] : []),
      ...(!stat.ok ? [`Unable to collect stat diff for ${range}.`] : []),
    ],
  };
}

function collectGitAnalysis(repoPath, target, options = {}) {
  const mode = detectMode(target, options.mode ?? 'auto');
  const repo = collectRepoState(repoPath);

  if (!target) {
    return {
      repo,
      target: { ok: false, mode, requested: target, warnings: ['Comparison target is required.'] },
      commits: { ok: false, range: null, items: [], count: 0, warnings: [] },
      diff: { range: null, nameStatus: [], stat: '', warnings: [] },
    };
  }

  if (mode === 'deps') {
    return {
      repo,
      target: { ok: true, mode, requested: target, ref: target, commit: null, warnings: [] },
      commits: { ok: true, range: null, items: [], count: 0, warnings: [] },
      diff: { range: null, nameStatus: [], stat: '', warnings: [] },
    };
  }

  if (!repo.isGitRepo) {
    return {
      repo,
      target: { ok: false, mode, requested: target, warnings: ['Git comparison requires a git repository.'] },
      commits: { ok: false, range: null, items: [], count: 0, warnings: [] },
      diff: { range: null, nameStatus: [], stat: '', warnings: [] },
    };
  }

  const targetInfo = resolveTarget(repoPath, target, mode);
  if (!targetInfo.ok) {
    return {
      repo,
      target: targetInfo,
      commits: { ok: false, range: null, items: [], count: 0, warnings: [] },
      diff: { range: null, nameStatus: [], stat: '', warnings: [] },
    };
  }

  const range = `HEAD..${targetInfo.ref}`;
  return {
    repo,
    target: {
      ...targetInfo,
      current: repo.head,
      latest: targetInfo.commit,
      range,
    },
    commits: collectCommits(repoPath, range),
    diff: collectDiff(repoPath, range),
  };
}

module.exports = {
  runGit,
  parseStatus,
  parseNameStatus,
  parseCommitShow,
  collectRepoState,
  collectGitAnalysis,
  detectMode,
  classifyImpact,
  classifyMigrationRelevance,
};
