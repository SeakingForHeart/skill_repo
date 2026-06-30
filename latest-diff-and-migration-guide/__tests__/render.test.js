const test = require('node:test');
const assert = require('node:assert/strict');
const { renderReport } = require('../runtime/render');
const { REQUIRED_SECTIONS, sectionsInOrder } = require('../runtime/validate');

function fixture(overrides = {}) {
  return {
    workflow: { status: 'ready', reason: 'ok' },
    repo: { head: 'abc', warnings: [] },
    target: { mode: 'branch', requested: 'origin/main', ref: 'origin/main', latest: 'def', range: 'HEAD..origin/main', warnings: [] },
    commits: { range: 'HEAD..origin/main', items: [], count: 0, warnings: [] },
    diff: { warnings: [], nameStatus: [] },
    dependencies: { outdated: [], unknowns: [] },
    ...overrides,
  };
}

test('renders all required sections in fixed order', () => {
  const report = renderReport(fixture());
  for (const section of REQUIRED_SECTIONS) assert.match(report, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(sectionsInOrder(report), true);
});

test('renders empty commit range explicitly', () => {
  const report = renderReport(fixture());
  assert.match(report, /None \(no commits found in range\)/);
});

test('renders commit-by-commit details', () => {
  const report = renderReport(fixture({
    commits: {
      range: 'HEAD..origin/main',
      count: 1,
      warnings: [],
      items: [{
        hash: '1234567890abcdef',
        subject: 'feat: add cli',
        author: 'A',
        authorDate: '2026-01-01',
        changedFiles: [{ status: 'M', path: 'src/cli.js' }],
        affectedAreas: ['src'],
        impact: 'Potential user-facing behavior.',
        migrationRelevance: 'Potential optional or contextual migration action.',
      }],
    },
  }));
  assert.match(report, /1234567890abcdef feat: add cli/);
  assert.match(report, /Migration relevance:/);
});
