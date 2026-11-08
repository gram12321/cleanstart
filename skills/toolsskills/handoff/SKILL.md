---
name: handoff
description: Create a compact project continuation note for a later agent or session when decisions, partial work, and next steps are not otherwise captured.
---

# Handoff

Use when the user requests a handoff, continuation note, or session summary for future implementation. Do not duplicate plans, diffs, or documentation that already capture the needed context.

1. Identify the next session’s goal.
2. State current work, relevant decisions, artifacts by path, verification evidence, blockers, and ordered next steps.
3. Suggest only the skills that actually match the continuation task.
4. Present the note in conversation by default. Create `docs/WorkingDocs/handoffs/<topic>.md` only when a durable file is requested.

Use this structure when a fuller handoff is needed:

```markdown
# Handoff: <topic>

## Goal
## Current State
## Key Context
## Suggested Skills
## Verification
## Next Steps
```
