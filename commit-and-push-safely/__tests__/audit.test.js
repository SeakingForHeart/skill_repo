const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { auditOutput, containsUnsafeGitWriteInstruction } = require('../runtime/audit');

describe('audit', () => {
  it('fails when output instructs git write commands', () => {
    const issues = auditOutput('Run git add . then git commit -m "x"');
    assert.ok(issues.some((issue) => issue.level === 'fail'));
  });

  it('warns when manual boundary is missing', () => {
    const issues = auditOutput('Review complete. Validation finished.');
    assert.ok(issues.some((issue) => issue.level === 'warning'));
  });

  it('passes safer manual wording', () => {
    const issues = auditOutput('Manual handoff only. User must manually review and execute git operations.');
    assert.ok(!issues.some((issue) => issue.level === 'fail'));
  });

  it('allows explicit prohibition text that mentions git write commands', () => {
    const issues = auditOutput('Manual boundary: this skill must not execute `git add`, `git commit`, or `git push`.');
    assert.ok(!issues.some((issue) => issue.level === 'fail'));
  });

  it('allows manual handoff wording that assigns execution to the user', () => {
    const issues = auditOutput('Manual handoff only. User must manually execute git add, git commit, and git push after review.');
    assert.ok(!issues.some((issue) => issue.level === 'fail'));
  });

  it('fails auto-execution phrasing even when command text is not standalone', () => {
    assert.equal(containsUnsafeGitWriteInstruction('I will run git commit for you.'), true);
    assert.equal(containsUnsafeGitWriteInstruction('The skill will execute git push after checks.'), true);
    assert.equal(containsUnsafeGitWriteInstruction('Please enable auto-commit for this change.'), true);
  });
});
