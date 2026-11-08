---
name: systematic-debugging
description: Find the root cause of a bug, test failure, rendering issue, input problem, or regression before changing behavior.
---

# Systematic Debugging

1. Reproduce: capture the user action, state, viewport/input conditions, expected result, actual result, and errors.
2. Trace ownership through React UI, application state, PixiJS input/scene/camera, and browser boundaries only as relevant.
3. Form one falsifiable hypothesis and use the smallest discriminator: focused test, fixture, log, or browser reproduction.
4. Fix the understood root cause, add a regression test when a valid seam exists, rerun the original reproduction, and remove temporary instrumentation.

Check coordinate-space conversion, stale or derived state, event propagation between DOM and canvas, scene listener cleanup, renderer resize behavior, texture lifecycle, and unnecessary per-frame or per-update allocation before proposing a broad refactor. Do not bundle speculative fixes.
