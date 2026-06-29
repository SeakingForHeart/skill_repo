const MANY_CHANGED_PATHS_THRESHOLD = 20;
const LARGE_DIFF_CHAR_THRESHOLD = 50_000;

const DOCS_PATH_PATTERN = /(^|\/)(docs?|README|CHANGELOG|LICENSE)(\/|\.|$)|\.(md|mdx|txt|rst)$/i;

function severityRank(severity) {
  switch (severity) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function highestSeverity(findings) {
  return findings.reduce(
    (highest, finding) => (severityRank(finding.severity) > severityRank(highest) ? finding.severity : highest),
    'low',
  );
}

function changedPaths(report) {
  return report.statuses.map((item) => item.path).filter(Boolean);
}

function isDocsOnly(paths) {
  return paths.length > 0 && paths.every((filePath) => DOCS_PATH_PATTERN.test(filePath));
}

function assessRisk(report) {
  const findings = [];
  const paths = changedPaths(report);

  if (!report.isGitRepo) {
    findings.push({
      severity: 'high',
      label: 'not-git-repo',
      detail: 'Path is not a git repository, so commit preparation is blocked.',
    });
  }

  if (report.submoduleChanges.length > 0) {
    findings.push({
      severity: 'high',
      label: 'submodule-changes',
      detail: 'Submodule changes require careful manual review before any commit handoff.',
    });
  }

  if (report.binaryFiles.length > 0) {
    findings.push({
      severity: 'high',
      label: 'binary-changes',
      detail: 'Binary changes cannot be fully reviewed from text diff output.',
    });
  }

  if (report.textDiff.length > LARGE_DIFF_CHAR_THRESHOLD) {
    findings.push({
      severity: 'high',
      label: 'large-diff',
      detail: `Text diff is larger than ${LARGE_DIFF_CHAR_THRESHOLD} characters and may need focused review.`,
    });
  }

  if (paths.length > MANY_CHANGED_PATHS_THRESHOLD) {
    findings.push({
      severity: 'high',
      label: 'many-files',
      detail: `Detected ${paths.length} changed paths, which increases review risk.`,
      paths,
    });
  }

  if (report.modeChanges.length > 0) {
    findings.push({
      severity: 'medium',
      label: 'mode-changes',
      detail: 'File mode or permission changes require explicit manual review.',
    });
  }

  if (report.symlinkChanges.length > 0) {
    findings.push({
      severity: 'medium',
      label: 'symlink-changes',
      detail: 'Symlink changes require explicit manual review.',
    });
  }

  if (report.untrackedFiles.length > 0) {
    findings.push({
      severity: 'medium',
      label: 'untracked-files',
      detail: 'Untracked files are present and require a manual inclusion decision.',
      paths: report.untrackedFiles,
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: 'low',
      label: report.isClean ? 'clean-working-tree' : isDocsOnly(paths) ? 'docs-only' : 'text-only',
      detail: report.isClean
        ? 'Working tree is clean; no changed paths require commit risk review.'
        : isDocsOnly(paths)
          ? 'Detected docs-only changes with no special change categories.'
          : 'Detected text-only changes with no special change categories.',
      paths,
    });
  }

  return {
    highestSeverity: highestSeverity(findings),
    findings,
  };
}

module.exports = {
  assessRisk,
};
