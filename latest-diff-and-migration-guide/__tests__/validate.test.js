const test = require('node:test');
const assert = require('node:assert/strict');
const { renderReport } = require('../runtime/render');
const { validateReportAgainstChecklist, sectionsInOrder } = require('../runtime/validate');

const context = {
  workflow: { status: 'ready', reason: 'ok' },
  repo: { head: 'abc', warnings: [] },
  target: { mode: 'branch', ok: true, requested: 'origin/main', latest: 'def', range: 'HEAD..origin/main', warnings: [] },
  commits: { range: 'HEAD..origin/main', items: [], count: 0, warnings: [] },
  diff: { warnings: [], nameStatus: [] },
  dependencies: { manifests: [], outdated: [], unknowns: [] },
};

test('valid report passes section and write-command checks', () => {
  const report = renderReport(context);
  const findings = validateReportAgainstChecklist(context, report);
  assert.equal(findings.find((item) => item.label === 'section-order').level, 'pass');
  assert.equal(findings.find((item) => item.label === 'write-command-leak').level, 'pass');
});

test('missing section fails', () => {
  const report = renderReport(context).replace('## Change Summary', '## Changed Summary');
  const findings = validateReportAgainstChecklist(context, report);
  assert.equal(findings.find((item) => item.label === 'section:## Change Summary').level, 'fail');
});

test('section order helper detects wrong order', () => {
  assert.equal(sectionsInOrder('## Change Summary\n## Target Compared'), false);
});

test('unsafe write instruction fails', () => {
  const report = `${renderReport(context)}\nrun npm install\n`;
  const findings = validateReportAgainstChecklist(context, report);
  assert.equal(findings.find((item) => item.label === 'write-command-leak').level, 'fail');
});
