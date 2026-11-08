---
name: code-cleanup
description: Use when the user requests behavior-preserving cleanup, simplification, or optimization of project code.
---

# Code Cleanup

Keep the current behavior and scope. Read the affected code and relevant working docs, then identify concrete cleanup candidates with file references. Separate safe local changes from behavior-risking redesign; do not turn routine cleanup into a feature or architecture project.

Look for duplicate logic, dead code, stale exports, unexplained constants, comments that only restate code, needless wrappers, repeated expensive work, unnecessary React renders or PixiJS object churn, and logic in the wrong owner. Derive module boundaries from the actual application instead of assuming a folder structure. Prefer deletion and direct code over speculative abstractions. Keep visual styles local unless genuine reuse warrants a shared token.

Make the smallest useful edit. Choose verification based on the behavior and risk, update the owning documentation only if a durable fact or convention changed, and use `../../superpowers/post-change-code-review/SKILL.md` when its documented thresholds apply. For a broad boundary review or refactor proposal, use `../../superpowers/improve-codebase-architecture/SKILL.md` first.
