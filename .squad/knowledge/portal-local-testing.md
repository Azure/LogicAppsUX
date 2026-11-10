# Portal Local Designer Testing

Curated durable guidance for testing LogicAppsUX designer package changes in a local Azure Portal checkout or worktree.

## Current Learnings

### Run the Portal helper from the active LogicAppsUX checkout

- Learning: From the LogicAppsUX checkout/worktree containing the changes, run:

  ```powershell
  pnpm portal:local --portal-root D:\path\to\portal
  ```

  `--portal-root` accepts either the Portal repository/worktree root or its `src\Extension\Client\React` directory. `LOGIC_APPS_PORTAL_ROOT` can provide the default path. The helper discovers the Portal-consumed LogicAppsUX packages, builds and packs them, installs them into that specific Portal worktree's `node_modules` without modifying Portal manifests or lockfiles, runs the Portal hybrid development build, and starts the local server unless `--no-serve` is supplied. Use `--dry-run` to validate paths and commands without changing files.

  The `tar` command must be available, and only one helper can target a given Portal worktree at a time. After a successful build, local packages remain installed in that worktree; run the Portal checkout's normal `npm ci` to restore published dependencies. The helper automatically restores the original packages when installation, verification, or the Portal build fails.
- Why it matters: Running from the active LogicAppsUX worktree ensures Portal loads the exact local designer changes, while targeting a specific Portal worktree avoids contaminating other Portal checkouts.
- Source: `scripts/README.md`, `scripts/portal-local.js`, `scripts/__test__/portal-local.spec.ts`, the root `package.json` script `portal:local`, and Azure/LogicAppsUX#9619.
- Applies to: `chief-engineer`, `designer-core`, `designer-ui`, `shared-services`, and `test`.
- Status: needs revalidation after an end-to-end Portal build completes successfully.
