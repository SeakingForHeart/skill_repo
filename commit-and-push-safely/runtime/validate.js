const { auditGitWriteMentions } = require('./audit');

function hasSection(draft, label) {
  return draft.includes(`\n${label}\n`) || draft.startsWith(`${label}\n`);
}

function validateDraftAgainstChecklist(report, draft) {
  const findings = [];

  const requiredSections = ['Why:', 'What changed:', 'Validation:', 'Notes:'];
  for (const section of requiredSections) {
    findings.push({
      level: hasSection(draft, section) ? 'pass' : 'fail',
      label: `section:${section}`,
      detail: hasSection(draft, section) ? `Found ${section}` : `Missing ${section}`,
    });
  }

  findings.push({
    level: report.isClean ? 'warning' : 'pass',
    label: 'repo-state',
    detail: report.isClean ? 'Working tree is clean; nothing to draft.' : 'Working tree contains changes.',
  });

  if (report.binaryFiles.length > 0) {
    findings.push({
      level: draft.includes('binary') ? 'pass' : 'warning',
      label: 'binary-coverage',
      detail: draft.includes('binary') ? 'Draft references binary changes.' : 'Binary changes detected but not explicitly mentioned.',
    });
  }

  if (report.modeChanges.length > 0) {
    findings.push({
      level: /permission|mode/i.test(draft) ? 'pass' : 'warning',
      label: 'mode-coverage',
      detail: /permission|mode/i.test(draft) ? 'Draft references mode changes.' : 'Mode changes detected but not explicitly mentioned.',
    });
  }

  if (report.symlinkChanges.length > 0) {
    findings.push({
      level: /symlink/i.test(draft) ? 'pass' : 'warning',
      label: 'symlink-coverage',
      detail: /symlink/i.test(draft) ? 'Draft references symlink changes.' : 'Symlink changes detected but not explicitly mentioned.',
    });
  }

  if (report.submoduleChanges.length > 0) {
    findings.push({
      level: /submodule/i.test(draft) ? 'pass' : 'warning',
      label: 'submodule-coverage',
      detail: /submodule/i.test(draft) ? 'Draft references submodule changes.' : 'Submodule changes detected but not explicitly mentioned.',
    });
  }

  const unsafeGitWriteMentions = auditGitWriteMentions(draft).filter((issue) => issue.level === 'fail');
  findings.push({
    level: unsafeGitWriteMentions.length > 0 ? 'fail' : 'pass',
    label: 'write-command-leak',
    detail: unsafeGitWriteMentions.length > 0
      ? 'Draft contains unsafe execution-oriented git write instruction.'
      : 'Draft does not contain unsafe execution-oriented git write instructions.',
  });

  return findings;
}

module.exports = {
  validateDraftAgainstChecklist,
};
