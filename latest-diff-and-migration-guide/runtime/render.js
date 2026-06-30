function linesOrNone(items, renderItem, none = '- None') {
  if (!items || items.length === 0) return [none];
  return items.map(renderItem);
}

function allOutdatedItems(dependencies) {
  return (dependencies?.outdated ?? []).flatMap((report) => report.items ?? []);
}

function bucketItems(dependencies, bucketName) {
  return (dependencies?.outdated ?? []).flatMap((report) => report.buckets?.[bucketName] ?? []);
}

function renderCommit(commit) {
  return [
    `- ${commit.hash || 'Unknown'} ${commit.subject || 'Unknown subject'}`,
    `  - Author/date: ${commit.author || 'Unknown'} / ${commit.authorDate || commit.commitDate || 'Unknown'}`,
    `  - Changed files/areas: ${commit.affectedAreas?.length ? commit.affectedAreas.join(', ') : 'Unknown'}`,
    `  - Impact: ${commit.impact || 'Unknown'}`,
    `  - Migration relevance: ${commit.migrationRelevance || 'Unknown'}`,
  ].join('\n');
}

function summarizeChange(commits, pattern, fallback) {
  const matched = (commits?.items ?? []).filter((commit) => pattern.test(`${commit.subject}\n${commit.body}\n${commit.changedFiles.map((file) => file.path).join('\n')}`));
  return linesOrNone(matched.slice(0, 5), (commit) => `  - ${commit.hash.slice(0, 12)} ${commit.subject}`, fallback);
}

function renderDependencyBucket(title, items, detailLabel) {
  const lines = [`- ${title}:`];
  if (!items || items.length === 0) {
    lines.push('  - None');
    return lines;
  }
  for (const item of items) {
    lines.push(`  - ${item.name}: ${item.current ?? 'unknown'} -> ${item.latest ?? 'unknown'}, ${detailLabel}`);
  }
  return lines;
}

function collectUnknowns({ repo, target, commits, diff, dependencies }) {
  return [
    ...(repo?.warnings ?? []),
    ...(target?.warnings ?? []),
    ...(commits?.warnings ?? []),
    ...(diff?.warnings ?? []),
    ...(dependencies?.unknowns ?? []),
  ];
}

function renderReport({ workflow, repo, target, commits, diff, dependencies }) {
  const unknowns = collectUnknowns({ repo, target, commits, diff, dependencies });
  const commitItems = commits?.items ?? [];
  const dependencyItems = allOutdatedItems(dependencies);
  const requiredMigration = commitItems.filter((commit) => /required|breaking|deprecat|remove|rename/i.test(commit.migrationRelevance));
  const optionalMigration = commitItems.filter((commit) => /optional|contextual|config|env|cli|api/i.test(commit.migrationRelevance));

  const report = [];
  report.push('# Latest Diff And Migration Report');
  report.push('');
  report.push('## Target Compared');
  report.push(`- Current baseline: ${target?.current ?? repo?.head ?? 'Unknown'}`);
  report.push(`- Target latest: ${target?.latest ?? target?.commit ?? target?.ref ?? 'Unknown'}`);
  report.push(`- Scope: ${target?.range ?? target?.requested ?? 'Unknown'}`);
  report.push('');

  report.push('## Commit-by-Commit Analysis');
  report.push(...linesOrNone(commitItems, renderCommit, '- None (no commits found in range)'));
  report.push('');

  report.push('## Change Summary');
  report.push('- Breaking changes:');
  report.push(...summarizeChange(commits, /breaking|major|incompatible|remove|rename/i, '  - None identified by runtime heuristics'));
  report.push('- Behavior-impacting changes:');
  report.push(...summarizeChange(commits, /fix|feat|config|env|cli|api|behavior|runtime/i, '  - None identified by runtime heuristics'));
  report.push('- New features:');
  report.push(...summarizeChange(commits, /feat|feature|add/i, '  - None identified by runtime heuristics'));
  report.push('- Fixes/maintenance:');
  report.push(...summarizeChange(commits, /fix|chore|docs|test|refactor|maintenance/i, '  - None identified by runtime heuristics'));
  report.push('');

  report.push('## Dependency Update Summary');
  report.push(...renderDependencyBucket('Major updates', bucketItems(dependencies, 'major'), 'high compatibility risk'));
  report.push(...renderDependencyBucket('Minor updates', bucketItems(dependencies, 'minor'), 'review feature/behavior impact'));
  report.push(...renderDependencyBucket('Patch updates', bucketItems(dependencies, 'patch'), 'usually low risk; verify smoke tests'));
  if (bucketItems(dependencies, 'unknown').length > 0) {
    report.push('- Unknown-version updates:');
    for (const item of bucketItems(dependencies, 'unknown')) {
      report.push(`  - ${item.name}: ${item.current ?? 'unknown'} -> ${item.latest ?? 'unknown'}, semver classification unknown`);
    }
  }
  report.push('');

  report.push('## Required Migration Actions');
  if (requiredMigration.length === 0 && bucketItems(dependencies, 'major').length === 0) {
    report.push('- [Must] None identified by runtime heuristics; manually verify release notes and high-impact diffs.');
  } else {
    for (const commit of requiredMigration) {
      report.push(`- [Must] Inspect ${commit.hash.slice(0, 12)} (${commit.subject}) for required migration details.`);
    }
    for (const dep of bucketItems(dependencies, 'major')) {
      report.push(`- [Must] Review ${dep.name} major update migration notes before upgrading.`);
    }
  }
  report.push('');

  report.push('## Optional Migration Actions');
  if (optionalMigration.length === 0 && dependencyItems.length === 0) {
    report.push('- [Optional] None identified by runtime heuristics.');
  } else {
    for (const commit of optionalMigration) {
      report.push(`- [Optional] Verify whether ${commit.hash.slice(0, 12)} (${commit.subject}) changes local usage, config, CLI, or API expectations.`);
    }
    for (const dep of dependencyItems) {
      report.push(`- [Optional] Review ${dep.name} update impact if this dependency is used in the target scope.`);
    }
  }
  report.push('');

  report.push('## Validation Checklist');
  report.push('- Confirm every commit in the range has been reviewed for user-facing behavior.');
  report.push('- Run the narrowest relevant project tests for changed source, CLI, config, and dependency areas.');
  report.push('- Manually inspect release notes/changelog for any unknown or dependency-only evidence.');
  report.push('');

  report.push('## Risks And Rollback Hints');
  report.push('- Risks:');
  if (unknowns.length > 0) {
    for (const unknown of unknowns) report.push(`  - ${unknown}`);
  } else {
    report.push('  - None identified by runtime collection.');
  }
  report.push('- Rollback:');
  report.push('  - Keep this report read-only; perform any upgrade, install, merge, commit, or push outside this runtime after manual review.');
  report.push('');

  report.push('## Assumptions / Unknowns');
  if (unknowns.length === 0) {
    report.push('- None');
  } else {
    for (const unknown of unknowns) report.push(`- ${unknown}`);
  }
  if (workflow?.status) report.push(`- Workflow status: ${workflow.status} (${workflow.reason})`);

  return `${report.join('\n')}\n`;
}

module.exports = {
  renderReport,
  collectUnknowns,
};
