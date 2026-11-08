---
name: diagnose
description: Isolate intermittent, performance-heavy, or difficult rendering, input, state, and build defects after systematic debugging has not found the cause.
---

# Diagnose

Begin with `../systematic-debugging/SKILL.md`; use this deeper loop only when ordinary debugging cannot isolate the defect.

Prefer the narrowest reliable feedback loop:

1. Focused unit/integration test for a pure rule, coordinate conversion, state selector, or command.
2. Controlled application-state fixture or replay.
3. Browser console/log reproduction.
4. Browser performance profile for render/update loops, allocations, or input delay.
5. `git bisect` only when a known range and automated feedback loop exist.

Test one hypothesis discriminator at a time. Temporary instrumentation must be narrow and removed afterward. If no reliable loop can be created, report what was tried and request the recording, state, logs, or permission needed to proceed.
