# Pre-Push Checklist

## Comprehensive Change Detection
- Empty state check performed (`git status`)
- Standard text changes reviewed (`git diff`)
- Binary file changes captured (`git diff --stat`)
- Permission/mode changes detected (`git diff --summary`)
- Symlink changes identified (`git diff --summary`)
- Submodule updates checked (`git diff --submodule`)
- Untracked files listed (`git status`)
- Staged file modes verified (`git ls-files -s`)
- `.git/` directory manually checked if relevant (hooks, config)
- All change types documented in commit message

## Repository State
- Working tree reviewed
- Intended files identified
- Unrelated changes excluded
- Change types classified (text/binary/permission/symlink/submodule/untracked)

## Quality Gate
- Static errors checked
- Project tests run if available
- Critical warnings reviewed

## Commit Quality
- Commit scope is minimal and coherent
- Commit message matches actual diff
- Commit message keeps template labels and section order exactly
- No template section is omitted; empty sections use explicit placeholder bullets
- Breaking changes clearly stated

## Push Safety
- Remote confirmed
- Branch confirmed
- Force push avoided unless user explicitly asks

## Technical Enforcement Check
- No Bash tool calls with forbidden git commands (`git add`, `git commit`, `git push`, `git reset --hard`, etc.)
- Only read-only git commands were executed (`git status`, `git diff`, `git log`, etc.)
- Output audited for accidentally included git write commands
- User requests for auto-commit/push were rejected with manual handoff explanation
- Skill execution stopped if forbidden operation detected

## Manual Action Boundary
- This skill does not run `git add`, `git commit`, or `git push`
- This skill must not attempt auto-commit or auto-push in any scenario
- User must manually execute git commands after review

## Final Summary
- What changed
- What was validated
- Known residual risks
- Template compliance status
- Final reminder to user: review files, branch, and remote before commit/push
