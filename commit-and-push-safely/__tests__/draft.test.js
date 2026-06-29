const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { auditOutput } = require('../runtime/audit');
const { buildSuggestedWhatChanged, renderCommitDraft } = require('../runtime/draft');

const report = {
  repoPath: '/tmp/repo',
  isGitRepo: true,
  isClean: false,
  statuses: [{ path: 'src/index.ts', status: 'M' }, { path: 'new.bin', status: '??' }],
  summary: [],
  textDiff: 'diff --git a/src/index.ts b/src/index.ts',
  binaryFiles: ['Binary files differ: new.bin'],
  untrackedFiles: ['new.bin'],
  modeChanges: ['mode change 100644 => 100755 script.sh'],
  symlinkChanges: [],
  submoduleChanges: [],
  warnings: ['Untracked files present', 'Binary files changed', 'File mode changed'],
};

describe('draft', () => {
  it('builds suggested change bullets from report', () => {
    const bullets = buildSuggestedWhatChanged(report);
    assert.match(bullets.join(' '), /Detected untracked files/);
    assert.match(bullets.join(' '), /Detected binary file changes/);
    assert.match(bullets.join(' '), /Detected file permission or mode changes/);
  });

  it('renders template sections in fixed order with fallbacks', () => {
    const draft = renderCommitDraft({ subject: 'fix(skill): add runtime checks' }, report);
    assert.match(draft, /Why:/);
    assert.match(draft, /What changed:/);
    assert.match(draft, /Validation:/);
    assert.match(draft, /Notes:/);
    assert.match(draft, /- Not run/);
  });

  it('renders safety text without failing audit', () => {
    const draft = renderCommitDraft({ subject: 'fix(skill): add runtime checks' }, report);
    const issues = auditOutput(`Manual handoff only.\n\n${draft}`);
    assert.ok(!issues.some((issue) => issue.level === 'fail'));
  });
});
