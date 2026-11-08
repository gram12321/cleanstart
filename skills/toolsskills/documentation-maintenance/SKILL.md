---
name: documentation-maintenance
description: Use when creating, revising, moving, or reviewing project documentation or documentation claims.
---

# Documentation Maintenance

Use the repository `README.md` and `AGENTS.md` to locate the document that owns each fact. Keep approved decisions, plans, and implemented behavior distinct. Verify implementation claims against current source; do not treat archived or unrelated project material as authority.

- `CONTEXT.md` defines stable shared terms. `design.md` records approved product direction. `application-flow.md` owns state and interaction flow. `VariableRelationshipMap.md` indexes concrete variables, dependencies, state owners, and action effects. `PROJECT_INFO.md` records verified stack, commands, repository shape, and implementation status.
- Put a fact in its owning document and link to it from the others. When a variable or action relationship changes, update the relationship map from current source. Keep exact domain rules in `application-flow.md` and code-owned values in source.
- Keep `README.md` short: purpose, setup, important boundaries, and documentation entry points. Use repository-relative links and remove obsolete names or stale implementation claims.

For documentation-only work, read the changed pages, check links and terminology, and use `git diff --check` when available. Report only checks actually performed. For documentation accompanying code, apply `../../superpowers/verification-before-completion/SKILL.md` to the full change as well.
