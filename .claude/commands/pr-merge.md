---
description: Wait for CI to pass on a PR, then merge it per the branch workflow and clean up
---

Merge a pull request once CI is green, following popol's branch workflow.

Usage: `/pr-merge [pr-number]` — if no number given, use the current branch's open PR.

## Branch workflow (see CLAUDE.md)
- feature → develop: **squash**
- develop → main: **merge commit** (squashing develop→main permanently diverges the branches)

## Steps
1. Resolve the PR number: use `$ARGUMENTS` if given, else `gh pr view --json number,baseRefName,headRefName,title`.
2. Print the PR title, head → base. Determine the merge method from the base:
   - base is `develop` (a feature PR) → `--squash`
   - base is `main` (a develop→main integration) → `--merge`
3. Wait for checks: `gh pr checks <n> --watch`.
   - If any check fails, print the failing check and **stop — do not merge.**
4. Merge: `gh pr merge <n> <method> --delete-branch` (omit `--delete-branch` when head is `develop`).
5. Report: PR number, method used, and the resulting base-branch HEAD (`git fetch && git log --oneline -1 origin/<base>`).

## Notes
- Do not force-push or bypass the required `test` status check.
- The repo working dir may be shared with a concurrent process — re-check `git status`/HEAD before any local git operation.
