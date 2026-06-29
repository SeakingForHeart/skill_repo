const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { renderCommitDraft } = require('../runtime/draft');
const { validateDraftAgainstChecklist } = require('../runtime/validate');

const report = {
  repoPath: '/tmp/repo',
  isGitRepo: true,
  isClean: false,
  statuses: [{ path: 'image.png', status: 'M' }],
  summary: [],
  textDiff: '',
  binaryFiles: ['Binary files differ: image.png'],
  untrackedFiles: [],
  modeChanges: [],
  symlinkChanges: [],
  submoduleChanges: [],
  warnings: ['Binary files changed'],
};

describe('validate', () => {
  it('passes required sections and warns on uncovered special changes', () => {
    const draft = [
      'docs: update assets',
      '',
      'Why:',
      '- None',
      '',
      'What changed:',
      '- Updated docs references.',
      '',
      'Validation:',
      '- Not run',
      '',
      'Notes:',
      '- None',
    ].join('\n');

    const findings = validateDraftAgainstChecklist(report, draft);
    assert.ok(findings.some((item) => item.label === 'section:Why:' && item.level === 'pass'));
    assert.ok(findings.some((item) => item.label === 'binary-coverage' && item.level === 'warning'));
  });

  it('passes generated draft safety text that mentions prohibited git write commands', () => {
    const draft = renderCommitDraft({ subject: 'docs: update assets' }, report);
    const findings = validateDraftAgainstChecklist(report, draft);
    assert.ok(findings.some((item) => item.label === 'write-command-leak' && item.level === 'pass'));
  });

  it('fails unsafe execution-oriented git write instructions', () => {
    const draft = [
      'docs: update assets',
      '',
      'Why:',
      '- None',
      '',
      'What changed:',
      '- Updated docs references.',
      '',
      'Validation:',
      '- Not run',
      '',
      'Notes:',
      '- I will run git commit for you.',
    ].join('\n');

    const findings = validateDraftAgainstChecklist(report, draft);
    assert.ok(findings.some((item) => item.label === 'write-command-leak' && item.level === 'fail'));
  });
});
