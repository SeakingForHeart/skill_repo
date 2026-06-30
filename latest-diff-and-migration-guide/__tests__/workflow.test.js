const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWorkflowState } = require('../runtime/workflow');

test('blocks missing target', () => {
  const workflow = buildWorkflowState({ target: { mode: 'branch' }, repo: { isGitRepo: true } });
  assert.equal(workflow.status, 'blocked');
});

test('blocks non-git repo for branch mode', () => {
  const workflow = buildWorkflowState({
    target: { mode: 'branch', requested: 'origin/main' },
    repo: { isGitRepo: false },
  });
  assert.equal(workflow.status, 'blocked');
});

test('blocks unresolved target', () => {
  const workflow = buildWorkflowState({
    target: { mode: 'branch', requested: 'origin/main', ok: false, warnings: ['bad ref'] },
    repo: { isGitRepo: true },
  });
  assert.equal(workflow.status, 'blocked');
});

test('returns ready-with-unknowns for partial evidence', () => {
  const workflow = buildWorkflowState({
    target: { mode: 'branch', requested: 'origin/main', ok: true },
    repo: { isGitRepo: true, warnings: ['dirty tree'] },
    commits: { items: [{ hash: 'abc' }], warnings: [] },
    dependencies: { unknowns: [] },
  });
  assert.equal(workflow.status, 'ready-with-unknowns');
});

test('returns no-differences for empty clean range', () => {
  const workflow = buildWorkflowState({
    target: { mode: 'branch', requested: 'origin/main', ok: true },
    repo: { isGitRepo: true, warnings: [] },
    commits: { items: [], warnings: [] },
    dependencies: { outdated: [], unknowns: [] },
  });
  assert.equal(workflow.status, 'no-differences');
});
