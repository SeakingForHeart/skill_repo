const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { assessGitCommand, assertReadOnlyGitCommand } = require('../runtime/enforce');

describe('enforce', () => {
  it('allows read-only git commands', () => {
    const result = assessGitCommand('git status --short');
    assert.equal(result.safety, 'allowed');
  });

  it('blocks git write commands', () => {
    const result = assessGitCommand('git commit -m "x"');
    assert.equal(result.safety, 'forbidden');
    assert.throws(() => assertReadOnlyGitCommand('git push origin main'));
  });

  it('blocks dangerous branch and checkout forms', () => {
    assert.equal(assessGitCommand('git branch -D feature').safety, 'forbidden');
    assert.equal(assessGitCommand('git checkout -- file.txt').safety, 'forbidden');
  });

  it('handles aliases and combined commands', () => {
    assert.equal(assessGitCommand('git st && git diff').safety, 'allowed');
    assert.equal(assessGitCommand('git status && git commit -m test').safety, 'forbidden');
  });

  it('marks gray-area git commands separately', () => {
    assert.equal(assessGitCommand('git fetch origin').safety, 'gray-area');
  });
});
