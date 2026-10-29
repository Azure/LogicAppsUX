# data-mapper-v3 Feature Catalog

Scope: the working tree of `libs\data-mapper-v3` on branch `priti/mapper-project` (package version 0.0.21, including the uncommitted change to `package.json`). All paths below are relative to `libs\data-mapper-v3`. Status values: "Yes" (evidence found and read), "Partial" (works with stated gaps), "No" (looked for, not found).

Items marked "(not verified at runtime)" were established by reading code only; nothing in this document was executed.

## 1. Overview

### 1.1 Purpose

`btm-data-mapper` ("Logic App Data Mapper", `package.json`) is a VS Code extension that edits and compiles BizTalk map files (`*.btm`) to XSLT. It registers a custom text editor `biztalkDataMapper.mapEditor` for `*.btm`, an activity-bar "Maps" tree view, and a set of project commands.

### 1.2 Architecture

| Layer | What it is | Key sources |
|---|---|---|
| Extension host | Registers commands, the tree view and the custom editor. `MapEditorProvider` owns the document, schema loading and caching, compile/test/deploy flows and Copilot requests. | `src\extension.ts`, `src\mapEditorProvider.ts`, `src\mapsTreeProvider.ts`, `src\projectCommands.ts`, `src\workspaceStructure.ts` |
| Webview | React 18 + Fluent UI v9 app (custom elements wrapping React roots) hosting two schema trees, a canvas, functoid palette, dialogs, toolbar, page bar, bottom panel and Copilot panel. Talks to the host with a typed message protocol. | `webview\src\components\*`, `src\protocol\mapEditorProtocol.ts` |
| Compiler worker | `CompilerWorkerClient` spawns the .NET worker (`BizTalk.DataMapper.Worker.exe --worker`, or `dotnet run --project ...Worker.csproj --configuration Release -- --worker` as fallback) and exchanges line-delimited JSON over stdio (protocol v1: initialize, ping, compileMap, testMap, shutdown). The worker's `CompilerService` spawns a Node child (`ELECTRON_RUN_AS_NODE=1`) running `out\compilerHost.js`, which runs the TypeScript `XsltCompiler`. | `src\worker\compilerWorkerClient.ts`, `src\worker\compilerHost.ts`, `tools\compiler-worker\BizTalk.DataMapper.Worker\Program.cs`, `tools\compiler-worker\BizTalk.DataMapper.Core\CompilerService.cs` |
| XSLT transform (Test Map) | `TransformService` runs the transform. If the XSLT contains `msxsl:script` or has a root version major >= 2 it launches the net472 `FrameworkTransform.exe` (60 s timeout); otherwise it calls `Program.Main` of `tools\xslt-transform\XsltTransform` in-process. | `tools\compiler-worker\BizTalk.DataMapper.Core\TransformService.cs`, `tools\compiler-worker\BizTalk.DataMapper.FrameworkTransform\Program.cs` |

Timeouts (`src\worker\compilerWorkerClient.ts` / worker): initialize 30 s, compileMap 120 s client / 110 s worker, testMap 60 s. An optional env var `BIZTALK_DATAMAPPER_COMPILER_INSPECT_PORT` attaches an inspector to the Node compiler child.

### 1.3 .btm read and write

| Aspect | Behavior | Source |
|---|---|---|
| Format read/written | The BizTalk-style XML map (SrcTree/TrgTree references, pages, links, functoids, option attributes). Map options are read and written as attributes. | `src\schema\btmSerializer.ts` |
| Document model | `MapDocument`: name, version, source/target `SchemaReference {location, rootName?, namespace?, inlineSchemaXml?}`, pages, options, targetValues, testValues, customXsltPath, customExtensionXmlPath, customXslt, customExtensionXml, scriptTypePrecedence. | `src\model\mapModel.ts` |
| Old dialect (`srctree` / `sinktree` / `functions`) | Rejected with an error. There is no migration. | `src\schema\btmSerializer.ts` |
| Encoding tolerance | Editor strips BOM/NUL characters and falls back on parse failure; schema/map reads accept UTF-8 and UTF-16 LE/BE BOMs. | `src\mapEditorProvider.ts`, `src\schema\schemaFileResolver.ts` (`readTextFileSync`) |
| Edit path | Webview edits are applied to the VS Code `TextDocument` with `WorkspaceEdit`, so undo/redo and dirty state follow the text document (not verified at runtime). | `src\mapEditorProvider.ts` (`vscode.workspace.applyEdit`) |
| Editor options | `retainContextWhenHidden: true`, `supportsMultipleEditorsPerDocument: false`. | `src\mapEditorProvider.ts:57-60` |

### 1.4 Compile output, engines and XSLT versions

| Aspect | Behavior | Source |
|---|---|---|
| Output style | BizTalk-style XSLT: `s0`/`ns0` prefixes, `xmlns:var`, `var:vN` variables, `msxsl:script` blocks (`userCSharp`, `userVB`, `userJScript`, `ScriptNS{n}` for external assemblies), `exclude-result-prefixes`. | `src\compiler\xsltCompiler.ts` |
| Compile engine | TypeScript `XsltCompiler` in a Node child process owned by the .NET worker. | `src\worker\compilerHost.ts`, `CompilerService.cs` |
| XSLT version | `options.xsltVersion` ('1.0' default, '2.0' allowed) is written to `xsl:stylesheet`. The compiler is the same for both; there is no 2.0-only generation. | `src\model\mapModel.ts`, `src\compiler\xsltCompiler.ts` |
| Transform engines | XSLT 1.0 without scripts: in-process `XsltTransform`. XSLT 1.0 with `msxsl:script`: net472 `XslCompiledTransform` (scripts and `document()` enabled). XSLT >= 2.0: Saxon (`Saxon.Api`); Saxon with `msxsl:script` throws `NotSupportedException`. | `TransformService.cs`, `FrameworkTransform\Program.cs` |
| JS fallback | `xslt-processor` is used only if the .NET transform fails AND the XSLT has no `msxsl:script` and no extension objects. | `src\mapEditorProvider.ts` (`testMapWithInput`) |
| Custom XSLT | If a map carries custom XSLT, the compiler short-circuits and returns it. | `src\compiler\xsltCompiler.ts` |
| Platform | Worker publish scripts target `win-x64` only (self-contained). | `package.json` scripts `publish:worker`, `publish:framework-transform` |

## 2. Feature Catalog

### 2.1 VS Code commands, menus, views

| Feature | Status | Evidence / notes |
|---|---|---|
| Custom editor for `*.btm` (priority default) | Yes | `package.json` `customEditors`; `MapEditorProvider.register` |
| Activity-bar container "Logic App Data Mapper" with "Maps" tree view and welcome content | Yes | `package.json` `viewsContainers`, `views`, `viewsWelcome`; `src\mapsTreeProvider.ts` (not read in detail) |
| `biztalkDataMapper.newMap` ("Add Mapper Project") | Yes | `src\extension.ts`, `addMapperProject` in `src\projectCommands.ts` |
| `biztalkDataMapper.openMap` ("Open Existing Mapper") | Yes | `openExistingMapper` |
| `biztalkDataMapper.addDataMap` | Yes | `addDataMap` |
| `biztalkDataMapper.importExistingMap` | Yes | `importExistingMap` |
| `biztalkDataMapper.addSchemaFile` | Yes | inline handler in `src\extension.ts` |
| `biztalkDataMapper.openDataMap` / `editDataMap` ("Edit Data Map as Text", opens with `default` editor) | Yes | `src\extension.ts` |
| `biztalkDataMapper.compileMap` / `testMap` | Yes | Forward to the active editor via `MapEditorProvider.executeActiveEditorCommand('executeCompile' / 'executeTestMap')`; warn if no map editor is open |
| `biztalkDataMapper.validateMap` | Partial | Only shows the message "Use the Validate button in the map editor toolbar"; it does not validate |
| `biztalkDataMapper.showLogs` | Yes | Shows the output channel (`src\logger.ts`) |
| `biztalkDataMapper.refreshMaps` | Partial | Registered in `src\extension.ts` but not declared in `package.json` `contributes.commands`, so it is not in the Command Palette |
| `.btm` file watcher | Yes | `**/*.btm` create/delete refreshes the tree |
| Menus | Yes | `view/title` (newMap, openMap, `addMapMenu` submenu); `view/item/context` for `btmFile` (open inline, edit as text); `explorer/context` (addDataMap/importExistingMap on folders except `Schemas` and `__generated`; addSchemaFile only on a folder named `Schemas`; open/edit on `.btm`); submenu `biztalkDataMapper.addMapMenu` (addDataMap, importExistingMap) |
| Settings `defaultXsltVersion`, `omitXmlDeclaration`, `preserveSequenceOrder` | No (dead) | Declared in `package.json` but a grep over `src`, `webview`, `test` found no read of them. The per-map `options` are what the compiler uses. |
| Deploy to Logic Apps | Partial | Reachable only through a webview message (`deployToLogicApps`); there is no VS Code command. See 2.15. |

### 2.2 Project structure and create project

| Feature | Status | Evidence / notes |
|---|---|---|
| Project layout: `Schemas\`, `__generated\`, `map.btm` | Yes | `src\workspaceStructure.ts` constants `schemasFolderName`, `generatedFolderName`, `defaultMapBaseName`; `ensureWorkspaceFolders` |
| Create project (folder name prompt + empty map) | Yes | `createMapperProject` / `createEmptyMap` using `BtmSerializer.createNew` |
| Folder-name validation | Yes | `validateWorkspaceName`: empty, leading/trailing space, invalid characters, `.`/`..`, control characters, trailing dot or space, reserved Windows names |
| Map-name validation and duplicate-safe naming | Yes | `validateMapName`, `getDuplicateSafeName` (`name(1).btm`) |
| Detect mapper projects | Yes | `findMapperProjects`: a workspace folder or direct child containing a `Schemas` folder or a `.btm`; skips `Schemas`, `__generated`, `node_modules`, dot-folders |
| Open existing project | Yes | `openExistingMapper` checks `isMapperProject` and adds the folder to the workspace |
| Add data map to project | Yes | `addDataMap` |
| Generated XSLT location | Yes | `getXsltOutputUri` gives `__generated\<map><suffix>.xslt` |

### 2.3 Import existing map

| Feature | Status | Evidence / notes |
|---|---|---|
| File picker with `.btm` filter and remembered folder | Yes | `importExistingMap` in `src\projectCommands.ts`; globalState key `IMPORT_MAP_BROWSE_DIRECTORY_KEY` (`src\browseLocation.ts`) |
| Schema closure collection | Partial | `collectSchemaClosure` in `src\schema\mapImportPlanner.ts` follows `xs:import` and `xs:include` only. `xs:redefine` is not followed. Remote `scheme://` locations are skipped. Missing, unreadable or unparseable files produce warnings. |
| Layout under `Schemas\` | Yes | `buildSchemaFiles` places files under their common directory; schemas on different drives throw an error |
| Reference repointing | Yes | `<Reference Location>` in SrcTree/TrgTree rewritten to `Schemas/<rel>`; fallback-resolved `schemaLocation` values inside schemas are rewritten |
| Inline schemas | Yes | `inlineSchemaXml` imports are resolved relative to the original `.btm` directory and rewritten |
| Encoding | Yes | UTF-16 XML declarations are rewritten to UTF-8 |
| Unresolvable schema | Yes | Original reference kept, warning shown |
| Conflict prompt, write order, warnings | Yes | Schemas are written first, then the map; warnings are surfaced (`src\projectCommands.ts`) |

### 2.4 Add schema file with dependency copying

| Feature | Status | Evidence / notes |
|---|---|---|
| Multi-select `.xsd` picker, remembers folder in workspaceState | Yes | `src\extension.ts` (`SCHEMA_BROWSE_DIRECTORY_KEY`, `getSelectedFileDirectory`) |
| Copy with transitive import/include dependencies | Partial | `copySchemaWithDependencies` uses `planSchemaImport`; import/include only (no redefine) |
| Changed root file gets duplicate-safe name | Yes | `src\workspaceStructure.ts` |
| Changed dependency prompts modal Overwrite / Keep Existing; cancel returns undefined | Yes | `src\workspaceStructure.ts` |
| Target is resolved relative to `map.btm` at the workspace root | Yes | `src\extension.ts` (`mapUri = <root>\map.btm`), so the command works even if the map is named differently |
| Summary message with warnings | Yes | `src\extension.ts` |

### 2.5 Schema picker

| Feature | Status | Evidence / notes |
|---|---|---|
| List schemas in `Schemas\` (recursive `.xsd`, sorted) | Yes | `listWorkspaceSchemas` |
| Pick per side (source/target) from the webview | Yes | Protocol messages in `src\protocol\mapEditorProtocol.ts`; handler in `src\mapEditorProvider.ts` |
| Modal confirmation on load/replace/change-root flows | Yes | `src\mapEditorProvider.ts` |
| Schemas folder watcher invalidates the schema cache | Yes | `src\mapEditorProvider.ts` |

### 2.6 Remembered browse folders

| Key | Used by | Store |
|---|---|---|
| `SCHEMA_BROWSE_DIRECTORY_KEY` | Add Schema File | workspaceState (`src\extension.ts`) |
| `IMPORT_MAP_BROWSE_DIRECTORY_KEY` | Import Existing Map | globalState (`src\projectCommands.ts`) |

Helpers live in `src\browseLocation.ts` (unit tested in `test\browseLocation.test.ts`).

### 2.7 Schema handling

| Feature | Status | Evidence / notes |
|---|---|---|
| XSD parse into a schema tree | Yes | `src\schema\schemaParser.ts` (`parse`, `parseWithImports(xsdContent, filePath, importedSchemas, rootName?)`) |
| Element refs, named types, complexContent extension/restriction, simpleContent | Yes | `src\schema\schemaParser.ts` |
| Attribute groups, group refs, `xs:any`, `anyAttribute`, substitution groups, facets, choice branches | Yes | `src\schema\schemaParser.ts` |
| `xs:import` / `xs:include` resolution | Yes | `src\schema\schemaDependencyResolver.ts`: recursive with a case-insensitive visited set (handles diamond and circular), chameleon include adopts the includer's namespace |
| Import without `schemaLocation` | No | Throws "does not specify schemaLocation" (matches sample case 16 in `e2e\samples\SchemaReferences\README.md`) |
| `xs:redefine` | No | No handling in dependency resolution, import planner or parser; a grep for "redefine" over all `.ts`, `.tsx` and `.cs` found nothing |
| `xs:key` / `keyref` / `unique` | No | Not handled by the parser |
| Multi-root schemas and change-root | Yes | `availableRoots` in `schemaParser.ts`; `SchemaReference.rootName`; root change handled in `src\mapEditorProvider.ts` |
| Inline schemas (`inlineSchemaXml`) | Yes | `src\model\mapModel.ts`, `src\schema\mapImportPlanner.ts` |
| Reference resolution: file path | Yes | `resolveSchemaFilePath(docDir, location, rootName?)` in `src\schema\schemaFileResolver.ts`: absolute, exact relative, plus `.xsd`, basename in map dir, basename plus `.xsd`, sibling dirs |
| Reference resolution: .NET type name | Yes | Same function: full dotted name plus `.xsd`, short name with/without `.xsd`, minus a `Schema` suffix, directory scan for `*.shortName.xsd` |
| Reference resolution: loose match | Yes | `resolveLooseSchemaReference` (`src\schema\schemaReferenceResolver.ts`): normalized artifact-name matching, unique match, root-name tie-break; ambiguity yields no match |
| Reference resolution: inline | Yes | Handled when `location` is empty and `inlineSchemaXml` is present |
| Unresolved-reference error UX | Yes | `SchemaNotFoundError` / `describeSchemaLoadError` (`src\schema\schemaLoadError.ts`): `Cannot resolve the <side> schema reference "<label>". No matching schema file was found next to the map or in the workspace.`; other failures: `Cannot load the <side> schema "<label>": <detail>` (label is the location or "(inline schema)") |
| Replace schema plus link reconciliation | Yes | `replaceSchema` (`src\schema\schemaReplacement.ts`): removes links on the replaced side whose path no longer resolves; strips those ids from functoid `inputLinks`/`outputLinks` and Link parameters and re-indexes parameters; returns `{map, removedLinkCount}`; never touches the other side or functoid-to-functoid links; honors `ignoreNamespacesForLinks` |
| Structural path segments | Yes | `<Sequence>`, `<Choice>`, `<All>`, `<Group:name>`, `<AttrGroup:name>` in schema paths |
| Path resolution | Yes | `SchemaPathResolver` (`src\schema\schemaPathResolver.ts`): TOM-style XPath step decoding; flattened instance path, schemaPath alias, node path, then structure matching; namespace-aware unless ignored; ambiguity returns undefined |
| Namespaces | Yes | Namespace-aware path matching with an `ignoreNamespacesForLinks` option; chameleon include namespace adoption |
| DataSet detection | Yes | `src\schema\schemaParser.ts` |

### 2.8 Canvas and editor

Sources: `webview\src\components\MappingCanvas.tsx`, `MapperAppController.ts`, `FunctoidPalette.tsx`, `SchemaTreeRenderer.tsx`, `MapperToolbar.tsx`, `MapperPageBar.tsx`, `MapperBottomPanel.tsx`.

| Feature | Status | Evidence / notes |
|---|---|---|
| Manual linking (schema node to schema node, to/from functoids) | Yes | `MappingCanvas.tsx`, `MapperAppController.ts` |
| Auto-link | Yes | Whole-map Auto-Link by Name remains available. For scoped linking, right-click a source branch and choose Link from Here, then right-click a target branch for Direct Link, Link by Name, Link by Structure, or Mass Copy. Scoped name matching recurses through matching child names; structure matching pairs children by position. Attributes are included and duplicate links are skipped. |
| Pages (add, switch via page bar) | Yes | `MapperPageBar.tsx`; the model holds `pages[]`; all pages are merged into one graph at compile time (see 2.14) |
| Undo/redo | Partial | Edits go through `WorkspaceEdit`, so the VS Code text-document undo stack applies; no webview-owned undo stack was found (not verified at runtime) |
| Copy/paste | Yes | Ctrl/Cmd+C, X, V and context-menu commands support links, functoids and selected mapping graphs within the same map, including across its pages. Cross-map clipboard is intentionally excluded. Clones receive independent IDs and parameter GUIDs; link properties, ordered inputs, fallback values and table-grid references are preserved. Ineligible links are skipped through the shared validator. Text-field shortcuts remain native. |
| Multi-selection and bulk operations | Yes | Ctrl/Cmd/Shift-click toggles links and functoids. Dragging canvas background rubber-band selects intersecting links and functoids; modifiers add to the selection. Middle-button, Space or Alt drag pans. Select All is available from the canvas menu or Ctrl/Cmd+A; Delete, Cut, Copy and Move to Page apply to the selection. |
| Move mappings between pages | Yes | Move to Page offers existing destinations and New Page. Connected functoids and their related links move together, retaining IDs, configuration and input ordering rather than leaving dangling endpoints. |
| Retarget link endpoints | Yes | Drag a selected link endpoint or use Change link source/target from its context menu. Retargeting retains the link identity, label and directives, validates duplicate links, cycles and functoid input limits, and updates input/output references. Escape cancels. |
| Shared endpoint eligibility | Partial | Creation, paste, retarget, scoped linking and auto-link share validation for missing/duplicate endpoints, cycles, input capacity, element/attribute eligibility, fixed or assigned targets, zero-occurrence targets and supported functoid category/input-slot restrictions. Rejected retargets and Mass Copy operations do not partially mutate the map. Exact legacy connection-mask and record-content parity is limited by metadata absent from the V3 model. |
| Connected-path tracing and reveal | Yes | Trace selection follows upstream and downstream functoid connections, highlighting links, functoids and schema endpoints. Selecting a source/target schema node seeds its incident mappings; selecting a record includes descendant mappings. Auto-reveal expands schema ancestors and scrolls offscreen endpoints into view; it can be disabled independently. |
| Link visibility and hover details | Yes | The canvas scope menu shows all links, links with at least one endpoint visible, or links with both endpoints visible. Visibility accounts for collapsed and scrolled schema rows. Partial-link coloring can be toggled. Hover titles include the label and source/target names. |
| Compiler dependency links | Partial | The Compiler links toggle requests compilation and shows deduplicated dependencies returned by the resolved compile graph as dashed, noninteractive links. Edits and host map/schema replacements clear stale diagnostics. Dependencies are merged across pages; arbitrary script-internal source accesses and custom-XSLT overrides are not inferred. |
| Fit view | Partial | The "Fit" action is an auto-layout (`functoidAutoLayout.ts`, `src\copilot\mapLayout.ts`), not a zoom-to-fit. Viewport logic is in `canvasViewport.ts` (`test\canvasViewport.test.ts`). |
| Schema search/navigation | Yes | Each tree searches names and XPaths case-insensitively, including attributes. Next/previous and Enter/Shift+Enter wrap through matches, select nodes and reveal collapsed/offscreen paths. Search has counts, clear and no-results states. |
| Selected-subtree expansion | Yes | Context-menu and tree controls recursively expand/collapse only the selected branch, preserving other branch expansion. Individual and whole-tree controls remain available. Narrow panes use a tools overflow menu. |
| Copy XPath | Yes | Source and target node menus send the selected XPath through the validated host clipboard command, using the VS Code clipboard API rather than browser clipboard permissions. |
| Suggest Matches | Yes | Node menus rank eligible opposite-schema nodes using name tokens, data type and node kind. Candidates are highlighted and can be selected/revealed without creating links or editing the map. This is ranked matching, not an exact reproduction of the legacy IntelliMatch scoring algorithm. |
| Schema coalescing | Yes | Each tree can replace unrelated sibling groups with expandable hidden-node rows. Connected, selected, searched and suggested paths and their ancestors are retained. Live connection changes refresh the view without deleting nodes or resetting unrelated expansion. |
| Selection-based mapping filtering | Yes | Show Related Mappings Only and the canvas toggle isolate the selected node/link/functoid graph. Unrelated links and functoids are hidden and excluded from area selection; compiler diagnostic overlays respect the filter. Show All Mappings restores the full graph. Selection/page/schema changes refresh the view without changing map data. |
| Functoid palette | Yes | `FunctoidPalette.tsx`, fed by registry summaries (`FunctoidSummary` in the protocol) |
| Properties / config panel | Yes | `FunctoidConfigDialog.tsx`, `ScriptingConfigDialog.tsx`, `MapperBottomPanel.tsx` |
| Schema node Properties view | Yes | Enter, double-click or the Properties context command opens the source/target node dialog. Editable values use a single Apply/Close footer; nodes without editable values show only Close. Close discards unsaved drafts. Selecting a row retains tracing/filtering selection without expanding the bottom panel, which contains only Input Instance and Test Output. Host document changes refresh saved values and schema replacement clears stale selections. |
| Source node test values | Yes | Leaf elements and attributes edit map-specific `testValues`, consumed by Generate Instance. Imported path aliases are resolved and saves use the canonical node path. Schema defaults/fixed values remain read-only metadata. |
| Target node constant values | Yes | Leaf elements and attributes edit map-specific `targetValues`, consumed by the compiler. Incoming target links on any map page disable assigning a constant; existing conflicting constants can still be cleared. Structural nodes and nodes that cannot occur are not value-editable. |
| Empty and literal node values | Yes | An enable checkbox distinguishes an unset override from an explicit empty value (`<empty>` in BTM). Disabling and applying removes the override; literal whitespace and XML-special characters survive BTM round-tripping. Clearing an override leaves schema defaults/fixed values unchanged. |
| Validation | Partial | Toolbar Validate runs simple checks on the active page only (`MapperAppController.ts`). The compiler performs fuller validation at compile time (see 2.14). |
| Map options UI | No | No webview UI for map options. They can only be changed by editing the `.btm` as text. |
| Link properties | Yes | Double-click a link, use its context-menu Link Properties command, or focus it and press Enter/Space. `LinkPropertiesDialog.tsx` shows read-only endpoints and edits the label and source/target directives. For multiple selected links, mixed fields are indicated and only changed fields are applied, preserving other per-link values. OK saves; Cancel/Escape discard edits. Saved labels render on the canvas. |
| Per-link source/target link options | Yes | Link Properties edits `MapLink.sourceLinkOption` (valueCopy/nameCopy/mixedCopy) and `targetLinkOption` (flattening/topDown/bottomUp). Options are persisted by `BtmSerializer` and consumed by the compiler. |

### 2.9 Table Looping / Table Extractor

| Feature | Status | Evidence / notes |
|---|---|---|
| Model | Yes | `MapFunctoid.tableLooping: TableLoopingData {columns, gated, rows: string[][]}`; rows hold parameter GUIDs (`src\model\mapModel.ts`) |
| Table Looping (703) compile | Partial | Compiled in `generateTargetElement` (`src\compiler\xsltCompiler.ts`): one body per row; if gated, `xsl:if test="string(<col 1 cell>) = 'true'"`. Requires `tableLooping` metadata. Used as a plain value input it errors: "requires BizTalk table-grid metadata, which is not available in this map model". |
| Table Extractor (704) compile | Partial | Needs a connected 703 with metadata, rows > 0, a constant column index in 1..columns, and must connect to a target node |
| Grid authoring UI | No | No table-grid editor was found in the webview. Metadata must come from an imported/hand-edited `.btm`. |
| Design reference | n/a | `docs\functoid-properties-design.md` |

### 2.10 Scripting

| Feature | Status | Evidence / notes |
|---|---|---|
| Inline C#, VB.NET, JScript | Yes | Scripting functoid 260 with scriptType `inlineCSharp` / `inlineVbNet` / `inlineJScript`; function name extracted by regex, else wrapped as `ScriptFn{n}`; empty body yields a stub returning `""`; `assemblyReferences` from `scriptImplementations` (`src\compiler\xsltCompiler.ts`) |
| Inline XSLT | Yes | `inlineXslt`: raw node content, must be well-formed, valid only when linked directly to a target node |
| Inline XSLT call-template | Yes | `inlineXsltCallTemplate`: named template; input count must equal the number of `xsl:param`; generated as `ScriptTemplate{n}` |
| External assembly | Yes | `externalAssembly`: `ScriptNS{n}` prefix, typed wrappers from `parameterTypes` (reflection fallback otherwise), static vs instance; emits `<ExtensionObjects>` with `<ExtensionObject Namespace="http://schemas.microsoft.com/BizTalk/2003/ScriptNS{n}" AssemblyName ClassName><Method Name ParameterCount>` merged with custom extension objects |
| External assembly browsing | Yes | `browseAssembly` message in `src\mapEditorProvider.ts`; `enrichExternalAssemblyMetadata` uses PowerShell reflection during compile |
| Script type precedence | Yes (model) | `MapDocument.scriptTypePrecedence` |
| Validation | Yes | Scripting validator in the compiler |

### 2.11 Custom XSLT

| Feature | Status | Evidence / notes |
|---|---|---|
| Custom XSLT path / content on the map | Yes | `customXsltPath`, `customXslt` in `MapDocument`; compiler short-circuits; provider loads the file at compile (`src\mapEditorProvider.ts`) |

### 2.12 Extension objects

| Feature | Status | Evidence / notes |
|---|---|---|
| Custom extension-object XML on the map | Yes | `customExtensionXmlPath`, `customExtensionXml`; merged with generated external-assembly objects |
| Export | Yes | `exportXslt` also writes `<map>.extension.xml` |
| Test-time loading | Yes | `FrameworkTransform` reads `<ExtensionObjects>` (Namespace/AssemblyName/ClassName); namespaces implemented by script blocks are skipped; the Saxon path requires classes implementing `ExtensionFunction` or `ExtensionFunctionDefinition` |
| Deploy | Yes | Assemblies are uploaded to `lib/custom/net472/` (see 2.15) |

### 2.13 Map options

| Option | Default | Serialized | Honored | Where consumed |
|---|---|---|---|---|
| omitXmlDeclaration | false | Yes | Yes | `xsl:output` generation |
| xsltVersion | '1.0' | Yes | Yes | `xsl:stylesheet` version; selects Saxon in the transform |
| xsltEncoding | 'UTF-8' | Yes | Yes | `xsl:output` |
| outputMethod (xml/html/text) | 'xml' | Yes | Yes | `xsl:output` |
| preserveSequenceOrder | true | Yes | Yes | `generateSequenceOrderedChildren` |
| treatElementsAsRecords | false | Yes | Yes | compiler (looping detection) |
| generateDefaultFixedNodes | true | Yes | Yes | target generation for fixed/default values |
| copyProcessingInstructions | false | Yes | Yes | root template |
| generateDebuggingInformation | false | Yes | Yes | Assert functoid emits `xsl:message terminate="yes"` |
| ignoreNamespacesForLinks | false | Yes | Yes | compiler, `schemaReplacement`, `mapPrompt`, instance generation |
| optimizeValueMapping | true | Yes | No | Modelled and serialized only; no consumer found |

All rows: `src\model\mapModel.ts` (defaults), `src\schema\btmSerializer.ts` (serialization), `src\compiler\xsltCompiler.ts` (consumption). There is no webview UI for these options (see 2.8) and the three same-named VS Code settings are unused (see 2.1).

### 2.14 Compile (multi-page)

| Feature | Status | Evidence / notes |
|---|---|---|
| Pipeline | Yes | Custom XSLT short-circuit, `resolveMapPaths`, `validatePageSchemaRoots`, `mergePages`, per-functoid compile, target generation (`src\compiler\xsltCompiler.ts`) |
| Multi-page | Partial | All pages are merged into ONE graph. Functoid ids from non-first pages are prefixed `${page.id}:`; diagnostics are prefixed `[PageName]`. Pages are not compiled into separate templates. |
| Validators | Yes | Scripting; Looping (424) and Existence Looping (801); Table Looping (703); Table Extractor (704); database consumers (574, 575 require input from 524); target semantics (Nil Value 376 needs a nillable target, Mass Copy 802 suppresses descendants, choice with multiple mapped branches); `validateTargetLoopPaths` (multiple loop paths warn and use the common ancestor; conflicting hierarchy directives warn and use flattening) |
| Arity check | Yes | `<name> requires N(-M) input(s), but received K`; unknown id gives `Unknown functoid: <id>`; unlinked inputs default to `''` |
| Looping | Yes | Repeating target nodes get `xsl:for-each` from `findForEachSourcePaths` (TopDown picks the outermost source, otherwise the innermost) |
| Types and nil | Yes | `xsi:type` for derived types; nillable-to-nillable emits an `xsi:nil` choice; `targetValues` constants (`<empty>` is `""`) |
| Guard conditions | Yes | Inherited from upstream conditional functoids (Value Mapping, Key Match) |
| Compile via command | Yes | Worker request `compileMap`; output written under `__generated\` |

### 2.15 Test Map

| Feature | Status | Evidence / notes |
|---|---|---|
| Pick an input instance file | Yes | `testMap` message picks a file; `testMapWithInput` checks well-formedness first (`src\mapEditorProvider.ts`) |
| Generate sample instance | Yes | `generateInstance`, backed by `InstanceGenerator` (`src\schema\instanceGenerator.ts`), modelled on BizTalk's `CSchemaInstance.GenerateInstance`: cardinality capped (min>0 gives min up to 5; otherwise up to 3), Choice emits its first branch, `testValues` applied through `SchemaPathResolver`, root prefixed `ns0` when elements are unqualified |
| Run transform | Yes | Compile, save the XSLT, .NET worker transform (see 1.4); JS fallback only when no scripts or extension objects |
| Output | Yes | `formatXml`; saved as `<map>_output.xml`. The output is not validated against the target schema. |
| Missing framework host | Yes | `TransformService` returns an error if `FrameworkTransform.exe` is missing |
| Export XSLT | Yes | `exportXslt` message (also writes `.extension.xml`) |
| Deploy to Logic Apps | Partial | `deployToLogicApps` (webview message only): compile, VS Code Microsoft auth, subscription pick, `Microsoft.Web/sites` of kind `workflowapp`, upload XSLT to `Artifacts/Maps/<map>.xslt` and assemblies to `lib/custom/net472/` through Kudu VFS. No VS Code command; not exercised here. |

### 2.16 Logging and diagnostics

| Feature | Status | Evidence / notes |
|---|---|---|
| Output channel and "Show Logs" command | Yes | `src\logger.ts`, `biztalkDataMapper.showLogs` (tests: `test\logger.test.ts`) |
| Webview/host log forwarding | Yes | `mapLoggingHost` (test `test\mapLoggingHost.test.ts`) |
| Worker log propagation | Yes | Test `test\compilerWorkerLogging.test.ts` |
| Compiler diagnostics | Yes | Errors/warnings with page prefix; see 2.14 |
| Node compiler debugging | Yes | `BIZTALK_DATAMAPPER_COMPILER_INSPECT_PORT`; see `docs\debugging.md` |

### 2.17 Copilot features (`src\copilot`)

Files: `src\copilot\mapPrompt.ts`, `src\copilot\mapLayout.ts` (only these two exist).

| Feature | Status | Evidence / notes |
|---|---|---|
| Chat model call | Yes | `vscode.lm.selectChatModels` in `src\mapEditorProvider.ts`; up to 2 attempts |
| Prompt | Yes | `createMapPrompt` embeds the full map JSON, flattened source/target schema paths, the functoid catalog and reference files, with rules (prefer built-in functoids over Scripting; XSLT-to-BTM reconstruction procedure; external-assembly rules) |
| Layout-only fallback | Yes | `createMapLayoutPrompt` when the full map exceeds the model context budget; only layout requests are served |
| Patch format | Yes | RFC 6902-like ops `add`, `replace`, `remove`, `move`, plus custom `layout` (`/pages` or `/pages/<i>`). Restricted to roots `/name`, `/pages`, `/options`, `/targetValues`; `__proto__`, `prototype`, `constructor` segments are rejected; max 200 patches (`parseMapPromptResponse`, `applyMapPatches`) |
| Validation of proposed edits | Yes | `applyMapPatches` checks map integrity (links, functoid ids, schema paths via `createMapPatchValidationContext`, external-method expectations from XSLT/extension XML context) and rejects patches that introduce new issues |
| User confirmation | Yes | Modal "Apply Changes"; rejected if the document version changed meanwhile |
| Reference files | Yes | Browse multiple files; 512 KB each, 2 MB total; binary files skipped |
| Layout engine | Yes | `layoutMapPage` in `src\copilot\mapLayout.ts` (test `test\mapLayout.test.ts`) |
| UI | Yes | `webview\src\components\CopilotPanel.tsx` |

### 2.18 Custom functoid registration hook

| Feature | Status | Evidence / notes |
|---|---|---|
| `registerFunctoid(functoid)` | Partial (hook only) | Defined at `src\functoids\functoidRegistry.ts:49`. No callers in `src`, `webview` or `test`. The compiler's functoid switch has no case for custom names, so a registered Custom-category functoid would fail with "No XSLT compiler implementation for <name>". The `Custom` category exists in `FunctoidCategory` but no functoid is registered in it. |

### 2.19 Tests and samples

| Area | Contents |
|---|---|
| Jest unit tests (`test\`) | browseLocation, schemaParser, autoLink, canvasViewport, instanceGenerator, logger, mapAssistantHost, mapLayout, mapLoggingHost, schemaReplacement, stringFind, xsltLiteralEscaping, btmSerializer, compilerWorkerParity, functoidRegistry, loopingFunctoidsSample, mapGraph, compilerWorkerLogging, schemaDependencyResolver, mapPrompt, schemaReferenceResolver, schemaPathResolver, xsltCompilerP1, schemaP1, bts2020ManualMaps, functoidCategories, xsltCompilerFunctoids, workspaceStructure, schemaReplacementHost, mapEditorProtocol; VS Code mock in `test\__mocks__\vscode.ts` |
| .NET tests | `tools\compiler-worker\BizTalk.DataMapper.Core.Tests\TransformServiceTests.cs` |
| Webview smoke | `test\webview-smoke\run.js` (via `pnpm run test:webview`) |
| Samples | `e2e\samples\LoopingFunctoids` (btm, xslt, xsd); `e2e\samples\PerformanceLargeMap` (README, large xsd, btm); `e2e\samples\SchemaReferences` (maps 01-23 and `Maps\04_FileRef_ParentRelative.btm`, README covering file path, bare filename, subfolder, parent-relative, .NET type name, Schema suffix, RootNode multi-root, inline source/target and aggregate, transitive/diamond/circular imports, include same-namespace/chameleon, redefine, missing reference/import) |

The SchemaReferences README states case 16 (no `schemaLocation`) likely fails and case 21 (`xs:redefine`) is likely incomplete; both statements are consistent with the code read. The samples were not executed for this document.

## 3. Functoid Catalogue

Source of truth: `src\functoids\functoidRegistry.ts` (singleton `FunctoidRegistry`). The compile path column reflects `src\compiler\xsltCompiler.ts`, which is authoritative; the registry also carries `generateXslt` strings that the compiler does not use and that differ in places (noted per row).

Compile path key: "Inline XPath" = expression emitted directly; "Script" = generated `msxsl:script` userCSharp helper (needs a script-capable transform engine); "Special" = handled structurally in the compiler; "External" = needs a runtime assembly.

### 3.1 Totals

| Category | Count |
|---|---|
| String | 10 |
| Math | 11 |
| Scientific | 10 |
| Logical | 16 |
| DateTime | 4 |
| Conversion | 4 |
| Advanced | 13 |
| DatabaseLookup | 3 |
| Cumulative | 5 |
| Custom (registered) | 0 |
| **Total** | **76** |

### 3.2 String (10)

| ID | Name | Inputs (min-max) | Compile path | Notes |
|---|---|---|---|---|
| 101 | String Find | 2-2 | Inline XPath: `(string-length(substring-before(a,b))+1)*number(contains(a,b))` | Returns 0 when not found |
| 102 | String Left | 2-2 | Inline XPath: `substring(s,1,n)` | |
| 103 | String Lowercase | 1-1 | Inline XPath: `translate` | ASCII A-Z only; non-ASCII letters unchanged |
| 104 | String Right | 2-2 | Inline XPath: `substring(s, string-length(s) - n + 1)` | |
| 105 | String Size | 1-1 | Inline XPath: `string-length` | |
| 106 | String Extract | 3-3 | Inline XPath: `substring(s, a, b-a+1)` | Start and end positions |
| 107 | String Concatenate | 1-100 | Inline XPath: `concat()` | |
| 108 | String Left Trim | 1-1 | Script: `StringTrimLeft` | Registry `generateXslt` says `normalize-space`; compiler emits a script. The JS fallback maps it to `normalize-space`. |
| 109 | String Right Trim | 1-1 | Script: `StringTrimRight` | Same deviation as 108 |
| 110 | String Uppercase | 1-1 | Inline XPath: `translate` | ASCII a-z only |

### 3.3 Math (11)

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 111 | Absolute Value | 1-1 | Inline XPath: `number(x) * (1 - 2 * (number(x) < 0))` | |
| 112 | Integer | 1-1 | Inline XPath: `floor(x)` | Deviation: the registry description says it truncates toward zero; `floor` differs for negative values |
| 113 | Maximum Value | 2-100 | Script: `MathMax{n}` | |
| 114 | Minimum Value | 2-100 | Script: `MathMin{n}` | |
| 115 | Modulo | 2-2 | Script: `MathMod` | Modulo by 0 returns `""` |
| 116 | Round | 1-1 | Inline XPath: `round(x)` | Single input; no precision argument |
| 117 | Square Root | 1-1 | Script: `MathSqrt` | |
| 118 | Addition | 2-100 | Script: `MathAdd{n}` | Returns `""` on unparseable input |
| 119 | Subtraction | 2-2 | Script: `MathSubtract{n}` | First input minus the rest |
| 120 | Multiplication | 2-100 | Script: `MathMultiply{n}` | |
| 121 | Division | 2-2 | Script: `MathDivide` | Divide by 0 returns `""` |

### 3.4 Scientific (10)

All compile to generated userCSharp scripts (unary or binary `Math.*` wrappers, named `Math*`, e.g. `MathSin`); unparseable input returns `""`. Helper names beyond the example were not individually checked.

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 130 | Arc Tangent | 1-1 | Script | |
| 131 | Cosine | 1-1 | Script | |
| 132 | Sine | 1-1 | Script | |
| 133 | Tangent | 1-1 | Script | |
| 134 | Natural Exponential Function | 1-1 | Script | |
| 135 | Natural Logarithm | 1-1 | Script | |
| 136 | 10^X | 1-1 | Script | Registry name: base 10 exponential |
| 137 | Common Logarithm | 1-1 | Script | |
| 138 | X^Y | 2-2 | Script | |
| 139 | Base-Specified Logarithm | 2-2 | Script: `Math.Log(d0)/Math.Log(d1)` | |

### 3.5 Logical (16)

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 311 | Greater Than | 2-2 | Script: `LogicalCompare(a,b,'gt')` | Numeric compare if both parse, else ordinal string compare |
| 312 | Greater Than or Equal To | 2-2 | Script: `LogicalCompare(..., 'gte')` | |
| 313 | Less Than | 2-2 | Script: `LogicalCompare(..., 'lt')` | |
| 314 | Less Than or Equal To | 2-2 | Script: `LogicalCompare(..., 'lte')` | |
| 315 | Equal | 2-2 | Script: `LogicalCompare(..., 'eq')` | |
| 316 | Not Equal | 2-2 | Script: `LogicalCompare(..., 'ne')` | |
| 317 | Logical String | 1-1 | Inline XPath: `string(x) != ''` | |
| 318 | Logical Date | 1-1 | Script: `LogicalIsDate` | |
| 319 | Logical Numeric | 1-1 | Script: `IsNumeric` | |
| 320 | Logical OR | 2-100 | Script: `LogicalOr{n}` | |
| 321 | Logical AND | 2-100 | Script: `LogicalAnd{n}` | |
| 374 | Value Mapping (Flattening) | 2-2 | Special: conditional | `string(cond)='true'` gates an `xsl:if`; fewer than 2 inputs passes through |
| 375 | Value Mapping | 2-2 | Special: conditional | Same as 374 |
| 701 | Logical Existence | 1-1 | Inline XPath: `boolean(x)` | Requires a node input |
| 705 | Logical NOT | 1-1 | Inline XPath: `not(userCSharp:ValToBool(string(x)))` | Uses a helper script |
| 706 | IsNil | 1-1 | Inline XPath: `xsi:nil` attribute test | Requires a node input |

### 3.6 DateTime (4)

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 122 | Add Days | 2-2 | Script: `DateAddDays` | Uses `Double.TryParse` without `InvariantCulture` (locale-sensitive) |
| 123 | Date | 0-0 | Script: `DateCurrentDate` family | Uses `DateTime.Now` (local time) |
| 124 | Time | 0-0 | Script | Uses `DateTime.Now` |
| 125 | Date and Time | 0-0 | Script: `DateCurrentDateTime` | Uses `DateTime.Now` |

Helper names for 123 and 124 beyond the `DateCurrentDateTime` pattern were not individually checked.

### 3.7 Conversion (4)

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 126 | ASCII to Character | 1-1 | Script: `ConvertChr` | |
| 127 | Character to ASCII | 1-1 | Script: `ConvertAsc` | |
| 128 | Hexadecimal | 1-1 | Script: `ConvertHex` | Uppercase hex output |
| 129 | Octal | 1-1 | Script: `ConvertOct` | Parses as Int64 |

### 3.8 Advanced (13)

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 260 | Scripting | 0-100 | Special | See 2.10 |
| 322 | Record Count | 1-1 | Inline XPath: `count(x)` | Requires a node input |
| 323 | Index | 1-100 | Special: `generateIndexExpression` | `[number(i)]` predicates on repeating ancestors; requires a node input |
| 376 | Nil Value | 0-1 | Special | Emits `xsi:nil="true"` under `xsl:if`; target must be nillable |
| 424 | Looping | 1-100 | Special | Passes its input through; loop derived via `findForEachSourcePaths`; requires a node input |
| 474 | Iteration | 1-1 | Inline XPath: `position()` | Requires a node input |
| 702 | XPath | 1-2 | Inline XPath: the constant verbatim | No validation of the expression |
| 703 | Table Looping | 2-100 | Special | See 2.9; partial |
| 704 | Table Extractor | 2-2 | Special | See 2.9; partial |
| 707 | Assert | 2-3 | Special | Passes through input 3, else 2, else `''`; with `generateDebuggingInformation` emits `xsl:message terminate="yes"` |
| 800 | Key Match | 1-1 | Special: conditional on `string(in0)='true'` | |
| 801 | Existence Looping | 1-100 | Special | Same loop mechanism as 424; requires a node input |
| 802 | Mass Copy | 1-1 | Special | `xsl:copy-of` of `x/@* | x/node()`; suppresses mapped descendants; requires a node input |

### 3.9 DatabaseLookup (3)

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 524 | Database Lookup | 4-4 | External: `DatabaseFunctoidScripts` calling `Microsoft.BizTalk.BaseFunctoids.FunctoidScripts.DBLookup` | Needs the BizTalk assembly at run time |
| 574 | Value Extractor | 2-2 | External: `DBValueExtract` | Requires input from 524 |
| 575 | Error Return | 1-1 | External: `DBErrorExtract` | Requires input from 524 |

### 3.10 Cumulative (5)

| ID | Name | Inputs | Compile path | Notes |
|---|---|---|---|---|
| 324 | Cumulative Sum | 1-2 | Inline XPath: `sum(x)` | Requires a node input |
| 325 | Cumulative Average | 1-2 | Inline XPath: `sum(x) div count(x)` | Requires a node input |
| 326 | Cumulative Minimum | 1-2 | Script: `CumulativeMinimum` | Requires a node input |
| 327 | Cumulative Maximum | 1-2 | Script: `CumulativeMaximum` | Requires a node input |
| 328 | Cumulative String (Concatenate) | 1-3 | Script: `CumulativeConcatenate` | Registry allows 3 inputs but no separator is applied |

### 3.11 Legacy IDs not registered

The cross-check against the `BaseFunctoidIDs` enum in `D:\Enlistments\BizTalk-Server\src\DesignTools\XMLTools\source\BaseFunctoids\BaseFunctoid.cs` could not be performed (file access was not available during this task), so no legacy ID or name is asserted here. What was verified is the set of numeric ranges with no registry entry:

| Unregistered ID ranges (between and after registered ids) |
|---|
| 140-259, 261-310, 329-373, 377-423, 425-473, 475-523, 525-573, 576-700, 708-799, 803 and above |

Registered ids are exactly the 76 listed above. Anything BizTalk defines in these ranges is not available in this editor and, if present in an imported `.btm`, would produce `Unknown functoid: <id>` at compile time (`src\compiler\xsltCompiler.ts`).

## 4. Known Limitations

| # | Limitation | Evidence |
|---|---|---|
| 1 | Settings `biztalkDataMapper.defaultXsltVersion`, `omitXmlDeclaration`, `preserveSequenceOrder` are declared but never read | `package.json`; grep over `src`, `webview`, `test` |
| 2 | No UI for map options; they are editable only in the `.btm` text | grep of `webview\src` found no options editor |
| 3 | `optimizeValueMapping` is serialized but ignored by the compiler | grep of `src` |
| 4 | `xs:redefine` is not parsed or followed (editor, import planner, add-schema copy); `xs:key`, `xs:keyref`, `xs:unique` ignored | `schemaDependencyResolver.ts`, `schemaFileResolver.ts` (`getSchemaDependencyLocations` returns import/include only), `schemaParser.ts` |
| 5 | `xs:import` without `schemaLocation` fails to load | `schemaDependencyResolver.ts` |
| 6 | Old `.btm` dialect (`srctree`/`sinktree`/`functions`) is rejected, not migrated | `btmSerializer.ts` |
| 7 | Table Looping/Extractor compile only with `tableLooping` metadata; no authoring UI; 703 as a plain input errors | `xsltCompiler.ts`, `webview` |
| 8 | All pages compile into one merged graph | `mergePages` |
| 9 | Cumulative Concatenate ignores a separator; Integer uses `floor`; Round has no precision; Upper/Lowercase are ASCII-only; Left/Right Trim are scripts rather than `normalize-space` | Section 3 |
| 10 | Many functoids (Math, Scientific, Logical compare, Date, Conversion, Cumulative min/max/concat, trims) compile to `msxsl:script`, so Test Map needs the net472 host and cannot run them under XSLT 2.0/Saxon | `TransformService.cs`, `FrameworkTransform\Program.cs` |
| 11 | XSLT 2.0 with `msxsl:script` is not supported in Test Map (Saxon throws `NotSupportedException`) | `FrameworkTransform\Program.cs` |
| 12 | Database functoids need the BizTalk `FunctoidScripts` assembly at run time | `xsltCompiler.ts` (`DatabaseFunctoidScripts`) |
| 13 | Date/Time functoids use `DateTime.Now`; Add Days parsing is not culture-invariant | `xsltCompiler.ts` |
| 14 | `registerFunctoid` has no callers and the compiler cannot compile custom functoids | `functoidRegistry.ts:49`; compiler functoid switch |
| 15 | Worker runtime is built for `win-x64` only | `package.json` scripts |
| 16 | Deploy to Logic Apps is reachable only via a webview message; there is no VS Code command | `mapEditorProvider.ts`, `extension.ts` |
| 17 | Test Map output is not validated against the target schema | `mapEditorProvider.ts` (`testMapWithInput`) |
| 18 | `validateMap` command only shows an informational message | `extension.ts` |
| 19 | `refreshMaps` is registered but not contributed in `package.json` | `extension.ts`, `package.json` |
| 20 | Editor gaps: "Fit" is a layout rather than zoom-to-fit; webview validation covers the active page only | `MapperAppController.ts`, `MappingCanvas.tsx`, `SchemaTreeRenderer.tsx`, grep results |
| 21 | Copilot: full-map prompts exceed model context on large maps and fall back to layout-only | `createMapLayoutPrompt`, `mapEditorProvider.ts` |
| 22 | Schema import across different drives cannot be consolidated into one `Schemas` folder | `mapImportPlanner.ts` (`buildSchemaFiles`) |

## 5. Items Not Verified

| Item | Reason |
|---|---|
| `BaseFunctoidIDs` enum cross-check (section 3.11) | Source file was not accessible |
| `tools\xslt-transform\XsltTransform\Program.cs` internals | Not read; only the call from `TransformService` was confirmed |
| Runtime undo/redo, copy/paste and Fit behavior | Code reading only |
| `src\mapsTreeProvider.ts`, `src\worker\compilerHost.ts`, `src\schema\orderedXsdParser.ts`, `src\model\mapGraph.ts`, `src\model\schemaModel.ts` | Not read in detail |
| Helper names for Scientific functoids other than the examples, and Date (123/124) | Pattern confirmed, individual names not checked |
| Samples and tests | Listed from the file tree; not executed |
