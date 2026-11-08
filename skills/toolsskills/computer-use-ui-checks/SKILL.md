---
name: computer-use-ui-checks
description: Use optional Computer Use browser automation to verify substantial UI, layout, or interaction changes when the capability is available.
---

# Computer Use UI Checks

Use Computer Use as an optional visual and interaction check for meaningful user-facing changes. It is supplementary evidence, not a required step for every change or a replacement for focused automated tests.

## Use when

- A new screen, panel, or major layout has been introduced.
- A camera, pointer, selection, or other visible interaction has materially changed.
- Responsive behavior has changed enough that desktop and narrow layouts need visual inspection.

## Skip when

- The change is documentation-only, internal logic-only, a small copy edit, or an isolated minor style adjustment.
- The environment does not provide the Computer Use capability. Report the visual verification gap instead of claiming it was checked.

## Workflow

1. Read the acceptance behavior and confirm the local run command in `package.json` or `docs/WorkingDocs/PROJECT_INFO.md`.
2. Use the environment-provided `computer-use` skill. Read its complete `SKILL.md` before automation; follow its initialization, safety, API, and recovery instructions. Do not invent an automation API or launch a custom helper.
3. Start the local app only for this meaningful verification and only through the documented project command. Keep the check local; do not publish, deploy, or use external accounts.
4. Inspect a screenshot at the affected viewport. Exercise the changed user path and its visible feedback.
5. For layout changes, inspect both the main desktop view and a narrow viewport when practical. For interaction changes, confirm the visible result and that canvas input does not accidentally activate overlaid UI.
6. Stop any development process started for the check. Report the viewports and interactions actually checked, plus any remaining gap.

Do not use this workflow for every small change. Apply it when visual feedback is likely to catch a real regression that type checks or unit tests cannot show.
