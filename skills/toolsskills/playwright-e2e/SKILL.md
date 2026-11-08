---
name: playwright-e2e
description: Add and maintain focused Playwright Test browser coverage for stable user-visible application flows.
---

# Playwright Browser Tests

Use for new or changed stable user-visible browser behavior. The checked-in suite uses `@playwright/test` through `pnpm test:e2e`; the local Vite server is configured in `playwright.config.ts`.

## Test design

- Test observable user behavior and outcomes, not PixiJS private state or implementation details.
- Prefer accessible roles, labels, and text. Use DOM selectors for the canvas only where canvas interactions require pointer coordinates.
- For canvas interactions, derive positions from its current bounding box and the relevant coordinate transform. Avoid hard-coded viewport points that fail on resize.
- Keep each test focused and deterministic. Do not introduce sleeps, external services, accounts, persistence, or server behavior into this offline project.
- Keep browser tests for important selections, input behavior, responsive layouts, and representative user flows. Cover deterministic rules with focused tests rather than repeating each rule through the browser.

## Running and reporting

- Choose a focused test for the changed behavior when useful. Run `pnpm test:e2e` when requested or when the scope justifies the full suite.
- If Playwright reports a missing browser, install Chromium with `pnpm exec playwright install chromium` and rerun.
- Use traces/screenshots from failed runs to diagnose; do not mask real application console errors or weaken assertions to make a test pass.
- The Playwright MCP is available for live exploratory interaction and visual inspection in this environment. It supplements, but does not replace, checked-in automated tests.
- Report the exact test command and outcome. Do not claim the live MCP was used if it was not.
