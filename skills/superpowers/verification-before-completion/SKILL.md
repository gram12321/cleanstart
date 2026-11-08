---
name: verification-before-completion
description: Use before reporting code, UI, documentation, or configuration work complete when claims need fresh evidence.
---

# Verification Before Completion

Use this workflow when work is broad, reaches a feature-complete point, the user requests testing or review, or a specific correctness claim needs fresh evidence. Do not run a test suite, browser check, or review agents automatically for every small change. Choose the smallest useful evidence for the actual risk, inspect its result, and report only checks actually run.

| Change | Minimum useful evidence |
|---|---|
| Documentation or skills | Read changed links, names, ownership, and claims; use `git diff --check` when available. |
| Pure domain state, rules, or coordinate math | At a verification threshold, focused tests for the changed behavior and meaningful boundaries. |
| PixiJS rendering or canvas input | At a verification threshold, focused automated checks plus a browser check of the affected visual or interaction when relevant. |
| React UI or user flow | At a verification threshold, focused automated checks plus a browser check at the affected layout and interaction when relevant. |
| Build or configuration | At a verification threshold, the relevant configured command after confirming it exists in `package.json`. |

Use checked-in browser tests for major changed interactions or important UI flows when relevant. For substantial user-visible changes, use `skills/toolsskills/computer-use-ui-checks/SKILL.md` when Computer Use is available. A new screen, major layout change, or changed canvas interaction merits a real browser check. Small copy, documentation, and routine code edits do not trigger browser testing by default. Browser checks and automated tests answer different questions.

When the post-change review threshold applies, include the quality-control reviewer reports produced under `../post-change-code-review/SKILL.md` in the evidence you assess. Resolve confirmed findings and recheck affected behavior after fixes. Reviewer opinions alone do not prove that a test or visual check ran.

Do not invent commands, run broad checks, launch a server, or mutate Git state without authorization or a clear task-specific reason under `AGENTS.md`. If a relevant check cannot run, describe the edited work and the remaining verification gap without claiming that behavior was verified.
