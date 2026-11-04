# Mapper v3 Browser Tests

These Playwright tests interact with the real built mapper webview in Chromium.
The VS Code host is mocked: a passing browser test does not prove that native
dialogs, disk persistence, deployment, the compiler worker, or live Assistant
generation work inside VS Code.

## Run

Run from the repository root after installing workspace dependencies and the
Playwright Chromium browser:

```powershell
pnpm --dir libs/data-mapper-v3 run test:e2e --workers=2
pnpm --dir libs/data-mapper-v3 run test:e2e --headed --workers=1
pnpm --dir libs/data-mapper-v3 run test:e2e:coverage --workers=2
```

Normal runs rebuild a missing or stale webview bundle. Coverage runs always
rebuild the development bundle and source map together. No development server
is needed; the fixture serves the bundle through intercepted browser requests.

## Unit And Component Tests

The focused suite runs separately from browser coverage:

```powershell
pnpm --dir libs/data-mapper-v3 exec vitest run --config vitest.config.ts test/mapEditorProtocol.test.ts test/canvasViewport.test.ts test/webviewBootstrap.test.ts test/webviewLifecycle.test.ts test/webviewFunctoidFallbacks.test.ts
```

- [Protocol tests](../test/mapEditorProtocol.test.ts) validate host commands and replies directly.
- [Layout tests](../test/canvasViewport.test.ts) cover complete, finite, snapped, non-overlapping results, anchor propagation/averaging, missing connectors, tied positions, and viewport overflow.
- [Bootstrap tests](../test/webviewBootstrap.test.ts) cover API/root failures, missing containers, readiness and message forwarding. They also establish that later React failures are outside the synchronous startup catch.
- [Lifecycle tests](../test/webviewLifecycle.test.ts) cover canvas disconnect/reconnect, React unmount, controller disposal, callback-identity listener removal, observers, timers and pending animation frames.
- [Fallback tests](../test/webviewFunctoidFallbacks.test.ts) cover unknown/custom names and categories, rendered SVG fallbacks, supported icon props and all three themes.

Component tests use JSDOM and explicit API/component doubles. They do not prove
native VS Code integration. Keep their Istanbul reports separate from browser
V8 reports; neither is an aggregate percentage for the entire extension.

## Native Extension Host

The [native runner](../test/native/run.cjs) launches an isolated Extension
Development Host using an existing VS Code executable and the workspace's
installed test-electron dependency. It does not download a runtime or use the
running editor's profile. Build current bundles before running:

```powershell
pnpm --dir libs/data-mapper-v3 run bundle:dev
pnpm --dir libs/data-mapper-v3 run test:native
```

The default executable is the Windows user installation. Set
`MAPPER_NATIVE_VSCODE` to an existing compatible executable for another location.
The [native suite](../test/native/suite.cjs) is intended to verify activation,
custom-editor opening, real webview-to-host edits, document version/dirty state,
physical save and reopen in a temporary workspace. Autosave is disabled; no
Azure, file picker, compiler worker or live Assistant operation is required.

An updater lock or failed native launch is not a passing integration test.
Cleanup targets the owned launcher tree, is bounded, and refuses further
process targeting if launcher ownership is lost. Incomplete cleanup fails the
run and retains the isolated artifacts instead of claiming successful teardown.
Native execution does not automatically contribute to browser coverage.

### Native Test Map Corpus

The [learning-path native suite](../test/native/learningPath.cjs) opens every
one of the 151 sample maps in the real custom editor and clicks **Test Map**.
It uses the production instance generator, compiler worker and .NET transform,
not mock host replies. Build current extension, worker and webview artifacts
before running:

```powershell
pnpm --dir libs\data-mapper-v3 run vscode:prepublish
$env:MAPPER_NATIVE_VSCODE = 'C:\Program Files\Microsoft VS Code\Code.exe'
$env:MAPPER_NATIVE_SUITE = 'learning-path'
pnpm --dir libs\data-mapper-v3 run test:native
```

Set `MAPPER_NATIVE_MAP_FILTER` to a relative-path substring for a focused run;
leave it unset to attempt all 151 maps. The suite copies the fixtures into its
isolated workspace and retains timestamped reports under
`libs\data-mapper-v3\test-results\native-learning-path-*`. Each attempted map
has a `result.json` entry plus its generated input and native result text;
successful compilations retain `compiled.xslt` even when transformation fails.
completed transforms also retain `output.xml`, `output.html` or `output.txt`
according to the map's declared output method. Harness failures include a
screenshot when the editor remains available. Temporary VS Code profiles and
the copied workspace are cleaned up independently of these reports.

The suite deliberately fails if any map cannot complete Test Map, including
empty/invalid teaching maps and unavailable external dependencies. It does
not whitelist known failures as passes. Success requires a real saved output
and well-formed XML for maps declaring XML output; it does not establish
target-XSD validity, expected business values, or parity with BizTalk. Use the focused browser transform
cases for their additional value and cardinality assertions.

## Scenario Matrix

| Area | Browser assertions | Tests |
| --- | --- | --- |
| Startup and protocol | Ready handshake, missing schemas, picker replies, invalid host messages ignored, subsequent valid replies still handled | [shell.spec.ts](shell.spec.ts) |
| XSD structures | Source and target primitives, attributes, repeating elements, inheritance, choices, lists, unions, enums, simple content, node properties, root selection and tree expansion | [schemaLoading.spec.ts](schemaLoading.spec.ts) |
| Schema errors | Specific missing-file, invalid-XSD, missing-root, inline-schema and import errors on both sides; recovery, cancelled browse and independent side errors | [schemaErrors.spec.ts](schemaErrors.spec.ts) |
| Existing BTM maps | File references, .NET names, selected roots, inline and aggregate schemas, transitive/diamond/circular imports, includes, editing and serializer/reload checks | [existingMaps.spec.ts](existingMaps.spec.ts) |
| Links and canvas | Click and real pointer links, reverse inputs, chains, duplicates, cancellation, selection, deletion, palette drop, move, snapping and pan | [linking.spec.ts](linking.spec.ts), [pointerInteractions.spec.ts](pointerInteractions.spec.ts) |
| Functoids | Full production catalogue across all nine categories, SVG icons, insertion identity, palette filtering, groups, input limits, constants, linked input ordering, labels, comments, save/reopen and cancel | [functoids.spec.ts](functoids.spec.ts), [uiInteractions.spec.ts](uiInteractions.spec.ts) |
| Scripting | Five inline script types, assembly references, external assembly metadata, browse replies, save/reopen and cancelled drafts | [scripting.spec.ts](scripting.spec.ts) |
| Pages and commands | Add, switch, rename, delete, last-page protection, zoom limits/reset, fit including branching/cyclic/isolated graph nodes, auto-link deduplication, context commands, copy/cut/paste and deploy payload | [pages.spec.ts](pages.spec.ts), [uiInteractions.spec.ts](uiInteractions.spec.ts) |
| Themes and dismissal | Light/dark/high-contrast Fluent tokens and toolbar interaction; Escape and reopen for properties on both schema sides | [uiInteractions.spec.ts](uiInteractions.spec.ts) |
| Validation and Test Map | Specific validation errors/warnings, blocked compilation, warning-only compilation, compiler errors, instance generation failure/retry, manual XML, output errors and panel state | [compileAndTest.spec.ts](compileAndTest.spec.ts), [uiInteractions.spec.ts](uiInteractions.spec.ts) |
| Assistant | Empty prompts, button/keyboard submit, active page and trimmed payload, busy protection, context files, success/error replies, retry, unapplied proposals and applied map rendering | [copilot.spec.ts](copilot.spec.ts) |

Sample maps and schemas live under [samples](samples), grouped into
`LoopingFunctoids`, `PerformanceLargeMap`, `SchemaReferences`, and `LearningPath`.
These test fixtures are excluded from the packaged extension.

## BizTalk Learning Path Maps

The `LearningPath` fixtures are copied from the `Working-with-Maps` directory of
Sandro Pereira's **BizTalk-Server-Learning-Path** samples. Their MIT copyright and
permission notice is retained in `samples/LearningPath/LICENSE`. Original BTM
and XSD bytes, directory names, schema references, scripts, and intentionally
incorrect teaching examples are preserved. No BizTalk installation, assemblies,
signing keys, or machine-local source checkout is required to load the fixtures.

Run the sample-backed cases from the repository root:

```powershell
pnpm --dir libs\data-mapper-v3 run test:e2e --grep @learning-path --workers=2
```

`learningPathMaps.spec.ts` inventories all 151 maps (239 declared pages, 1,612
links, 635 functoids), checks imported link endpoints and functoid identities
against the raw source XML, visits map pages in the browser, and edits and
reopens the maps. The empty teaching map is checked as an empty editor rather
than supplied with invented schemas or mappings.

`learningPathTransforms.spec.ts` drives Compile and Test Map through the real
webview, uses the TypeScript compiler and packaged .NET Framework transform
helper instead of canned replies, and checks XML values, cardinality,
conditional omission, target ordering, defaults, attributes, and sorting.
Windows and .NET Framework are required. If the transform helper is missing,
the suite builds its existing project using the .NET SDK; it does not install
BizTalk. Compiled XSLT and actual output XML are attached to the test results.
These cases do not exercise VS Code's native host, worker RPC, XSD validation,
or establish BizTalk execution parity for the entire corpus. Database lookups,
custom functoids, external assemblies and historical absolute XSLT paths remain
import/preservation scenarios, not expected-success transforms.

Two orchestration-variable teaching maps (`OrderToSAPOrderAccessOrcVarFunctoids`
and `OrderToSAPOrderAccOrcVarHC`) select the `/Order` source schema but retain
seven stale `/Root/InputMessagePart_0/Order/...` source paths. Their tests
explicitly verify that mismatch, the two renderable functoid output links,
and preservation of all nine original links rather than inventing an aggregate
schema or calling the stale endpoints a mapper rendering regression.

The learning-path suite has 161 cases: 158 successful scenarios and three
documented expected failures. Expected failures still execute the browser
flow and fail if the defect unexpectedly disappears; remove their annotation
when the corresponding product fix lands.

Schema tests use the real TypeScript parser/dependency resolver before sending
the resulting state through the mock host. Missing-file errors are constructed
with the production error type/formatter; native filesystem lookup is not
exercised. Sample-backed BTM/root tests explicitly skip non-Windows platforms
because the supplied references use Windows path conventions. XSD structures
are covered, not JSON or CSV schemas.

## Source Coverage

Coverage is opt-in using Chromium V8 execution data, mapped back to mapper
TypeScript with the webview source map. Workers merge their data into:

- `coverage/e2e/index.html`: interactive V8 report.
- `coverage/e2e/coverage-report.json`: V8 summary and source details.
- `coverage/e2e/coverage-details.md`: readable summary and per-file coverage.
- `test-results/results.json`: test results, expected status and failure evidence.

The denominator is mapper TypeScript **present in the browser bundle source
map**, including bundled shared modules, with third-party dependencies excluded.
It does not include unbundled helpers, Node-side parsing performed by tests,
the extension host, or .NET code. Use the V8 summary consistently; do not compare
its source-line totals with Istanbul statement-derived line totals.

The initial 75-case baseline measured 69.04% lines, 64.53% statements, 46.85%
branches and 57.22% functions. Rerun coverage after changes for current values;
generated reports are not a fixed coverage guarantee. Coverage includes code
executed by expected-failure tests and is not evidence that those defects work.

## What Blocks 100%?

There is no general barrier to adding more tests. However, the current browser
denominator includes code that ordinary UI interactions cannot execute. Literal
100% in every metric is not a browser-E2E-only target for this bundle:

| Uncovered responsibility | Appropriate next step |
| --- | --- |
| Unreferenced icon implementations | The unused Floor, Ceiling and XDivide1 implementations have been removed; retain referenced category fallbacks even when current UI scenarios do not execute them |
| `isWebviewToHostMessage`, used by the extension provider rather than the browser's mock host | Covered by protocol unit tests; browser clicks still do not invoke the host validator |
| Missing container or failed API acquisition during startup | Covered by isolated bootstrap fault-injection tests; asynchronous React failures are explicitly outside the startup catch |
| Custom-element unmounting, controller disposal, timers and callback guards | MapperApp, canvas and controller boundaries have controlled lifecycle tests; this does not cover every widget's lifecycle |
| Defensive layout fallbacks and impossible mount-ref states | Proven redundant layout/controller checks were removed; real graph cases have unit tests, while React readiness guards remain intact |
| Unknown/custom icon and name fallbacks | Covered directly and through rendered SVG component tests rather than changing the production catalogue |
| Native editor transport and persistence | A separate isolated native suite is available; a successful native run is required before claiming this behavior is verified |
| More valid interaction combinations, large graphs and pointer geometry | Additional browser scenarios with observable outcomes |

Known expected failures do not inherently block execution coverage: they still
execute product code. They do block claiming that the corresponding behavior is
correct, and an early failed assertion can prevent later interactions from
running. Keep execution percentages separate from functional pass results.

Keep reports from different test layers distinct unless their source maps and
coverage semantics are deliberately reconciled. Removing code, modifying
production guards, changing instrumentation, or excluding sources would change
the target; none is necessary merely to add more genuine tests.

## Known Failing Regressions

Expected-failure annotations document current product defects rather than
skipping the interactions. An unexpected pass fails the suite and requires
removing the annotation after confirming the fix. Playwright's overall passed
count includes expected failures, so inspect `expectedStatus` and assertion
evidence in the JSON report before calling them successful regression coverage.

- Two nonaggregate inline-schema BTM round trips lose their schema reference.
- The live status-bar link count does not refresh after link edits.
- Saved external assembly class selection is overwritten on reopening.
- A cancelled assembly browse leaks metadata into a later draft.
- Delete in a focused XML editor deletes the selected functoid and its links.
- Closing the Assistant sets `hidden` but leaves its controls visible.
- An applied Assistant map updates links but does not render the added functoid.
- Learning-path external-assembly BTM round trips append duplicate metadata
  parameters.
- Learning-path Looping functoid output compiles as a scalar value instead of
  repeated records with mapped attributes.
- Learning-path inline XSLT output gets an extra target-element wrapper.

These are eleven failing test cases across ten defect categories. Production
fixes are separate from this test expansion.

## Remaining Gaps

This is not exhaustive UI or integration coverage. Remaining priorities include:

- Actual VS Code schema/root/file dialogs, replacement confirmation, physical
  save/reopen and document undo/redo.
- XSD-valid transform output, DLL discovery, deployment and live Assistant
  operations. The native learning-path suite exercises worker RPC and Test Map;
  its success criteria do not include output-schema or golden-output parity.
- Delayed/out-of-order host replies, stale replies after cancellation, and
  disposal/reinitialization.
- Pointer linking under combined zoom/scroll and very large maps/schemas.
- Full visual regression across themes, responsive sizing, accessibility and other browsers.
- Untaken lifecycle branches across other custom elements and unbundled helper modules.

Use focused parser/compiler unit tests and native VS Code integration tests for
non-browser responsibilities rather than treating mock host replies as proof
of those layers.