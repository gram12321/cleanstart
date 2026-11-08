# Architecture Boundaries

| Area | Responsibilities | Keep independent from |
|---|---|---|
| Domain | Product facts, validation, deterministic rules | PixiJS objects, React state, DOM events, persistence implementation |
| Rendering | PixiJS scenes, coordinate transforms, display objects, renderer lifecycle | Authoritative domain rules or durable state |
| UI | React controls, panels, dialogs, view-model adaptation | Direct renderer mutation, domain calculations, persistence calls |
| Application | Bootstrap, dependency wiring, shared subscriptions | Domain rules or display-object details |
| Persistence | Explicit save/load boundary when approved | UI behavior or rendering decisions |

These are review lenses, not a required folder structure. Fit ownership to actual product requirements and source.

## Safe focused changes

- Move deterministic calculations out of UI or rendering modules.
- Centralize duplicated coordinate conversion at the rendering boundary.
- Derive display values rather than storing them twice.
- Dispose listeners and resources at their owning lifecycle boundary.
- Split a module only when its real behavior has different ownership.

Avoid generic repositories, event buses, adapter layers, or barrels without demonstrated need.
