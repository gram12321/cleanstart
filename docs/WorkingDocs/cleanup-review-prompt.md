# Code Review and Cleanup Prompt

Check whether the requested work was implemented as intended and whether the implementation fits the existing project structure.

Review for correctness, clear ownership, maintainable architecture, and consistency with repository conventions. Also look for focused cleanup opportunities such as duplicate rules, dead code, stale exports, unexplained constants, comments that only restate code, unnecessary wrappers, repeated expensive work, avoidable React renders, PixiJS object churn, and logic placed in the wrong module.

Use the available search and review skills to inspect the relevant code and its callers. Keep changes within the requested scope, preserve behavior unless a behavior change is requested, and report findings with concrete file references and evidence.
