const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { assessRisk } = require('../runtime/risk');

function report(overrides) {
  return {
    repoPath: '/tmp/repo',
    isGitRepo: true,
    isClean: false,
    statuses: [{ path: 'src/index.ts', status: 'M' }],
    summary: [],
    textDiff: 'diff --git a/src/index.ts b/src/index.ts',
    binaryFiles: [],
    untrackedFiles: [],
    modeChanges: [],
    symlinkChanges: [],
    submoduleChanges: [],
    warnings: [],
    ...overrides,
  };
}

describe('risk', () => {
  it('marks binary changes as high risk', () => {
    const risk = assessRisk(report({ binaryFiles: ['Binary files differ: image.png'] }));
    assert.equal(risk.highestSeverity, 'high');
    assert.ok(risk.findings.some((finding) => finding.label === 'binary-changes'));
  });

  it('marks submodule changes as high risk', () => {
    const risk = assessRisk(report({ submoduleChanges: ['Submodule lib changed'] }));
    assert.equal(risk.highestSeverity, 'high');
    assert.ok(risk.findings.some((finding) => finding.label === 'submodule-changes'));
  });

  it('marks mode changes as medium risk', () => {
    const risk = assessRisk(report({ modeChanges: ['mode change 100644 => 100755 script.sh'] }));
    assert.equal(risk.highestSeverity, 'medium');
    assert.ok(risk.findings.some((finding) => finding.label === 'mode-changes'));
  });

  it('marks untracked files as medium risk', () => {
    const risk = assessRisk(report({
      statuses: [{ path: 'new-file.ts', status: '??' }],
      untrackedFiles: ['new-file.ts'],
    }));
    assert.equal(risk.highestSeverity, 'medium');
    assert.ok(risk.findings.some((finding) => finding.label === 'untracked-files'));
  });

  it('marks small text-only changes as low risk', () => {
    const risk = assessRisk(report({}));
    assert.equal(risk.highestSeverity, 'low');
    assert.ok(risk.findings.some((finding) => finding.label === 'text-only'));
  });
});
