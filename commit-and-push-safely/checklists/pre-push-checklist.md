# Pre-Push Checklist

## Repository State
- Working tree reviewed
- Intended files identified
- Unrelated changes excluded

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
