---
name: dispatching-parallel-agents
description: Optionally split independent research, design, documentation, or implementation work across parallel agents when delegation meaningfully improves speed or coverage.
---

# Dispatching Parallel Agents

Parallel agents are an optional workflow. For implementation work, prefer concurrent coding when two or more bounded slices can be developed against known interfaces without editing the same files. Keep coordination and integration with the primary agent. Use sequential work only where a real dependency, shared-file ownership, or unresolved design decision makes concurrency unsafe or wasteful.

## Use when

- Two or more research areas can be inspected independently.
- Implementation slices have known interfaces and clear, non-overlapping write ownership.
- Documentation slices have clear, non-overlapping ownership.
- Parallel review can improve coverage without duplicating the same review.

## Do not use when

- Requirements or a shared architecture/interface are still being decided.
- Tasks depend on each other's result and cannot be separated into dependency-aware waves.
- Multiple agents would need to edit the same files, contracts, or tightly coupled behavior.
- The request is small, sequential, or easier to complete directly.

## Concurrent implementation workflow

1. Read the task, acceptance criteria, applicable `AGENTS.md` files, and relevant project guidance. Identify dependencies and shared contracts before dispatch.
2. Split by independently reviewable outcome, not by an arbitrary file count. Group dependent tasks into waves. Start independent tasks in the same wave together; do not wait for one task when another can already proceed.
3. If work needs a shared interface, have the primary agent settle that interface first. Keep shared types, architecture decisions, package/configuration changes, and final integration with the primary agent unless they can be given one clear owner.
4. Give each coding agent an implementation brief with: goal and acceptance criteria; exact owned files or directories; files and contracts it must not change; interface assumptions and relevant context; expected focused checks; and a report path or response format. Keep the brief specific and self-contained, without pasting unrelated conversation history.
5. Ensure each writable path has one owner per wave. Agents may inspect other code, but coordinate before expanding their write scope. Do not dispatch parallel edits to the same file; if a shared file must change, assign it to one owner or have agents return proposals for the primary agent to integrate.
6. Ask each coding agent to report changed paths, behavior implemented, checks actually run and their results, and unresolved questions or risks. Agents must follow repository rules for tests, Git, dependencies, and external actions; delegation does not grant extra permissions.
7. The primary agent integrates completed slices, inspects the combined diff and ownership boundaries, resolves cross-slice mismatches, and runs focused integration checks justified by the task and project instructions. Review every agent result; do not treat agent self-review as integration review.

## Implementation task brief

```text
Outcome:
Acceptance criteria:
Owned paths:
Do not edit:
Interfaces and constraints:
Relevant context:
Focused checks:
Report: changed paths, summary, checks and results, open concerns
```

For implementation tasks, aim to keep independent coding and focused checks concurrent. Switch to sequential execution only for dependent work, conflicting write scopes, or when integration findings require a coordinated correction. Do not create commits, branches, worktrees, or external changes unless the user authorized that action and repository instructions allow it.

Do not parallelize requirements discovery, shared architecture, package configuration, scene/state contracts, or small work where coordination dominates.
