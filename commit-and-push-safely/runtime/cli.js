#!/usr/bin/env node

const { auditOutput } = require('./audit');
const { collectChangeReport } = require('./collect');
const { renderCommitDraft } = require('./draft');
const { assessRisk } = require('./risk');
const { validateDraftAgainstChecklist } = require('./validate');
const { buildWorkflowState } = require('./workflow');

function parseArgs(argv) {
  const repoPath = argv[2] ?? process.cwd();
  const subject = argv[3] ?? 'chore(skill): prepare safe commit handoff';
  return { repoPath, subject };
}

function buildAnalysisOutput(repoPath, subject) {
  const report = collectChangeReport(repoPath);
  const workflow = buildWorkflowState(report);
  const risk = assessRisk(report);

  if (workflow.status === 'blocked') {
    const blockedMessage = `Manual handoff blocked. ${workflow.reason ?? 'Repository is not ready for commit preparation.'}`;
    return {
      workflow,
      report,
      risk,
      draft: null,
      checklist: [],
      audit: auditOutput(blockedMessage),
    };
  }

  const draft = renderCommitDraft({ subject }, report);
  const checklist = validateDraftAgainstChecklist(report, draft);
  const audit = auditOutput(`Manual handoff only.\n\n${draft}`);

  return {
    workflow,
    report,
    risk,
    draft,
    checklist,
    audit,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const output = buildAnalysisOutput(args.repoPath, args.subject);

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildAnalysisOutput,
};
