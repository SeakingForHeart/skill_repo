const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, buildAnalysisOutput } = require('../runtime/cli');

test('parseArgs supports defaults and options', () => {
  const args = parseArgs(['node', 'cli.js', '/repo', 'origin/main', '--mode', 'branch', '--scope=a,b', '--ecosystem', 'npm']);
  assert.equal(args.repoPath, '/repo');
  assert.equal(args.target, 'origin/main');
  assert.equal(args.options.mode, 'branch');
  assert.deepEqual(args.options.scope, ['a', 'b']);
  assert.equal(args.options.ecosystem, 'npm');
});

test('missing target returns blocked JSON shape', () => {
  const output = buildAnalysisOutput(process.cwd(), null, { mode: 'branch' });
  assert.equal(output.workflow.status, 'blocked');
  for (const key of ['workflow', 'target', 'repo', 'commits', 'diff', 'dependencies', 'summary', 'migration', 'checklist', 'audit', 'report']) {
    assert.ok(Object.hasOwn(output, key), key);
  }
});
