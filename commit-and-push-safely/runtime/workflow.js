function buildWorkflowState(report) {
  if (!report.isGitRepo) {
    return {
      status: 'blocked',
      reason: 'Not a git repository',
      nextStep: 'Run this skill from a git repository before preparing a commit handoff.',
    };
  }

  if (report.isClean) {
    return {
      status: 'blocked',
      reason: 'No changes detected. Nothing to commit.',
      nextStep: 'No commit handoff is needed until the working tree contains changes.',
    };
  }

  return {
    status: 'ready-for-manual-review',
    nextStep: 'Review the structured report and manually decide whether to stage, commit, and push outside this skill.',
  };
}

module.exports = {
  buildWorkflowState,
};
