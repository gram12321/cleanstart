---
name: tdd-gram
description: Use for behavior changes when the user requests TDD or a focused deterministic test seam makes a fail-first cycle practical.
---

# TDD Gram

Use a fail-first cycle for domain rules, actions, state transitions, and coordinate math when behavior can be tested through a stable public interface. For PixiJS rendering or browser input, use the browser workflow and visual verification appropriate to the change; do not force a pure unit-test seam into display code.

## Before coding

1. State the observable user or caller outcome from the request and current project docs. Identify the owning module and the smallest public interface that expresses it.
2. List the first behavior and a meaningful boundary or failure case. Work in vertical slices, one behavior at a time; do not write a large test suite before implementation.
3. If the required behavior is undecided, resolve that decision before writing a test. Do not infer product rules from unrelated projects.

## Red, green, refactor

1. **Red:** Write one focused test through the public action, rule, or coordinate API. Run it and confirm it fails because the requested behavior is missing, not because of setup or a typo. A test that passes immediately needs a clearer missing behavior.
2. **Green:** Make the smallest production change that passes the focused test. Run it again and inspect the result.
3. **Refactor:** While the test remains green, remove duplication or clarify ownership within the affected scope. Run the focused test after the refactor.
4. Repeat for the next behavior, boundary, or regression. Then run the relevant existing tests justified by the change.

Test outcomes, not implementation steps. Prefer real application state and public actions over mocks of code owned by the project. Mock only a genuine external boundary such as time, browser APIs, or asset loading when needed. Keep fixtures in tests; do not add test-only production methods or abstractions. Difficult tests are a signal to separate deterministic rules from React, PixiJS, and the clock.

If code was written before selecting TDD, use the current behavior as context and start the next behavior with a failing test; do not delete otherwise valid work just to recreate the sequence. Report which tests actually failed first and passed afterward. When the work meets the review or verification thresholds in `AGENTS.md`, route completion through `../post-change-code-review/SKILL.md` and `../verification-before-completion/SKILL.md`.
