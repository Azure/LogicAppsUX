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
implementations, the D8 restoration, E1 minimal-return removal and their
accepted native results are recorded below.

Source line references describe the historical comparison head, not the latest
accepted source. The uncommitted feed trial changes line numbers in its three
production files.

## Current decisions and acceptance

Evidence checked **2026-11-11**. The earlier accepted code baseline is
`82477dc0e56a010baa4d03318915cae313fc51f6`, containing D3 durable-storage
removal, D7 diagnostic-attribute removal, D8 original Run After names and E1
minimal-activation early-return removal. Six affected families on both OSes
[run 15979351](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15979351)
and canonical
[run 15979977](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15979977)
passed at that identical SHA. Downloaded originals passed source/run/attempt,
ordered-evidence and terminal acceptance; the full run's **11 Linux and
12 Windows** suites and protected rollup passed. The affected run used attempt 1
throughout; Linux and Windows regeneration used attempt 2 in full23, with both
failed attempt 1 originals preserved. This establishes native
mixed-attempt protected selection, not elimination of intermittency.
This documentation update is not another native run. E1's separate
initial-workspace initialization bypass is also removed and accepted at
`3e9d343a0` in affected run `15983333` and canonical full23 run `15984836`.

The E2 accepted code baseline is
`c585d26394dbc6a7c20d07937fbbcc0fed5db663`, additionally removing E2's
dependency-update suppression while preserving strict validation. Affected
[run 15986177](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15986177)
and canonical
[full23 run 15987081](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15987081)
passed at that identical SHA. All 23 canonical suite jobs passed on attempt 1;
downloaded originals passed artifact/source/run/producing-attempt, ordered
evidence and terminal identity checks, and the protected full rollup passed.
Later documentation-only commits are not another native payload or run.

The E10 removal is accepted at exact source
`71084a53d8d6857b41346cb9f8ed5b2665ddc604`, tree
`bceb22a297b45833268b4a9e7a597cc233746d1a`, in canonical both-OS
[full23 run 15994233](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15994233).
All 23 original producing-attempt artifacts and the protected rollup were
accepted. Both regeneration lanes produced on unchanged-source attempt 2;
the other 21 lanes produced on attempt 1. Initial failures and their separate
containment/product-proof verdicts are preserved in E10 below. This is not
first-attempt stability or native acceptance of the subsequent E11 candidate.

| Classification | Areas | Current decision | Evidence boundary |
| --- | --- | --- | --- |
| Not required; removal accepted | D3 durable `getState()/setState()` alert storage | Keep removed; recompute fresh-file errors and preserve local Code-save source precedence | D3-only accepted at `11680614`; latest full23 also includes D7 removal and D8 restoration. This is not removal of all D3 validation behavior |
| Not required; removal accepted | D7 `data-code-view-validation-errors` | Keep removed; observe actual visible alerts, identity and geometry | Three rendering controls plus both-OS HTTP and full23 at `afc472be2`; nullable driver probe remains |
| Required for selected ADO authentication | E3 WIF provider, activation/session integration and associated azureauth dependency/type/API adaptations | Retain together; not a cleanup target | SDK-documented secretless provider; follow installed SDK contract, not a newer upstream example. Does not approve E4's token fallback |
| Editing protection; retain or extract | D4 metadata dependencies; D5 deferred baseline adoption | Preserve saved definition and mounted Code text | Controlled local restoration reproduces saved-definition reset/content replacement. Native-file HTTP coverage does not isolate every embedded-editor race |
| Conditional editing protection; retain or extract | D5 no-change reparsing | A locally clean Code editor can contain unsaved Designer graph edits; preserve that serialized baseline | Runtime-present view-transition control reproduces deleted-action resurrection with the old guard. Public Run history route is source-supported, but exact host/UI sequence is not natively executed |
| Retained; necessity unresolved | Other D5 initialization guards | Investigate individually, not as part of a D3-D5 bundle deletion | The no-change counterfactual does not establish every initialization branch; no native removal acceptance |
| Required for specified visible-error outcome, not test-only plumbing | D1 validation, D2 fresh-file recomputation, D6 error MessageBars | Retain/separate explicit product-validation work | A selector or wait cannot supply an absent error. The broader action policy and particular wrapping geometry are not independently justified by one scenario |
| Build prerequisite, runtime-neutral | D9 Mapper typing | Retain or extract the compiler fix | Counterfactual adds TS2322; emitted JavaScript is unchanged. Skipping compilation is not an equivalent test adaptation |
| Product shutdown fix, not a harness workaround | E13 Linux pending-startup Func shutdown | Preserve original product-owned runtime release; separate the product fix | Native retained ancestry demonstrated surviving product Func descendants. Harness killing proves recovery, not original release; not every algorithm detail was isolated |
| Conditional on file policy | E9 unchanged `.gitignore` write guard | Retain/separate under continuous non-target immutability; make the policy explicit | Transient truncation is demonstrated, permanent corruption is not. Settled final-content sampling is a different requirement |
| Not required; restoration accepted | D8 Run After accessible names | Keep original browser `util.format` in both Designers; tests use its exact label scoped to the predecessor row | Fourteen product-DOM cases, browser-polyfill controls, both-OS Run After and canonical full23 accepted at `849137329` |
| Not required; removal accepted | E1 minimal-activation early return | Keep normal activation regardless of the legacy minimal flag; runner values remain for the isolated ablation | Six affected families on both OSes and canonical full23 accepted at `82477dc0e`. This does not accept removal of the independent workspace-initialization bypass |
| Not required; removal accepted | E1 workspace-initialization bypass | Initialize already-open workspaces regardless of the legacy workspace flag; preserve the remaining activation path | Local controls, affected 14-lane run `15983333` and canonical full23 run `15984836` accepted at `3e9d343a0`; failed regeneration attempts preserved |
| Not required; removal accepted | E2 update suppression | Keep normal persisted update throttling without disabling strict validation or changing fixtures | Six strict-mode regressions fail before removal; 61 focused tests pass after removal. Affected 12-lane run `15986177` and canonical full23 run `15987081` accepted at `c585d2639`; all 23 canonical producing attempts passed on attempt 1 |
| Not required; removal accepted | E4 environment-token session fallback | Keep the synthetic-session helper/fallback removed; retain E3 WIF, normal Microsoft sessions and independent fixture/API tokens | Removal committed as `dea31bfc6`; canonical full23 `15991034` accepted at `84cf43160`, including all 23 original producing-attempt artifacts and protected rollup. Raw-token-only synthetic authoring is retired; no speculative identity fix |
| Supported-package compatibility; retain or extract | E6 missing root `gozip` guard; E7 direct managed `bin/node` resolution | Authentic publisher layouts and unchanged production normalization reproduce the original incompatibilities | Source/archive controls, not native POSIX installation proof. E6's `in-proc6` guard and E7's npm execution are not independently isolated |
| Provenance/race questions remain open | E5 activation catch-up; remaining E6 platform-specific prerequisites | Establish the actual race and each supported platform's real package contents | An ARM64 archive also lacks mandatory `in-proc8/func`; current E6 changes do not fix that pre-existing requirement |
| Not required; removal accepted | E8 feed retries/deadline cleanup | Keep single-request/configured-timeout behavior and preserved error causes | Canonical full23 run `15993682` accepted at source `41ceef4aa`, tree `38e0717840c42e2591abbf3fc81d272845039709`; all 23 original producing artifacts were attempt 1, with protected rollup verified |
| Not required; removal accepted | E10 writer diagnostics | Keep direct string write/native copy; retain E9 and all functional/evidence gates | Exact source `71084a53d` and canonical full23 `15994233` accepted; both regeneration producers used attempt 2. Exact internal attribution is retired optional diagnostics; watcher events remain `unknown-writer` |
| Isolated removal candidate; native acceptance pending | E11 task/debug diagnostics | Remove only optional product observations and unused adapter; preserve functional task/debug behavior | Supported events/logs are not equivalent internal task/map/candidate attribution. Full-file functional regressions remain; clean exact-source and canonical gates are still required |
| Observation candidate; not removed | E12 design-time/spawn diagnostics | Justify any minimal original-identity hook separately | Preserve race-safe birth/ownership proof; do not claim a watcher can reconstruct an already-exited leader |
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
  Protected full23 run `15975701` natively proved mixed-attempt selection:
  Windows core-matrix attempt 2 and the other 22 suites' attempt 1 originals
  passed producing-artifact identity and the protected rollup. Preserve the
  earlier failed attempt. Shared producer artifacts remain fixed-name:
  force-all retries are not covered by the suite-only fix.
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

**Restoration accepted:** Both Designer versions now use the original
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
controls also pass locally. The complete local CLI build gate passed.
Commit `8491373293031bc7f6b3f974bf3a590cf6664eb4` then passed affected both-OS
Run After `15974936` and canonical full23 `15975701` at that identical SHA.
Downloaded originals passed source/run/producing-attempt, ordered-evidence
and terminal checks; the protected full23 rollup passed. Windows core-matrix
used attempt 2, with its failed original preserved. Earlier run `15974647` at
`67d308af0` excluded D8 and is not restoration evidence.

**Disposition:** Keep the restoration and original-label test adaptation.
An independent accessibility correction can be a separate product change;
the functional scenario does not require it.

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

**Accepted counterfactual:** Remove only the minimal
activation early return and its telemetry marker. Preserve the independent
initial-workspace skip condition, E5 catch-up, WIF, dependency setup and all
native interaction/evidence gates. Existing runner environment values remain
unchanged for this controlled ablation; the legacy minimal flag no longer
has a shipping consumer. It cannot certify or bypass normal activation.

The real activation-function controls require task listeners, the workspace
listener, Azure Resources APIs/resolver and URI registration with the legacy
flag unset, `0` and `1`. Separate controls preserve the initial-workspace skip
semantics for unset, `0` and `1`. The old early return failed four controls;
all 16 activation controls pass after removal. An existing Multi-root unit
fixture also needed the required worker file and path-bound probe records;
these are non-executed fixture bytes, not native dependency provenance.

Full activation can expose startup prompts, background work and managed-path
changes in formerly minimal phases. Do not blanket-allow dialogs, seed
persisted suppression, re-pin binaries after activation or weaken cold-root,
ownership and failure assertions. Require complete affected both-OS families
and canonical full23 at one identical final SHA. Optional/noncanonical
consumers require separate evidence; the canonical inventory cannot prove them.

Commit `82477dc0e56a010baa4d03318915cae313fc51f6` passed the complete local
CLI build gate, affected both-OS run `15979351` (12 lanes, attempt 1) and
canonical full23 `15979977` at the identical SHA. The affected selection
covered `unitTests`, `msnWeatherLifecycle`, `httpTimeoutLifecycle`,
`statelessVariablesLifecycle`, `runAfterPersistenceLifecycle` and
`workspaceMultiRoot`. Downloaded originals passed source/run/producing-attempt,
ordered-evidence and terminal acceptance; the protected full23 rollup passed.
Full23 Linux and Windows regeneration required attempt 2; preserve both failed
originals rather than interpreting the final green as a flake-free first pass.
Uncommitted feed and regeneration-readiness drafts were excluded.

**Disposition:** Keep E1 minimal-return removal; native acceptance is complete.

**Next isolated candidate: initial-workspace initialization.** Remove only the
shipping `LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE` condition. Already-open
folders now execute the existing `ensureWorkspace`, connection parameterization,
per-project `ensureProjectFiles` and `ensureVSCodeFiles` block regardless of
legacy flag values. Keep its original ordering, prompt and error policy, E5
catch-up, WIF, dependency setup and all lifecycle/evidence gates unchanged.
Runner flag assignments remain unchanged for this ablation: they no longer
have a shipping consumer and cannot supply partial activation.

Replace the old skip-policy controls with real activation-function controls
for unset, `0` and `1`, covering both project roots, parameterization, project
and VS Code setup order, continued registrations and no initialization when
folders are absent. The old source fails the flag-`1` positive control;
the other 18 controls pass. All 19 pass after removal, and changed-file Biome
passes. The complete `pnpm --dir apps/vs-code-designer run test:e2e-cli:build`
gate also passes, including extension/webview builds, strict CLI compilation
and the registered CLI unit chain. Local validation includes the existing dirty
worktree drafts; the committed-payload ADO build remains authoritative.
This isolates the bypass rather than relying on a green test that never opens
a workspace.

Require seven complete affected families on both OSes: `unitTests`,
`msnWeatherLifecycle`, `httpTimeoutLifecycle`, `statelessVariablesLifecycle`,
`runAfterPersistenceLifecycle`, `workspaceMultiRoot` and
`workspaceArtifactRegeneration`. Include regeneration because ordinary
initialization can interact with generated artifacts. Only after original
targeted artifacts pass acceptance, require canonical full23/protected rollup
at the identical immutable SHA. Optional/noncanonical consumers still need
their own evidence; canonical creation is not optional codeful-debug proof.
Do not credit this candidate with the earlier `82477dc0e` native results.
Commit `3e9d343a00eac073ce70896a706484f6e2ae37d7` passed affected
[run 15983333](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15983333):
all 14 producing-attempt originals passed source/run, ordered-evidence and
terminal acceptance. Linux regeneration required attempt 3; its failed first
two attempts remain preserved. The same `vscode-repeat` JSON parse failure
also occurred before this removal in run `15979977`, and the committed
regeneration launcher already set the workspace-skip flag to `0`. These facts
do not establish a causal removal regression or eliminate intermittency.
The regeneration/write-observation investigation is separate; its local
controlled reproduction is not historical native writer attribution.

Identical-SHA canonical
[run 15984836](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15984836)
is now accepted: all 23 current producing attempts passed original-artifact,
source/run, ordered-evidence, terminal and protected-rollup checks. Failed
regeneration attempts remain preserved; acceptance does not eliminate the
separately investigated intermittency. The user authorized E2 to proceed in
parallel rather than waiting on this gate. Keep the two candidates' evidence
separate; E1 acceptance does not prove E2's outcome.

### E2. E2E mode suppresses dependency update checks

**Source:** `src/app/state/dependencies.ts:13-24`. **Introduced:** `49acbcc31`.

**Audited change:** Normal persisted-state throttling was bypassed when strict
E2E dependency validation was set; update checks returned false.

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

#### E2 follow-up audit: scope and replacement proof, 2026-11-10

The pre-removal investigation compared the committed predicate at
`3e9d343a00eac073ce70896a706484f6e2ae37d7` with the original comparison base
`41d0e2c64c411c5c2f90f9d4409fb496b2f9bea6`. That audit made no shipping change.
The focused VS Code test-specialist consultation required authentic cold/warm
setup, exact executable admission and independent both-OS proof; a recent
timestamp or a green existing integration run cannot supply those guarantees.

**Established behavior and boundaries:**

- `state/dependencies.ts:21-29` returns before reading persisted state whenever
  `LA_E2E_STRICT_DEPENDENCY_VALIDATION=1`. Without that branch, absent/invalid
  state and an elapsed **24-hour** interval allow checks; recent state throttles
  them. The original implementation already has this normal throttle.
- The same flag separately requests fail-closed validation in
  `utils/strictDependencyValidation.ts:4-7` and
  `commands/binaries/validateAndInstallBinaries.ts:133,160-162`. Do not unset
  the entire flag to remove update suppression: preserve installed-bundle
  requirements and error propagation. The isolated candidate concerns only
  the early return in the update predicate.
- Scope includes managed Func and .NET update/reinstallation paths, Node's
  outdated-version warning and user-selected Update action, and the bundle
  fast path. It is not a universal prohibition on installation: missing,
  corrupt or unrunnable dependencies still enter their caller-specific repair
  paths. The .NET validator uses presence/version checks; do not describe it
  as having the same manifest-integrity check as Node and managed Func.
- `utils/bundleFeed.ts:1454-1483,1756-1769` also consumes and records this shared
  throttle. A successful background bundle-feed refresh can record the key
  independently of a successful complete Node/Func/.NET validation pass.
  Therefore the persisted timestamp is not an attestation of full setup.
  These references were read from committed source, not the dirty feed trial.
- `scripts/run-e2e-cli.js:1888-1947` reuses one isolated HTTP-family runtime
  root across bootstrap/create/run, but gives those phases fresh profile
  suffixes. Root isolation between suites does not carry VS Code globalState
  between their phases. A fresh-profile consumer can legitimately find due
  updates to already-admitted bytes. This establishes a fixture constraint,
  not an independently required shipping bypass or native mutation.
- Not every regular-Code phase runs managed validation. For example,
  `workspaceMultiRootLaunch.ts:115-136` deliberately uses the normal unmanaged
  branch with PATH resolution bound to the attested Func. Preserve that
  contract rather than blanket-enabling managed installation.

**Executed controls:** The five existing state/orchestrator/managed-validator
test files passed **45 tests** using:

```powershell
pnpm.cmd exec vitest run --workspace vitest.workspace.js --project vscode-designer --coverage.enabled=false apps/vs-code-designer/src/app/state/__test__/dependencies.test.ts apps/vs-code-designer/src/app/commands/binaries/__test__/validateAndInstallBinaries.test.ts apps/vs-code-designer/src/app/commands/funcCoreTools/__test__/validateFuncCoreToolsIsLatest.test.ts apps/vs-code-designer/src/app/commands/nodeJs/__test__/validateNodeJsIsLatest.test.ts apps/vs-code-designer/src/app/commands/dotnet/__test__/validateDotNetIsLatest.test.ts
```

These are mocked local controls, not authentic package installation or native
acceptance. The orchestrator's bundle collaborator is mocked; this pass does
not validate the excluded dirty feed changes.

A retained session control transpiles and executes the exact original/current
committed state modules with controlled environment and in-memory globalState:
**42 predicate observations pass**, plus record/read controls for each flag.
The only five return-value differences are strict-flag `1` with absent,
non-number, NaN, exactly-expired or older state: original checks are due,
current checks are suppressed without reading state. Recent-state behavior is
the same. This counterfactual establishes the branch effect, not real profile
persistence, completed installation, feed concurrency or native replacement.

**Pre-removal audit recommendations, not native acceptance:** After E1 canonical
acceptance, prove normal cold setup and warm persisted restart, interval-boundary
behavior, due-update behavior and throttled missing/corrupt/unrunnable handling.
Identify which consumers actually share mutable roots and bind admission to
the physical executable that runs. Do not copy unrelated profile/auth state,
seed a recent timestamp as a substitute for real setup, re-pin binaries after
activation, or relabel replacement bytes as the original admission. Preserve
real update prompts and caller-specific error policies. A fixture-only
replacement must demonstrate these contracts on affected complete Linux and
Windows families, followed by canonical full23 at the identical immutable SHA.
Those audit results did not themselves authorize removal or prove native
acceptance; the uncommitted feed and regeneration drafts remain excluded.

#### E2 user-directed removal experiment, 2026-11-10

The user explicitly requested removing suppression and observing the E2E
outcome. The candidate removes only the environment-gated early return and
its obsolete explanation. The normal persisted 24-hour throttle, strict
installed-bundle validation and failure propagation, runner flags, runtime
admission assertions and fixtures remain unchanged. No timestamp seeding,
dependency freezing or post-activation re-pinning is introduced.

The original October 29 commit `49acbcc31` explained suppression as preserving
pre-admitted dependency bytes across isolated profiles sharing a runtime root.
History establishes that motivation, not a controlled native failure proving
the suppression necessary.

The regression tests exercise the normal predicate under unset, `0` and `1`
flag values. Before the product edit, six strict-`1` due-state assertions
failed and the other 20 tests passed. After removal, the five-file command
above passed **61 tests**, including all 26 predicate/persistence cases and
the unchanged strict-validation/orchestration and managed-validator controls.
Biome passed for both changed TypeScript files. Native acceptance below is
bound to the committed candidate, not this dirty local worktree.
`pnpm.cmd --dir apps\vs-code-designer run test:e2e-cli:build` also passed,
including extension/webview builds, CLI compilation and the complete local
CLI regression gate. This local worktree still contains excluded feed and
regeneration drafts; that gate is not immutable-source native acceptance.

The focused VS Code test-specialist review selected six complete affected
families on both OSes: MSN Weather, HTTP timeout, stateless variables, Run After
persistence, workspace artifact regeneration and workspace multi-root.
The user authorized parallel execution. Affected
[run 15986177](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15986177)
passed all 12 producing-attempt artifact/source/run/ordered/terminal identity
checks at `c585d26394dbc6a7c20d07937fbbcc0fed5db663`. Identical-SHA canonical
[full23 run 15987081](https://devdiv.visualstudio.com/0bdbc590-a062-4c3f-b0f6-9383f67865ee/_build/results?buildId=15987081)
passed with diagnostic mode disabled and both canonical OS aliases. All 23
suite jobs passed on attempt 1. Downloaded originals passed artifact, source,
run, producing-attempt, ordered-evidence and terminal identity checks; the
protected full23 rollup also passed. E2 removal is accepted at this immutable
SHA without fixture changes or relaxed validation.

**User-directed loop change:** Queue canonical full23 directly for subsequent
candidates after the focused local controls; do not require a targeted ADO pass
first. Independent workstreams may proceed in parallel at explicit immutable
SHAs. The already-running full23 is retained, not duplicated. Preserve every
failed attempt and distinguish dependency update/setup failures, actual
execution failures and admission-identity assertion failures; do not adapt
fixtures to hide them.

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

**Historical source:** `src/app/utils/codeless/getAuthorizationToken.ts:34-36,68-87`.
**Introduced:** `c29cef8af50730d2b27ca2203d6a0a832fbf50e1`.
**Audit source:** documentation head
`88566197338ffa819f5c9a937c4275d422772056`, retaining the product implementation
accepted at `c585d26394dbc6a7c20d07937fbbcc0fed5db663`. The inherited
`apps/vs-code-designer/src` difference from that accepted code commit is
`src/test/ui/SKILL.md`, not product source.

The audit and observation-preparation chronology below retains its original
proof limits. The later [authorized removal candidate](#provider-backed-native-observation-and-authorized-removal-candidate)
supersedes the earlier retain-pending-decision disposition, not its evidence.

**Before/after:** When silent native session lookup is absent, a
`VSCODE_RUNNING_TESTS=1` branch can construct a session from E2E environment
tokens/identity values. `silentAuth` itself already existed at the comparison
base and is not new. The branch requires a nonempty
`LA_E2E_CLI_AZURE_ACCESS_TOKEN`; it does not mint, renew, validate the audience of,
or verify the tenant claimed by that token. A requested tenant overrides the
environment tenant when constructing the synthetic account.

**Historical rationale:** The introducing commit's
`apps/vs-code-designer/src/test/e2e/README.md` explicitly describes an MSAL account
being visible while the exact Logic Apps scope still has no cached VS Code
session. It describes injecting an Azure CLI ARM token for connector discovery
even while the title bar shows **Sign in**. The same commit's `plan.md` selects
WIF/provider-backed authentication for ADO and preserves silent/offline tests;
it lists live provider sign-in/subscription/token smoke coverage as future work.
E3 and E4 were introduced together, but that co-occurrence does not establish
that E4 is required by E3. This is contemporary rationale, not a recovered
native failure trace or an independent customer-authentication requirement.

**Current reachability:** `getAuthData()` first selects E3's provider-backed
session when WIF is configured and `ext.subscriptionProvider` is present.
Only after that returns no session does it query native Microsoft
authentication. E4 runs only if the latter lookup is silent and returns no
session. Rejected provider sign-in, token acquisition, subscription enumeration
or native-session lookup do not fall through to E4. Thus it cannot repair an
invalid WIF setup or a failed provider request. Empty subscription results or a
requested tenant absent from those results can reach E4.

**Supported replacement, checked against the installed package:** The locked
`@microsoft/vscode-azext-azureauth@5.1.1` ships
`dist/cjs/src/AzureDevOpsSubscriptionProvider.js`. Its real implementation uses
`ClientAssertionCredential` from the resolved `@azure/identity@4.5.0`, not the
batch harness's separate `AzurePipelinesCredential`:

- `signIn()` checks ADO job context and constructs the credential; it does not
  itself prove a successful token exchange.
- Required job variables are `AGENT_BUILDDIRECTORY`, `SYSTEM_ACCESSTOKEN`,
  `SYSTEM_TEAMFOUNDATIONCOLLECTIONURI`, `SYSTEM_TEAMPROJECTID`, `SYSTEM_PLANID`
  and `SYSTEM_JOBID`, in addition to the configured connection/tenant/client
  identifiers. OIDC is obtained from the current plan/job endpoint.
- `getSubscriptions()` ignores its SDK filter argument. The product helper's
  explicit matching of `subscription.tenantId` is therefore material.
- Subscription enumeration requests an ARM token for
  `https://management.azure.com/.default`. The resulting subscription's real
  `authentication.getSession()` returns that token without a Microsoft profile
  cache or an environment-token session bridge. This is the supported path
  already integrated by E3; a second authentication provider is not needed.
- The session captures the token obtained during enumeration. Reusing the same
  subscription/session is not a refresh mechanism. A new product `getAuthData()`
  call enumerates again and requests a token through the credential. Preserve
  the existing Designer V1/V2 periodic token-refresh calls.

The examined provider file's SHA-256 is
`5372a0fbdde748caf49e6dc69c7faed898f635a0bf5bfb62b48d1e9f7864cf85`.
These observations concern that installed implementation, not newer upstream
examples or an inferred minimum SDK version.

**Session-identity blocker:** In this SDK the returned session's `id` and
`account.id` are the tenant ID, and its default `scopes` is empty.
`azureConnectorDetails.ts:87-94` instead splits `account.id` on `.` as
`clientId.tenantId`, overwriting the valid settings/wizard tenant. A local
control invoking the unmodified connector-details function with the real
SDK-produced session returns `clientId = <tenant>` and `tenantId = undefined`.
The result is the same with E4 present and with only its fallback expression
removed in memory: E3 already wins on this path. This is not a regression
caused by removing E4, nor proof that retaining E4 fixes it. It prevents claiming
full consumer-compatible session replacement based only on token availability
or the existing mocked provider test. No native customer-visible failure or
authorized identity correction has been established by this audit.

**Fresh-profile and environment boundary:** The harness creates isolated
profiles and sets `azureLogicAppsStandard.silentAuth = true`; it does not thereby
create a cached Microsoft session. The current Linux/Windows Azure task in
`.config/templates/vscode-e2e-cli-run-suite.yml:433-536,588-680` supplies WIF
connection metadata and maps `SYSTEM_ACCESSTOKEN`. Suite scoping in
`scripts/e2e-cli-batch.js:138-162,345-375` retains the ordinary ADO job context and
reintroduces approved connection/job credentials only for Azure suites.
Although `.vscode-test.mjs`'s explicit forwarded list does not list every WIF
variable, installed `@vscode/test-cli@0.0.10` passes the profile environment to
`@vscode/test-electron@2.5.2`; the latter merges it over `process.env` in
`out/runTest.js:72-74`. Source inspection therefore does not show WIF metadata
being dropped merely because it is absent from that explicit list. This is a
source-level propagation check, not an observed native startup receipt.

**Focused non-GUI controls:** The existing token/provider suites passed
**19/19** with this repository-root command:

```powershell
node node_modules\vitest\vitest.mjs run --root apps\vs-code-designer --config vitest.config.ts --coverage.enabled=false src\app\utils\codeless\__test__\getAuthorizationToken.test.ts src\app\utils\services\__test__\VSCodeAzureSubscriptionProvider.test.ts
```

Those tests mock the SDK session/provider boundary. A separate session-artifact
control, `e4-session-contract-control.cjs`, exercises the actual installed SDK
provider/credential constructor, product factory, token helper and
connector-details caller. It substitutes synthetic external token/list
responses, settings and VS Code host APIs; it does **not** substitute the
provider's `authentication.getSession()`. HTTP/HTTPS/fetch are disabled, the
process uses only a synthetic authentication environment, and no credentials
or live auth payloads are recorded. Its in-memory counterfactual changes only
`return session ?? getE2eCliAuthSession(tenantId)` to `return session`.
All **nine** control groups passed:

| Boundary exercised | Observed result |
| --- | --- |
| WIF selected; native cache absent; raw token present | Real SDK session wins; E4 is not called; removing the fallback expression preserves the result |
| WIF selected; raw token absent; provider signed out | Product helper re-signs into the provider and obtains its session |
| Connector identity consumer | Real SDK session produces the identity mismatch above, both before and after the counterfactual |
| Token acquisition or ARM enumeration rejects | Error propagates; E4 does not hide it |
| New helper call after the synthetic token response changes | New session uses the changed token; previously returned session remains a snapshot |
| Empty subscriptions or wrong requested tenant | E4 can synthesize a session; counterfactual returns no session when the native cache is empty |
| Raw-token-only local profile versus cached native session | Raw-token-only path depends on E4; a returned native session is preserved without it |
| Missing ADO job context or incomplete connection metadata | Configuration/sign-in fails before E4 can provide a substitute |
| Non-test silent path or interactive path | Neither uses E4 |

These are local contract controls, **not** live OIDC/Entra exchange, real
RBAC/subscription enumeration, native extension startup, end-user E2E
reproduction or E4-disabled native acceptance. Existing full23 acceptance at
`c585d2639` includes E4 and cannot supply that missing proof. Domain, testing and
senior-review workflows were applied directly for this audit.

**Audit-only proposed scope, before authorization:**

1. Retain all E3 factory/activation/session integration and installed
   SDK/dependency/type/API adaptations. Establish an approved disposition for
   the real SDK/connector identity mismatch; do not silently fabricate account
   identity or bundle an unproved product-authentication fix.
2. Retain E4 until the intended local-mode contract is explicit. A raw-token-only
   local profile would lose its bridge. Supported Microsoft-session warm-up
   exists in `src/test/e2e/azureAuthWarmup.test.ts`, but it is interactive auth,
   not a substitute for the selected ADO WIF model.
3. If removal is approved, delete only the synthetic-session helper and its
   silent-path fallback expression, adapt their directly dependent tests and
   local authoring guidance, and add real-SDK boundary coverage. Preserve
   `silentAuth`, native silent/interactive options, tenant selection, provider
   errors and periodic refresh behavior.
4. Do not blanket-delete raw-token minting or environment forwarding.
   `approvedAzureFixture.ts`, `azureConnectorFixture.ts` and suite credential
   preparation independently use the raw token for fixture/API work. Also,
   `LA_E2E_CLI_DISABLE_AZURE_CLI_TOKEN_FALLBACK=1` only disables local wrapper
   minting; it does not disable E4 when a token is already present
   (`scripts/run-e2e-cli.js:2752-2787`). It is not an E4-removal control.
5. After an authorized candidate, run focused controls and the complete local
   CLI gate, then submit that identical SHA to the coordinator for canonical
   full23 non-diagnostic validation. A targeted native selection is optional,
   not a substitute. Retain bounded same-run failed-job attempts and all
   original artifacts; do not queue a fresh run to reset attempts.

**Audit-only disposition:** **Retain pending the session-identity/local-mode decision and
authorized native proof; not justified as an independent product requirement.**
The supported WIF token replacement is already present and locally exercised,
but full session-consumer compatibility and native removal acceptance remain
unproved. No product authentication files were edited, no native/GUI or Azure
mutation run was started, and no shared integration ref was moved by this audit.

#### Bounded native identity-observation preparation

The audit-only evidence is preserved in
`b5b7ff24bd8f16b9ccbc8fbba2c1aca4d11723db`. The subsequent reproduction candidate
retains E4, E3, local raw-token authoring, SDK/dependency adaptations and all
production authentication source. It is instrumentation, **not a fix, removal,
native result or acceptance claim**.

The existing `msnWeatherLifecycle` flow is the observable: normal Open Designer,
Azure connector metadata, managed MSN Weather action/connection selection,
save, debug, overview execution, successful run and verified weather response.
`openDesigner.ts` selects the local Designer V1 or V2 panel; both call
`getAzureConnectorDetailsForLocalProject`, which calls `getAuthData` and then
splits `account.id`. Ordinary local connection creation does not necessarily
consume the resulting client identity: the connection ACL helper returns early
without `workflowAppDetails`. A contract mismatch can therefore coexist with
every end-user assertion passing. That outcome is **not a customer-defect
reproduction**.

`nativeConnectorIdentityObservation.ts` observes the already-loaded extension
bundle through an in-process Inspector session. It does not open a debugging
listener, call product authentication itself, replace functions, evaluate the
bundle, invalidate caches or change UI choices. Three always-false conditional
probes observe the provider-returned session reference, the real connector
caller's input and its uncached return. The loaded source must byte-match the
resolved extension entry; each probe must resolve at its exact unique compiled
source location. Missing, ambiguous, paused or contradictory evidence fails
explicitly. A session returned through another path is recorded as
`providerSessionCorrelated: false`, never attributed to WIF.

Observation is enabled only with existing WIF connection/tenant/client
metadata and requires the existing approved fixture target. Raw-token-only
local authoring does not acquire a WIF prerequisite. The observer starts before
the current warmup and is removed before debug/runtime, with failure cleanup
preserving the original authoring error and normal shutdown. It adds no
resource provisioning, permission expansion, credential creation or forced
connection branch. Native admission must use the existing approved fixture;
if exercising the flow requires new live resources or credentials, stop.

Supplemental stdout receipts have fixed prefixes
`[workspace-lifecycle][msn-weather][connector-identity-after-warmup]` and
`[workspace-lifecycle][msn-weather][connector-identity-after-authoring]`.
On authoring failure, the last available observation uses
`connector-identity-at-authoring-failure`. These are **not new screenshots,
ordered checkpoints or acceptance gates**. Existing invocation/source-bound
native logs retain them. Five-minute product caching may reuse the warmup
result; the later receipt does not claim another uncached authentication call.

For the installed SDK's tenant-only session, the expected hypothesis is:

| Boolean | Expected if that real provider/caller boundary is reached |
| --- | --- |
| `providerSessionCorrelated`, `inputTenantMatchesFixture` | `true` |
| `sessionAccountIsTenantOnly`, `returnedClientIsFixtureTenant` | `true` |
| `sessionAccountHasCompositeShape` | `false` |
| `returnedTenantPresent`, `returnedTenantMatchesFixture` | `false` |
| `observed`, `connectorsEnabled`, `consistent`, `nonPausing` | `true` |

These are observations, not assertions that require the suspected mismatch.
A different consistent shape is recorded without changing the product.
Missing WIF metadata means there is no WIF receipt/proof. A cached return
before installation, pre-existing debugger, changed bundle or missing probe
is an instrumentation limitation, not an end-user defect.

**Instrumentation privacy boundary:** the session is retained only as a weak
object reference for provenance; comparisons occur in process. Receipts contain
only the eleven fixed booleans above. No token, account/tenant/client value,
identity hash, project path or private authentication payload is serialized.
Only own data properties are inspected; accessors and proxies are rejected
without invoking their code. Inspector error payloads are not published.
Offline controls use synthetic canaries and verify unchanged function results,
no extra product calls or accessor/proxy reads,
non-pausing execution, provenance/non-provenance, rejected source mismatch and
stale receipts after a condition fails, exact real-bundle probe binding without
evaluation, raw-token compatibility and
cleanup/error preservation through the actual MSN orchestration. Existing
required screenshots and other baseline artifacts are unchanged; these controls
do not establish that all pre-existing artifacts are identity-free.

Preparation validation on Windows (repository-root commands, not native proof):

| Command | Result |
| --- | --- |
| `pnpm --dir apps\vs-code-designer run test:e2e-cli:compile` | Passed strict compilation. |
| `node apps\vs-code-designer\out\test\e2e\nativeConnectorIdentityObservation.unit.js` | Passed synthetic execution/privacy, accessor/proxy and stale-receipt rejection, exact real-bundle binding without execution, and nine actual-orchestration scenarios. |
| `node node_modules\vitest\vitest.mjs run --root apps\vs-code-designer --config vitest.config.ts --coverage.enabled=false src\app\utils\codeless\__test__\getAuthorizationToken.test.ts src\app\utils\services\__test__\VSCodeAzureSubscriptionProvider.test.ts` | Passed 19/19 existing E4/WIF tests. |
| `pnpm --dir apps\vs-code-designer run test:e2e-cli:build` | Passed the complete extension/React build, strict compilation and CLI control chain, including the new observer and existing lifecycle diagnostics controls. |

Two earlier complete-gate attempts exposed mandatory first/second command-order
contracts. Registration was moved after `azureConnectorFixture.unit.js`; the
contracts and original command order were preserved, not weakened. Existing
platform-conditional skips remain unchanged. The optional pipeline shell-identity
probes were not enabled by this default gate.

Native proof still requires coordinator admission and identical-SHA canonical full23
non-diagnostic validation; targeted native diagnosis is optional. No local
shared-desktop GUI launch, ADO queue/ref movement or retry-budget reset is
authorized by this preparation.

#### Provider-backed native observation and authorized removal candidate

Original run `15989189`, source
`a6ecd02e62ec180151600a19b7d2e388b8168cc4`, produced successful attempt-1 MSN
flows on both OSes with E4 still present. Linux stdout log `831`, lines
1426/1870, and Windows stdout log `1265`, lines 1359/1880, record warmup and
authoring receipts matching the boolean hypothesis above: observed,
provider-correlated, requested-tenant matching, tenant-only account, returned
client equal to fixture tenant, connectors enabled, consistent and non-pausing
are true; composite account and returned-tenant presence/match are false.
The original ordered validators report `valid=true`, `errors=[]` and all 36
checkpoints. The later receipt may reuse warmup cache. These observations prove
the actual provider-backed boundary in a successful end-user flow, not an
identity defect or removal acceptance. The original monitor subsequently ended
with exit 1 after three failed executions, exhausting its bounded attempt
budget. The Windows unit OS-contract still failed on actual attempt 3, log
`1695`. Windows regeneration succeeded on attempt 3, so the other 22 consumer
lanes ultimately succeeded, but the protected full23 result **failed**. The
original both-OS MSN receipts remain valid; no requeue or retry reset was
performed.

The user subsequently authorized removal of E4, intentionally retiring
raw-token-only synthetic sessions while preserving normal customer auth.
The removal candidate deletes only `getE2eCliAuthSession` and the silent-path
fallback expression. E3 provider/session integration, SDK/dependencies, native
silent/interactive options, tenant selection, error propagation, periodic
refresh calls and independent fixture/API token minting/forwarding remain.
The known tenant-only account parsing is characterized without a speculative
identity or product-auth fix. No new credentials, permissions or resources are
required by this change.

Before removal, the local complete tree was proved equal to parent baseline
`b3226e3f2fbe1f1dfb8a3beacd89ec6eb85559b0`, tree
`6fa9a1823257085448ac2867182ad6fce4b26337`, retaining trusted clicks, Windows
hash reuse and the observer. The separate observer compatibility commit
`da954ddba825a5eb8a5e911bad5c07a42f38986e` fixes a deterministically reproduced
Windows source-URL spelling mismatch: pinned Node `22.23.4` reports literal
`~` through Inspector where `pathToFileURL` reports `%7E`. Literal-tilde and
actual DOS 8.3 temporary paths reproduce the failure. Normalizing only these
URL-equivalent spellings retains exact full-path, unique loaded-script,
byte-equal disk/source and exact probe binding. Regressions cover tilde and
percent-encoded-looking names and reject duplicate equivalent loaded scripts.
The original ADO logs do not establish its actual temporary-path spelling, so
this reproduction does not attribute that machine's path state. The clean
compatibility commit passed the complete CLI gate using the checksum-verified
official Node `22.23.4` Windows distribution.

Removal regression coverage includes no cached session despite an explicit
raw token/test flag, unchanged native session references/options, native errors,
provider precedence and subsequent acquisition. The durable offline control
`scripts/azure-auth-installed-sdk.contract.test.cjs` uses the actual installed
SDK, unmodified product provider/auth modules and real connector caller with
synthetic token/ARM responses. Network access is denied before SDK loading;
inherited auth environment values are not used. Its ten cases cover WIF with
and without raw tokens, sign-out/reacquisition/new tokens, current caller
shape, empty/wrong-tenant subscriptions and token/list/config/job-context
errors. This is construction/contract proof, not live OIDC exchange, RBAC or
native acceptance. Registration appends to the existing CLI unit chain without
changing the mandatory first/second commands or any prior command order.

Local authoring now requires a cached Microsoft session for the requested
tenant/ARM scope or the approved WIF provider. Fixture/API tokens remain
independently necessary. The disable-fallback environment flag controls only
wrapper minting, not forwarding of explicit tokens; even historically it did
not disable E4 when an explicit token was present.

**Current disposition:** **E4 removal accepted.** The product removal is
committed as `dea31bfc634946f596cd0bb6212a2436fe2a1156`; the final
documentation-inclusive source is `84cf43160f68d8e7e9e21d5bf6e8316eaf1f44df`,
tree `518bbbcfe101bd632a83ad9252579b0454519a4a`. Its clean complete CLI gate
passed under official Windows Node `22.23.4`. Canonical non-diagnostic both-OS
full23 run `15991034` succeeded at that exact source. Acceptance verified all
23 original producing-attempt artifacts, their source/run/attempt/ordered and
terminal identities, and the protected rollup, preserving earlier failed
attempts. This establishes that the selected suite scenarios do not require
E4; it does not remove E3 WIF or independent fixture/API tokens. Original
assertions, checkpoints, evidence/source contracts, deadlines, lifecycle rules
and bounded same-run retries remain unchanged.

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

**Sources:** `src/app/utils/feed.ts`,
`src/app/utils/bundleFeed.ts`,
`src/app/utils/requestUtils.ts`.
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

**Authorized removal:** The user authorized removing E8 and running ADO to
determine whether these suite scenarios require it. The isolated candidate
removes the retry options/loop/classification, aggregate deadline, both caller
opt-ins, shared timeout override and synthetic timeout code. It restores one
request using the extension's configured timeout, preserves the ten-minute
cache and JSON parsing, and retains exact original errors as causes. No hidden
setup retries, dependency substitutions or weakened assertions accompany this
change. Regeneration-readiness drafts remain separate and uncommitted.

Focused validation passed 139 tests using
`pnpm --dir apps/vs-code-designer exec vitest run --config vitest.config.ts --coverage.enabled=false src/app/utils/__test__/feed.test.ts src/app/utils/__test__/bundleFeed.test.ts src/app/utils/__test__/requestUtils.test.ts`.
The controls cover formerly retryable transport/status/nested failures without
a second attempt, parse/body errors, cache expiration and failed refresh,
two-argument caller delegation, configured timeouts including 90 seconds
without a deadline clamp, and preserved causes.

**Native removal accepted:** Canonical non-diagnostic Linux/Windows full23
run `15993682` succeeded at exact source
`41ceef4aa09d9e431d07ff789ad50a44ae7bf271`, tree
`38e0717840c42e2591abbf3fc81d272845039709`. The verifier accepted all 23 current
producing attempts and their original artifacts, source/run bindings, ordered
evidence, terminal identities and protected rollup. Every producing artifact
was attempt 1. This establishes that these suite scenarios do not require E8,
not equivalent resilience under simulated upstream transient outages.
Historical local trial results and the earlier accepted E4 baseline
`84cf43160`/run `15991034` are not this E8 removal proof.

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

**Isolated removal accepted:** Removed only the two product imports/wrappers
and restored direct
`fse.writeFile(gitignorePath, gitignoreContents)` and
`fse.copyFile(templatePath, gitignorePath)`. Preserved E9's unchanged-content
early return, original copy/string-write semantics and original failures.
Standalone diagnostic adapters and their controls remain, explicitly without
claiming product use. No replacement attribution hook is introduced.

Committed-source review at `41ceef4aa` establishes that writer receipts are
optional diagnostics: `runFreshRegenerationHost` writes `writer-events.jsonl`
and requests the product receipts, but the regeneration result, evidence
validator and finalizer do not require or read them. The existing evidence
validator unit model supplies no writer receipts. Required Code/profile logs,
exact non-target content/directory assertions, real prompt inputs, ordered
checkpoints, native lifecycle, cleanup and terminal gates remain unchanged.
The existing watcher remains explicitly `unknown-writer`; it is not equivalent
proof of an internal writer.

Loss of exact internal attribution on future runs is intentional retirement of
optional product diagnostics, not behavior-neutral observation replacement.
Historical receipts still establish the transient truncation described in E9;
their causal evidence is not retracted. E8 run `15993682` accepted only its exact
source. E10's separate exact-source validation and native acceptance are
recorded below; unrelated regeneration drafts remained excluded.

**Earlier focused local validation:** The filtered `removeFromGitIgnore` and
`createLocalConfigurationFiles` Vitest run passed 30 tests (64 unrelated tests
were filtered out). The complete `e2e-cli-diagnostics.unit.test.js` controls
passed 100 tests, including the updated direct-product-wiring control and
unchanged standalone adapters. Strict CLI TypeScript compilation, Biome checks
on all five changed code/test files and scoped whitespace checks passed.
That earlier compilation used this working workspace, containing the excluded
uncommitted regeneration drafts; it was not the parent's clean exact-source
full CLI gate and did not itself establish native acceptance.

**Subsequent clean-source validation and native acceptance:** The parent
verified exact source `71084a53d8d6857b41346cb9f8ed5b2665ddc604`, tree
`bceb22a297b45833268b4a9e7a597cc233746d1a`, with official Node 22.23.4.
The complete `test:e2e-cli:build` gate exited 0 with a clean checkout before
and after. Both complete affected Vitest files passed **94/94**, without a
test-name filter. These are separate later results, not a reinterpretation of
the earlier filtered run or working-workspace compilation.

Canonical both-OS full23 run `15994233` at that same exact source passed with
all 23 original producing-attempt artifacts and the protected rollup accepted.
Linux regeneration's original attempt 1 failed at `vscode-multiple`; Windows
regeneration's original attempt 1 failed at `vscode-single`. The required
initialization prompt and real Yes input were absent before the original
deadline, and pre-cleanup evidence then failed closed. Both native containment
receipts were clean with no recovery; product proof was unverified on those
failed attempts. Neither terminal receipt reported a transient `.gitignore`
mutation. Both regeneration lanes passed unchanged-source attempt 2; all other
21 original producers passed on attempt 1. The failed originals remain retained.
These observations neither establish first-attempt stability nor attribute
the prompt failures to E10, and no additional E10 product fix was introduced.

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

**Authorized isolated removal implemented; native acceptance pending:** Remove
the two product imports/callers and delete the now-unused
`funcTaskDiagnostics.ts` adapter. Remove only observations, diagnostic state
and counts, and diagnostic-only catch/rethrow wrappers. No replacement product
hook is introduced. Exact internal task/map/candidate attribution is intentionally
retired optional diagnostics; supported task/debug events, logs and original
exports do not supply equivalent internal attribution. The script's retained
producer/relay controls are explicitly standalone, not proof of product wiring.
Canonical families do not require `func-events` or `func-startup` receipts;
the relay remains optional.

Preserve scope/task classification and exact-key event map behavior, deletion
iteration, port reset, task execution sequencing, the minimum 600-second map
readiness deadline, 500-ms polling, HTTP/HTTPS order, exponential request-timeout
doubling, settings, original errors, listener disposal, sequential candidate
discovery/cache/selection, and lifecycle behavior. Combined receipt tests retain
their functional assertions; only adapter-specific privacy/admission assertions
are retired. E12 original birth/ownership proof and E13 shutdown are untouched.

**Focused working-workspace validation:** Both complete affected Vitest files,
without a test-name filter, passed **47/47**: 36 in `pickFuncProcess.test.ts` and
11 in `funcHostTask.test.ts`. Coverage includes pending execution, pending map
wait, the 600-second timeout, dependency-task error/disposal, exact execute-error
identity, eight timeout failures followed by request nine at 128000 ms, unchanged
candidate/cache/platform selection, shell classification and exact-key event map
mutation. Additional checks preserve HTTP/HTTPS options and non-timeout handling,
the original host-timeout error, and listener disposal. The complete diagnostics
controls passed **100/100**, strict CLI TypeScript compilation exited 0, and
Biome passed all five changed code/test files. This compilation used the working
workspace with the excluded regeneration drafts; it is not the parent's clean
exact-source full CLI gate. No E11 native launch or acceptance is claimed.

Before E11 acceptance, the parent must run the complete clean exact-source
`test:e2e-cli:build` gate and same-source canonical both-OS full23, inspecting
original producing-attempt artifacts, ordered evidence, lifecycle/terminal
acceptance and the protected rollup. No family gate or fixture is weakened.

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
