# LML Integration Plan

Status: proposed; source investigation completed, implementation and standalone LML runtime validation not started.

## Goals and Invariants

1. New projects and Add Data Map continue creating `.btm` files, with the current XML-to-XML schema handling, functoids, commands, editor, compiler, and test execution.
2. Existing `.btm` imports keep their current behavior.
3. Import Map additionally accepts `.lml`, resolves its schema references, and copies required assets into the mapper project.
4. Imported LML remains LML. The existing v2 model, functions, validation, serialization, compilation service, and test behavior remain authoritative.
5. The LML experience adopts v3's visual layout and styling through presentation-only work, not by converting LML into the BTM editor model.
6. A project may contain both formats. Editor behavior is selected per document, not by a project-wide mode.
7. BTM creation, opening, and execution must not require starting or installing the LML runtime.
8. The runtime belongs to the same mapper project in a dedicated `workflow-designtime` subfolder. Do not create a second mapper project or move canonical schemas/maps into an Artifacts tree.

## Recommended Architecture

```text
Shared project tree, import command, document/command routing
  |
  +-- .btm -> existing MapEditorProvider + existing webview
  |           BtmSerializer / MapDocument / FunctoidRegistry
  |           existing BTM compiler and worker pipeline
  |
  +-- .lml -> new LML editor provider + separate LML webview
              existing data-mapper-v2 providers/store/editor
              existing LML serialization and function semantics
              file-service bridge + API-service bridge
              existing Logic Apps workflow design-time runtime
```

Reuse the v2 package rather than copying its source into v3. Introduce narrow presentation extension points only where necessary. Do not fork serializers, reducers, function implementations, or compiler behavior.

Separate webviews provide useful isolation: v2 currently has a module-level Redux store and module-level API/file services. One LML document per webview prevents different documents from sharing those globals. Host-side services still need explicit project/document/revision identity.

## Same-Project Layout and Runtime Isolation

```text
MapperProject/
  ExistingMap.btm
  ImportedMap.lml
  Schemas/
    Source.xsd
    Target.json
    ...referenced schema files...
  __generated/
    ExistingMap.xslt
    ImportedMap.lml.xslt
  workflow-designtime/
    host.json
    local.settings.json
    ...runtime-owned configuration, cache and compatibility files...
```

Keep the existing `__generated` spelling; do not rename it to `_generated` and change BTM output paths. The LML output naming above is format-qualified so equal BTM/LML basenames cannot overwrite each other's generated XSLT; runtime artifact names are mapped by the LML adapter.

- Create `workflow-designtime` lazily on the first imported/opened LML document that requires API services, not during BTM-only project creation or extension activation.
- Run the design-time process with this subfolder as its working directory. Keep all design-time settings out of the mapper project root and do not turn the root into a Logic App project.
- Set project context through the existing runtime configuration only after proving how schema/map artifact paths are resolved. Existing startup sets `ProjectDirectoryPath` separately from the process working directory, but this does not prove arbitrary artifact-root overrides are supported.
- Use one runtime manager per mapper project, shared by that project's LML editors. Isolate ports, requests, process environment, logs, readiness and cancellation from BTM compilation and from other projects.
- Do not route BTM compile/test through this process. A missing, crashed or restarting LML runtime must not block BTM operations.
- Keep `Schemas`, root `.lml` documents and `__generated` as the authoritative user-facing files. Runtime-local mirrors/caches are derived only.
- Exclude the design-time folder from map/schema discovery and import candidates so staged LML files never appear as duplicate maps. Treat generated settings, caches and any secrets as local-only files with narrowly scoped ignore rules.
- Dispose only owned processes and derived artifacts. Do not remove canonical schemas, map documents, user inputs or generated outputs when stopping the runtime.

## Verified Source Boundaries

| Area | Existing source | Implication |
| --- | --- | --- |
| BTM import | `src/projectCommands.ts`, `src/schema/mapImportPlanner.ts` | The picker, parser, destination extension, and open-editor command currently assume BTM. Add format dispatch outside the existing BTM path. |
| Project discovery | `src/workspaceStructure.ts`, `src/mapsTreeProvider.ts`, `package.json` | Extend file discovery, project recognition, menus, editor registration, and watchers for LML without changing the New Map default. |
| BTM editor | `src/mapEditorProvider.ts`, `src/protocol/mapEditorProtocol.ts` | These operate on BTM models. Do not send LML through their serializer or compile handlers. |
| V2 editor | `../data-mapper-v2/src/ui/DataMapperDesigner.tsx` | Composes the command bar, function panel, React Flow canvas, checker, code view, and test panel. There are not currently general-purpose layout slots. |
| V2 initialization | `../data-mapper-v2/src/core/DataMapperDesignerProvider.tsx`, `../data-mapper-v2/src/core/DataMapDataProvider.tsx` | Reuse providers and original schema/function/map initialization together. |
| V2 persistence | `../data-mapper-v2/src/mapHandling/`, `../data-mapper-v2/src/core/services/dataMapperFileService/dataMapperFileService.ts` | Preserve LML and metadata serializers and implement the existing file-service contract. |
| V2 service boundary | `../data-mapper-v2/src/core/services/dataMapperApiService/` | Schema trees, function manifests, XSLT generation, and testing are HTTP service operations, not a local JavaScript LML compiler. |
| Existing host | `../../apps/vs-code-designer/src/app/commands/dataMapper/` | Reference implementation for loading, drafts, asset paths, runtime startup, and persistence. Extract narrowly; do not make the entire Logic Apps extension a dependency by default. |

Paths in the table are relative to the data-mapper-v3 package root.

## Dependencies to Reuse or Add

### 1. V2 Semantic Package

Consume `@microsoft/logic-apps-data-mapper-v2` using the existing workspace dependency mechanism. Keep these pieces together:

- `DataMapperDesignerProvider`, `DataMapDataProvider`, and the v2 editor components.
- Redux slices, Redux undo history, connection/function models, selectors, and mapping utilities.
- `MapDefinitionSerializer`, `MapDefinitionDeserializer`, metadata serialization, and compatible LML loading.
- Original `DataMapSchema`/extended-schema identities, namespace handling, function manifests, and function configuration.
- Checker, code view, and generation/test flows.

Do not map these objects to v3's `MapDocument`, `MapPage`, `MapLink`, or numeric BTM functoid IDs. V2 already expresses loops, conditions, literals, and functions differently.

### 2. Browser Dependency Closure

The v2 package already declares most dependencies. Reuse its dependency versions and the repository lockfile rather than duplicating their implementation or upgrading them as part of this work:

- `@microsoft/logic-apps-shared` and `@microsoft/designer-ui` transitive workspace libraries.
- Redux Toolkit, React Redux, Redux undo, and Immer.
- React Flow, ELK, tree/virtualization libraries, React DnD, edge routing, and function search.
- Fluent UI v8/v9 compatibility packages, React Intl, and the provider dependencies.
- Existing YAML utilities and the v2 package's parsing dependencies.
- Compatible React/React DOM and React Query peers. V2 currently declares React Query `4.36.1`; do not silently substitute a different major version.

The standalone webview webpack configuration currently handles TypeScript and CSS only. Prove workspace resolution, source transpilation, React deduplication, SVG/other assets, required styles, browser globals/polyfills, and packaged VSIX completeness. Include LESS or other loaders only if the actual dependency graph requires them.

Prefer a separate LML entry/bundle so these dependencies and styles do not change the BTM bundle. Test the installed package without relying on the monorepo's `node_modules` layout.

### 3. Host/File-Service Adapter

Implement `IDataMapperFileService` for v3: schema selection/listing/import, LML and metadata save, draft handling, XSLT save, custom XSLT discovery, notifications, and platform capability reporting.

The current interface has fire-and-forget saves. A custom text editor needs a deliberate ownership contract for:

- Visual edits versus the VS Code text document and its dirty state.
- Ctrl+S, Save As, revert, external text edits, undo/redo, and close/reopen.
- V2 undo history versus VS Code document history, without reinitializing v2 on every visual edit.
- Draft recovery and metadata sidecars associated with the correct full document URI.
- Concurrent saves and stale responses.

Use the VS Code document/edit APIs for authoritative LML content; do not directly overwrite unsaved editor text through an independent filesystem save path. Preserve the v2 semantic serializers regardless of the host persistence mechanism.

### 4. Existing LML Runtime

The v2 API service calls these workflow management endpoints:

- `schemas/{name}/contents/schemaTree`
- `mapTransformations`
- `generateXslt`
- `maps/{xsltFilename}/testMap`

The existing host starts a Functions design-time process through `FxWorkflowRuntime.ts`. Its startup depends on Logic Apps settings/project detection, runtime assets, process helpers, and extension-global state. Copying that file alone will not provide a standalone runtime.

Required work:

1. Identify and pin the existing workflow runtime/bundle containing those endpoints, its compatible Functions host/worker prerequisites, and redistribution/provisioning permissions.
2. Prove it operates without the Logic Apps extension installed or a full Logic App project.
3. Reuse/extract narrow startup/configuration/readiness/process-cleanup services, or declare an explicit installed prerequisite if distribution is not viable.
4. Host the existing API client behind a request bridge or inject an `IDataMapperApiService` proxy using `InitOtherDMService`. Preserve API behavior; do not implement a replacement compiler.
5. Scope runtime ownership by project, allocate ports safely, cancel work on disposal, reject stale revisions, and restart/reconstruct only owned runtime state.
6. Preserve existing platform restrictions until separately verified. Do not assume BTM's supported runtime automatically supports LML testing.

Runtime viability is the first blocking gate. If it cannot be proven, revisit hosting/distribution explicitly; do not fall back to compiling LML through v3's BTM worker.

### 5. Project-Local Runtime and Asset Adapter

The existing LML host expects `Artifacts/Schemas`, `Artifacts/MapDefinitions`, `Artifacts/Maps`, and custom assets under `Artifacts/DataMapper/Extensions`. The canonical v3 project uses root map files, `Schemas`, and `__generated`.

Recommended approach: retain the canonical project layout and host the runtime in the same project's `workflow-designtime` folder. This is not a separate project. Do not maintain two editable copies or add a user-facing root Artifacts folder.

First verify whether the existing runtime supports configuring schema and generated-map roots to use the canonical directories directly. If supported, prefer those mappings. If its Artifacts layout is fixed, an explicit fallback is an adapter-owned compatibility tree under `workflow-designtime/Artifacts`, with `ProjectDirectoryPath` targeting that internal runtime root. Both choices require a real schema-tree/generate/test proof; setting the process working directory alone is insufficient. No runtime/compiler implementation changes are assumed by this plan.

- If compatibility staging is required, derive the schema directory topology and current LML/custom assets from the canonical files inside the design-time folder only. Keep this rebuildable and out of source discovery.
- Resolve LML schema headers relative to the schema root, not by blindly prefixing every name with `Schemas/`.
- Preserve schema names/paths and namespace identity across the service response and subsequent v2 serialization.
- Map full project/document identities to collision-safe runtime names, including maps with the same basename or BTM/LML maps with matching names.
- Generate XSLT for the current revision, write it to the runtime's expected Maps location, then test that exact artifact. The test API consumes a named XSLT file, not raw current LML.
- Invalidate derived artifacts after schema/custom-asset changes, rebuild any staging after restart, and expose authoritative generated outputs under `__generated` without changing BTM output naming.
- Clean up only adapter-owned files/processes. Respect workspace trust before loading executable custom functions.

## LML Import Algorithm

1. Detect `.btm` versus `.lml` from the selected file. Leave the existing BTM planner unchanged.
2. Read LML with the authoritative compatible loader and validate required schema headers before writing anything.
3. Resolve `$sourceSchema` and `$targetSchema` using the original Logic Apps project context when available, explicit references, and user-assisted location of missing files. Do not guess ambiguously by basename.
4. Gather the dependency closure: local XSD imports/includes, JSON schema references where supported by v2, and required custom XSLT/function assets. Identify metadata and draft companions using existing host conventions.
5. Plan collision-safe copies under `Schemas`, preserving relative topology and schema identities. Preserve JSON `$id`/base-URI and reference-fragment semantics; copying filenames alone is insufficient.
6. Define explicit behavior for missing files, cycles, namespace-only XSD imports, `xs:redefine`, remote references, paths outside the source tree, and dependencies on different drives. The BTM helper does not establish support for all of these.
7. Stage writes, validate the relocated references, obtain required conflict/trust decisions, then commit the import atomically with rollback on failure/cancel. Do not silently overwrite an existing project's schemas.
8. Relocate only the necessary LML schema header values using compatible document-preserving YAML handling. Do not generically parse/dump the complete map body.
9. Keep the `.lml` extension, copy applicable companions, register it in the shared tree, and open the LML editor. Preserve the original source files.

Important compatibility detail: the current package and host loading helpers differ. The host preprocesses quoted literals and repeated `$for`/`$if` keys before parsing. Establish one authoritative compatible loading path and parity cases before import/save work; generic YAML parsing is not an adequate substitute.

Custom function binaries and custom XSLT are dependencies of the imported map, not BTM functoids. Inventory, resolve, and report them explicitly; never auto-execute imported code outside the workspace trust policy.

## Presentation and Command Routing

- Share project navigation and visual conventions, not a common map model.
- Start by mounting the unmodified v2 editor in the new LML webview to establish semantic parity.
- Then add narrowly scoped public layout/theme hooks where needed to match v3's palette/schema/canvas/toolbar arrangement. V2 currently renders schema panels as part of its React Flow graph; styling a wrapper alone cannot guarantee an identical layout.
- Reuse v2 node/function configuration and graph interaction behavior. Do not bind the BTM `MappingCanvas` or `MapperAppController` directly to LML objects.
- Route common commands through the active document's editor implementation. Gate format-specific options by capability; hide BTM-only commands in LML mode and vice versa.
- New Map remains BTM even when an LML document is active.

## Delivery Sequence and Gates

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| 0. Runtime feasibility | Project-local `workflow-designtime` host, artifact-path adapter and pinned prerequisites | Schema tree, function manifest, generation, and test work against root LML / `Schemas` / `__generated` without the Logic Apps extension or moving canonical files. BTM works with this process stopped. Otherwise stop and resolve distribution/hosting. |
| 1. Package integration | Separate LML webview/provider using the existing v2 package | A packaged VSIX opens an LML sample with its original functions/schemas; no BTM startup dependency or styling leakage. |
| 2. Portable import | LML planner, schema/custom-asset closure, metadata/draft handling, runtime layout adapter | Import survives moving/reopening the project; conflicts/cancel cannot damage existing assets. |
| 3. Document lifecycle | Save/draft/metadata bridges, text synchronization, revision identity | Edit/save/reopen, Ctrl+S, undo/redo, revert and Save As preserve v2 semantics without text/state races. |
| 4. Runtime execution | Generate/export/test through the existing LML service | Generated behavior matches existing v2 samples, and tests cannot execute stale or another map's XSLT. |
| 5. Presentation | V3-style LML layout with v2 semantic components | Required look/interaction achieved through presentation hooks; no BTM model conversion or function reimplementation. |
| 6. Coexistence | Shared discovery and active-editor commands | Two LML editors and one BTM editor remain isolated; New Map and existing BTM import/save/compile/test stay unchanged. |

Use existing v2 serializer/deserializer coverage for loops, conditions, quoted literals, functions, namespaces, and schema identities. Add focused host/import/runtime checks where needed during implementation; a separate styling regression suite is not required for this plan.

## Open Decisions Before Implementation

1. Runtime distribution: bundle/provision the existing runtime or require an explicit installed prerequisite; identify supported versions and platforms.
2. Confirm presentation fidelity: v3-style LML editor using v2 components is recommended; an identical rendering surface would require additional presentation work, not just package wiring.
3. Choose document/draft/undo ownership and recovery behavior while preserving the original v2 serialization semantics.
4. Agree on remote-reference/custom-code dependency policy and whether incomplete imports are rejected or explicitly marked unresolved.

XML/JSON support for imported LML should follow the existing v2 capabilities. This does not broaden the XML-to-XML BTM New Map flow.

## Non-Goals

- LML-to-BTM or BTM-to-LML conversion.
- A new LML compiler, serializer, function library, or schema parser in v3.
- Reusing BTM numeric functoid IDs for v2 functions.
- Pulling in the whole Logic Apps extension as an accidental dependency.
- Broad v2 semantic refactoring or unrelated package upgrades.
- Changing the existing BTM compiler/runtime or imposing the LML runtime on BTM users.

No production code was changed, and no LML runtime/compilation execution was performed as part of this investigation. Runtime independence and packaged dependency closure remain to be proven in Phase 0/1.