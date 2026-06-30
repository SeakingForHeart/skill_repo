const test = require('node:test');
const assert = require('node:assert/strict');
const { auditOutput, auditWriteMentions } = require('../runtime/audit');

test('flags unsafe write and upgrade instructions', () => {
  assert.equal(auditWriteMentions('run npm install').some((issue) => issue.level === 'fail'), true);
  assert.equal(auditWriteMentions('I upgraded dependencies').some((issue) => issue.level === 'fail'), true);
  assert.equal(auditWriteMentions('then git push origin main').some((issue) => issue.level === 'fail'), true);
});

test('allows manual boundary wording', () => {
  const issues = auditWriteMentions('Manual plan only: user must run npm install outside this skill after review.');
  assert.equal(issues.some((issue) => issue.level === 'fail'), false);
});

test('warns when read-only boundary is missing', () => {
  const issues = auditOutput('Latest Diff And Migration Report');
  assert.equal(issues.some((issue) => issue.level === 'warning'), true);
});
