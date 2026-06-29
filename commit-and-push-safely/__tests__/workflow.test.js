const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { buildWorkflowState } = require('../runtime/workflow');

function report(overrides) {
  return {
    repoPath: '/tmp/repo',
    isGitRepo: true,
    isClean: false,
    statuses: [{ path: 'src/index.ts', status: 'M' }],
    summary: [],
    textDiff: '',
    binaryFiles: [],
    untrackedFiles: [],
    modeChanges: [],
    symlinkChanges: [],
    submoduleChanges: [],
    warnings: [],
    ...overrides,
  };
}

describe('workflow', () => {
  it('blocks non-git paths', () => {
    const state = buildWorkflowState(report({ isGitRepo: false, isClean: true, statuses: [] }));
    assert.equal(state.status, 'blocked');
    assert.equal(state.reason, 'Not a git repository');
  });

  it('blocks clean working trees', () => {
    const state = buildWorkflowState(report({ isClean: true, statuses: [] }));
    assert.equal(state.status, 'blocked');
    assert.equal(state.reason, 'No changes detected. Nothing to commit.');
  });

  it('allows dirty git repositories for manual review', () => {
    const state = buildWorkflowState(report({}));
    assert.equal(state.status, 'ready-for-manual-review');
    assert.match(state.nextStep, /manually decide/);
  });
});
