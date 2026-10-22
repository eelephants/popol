---
name: local-node-version
description: "This Mac's default node is 16, which Next 15 / vitest reject — use the nvm Node 22 binary for tests, typecheck and the dev preview"
metadata:
  node_type: memory
  type: reference
  originSessionId: 46a01f89-ad34-4897-b9ba-ad5658f9de32
  modified: 2026-10-22T15:52:41.429Z
---

The shell's default `node` is v16.13.2, too old for Next 15 (needs ≥18.18) and current vitest. Node 22 is installed via nvm at `~/.nvm/versions/node/v22.22.2/bin`.

- Tests / typecheck / npm ci: prefix `export PATH=~/.nvm/versions/node/v22.22.2/bin:$PATH;`
- Dev preview: the committed `.claude/launch.json` (`popol-dev`, `npm run dev`) fails on Node 16. Add a temporary entry with `runtimeExecutable` = the Node 22 binary and `runtimeArgs: ["node_modules/next/dist/bin/next", "dev"]`, then revert it before committing (absolute path is machine-specific).
- Don't run `npm run build` locally (CLAUDE.md: it breaks the running dev server); CI builds.

Related: [[popol-deploy-habits]]
