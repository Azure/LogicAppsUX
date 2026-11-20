# Designer UI v2 — shared presentation

`@microsoft/designer-ui-v2` is a host-neutral Fluent v9 presentation library organized by component family. Its `nodes` family consolidates existing Otto presentation for **default-off integration** in designer-v2. The manifest version `5.110.0` matches sibling source manifests, and the package is eligible for the repository's existing coordinated release. Release eligibility is not evidence of publication or complete runtime, visual, legal, OSS, accessibility, or public design sign-off.

## Library-local Storybook

Run these commands **from the repository root**:

```sh
pnpm --filter @microsoft/designer-ui-v2 storybook
pnpm --filter @microsoft/designer-ui-v2 typecheck:storybook
pnpm --filter @microsoft/designer-ui-v2 build:storybook
```

`storybook` is a **user-run** dev command on port **6006**, with `--no-open`.
The typecheck and static build create no listener. Static output is the ignored
`libs/designer-ui-v2/storybook-static/` directory. The inventory regression check
is `pnpm --filter @microsoft/designer-ui-v2 test:storybook-inventory`.
It uses the installed TypeScript compiler to reconcile actual public runtime
exports with explicit visual/nonvisual classifications; new unclassified values
fail until classified. It also checks exact visual metadata coverage and
supported public imports, while excluding type-only exports from runtime counts.

Start with **Start here / Introduction** and **API and boundaries**. All **37**
public visual exports (including `DesignerUiScope` and both condition icons)
have individual typed metadata, native Overview docs, and supported examples.
The API page documents all **31** nonvisual runtime exports and public types without
inventing UI for helpers or metrics. Add/collapse/selection/dismissal examples
show visible local state; they are not workflow execution or a fake backend.

The toolbar keys are `theme` (`light`, `dark`) and `direction` (`ltr`, `rtl`).
The decorator pairs real Fluent web light/dark themes with the matching
`DesignerUiScope`/outlet, setting both **FluentProvider.dir and DOM dir**.
Scope and running-status examples report actual browser `matchMedia` values for
reduced motion and forced colors. Change OS/browser media emulation to test
them; no CSS-only toolbar pretends to emulate either preference.

Storybook and `tsconfig.storybook.json` resolve only the exact root and
`/metrics` public specifiers directly to current source. No prior library build
or new package subpath is required. Storybook dependencies are dev-only; stories
and configuration stay outside `src/`, production bundle entries, declarations,
package files and coverage. Storybook does not change feature defaults, exports
or runtime dependencies. No host, XYFlow, Redux, DnD, auth or backend is required.

The Accessibility panel and keyboard play stories aid review, but a successful
build/typecheck is **not browser or accessibility verification**. Actual
light/dark, RTL, focus/hover/Escape, disabled controls, reduced motion and forced
colors need browser validation. Default-off integration, legal, host measurement
and two-host acceptance boundaries below remain separate from release eligibility.

## Source inventory and provenance

Read-only reference: Otto `portal/src/components/Nodes` and actual `WorkflowDesigner/nodes/next` and edge consumers, revision `3393993399a18cbb8d42f9efa0c7d2cca2ec2eb9`. The following source supports flag-only integration; **file-level public OSS/legal and design approval remains separate**.

| Candidate source | Local presentation |
|---|---|
| `cards/{ActionNodeCard,TriggerNodeCard,ConditionNodeCard,AgentNodeCard,ToolItemCard}.tsx`, `cards/shared.ts` | Same named compositions and typed props; action/trigger can suppress visual dots for host handles |
| `cards/{AgentToolsPanel,NodeHoverCard,NodeInfoCard}.tsx` | Controlled tools, delayed hover/focus descriptions, scoped popovers, safe documentation links and existing action slots |
| `primitives/{NodeCard,NodeCardBody,NodeHandle,NodeIconTile,NodeText,NodeStatusBadge,NodeTestDataIndicator}.tsx` | Shell/body/footer, orientation, slots, selection, live run state and test-data indicators |
| `primitives/{NodeToolConnector,NodeLabeledHandle,NodeBranchOutputs,NodeLine,NodeActionAdd,IfIcon}.tsx` | Stable connector, branch-caption outputs, line, add and glyph dependency closure |
| `proposed/{LoopNodeCard,NodeFrame,NodeMergePoint,PlaceholderTriggerCard}.tsx` | Existing loop, frame, merge and empty-trigger source, included because actual Otto adapters consume it |
| `WorkflowDesigner/{edges/EdgePillButton,nodes/CollapseChip}.tsx`, terminal add control | Existing reveal, terminal insertion and collapsed-role presentation, extracted without graph/store dependencies |
| `glyphs.ts`, `types.ts`, `nodeMetrics.ts` | Finite canonical visual-kind glyph pairs, presentation vocabulary and React-free structural metrics |
| Node surface values in Otto `theme/ottoTokenValues.ts` | Only node palette values, renamed to scoped `--designer-ui-v2-*`; no app/global theme or font implementation |

**Intentional accessibility difference from the admitted reference:** `NodeText`
subtitles use Fluent `colorNeutralForeground2` instead of `colorNeutralForeground3`.
The original stock light Agent caption measured 4.25:1 on its unchanged surface,
below the 4.5:1 normal-text requirement. The corrected caption measures 6.9:1 in
stock light and 12.4:1 in stock dark. Title color, typography, geometry and node
surface values are unchanged. Custom host themes still require their own
contrast verification.

Excluded: `NodeBodyToggle` (no verified runtime dependency), CoreAI code/assets/default hooks, Aptos, MCP SVG, Otto models/stores/aliases/services/real graph handles, layout engines, and application mutation/adapters. MCP preserves its canonical public Fluent Regular/Regular fallback and brand suppression. No Otto files were modified. Otto still consumes its local source; cross-repository migration is not complete until that host imports the shared package.

**Unverified acceptance:** written file-level OSS/legal clearance (MIT declaration is not clearance); public design acceptance; complete rendered interaction and matched two-host visual acceptance, including light/dark, RTL, forced colors and reduced motion; iframe/webview/CSP/clipping checks; feed/name/provenance and ownership/ruleset confirmation. Release eligibility does not establish that these checks passed.

Phase 1b additionally uses the pinned Otto baseline `2a3e8ef` for the incremental presentation ports. These references are provenance inputs, not redistribution clearance.

- [ ] File-level OSS/legal and attribution clearance.
- [ ] Public design and accessibility sign-off, including matched two-host visual acceptance.
- [ ] Verified package owner and review/ruleset policy.
- [ ] Registry/feed/name confirmation and a separately authorized publication.

Package-ready or packed-contract verified does **not** mean released. W10 performs no package publishing.

**Coordinated release:** Designer-v2 externalizes this runtime dependency, so UI-v2 must publish alongside it through the existing release workflow. `scripts/update-versions.js` includes both packages, and the root publish script builds libraries before `pnpm publish -r`. The UI-v2 manifest omits `private`, matching sibling libraries, so recursive publication does not skip it. Keep integration default-off; do not bundle or copy shared source to work around package distribution.

## Boundaries and APIs

The ESM root exports cards, stable primitives, typed string dictionaries, scoped tokens and `DesignerUiScope`. `@microsoft/designer-ui-v2/metrics` exports **React-free** `nodeMetrics`, `nodeHoverCardTiming`, `getSwitchNodeSize` and `getNodeLineArrowPath`, plus the type `NodeLineArrowDirection`. It has no React, Fluent or theme runtime/declaration dependency. `./package.json` exposes metadata. Workspace exports resolve to `src`; packed root and `/metrics` runtime/types resolve to `build/lib`, while the manifest remains at the package root. `files` includes only the built library. There are no supported source/build deep imports or per-family subpaths. Runtime dependencies are icons; required peers are React 18, ReactDOM 18 and public Fluent v9 components. No Fluent v8, localization framework, shared application library, Query, XYFlow or store dependencies.

```tsx
import { ActionNodeCard, DesignerUiScope } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';

<DesignerUiScope mode="dark">
  <ActionNodeCard
    title="Send request"
    subtitle="HTTP"
    selected
    handleAxis="vertical"
    role="button"
    tabIndex={0}
    aria-label="Send request operation"
    after={hostBadges}
  />
</DesignerUiScope>;
// host layout uses nodeMetrics.cards.action: { width: 232, height: 74 }
```

Cards forward DOM refs, HTML/ARIA attributes and events; hosts own keyboard navigation, DnD, graph roles, real handles, layout and dynamic measurements. `after` preserves host badges/controls. `AgentNodeCard` takes keyed `tools`, controlled `toolsExpanded`/`onToggleTools`, add callbacks and handle/footer slots; it already composes its own tools panel, so do not nest another `AgentToolsPanel` inside it. `ConditionNodeCard` takes If/Switch kind, ordered output slots, finite case count and taken-output index; If uses `NodeBranchOutputs`, while Switch defaults to `NodeOutputHandles`. Hosts supply real branch handles through slots. `LoopNodeCard`, `NodeFrame` and `NodeMergePoint` provide structural presentation. Widths are structural canvas geometry, not responsive page widths. Hosts must account for real Agent/model/tool/frame extents and actual ports together, rather than assigning a fixed whole-Agent height.

Action, Trigger, Condition, Loop and Agent accept `handles={false}` to suppress decorative ports for a navigation-only projection. The default remains `true`. For Agent this also omits its attached tool connector, but never removes actual supplied tools, the model footer or `after` content. This does not disable host-owned XYFlow handles automatically.

`getNodeGlyph(kind: NodeVisualKind)` returns canonical `{ regular, filled }` component constructors for fourteen finite visual kinds. Each host maps its raw operation identity to that vocabulary, then passes rendered icons into the existing `icon`/`selectedIcon` slots. Display names do not choose a type or glyph. Unknown built-ins use card defaults without manifest branding; connectors retain real pending/image/error behavior. Missing image URI is not a loading state. No workflow-type registry, loading schema or model-state API belongs in this package.

Each component accepts its relevant typed string dictionary, with `defaultNodeStrings` supplying English. New string keys are optional so old client dictionaries still compile. Strings are literal, including intentional empty values; parameterized tools headings are functions, never translated nouns concatenated into English grammar. Hosts perform localization. Icons are decorative unless explicitly meaningful; info tiles share the canonical category defaults. Standalone badges default to **a polite live region**; canvas composites explicitly opt out and hosts carry status in the owning card's accessible name. Controls preserve their canonical disabled-versus-omitted behavior; unavailable callbacks never leave an apparently active inert action. Links accept only absolute HTTP(S). Motion honors both OS reduced motion and `[data-reduce-motion="true"]`.

### Phase 1a/1b additive contracts

All added props are optional; omitted values retain the previous behavior.

| API | Optional props and defaults |
|---|---|
| `NodeStatusBadge` | `label` defaults to `strings[status]`; `detail` defaults to none; explicit empty `label` is preserved. `live=true` is the standalone default (`role="status"` with implicit polite semantics); `live=false` opts out. Explicit `role` takes precedence. Canvas composites opt out. Forwarded `aria-label` is host-supplied. The nine `NodeRunStatus` tones are frozen. |
| Cards, `NodeCard`, `NodeFrame` | `statusDisplay='badge'`; `statusTone`/`statusTint` default to frozen tone and no tint; `statusLabel` defaults to dictionary text; `statusAriaLabel` defaults to no badge-name override; `statusDetail` defaults to none; `inactive=false`. For `statusDisplay='contained'`, `NodeCard` exposes status context to `NodeText`, so hosts set status once (on `NodeCard`) and use `subtitleKind='status'` without duplicating status subtitle strings through adapters. Inactive ancestors provide `NodeInactiveContext` so nested inactive cards/handles/branch outputs do not compound the 0.4 opacity. The host supplies the card's `aria-label`. |
| `getNodeStatusLabel(status, strings?, detail?, label?)` | Returns `(label ?? strings[status])` plus a nonempty detail. Strings default to English; detail/label default to none. Hosts reuse this text when constructing the owning card's accessible name. |
| `NodeIterationPager` | Required `current`, `count`, `onChange` use zero-based indices; display/input is one-based. `editable=false`; `failed` omitted means no failed-jump controls; `strings` defaults to `defaultNodeIterationPagerStrings`. Invalid/nonpositive totals render nothing; indices and input are bounded. Run dispatch and failure evidence stay host-owned. |
| `NodeRunAfterIndicator` | Required `statuses` uses `succeeded`, `timedOut`, `skipped`, `failed`; fixed dot order is preserved. `collapsedCount` defaults to none (dots); when supplied it renders `×N`. `strings` defaults to `defaultNodeRunAfterStrings`, including the accessible summary. |
| `NodeLine` | `variant='solid'`, `length=85`, `orientation='horizontal'`, `state='default'`. `NodeLineState` is `default`, `taken`, `notTaken`, `highlighted`, `running`. Only canonical solid owns an arrow; running dashes become static under reduced motion. `getNodeLineStroke(variant, { state? } = {})` composes static state over `nodeLineStrokes`; it does not animate or infer evidence. |
| `NodeBranchLabel` | Required literal `label`; `tone='neutral'` (also success/danger); `state` omitted leaves it undimmed (also taken/notTaken); `action` defaults to none; `strings.taken` defaults to `defaultBranchTakenString`. Taken text is announced, not color-only. Position and action behavior belong to the host. |
| `NodeBranchOutputs` | `labels` defaults to English True/False; `slots` defaults to none; `activeIndex` omitted leaves all outputs undimmed; `takenLabel=defaultBranchTakenString`. These are host-provided branch captions, port slots and evidence. |
| `ConditionNodeCard` | `mode='multiOutput'`; trunk is opt-in for Switch only and has one visual tick with semantic slots retained. `caseCount=4`, `takenOutput` omitted; `action`, `inputSlot`, `outputSlots` default to none; `inputVariant` defaults to the neutral input handle. If preserves success/danger exits. |
| `NodeFrame` | `tone='neutral'`, `collapsed=false`, `subtitlePlacement='inline'`, `handles=false`, `handleAxis='horizontal'`, `showInputHandle=true`, `inputVariant='neutral'`, `headerAppearance='default'`, `motion='none'`. `actionCount`, `action`, `inputSlot`, `outputSlot`, `handleTop`, `handleLeft` default to none. Slots imply handles; hiding input does not remove output. Title omitted/empty means no header. Host-supplied border-relative offsets are compensated once for the thin border. `strings.frame` defaults to `defaultNodeFrameStrings`. |
| Control headers | `headerTint` opts into a Fluent family surface (scope, loop, condition, switch). `NodeBranchLabel.icon` opts into a decorative glyph in place of its tick and a tone-colored caption. `LoopNodeCard.density='compact'` preserves the loop width and uses the compact 52px/68px height for one/two title lines; pass `titleLines` from your layout. |
| `CollapseChip` | The default remains a count/chevron chip. A collapsed `summary` opts into a compact 208×68 card with a title, optional icon, unit-aware `countLabel` and up to three decorative thumbnails. Supply a localized accessible name and use the same compact dimensions in layout. |
| `collapseReveal` / `nodeHeaderButton` | Root exports `useCollapseReveal({ enabled=true, expanded, collapsedHeight, measureFull, apply, clear, motionRoot? })`; omitted motion root uses document preferences. Returns mounted/open/hidden presentation state. `COLLAPSE_REVEAL_EXPAND_MS=240`, `COLLAPSE_REVEAL_COLLAPSE_MS=180`; reduced motion settles instantly. `useNodeHeaderButtonStyles()` provides 20×20 header buttons, 16px icons and extended hit areas, not menus or commands. `NodeFrame.motion='reveal'` opts in; default collapse preserves mounted descendants. |
| `NodeMergePoint` | `showCircle=true`; false suppresses decoration without removing host convergence children. |
| `NodeHandle` / `NodeInputHandle` | `hoverable=true` on standalone/output handles; inactivity (own or inherited) disables hover emphasis. Input handles always set `hoverable=false`, even if a caller tries to override it. |
| `EdgePillButton` | `maskColor` defaults to none, preserving its existing background; a supplied canvas color masks the line beneath the pill without overriding forced-colors system paint. `onActivate` defaults to none, leaving a disabled affordance. The host supplies `isRevealed`, placement and the enlarged hit area. |
| `AgentNodeCard` | `toolsPlacement='below'`; side is opt-in only with `handleAxis='vertical'`, otherwise it falls back below. `toolsExpanded=true` through the panel; `onToggleTools`, `onAddTool`, `tools`, `toolsPanelSlot`, `footerAction`, input/output slots default to none. `onAddTool(anchor?: HTMLElement \| null)` receives the invoking button. `toolsPanelSlot` replaces, never duplicates, the built-in panel. Empty read-only Agents omit panel/connector; addable empty Agents expose Add tool. |
| `AgentToolsPanel` / `AgentToolsDecoration` | `expanded=true`, `surface='opaque'`; transparent is opt-in for split-layer hosts. `onToggleExpanded` and `onAddTool` default to none, omitting controls; `strings` defaults to the tools dictionary. Ref forwards the panel element. Controlled reveal uses collapse timings above; decoration paints the separate opaque background without owning tool nodes. |
| `NodeHoverCard` | `openDelay=600ms`, `closeDelay=200ms`, `disabled=false`; `externalFocusTarget` and `triggerRef` default to none. Keyboard-visible focus opens; programmatic/mouse focus does not. Escape/dismiss restores the owner without reopening. Presence of `NODE_HOVER_CARD_IGNORE_ATTRIBUTE` (`data-node-hover-card-ignore`, even empty) ignores pointer/focus on that subtree. Enabled `DesignerUiScope` coordinates its own hover group; a disabled boundary does not affect its parent group. |
| `NodeInfoCard` | `testData` defaults to none; presence replaces Configured and the ordinary description. `testData.description` defaults to localized/English test-data copy; `''` intentionally suppresses it. `footer` defaults to none and remains outside the two-line clamp. `onDismiss` omitted hides the 24×24 dismiss target. `learnMoreHref` omitted or non-HTTP(S) suppresses the link; safe links use `_blank` and `noopener noreferrer`. |
| `useEdgeActiveState()` | Local `isHovered`, `isActive`, `reset`, `wrapperProps`, `lineProps`; attach handlers to the host's line/control region. Activation is immediate from pointer or Fluent keyboard-visible focus; reset clears pointer only. No timer, routing or command behavior. |
| `lineGeometry` | `getNodeLineArrowPath(x, y, direction='right', size=nodeMetrics.lineArrowSize)` returns an open chevron path; directions also include down/left/up. Available at root and `/metrics`; no graph dependency. |

`nodeMetrics` includes `inactiveOpacity=0.4`, `lineArrowSize=3.18`, run-after slots (shared **44×16**, legacy **36×12**), terminal add **32×32** in a **44px** container with an **8px** stem (`terminalConnectionLength`). Tool connector metrics include diamond 12, gap 9, line/add 20 and side row 74; tools panels add sideOffset 10 and collapsedHeight 54. Info dismissal is 16px glyph / 24px target; edge controls use 24px pills, 32px hit targets and a 20px interaction stroke.

Palette roles `designerUiTokens.canvasBackground`, `nodeBorder`, and `nodeToolConnectorFill` map to scoped `canvas-background`, `node-border`, and `node-tool-connector-fill` overrides. Canvas falls back to Fluent `colorNeutralBackground1`, border to `colorNeutralStroke3`, and tool fill to the existing handle-background role then Fluent canvas. Disabled scopes write no overrides.

`DesignerUiScope` inherits the host font and Fluent provider/brand, sets variables only on its subtree, accepts typed `tokens` overrides, and owns a popover outlet in the same document. No `:root` writes, CoreAI provider, font assets, or inline script injection. The host must place the scope above clipping/transform boundaries; clipping and strict CSP still require real-host validation. It does not claim stock web-brand matches Azure-brand without visual review.

Keep Fluent `DialogSurface` on its native modal portal. Wrap shared presentation inside the dialog surface instead of mounting the modal into `DesignerUiScope`'s popover outlet; that outlet does not preserve the modal's stacking boundary.

## Designer-v2 local opt-in

Pass `useSharedNodeUi: true` in the existing public `DesignerProvider` **options**, not `hostOptions`. Omission/false retains legacy rendering and sizes. One presentation decision selects compatible ordinary/family/structural renderers, metrics, real ports and edge controls while preserving host workflow IDs/topology and ELK orientation. Accepted layout data owns presentation during asynchronous transitions, keeping each accepted renderer paired with its geometry. Notes and hidden structural objects retain their distinct host semantics, not an ordinary-card substitute. Real connection validation, monitoring, comments, pinning, secure I/O, static results, keyboard/DnD, menus and commands remain designer-v2 responsibilities.

Native-to-native layouts reuse only genuinely observed node dimensions through XYFlow's public `measured` data, without assigning inline fixed widths or heights. Returning from shared to native cards still requires cold measurement and handle refresh; the native wrapper can report `visibility: hidden` during callback-time sampling. This is a supported boundary, not an all-frame visibility or painted-frame guarantee. Initial mounts and subsequent real size changes retain native measurement behavior.

The shared default canvas uses the host Fluent `colorNeutralBackground1` role. An explicit `Designer.backgroundProps` object takes priority over that default and retains ownership of the custom `Background`; its properties are passed through as supplied, not merged with shared defaults.

The option remains false by default. This is not Otto migration, default rollout, or publication. Workflow positions are render-time; no definition-position migration is added.

The same option selects a canonical extraction preview at the designer-v2 consumer boundary. It reuses the actual child graph and remapped operation metadata with an isolated, navigation-only XYFlow provider. Whole controls and Agents stay opaque; real measured family sizes and hidden nonconnectable anchors determine edge geometry. Preview DOM IDs are namespaced without changing operation/graph IDs. Pan, zoom and fit do not edit the source or reset its viewport; metadata-only preview updates retain the user's viewport. False/omitted still uses the frozen legacy `designer-ui` preview. Existing extraction eligibility, persistence and nested definitions are unchanged.

Ordinary actions and triggers use the canonical Otto card compositions, including their respective action/trigger category and shape. Designer-v2 forwards real trigger identity, normalizes raw operation type/kind to shared glyph kinds and owns connector-brand metadata/lifecycle. Subtitles follow the canonical category/type composition (`Built-in · Compose`, `Trigger · Request`, `Azure · Office 365 Outlook`), with host-localized labels and intentional empty strings preserved. Rich hover receives resolved identity/description and is suppressed during selection, dragging and monitoring. Portalled info clicks do not select/open the underlying node.

The host Fluent provider must satisfy the package's public `@fluentui/react-components` peer (`^9.74.11`), including `borderRadius2XLarge`; no fixed-radius fallback is supplied. The minimum is the version actually verified with these cards, not a claim that every earlier Fluent v9 provider supplies the token. Standalone pins its already-used compatible `9.74.11` and deduplicates components and icons for both Vite serve and build. After changing these dependencies, restart the existing user-owned Vite process sequentially so prebundled provider/theme modules are refreshed.

Other consumers need their own dependency/provider check. In particular, `vs-code-react` resolves both its existing Fluent `9.70.0` and designer-v2's `9.74.11` with distinct context packages. This is an integration risk requiring a downstream build and real webview validation, not proof of a runtime failure and not authorization to upgrade another host silently.

Consumers that share a window must also align the Tabster core used by their direct imports and Fluent wrappers. This workspace pins the designer imports to `8.8.1` and bounds overrides to the older `react-tabster` wrapper versions that otherwise select an incompatible core. Workspace overrides are not shipped with a published package: an external consumer must verify its own resolved dependency graph and native modal focus behavior. The JSDOM 24 test cohort separately resolves NWSAPI `2.2.22` for the supported focus selector; that test dependency is not a browser-runtime requirement.

The admitted Otto revision's lock resolves React/ReactDOM `18.3.1` and direct Fluent components `9.74.5` under manifest range `^9.74.4`. That range permits the required Fluent version, but the frozen lock is below this package's peer floor. Future Otto consumption must align its lock and active provider before validation; React compatibility alone does not establish a successful unchanged installation. No Otto dependency change is included here.

Standalone Local Standard and Local workflow extraction reuse the public consumption service's complete offline Compose manifest only for Compose. Production Standard services are unchanged. Metadata fetching, settled missing metadata, and errors remain distinct: a missing image is not a request lifecycle state. Known built-in glyphs need no remote icon fetch, while missing manifests still use the host's existing explicit manifest error.

### Standalone opt-in (user-run host only)

In the existing Standalone **Local** designer-v2 host, open `https://localhost:4200/v2?useSharedNodeUi=true` and select **Local** in the existing settings if necessary. `/v2` is the current application route; `/designer-v2` is not that route. Only the exact query value `true` opts in. Omit the query parameter or use `useSharedNodeUi=false` for legacy cards. Existing query parameters, such as a local extraction workflow, can be combined with `&useSharedNodeUi=true`.

This query is passed to the public provider options, not persisted as a product setting and not added to `hostOptions`. It does not activate Azure-connected hosts. A user-approved Standalone host must be running for real-browser acceptance. No visual or legal/design sign-off is implied.

Standalone declares an icon version compatible with this library and deduplicates icon resolution in its regular and E2E Vite configurations. This prevents dependency scanning of linked legacy packages from selecting an older icon export surface.

The scope stays structurally mounted while disabled, without shared theme variables or an active shared outlet. Its layout-neutral host wrapper forwards the inherited canvas height and preserves child identity, draft/focus and the XYFlow viewport store during option changes.

### Standard integration and evidence

Standard deliberately keeps Switch **multiOutput** and Agent tools **below**; trunk and side are package capabilities, not host defaults. Only `/v2?useSharedNodeUi=true` enables shared presentation; omitted, `false`, `1`, `True` or `TRUE` remain legacy. Below placement preserves the existing DOM and emits no `data-tools-placement`; only side mode is marked. Verify below placement with panel/card geometry rather than an invented attribute.

- Recorded run files: **recorded fixture through the normal run loader; not a live backend run**.
- Store-injected runs: **simulated component state; not observed backend evidence**.
- Live backend acceptance requires a separately verified Azure run; neither of these deterministic surfaces proves it.

The write-only specs cover Standard topology/geometry/flag parsing, recorded Agent/Until paging and read-only restrictions, simulated Foreach/tool paging, and existing context/drag/notes/viewport commands. Tool/MCP failed jumps are not claimed: the current host failure source is scope-only.

User-owned browser validation, from root (not executed by W10):

```sh
pnpm run start:e2e
# After the server is ready, in a second terminal (local non-CI mode reuses it):
pnpm run test:e2e:designer e2e/designer/sharedNodeUiStandard.spec.ts e2e/designer/sharedNodeUiMonitoring.spec.ts e2e/designer/sharedNodeUiSimulatedRuns.spec.ts e2e/designer/sharedNodeUiCommands.spec.ts --project=chromium
```

The script selects `playwright.designer.config.ts`, whose base URL is `http://localhost:4200` and webServer command is `pnpm run start:e2e`. Library builds/typechecks, Storybook static builds and written assertions are not rendered-browser acceptance.

## Validation and contribution

Build follows siblings: source workspace exports, `publishConfig` redirects to `build/lib`, `tsup && tsc --emitDeclarationOnly`, ESM splitting/source maps, `sideEffects: false`. Test the actual packed manifest and isolated metrics closure before any publication.

Turbo schedules one shared `build:lib` prerequisite for both libraries' tests. Direct `test:lib` invocation requires building first because its metrics regression checks the emitted JavaScript and declaration closure, not just source exports.

```sh
pnpm --filter @microsoft/designer-ui-v2 build:lib
pnpm --filter @microsoft/designer-ui-v2 test:lib
pnpm --filter @microsoft/designer-ui-v2 typecheck:storybook
pnpm --filter @microsoft/designer-ui-v2 test:storybook-inventory
pnpm --filter @microsoft/designer-ui-v2 build:storybook
pnpm --filter @microsoft/logic-apps-designer-v2 build:lib
```

Independent review and real-host visual acceptance are separate gates, not developer self-certification. New contributions require approved inventory, string contracts, scoped theme, accessible interaction and metrics/tests. Legacy `designer-ui` remains untouched.

The unit suite separately checks additive prop/dictionary compatibility, built metrics dependency closure and build-only manifest targets. Inventory checks enforce exactly one typed visual story and classify every runtime export. An actual package pack/distribution check remains a release gate; source and build checks are not evidence of registry availability.

License metadata follows the repository's MIT convention; release eligibility does not establish provenance/attribution or redistribution approval.
