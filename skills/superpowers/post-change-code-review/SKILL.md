---
name: post-change-code-review
description: Use after code changes that meet the repository's review threshold before reporting the work complete.
---

# Post-Change Code Review

Use this review for work that changes a major mechanic, is broad enough to need a written plan, reaches a feature-complete point, or when the user explicitly requests review. Do not dispatch reviewers automatically for every small code change. When triggered, use the number of independent quality-control reviewers justified by the scope and useful separation of perspectives; do not require a fixed count. Run them concurrently when multiple reviewers add independent coverage and the runtime permits. This review is after implementation, including changes made by parallel coding agents; it does not replace the primary agent's own integration and verification.

Documentation-only, skill-only, and asset-only changes do not trigger this stage. A review-only request uses `../requesting-code-review/SKILL.md` instead.

## Prepare the review

1. Finish the code change and identify every changed code path. Include relevant tests, scripts, and behavior-changing configuration. The primary agent supplies the path list from its work; this workflow requires no issue tracker, commit, branch, diff, or Git command.
2. Write a compact review brief: the user's requested outcome and acceptance criteria; the changed paths and what changed; relevant project documents or interface contracts; and checks actually run with their results. Say when a behavior or rendering check was not performed.
3. Give each reviewer the same brief and permission to read the affected files, callers, and nearby tests. They must inspect the current files rather than trust the change summary. Keep reviewers read-only: no edits, test runs, commits, external comments, or nested delegation.

## Choose review coverage

Consider these review perspectives and choose the coverage that fits the change. One reviewer may cover both; split them across reviewers only when the change's scope makes independent coverage useful.

- **Behavior and scope:** Compare the current implementation and accompanying documentation claims with the user request and approved project direction. Look for missing behavior, incorrect flows, regressions, and unrequested scope. Cite the requirement or behavior behind each finding.
- **Code quality and integration:** Check correctness, edge cases, state ownership, React/PixiJS boundaries, input and coordinate handling, resource cleanup, duplicate rules, dead code, unnecessary rendering work, and speculative abstractions in the changed area. Assess existing verification evidence and follow the affected code across module boundaries where needed.

Each agent returns only concrete, actionable findings ordered Critical, Important, Minor. For each finding, give a current `path:line`, the affected scenario, evidence, impact, and a practical correction. Put uncertain or unverified behavior under **Verification gaps**, not **Findings**. Report “No findings” when appropriate; avoid style preferences and speculative warnings.

## Integrate the review

The primary agent checks each report against the code and requirements, removes duplicates, investigates disagreements, and fixes confirmed issues within the requested scope. After a code fix, repeat a proportionate review focused on the changed area and earlier findings. Continue until confirmed findings are resolved or report a remaining blocker accurately. Choose and report verification according to `AGENTS.md`; reviewer reports are evidence to assess, not proof that an interaction was tested.

If the runtime cannot spawn reviewers, inspect the relevant review perspectives directly and state in the final response that independent agent review was unavailable. Do not claim that quality-control agents ran when they did not.
