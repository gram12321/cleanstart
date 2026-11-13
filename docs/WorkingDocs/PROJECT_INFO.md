# Project Information

## Verified toolchain

The exact package versions are declared in `package.json` and `pnpm-lock.yaml`.

- TypeScript
- Vite with the React SWC plugin
- React and React DOM
- PixiJS 8
- Supabase JavaScript client for the configured backend connection
- Playwright Test for browser automation
- pnpm for package management

## Available scripts

The scripts are declared in `package.json`: `dev`, `typecheck`, `build`, `preview`, and `test:e2e`.

## Current repository shape

- `index.html` and `src/` provide the crossword application; `src/crossword/` contains the dictionary and generator.
- `src/crossword/data/` contains separate hand-curated starter, short-clue, and hyphenated-word collections alongside the filtered DanNet dataset; `scripts/import_dannet.py` recreates the DanNet subset from a pinned upstream release.
- `vite.config.ts`, `tsconfig.json`, and `playwright.config.ts` configure the toolchain.
- `docs/WorkingDocs/` contains project notes and decision records.
- `supabase/migrations/` contains database schema and access policy migrations.
- `skills/` contains reusable development and review workflows.
- `tests/e2e/` contains generator invariants and browser interaction checks.
- Git is intentionally not initialized.
