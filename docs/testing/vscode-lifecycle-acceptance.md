# VS Code test lifecycle acceptance

## Contributor policy

An independently proven dependency survivor must not **alone** fail the
functional scenario or stop remaining variants. Logic Apps must finish its own
shutdown, release its original resources, and actually start again. Functional
results, product lifecycle acceptance, and infrastructure recovery are separate
facts.

Ordinary native closure stays lightweight: no survivor means no exceptional
ownership or additional startup proof is required for acceptance. The fixture
still records real activation/deactivation. A zero launcher exit, capture
barrier, disposed C# capture, deleted workspace, or success-shaped JSON object
does not establish exceptional acceptance.

Unknown ownership and Logic Apps-owned or shared `func` processes remain
blocked/failed. Do not waive a process by executable/module basename.

### Required exceptional sequence

1. Retain the native owner's original PID, platform-bound creation identity,
   executable path/identity and full-command hash. Windows uses retained Job
   membership and FILETIME ticks. Linux uses retained subreaper ancestry,
   pidfds, `/proc` start ticks, boot ID and clock frequency; these are **not**
   FILETIME or a Windows Job. Never scan shared-machine processes.
2. Capture original Logic Apps logger/task process identities and design-time
   ports **before** calling the already-loaded original deactivation export.
   Await that export, then observe original process exit, exclusive loopback
   bind/release for recorded ports, and absence of relevant task/debug sessions.
   Original process exit releases its process-owned kernel handles; workspace
   deletion is not a lock-release proof.
3. These shutdown/resource observations must precede native metadata capture
   and recovery. Recovery must never hide a product lifecycle failure.
4. An independent Roslyn owner requires a prepared extension manifest with
   **full immutable seed verification**, current source/platform/architecture
   identity, and the exact known physical installed executable:
   `.roslyn/Microsoft.CodeAnalysis.LanguageServer.exe` on Windows or
   `.roslyn/Microsoft.CodeAnalysis.LanguageServer` on Linux. Its captured
   bytes/size must match the seed's known manifest entry (POSIX mode too), with
   original native PID/creation/full-command/path identity bound to that file.
   Added generated cache files are not an ownership prerequisite: the installed
   directory inventory need not equal the seed. No cache warmup/freeze subsystem
   or rebaseline is required. Linked paths, foreign/modified executable bytes,
   incomplete metadata and observed replacement/mutation races fail closed.
   Only `csharp-roslyn-language-server`, role `independent-dependency`, qualifies;
   arbitrary C# programs and shared Func do not. No C# launch-receipt API gate
   is required. Never recapture the immutable seed after recovery.
5. After separately recorded independent recovery, start a genuinely separate
   native invocation. Await actual extension activation and command registration.
   If the original phase used runtime/design-time resources, reopen its existing
   workspace and require HTTP 200 from the real operation-groups endpoint.
   HTTP 200 alone is never service identity proof. Use supported activation
   `context.logUri` to select only the current `exthost` log tree; require the
   host-log PID and actual argv/profile binding. Correlate the product project,
   `workflow-designtime` directory, port and logged shell-launcher PID with the
   required open workspace. Native listener snapshots must bracket the response,
   prove the same Func PID/creation/command identity and ancestry to that launcher,
   and prove the launcher belongs to the current extension host and does not
   predate it. Re-read owner-local receipts and producer binding when resolving
   startup. Historical logs, foreign listeners, missing correlation, inaccessible
   metadata or unavailable native socket observations cannot verify startup.

**Startup may follow independent recovery.** It need not precede recovery.
Only product shutdown/resource release must already be established before
recovery clears anything.

## Implementation and consumers

- `vscode-lifecycle-observer.js` uses supported extension/task/debug APIs, the
  original native product logger and loaded deactivation export in the actual
  extension host. It neither mutates product behavior nor uses private RPC.
  Actual export failures propagate; observation failures prevent exceptions,
  not ordinary clean functional closure.
- Native containment hosts retain Windows Job or Linux subreaper/pidfd ownership.
  Explicit PID requests require retained ownership before command/image reads.
  Windows release requires matching creation FILETIME and kernel exit FILETIME;
  Linux uses pidfd exit or a fully captured different native identity. Missing
  metadata is not exit. Linux reads pinned proc directories and hashes the raw
  NUL-separated command with kernel AF_ALG. Listener requests inspect only owned
  processes and requested ports, retaining runtime-to-launcher ancestry.
  Recovery affects only retained owners and never rewrites original survivors.
- `vscode-lifecycle-producer.js` verifies seed/installed executable bytes,
  correlates original capture/release receipts, requires shutdown from every
  started host across reloads, and embeds resolved subsequent startup evidence.
  Embedded runtime proof retains full profile/workspace/current-host/listener
  requirements. Nested receipts preserve child invocation identity and require
  matching original host/root captures from both inner and outer owners.
- `.vscode-test.mjs` includes the supported recorder/boundary in every CLI
  configuration. `lifecycleStartupProof` is an exception-only actual startup
  verifier, not an inventory lane or synthetic substitute. Regular Core Cancel,
  outer Multi-root/family/MSN closures and ExTester use the same evaluator and
  verifier. Direct MSN/shared Func cleanup retains strict product ownership.
- ExTester captures the fully validated immutable dependency seed from its actual
  installed cohort before tests, excluding product/recorder overlays. Existing
  Code/ChromeDriver setup remains normal. Its contained phase worker stays within
  the suite model; the supported recorder awaits original deactivation before
  browser quit. Reload, file-trigger teardown and exported `deactivate` share
  memoized observer/shutdown promises, call the product once and dispose once,
  including on failure. No shared-machine name-based sweeps are permitted.
- CLI and regular Multi-root launches bind actual argv and
  `LA_E2E_CLI_USER_DATA_DIR` to the same profile. Reject missing/foreign/duplicate
  profile arguments; preserve distinct owner-local bindings for earlier hosts.
- Family/MSN terminal validators, ordered reports, batch classification and
  ExTester final rollup recompute shared policy from retained evidence.
  Independent-only `pending-startup` may continue to a real next launch but is
  **not** final acceptance; unresolved/failed startup remains explicit.

The seed is an owner-captured byte inventory, not third-party cryptographic
signing. CLI uses its already prepared dependency seed. `installationSHA256`
identifies that prepared baseline; `payloadSHA256` identifies the exact known
installed executable, not a new whole-installed-directory inventory.

## Verdicts and reporting

`verified` and `retainedOriginalIdentitiesVerified` mean ordinary original
closure. Recovery never rewrites them to true. Preserve native exit (including
125), signal, original survivors, metadata errors and recovery result even when
functional exit is zero and product acceptance passes. Recovered closure is
never reported as natural closure.

Report product `passed/failed/blocked/unverified/pending-startup` separately from
infrastructure `clean/recovered/failed`. Unresolved containment or product
failures prevent an accepted full rollup; a verified independent-dependency
recovery may be accepted with product `passed` and infrastructure `recovered`.
Inventory coverage alone is insufficient: failed suites, unresolved product
proof, missing phase bodies, diagnostics, filesystem/provenance failures and
staging integrity still prevent success.

## Validation status and limits

Latest local checks (2026-11-01); commands run from the repository root:

```powershell
pnpm --dir apps/vs-code-designer run test:e2e-cli:compile
pnpm --dir apps/vs-code-designer run test:e2e-cli:unit
Set-Location apps/vs-code-designer
npx --no-install tsup --config tsup.e2e.test.config.ts
$env:E2E_MODE = 'extesterruntimeonly'
node out/test/run-e2e.js
```

- Strict CLI compilation and the **complete registered CLI unit chain** passed
  (exit 0). ExTester tsup compilation passed (exit 0).
- Runtime-only controls passed **15/15**, exit 0; no downloads or native launch.
  Synthetic ownership/startup controls are not native lifecycle acceptance.
- The retained Windows native result used the registered
  `node scripts/run-e2e-cli.js --label lifecycleStartupProof` with the existing
  fully verified immutable VS Code 1.144.0/win32-x64 seed and a fresh normal
  installation/profile. A naturally surviving Roslyn executable matched its
  known seed bytes despite a generated composition cache. Original deactivation
  and resource observation preceded recovery; native exit **125** and both
  original closure flags **false** remained sticky. Scoped recovery left zero
  processes. The runner automatically performed a separate fresh extension-host
  startup; both registered bodies passed, functional/final CLI/terminal exit was
  **0**, and `complete: true`. Final verdict: **product passed / infrastructure
  recovered / accepted true**, reason `independent-dependency-recovered`.
- That native result is **extension-host only**: its empty window recorded no
  runtime PIDs, tasks, ports or workspace resources. It does not prove Func/
  design-time restart, exercised workspace-lock release, Linux native execution,
  native ExTester acceptance or the canonical 23-lane rollup.

Retain detailed native receipts, logs and historical audit in session artifacts
outside the repository; do not publish machine paths, PIDs, hashes or run IDs
here. For future changes, rerun the checks above, safe Biome and the appropriate
targeted native scenario. Keep synthetic, clean closure and exceptional recovery
results separate; never waive unknown ownership or manufacture a survivor.
