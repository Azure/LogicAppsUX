# BizTalk Mapper and Logic App Data Mapper: compatibility gaps

**Updated:** September 27, 2026  
**Source snapshot:** `14c5bf984` in LogicAppsUX, before this documentation change  
**Scope:** the standalone BTM editor/compiler in `libs\data-mapper-v3`, compared
with the legacy BizTalk Mapper. This is not an assessment of every Logic Apps
mapping product or deployment environment.

The new mapper is **not yet a feature-complete replacement**. This report
consolidates all identified gaps from the September 27 audits, including the
subsequent fixes. It distinguishes observed incompatibilities from incomplete
workflows and unverified behavior; it is not an exhaustive parity certification.

Customer maps, schemas, payloads, raw logs, and machine-specific evidence paths
are deliberately excluded. The behavioral examples below are synthetic.

## Status and priority

| Label | Meaning |
|---|---|
| Gap | An incompatible result or missing capability was identified. |
| Partial | An implementation exists, but part of the legacy workflow is missing or its supported scope is narrower. |
| Unverified | Insufficient comparative evidence; do not interpret this as a confirmed missing feature. |
| Fixed / implemented | The stated case has an implementation or supporting evidence, not a guarantee for all combinations. |
| P0 | Incorrect results, incorrect schema resolution, or silent loss of persisted settings. |
| P1 | Missing migration, runtime, schema, or authoring compatibility. |
| P2 | Incomplete tooling or editing workflows. |

Priority is a suggested remediation order, not a security severity.

## Completed fixes and existing support

| Area | Current support | Boundary / evidence |
|---|---|---|
| Legacy structural endpoint paths | Schema-derived aliases resolve `<Sequence>`, `<Choice>`, `<All>`, `<Group:name>`, and `<AttrGroup:name>` while retaining original BTM paths. | Duplicate branches retain separate identities; ambiguous flattened paths are rejected rather than guessed. Parser/resolver, compiler, and serialization coverage exists. N1, N2, N3. |
| Wrapper capitalization | Both `<Schema>` and `<schema>` wrappers resolve and round-trip. | Actual element names remain case-sensitive. N1. |
| Element-local namespace declarations | Local prefix declarations and overrides work for covered imported types/references and descendants without leaking to siblings. | Does not close namespace scoping on other XSD constructs; see G04. N1. |
| String Find: absent nonempty substring | `StringFind("abc", "z")` now returns `0`; ordinary 1-based matching is retained. | Empty-search behavior still differs; see G01. N3, N4. |
| Functoids with no output links | Compiler configuration validation no longer blocks compilation solely because an unused functoid lacks configuration. A warning is emitted. | Connected Table Looping still requires valid grid metadata. Compiler decisions use actual page links rather than stale cached links. N3, L3. |
| Shared diagnostics | Host and compiler-worker logging includes stages, warnings, timing, failures, and a Show Logs command. | Does not implement XSD validation, full command execution, or Debug Map. N5. |
| X12 sample values | Generation recognizes named/prefixed `X12_DT`, `X12_TM`, `X12_Nn`, and `X12_R` types, with supported length restrictions and value precedence. | Present in the latest source and dedicated tests; this addition was not part of the earlier nine-suite audit run. Required-count and general validity limitations remain in G14. N6. |
| Negative Integer behavior | Synthetic `Integer(-1.7)` produces `-2`, matching inspected legacy behavior. | This is not a confirmed gap; earlier concerns about truncation versus flooring were corrected. N3, L1. |
| Mapping infrastructure | Multi-page compilation, ordered inputs/defaults, configured Table Looping/Extractor, inline scripting, external-assembly scripting, and custom XSLT have implementations. | Presence does not establish full execution, authoring, or deployment parity. See the open items below. N2, N3, N7. |

## Correctness and persistence gaps

| ID / priority / status | Area | Legacy behavior / requirement | Current result and impact | Closure criteria |
|---|---|---|---|---|
| G01 / P0 / Partial | String Find | Both inspected legacy implementations return `0` for an empty search string. | Fresh XSLT execution returns `1` for both `("abc", "")` and `("", "")`. Current tests explicitly expect `1`; passing those tests does not prove BizTalk compatibility. Ordinary nonempty misses are fixed. N3, N4, L1. | Correct compiler and registry behavior and test expectations; cover empty, missing, repeated, linked, and constant inputs. Verify culture-sensitive matching separately rather than assuming XPath and legacy .NET searches are equivalent. |
| G02 / P0 / Gap | Unicode case conversion | Legacy casing handles non-ASCII characters. | ASCII-only `translate` leaves U+00E9 unchanged for Uppercase, instead of producing U+00C9. Uppercase mismatch was reproduced; Lowercase uses the same ASCII-only approach. N3, L1. | Match legacy casing semantics with non-ASCII regression cases on each supported execution engine. |
| G03 / P0 / Gap | Round | Midpoint-to-even rounding; optional precision argument. | Reproduced `Round(2.5) -> 3` instead of `2`; `Round(1.234, 2)` is rejected because the definition accepts only one input. N3, N4, L1. | Support both arities and legacy numeric behavior, including positive/negative midpoints, precision, and invalid inputs. |
| G04 / P0 / Partial | XSD namespace scope | Namespace declarations on a containing `xs:complexType` apply to descendant QNames. | Element-local handling is fixed, but a synthetic `xs:complexType` prefix override still resolves the wrong type: mapper selects `LocalValue`; .NET XSD compilation selects `ImportedValue`. N1. | Propagate namespace scope through relevant XSD constructs and component references; verify overrides, inheritance, imports, and sibling isolation against an XSD processor. |
| G05 / P0 / Gap | Output-setting round-trip | Persist configured standalone, DOCTYPE, CDATA, indentation, and media-type properties. | Fresh deserialize/serialize probe drops six attributes: `standalone`, `doctype-public`, `doctype-system`, `cdata-section-elements`, `indent`, `media-type`. These properties are absent from the current options model/serialization path. N2, L2. | Preserve values through repeated saves and expose/honor supported settings during compilation; test exact persisted identities and effective output behavior. |
| G06 / P0 / Gap | Test Map XSD validation | Validate input/output instances against their respective schemas. | Inspected Test Map flow parses XML and performs transformation without equivalent input/output XSD validation. Successful transformation can still produce schema-invalid output. N5, L4. | Add schema-aware validation, dependency resolution, and actionable diagnostics for invalid input and output; do not label parsing-only success as schema validity. |

## Migration, authoring, and runtime gaps

| ID / priority / status | Area | Legacy behavior / requirement | Current result and impact | Closure criteria |
|---|---|---|---|---|
| G07 / P1 / Gap | Cross-referencing functoids | Separate legacy family defines IDs 5000-5006. | None of these seven IDs is registered. The earlier inventory of 76 base IDs omitted this family. N4, L5. | Inventory and implement the required definitions, persistence, runtime dependencies, and execution behavior; see the detailed list below. |
| G08 / P1 / Gap | Extension objects with generated XSLT | Use external extension objects alongside generated mapping code. | Compiler rejects extension-object XML unless custom XSLT is supplied. A sample containing inline XSLT calling an external assembly reproduces the restriction. N3, N7. | Support generated XSLT plus extension objects end-to-end, including method binding, dependency resolution, diagnostics, and execution. |
| G09 / P1 / Partial | Table Looping authoring | Configure rows, columns, and gating using a dedicated grid editor. | Model, serialization, and compiler support exist; no equivalent table-grid editor was found. Generic input editing is not a complete replacement. N2, N3, N8. | Create/edit/reopen grid metadata and verify extractor columns, gating, row order, and generated output. Retain unused-functoid warnings. |
| G10 / P1 / Gap | Custom functoid DLL discovery | Discover and register legacy custom functoid assemblies. | No equivalent discovery/registration workflow found. The TypeScript `registerFunctoid` hook and external scripting assembly support are different capabilities. N4, N7. | Load definitions and metadata from supported assemblies, expose them in the editor, preserve IDs, and compile/execute with clear missing-dependency errors. |
| G11 / P1 / Partial | External-assembly scripting | Resolve assemblies and bind methods across supported runtime/deployment configurations. | Browsing, metadata, and generated bindings exist. Complete assembly-resolution and deployment coverage has not been established. N2, N3, N7. | Exercise real assemblies, parameter/return types, version mismatches, missing files, clean installations, and supported engines. Do not infer runtime success from generated XSLT. |
| G12 / P1 / Partial | Database functoid portability | Database functoids have their required BizTalk runtime implementation available. | Generated helpers reference `Microsoft.BizTalk.BaseFunctoids.FunctoidScripts`. A standalone extension installation does not by itself establish availability of this dependency. N3, N7. | Provide a supported dependency strategy or compatible implementation and demonstrate execution in the advertised clean runtime environment. |
| G13 / P1 / Gap | Older BTM migration | Open or migrate older maps without losing links or semantics. | The `srctree/sinktree/functions` dialect is explicitly rejected. Two audited samples are affected. Rejection is safer than the former empty-map import, but migration remains missing. N2. | Migrate representative old-dialect maps and compare identities, functions, links, settings, and execution against a working legacy environment. |
| G14 / P1 / Partial | Generate Instance | Generate instances satisfying the relevant schema constraints. | Required repetition is capped at five: synthetic `minOccurs="6"` produced five elements. Latest X12 value/length improvements do not remove this cap or establish complete facet/schema validity. N6. | Honor required counts or report an explicit generation limit; validate generated instances against XSDs and cover facets, choices, defaults, fixed values, and test overrides. |
| G15 / P1 / Partial | Schema dependency resolution | Resolve schemas through the supported project/assembly and XSD dependency mechanisms. | Local includes/imports work; assembly-qualified references rely on filename heuristics. Imports without `schemaLocation` are rejected; the dependency loader does not handle `xs:redefine`. N1, N5. | Define and implement supported project/assembly resolution and dependency constructs, with deterministic resolution and explicit unsupported-case diagnostics. |
| G16 / P1 / Gap | Native / flat-file Test Map | Native-to-XML and XML-to-native test workflows. | No equivalent native conversion pipeline was found in the inspected Test Map path. XML transformation alone is not native-format support. N5, N7, L4. | Exercise supported native inputs/outputs, schema annotations, validation, and diagnostic behavior end-to-end. |
| G17 / P1 / Partial | Map properties and engine selection | Preserve and honor legacy map settings and engine-selection intent. | Current options/editor cover only part of the legacy property surface; legacy engine-selection settings are not represented equivalently. Existing XSLT version support does not establish engine equivalence. N2, N7, N8, L2. | Inventory each persisted property, then preserve and honor it or explicitly report unsupported behavior. Keep output-property loss tracked under G05. |
| G18 / P1 / Partial | Optimize Value Mapping | Respect the selected compiler optimization setting. | `optimizeValueMapping` is modeled and serialized, but the inspected compiler does not consume it. This is an option-parity gap, not independent proof of incorrect output. N2, N3. | Implement equivalent behavior or explicitly document/report the unsupported option; compare effective output and generated execution behavior. |

### Correction to the functoid inventory

All **76 IDs in `BaseFunctoidIDs`** have registry entries. That count is not the
complete legacy bundled-functoid inventory and does not establish semantic
equivalence. The separate `CrossReferencingFunctoidID` enum contains:

| ID | Legacy identifier | Registry status |
|---|---|---|
| 5000 | `FormatMessage` | Missing |
| 5001 | `GetApplicationID` | Missing |
| 5002 | `GetApplicationValue` | Missing |
| 5003 | `GetCommonID` | Missing |
| 5004 | `GetCommonValue` | Missing |
| 5005 | `SetCommonID` | Missing |
| 5006 | `RemoveAppID` | Missing |

These definitions bind to the legacy cross-referencing runtime. Adding palette
entries alone would not close G07.

## Tooling gaps and unverified parity

| ID / priority / status | Area | Legacy behavior / requirement | Current result and impact | Closure criteria |
|---|---|---|---|---|
| G19 / P2 / Partial | Validate Map | Compiler/schema-aware diagnostics across the map. | Editor validation checks basic conditions on the active page. It is not full compiler validation across all pages or instance XSD validation. N8. | Route full-map validation through the appropriate compiler/schema checks and report page/element-specific diagnostics. |
| G20 / P2 / Partial | Command Palette operations | Commands execute the requested Compile, Test, or Validate operation. | Compile/Validate redirect to toolbar actions; Test selects input and displays a message rather than running the complete test workflow. N5. | Wire commands to the same operations as the editor, including active-document selection, results, errors, and cancellation. |
| G21 / P2 / Gap | Debug Map | User-facing debugging of mapping/transformation execution. | No equivalent Debug Map workflow found. Shared logs and the developer debugging guide describe different capabilities. N5, N7, L6. | Provide a defined map-debugging workflow with the intended stepping/source mapping and variable/context inspection. |
| G22 / P2 / Partial | Advanced editor workflows | Legacy connected-selection, relevance, search, and editing workflows. | Basic navigation, pages, clipboard, and auto-linking exist. Full equivalence of connected-subgraph copying and legacy relevance/search workflows is not established. N8. | Define acceptance scenarios and verify editing, navigation, copied connectivity, undo/redo, and persistence without changing mapping identities. |
| G23 / Unverified | Remaining base-functoid semantics | Legacy input, numeric, culture, error, and boundary behavior. | Registration coverage is not execution coverage. The listed probes establish only their particular cases; they do not certify the remaining definitions or engine combinations. N3, N4, L1. | Build a differential matrix for every supported ID and arity, including invalid inputs, boundaries, warnings, and supported runtimes. |
| G24 / Unverified | Complex transformation/deployment combinations | Legacy hierarchy matching, loops, schema constructs, multi-message maps, and deployment behavior. | Some relevant implementations exist, but sufficient differential evidence is missing for complex loops, recursion, wildcards/substitution, multi-message maps, and deployment combinations. Do not label all of these unsupported. N1, N3, N7, L3, L4. | Use representative fixtures and a working legacy baseline; compare outputs, diagnostics, persisted settings, and runtime dependencies. |

## Validation evidence and limitations

| Check | Observed result | What it does not establish |
|---|---|---|
| Recursive sample compilation | Twelve maps checked: eight successful compiler results (including one custom-XSLT pass-through), two compiler failures, two unsupported-dialect rejections. | Not eight proven successful runtime executions. The sample set includes an empty map, so the pass count is not a feature-coverage percentage. |
| Link preservation | All ten loaded maps retained link identities in the in-memory save/reopen check. The 86-link endpoint-compatibility sample had no unresolved endpoints and compiled. Original BTM hashes remained unchanged. | Preservation of links does not prove preservation of all map properties; G05 remains open. Rejected maps were not imported. |
| Compiler failures | One map reported insufficient inputs for Equal and Value Mapping; another hit the generated-XSLT extension-object restriction. | Without a working legacy comparison, the first failure does not certify that the original map is invalid in BizTalk. |
| Fresh semantic probes | Generated XSLT executed with .NET: absent String Find passed; both empty-search cases failed; Unicode uppercase and Round midpoint differed; negative Integer matched. Round precision was rejected during compilation. | Expected functoid results came from inspected legacy source, not fresh legacy converter execution. These runs do not certify XSLT 2.0 runtime parity. |
| Fresh schema/persistence probes | .NET XSD compilation confirmed the complex-type namespace-scope expectation. Six output attributes were dropped on save. Required count six generated five elements. | These synthetic examples demonstrate specific failures, not an exhaustive XSD conformance matrix. |
| Earlier focused regression check | Nine focused suites / 236 tests passed, along with host and webview TypeScript checks during the re-audit. | This was not the full suite and did not include the latest X12 instance-generation suite. Passing tests can encode incompatible expectations, as G01 demonstrates. |
| Legacy baseline attempts | Both available legacy converter variants were attempted for each of the twelve maps: 24 crashes, comprising 17 stack overflows and seven access violations; no fresh legacy XSLT. | Compiler-environment failure is not evidence that customer maps are invalid. Cached XSLT files are not fresh, provenance-verified baselines. |
| Source versus installed extension | Findings describe the inspected source snapshot. | The previously installed VSIX predates the latest fixes. This documentation update neither builds nor installs a new package. |

### Legacy compilation warning follow-up

A separate inspected map contains a Looping functoid (type 424) with an input
but no output link. Legacy `CheckForFunctoidWarnings` classifies that condition
as `FunctoidNoOutput` (1013), severity Warning.

This finding is **derived from source and map structure**, not captured from
a completed legacy compilation. The two targeted legacy runs also failed
(one stack overflow, one access violation). The complete warning/error list
therefore remains unknown. An unused-functoid warning must not be confused
with invalid configuration on a connected functoid or treated as proof of
an otherwise valid map.

## Source evidence

Paths in N1-N8 are relative to `libs\data-mapper-v3` in LogicAppsUX.
Paths in L1-L6 refer to `src\DesignTools\XMLTools\source` in the separate
BizTalk Server repository. Symbols are included because line numbers can move.

| Reference | Primary source / verification surface |
|---|---|
| N1 | `src\schema\schemaPathResolver.ts`; `src\schema\schemaParser.ts` (`parseElement`, `parseComplexType`, QName resolution); `src\schema\schemaDependencyResolver.ts`; `test\schemaPathResolver.test.ts`; `test\schemaDependencyResolver.test.ts`. |
| N2 | `src\model\mapModel.ts` (`MapOptions`, `TableLoopingData`); `src\schema\btmSerializer.ts` (`serialize`, option parsing, table data); `test\btmSerializer.test.ts`. |
| N3 | `src\compiler\xsltCompiler.ts` (`validateP0Map`, functoid expression generation, table validation, `getDatabaseFunctoidScripts`); `test\xsltCompilerFunctoids.test.ts`; `test\compilerWorkerParity.test.ts`. |
| N4 | `src\functoids\functoidRegistry.ts`; `test\stringFind.test.ts`, including its current empty-search expectations. |
| N5 | `src\extension.ts` (command handlers); `src\mapEditorProvider.ts` (schema loading and Test Map); `src\logger.ts`; `src\worker\compilerWorkerClient.ts`; logging host/worker tests. |
| N6 | `src\schema\instanceGenerator.ts` (`getCardinality`, `generateValueFromType`); `src\model\schemaModel.ts`; `test\instanceGenerator.test.ts`. |
| N7 | `tools\compiler-worker` and `tools\xslt-transform` (execution and assembly binding); `docs\data-mapper-architecture.md`; `docs\compiler-worker-design.md`; `docs\debugging.md`. |
| N8 | `webview\src\components\MapperAppController.ts` (`getValidationIssues`, command messaging, functoid editing and navigation); `test\webviewSmoke.js`; `docs\functoid-properties-design.md`. Design proposals alone are not proof of an implemented workflow. |
| L1 | `BaseFunctoids\BaseFunctoid.cs` (`BaseFunctoidIDs`); `BaseFunctoids\StringFunctoids.cs`; `BaseFunctoids\FunctoidScripts.cs`; `BaseFunctoids\MathFunctoids.cs`. |
| L2 | `MapperVsPackage\MapProperties\GridProperties.cs` (legacy map/output property surface). |
| L3 | `MapperCompiler\GenerateCodeFunction.cs` (`CheckForFunctoidWarnings`, including lines 3493-3497 in the inspected source); `MapperCompiler\CompilerError.cs` (`FunctoidNoOutput = 1013`). |
| L4 | `MapperCompiler\XSLTCompiler.cs` (legacy testing, native input/output, validation). |
| L5 | `CrossReferencingFunctoids\CrossReferencingFunctoids.cs` (`CrossReferencingFunctoidID`, runtime binding) and its seven concrete functoid implementations. |
| L6 | `MapperVsIntegration\MapperCustomBuildComponent.cs` (legacy Debug Map integration). |

## Acceptance criteria for full compatibility

For every legacy capability in the supported scope, verify
**load -> edit -> save/reopen -> compile -> execute**, including original
identities/settings, equivalent results, appropriate warnings/errors, and
runtime dependencies. A palette entry, unit-test pass, generated stylesheet,
or identical XSLT text is insufficient by itself.

Close P0 output/persistence/schema-resolution defects first, then migration,
runtime, and authoring gaps, followed by tooling. Keep unverified items open
until supported by differential evidence from a working legacy environment.
Before closing an item, record the source revision, fixture provenance,
tested runtime/engine, observed result, and regression coverage. Use sanitized
fixtures; do not commit customer payloads or infer baseline provenance from
an existing `.xslt` filename.
