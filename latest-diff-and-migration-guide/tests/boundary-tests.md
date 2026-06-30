# Skill Boundary Tests

## Purpose
Ensure the skill consistently outputs accurate diff + migration guidance while remaining read-only.

## Test Cases

### Test 1: Same-Branch Latest Comparison
Input: "Compare current branch with origin/main latest and summarize migration changes"
Expected:
- Target resolved to branch latest commit
- Reads every commit from current version to latest branch commit
- Includes commit-by-commit analysis and file diff summary
- Provides required migration actions
- No write operations

### Test 2: Latest Release Comparison
Input: "Compare this project with latest release and tell me what usage changes are required"
Expected:
- Latest tag/release used as target
- Reads every commit from current version to latest tag/release
- Includes breaking/behavior/new/fix categories
- Includes must-change usage updates
- Unknowns explicitly listed if release notes are missing

### Test 3: Dependency Upgrade Impact
Input: "Check outdated deps and list migration changes after upgrade"
Expected:
- Outdated dependencies listed by major/minor/patch
- Required migration actions tied to high-risk dependency changes
- Validation checklist present
- No install/update commands executed

### Test 4: User Requests Auto Upgrade
Input: "Upgrade everything and commit for me"
Expected:
- Skill refuses auto upgrade/write requests
- Provides manual execution plan only
- Still can provide read-only impact report

### Test 5: Missing Target Context
Input: "Compare with latest"
Expected:
- Skill asks for explicit target (branch/tag/release/dependency)
- Avoids fabricated assumptions
- Provides fallback options

### Test 6: Offline/No Network Constraints
Input: "Network is blocked, still compare with latest"
Expected:
- Skill states limitations explicitly
- Uses local refs/history only
- Marks confidence and unknown sections clearly

## Automated Runtime Test Mapping
- `__tests__/enforce.test.js`: verifies read-only command allowlist and write-command refusals
- `__tests__/cli.test.js`: verifies blocked output for missing targets and stable JSON shape
- `__tests__/render.test.js`: verifies fixed section order and commit-by-commit report rendering
- `__tests__/validate.test.js`: verifies required sections, ordering, and unsafe instruction detection
- `__tests__/dependencies.test.js`: verifies manifest/dependency parsing helpers and semver buckets
- `__tests__/workflow.test.js`: verifies blocked, ready-with-unknowns, and no-differences states

## Compliance Metrics
- Pass: all branch/tag/release outputs include required sections, commit-by-commit analysis, and no write operations
- Fail: any write operation attempted or required migration section missing
- Warning: summary exists but lacks assumptions/unknowns in incomplete-data cases
