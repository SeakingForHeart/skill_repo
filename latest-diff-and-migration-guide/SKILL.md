---
name: latest-diff-and-migration-guide
description: "Use when: compare current workspace or dependency versions against latest branch/tag/package release and produce concise change summary plus migration actions"
argument-hint: "Provide comparison target (same-branch latest commit, latest tag/release, or latest dependency versions), scope, and preferred package manager."
---

# Latest Diff And Migration Guide

## Goal
Read version differences between the current workspace and a latest target (same-branch latest commit, latest tag/release, or latest dependency versions), then output:
1) concise change summary, and
2) required usage/migration updates after upgrading.

## Execution Boundary
- This skill is analysis-and-report only.
- It must not modify source files, lockfiles, dependency manifests, or CI configs.
- It must not execute upgrade/install commands.
- If the user asks for auto-upgrade, provide a migration report and a manual execution plan only.

## Technical Constraints (Hard Enforcement)
### Forbidden Operations
This skill MUST NEVER run write operations such as:
- Git write commands (`git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset --hard`, `git checkout -- <file>`)
- Dependency write commands (`npm install`, `npm update`, `pnpm up`, `yarn upgrade`, `pip install -U`, `poetry update`, `uv add`)
- File-writing shell commands that alter project state

### Allowed Operations (Read-Only)
- Git read commands (`git status`, `git log`, `git show`, `git diff`, `git rev-parse`, `git branch`, `git remote -v`, `git fetch --dry-run` if needed)
- Dependency inspection commands (`npm outdated`, `pnpm outdated`, `yarn outdated`, `pip list --outdated`, `poetry show --outdated`, `uv tree` read usage)
- Manifest and changelog reads (`package.json`, lockfile, requirements, pyproject, CHANGELOG)

## Use When
- User asks what changed between current workspace and latest branch/release.
- User wants dependency update impact summary before upgrading.
- User needs migration steps after pulling latest or bumping dependencies.

## Inputs
- Comparison target:
  - same-branch latest commit (e.g., `origin/main`)
  - latest tag or release
  - latest dependency versions
- Scope: full repo, selected paths, selected dependencies
- Optional ecosystem hint: `npm`, `pnpm`, `yarn`, `pip`, `poetry`, `uv`

## Workflow
1. Resolve target baseline (branch head, tag, release, or dependency latest).
2. Gather current state and target state with read-only commands and file inspection.
3. Produce structured diff summary:
   - Breaking / behavior-impacting changes
   - New features
   - Fixes and risk points
   - Dependency-level updates
4. Extract migration actions for current users:
   - API or CLI usage changes
   - Config changes
   - Environment/runtime changes
   - Build/test/deploy updates
5. If data is incomplete, state assumptions and confidence level.
6. Output final report using the template in [templates/report-template.md](./templates/report-template.md).

## Output Contract
Output must contain all sections below in fixed order:
1. Target compared
2. Change summary
3. Dependency update summary
4. Required migration actions
5. Optional migration actions
6. Validation checklist
7. Risks and rollback hints

## Safety Rules
- Never claim a dependency or release note was checked unless evidence exists.
- Never recommend destructive git operations by default.
- If network access is unavailable, explicitly provide offline fallback based on local history only.
- If comparison target cannot be resolved, stop and ask for a clearer target.

## Related Assets
- [checklists/latest-diff-checklist.md](./checklists/latest-diff-checklist.md)
- [templates/report-template.md](./templates/report-template.md)
- [reference/version-comparison-strategy.md](./reference/version-comparison-strategy.md)
