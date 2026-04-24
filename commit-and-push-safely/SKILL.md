---
name: commit-and-push-safely
description: "Use when: review changes, write commit messages, run pre-push checks, and prepare a safe manual handoff"
argument-hint: "Describe the review scope and preferred commit message style. This skill only checks and writes, and must never attempt add/commit/push."
---

# Commit And Push Safely

## Goal
Provide a consistent, low-risk workflow for checking repository changes and writing commit-ready outputs without executing git write actions.

## Execution Boundary
- This skill is check-and-write only.
- It must never attempt `git add`, `git commit`, or `git push`.
- It must never auto-commit, auto-push, or retry by running git write commands.
- If asked to submit changes, provide a manual handoff only.

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
- Use `Notes:` only for important follow-up, migration, or risk details.
- If the change is breaking or operationally risky, call that out clearly in the body.

## Workflow
1. Inspect current repository status.
2. Review the diff for only the intended files and summarize risk by severity.
3. Run the narrowest relevant validation that exists and record the result.
4. Propose an intended file set; stop if unrelated changes are mixed in.
5. Draft the commit message from the actual diff using [templates/commit-message-template.md](./templates/commit-message-template.md).
6. Cross-check the draft against [checklists/pre-push-checklist.md](./checklists/pre-push-checklist.md).
7. Hard stop at preparation output only. Never attempt `git add`, `git commit`, or `git push`.
8. End by reminding the user to manually review files, branch, remote, and command choices before any commit or push.

## Safety Rules
- Never use destructive git operations unless explicitly requested.
- Never stage files, create commits, or push from this skill.
- Never attempt git write commands as a convenience, fallback, or retry.
- If there are merge conflicts, stop and request user decision.
- Never claim tests or checks passed unless they were actually run.

## Commit Message Rules
- Match the subject and body to the staged diff exactly.
- Prefer a single coherent change per commit.
- Use the template sections in this order: subject, `Why:`, `What changed:`, `Validation:`, `Notes:`.
- Do not use custom `type` labels outside `feat|fix|docs|style|refactor|test|chore`.
- Keep bullets factual and concrete; avoid filler like "update files" or "fix issues".
- If validation was skipped, write `Validation:` with `- Not run` and the reason if known.

## Output Format
- Intended files to stage (suggested only)
- Commit message draft
- Validation summary
- Manual check reminder
- Any remaining risks

## Related Assets
- [checklists/pre-push-checklist.md](./checklists/pre-push-checklist.md)
- [templates/commit-message-template.md](./templates/commit-message-template.md)
