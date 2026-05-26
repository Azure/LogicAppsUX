# Runtime Readiness Probes (VS Code Functions / Logic Apps)

Curated learnings from PR #9164 about how to **actually** prove the Azure Functions runtime
inside the VS Code extension is ready to serve a workflow — i.e. the host has compiled triggers,
registered the workflow, and the callback URL is live. Most E2E flakes in the run/debug suite
are caused by clicking a button before the runtime is genuinely ready, not by UI bugs.

## Triggers → use this file

- `waitForRuntimeReady`, `clickRunTrigger`, `waitForRunStatusInList`, `func host start`
- "runtime not ready" / "trigger not found" / "callback url null" / `:7071` cold-start flakes
- Anything that probes `:7071/admin/host/status`, `/management/workflows/...`, `listCallbackUrl`
- `prepareForFreshFuncHost`, `killPortBound`, "design-time host squatting on 7071"
- Adding a new wait in `runHelpers.ts` for a runtime-gated UI action

## Core Sources

- `apps/vs-code-designer/src/test/ui/runHelpers.ts` — `waitForRuntimeReady`, `clickRunTrigger`, `waitForRunStatusInList`
- `apps/vs-code-react/src/app/overview/app.tsx:68` — the UI's `callbackInfo` gate that maps to probe (4)
- `apps/vs-code-react/src/app/overview/runtime.ts` — runtime URL composition
- Commits: `7bc8b05eb` (observability), `1fa956ca6` (port 7071 hygiene), `9c5f6bd6d`, `2d959c9a9` (90s deadlines)

## The 4-Probe Readiness Chain (in order)

A workflow is **not** ready to be triggered until all four gates pass, in this order.
Skipping or reordering any of these reliably produces false positives on cold CI runners.

### Probe 1 — Host process alive: `GET :7071/admin/host/status` → `state === "Running"`

- ~50 ms once the func host is up. Confirms the **process** is listening.
- **Does NOT prove** the workflow is registered, triggers compiled, or callback URLs exist.
- Use as a fast precondition only — never as the gate for clicking a runtime-dependent button.

### Probe 2 — Port hygiene before F5: `prepareForFreshFuncHost` / `killPortBound(7071)`

- Run **before** starting debug. Guards against an orphan func host or a design-time host
  still squatting on 7071 from a previous phase.
- Important nuance: if `[killport] no occupant`, the host that subsequently answers on 7071 is
  the **legitimate** one we just launched. A "fast" status response right after F5 with no
  preceding kill log is a strong smell of a stale process serving stale workflows — see
  `dumpSuspiciouslyFastHost` (commit `1fa956ca6`).
- The wider hygiene rule lives in `prepareFreshSession`: kill orphan `func` / `dotnet` / `vsdbg`
  processes between phases. See `vscode-e2e-testing.md` for the phase-level contract.

### Probe 3 — Workflow registered & healthy: `GET .../management/workflows/{name}` filtered for `entry.health.state === "Healthy"`

This is the **authoritative** gate. None of the cheaper alternatives are sufficient — each
was tried in PR #9164 and produced false positives:

| Endpoint / check                                              | Why it is NOT enough                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `GET /management/workflows/{name}` (metadata only)            | Returns 200 in ~13 ms before triggers compile — false positive.   |
| `GET /management/workflows/{name}/triggers` without filter    | Passes while workflow is `Unhealthy` — false positive.            |
| "Any non-empty workflow list"                                 | Passes for a stale/cached workflow from a prior phase.            |
| DOM debug-toolbar / overview widget visible                   | UI rendering ≠ runtime ready; webview hydrates ahead of host.     |

Only the **list endpoint + per-workflow health-state filter** (`entry.health.state === "Healthy"`)
reliably reflects "triggers compiled, workflow live."

- **Timeout**: use 240 s on CI. 180 s is too tight on cold ExtensionBundle/.NET caches, particularly
  on shards that skip Phase 4.2 warm-up (e.g. `createplusnewtests` jumping 4.1 → 4.3).

### Probe 4 — Callback URL live: `POST .../triggers/{trigger}/listCallbackUrl` → 200 with non-empty `value`

- This is exactly what the webview UI waits on before enabling the **Run trigger** button —
  see `apps/vs-code-react/src/app/overview/app.tsx:68` (`Boolean(workflowProperties.callbackInfo)`)
  and the `updateCallbackInfo` dispatch path.
- Asserting on the callback URL in tests mirrors what the user experience requires, so a passing
  probe (4) means the UI is genuinely allowed to issue the run.

### Probe 5 (last, not first) — DOM button-enablement poll

- Only after probes 1–4 pass, poll the DOM for the runtime-gated button being enabled
  (`disabled` **and** `aria-disabled` both false), sleep ~500 ms, re-find, and re-check
  before clicking. Fluent UI re-renders during `func` cold-start can flip the button back
  to disabled and race the click.
- See `runHelpers.ts:389` `clickRunTrigger` and `runHelpers.ts:458` `waitForRunStatusInList`.

## Anti-Patterns (each one was tried in PR #9164 and failed)

1. **Trust `admin/host/status` alone.** Process up ≠ workflow ready.
2. **Trust the metadata endpoint alone.** Returns 200 before triggers compile.
3. **Trust the unfiltered triggers endpoint.** Returns triggers for `Unhealthy` workflows.
4. **Trust "any non-empty list".** Cached/stale workflows from prior phases satisfy this.
5. **Trust DOM widget visibility.** The webview renders ahead of host registration.
6. **Skip port hygiene before F5.** Orphan hosts answer fast and authoritatively wrong.
7. **Use a 30s or 60s deadline.** Cold CI cache + bundle DLL load routinely exceeds 60s.
   Default deadline is **90s for clicks**, **240s for the workflow-health probe**.

## Required Diagnostics When a Probe Times Out

When probe 1 answers in **<2 s** with no preceding `[killport]` log, dump:

- Terminal panel text from the `func: host start` task
- `:7071/admin/host/status` raw body
- `Get-Process func, dotnet` PID list
- `host.json`, `local.settings.json`, `.vscode/launch.json` contents
- The current workflow's `workflow.json`

See `dumpSuspiciouslyFastHost` (commit `1fa956ca6`) for the helper this PR added. The same
diagnostics-first discipline applies to **all** runtime probes — see the "Diagnostics-First
Discipline" section in `vscode-e2e-testing.md`.

## Applies to

`vscode-test-specialist`, `test`, `vscode`, `ci-sentinel`.

## Status

Verified in PR #9164 (Azure/LogicAppsUX#9164). The 4-probe chain is the contract that finally
made the Phase 4.3–4.6 runtime tests pass reliably on the `createplusnewtests` shard after a
14-commit reliability arc.
