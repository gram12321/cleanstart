---
name: writing-plans
description: Create a concrete implementation plan for approved work that is broad, risky, cross-cutting, or explicitly needs a durable plan.
---

# Writing Plans

Write a plan only when it materially reduces implementation risk or the user asks for one.

Before planning, read the approved goal, current implementation facts, and only the working documents relevant to the topic. Do not assume files, scripts, dependencies, state libraries, or project structure that do not exist.

Use a concise header with goal, scope, constraints, architecture, files, and verification. Each ordered task should name real or necessary new file targets, ownership boundaries, intended behavior, and focused verification. Keep tasks independently reviewable. Include updates to the smallest owning documentation files when durable decisions, repository facts, or behavior change.

Save a durable plan only when requested. Use `plans/YYYY-MM-DD-<topic>.md` unless the user names another location. Include Git, backend, dependency, or migration work only when it is part of the approved scope.
