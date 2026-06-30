const test = require('node:test');
const assert = require('node:assert/strict');
const { assessCommand, assertReadOnlyCommand } = require('../runtime/enforce');

test('allows read-only git comparison commands', () => {
  assert.equal(assessCommand('git log --reverse --format=fuller HEAD..origin/main').safety, 'allowed');
  assert.equal(assessCommand('git show --name-status --format=fuller abc123').safety, 'allowed');
  assert.equal(assessCommand('git rev-list --reverse HEAD..origin/main').safety, 'allowed');
});

test('forbids git write commands', () => {
  for (const command of ['git commit', 'git push origin main', 'git merge main', 'git rebase main', 'git checkout -- file.js']) {
    assert.equal(assessCommand(command).safety, 'forbidden', command);
  }
});

test('allows dependency inspection commands', () => {
  assert.equal(assessCommand('npm outdated --json').safety, 'allowed');
  assert.equal(assessCommand('pip list --outdated --format=json').safety, 'allowed');
  assert.equal(assessCommand('poetry show --outdated').safety, 'allowed');
});

test('forbids dependency write commands', () => {
  for (const command of ['npm install', 'npm update', 'pnpm up', 'pip install -U package', 'uv add pytest']) {
    assert.equal(assessCommand(command).safety, 'forbidden', command);
  }
});

test('rejects shell composition', () => {
  assert.equal(assessCommand('git log && git commit').safety, 'forbidden');
  assert.throws(() => assertReadOnlyCommand('npm outdated --json; npm update'));
});
