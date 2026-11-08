---
name: brainstorming
description: Explore product direction, interaction, UI, visual, or technical trade-offs before implementation when requirements are not settled.
---

# Brainstorming

Use this for deliberate design exploration, not routine implementation.

1. Read the smallest relevant project context, such as `docs/WorkingDocs/PROJECT_INFO.md`, `docs/WorkingDocs/design.md`, and `docs/WorkingDocs/application-flow.md` when they apply.
2. State the decision and confirmed constraints. Keep the existing TypeScript, Vite, React, and PixiJS 8 toolchain unless the user approves a change; do not assume product behavior or infrastructure choices.
3. Ask only questions that repository context cannot answer. One at a time when the choice materially changes the result.
4. Present a small set of options with user impact, implementation cost, and a recommendation.
5. Record durable approved choices in `docs/WorkingDocs/design.md`; record state and interaction flow in `docs/WorkingDocs/application-flow.md`.

Do not import product assumptions, data, assets, or implementation claims from unrelated projects.
