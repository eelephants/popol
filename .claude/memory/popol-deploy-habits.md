---
name: popol-deploy-habits
description: How the user ships popol — end-to-end releases handed off, but they also merge PRs themselves (sometimes squashing releases); check PR state, and how to heal develop/main divergence
metadata:
  node_type: memory
  type: feedback
  originSessionId: 46a01f89-ad34-4897-b9ba-ad5658f9de32
  modified: 2026-10-27T15:00:40.449Z
---

The user (Korean-speaking, GitHub `SangchoKim`) delegates the whole path: commit → PR to develop → CI → merge → develop→main release PR → Vercel prod → health check, and env-var/redeploy work through the Vercel MCP (team `team_WGYCO1pFVmhicieCjfuO6xiO`, project `popol`).

They also merge PRs themselves in the GitHub UI while I'm working (#21, #22, #25 on 2026-10-22/23), sometimes as merge commits instead of the documented squash.

They have also squash-merged develop→main release PRs (#25, #29). That leaves main's squash commit outside develop's history; the next release then conflicts wherever develop edited the same lines (#33 on 2026-10-27 conflicted in CLAUDE.md and StockView.tsx).

**Why:** On #21 I pushed a second commit (vercel.app redirect) after they had already merged — it silently missed develop and needed a follow-up PR (#22). The squashed releases cost an extra sync PR (#34) before the next release could merge.

**How to apply:**
- Before pushing more commits to an existing PR, run `gh pr view <n> --json state`; if MERGED, branch from origin/develop and open a new PR. When a merge command reports "already merged", verify which commits landed.
- Merge release PRs myself with `gh pr merge --merge` as soon as CI passes, so they don't get squashed.
- If a release PR shows CONFLICTING after a squashed release: confirm main's tree equals a develop commit and nothing follows it, then on a branch from origin/develop run `git merge -s ours origin/main`, PR it to develop and merge it as a **merge commit** (squash would lose the link), then merge the release.
- `develop` may hold PRs the user merged themselves (#30, #31); a release ships them too, so name them in the release PR and the report.
- Default to finishing the deploy and verifying production rather than stopping at the PR.

Related: [[stock-budget-domain-launch]], [[local-node-version]]
