# Product changes introduced during VS Code test coverage work

## Purpose and scope

This work was intended to add test coverage. It also introduced shipping
designer and extension changes. This audit asks, for each coherent change:

1. What did the original product do, and what changed?
2. Why was the change introduced? Is that reason demonstrated or inferred?
3. Was it needed only because of a test or its fixture?
4. Can the test exercise the original product without weakening its requirement?
5. If not, what independent requirement actually needs a product change?

**A dependency in the current test implementation is not, by itself, justification
for a product change.** A harness limitation, a new oracle, and a product defect
are different things. A real bug discovered by a test can still belong in a
separate product-fix PR.

The historical committed comparison is:

- Base: `41d0e2c64c411c5c2f90f9d4409fb496b2f9bea6`, the upstream comparison
  base used by the audited work.
- Head: `69e41f8986c4bc59583a1e7bd7dbb8efa2c27c18`.
- Inventory: **26 production source files**, plus the extension package's
  authentication dependency and developer/test tooling changes.
- The head has the same committed tree as `2ca4d55b3`, the previous complete
  both-OS passing baseline. This is not a new native run at the head SHA.
- This is an audit of this integration/ADO branch. It must not be presented as
  the exact live diff of a separately maintained PR branch.

There is also an **uncommitted feed cleanup trial** in the working tree. Its
intended behavior is described in finding E8, but it is not part of this committed
comparison and has no native acceptance claim. The regeneration-readiness
draft is also uncommitted and excluded from native payloads. The historical
audit does not itself approve removals; separately authorized D3 and D7
implementations and their accepted native results are recorded below.

Source line references describe the historical comparison head, not the latest
accepted source. The uncommitted feed trial changes line numbers in its three
production files.

## Current decisions and acceptance

Evidence checked **2026-11-09**. The latest accepted code baseline is
`afc472be2b4aa0e56ba3fbf0a86cdc2931e1ddb6`, containing both D3 durable-storage
removal and D7 diagnostic-attribute removal. Both-OS HTTP
[run 15959057](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15959057)
and canonical
[run 15959210](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15959210)
passed at that identical SHA. Downloaded originals passed source/run/attempt,
ordered-evidence and terminal acceptance; the full run's **11 Linux and
12 Windows** suites and protected rollup passed. Both runs used suite attempt 1.
This documentation update is not another native run.

| Classification | Areas | Current decision | Evidence boundary |
| --- | --- | --- | --- |
| Not required; removal accepted | D3 durable `getState()/setState()` alert storage | Keep removed; recompute fresh-file errors and preserve local Code-save source precedence | D3-only accepted at `11680614`; latest full23 also includes D7 removal. This is not removal of all D3 validation behavior |
| Not required; removal accepted | D7 `data-code-view-validation-errors` | Keep removed; observe actual visible alerts, identity and geometry | Three rendering controls plus both-OS HTTP and full23 at `afc472be2`; nullable driver probe remains |
| Required for selected ADO authentication | E3 WIF provider, activation/session integration and associated azureauth dependency/type/API adaptations | Retain together; not a cleanup target | SDK-documented secretless provider; follow installed SDK contract, not a newer upstream example. Does not approve E4's token fallback |
| Editing protection; retain or extract | D4 metadata dependencies; D5 deferred baseline adoption | Preserve saved definition and mounted Code text | Controlled local restoration reproduces saved-definition reset/content replacement. Native-file HTTP coverage does not isolate every embedded-editor race |
| Conditional editing protection; retain or extract | D5 no-change reparsing | A locally clean Code editor can contain unsaved Designer graph edits; preserve that serialized baseline | Runtime-present view-transition control reproduces deleted-action resurrection with the old guard. Public Run history route is source-supported, but exact host/UI sequence is not natively executed |
| Retained; necessity unresolved | Other D5 initialization guards | Investigate individually, not as part of a D3-D5 bundle deletion | The no-change counterfactual does not establish every initialization branch; no native removal acceptance |
| Required for specified visible-error outcome, not test-only plumbing | D1 validation, D2 fresh-file recomputation, D6 error MessageBars | Retain/separate explicit product-validation work | A selector or wait cannot supply an absent error. The broader action policy and particular wrapping geometry are not independently justified by one scenario |
| Build prerequisite, runtime-neutral | D9 Mapper typing | Retain or extract the compiler fix | Counterfactual adds TS2322; emitted JavaScript is unchanged. Skipping compilation is not an equivalent test adaptation |
| Product shutdown fix, not a harness workaround | E13 Linux pending-startup Func shutdown | Preserve original product-owned runtime release; separate the product fix | Native retained ancestry demonstrated surviving product Func descendants. Harness killing proves recovery, not original release; not every algorithm detail was isolated |
| Conditional on file policy | E9 unchanged `.gitignore` write guard | Retain/separate under continuous non-target immutability; make the policy explicit | Transient truncation is demonstrated, permanent corruption is not. Settled final-content sampling is a different requirement |
| Original behavior restored; native acceptance pending | D8 Run After accessible names | Original browser `util.format` restored in both Designers; tests use its exact label scoped to the predecessor row | Fourteen product-DOM cases pass; browser-polyfill and strict CLI controls pass. No D8 native acceptance yet |
| Test/fixture candidates; not removed | E1 minimal activation, E2 update suppression, E4 environment-token session fallback | Prove normal activation, authentic dependency setup and supported session replacement first | Current test dependence is not product necessity; WIF retention does not approve every auth hook |
| Supported-package compatibility; retain or extract | E6 missing root `gozip` guard; E7 direct managed `bin/node` resolution | Authentic publisher layouts and unchanged production normalization reproduce the original incompatibilities | Source/archive controls, not native POSIX installation proof. E6's `in-proc6` guard and E7's npm execution are not independently isolated |
| Provenance/race questions remain open | E5 activation catch-up; remaining E6 platform-specific prerequisites | Establish the actual race and each supported platform's real package contents | An ARM64 archive also lacks mandatory `in-proc8/func`; current E6 changes do not fix that pre-existing requirement |
| Uncommitted trial; not accepted | E8 feed retries/deadline cleanup and regeneration-readiness draft | Preserve separately; do not attribute any native pass to them | Local controls are not native acceptance; neither draft was in the tested committed payload |
| Observation candidates; not removed | E10 writer, E11 task/debug, E12 design-time/spawn diagnostics | Prefer recorder/supported observation; justify any minimal original-identity hook | Do not lose race-safe birth/ownership proof or claim a watcher can reconstruct an already-exited leader |
| Tooling versus unrelated churn | E14 scripts, mechanical source edits and lint-staged | Keep required build/test tooling; assess unrelated cleanup separately | No blanket runtime-necessity claim. E3's auth upgrade is not mechanical |
| Already restored | Designer API timeout override | Keep original fixed product timeout; no new E2E product override | Historical restoration predates these removals; it is not a remaining product cleanup |

### Infrastructure and proof limits

- Retain one source-bound current-run extension/test payload, verified
  prepared dependencies, actual UI interactions and all lifecycle/evidence
  gates. Windows dependency preparation is required by Windows consumers, not
  Linux consumers. The two producer jobs run in parallel after context
  resolution; Linux dependency preparation is currently grouped inside the
  shared build job. That grouping is pipeline topology, not a product feature.
- Attempt-qualified suite artifacts are required for collision-free same-build
  failed-job retries. Run `15957577` natively proved Linux regeneration attempt
  2 publication and original-artifact acceptance while preserving attempt 1.
  Protected full23 runs `15957906` and `15959210` used attempt 1 throughout;
  mixed-attempt protected selection has local regression coverage, not native
  full23 proof. Shared producer artifacts remain fixed-name: force-all retries
  are not covered by the suite-only fix.
- Keep the initial execution plus at most two additional failed-job reruns at
  the same run/SHA. Preserve failures and classify native body, lifecycle,
  staging and publication separately. Three failures require diagnosis; a pass
  does not erase earlier evidence or prove absence of intermittency.
- Fresh-file recomputation and invalid-to-valid clearing have local regression
  coverage. The native HTTP scenario does not yet include a valid-after-invalid
  negative leg, so do not claim native stale-alert rejection from a fresh target
  or a green full matrix alone.

No additional product removal is approved by this status update. The reusable
authoring rules are maintained in
[the CLI guide](vscode-cli-authoring.md#product-changes-versus-test-requirements)
and [the E2E skill](../../apps/vs-code-designer/src/test/ui/SKILL.md#product-changes-versus-test-requirements).

## Executive findings

**Yes, some product code was changed to accommodate tests. Other changes supplied
missing features or fixed real behavior discovered by tests. These should not be
defended as one inseparable test-infrastructure change.**

| Area | Finding | Can tests use the original behavior? | Recommended separation |
| --- | --- | --- | --- |
| Unsupported Compose timeout error | New local validation and visible UI, not previously supplied by this Designer implementation | Not while still requiring that exact error in a fresh Designer | Explicit product-validation fix; otherwise report the unsupported scenario |
| Embedded-Code save, refresh and persistence | Hardening accumulated around a flow later corrected to native `workflow.json`; D3-D5 counterfactuals distinguish its parts | Durable alert storage is removed and native-accepted; restoring D4/D5 protections reproduces editing regressions | Keep D3 durability removed; retain/extract editing protections, including conditionally demonstrated no-change reparsing; keep native reachability limits explicit |
| Validation-state DOM attribute | Diagnostic-only access to internal state | Yes; removal is native-accepted without changing visible-error observations | Keep D7 removed |
| Run After accessible names | Removes a duplicated title; expansion behavior unchanged | Yes, using the exact existing label within the correct predecessor row | Separate accessibility fix |
| Mapper typing | Runtime-neutral compiler repair | No, not with the same strict compiler/dependencies and real package build | Retain or extract as prerequisite build fix |
| Minimal activation/update suppression/token fallback | Shipping product branches used as test accommodations | Yes in principle, using normal activation and supported isolated/authenticated fixtures | Test/fixture changes; prove each replacement |
| WIF subscription provider | Required, SDK-documented secretless authentication for Azure-connected ADO E2E | Replacing WIF with an interactive profile changes the selected authentication contract | Retain; not a cleanup/removal target |
| Workspace activation catch-up | Plausible race fix plus additional initialization calls | Yes for ordinary scenarios; not for an explicit during-activation race scenario | Separate product fix with independently specified race |
| Dependency layouts and feed resilience | Authentic packages establish E6 root-`gozip` and E7 managed-Node incompatibilities; feed necessity remains unproven | Not equivalent when the product itself normalizes the official layout or the authentic package omits a required file | Retain/extract proven compatibility fixes; assess remaining branches and feed behavior independently |
| Writer/task/design-time diagnostics | Test observations embedded in production | Mostly; exact internal attribution may need a narrower observation boundary | Prefer recorder/test instrumentation |
| No-op `.gitignore` write | Proven transient truncation, not permanent content corruption | Yes for final-content correctness; not for continuous non-target immutability | Separate small product fix or explicit policy justification |
| Linux pending-startup Func shutdown | Demonstrated product-owned descendants outliving original shutdown | Harness recovery is possible, but is not equivalent to original product release | Separate lifecycle product fix |

## Evidence and decision rules

**Established** below means an actual source difference, an original requirement,
or a retained observation supports the claim. **Conditional** means the answer
depends on the scenario's requirement. **Unproven** means a commit title or new
unit test establishes motivation/implementation, not product necessity.

These are legitimate test adaptations:

- Select the actual original accessible name, scoped to the intended action.
- Wait for normal activation before beginning an ordinary workflow scenario.
- Provision authentic dependencies in a layout the original product supports.
- Exercise the corrected native-file editing flow instead of embedded Code.
- Use supported task/debug events, original exported lifecycle calls, and
  explicit recorder diagnostics.

These are not equivalent adaptations:

- Manufacture an error banner that the product never displays.
- Replace an explicitly required visible validation error with a terminal error.
- Report a ready host/task as an actual owned debug session.
- Kill product-owned Func processes in the harness and call that original
  product shutdown.
- Drop continuous file immutability while claiming to preserve that policy.
- Disable compilation or weaken types to avoid a compiler failure.

Current all-green integration evidence cannot isolate the necessity of every
change. Conversely, a failure after an unrelated deletion does not establish that
the deleted code was necessary.

## Designer and webview changes

### D1. New unsupported-timeout validation

**Source:** `apps/vs-code-react/src/app/designer/utilities/workflow.ts:95-137`.
**Introduced:** `875998f10`.

**Before/after:** The original code had no equivalent local validator. The new
helper checks raw definitions for `runtimeConfiguration.requestOptions.timeout`
on non-HTTP actions and constructs the unsupported-timeout error. It traverses
ordinary nested actions, else branches, switch cases/defaults, and agent tools.
That scope is broader than a single top-level Compose example.

**Why:** Native evidence showed that the invalid definition was persisted, but
the required visible error was absent. The investigated server validation path
had disabled validation calls after `validatePartial` failures. The helper
supplied missing product behavior; it did not repair a selector.

**Only to pass tests?** Mixed. The test exposed the gap, but the requested visible
error existed independently of its assertion. This is nevertheless a new
product-validation implementation beyond test-only scope. The evidence does not
establish that this branch introduced the original capability gap.

**Can the test use the original behavior?** It can verify native editing,
persistence and reopening, and explicitly report that the visible-error
capability is missing. It cannot truthfully pass a requirement that the fresh
Designer display the error when the original product does not supply it.
Synthesizing an alert or checking unrelated terminal output is not equivalent.

**Disposition:** Separate product fix with an explicit supported validation
policy. Do not treat the helper's newly added tests as independent approval of
every non-HTTP action-type rule.

**Coverage/evidence:** `utilities/__test__/workflow.test.ts:8-86` covers Compose,
HTTP, nesting, tools and missing/malformed inputs. It proves implementation
behavior, not authority for the expanded validation policy.

### D2. Validation when a native file opens in a fresh Designer

**Source:** `apps/vs-code-react/src/app/designer/appV2.tsx:81-92,124-128`.
**Introduced:** `b87854ed0`.

**Before/after:** The original fresh Designer did not derive this error from
loaded raw workflow metadata. The new code validates
`panelMetaData.standardApp.definition` and distinguishes loaded-file errors from
persisted embedded-Code errors. Loaded errors clear when valid metadata arrives.

**Why:** The clarified scenario was to save/close the native `workflow.json` editor
and then choose Open Designer. The error must come from the newly loaded file,
not state carried by the previous Designer.

**Only to pass tests?** Mixed: implements an independently requested user-visible
outcome, but is product feature work.

**Can the test adapt?** Not while retaining the exact fresh-Designer visible-error
requirement. Waiting or changing selectors cannot expose a nonexistent alert.
The test can instead document the original limitation, explicitly changing what
is claimed as covered.

**Disposition:** Separate product-validation fix, or explicitly approve the scope
expansion. This requirement does not establish that all earlier embedded-Code
state machinery is necessary.

**References:** `appV2.spec.tsx:454-494` covers fresh-load validation and clearing;
`httpTimeoutComposeOriginal.test.ts:842-914` implements native edit/save/close and
fresh Designer acquisition.

### D3. Embedded-Code validation persistence and clearing

**Source:** `apps/vs-code-react/src/app/designer/appV2.tsx:31-38,85-92,111-133,221-224,251-292`.
**Introduced/expanded:** `875998f10`, `554816282`, `5b57d8f34`, `8aa0ef87c`,
`58ea2fea3`, `b87854ed0`.

**Before/after:** The original product could save raw JSON but had no local alert
state/history for this condition. The branch adds validation during Code Save,
alert survival across normalized metadata refresh, persistence through
`vscode.getState()/setState()`, and clearing on valid Save or Discard. Persisted
state is written before host acknowledgement.

**Why:** These changes accumulated while trying to preserve an alert through
embedded-Code Save, refresh and remounts. The user subsequently clarified that
the scenario should edit the native file, not embedded Code.

**Only to pass tests?** Much of the motivation was the initially incorrect test
flow. The resulting behavior is real product behavior, not an innocuous test hook.

**Can the test adapt?** Yes: use the corrected native-file lifecycle, as it now
does, without requiring the previous Designer's alert to survive embedded-Code
events. This preserves the native requirement. It does not repair or disprove
separate embedded-editor problems.

**Disposition:** Reassess/extract as separate editor/validation work. No isolated
counterfactual proves the entire persistence cluster necessary for fresh-file
validation or safe to remove wholesale.

**Risk/evidence:** A failed host write can leave a persisted alert until later
valid Save/Discard. Added tests at `appV2.spec.tsx:236-452` cover refresh/remount,
clearing and dirty-state cases, but do not independently justify this feature
inside a test-only PR.

### D4. Metadata synchronization changes

**Source:** `apps/vs-code-react/src/app/designer/appV2.tsx:198-204`.
**Introduced:** `875998f10`.

**Before/after:** Any replacement of `panelMetaData` previously reset workflow
and custom-code state. The new effects depend separately on `standardApp` and
`customCodeData`, so unrelated metadata updates no longer reset them.

**Why:** Protect local editing/validation state from unrelated metadata changes,
including token updates, during the embedded-Code investigation.

**Only to pass tests?** Mixed; necessity is unproven for the corrected native
scenario. This changes application state synchronization beyond the error UI.

**Can the test adapt?** Yes for the native-file requirement: it does not need to
preserve an embedded-Code interaction across token refresh. A harness can
reacquire real current UI/metadata, but must not suppress actual updates.

**Disposition:** Retain/extract state-management hardening. The deeper local
counterfactual below reproduces saved-definition loss when the original effect
is restored; do not treat D4 as a simple test-only deletion. Alert-survival tests
alone were not comprehensive regression coverage for synchronization behavior.

### D5. Code-editor dirty-state and baseline adoption

**Source:** `apps/vs-code-react/src/app/designer/appV2.tsx:254-281,308-313,345-350`.
**Introduced:** `58ea2fea3`, `8f789ac59`.

**Before/after:** No-change Code operations previously returned immediately.
Changed saves updated both working workflow and `initialWorkflow` while Code
remained mounted. The branch parses available content even after dirty-state
reset, handles an uninitialized unchanged editor, and defers baseline adoption
until leaving Code for Workflow/Monitoring.

**Why:** `CodeViewEditor/index.tsx:21-49` reinitializes when `workflowFile` changes
and can prefer Designer-store serialization. Updating the baseline during Save
could replace newly edited raw JSON with stale normalized store output.

**Only to pass tests?** Mixed: discovered while repairing the wrong scenario,
but overwriting editor content is a genuine user-facing editor issue.

**Can the test adapt?** Yes for the original native scenario: edit native
`workflow.json`. That avoids this mechanism without weakening native editing,
but is not a fix for the embedded-editor defect itself.

**Disposition:** Separate editor product fix with its own regression. Mocked-editor
coverage at `appV2.spec.tsx:350-375,400-452` is not isolated native proof for every
initialization race.

### D3-D5 deeper investigation: local counterfactuals, 2026-11-06

**Verdict: do not remove D3-D5 as a bundle.** D3's durable alert state is a
strong cleanup candidate. D4 and D5's deferred baseline adoption protect real
editing behavior in controlled observations. D5's dirty-state reparsing is a
separate, less-established requirement.

The investigation used nine independent Vite in-memory source variants against
the same committed `appV2.tsx`. It did not edit shipping source or the existing
test file. The original nine host tests were retained unchanged; five additional
audit probes were injected only into experimental execution.

The Code probes mounted the **actual `CodeViewEditor` component**, including its
initialization effect and imperative dirty-state methods. Monaco was represented
by a controlled textarea, and the Designer serializer/store, command bar,
validation helper and VS Code host were mocked. This proves the exercised React
state/lifecycle differences, not native Monaco behavior, file acknowledgement,
or the actual serializer's output. The serializer deliberately returned the
original definition to test the stale-store reinitialization case.

| Source variant | Fresh invalid-file error | Valid file ignores stale persisted error | Loaded error clears on valid metadata/remount | Code save survives token refresh | Mounted Code text survives Save |
| --- | --- | --- | --- | --- | --- |
| Unchanged head | Pass | Fail | Pass | Pass | Pass |
| D3 persistence and source-precedence removed; ephemeral validation retained | Pass | Pass | Pass | Pass | Pass |
| D3 durable storage only removed; local source-precedence retained | Pass | Pass | Pass | Pass | Pass |
| D4 original whole-metadata effect restored | Pass | Fail | Pass | Fail | Pass |
| D5 original reparse and baseline behavior restored | Pass | Fail | Pass | Pass | Fail |
| D5 original no-change return restored; deferred baseline retained | Pass | Fail | Pass | Pass | Pass |
| D5 immediate baseline adoption restored; reparsing retained | Pass | Fail | Pass | Pass | Fail |
| Full D3/D4/D5 restoration, loaded validation retained | Pass | Pass | Pass | Fail | Fail |
| Narrow candidate: remove durable storage and no-change reparsing; retain D4/deferred adoption | Pass | Pass | Pass | Pass | Pass |

The unchanged-head stale-error failure is a **controlled reproduction of an
existing branch behavior**, not a shipping change caused by this investigation.
The stored error is not bound to a definition or action identity: with a valid
loaded file and old `codeViewValidationErrors`, the alert still appears because
the source initializes as `'code'` and ignores loaded-error recomputation.
Actual occurrence in a newly created native panel has not been established.

**D3 disposition refined:** First inspect/remove the `getState()/setState()`
durability, not every validation callback. Removing only durability passed all
five audit probes and retains local Code-save validation. Three original tests
still failed because they require persisted errors on remount or inject
persisted state as their starting condition. Those contracts must be explicitly
replaced with fresh-file recomputation/clearing coverage before a candidate can
become a passing implementation. They cannot simply be deleted to obtain green.

**D4 disposition refined:** The original whole-metadata effect reset
`workflow` to the previous metadata definition after a Code save and unrelated
access-token update. The emitted Save payload was correct, but the subsequent
provider input reverted. The unchanged implementation preserved the saved
definition. This is more than alert retention.
`DesignerSlice.ts:106-109` and `webviewCommunication.tsx:388` establish a real
token-update delivery path that replaces metadata without changing `standardApp`.
`localDesignerV2Panel.ts:431-434` acknowledges Save by resetting dirty state,
without delivering refreshed metadata in that save path. Do not restore D4
without another independently proven way to avoid this reset.

**D5 disposition refined:** Updating `initialWorkflow` while Code is mounted
reruns the actual editor initialization effect. With an existing Designer graph,
that effect chooses serialization of the captured Designer store rather than
the newly saved raw file (`CodeViewEditor/index.tsx:21-49`). The baseline-only
restoration reproduced edited text being replaced after Save. Retain/extract the
deferral protection unless a separately tested editor initialization fix
replaces it.

Restoring the original early return when `hasChanges()` is false did not break
any of the five probes. It did fail the original test that supplies different
Code text with `hasChanges=false` and expects reparsing during view switch.
This establishes a test dependency, not a generic removal proof: separately
investigate whether a saved raw definition can diverge from current workflow
metadata after acknowledgement/refresh, and whether reparsing is required to
preserve it. The other D5 guards must not be removed solely because this synthetic
dirty-state contract is absent from the corrected native scenario. These earlier
five probes did not cover the separate graph-edit/view-roundtrip mechanism below.

### D5 follow-up: clean Code state can contain Designer edits

The later source-backed controls keep D4 synchronization and D5 deferred
baseline adoption unchanged and restore only the original no-change return.
They mount the actual `DesignerApp` and `CodeViewEditor`, use production
deserialization/deletion/serialization bodies, and execute the provider's
deep-comparison/reinitialization effect. No probe injects a contradictory local
dirty flag or substitutes a stale canned serialization result.

The supported unfinished fixture contains Compose and no selected trigger.
Deleting Compose in Designer changes its graph while the parent's loaded
definition remains unchanged. Entering Code serializes the edited graph with
empty `actions`, but initialization correctly leaves local Code `hasChanges()`
false: no Code edit occurred. The original guard returns the old parent
definition; reparsing captures the edited graph's serialized baseline.

| Follow-up control | Current behavior | Original no-change guard |
| --- | --- | --- |
| Designer deletion, untouched Code, Workflow, then Code baseline | Pass | Internal baseline divergence; displayed Code still reflects the edited graph |
| Designer deletion, untouched Code, Monitoring, then Workflow | Deletion preserved | Compose resurrected by graph reinitialization |
| Genuine Code edit, Save/reset, token update, then Workflow | Pass | Pass |
| Two genuine Code edits and saves | Pass | Pass |
| Leave Code before held initialization completes | Pass | Pass |

Both replayed variants produce the expected result: current **5/5**, original
guard **3/5**. The baseline mismatch is not a second independently visible
defect: re-entering Code reserializes the edited graph and masks it. The
Monitoring roundtrip is the demonstrated content-loss mechanism.

**Public-path prerequisite:** The real command bar renders **Run history** for
a non-codeful workflow when a tracked runtime URL is available, without a
trigger-validity, dirty-state or Save gate
(`DesignerCommandBar/indexV2.tsx:246-258`, `appV2.tsx:84,389`). Its action resets
presentation state, then calls the Monitoring callback; the public Workflow
button returns through the existing graph reinitialization path
(`DesignerCommandBar/indexV2.tsx:222-232`, `appV2.tsx:277-332`). The host supplies
the tracked runtime URL in initialization
(`localDesignerV2Panel.ts:118,215-222`). Unchanged Code does not post a Save on
this transition.

**Proof boundary:** The control supplies a runtime URL and invokes the
callback through an adapted command bar. It does not establish a real tracked
runtime for this exact unfinished fixture or click the actual public buttons.
The editor DOM, service/host boundaries and asynchronous graph initialization
are adapted. No runnable Request/Compose control, native host acknowledgement,
or both-OS public-event roundtrip was executed. This is conditional local
necessity under the runtime-present state, not native integration acceptance.

**Disposition:** Retain/extract no-change reparsing under current state
ownership, rather than deleting it based on the earlier mocked-dirty contract.
A native counterfactual must establish the runtime, delete in Designer, enter
untouched Code, click actual Run history and Workflow, and exclude intervening
Save, metadata replacement or selected-run definition changes. Keep the
initialization guards and deferred-baseline behavior separate.

**Native coverage boundary:** The corrected scenario edits/saves/closes the exact
native `workflow.json`, then opens a different Designer target and checks the
persisted definition and exact visible error. Its HTTP source-shape controls do
not require D3-D5. They explicitly reject embedded Code as the scenario's editing
flow. See `httpTimeoutComposeOriginal.test.ts:844-929` and
`httpTimeoutComposeDom.unit.ts:1330-1487`. A new target alone does not prove that
an error was recomputed instead of restored. The native scenario still needs a
valid-after-invalid negative leg before claiming stale-error rejection.

**Validation and retained evidence:** The unchanged command
`pnpm exec vitest run --workspace vitest.workspace.js --project vscode-react apps/vs-code-react/src/app/designer/__test__/appV2.spec.tsx apps/vs-code-react/src/app/designer/utilities/__test__/workflow.test.ts --coverage.enabled=false`
passed **14/14**. Counterfactuals used
`pnpm exec vitest run --workspace .d3-d5-audit.workspace.ts --reporter=json --outputFile=<mode-report>`,
with explicit `AUDIT_D3_D5_MODE` and output directory. These experimental runs
intentionally include failing behavioral and superseded-contract assertions:
the narrow candidate passed all five probes but failed four of the nine original
host tests. It is **not** a passing regression suite or a push-ready change.
Source hashes, per-test outcomes and replayable experimental configuration are
retained as session artifacts.

No product removal, commit, push or ADO run was performed for this investigation.
At that point, the next controlled removal candidate was **D3 durable storage alone**, with
D4 and D5 baseline protection retained, revised non-stale validation coverage,
and complete affected both-OS native acceptance followed by the canonical
matrix at the same source.

### D3 implementation candidate authorized 2026-11-06

Following the investigation, the user authorized implementation, an affected
test pass and then a full test pass before any further cleanup.
The candidate removes only D3's persisted alert storage and its reader.
Fresh-file validation, local Code-save validation/source precedence, D4's
metadata dependencies and D5's dirty-state and deferred-baseline behavior remain.
The callback is renamed from `persistCodeViewValidationErrors` to
`updateCodeViewValidationErrors` to describe its now-local behavior.

The revised host tests exercise local Save/Discard/refresh, fresh-file error
recomputation across remount, invalid-to-valid file repair, rejection of legacy
persisted errors, and preservation of unrelated webview state. Existing
dirty-state reparsing and mounted-editor baseline assertions remain.
The complete local webview suite passes **357 tests in 30 files**.

Local gates for this candidate:

| Command | Result |
| --- | --- |
| `pnpm.cmd exec biome check --write apps\vs-code-react\src\app\designer\appV2.tsx apps\vs-code-react\src\app\designer\__test__\appV2.spec.tsx` | Passed |
| `pnpm.cmd exec vitest run --workspace vitest.workspace.js --project vscode-react --coverage.enabled=false` | Passed: 357 tests, 30 files |
| `pnpm.cmd --dir apps\vs-code-designer run test:e2e-cli:compile` | Passed |
| `pnpm.cmd --dir apps\vs-code-designer run test:e2e-cli:unit` | First run failed in the unchanged Roslyn ownership control; complete repeat passed, final lifecycle group 150 passed and six skipped |
| `node --test scripts\vscode-lifecycle-producer.unit.test.js` (from `apps\vs-code-designer`) | Unchanged diagnostic repeat passed |
| `pnpm.cmd --dir apps\vs-code-react run build` | Passed |

The first CLI failure reported `Installed executable changed while opening`
while comparing installed-file metadata. Its log is retained alongside the
unchanged targeted and complete repeats. These controls use a newly copied
synthetic Roslyn fixture; the result is not evidence of a D3 dependency or a
verified filesystem root cause. No lifecycle guard or fixture was changed to
obtain the repeat pass.

At implementation, this was a candidate, not native acceptance. Required gates
were the complete affected HTTP lifecycle on Linux and Windows, with original
artifact acceptance, followed by the canonical full23/protected rollup at the
identical committed source before another removal. The uncommitted feed trial
is excluded from its commit and native payload.

#### First committed D3 native results

Candidate source: `b967e04608b4d8f6acf8dbcd6f3bb0c86f8c524f`.

- [Affected run 15956191](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15956191):
  both Linux and Windows HTTP lifecycle passed. Downloaded original artifacts
  passed source/run/artifact identity, ordered evidence and terminal acceptance.
- [Canonical run 15956873](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15956873):
  **failed**. Twenty-two suite jobs succeeded; Linux workspace artifact
  regeneration failed, so the protected full rollup rejected acceptance.
  All twelve Windows original artifacts separately passed canonical identity,
  ordered evidence and terminal acceptance; this does not certify full23.

The regeneration baseline host passed. The next `vscode-single` observation
failed with `SyntaxError: Unexpected end of JSON input`, after capturing the
overwrite confirmation and before recording a completed repair observation.
Both regular Code hosts closed with exit `0` and signal `null`. Final staging
also rejected missing required family diagnostics. The persisted error
aggregation discarded the original stack and file identity, so these artifacts
alone do not prove which JSON read failed or establish D3 causality.

The follow-up investigation is confined to test observation/readiness and
actionable failure diagnostics. It does not authorize more product removals,
pipeline dependency changes, or weaker lifecycle/semantic acceptance. Full23
must pass at the next explicitly recorded immutable candidate before cleanup
continues.

#### Same-build rerun: native acceptance versus publication

Linux regeneration was rerun as job attempt 2 in build `15956873`, without a
source change. Native task log `1491` passed at the same D3 SHA; staging log
`1493` accepted ordered native phases and finalized cleanup, after staging
39 allowlisted evidence files. Linux dependency recovery and subsequent startup
were accepted under the existing lifecycle policy, not natural original closure.

Publication log `1507` then failed with
`Artifact vscode-e2e-cli-diagnostics-linux-workspace-regeneration already exists for build 15956873`.
The first attempt's published failure artifact remains the downloadable artifact;
it must not be relabeled as the successful second attempt. The protected rollup
is still failed, so this is a same-source native rerun pass, not full23 acceptance.

A test-only readiness candidate was locally implemented and validated during
the investigation, but remains uncommitted and excluded from the native source.
Its deterministic reproduction establishes a possible observation defect, not
the proven cause of the original failure or a required D3 fix. A fresh
canonical build was queued at the unchanged D3 SHA, avoiding
the same-build artifact-name collision without changing publication policy.

#### Accepted D3 baseline and attempt-safe diagnostics

The independent unchanged-D3
[canonical run 15957422](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15957422)
at `b967e04608b4d8f6acf8dbcd6f3bb0c86f8c524f` failed in Windows
`createWorkspaceBehavior`. Its original results retain a CDP
`Runtime.evaluate` timeout and a subsequent ordered-checkpoint rejection;
cleanup was verified. This is separate from the earlier Linux regeneration
failure and does not establish a D3 dependency.

Commit `11680614afc6a88bd37353ee7b1a4d2d89a03c62` adds attempt-qualified suite
diagnostics and dependency-output-bound protected rollup selection, without
shipping the regeneration-readiness or feed drafts. At that immutable source:

- [Affected run 15957577](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15957577)
  passed both-OS HTTP and regeneration acceptance. Linux regeneration initially
  failed its multiple-window observation because the required initialization
  prompt/real Yes was absent before the original deadline. One failed-job-only
  consumer-stage retry passed at suite attempt 2 and published a distinct
  `vscode-e2e-cli-diagnostics-linux-workspace-regeneration-attempt-2` artifact
  without a collision. Its attempt-1 failure artifact remains preserved.
  Original artifact verification accepted Linux regeneration attempt 2 and
  the other three lanes at attempt 1, including source/run/receipt identity,
  ordered evidence and terminal cleanup.
- [Canonical run 15957906](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15957906)
  passed all **11 Linux and 12 Windows** suites at attempt 1. Downloaded original
  artifacts passed the same identity, ordered-evidence and terminal acceptance
  checks, and the protected twenty-three-suite rollup passed.

This establishes D3 removal acceptance and native attempt-2 diagnostic
publication, not absence of intermittent failures. The mixed-attempt protected
rollup contract has local regression coverage; the protected native full23
run used attempt 1 throughout. The bounded failed-job retry policy is saved
in the E2E skill and canonical authoring guide. Do not relabel earlier failures
as successes or ship the unrelated drafts to obtain acceptance.

### D6. Visible MessageBars and wrapping

**Source:** `apps/vs-code-react/src/app/designer/appV2.tsx:412-415`.
**Introduced:** `875998f10`; styling expanded by `805c8fb5d`.

**Before/after:** Adds local error MessageBars with `role="alert"`, constrained
width and wrapping.

**Why:** Supply the missing visible product result. Wrapping was subsequently
added while investigating a visibility failure.

**Only to pass tests?** Mixed. The banner implements the requested outcome;
the specific geometry was partly a diagnostic hypothesis. Historical observation
found no alert candidates and empty validation state, so clipping was not shown
to be that failure's cause.

**Can the test adapt?** Real scrolling and a supported viewport can accommodate
existing layout. They cannot replace an absent banner. Do not require arbitrary
geometry merely to satisfy a screenshot.

**Disposition:** Banner belongs with D1/D2's product-validation fix. Wrapping may
be sensible UX protection, but its necessity was not established by that failure.

### D7. Internal validation state in a DOM attribute

**Source:** `apps/vs-code-react/src/app/designer/appV2.tsx:366`.
**Introduced:** `58ea2fea3`. Trial removal: `34005cb78`. Restored: `69e41f898`.

**Before/after:** Adds `data-code-view-validation-errors`, serializing internal
errors into production markup.

**Why/only to pass tests?** Yes, diagnostic accommodation. The driver reads it
with a nullable fallback, logs it, and removes it from the returned visible-state
observation. It is not the acceptance oracle.

**Can the test adapt?** Yes. Actual alert text, candidates, geometry, visibility
and owner identity remain observable without internal state.

**Earlier trial:** Removal passed local checks and both-OS HTTP native
acceptance. Subsequent full-suite runs failed in other Windows scenarios; those
failures do not establish that this attribute is necessary. It was restored
because the candidate did not receive complete full-suite acceptance. That did
not prove a product dependency. The separately implemented removal below has
now received complete acceptance; keep the attribute removed.

**References:** `httpTimeoutComposeDriver.ts:1959-1970`;
`httpTimeoutComposeOracle.ts:118-131`.

#### Accepted isolated D7 removal after the D3 baseline

Commit `afc472be2b4aa0e56ba3fbf0a86cdc2931e1ddb6` removes only the production
`data-code-view-validation-errors` attribute. Validation state, exact visible
alerts, root styling, Designer identity, D3 recomputation and D4/D5 editing
protections remain unchanged. The backward-compatible nullable driver probe
and visible-state oracle remain unchanged.

Three new rendering controls cover zero, one and multiple validation alerts:
no internal-state diagnostic attribute, exact visible alert text, visible
Designer shell and retained `100vh` root styling. All three controls failed
against the original markup before removal; the existing eleven host tests
passed. After removal, all fourteen host tests passed.

| Command (repository root) | Local result |
| --- | --- |
| `pnpm exec biome check apps/vs-code-react/src/app/designer/appV2.tsx apps/vs-code-react/src/app/designer/__test__/appV2.spec.tsx` | Passed after correcting added-test formatting |
| `pnpm exec vitest run --workspace vitest.workspace.js --project vscode-react` | Passed: 360 tests, 30 files |
| `pnpm --dir apps/vs-code-designer run test:e2e-cli:compile` | Passed |
| `pnpm --dir apps/vs-code-designer run test:e2e-cli:unit` | Complete chain passed |
| `pnpm --dir apps/vs-code-react run build:extension` | Passed |

The VS Code test specialist applied owning-domain, test-strategy and senior
plan/risk/diff-review workflows directly and found no blocking issue. Local
CLI compilation/controls include the preserved unrelated drafts; they are not
committed-source native proof. The feed and regeneration-readiness drafts
remain excluded from publication.

Both required native gates passed at that identical D7 source:

- [Affected HTTP run 15959057](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15959057):
  Linux and Windows passed at suite attempt 1. Downloaded originals passed
  physical artifact/receipt, source/run, ordered-evidence and terminal checks.
- [Canonical full23 run 15959210](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15959210):
  all 11 Linux and 12 Windows suites passed at attempt 1, original artifacts
  passed the same checks, and the protected full rollup passed.

D7 is therefore not a remaining removal candidate. The accepted source retains
D3 fresh-file/local validation and D4/D5 editing protections. Neither run
contains the feed or regeneration-readiness drafts, and neither required a
failed-job retry. Documentation updates record these source-bound outcomes;
they do not imply another native run at a later documentation-only SHA.

### D8. Run After accessible names, both Designer versions

**Sources:** `libs/designer/src/lib/ui/settings/sections/runafterconfiguration/runafteractiondetails.tsx:58-80`
and the equivalent `libs/designer-v2` file. **Introduced:** `25b4912ec`.

**Before/after:** `format(\`Expand ${title}\`, title)` appended an unused formatting
argument, yielding a label such as `Expand Compose Compose`. Direct interpolation
produces `Expand Compose`; Collapse is corrected likewise. Expansion itself
does not change.

**Why:** Native tests reached the right predecessor row but expected the
unduplicated accessible name.

**Only to pass tests?** Mixed. This is a genuine accessibility correction, but
not necessary to configure Run After using the original behavior.

**Can the test adapt?** Yes: target the actual original label inside the uniquely
identified predecessor row, click the enabled/hit-tested button, and verify
status controls and persisted `runAfter`. This does not require broad/global
selectors or dropping action identity.

**When would that be insufficient?** If the independent acceptance requirement
specifically required the title to occur only once in the accessible name.
No prior independent requirement of that specificity was established. The
authoring-document statement of the corrected label was added in the same fix;
it is not independent authority.

**Restoration under validation:** Both Designer versions now use the original
`util.format` expression. Shared CLI interaction and screenshot readiness match
the exact original browser label within the unique visible predecessor row;
Playwright uses the same original label for its ordinary-title scenario.
Status, persisted `runAfter`, trusted-click ownership and evidence requirements
remain intact. Browser-format controls execute the installed browser polyfill,
including percent placeholders, rather than assuming modern Node semantics.

The actual React/Fluent component passes seven title cases in each package,
including expansion, status changes, last-status disabling and collapse/reopen
persistence. Run these with each package's explicit `vitest.config.ts`; the
root invocation used a non-DOM workspace project and failed before rendering.
Strict CLI compilation and affected lifecycle, DOM, readiness and pipeline
controls also pass locally. Local checks do not certify a committed native
payload. Full run `15974647` at `67d308af0` excludes D8 and cannot validate this
restoration. A D8 commit still requires affected Linux/Windows acceptance and
then canonical full23 at its identical SHA.

**Disposition:** Separate accessibility fix; adapt functional tests if the PR is
strictly test-only. Current corrected-name dependencies are at
`designerCdpActions.ts:2615-2617,2655,2682`.

### D9. Mapper `satisfies GriffelStyle`

**Source:** `libs/data-mapper/src/lib/components/nodeCard/NodeCard.tsx:2,49-55`;
consumer `SchemaCard.tsx:69-70`. **Introduced:** `4dc6aaa5c`.

**Before/after:** The original exported mutable object's `outlineStyle` widened
to `string`. A type-only import and `satisfies GriffelStyle` preserve appropriate
literal typing. Runtime styling values do not change.

**Why/only to pass tests?** Actual library compilation failed. This is compiler
compatibility support, not a test assertion workaround.

**Can the test adapt?** No equivalent test-side fix exists while compiling the
real package under the same compiler/dependencies. Skipping compilation or
weakening types hides the failure.

**Evidence/disposition:** An exact in-memory source counterfactual produced zero
diagnostics unchanged and one new TS2322 at `SchemaCard.tsx:69` without the
annotation. Emitted JavaScript was identical excluding source-map directives.
Retain or extract into a prerequisite build-fix commit.

## Extension product changes

All paths in E1-E14 are relative to `apps/vs-code-designer`.

### E1. Product activation bypasses controlled by E2E flags

**Source:** `src/main.ts:101-114`. **Introduced:** `c29cef8af`.

**Before/after:** Normal activation continued beyond command registration.
`LA_E2E_CLI_MINIMAL_ACTIVATION=1` now returns early; another E2E flag skips initial
workspace initialization.

**Why/only to pass tests?** Yes, fixture accommodation. Later native debug
evidence showed minimal activation skipped Functions task listeners. Switching
the MSN phase to normal activation (`8be4a0669`) and its existing dependency
validation settings (`4c3bf8ac2`) resolved that test setup problem.

**Can the test adapt?** Yes: normal activation, authentic prepared dependencies,
existing settings, readiness and real prompt handling. Intentionally partial
activation can be tested with unit/module fixtures rather than a shipping early
return. The MSN correction demonstrates normal activation is feasible.

**Disposition:** Restore/test-adapt through a separately proven fixture change.

### E2. E2E mode suppresses dependency update checks

**Source:** `src/app/state/dependencies.ts:13-24`. **Introduced:** `49acbcc31`.

**Before/after:** Normal persisted-state throttling is bypassed when strict E2E
dependency validation is set; update checks return false.

**Why/only to pass tests?** Yes: prevent isolated profiles from replacing the
same pre-admitted dependency bytes. No independent ordinary-user defect was
established.

**Can the test adapt?** Yes in principle: isolate mutable managed dependency
roots, complete normal installation before admission, and use existing update
throttling. Those alternatives require fixture proof; they are not implemented
by this audit. Exact pre-admitted bytes are a fixture evidence constraint, not
an inherent need for a shipping E2E update bypass.

**Disposition:** Restore/test-adapt. A product dependency-pinning capability, if
desired, is a separate feature.

### E3. Required WIF subscription provider and authentication integration

**Sources:** `src/app/utils/services/VSCodeAzureSubscriptionProvider.ts:7-84`,
`src/main.ts:83`, `src/extensionVariables.ts:5,55`,
`src/app/utils/codeless/getAuthorizationToken.ts:9-28`,
`src/app/utils/telemetry.ts:16`, `package.json:19`.
**Introduced:** `c29cef8af`.

**Before/after:** A synchronous VS Code subscription-provider singleton becomes
an async factory that can select/sign into an Azure DevOps provider using
service-connection environment contracts. Provider-backed subscriptions supply
sessions. Azureauth moves from `^4.2.0` to `^5.1.1`; provider typing and the
subscription-list API call change.

**Verified rationale, updated 2026-11-06:** The upstream
[Azure Auth README](https://github.com/microsoft/vscode-azuretools/blob/main/auth/README.md#azure-devops-subscription-provider)
explicitly documents `AzureDevOpsSubscriptionProvider` for Azure-authenticated
E2E tests inside Azure DevOps pipelines, using a federated service connection
without managing secrets, passwords or connection strings. This is an SDK-supported
CI authentication boundary, not an invented mock or a workaround justified only
by the current test implementation. The user confirmed that this is the required
authentication approach for the ADO coverage.

**Integration verification:** The extension creates the SDK provider from service
connection, tenant and client identifiers, awaits sign-in during activation, and
retains the ordinary VS Code provider when WIF is not configured. Its generalized
provider type and provider-backed session lookup let ordinary extension consumers
use the selected authentication provider instead of requiring an interactive
Microsoft authentication session.

The installed `@microsoft/vscode-azext-azureauth` version is `5.1.1`. Its shipped
README and `AzureDevOpsSubscriptionProviderInitializer` declaration explicitly
document the root-package import and initializer fields `serviceConnectionId`,
`domain` (tenant ID), and `clientId`, matching this integration. The linked
upstream `main` README now uses an `/azdo` import and `tenantId`; that newer example
is not the versioned contract of the installed package. This verification does
not establish that `5.1.1` is the minimum possible version.

**Pipeline prerequisites:** The upstream
[federated-credentials guide](https://github.com/microsoft/vscode-azuretools/blob/main/auth/AzureFederatedCredentialsGuide.md#4-grant-access-to-the-pipeline-to-use-this-service-connection)
requires pipeline permission to use the service connection, a pipeline step
referencing that connection, and `SYSTEM_ACCESSTOKEN` supplied to steps using
the provider, along with the connection identifiers. Provider integration does
not replace those requirements. This documentation verification is not a new
native run or a blanket correctness claim for every authentication code path.

**Only to pass tests?** Required test infrastructure, implemented through a real
supported provider. An ordinary customer feature request is not necessary to
justify enabling the explicitly selected secretless ADO E2E authentication model.
The earlier classification as an optional product-feature/removal candidate was
too broad.

**Can the test adapt to the original provider?** Not while retaining the required
WIF model. A warmed interactive profile would select a different authentication
contract; a bearer token alone would not populate the original session/subscription
APIs. Introducing another bridge is not a reason to remove the supported SDK
integration already selected for this work.

**Disposition:** **Retain; not a cleanup, removal or replacement target.** Keep
the provider factory/activation integration, provider-backed session handling and
associated azureauth dependency/type/API adaptations together. This decision
does not automatically approve unrelated test hooks or E4's separate
environment-token fallback.

### E4. Environment-token fallback session

**Source:** `src/app/utils/codeless/getAuthorizationToken.ts:34-36,68-87`.
**Introduced:** `c29cef8af`.

**Before/after:** When silent native session lookup is absent, a
`VSCODE_RUNNING_TESTS=1` branch can construct a session from E2E environment
tokens/identity values. `silentAuth` itself already existed at the comparison
base and is not new.

**Why/only to pass tests?** Yes: a test-gated authentication bridge.

**Can the test adapt?** Yes in principle, by establishing the supported session
or an approved bridge at the VS Code authentication boundary before the
scenario. That is different from assuming a pipeline token is a cached session.

**Disposition:** Restore/test-adapt. Decide separately from E3's WIF product mode.

### E5. Activation catches workspace identity changes and initializes more paths

**Source:** `src/main.ts:107-109,151-174`.
**Introduced:** `403e51b99`, `b73af5db6`.

**Before/after:** Adds an initial workspace identity snapshot and catch-up around
listener registration. Folder changes and catch-up also call `ensureWorkspace`,
adding initialization and potential prompt behavior.

**Why/only to pass tests?** Mixed/unproven. Added controls model a registration
race, but do not establish a separate native customer reproduction. Extra
initialization calls are a behavior expansion, not formatting.

**Can the test adapt?** Yes for ordinary creation/reopen/multi-root coverage:
start with the intended workspace or finish normal activation before changing
folders, then await supported readiness and real prompts.

**When not equivalent:** If the requirement explicitly tests changes during
activation. Waiting first drops that race scenario. The independent invariant
would be that a real change must not be lost, not that tests need this particular
catch-up implementation.

**Disposition:** Separate race fix with native reproduction, or restore/test-adapt.
Modeled controls: `src/__test__/main.test.ts:396-436`.

### E6. Optional executables during POSIX Func-package chmod

**Source:** `src/app/utils/binaries.ts:189,290-305`.
**Introduced:** `c29cef8af`.

**Before/after:** Rather than chmod every expected executable unconditionally,
the code checks existence for optional `gozip`/`in-proc6` files. Required
launcher/in-proc8 files remain mandatory; Windows is excluded.

**Why/only to pass tests?** The root `gozip` guard has independent publisher
provenance, not just a fixture. The official
[Functions Core Tools 4.16.0 Linux x64 package](https://github.com/Azure/azure-functions-core-tools/releases/download/4.16.0/Azure.Functions.Cli.linux-x64.4.16.0.zip)
contains `func`, `in-proc8/func` and `in-proc6/func`, but no root `gozip`.
Its 8,886-entry ZIP central directory was retrieved directly from the publisher
using bounded HTTP 206 ranges. A control executed the original permission block
and current helper against those exact entry names: the original rejects
`gozip` with `ENOENT`; the current helper completes and still requires the
launcher and in-proc8 files. This is a package-layout/source control with a
filesystem adapter, not an actual POSIX chmod or native installation.

**Can the test adapt?** General designer scenarios can prepare authentic,
verified dependencies. Pinning an older package or inventing a root executable
does not validate ordinary installation of the current supported package:
the product resolves a supported major version to a current published release.

**Remaining boundary:** The `in-proc6` guard is not independently necessary for
that x64 archive because its file exists. The official 4.16.0 Linux ARM64 ZIP's
4,123-entry directory omits both in-proc6 and in-proc8 launchers, as well as root
`gozip`. The source accepts ARM64 and selects that archive, but the current
permission helper still rejects mandatory `in-proc8/func`; the source control
preserves this failure instead of claiming complete ARM64 installation support.
That mandatory requirement also existed in the original code. Do not broaden
this cleanup into an unverified platform fix.

The bounded downloads verify directory structure and entry counts, not the
full publisher archive SHA256. No Functions binary was installed or executed.

**Disposition:** Retain/extract the authentic-package compatibility fix for
root `gozip`. Do not describe every optional-file branch or ARM64 provisioning
as independently proved, and do not remove the whole change as fixture-only.

### E7. POSIX Node/npm resolver accepts a flattened layout

**Source:** `src/app/utils/nodeJs/nodeJsVersion.ts:51,75-78,94-101`.
**Introduced:** `b25b68f0b`.

**Before/after:** The original resolver expected `<node-v*>/bin`; direct
`bin/node` and `bin/npm` now take precedence, with nested-layout fallback.

**Why/only to pass tests?** Independent product-layout provenance is now
established. The official
[Node 24.15.0 Linux x64 archive](https://nodejs.org/dist/v24.15.0/node-v24.15.0-linux-x64.tar.gz)
has one `node-v24.15.0-linux-x64` container. Its complete SHA256 was checked
against the publisher's
[SHASUMS256.txt](https://nodejs.org/dist/v24.15.0/SHASUMS256.txt):
`44836872d9aec49f1e6b52a9a922872db9a2b02d235a616a5681b6a85fec8d89`.
The product's `extractDependency` calls `extractContainerFolder`, which moves
that container's children directly into managed `NodeJs`. The normalization
helper is unchanged from the audit base; the test fixture did not invent this
flattening.

An archive-backed filesystem control ran that actual normalizer and the
original/current resolver modules with mocked VS Code settings and simulated
Linux platform selection. Both resolvers choose the nested managed executable
before normalization. After normal product normalization, the original writes
the ambient `node` fallback; the current code chooses managed `NodeJs/bin/node`.
The extracted executable was not run. Ambient Node may incidentally make a
scenario pass, but it does not prove correct managed executable selection.

**Can the test adapt?** Normal dependency preparation remains appropriate,
but retaining the original archive container would bypass the unchanged product
normalization. A test-only directory rearrangement or ambient Node fallback is
not equivalent proof of the supported managed installation path.

**Remaining boundary:** This is source/archive compatibility proof, not a
native POSIX installation, npm execution or isolated native rollback. npm uses
the same resolver but its authentic archive entry is a symlink and was not
separately executed.

**Disposition:** Retain/extract direct managed-layout compatibility. Do not
remove it as support for an artificially flattened fixture.

### E8. Feed retry, deadline and request-error metadata

**Sources:** `src/app/utils/feed.ts:16-107`,
`src/app/utils/bundleFeed.ts:120,136`,
`src/app/utils/requestUtils.ts:76-96`.
**Introduced:** `5f8bd9f60`.

**Before/after:** A single configured-timeout request with a ten-minute cache
gains an opt-in three-attempt loop, 250 ms delay, 45-second aggregate deadline,
status/transport/cause classification, shared timeout override and synthetic
timeout code. Two bundle feed callers opt in. Error causes are preserved.

**Why/only to pass tests?** Test-rollup motivated, but no causal native outage or
independent product resilience requirement was established by the commit/tests.
Transient recovery in a mock proves the new behavior, not why it belongs here.

**Can the test adapt?** Yes for scenarios that are not dependency-download tests:
normally prepare/cache verified dependencies before measured execution and
surface actual setup failures. Any allowed setup retry should be owned and
reported by setup, not silently change product request semantics.

**When not equivalent:** A specifically required product-download resilience
scenario needs an explicit product networking feature. Removing retries really
reduces transient resilience; it is not behavior-neutral deletion.

**Disposition:** Restore/test-adapt retries and timeout override. Error-cause
preservation is a separate small observability change; it does not guarantee
that telemetry serializes the causes.

**Pending trial:** The working-tree cleanup restores the original single-request
behavior/configured timeout and retains causes. Its replacement controls cover
cache expiration, parsing, error identity, single attempts and configured
timeout delegation. It is uncommitted and has no native acceptance; do not
attribute baseline success to that trial.

The trial's completed local checks passed: 136 focused tests, strict CLI
compilation, 150 CLI controls with six skipped, and the extension build.
These results do not establish native or full-matrix acceptance.

### E9. Avoid rewriting an unchanged `.gitignore`

**Source:** `src/app/utils/git.ts:48-55`. **Introduced:** `b97377bcd`.

**Before/after:** The original helper always rewrote its regex replacement
result. The new guard returns if the resulting contents are unchanged.

**Why/only to pass tests?** Mixed, with concrete evidence: writer receipts proved
an original 207-byte file was truncated to zero and then restored to the same
207 bytes. Strict snapshot sampling caught the transient state. This was not
proof of permanent content corruption.

**Can the test adapt?** Yes if its requirement is final settled contents: await
initialization and sample stable results. Not if the independent policy is
continuous non-target immutability; accepting the transient write changes that
policy. Do not silently substitute one requirement for the other.

**Disposition:** Separate small product fix, or explicitly retain under the
strict policy. The guard avoids real needless I/O, but a continuously sampled
test is not by itself universal product authority.

### E10. `.gitignore` writer-attribution hooks

**Sources:** `src/app/commands/createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace.ts:42,198-200`;
`src/app/utils/git.ts:10,56-63`. **Introduced:** `0f47aee49`.

**Before/after:** Direct copies/writes become diagnostic wrappers. Under admitted
test execution, a writer adapter can use explicit open/write/close operations;
otherwise the original body executes.

**Why/only to pass tests?** Yes: diagnostics requested to identify the actual
writer. These receipts ultimately separated transient truncation from persistent
corruption. Instrumented execution is not entirely behavior-neutral.

**Can the test adapt?** Functional assertions can use filesystem observations.
Exact internal writer attribution is not reliably reconstructible from a watcher
alone; approved scoped OS tracing or a narrow hook may still be necessary for
that diagnostic claim.

**Disposition:** Prefer test/recorder instrumentation. Explain any unavoidable
minimal observation hook separately from E9's actual no-op guard.

### E11. Func task and debug-startup diagnostics

**Sources:** `src/app/commands/pickFuncProcess.ts:41,263-437`;
`src/app/utils/funcCoreTools/funcHostTask.ts:20,58-75,173-229`;
new `src/app/utils/funcCoreTools/funcTaskDiagnostics.ts:1-73`.
**Introduced:** `144c0d4c8`.

**Before/after:** Adds spans/snapshots for task events, map mutation, readiness
and candidate selection. Existing task classification/selection is not a new
algorithm merely because it now has diagnostics.

**Why/only to pass tests?** Yes, observation. The diagnosed native failure was
missing listener registration under the harness's minimal-activation setting.
The remedy was test settings, not a new product task classifier.

**Can the test adapt?** Supported task/debug events, logs and original exports
cover most observations. Internal map/candidate identity needs an explicit
boundary if that level of attribution is still required.

**Disposition:** Move/minimize into test/recorder diagnostics; do not call the
underlying activation-fixture problem a product defect.

### E12. Design-time diagnostics and native spawn identity

**Sources:** new `src/app/utils/codeless/designTimeDiagnostics.ts:1-51`;
`src/app/utils/codeless/startDesignTimeApi.ts:64-73,173-195,298-429,516-548,657-681,754-846`.
**Introduced:** `676116bc1`, `039e52e60`, `35f2d9a24`.

**Before/after:** Adds state/spawn/stop receipts, exact original native birth
binding and physical project identity in admitted diagnostics. Diagnostic
canonicalization does not change ordinary product map keys.

**Why/only to pass tests?** Yes, observation/oracle repair. Multi-root ownership
inference originally rejected legitimate workers or lost short-lived ancestry;
Windows receipt identity also differed in drive-letter casing. This is not
evidence that ordinary product project selection needed canonicalizing.

**Can the test adapt?** Recorder/native containment can observe original
activation, logs, processes, listener identity and shutdown. A race-safe original
birth cannot always be reconstructed after a leader exits; a narrow approved
birth hook or test-side spawn instrumentation may be needed.

**Disposition:** Prefer test/recorder instrumentation, or explicitly separate a
minimal observation contract. The current oracle's implementation does not make
every current product hook inherently necessary. Do not attribute preexisting
Windows/macOS cleanup semantics to newly added diagnostics.

### E13. Linux pending-startup design-time process-group shutdown

**Source:** `src/app/utils/codeless/startDesignTimeApi.ts:59-60,197-258,269-291,409-418,652-671,767-796`.
**Introduced:** `65158a0f5`.

**Before/after:** Original Unix cleanup issued unawaited kills for known shell/
child PIDs. Linux now launches detached, binds a process group to the exact
child, signals that group, awaits direct-child exit and rejects stale exited
leaders. Startup-error cleanup awaits Linux cleanup while preserving the original
failure. Windows/macOS behavior is unchanged apart from observation.

**Why/only to pass tests?** No, although tests discovered it. Native retained
shell/launcher/worker ancestry showed original shutdown left its own Func
descendants alive during pending startup, before `childFuncPid` was available.
This is stronger evidence than observing an unrelated extra process.

**Can the test adapt?** Functional execution can await original shutdown and then
report harness containment/recovery separately. Independently proven dependency
survivors can use the established exceptional lifecycle policy. Neither proves
that original shutdown released a product-owned Func runtime.

**Why not equivalent for the shutdown scenario?** Killing that Func in the
harness proves recovery, not original release. Shared/product Func cannot be
reclassified as an independent dependency to make acceptance green.

**Disposition:** Separate lifecycle product fix with the causal native evidence
and regression. Full integration success does not isolate every algorithm detail.

### E14. Mechanical source changes and package tooling

**Sources:** `src/app/commands/deploy/notifyDeployComplete.ts:20`,
`src/app/commands/funcCoreTools/validateFuncCoreToolsInstalled.ts:130`,
`src/app/commands/generateDeploymentScripts/generateDeploymentScripts.ts:5,57-65`,
and `package.json:71-122`. **Introduced:** principally `c29cef8af`;
package lint-staged configuration by `08a3d9320`.

**Before/after:** Renames unused parameters, removes an unused import and changes
formatting. Test/build/selector/control scripts and lint-staged settings are
developer/test tooling. Reordering `vscode-languageclient` does not upgrade it.
The net manifest diff does not add activation events or user-facing contributions.

**Only to pass tests/can tests adapt?** No runtime adaptation is needed for
mechanical changes. Keep necessary test scripts; unrelated formatting/name churn
can be restored for scope clarity. Lint-staged is a separate developer-workflow
decision, not a test scenario requirement.

**Disposition:** Keep necessary tooling; minimize unrelated churn. The azureauth
upgrade is E3, not mechanical.

## Historical change already restored

`apps/vs-code-designer/src/constants.ts` has **no net base-to-head change**.
The original and audited head both use fixed `designerApiLoadTimeout = 300000`.
The E2E environment override introduced by `c29cef8af` was removed in
`2ca4d55b3` at the user's request. It is not a currently retained product change.

## Complete production-file coverage

Paths are repository-relative. Multiple findings can concern one file.

| File | Findings |
| --- | --- |
| `apps/vs-code-react/src/app/designer/appV2.tsx` | D2-D7 |
| `apps/vs-code-react/src/app/designer/utilities/workflow.ts` | D1 |
| `libs/designer/src/lib/ui/settings/sections/runafterconfiguration/runafteractiondetails.tsx` | D8 |
| `libs/designer-v2/src/lib/ui/settings/sections/runafterconfiguration/runafteractiondetails.tsx` | D8 |
| `libs/data-mapper/src/lib/components/nodeCard/NodeCard.tsx` | D9 |
| `apps/vs-code-designer/src/main.ts` | E1, E3, E5 |
| `apps/vs-code-designer/src/extensionVariables.ts` | E3 |
| `apps/vs-code-designer/src/app/state/dependencies.ts` | E2 |
| `apps/vs-code-designer/src/app/utils/services/VSCodeAzureSubscriptionProvider.ts` | E3 |
| `apps/vs-code-designer/src/app/utils/codeless/getAuthorizationToken.ts` | E3, E4 |
| `apps/vs-code-designer/src/app/utils/telemetry.ts` | E3 |
| `apps/vs-code-designer/src/app/utils/binaries.ts` | E6 |
| `apps/vs-code-designer/src/app/utils/nodeJs/nodeJsVersion.ts` | E7 |
| `apps/vs-code-designer/src/app/utils/feed.ts` | E8 |
| `apps/vs-code-designer/src/app/utils/bundleFeed.ts` | E8 |
| `apps/vs-code-designer/src/app/utils/requestUtils.ts` | E8 |
| `apps/vs-code-designer/src/app/utils/git.ts` | E9, E10 |
| `apps/vs-code-designer/src/app/commands/createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace.ts` | E10 |
| `apps/vs-code-designer/src/app/commands/pickFuncProcess.ts` | E11 |
| `apps/vs-code-designer/src/app/utils/funcCoreTools/funcHostTask.ts` | E11 |
| `apps/vs-code-designer/src/app/utils/funcCoreTools/funcTaskDiagnostics.ts` | E11 |
| `apps/vs-code-designer/src/app/utils/codeless/designTimeDiagnostics.ts` | E12 |
| `apps/vs-code-designer/src/app/utils/codeless/startDesignTimeApi.ts` | E12, E13 |
| `apps/vs-code-designer/src/app/commands/deploy/notifyDeployComplete.ts` | E14 |
| `apps/vs-code-designer/src/app/commands/funcCoreTools/validateFuncCoreToolsInstalled.ts` | E14 |
| `apps/vs-code-designer/src/app/commands/generateDeploymentScripts/generateDeploymentScripts.ts` | E14 |
| `apps/vs-code-designer/package.json` | E3, E14; dependency/tooling, outside the 26-source count |

No net production changes were found in `libs/vscode-extension` for this
comparison. Tests, runners, pipeline definitions and generated knowledge graphs
are outside this production-source inventory.

## Proposed disposition, not an implementation approval

The current-status matrix above supersedes the original candidate status for
D3 durable storage and D7 diagnostic markup: both removals are accepted.
The proposals below concern the remaining areas, not those completed removals.

The strongest test-only candidates are original Run After label support,
correct native-file editing instead of embedded-Code assumptions, normal
activation, authentic dependency layouts, and recorder-side diagnostics.
Each still needs its own controlled proof before a removal is retained.

**E3's WIF authentication integration is excluded from those cleanup candidates.**
It is required, SDK-documented infrastructure for the selected secretless
ADO E2E model. Retain the integration and its associated dependency/type/API
adaptations; assess E4's separate environment-token fallback independently.

Changes that meet independently requested missing behavior or demonstrated
product defects should be **split into explicit product fixes**, not smuggled
into test coverage or dismissed merely because a test discovered them.
In particular, the fresh-Designer timeout error, actual editor content loss,
and pending-startup product Func shutdown require separate decisions.

Unproven package-layout and activation-race rationales need provenance/reproduction,
not blanket claims of necessity. The Mapper compiler counterfactual supports
retention without claiming a runtime feature.

For any eventual removal: preserve the original scenario, real UI interactions,
error/debug/ownership assertions and agreed file/lifecycle policy. Prove the
affected complete native lanes on both OSes and then the canonical full suite
at the same immutable source before another independent removal. If every lane
is affected, the canonical matrix is itself the affected native gate.
Do not count targeted success, post-failure recovery, or a documentation audit
as complete native acceptance.
