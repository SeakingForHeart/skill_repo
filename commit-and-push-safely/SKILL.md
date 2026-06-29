---
name: commit-and-push-safely
description: "Use when: review changes, write commit messages, run pre-push checks, and prepare a safe manual handoff"
argument-hint: "Describe the review scope and desired subject wording. Output must strictly follow the commit template. This skill only checks and writes, and must never attempt add/commit/push."
---

# Commit And Push Safely

## Goal
Provide a consistent, low-risk workflow for checking repository changes and writing commit-ready outputs without executing git write actions.

## Runtime Implementation
- This skill now includes executable read-only runtime modules under `commit-and-push-safely/runtime/`.
- Runtime coverage includes git command boundary enforcement, repository change collection, commit draft rendering, checklist validation, and output auditing.
- A CLI entry point can compile and emit structured JSON artifacts for report / draft / checklist / audit consumption.
- Human / LLM judgment is still required for commit scope decisions, semantic subject wording, breaking-change assessment, and choosing the narrowest relevant validation command.

## Execution Boundary
- This skill is check-and-write only.
- It must never attempt `git add`, `git commit`, or `git push`.
- It must never auto-commit, auto-push, or retry by running git write commands.
- If asked to submit changes, provide a manual handoff only.

## Technical Constraints (Hard Enforcement)
### Forbidden Tool Calls
This skill MUST NEVER invoke the Bash tool with any of these commands:
- `git add`
- `git commit`
- `git push`
- `git reset --hard`
- `git clean -fd`
- `git checkout` (with file paths to discard changes)
- `git stash`
- Any git command that modifies working tree, index, or remote state

### Allowed Git Commands (Read-Only)
Only these git commands are permitted:
- `git status`
- `git diff`
- `git log`
- `git branch` (without -d/-D flags)
- `git remote -v`
- `git ls-files`
- `git show`
- `git rev-parse`
- Other read-only git commands that do not modify state

### Runtime Enforcement
1. **Pre-execution check**: Before invoking Bash, the runtime command classifier must verify the command does not match forbidden patterns
2. **Output audit**: After generating output, the runtime auditor must scan for accidentally included git write commands or auto-execution phrasing
3. **User request rejection**: If user explicitly requests auto-commit/push, refuse and explain manual handoff policy
4. **Stop on violation**: If any forbidden operation is detected, immediately halt and report error

### Defensive Prompts
When user requests unsafe actions, respond with:
```
This skill cannot perform git write operations. You must manually execute:
- git add <files>
- git commit (using the provided draft)
- git push <remote> <branch>
```

## Use When
- User asks to review repository changes before commit
- User asks to prepare commit content safely
- User asks for final pre-push review
- User asks to generate a commit message from changes

## Inputs
- Optional commit scope (single file or full repo)
- Optional commit message style (conventional or plain)
- Optional validation command if the repo has a preferred check

## Commit Message Contract
- Default to the template in [templates/commit-message-template.md](./templates/commit-message-template.md).
- The commit message draft must use the template labels and section order exactly as written.
- The commit message draft must include all template sections every time, even if some sections have no data.
- Prefer `type(scope): short summary` for the subject when the user does not provide another style.
- For conventional subjects, `type` must be one of: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- Use these `type` meanings:
  - `feat`: new feature.
  - `fix`: bug fix.
  - `docs`: documentation-only change.
  - `style`: formatting/style-only change with no runtime behavior impact.
  - `refactor`: code restructuring without adding features or fixing bugs.
  - `test`: test additions or test updates.
  - `chore`: build process, tooling, or maintenance task.
- `scope` identifies the impacted module, layer, or bounded area. Omit `scope` when the project has no clear modular split or when adding a scope would be artificial.
- Keep the subject line under 72 characters and write it in imperative mood.
- The subject must describe the actual diff, not an intention or a generic task label.
- Fill `Why:` with the reason for the change when that context is available from the diff or user request.
- Fill `What changed:` with concrete behavior, API, or file-level changes.
- Fill `Validation:` with checks that were actually run. If nothing was run, say so explicitly instead of implying validation.
- Keep `Notes:` present in the output. If there are no notes, write `- None`.
- If the change is breaking or operationally risky, call that out clearly in the body.

## Diff Limitation Warning
Standard `git diff` may miss certain change types. This skill uses comprehensive detection to capture all changes:

### Changes Not in Standard `git diff`
1. **Untracked files**: Empty new files not yet staged
2. **File permissions**: `chmod` changes (use `git diff --summary`)
3. **Binary files**: Images, binaries show "Binary files differ" only
4. **Whitespace**: May be hidden by `-w/-b` flags or editor configs
5. **Symlinks**: Target changes not fully visible in standard diff
6. **Submodules**: Content changes shown as SHA1 only
7. **Git internals**: `.git/hooks`, `.git/config` not tracked by Git
8. **CRLF/LF**: Line ending conversions affected by `core.autocrlf`
9. **Large files**: May be truncated or cause memory limits
10. **Git objects corruption**: `.git/objects` damage (use `git fsck`)
11. **Multiple worktrees**: Changes in other worktrees not visible
12. **External diff tools**: May filter/format output differently

### Comprehensive Detection Commands
Always run these to ensure complete change capture:
```bash
git status                    # Tracked + untracked files
git diff                      # Standard text changes
git diff --stat               # File size changes (binary)
git diff --summary            # File mode/symlink changes
git diff --submodule          # Submodule updates (if applicable)
git ls-files -s               # Staged file modes
```

## Workflow
1. **Enforcement check**: Verify no forbidden git commands will be executed during this session.

2. **Empty state check**: Run `git status` first. If output shows "nothing to commit, clean working tree", stop immediately and inform user: "No changes detected. Nothing to commit."

3. **Comprehensive change detection**: Run multiple git commands to capture all change types:
   - `git status` - Capture tracked, untracked, and deleted files
   - `git diff` - Standard text changes in tracked files
   - `git diff --stat` - File size changes for binary files
   - `git diff --summary` - File permission changes, symlink changes, file creation/deletion
   - `git diff --submodule` - Submodule updates (only if repository has submodules)
   - `git ls-files -s` - Check staged file modes (permission bits)
   - **Manual reminder**: Alert user to manually check `.git/` directory files if relevant (hooks, config)

4. **Change type classification**: Categorize detected changes:
   - Text changes (standard diff)
   - Binary changes (size/stat only)
   - Permission/mode changes
   - Untracked files (need `git add`)
   - Symlink changes
   - Submodule updates
   - Git internal file changes (manual check)

5. **Risk assessment**: Review all detected changes and summarize risk by severity:
   - High risk: Large changes, many files, binary modifications, submodule updates
   - Medium risk: Permission changes, new untracked files
   - Low risk: Documentation changes, small text edits
   - **Warning**: Alert if binary files, submodules, or permission changes detected

6. **Unrelated change check**: Propose intended file set. Stop if unrelated changes are mixed in (e.g., feature code + unrelated docs).

7. **Validation**: Run the narrowest relevant validation that exists and record the result.

8. **Commit message drafting**: Draft the commit message from the actual diff by filling [templates/commit-message-template.md](./templates/commit-message-template.md) line-by-line in the same order. For non-standard changes (binary, permissions, submodules), include specific notes in `What changed:` section.

9. **Cross-check**: Cross-check the draft against [checklists/pre-push-checklist.md](./checklists/pre-push-checklist.md), including:
   - Template-label and section-order compliance
   - All detected change types are mentioned in `What changed:` section
   - Non-standard changes (binary, permissions, submodules) have explicit notes

10. **Output audit**: Scan generated output to ensure:
    - No git write commands are accidentally included
    - All detected change types from step 3 are documented
    - Untracked files are listed separately with reminder to `git add`

11. **Hard stop**: Hard stop at preparation output only. Never attempt `git add`, `git commit`, or `git push`.

12. **Final reminder**: End by reminding the user to manually review:
    - All files detected (including untracked, binary, permission changes)
    - `.git/` directory files if relevant (hooks, config)
    - Branch and remote before commit/push
    - Manual execution of git commands

## Safety Rules
- Never use destructive git operations unless explicitly requested.
- Never stage files, create commits, or push from this skill.
- Never attempt git write commands as a convenience, fallback, or retry.
- **FORBIDDEN**: Any Bash tool call with `git add`, `git commit`, `git push`, `git reset --hard`, `git clean`, or other write operations.
- If there are merge conflicts, stop and request user decision.
- Never claim tests or checks passed unless they were actually run.
- Reject user requests for auto-commit/push with manual handoff explanation.
- Audit output before finalizing to ensure no git write commands leaked through.

## Commit Message Rules
- Match the subject and body to the staged diff exactly.
- Prefer a single coherent change per commit.
- Use the template sections in this order: subject, `Why:`, `What changed:`, `Validation:`, `Notes:`.
- Keep template labels unchanged. Do not rename `Why:`, `What changed:`, `Validation:`, or `Notes:`.
- Do not use custom `type` labels outside `feat|fix|docs|style|refactor|test|chore`.
- Keep bullets factual and concrete; avoid filler like "update files" or "fix issues".
- If validation was skipped, write `Validation:` with `- Not run` and the reason if known.
- If a required section has no content, use an explicit placeholder bullet instead of omitting the section.

## Output Format
- Intended files to stage (suggested only)
- Commit message draft that strictly follows [templates/commit-message-template.md](./templates/commit-message-template.md) with all labels and sections present
- Validation summary
- Manual check reminder
- Any remaining risks

## Related Assets
- [checklists/pre-push-checklist.md](./checklists/pre-push-checklist.md)
- [templates/commit-message-template.md](./templates/commit-message-template.md)
