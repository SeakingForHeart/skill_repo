# Latest Diff Checklist

## Target Resolution
- Comparison target is explicit (branch head/tag/release/dependency latest)
- Current baseline commit/version captured
- Target commit/version captured
- Commit range from current baseline to target captured

## Data Collection (Read-Only)
- Repository diff collected (`git diff`/`git log`/`git show`)
- Each commit in the current-to-latest range read with metadata and changed-file summary
- Dependency manifests inspected
- Outdated dependency list captured (ecosystem-specific)
- Changelog/release notes checked when available

## Change Classification
- Commit-by-commit impacts identified
- Breaking changes identified
- Behavior changes identified
- New features identified
- Fixes and maintenance updates identified
- Dependency major/minor/patch buckets identified

## Migration Guidance Quality
- Must-change actions listed with rationale
- Optional changes listed separately
- Config/env/build/test/deploy impacts covered
- Validation steps mapped to each high-risk change

## Safety And Trust
- No write operations executed
- Assumptions explicitly marked
- Unknowns clearly labeled
- Rollback hints provided
