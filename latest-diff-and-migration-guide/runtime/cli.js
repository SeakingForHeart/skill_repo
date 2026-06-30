#!/usr/bin/env node

const { auditOutput } = require('./audit');
const { collectGitAnalysis, detectMode } = require('./collect');
const { collectDependencyAnalysis } = require('./dependencies');
const { renderReport } = require('./render');
const { validateReportAgainstChecklist } = require('./validate');
const { buildWorkflowState } = require('./workflow');

function parseCsv(value) {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseArgs(argv) {
  const positional = [];
  const options = { mode: 'auto', scope: [], ecosystem: null };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--mode') {
      options.mode = argv[index + 1] ?? 'auto';
      index += 1;
      continue;
    }
    if (arg === '--scope') {
      options.scope = parseCsv(argv[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (arg === '--ecosystem') {
      options.ecosystem = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length) || 'auto';
      continue;
    }
    if (arg.startsWith('--scope=')) {
      options.scope = parseCsv(arg.slice('--scope='.length));
      continue;
    }
    if (arg.startsWith('--ecosystem=')) {
      options.ecosystem = arg.slice('--ecosystem='.length) || null;
      continue;
    }
    positional.push(arg);
  }

  return {
    repoPath: positional[0] ?? process.cwd(),
    target: positional[1] ?? null,
    options,
  };
}

function emptyDependencyAnalysis() {
  return {
    manifests: [],
    ecosystems: [],
    outdated: [],
    unknowns: [],
  };
}

function buildAnalysisOutput(repoPath, target, options = {}) {
  const mode = detectMode(target, options.mode ?? 'auto');
  const gitAnalysis = collectGitAnalysis(repoPath, target, { ...options, mode });
  const dependencies = mode === 'deps' || options.ecosystem
    ? collectDependencyAnalysis(repoPath, options)
    : emptyDependencyAnalysis();

  const workflow = buildWorkflowState({
    repo: gitAnalysis.repo,
    target: gitAnalysis.target,
    commits: gitAnalysis.commits,
    dependencies,
    options: { ...options, mode },
  });

  const report = renderReport({
    workflow,
    repo: gitAnalysis.repo,
    target: gitAnalysis.target,
    commits: gitAnalysis.commits,
    diff: gitAnalysis.diff,
    dependencies,
  });

  const checklist = validateReportAgainstChecklist({
    repo: gitAnalysis.repo,
    target: gitAnalysis.target,
    commits: gitAnalysis.commits,
    dependencies,
  }, report);
  const audit = auditOutput(`Read-only runtime report. Manual upgrade/write operations only outside this skill.\n\n${report}`);

  return {
    workflow,
    target: gitAnalysis.target,
    repo: gitAnalysis.repo,
    commits: gitAnalysis.commits,
    diff: gitAnalysis.diff,
    dependencies,
    summary: {
      commitCount: gitAnalysis.commits.count,
      changedFileCount: gitAnalysis.diff.nameStatus.length,
      dependencyUpdateCount: dependencies.outdated.flatMap((item) => item.items ?? []).length,
    },
    migration: {
      generatedBy: 'runtime-heuristics',
      note: 'Runtime migration hints are conservative and require human or LLM review before action.',
    },
    checklist,
    audit,
    report,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const output = buildAnalysisOutput(args.repoPath, args.target, args.options);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  buildAnalysisOutput,
};
