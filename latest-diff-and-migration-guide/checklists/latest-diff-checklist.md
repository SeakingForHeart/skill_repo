# Latest Diff Checklist

## Target Resolution
- Comparison target is explicit (branch head/tag/release/dependency latest)
- Current baseline commit/version captured
- Target commit/version captured

## Data Collection (Read-Only)
- Repository diff collected (`git diff`/`git log`/`git show`)
- Dependency manifests inspected
- Outdated dependency list captured (ecosystem-specific)
- Changelog/release notes checked when available

## Change Classification
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
