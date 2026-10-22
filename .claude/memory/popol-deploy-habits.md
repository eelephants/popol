---
name: popol-deploy-habits
description: How the user ships popol — they hand off end-to-end releases but also merge PRs themselves mid-flow; check PR state before pushing more commits
metadata:
  node_type: memory
  type: feedback
  originSessionId: 46a01f89-ad34-4897-b9ba-ad5658f9de32
  modified: 2026-10-22T15:52:46.993Z
---

The user (Korean-speaking, GitHub `SangchoKim`) delegates the whole path: commit → PR to develop → CI → merge → develop→main release PR → Vercel prod → health check, and env-var/redeploy work through the Vercel MCP (team `team_WGYCO1pFVmhicieCjfuO6xiO`, project `popol`).

They also merge PRs themselves in the GitHub UI while I'm working (#21, #22, #25 on 2026-10-22/23), sometimes as merge commits instead of the documented squash.

**Why:** On #21 I pushed a second commit (vercel.app redirect) after they had already merged — it silently missed develop and needed a follow-up PR (#22).

**How to apply:** Before pushing additional commits to an existing PR, run `gh pr view <n> --json state`; if MERGED, branch from origin/develop and open a new PR. When a merge command reports "already merged", verify which commits landed. Default to finishing the deploy and verifying production rather than stopping at the PR.

Related: [[stock-budget-domain-launch]], [[local-node-version]]
