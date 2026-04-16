---
name: commit-and-push-safely
description: "Use when: commit code, prepare git commit, push branch, write commit message, pre-push review, final repository handoff"
argument-hint: "Describe the commit scope, whether to push, the preferred commit style, and the target branch if pushing."
---

# Commit And Push Safely

## Goal
Provide a consistent, low-risk workflow for preparing commits and pushing changes.

## Use When
- User asks to commit changes
- User asks to push code
- User asks for final pre-push review
- User asks to generate a commit message from changes

## Inputs
- Optional commit scope (single file or full repo)
- Optional commit message style (conventional or plain)
- Optional push target (remote and branch)
- Optional validation command if the repo has a preferred check

## Commit Message Contract
- Default to the template in [templates/commit-message-template.md](./templates/commit-message-template.md).
- Prefer `type(scope): short summary` for the subject when the user does not provide another style.
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
4. Stage only intended files; stop if unrelated changes are mixed in.
5. Draft the commit message from the actual diff using [templates/commit-message-template.md](./templates/commit-message-template.md).
6. Cross-check the draft against [checklists/pre-push-checklist.md](./checklists/pre-push-checklist.md).
7. Create the commit only after the staged set and message are coherent.
8. Push to the confirmed remote and branch only after user confirmation.

## Safety Rules
- Never use destructive git operations unless explicitly requested.
- Never stage unrelated files silently.
- Never push without confirming branch and remote.
- If there are merge conflicts, stop and request user decision.
- Never claim tests or checks passed unless they were actually run.

## Commit Message Rules
- Match the subject and body to the staged diff exactly.
- Prefer a single coherent change per commit.
- Use the template sections in this order: subject, `Why:`, `What changed:`, `Validation:`, `Notes:`.
- Keep bullets factual and concrete; avoid filler like "update files" or "fix issues".
- If validation was skipped, write `Validation:` with `- Not run` and the reason if known.

## Output Format
- Files staged
- Commit message used
- Validation summary
- Push destination
- Any remaining risks

## Related Assets
- [checklists/pre-push-checklist.md](./checklists/pre-push-checklist.md)
- [templates/commit-message-template.md](./templates/commit-message-template.md)
