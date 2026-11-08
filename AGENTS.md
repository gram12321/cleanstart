# Project Instructions

## Project status

This is a new, neutral project. Product direction and application behavior are not defined. Do not carry over names, features, architecture, or implementation assumptions from another project.

## Toolchain

Use the versions declared in `package.json` and `pnpm-lock.yaml`: TypeScript, Vite, React, and PixiJS 8. Use pnpm for package management.

React owns DOM presentation. Use PixiJS for canvas rendering when the product calls for it. Keep application-specific rules and state independent of framework and rendering APIs where practical. Derive architecture from approved product requirements and current source; do not assume an application domain.

## Project documentation

Read `README.md` and the relevant pages under `docs/WorkingDocs/` before changing durable project guidance. Keep proposed ideas separate from approved decisions and implemented behavior. Update `PROJECT_INFO.md` when the verified stack or repository shape changes.

## Git

Git is intentionally not initialized. Do not initialize it unless the user asks.
