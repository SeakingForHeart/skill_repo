function hasDependencyUpdates(dependencies) {
  return (dependencies?.outdated ?? []).some((item) => (item.items ?? []).length > 0);
}

function buildWorkflowState({ repo, target, commits, dependencies, options } = {}) {
  const mode = target?.mode ?? options?.mode ?? 'auto';

  if (!target?.requested) {
    return {
      status: 'blocked',
      reason: 'Comparison target is required.',
      nextStep: 'Provide an explicit branch/ref, latest-tag, or dependency target.',
    };
  }

  if (mode !== 'deps' && !repo?.isGitRepo) {
    return {
      status: 'blocked',
      reason: 'Git comparison requires a git repository.',
      nextStep: 'Run the analysis from a git repository or choose dependency mode.',
    };
  }

  if (mode !== 'deps' && !target?.ok) {
    return {
      status: 'blocked',
      reason: (target?.warnings ?? [])[0] ?? 'Target could not be resolved.',
      nextStep: 'Provide a locally resolvable branch, ref, or tag.',
    };
  }

  if (mode === 'deps' && (dependencies?.manifests ?? []).length === 0 && (dependencies?.ecosystems ?? []).length === 0) {
    return {
      status: 'blocked',
      reason: 'Dependency mode requires dependency manifests or an ecosystem hint.',
      nextStep: 'Provide --ecosystem or run from a project with dependency manifests.',
    };
  }

  const unknowns = [
    ...(repo?.warnings ?? []),
    ...(target?.warnings ?? []),
    ...(commits?.warnings ?? []),
    ...(dependencies?.unknowns ?? []),
  ];

  if ((commits?.items ?? []).length === 0 && !hasDependencyUpdates(dependencies)) {
    return {
      status: unknowns.length > 0 ? 'ready-with-unknowns' : 'no-differences',
      reason: 'Target resolved, but no commits or dependency updates were found by the runtime.',
      nextStep: 'Review assumptions/unknowns before deciding whether migration work is needed.',
    };
  }

  if (unknowns.length > 0) {
    return {
      status: 'ready-with-unknowns',
      reason: 'Core analysis completed with incomplete evidence.',
      nextStep: 'Review assumptions/unknowns and manually inspect missing release or dependency evidence.',
    };
  }

  return {
    status: 'ready',
    reason: 'Target resolved and read-only analysis completed.',
    nextStep: 'Use the rendered report as a draft and verify migration guidance manually.',
  };
}

module.exports = {
  buildWorkflowState,
};
