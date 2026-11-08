# Code Review Template

```md
## Review Scope

- Target: <working tree, commit range, branch, implementation, or plan>
- Requirements reviewed: <paths or user request>
- Verification reviewed: <commands/output, or gaps>

## Findings

### Critical

- `path/to/file.ts:line` — <imperative finding title, evidence, affected scenario, impact, and correction>

### Important

- `path/to/file.ts:line` — <imperative finding title, evidence, affected scenario, impact, and correction>

### Minor

- `path/to/file.ts:line` — <imperative finding title, evidence, affected scenario, and correction>

## Verification Gaps

- <what was not verified and why>

## Assessment

<Whether the target meets requirements and any conditions.>
```

Review the state-to-render path, UI versus PixiJS ownership, coordinate and input behavior, scene/resource cleanup, deterministic rules, and actual verification evidence.
