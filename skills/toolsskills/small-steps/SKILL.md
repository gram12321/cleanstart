---
name: small-steps
description: Use for routine project work that needs the smallest safe change without broad plans, refactors, new systems, or scope expansion.
---

# Small Steps

Make the smallest useful change that satisfies the request. This is the default workflow when no specialist skill fits better.

## Rules

- Identify the smallest file set and behavior surface before editing.
- Reuse the existing project patterns; do not add opportunistic cleanup, naming churn, dependencies, or abstractions.
- Ask before introducing a new persistent shape, dependency, major project scaffold, broad refactor, or shared public abstraction.
- Keep status updates brief. Finish with changed files and verification actually run.
- For documentation-only work, targeted reads/searches are sufficient unless the task requires more.

## Work loop

1. Restate the minimum intended result internally.
2. Read only the relevant files and direct contracts.
3. Edit only what the requested behavior needs.
4. Run the smallest useful check.
5. Report outcome and any verification gap.
