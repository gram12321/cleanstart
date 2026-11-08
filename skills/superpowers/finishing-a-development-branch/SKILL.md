---
name: finishing-a-development-branch
description: Inspect and carry out an explicitly requested Git integration action while keeping all state-changing Git operations user-controlled.
---

# Finishing a Development Branch

1. Inspect the requested target and current Git state with read-only commands.
2. State the requested action and its effect: keep, commit, merge, push, open a pull request, or discard.
3. Require explicit direction before each state-changing Git operation.
4. Before destructive work, list exact targets and require confirmation.

Never merge, pull, push, create a pull request, delete a branch/worktree, initialize a repository, or discard changes by default. Follow the user's explicit direction and project guidance. Report actual Git state and verification evidence.
