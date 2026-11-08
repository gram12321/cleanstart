---
name: improve-codebase-architecture
description: Review or improve project architecture when the user explicitly requests a focused refactor, boundary review, or cleanup proposal.
---

# Improve Codebase Architecture

Use only for an explicit architecture/refactor review; it is not a routine completion gate.

Read the relevant modules, `PROJECT_INFO.md`, `CONTEXT.md`, and `design.md` before proposing changes. Identify concrete friction with file references: mixed rule/render/UI ownership, duplicated coordinate conversion, stale derived state, scene lifetime leaks, asset lifecycle confusion, or a needless abstraction.

Present focused candidates only: the problem, smallest affected files, intended owner, benefit, risk, and focused verification. Wait for user direction before broad refactoring.

For detailed evaluation criteria, read [references/architecture-boundaries.md](references/architecture-boundaries.md).
