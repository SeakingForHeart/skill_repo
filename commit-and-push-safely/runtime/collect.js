const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function runGit(repoPath, args) {
  return execFileSync('git', args, { cwd: repoPath, encoding: 'utf8' }).toString();
}

function parseStatus(output) {
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2).trim();
      const filePath = line.slice(3).trim();
      return { path: filePath, status };
    });
}

function parseSummary(output) {
  return output
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseChangedFiles(summary) {
  const binaryFiles = [];
  const modeChanges = [];
  const symlinkChanges = [];
  const submoduleChanges = [];

  for (const line of summary) {
    if (/Binary files differ|binary/.test(line)) binaryFiles.push(line);
    if (/mode change|file mode/.test(line)) modeChanges.push(line);
    if (/symlink/.test(line)) symlinkChanges.push(line);
    if (/submodule/.test(line)) submoduleChanges.push(line);
  }

  return { binaryFiles, modeChanges, symlinkChanges, submoduleChanges };
}

function collectChangeReport(repoPath) {
  const isGitRepo = fs.existsSync(path.join(repoPath, '.git'));
  if (!isGitRepo) {
    return {
      repoPath,
      isGitRepo: false,
      isClean: true,
      statuses: [],
      summary: [],
      textDiff: '',
      binaryFiles: [],
      untrackedFiles: [],
      modeChanges: [],
      symlinkChanges: [],
      submoduleChanges: [],
      warnings: ['Not a git repository'],
    };
  }

  const statusOutput = runGit(repoPath, ['status', '--short']);
  const statuses = statusOutput.trim() ? parseStatus(statusOutput) : [];
  const isClean = statuses.length === 0;

  if (isClean) {
    return {
      repoPath,
      isGitRepo: true,
      isClean: true,
      statuses,
      summary: [],
      textDiff: '',
      binaryFiles: [],
      untrackedFiles: [],
      modeChanges: [],
      symlinkChanges: [],
      submoduleChanges: [],
      warnings: [],
    };
  }

  const diffStat = runGit(repoPath, ['diff', '--stat']);
  const diffSummary = runGit(repoPath, ['diff', '--summary']);
  const diff = runGit(repoPath, ['diff']);
  const submoduleDiff = runGit(repoPath, ['diff', '--submodule']);
  const lsFiles = runGit(repoPath, ['ls-files', '-s']);

  const summary = parseSummary([diffStat, diffSummary, submoduleDiff, lsFiles].join('\n'));
  const classified = parseChangedFiles(summary);
  const untrackedFiles = statuses.filter((item) => item.status.includes('?')).map((item) => item.path);

  const warnings = [
    ...(untrackedFiles.length ? ['Untracked files present'] : []),
    ...(isGitRepo && fs.existsSync(path.join(repoPath, '.git', 'config')) ? [] : []),
    ...(classified.binaryFiles.length ? ['Binary files changed'] : []),
    ...(classified.modeChanges.length ? ['File mode changed'] : []),
    ...(classified.symlinkChanges.length ? ['Symlink changed'] : []),
    ...(classified.submoduleChanges.length ? ['Submodule changed'] : []),
  ];

  return {
    repoPath,
    isGitRepo: true,
    isClean,
    statuses,
    summary,
    textDiff: diff,
    binaryFiles: classified.binaryFiles,
    untrackedFiles,
    modeChanges: classified.modeChanges,
    symlinkChanges: classified.symlinkChanges,
    submoduleChanges: classified.submoduleChanges,
    warnings,
  };
}

module.exports = {
  collectChangeReport,
};
