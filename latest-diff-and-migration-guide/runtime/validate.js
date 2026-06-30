const { auditWriteMentions } = require('./audit');

const REQUIRED_SECTIONS = [
  '## Target Compared',
  '## Commit-by-Commit Analysis',
  '## Change Summary',
  '## Dependency Update Summary',
  '## Required Migration Actions',
  '## Optional Migration Actions',
  '## Validation Checklist',
  '## Risks And Rollback Hints',
  '## Assumptions / Unknowns',
];

function hasSection(report, section) {
  return report.includes(section);
}

function sectionsInOrder(report, sections = REQUIRED_SECTIONS) {
  let lastIndex = -1;
  for (const section of sections) {
    const index = report.indexOf(section);
    if (index === -1 || index < lastIndex) return false;
    lastIndex = index;
  }
  return true;
}

function validateReportAgainstChecklist({ repo, target, commits, dependencies } = {}, report = '') {
  const findings = [];

  for (const section of REQUIRED_SECTIONS) {
    findings.push({
      level: hasSection(report, section) ? 'pass' : 'fail',
      label: `section:${section}`,
      detail: hasSection(report, section) ? `Found ${section}` : `Missing ${section}`,
    });
  }

  findings.push({
    level: sectionsInOrder(report) ? 'pass' : 'fail',
    label: 'section-order',
    detail: sectionsInOrder(report) ? 'Required sections appear in fixed order.' : 'Required sections are missing or out of order.',
  });

  if (target?.mode !== 'deps') {
    findings.push({
      level: repo?.head ? 'pass' : 'fail',
      label: 'target:current-baseline',
      detail: repo?.head ? 'Current baseline commit captured.' : 'Current baseline commit missing.',
    });
    findings.push({
      level: target?.ok && (target?.latest || target?.commit) ? 'pass' : 'fail',
      label: 'target:latest',
      detail: target?.ok && (target?.latest || target?.commit) ? 'Target commit captured.' : 'Target commit missing or unresolved.',
    });
    findings.push({
      level: commits?.range || target?.range ? 'pass' : 'warning',
      label: 'commit-range',
      detail: commits?.range || target?.range ? 'Commit range captured.' : 'Commit range is missing.',
    });
    findings.push({
      level: hasSection(report, '## Commit-by-Commit Analysis') ? 'pass' : 'fail',
      label: 'commit-analysis-section',
      detail: 'Branch/tag reports must include commit-by-commit analysis section.',
    });
  }

  if (target?.mode === 'deps') {
    findings.push({
      level: (dependencies?.manifests ?? []).length > 0 ? 'pass' : 'warning',
      label: 'dependency-manifests',
      detail: (dependencies?.manifests ?? []).length > 0 ? 'Dependency manifests inspected.' : 'No dependency manifests were found.',
    });
    findings.push({
      level: (dependencies?.outdated ?? []).length > 0 ? 'pass' : 'warning',
      label: 'dependency-outdated',
      detail: (dependencies?.outdated ?? []).length > 0 ? 'Dependency outdated inspection attempted.' : 'No dependency outdated inspection was attempted.',
    });
  }

  const unknowns = [
    ...(repo?.warnings ?? []),
    ...(target?.warnings ?? []),
    ...(commits?.warnings ?? []),
    ...(dependencies?.unknowns ?? []),
  ];
  if (unknowns.length > 0) {
    findings.push({
      level: /## Assumptions \/ Unknowns[\s\S]*- (?!None)/.test(report) ? 'pass' : 'warning',
      label: 'unknowns-covered',
      detail: /## Assumptions \/ Unknowns[\s\S]*- (?!None)/.test(report)
        ? 'Unknowns are listed in the report.'
        : 'Collection unknowns exist but are not clearly listed.',
    });
  }

  const unsafe = auditWriteMentions(report).filter((issue) => issue.level === 'fail');
  findings.push({
    level: unsafe.length > 0 ? 'fail' : 'pass',
    label: 'write-command-leak',
    detail: unsafe.length > 0
      ? 'Report contains unsafe write or upgrade instruction.'
      : 'Report does not contain unsafe execution-oriented write or upgrade instructions.',
  });

  return findings;
}

module.exports = {
  REQUIRED_SECTIONS,
  sectionsInOrder,
  validateReportAgainstChecklist,
};
