function withFallback(items, fallback) {
  return items && items.length > 0 ? items : [fallback];
}

function buildSuggestedWhatChanged(report) {
  const changes = [];

  if (report.statuses.length > 0) {
    changes.push(`Reviewed ${report.statuses.length} changed path(s).`);
  }
  if (report.untrackedFiles.length > 0) {
    changes.push(`Detected untracked files: ${report.untrackedFiles.join(', ')}.`);
  }
  if (report.binaryFiles.length > 0) {
    changes.push('Detected binary file changes that need manual review.');
  }
  if (report.modeChanges.length > 0) {
    changes.push('Detected file permission or mode changes.');
  }
  if (report.symlinkChanges.length > 0) {
    changes.push('Detected symlink changes.');
  }
  if (report.submoduleChanges.length > 0) {
    changes.push('Detected submodule updates.');
  }

  return changes.length > 0 ? changes : ['- None'];
}

function renderCommitDraft(input, report) {
  const why = withFallback(input.why, '- None');
  const whatChanged = withFallback(input.whatChanged ?? buildSuggestedWhatChanged(report), '- None');
  const validation = withFallback(input.validation, '- Not run');
  const notes = withFallback(input.notes, '- None');

  const normalizeBullet = (value) => (value.startsWith('- ') ? value : `- ${value}`);

  return [
    input.subject,
    '> `type` must be one of: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`; `scope` is optional and represents the impacted module/layer.',
    '> Draft-only output: this skill must not execute `git add`, `git commit`, or `git push`.',
    '> TECHNICAL ENFORCEMENT: This skill is prohibited from invoking Bash tool with any git write commands. User must manually execute all git operations.',
    '> Keep section labels and order exactly as shown below. Do not rename, remove, or reorder sections.',
    '> If a non-validation section has no content, use `- None`; if validation was not run, use `- Not run` with reason when known.',
    '',
    'Why:',
    ...why.map(normalizeBullet),
    '',
    'What changed:',
    ...whatChanged.map(normalizeBullet),
    '',
    'Validation:',
    ...validation.map(normalizeBullet),
    '',
    'Notes:',
    ...notes.map(normalizeBullet),
    '',
  ].join('\n');
}

module.exports = {
  buildSuggestedWhatChanged,
  renderCommitDraft,
};
