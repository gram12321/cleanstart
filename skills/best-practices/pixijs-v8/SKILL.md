---
name: pixijs-v8
description: Use PixiJS 8 APIs safely for renderer setup, scene graph, graphics, assets, events, and resource lifecycle.
---

# PixiJS 8 Practices

Use for changes that touch PixiJS APIs. Check `package.json` before relying on version-sensitive behavior. Use PixiJS 8 APIs and do not copy v7 examples unchanged.

## Application and lifecycle

- Construct `Application`, then `await app.init(options)` before reading renderer, stage, or canvas properties. Mount `app.canvas`; `app.view` is the old v7 API.
- Keep initialization in an async function rather than top-level await in Vite modules.
- Give the app, scene, resize observer, and event listeners clear owners. Disconnect/remove/destroy each at the owning lifecycle boundary.
- Prefer one resize owner. If resizing the renderer and camera manually, avoid also enabling a competing automatic resize path.

## Scene graph and drawing

- Only `Container` owns children; keep sprites, graphics, and text as leaf renderables.
- PixiJS 8 `Graphics` builds geometry and style with chained methods such as `.poly(points, true).stroke(style)` or `.rect(...).fill(...)`. Do not use v7 `lineStyle`/`beginFill` patterns.
- Rebuild graphics only when their content changes, not every frame. Reuse display objects and textures when ownership is stable; optimize only after profiling.
- Keep application data outside display objects. A scene renders state and translates input into intents; it does not own domain rules.

## Assets, input, and updates

- Load local textures through `Assets.load<T>()`; the cache reuses matching asset keys. Do not destroy shared textures from a scene unless that scene owns them.
- Use unified pointer input for mouse, pen, and touch. Know that v8 `pointermove` is hit-tested; use global pointer events only when the behavior genuinely needs movement outside an object.
- Keep coordinate conversions explicit at the canvas/world boundary. Keep React overlay hit testing separate from canvas input.
- Use the application ticker only for time-based updates; base motion on ticker delta and remove callbacks when their owner is destroyed.

## Verification

- Check the installed API/version, then run `pnpm typecheck` or `pnpm build` for renderer changes.
- At the verification thresholds in `AGENTS.md`, run a focused Playwright test for major visible or interactive changes when relevant. Use the live browser tool when visual inspection adds evidence; routine changes do not trigger browser checks by default.
- Consult the versioned [PixiJS v8 migration guide](https://pixijs.com/8.x/guides/migrations/v8), [Application guide](https://pixijs.com/8.x/guides/components/application), [Graphics guide](https://pixijs.com/8.x/guides/components/scene-objects/graphics), [Events guide](https://pixijs.com/8.x/guides/components/events), and [Assets guide](https://pixijs.com/8.x/guides/components/assets) when details exceed this short checklist.
