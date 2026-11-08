---
name: typescript-pixi-react
description: Apply TypeScript practices for domain logic, PixiJS 8 rendering, React UI, application state, and safe refactors.
---

# TypeScript, PixiJS, and React Practices

Use after the project router establishes scope.

## Rules

- Keep domain calculations deterministic and independent of React, PixiJS, DOM APIs, and display formatting.
- Keep React components focused on rendering state and issuing commands.
- Keep PixiJS scenes and display objects focused on rendering, input translation, and resource lifetime.
- Use a single explicit state owner. Do not make the React tree and Pixi scene competing sources of truth.
- Use explicit domain types, narrow unions, exhaustive handling, and type guards. Avoid `any`.
- Put tunable values in named constants or structured balance data, never scattered through UI/rendering code.
- Update shared types before consumers when data shape changes. Do not add compatibility layers unless the user approves them.
- Avoid speculative stores, adapters, barrels, and generic frameworks. Choose an abstraction only when real coupling or duplication requires it.

## Rendering-specific checks

- Use PixiJS 8 APIs, including async `Application.init()`, `app.canvas`, and chained `Graphics` geometry/style methods. See `../pixijs-v8/SKILL.md`; do not rely on remembered v7 signatures.
- Convert pointer coordinates at one owned boundary and keep world/screen coordinate conventions explicit.
- Reuse display objects or pools only after measurement or a demonstrated allocation problem; always destroy listeners and textures according to their ownership.
- Avoid recreating scene containers, textures, and event handlers on ordinary state updates.
- Keep DOM overlays from accidentally intercepting canvas interactions.

## Workflow

1. Identify the smallest affected area: domain logic, rendering, UI, app wiring, assets, tests, or docs.
2. Read direct contracts and affected state/update paths.
3. Make the smallest typed change that preserves the boundaries above.
4. Add focused tests for deterministic user-visible behavior when a stable seam exists.
5. Run the smallest relevant type, test, build, or manual interaction check supplied by the project.
