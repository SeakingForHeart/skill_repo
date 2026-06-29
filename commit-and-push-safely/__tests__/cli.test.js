const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { buildAnalysisOutput } = require('../runtime/cli');

describe('cli analysis output', () => {
  it('returns blocked workflow and no draft for non-git paths', () => {
    const output = buildAnalysisOutput('/tmp/definitely-not-a-git-repo-for-skill-runtime', 'docs: update notes');
    assert.equal(output.workflow.status, 'blocked');
    assert.equal(output.workflow.reason, 'Not a git repository');
    assert.equal(output.draft, null);
    assert.deepEqual(output.checklist, []);
  });
});
