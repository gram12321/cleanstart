---
name: requesting-code-review
description: Review a working tree, commit range, branch, implementation slice, or plan when the user explicitly asks for review.
---

# Requesting Code Review

Review actual requirements and actual changes.

1. Establish the target and required behavior.
2. Read relevant requirements and changed files before reaching conclusions.
3. Inspect the complete diff and enough surrounding code to understand each changed path; check user-visible behavior, module ownership, input and coordinate handling, resource/listener lifecycle, tests, and documentation claims.
4. Report only concrete, introduced defects that are actionable and meaningful to correctness, security, performance, or maintainability. Continue through the complete diff after finding an issue; do not report speculation or style-only preferences.
5. Order findings by severity: Critical, Important, Minor. Every finding needs a small changed-line range, evidence, affected scenario, impact, and practical correction.
6. State verification gaps separately from defects and give an overall assessment.

Use [code-reviewer.md](code-reviewer.md) as the output shape.
