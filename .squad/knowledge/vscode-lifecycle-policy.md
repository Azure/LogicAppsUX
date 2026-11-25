# VS Code lifecycle evidence lessons

Contributor policy and current validation limits:
[`docs/testing/vscode-lifecycle-acceptance.md`](../../docs/testing/vscode-lifecycle-acceptance.md).

- Apply the same acceptance rule to every VS Code test: an independently proven
  dependency survivor alone is not a Logic Apps failure. Require original
  Logic Apps shutdown/resource release and actual subsequent startup for an
  exception; keep infrastructure recovery separate. Unknown ownership or
  missing product proof remains blocked, not silently accepted.
- Bind native owner, invocation, actual user-data profile and workspace together.
  Cancel's dedicated profile must also be passed to the logger observer.
- Startup must use the supported recorder activation `context.logUri`, not a
  recursive scan of profile history. Match the current host-log PID, product
  project/port/launcher, native current-host parent/creation identity, and the
  exact owned Func listener before and after HTTP 200. Missing native listener
  or product log correlation is explicit unavailable proof, never a fallback.
- Retained Windows process handles can outlive command metadata. After Job
  membership, use matching creation FILETIME plus `GetProcessTimes` exit FILETIME
  for explicit exit proof; inaccessible live metadata is still unknown.
- Recorder reload and file-trigger teardown share module-owned installation and
  memoized shutdown promises. Exported `deactivate` awaits them and disposes
  once; repeated callers must never invoke actual product shutdown again.
- Regular multi-root argv and observer env must name the same actual profile.
  Bind each real launch separately under its native invocation, preserving
  earlier host bindings and rejecting missing/foreign/duplicate profile args.
- Windows PID creation identity is FILETIME ticks, not interchangeable with
  CIM/.NET receipt identity. Use the retained Job, never process-name sweeps.
- A full command can contain non-path arguments such as Node `-e` source.
  Preserve its complete hash without passing those arguments to throwing .NET
  `Path` APIs for module-basename extraction.
- VS Code's Windows module loader can canonicalize path casing. Select exactly
  one already-loaded normalized cache entry; never require a second product
  instance or assign to tsup's read-only export getters.
- Await the original export in the supported test fixture. Actual product
  activation/deactivation failures propagate. Observation-only failures remain
  explicit evidence failures, but must not fail ordinary clean functional
  closure.
- Nested boundaries need original host/root observations from both native owners.
  Preserve child invocation receipts; do not simply rewrite their binding.
- Product release precedes recovery; real startup may follow independently
  proven dependency recovery. Keep native exit/recovery sticky and separate
  from functional/product results.
- Linux uses retained subreaper ancestry and pidfds, scoped owned-process task
  child links, pinned proc-directory command reads, boot/start-tick identities
  and kernel AF_ALG SHA-256 of raw NUL-separated cmdline bytes. Do not label these
  Windows Job/FILETIME fields. Unknown or inaccessible identity is blocked.
- Linux exact independent Roslyn payload has no `.exe` suffix. Fully verify the
  immutable seed, then hash the exact physical installed executable against its
  known manifest entry, retaining native PID/creation/full-command/path binding.
  Added runtime cache files do not alter executable identity. Linked paths,
  modified/foreign executables, unavailable metadata and observed hash races
  fail closed; shared Func is never independent. The former whole-installed-
  inventory requirement and cache warmup/freeze subsystem are superseded and removed.
- Linux code wiring and Linux native proof are separate. Do not claim actual
  Linux Roslyn recovery/restart from Windows or synthetic controls. macOS is
  outside the canonical 23-lane Linux/Windows scope.
