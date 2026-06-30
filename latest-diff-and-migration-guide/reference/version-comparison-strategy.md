# Version Comparison Strategy

## 1. Target Modes

### A. Same-Branch Latest Commit
Use when user asks: "compare with latest on this branch".

Recommended read-only commands:
- `git rev-parse HEAD`
- `git rev-parse origin/<branch>`
- `git log --reverse --format=fuller HEAD..origin/<branch>`
- `git show --name-status --format=fuller <commit>` for each commit in the range
- `git diff --name-status HEAD..origin/<branch>`

### B. Latest Tag/Release
Use when user asks: "compare with latest version".

Recommended commands/files:
- `git tag --sort=-creatordate`
- `git log --reverse --format=fuller <current-ref>..<latest-tag>`
- `git show --name-status --format=fuller <commit>` for each commit in the range
- `git show <latest-tag> --name-status`
- `git diff --name-status <current-ref>..<latest-tag>`
- CHANGELOG / release note files in repository

### C. Latest Dependency Versions
Use when user asks dependency upgrade impact.

Node ecosystem:
- `npm outdated` or `pnpm outdated` or `yarn outdated`
- Inspect `package.json` + lockfile

Python ecosystem:
- `pip list --outdated`
- `poetry show --outdated`
- Inspect `requirements*.txt` / `pyproject.toml`

## 2. Commit Range Analysis

For branch or tag/release comparisons, read every commit from the current version to the latest version in chronological order.

For each commit, capture:
- Commit hash and subject
- Author/date when available
- Changed files or affected areas
- Direct user-facing impact
- Migration relevance, if any

Use per-commit evidence to support the final grouped summary and migration actions.

## 3. Diff Prioritization

Prioritize findings in this order:
1. Breaking change or incompatible API behavior
2. Runtime/configuration behavior shifts
3. Security-sensitive fixes requiring action
4. Feature additions and non-breaking improvements
5. Low-risk maintenance updates

## 4. Migration Output Rules

For each high-impact change, include:
- What changed
- Why users are affected
- Required action
- Validation step
- Rollback hint

## 5. Confidence Marking

If evidence is direct (diff/release note/changelog), mark as high confidence.
If inferred from version bump without notes, mark as medium/low confidence.
Always separate confirmed facts from assumptions.
