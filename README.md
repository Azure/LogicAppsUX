# Azure Logic Apps UX Monorepo

Welcome to the monorepo for the user experience (UX) components and tools for [Azure Logic Apps](https://learn.microsoft.com/azure/logic-apps). This repository contains the core UI libraries, standalone designer, documentation site, and VS Code extension for authoring and managing Logic Apps with a modern, extensible user experience.

## Getting Started

Documentation for getting started, including setup and usage, can be found at: [https://aka.ms/logicappsux](https://aka.ms/logicappsux)

If you're interested in contributing or running components locally, see the specific README files inside relevant applications and libraries (e.g., `apps/Standalone`, `apps/docs`, etc.).

## Repository Structure

This repository is organized as a PNPM-powered monorepo with Turborepo for managing builds and dependencies. Key directories include:

- **apps/**
  - **Standalone/**: The standalone Logic Apps Designer (React, TypeScript, Vite).
  - **docs/**: Documentation website (built with Docusaurus).
  - **vs-code-designer/**: VS Code extension for Logic Apps Designer.

- **libs/**: Shared libraries and UI packages used across applications.

- **e2e/**: End-to-end testing setup.

- **Localize/**: Localization resources.

See each application's README for more details and setup instructions.

## AI-Assisted Development (Knowledge Graphs)

This repo uses [Graphify](https://graphify.net/) to maintain per-library knowledge graphs that map code structure, identify core abstractions, and surface cross-file relationships. These graphs help both AI coding assistants and developers navigate the codebase structurally instead of grepping blindly.

### What's in the graphs

Each library has a `graphify-out/` directory inside `src/` containing:

| File | Purpose |
|------|---------|
| `GRAPH_REPORT.md` | God nodes (most-connected abstractions), communities, surprising connections, suggested questions |
| `graph.json` | Full queryable graph — nodes, edges, communities, confidence scores |

**Current library graphs:**

| Library | Nodes | Edges | God Nodes (top 3) |
|---------|-------|-------|--------------------|
| designer-v2 | 2,314 | 3,210 | `getOperationSettings` (52), `getReactQueryClient` (45), `initializeOperationDetails` (24) |
| designer | 2,410 | 3,370 | `getOperationSettings` (52), `getReactQueryClient` (45), `initializeOperationDetails` (25) |
| designer-ui | 1,228 | 964 | See `libs/designer-ui/src/graphify-out/GRAPH_REPORT.md` |
| logic-apps-shared | 1,242 | 1,876 | See `libs/logic-apps-shared/src/graphify-out/GRAPH_REPORT.md` |
| data-mapper-v2 | 446 | 488 | See `libs/data-mapper-v2/src/graphify-out/GRAPH_REPORT.md` |
| a2a-core | 408 | 417 | See `libs/a2a-core/src/graphify-out/GRAPH_REPORT.md` |
| chatbot | 22 | 5 | See `libs/chatbot/src/graphify-out/GRAPH_REPORT.md` |
| vscode-extension | 51 | 38 | See `libs/vscode-extension/src/graphify-out/GRAPH_REPORT.md` |

### How graphs stay up to date

Graphs are **auto-rebuilt by CI** via the `update-knowledge-graphs.yml` GitHub Action whenever TypeScript source files change on `main`. No manual action needed — pull latest main and the graphs are current.

### AI assistant integration

Graphs work automatically with AI coding tools — no per-user setup required:

| Tool | How it picks up graphs | Setup needed? |
|------|----------------------|---------------|
| **GitHub Copilot CLI** | `.github/copilot-instructions.md` | None — reads from repo |
| **VS Code Copilot Chat** | `.github/copilot-instructions.md` | None — reads from repo |
| **Claude Code** | `CLAUDE.md` | None — reads from repo |
| **Cursor** | Add `.cursor/rules/` if needed | Optional |

### Optional: CLI queries (power users)

For interactive graph queries, install the Graphify CLI:

```bash
# One-time setup — installs graphify CLI + Copilot CLI skill
pnpm run graphify:setup

# Query the graph
graphify query "how does the serialization pipeline work?" \
  --graph libs/designer-v2/src/graphify-out/graph.json

# Trace shortest path between two abstractions
graphify path "serializeWorkflow" "BJSDeserializer" \
  --graph libs/designer-v2/src/graphify-out/graph.json

# Explain a god node and its neighbors
graphify explain "getOperationSettings" \
  --graph libs/designer-v2/src/graphify-out/graph.json

# Generate interactive HTML visualization (open in browser)
cd libs/designer-v2 && graphify update src/
open src/graphify-out/graph.html
```

### Manual rebuild

If you need to rebuild graphs locally (e.g., on a feature branch before CI runs):

```bash
# Rebuild all libs (pure AST extraction, no LLM, runs in seconds)
pnpm run graphify:rebuild

# Rebuild a specific lib
pnpm run graphify:rebuild -- designer-v2
```

Requires Python 3.10+ and `pipx install graphifyy`. The `pnpm run graphify:setup` command handles both.

### Before & after: Real examples from this repo

#### "What are the core abstractions in designer-v2?"

**Prompt:** *"What are the most important functions and abstractions in the designer-v2 library? Rank them by how central they are to the codebase."*

| | Without Graphify | With Graphify |
|---|---|---|
| **Approach** | Grep for exports → read 10+ key files → build mental model | Read `GRAPH_REPORT.md` → god nodes listed with edge counts |
| **Files read** | 10-15 files (store, providers, serializer, slices, etc.) | 1 file |
| **Lines scanned** | ~9,351 lines across key files | ~3,235 lines (full report) or ~12 lines (god nodes section) |
| **Tokens consumed** | ~37,000 | ~200 (god nodes section only) |
| **AI turns needed** | 3-5 (explore → read → synthesize) | 1 |
| **Answer quality** | Depends on which files the AI happens to read | Definitive — ranked by actual connectivity |

**With Graphify, the answer is immediate:**
```
God Nodes (most connected):
1. getOperationSettings()         — 52 edges
2. getReactQueryClient()          — 45 edges
3. isNullOrUndefined()            — 32 edges
4. initializeOperationDetails()   — 24 edges
5. getOperationManifest()         — 21 edges
```

#### "What depends on getOperationSettings?"

**Prompt:** *"I need to understand the full dependency chain of `getOperationSettings()`. What calls it, what does it call, and what consumes its output?"*

| | Without Graphify | With Graphify |
|---|---|---|
| **Approach** | `grep -rn "getOperationSettings"` → 15 matches → read each file for context | `graphify explain "getOperationSettings()"` |
| **Files read** | 15 files × 200-500 lines each | 0 files — structured output from graph |
| **Tokens consumed** | ~8,000-30,000 | ~800 |
| **What you get** | Line matches with no relationship context | 52 typed connections: callers, callees, with EXTRACTED/INFERRED tags and source locations |

**With Graphify:**
```
Node: getOperationSettings()
  Source:    settings.ts L130 | Community: 8 | Degree: 52
  --> initializeOperationDetails()        [calls] [INFERRED]
  --> initializeOperationDetailsForManifest() [calls] [INFERRED]
  --> isSplitOnSupported()                [calls] [EXTRACTED]
  --> isRetryPolicySupported()            [calls] [EXTRACTED]
  --> isConcurrencySupported()            [calls] [EXTRACTED]
  ... and 47 more with source locations
```

#### "What are the surprising/hidden couplings in the codebase?"

**Prompt:** *"What are the non-obvious dependencies in designer-v2? Show me cross-module connections that a developer wouldn't expect from the directory structure alone."*

| | Without Graphify | With Graphify |
|---|---|---|
| **Approach** | Impossible with grep — requires reading hundreds of files and mentally cross-referencing import graphs | Listed in GRAPH_REPORT.md "Surprising Connections" section |
| **Tokens consumed** | 80,000+ (if even attempted) | ~200 |
| **Time** | 5-10 minutes across multiple AI turns | Instant |

**With Graphify (from the actual report):**
```
Surprising Connections:
- DesignerReactFlow() --calls--> useNotes()
  ui/DesignerReactFlow.tsx → core/state/notes/notesSelectors.ts

- usePanelTabs() --calls--> useSettingValidationErrors()
  ui/panel/nodeDetailsPanel/usePanelTabs.tsx → core/state/setting/settingSelector.ts

- onComboboxMenuOpen() --calls--> loadDynamicValuesForParameter()
  ui/panel/.../parametersTab/index.tsx → core/utils/parameters/helper.ts
```

These are the hidden couplings that cause unexpected bugs when you change "unrelated" code.

#### Response quality: Real side-by-side test

We gave two AI agents the exact same prompt. One explored blind (grep/view only), the other started with the knowledge graph.

**Prompt given to both agents:**
> *"I need to change how operation settings are resolved. What will I break and what's the safest way to approach this?"*
>
> The library is at `libs/designer-v2/src/`. Focus on giving a concrete, actionable answer — what files, what functions, what dependencies. Be specific about what you're confident about vs what you might be missing.

The blind agent was limited to ~10 tool calls (grep/glob/view). The graph agent was instructed to read `GRAPH_REPORT.md` and run `graphify explain "getOperationSettings()"` before exploring further.

| Dimension | Without Graphify | With Graphify |
|-----------|-----------------|---------------|
| **Call sites found** | 5 (missed 3 — agent.ts, swagger, MCP) | 8 (exhaustive — verified against graph's degree-52) |
| **Confidence in completeness** | "Less confident about cross-library consumers" | "8 call sites are exhaustive (grep-verified, matches graph degree)" |
| **Structural insight** | Noticed settings slice is "surprisingly thin" | Identified Community 8 as a tightly coupled cluster of ~30 helpers — changes inside are contained |
| **Hidden risk identified** | Flagged serializer as "most fragile dependency" | Flagged same + explained WHY: `serializeSettings()` is the inverse of `getOperationSettings()` — asymmetric changes silently lose data |
| **Downstream chain** | Found 5 consumers | Found same 5 + explained the community boundary between settings (Community 8) and parameters (Community 0) |
| **Approach recommendation** | Correct but generic (3 scenarios) | Same 3 scenarios + specific rationale: "~30 helpers are internal to settings.ts and only called by getOperationSettings()" |
| **Time to answer** | ~4 minutes (10 tool calls exploring) | ~2 minutes (2 tool calls: read report + explain node) |

**The key difference isn't speed — it's completeness and confidence.** The blind agent missed 3 of 8 call sites because it hit its exploration budget. The graph agent found all 8 and could verify completeness against the graph's known edge count. When an AI tells you "this is the full list" vs "I might be missing some" — that's the difference between a safe refactor and a broken deploy.

#### Implementation quality: Planning a new feature

We gave two AI agents the exact same implementation prompt. One explored blind, the other started with the knowledge graph.

**Prompt given to both agents:**
> *"Add a new 'timeout' host option to designer-v2 that lets the host configure a default timeout (in seconds) for all HTTP actions. When set, the designer should pre-populate the timeout setting for any new HTTP action added to the canvas."*
>
> The library is at `libs/designer-v2/src/`. DO NOT write the code — produce an implementation plan: which files need to change and why, the sequence of changes, which existing patterns to follow, what tests to add/update, and risks/edge cases.

The blind agent was limited to ~12 tool calls. The graph agent was instructed to read `GRAPH_REPORT.md`, run `graphify explain` on `getOperationSettings()` and `initializeOperationDetails()`, and query `"how are host options used in designer"` before exploring further.

| Dimension | Without Graphify | With Graphify |
|-----------|-----------------|---------------|
| **Files identified** | 5 files to change | 7 files to change (caught `agent.ts` and `mcp/utils/helper.ts` — two add-operation paths the blind agent missed entirely) |
| **Pattern discovery** | Found `requestOptions` pattern but had to guess about similar patterns | Identified `maxWaitingRuns` as the closest precedent by name from the graph report — exact same host-option-to-settings pattern |
| **Call site completeness** | Found 3 call sites in `add.ts` but missed `agent.ts:274` and `mcp/utils/helper.ts:109` | Found all 5 call sites — graph's `initializeOperationDetails` node (24 edges) mapped the complete call chain |
| **Deserialization safety** | Flagged the risk but said "not explored" — couldn't verify it was safe | Verified: "operationdeserializer.ts path always has `operation` defined, so it's safe" — confirmed from the graph that deserialization and add-operation are separate communities |
| **Dual-timeout confusion** | Missed the distinction between action timeout (`Settings.timeout`) and request timeout (`Settings.requestOptions.timeout`) | Called it out explicitly as a high-severity risk: "There are TWO timeout settings — clarify with product which one" |
| **Pseudocode provided** | No | Yes — exact code block for the `requestOptions` change with ISO 8601 conversion |
| **Risks identified** | 6 risks, 2 marked "guessed" | 6 risks, all verified against the graph + code. Honest about the 1 gap (serialization path not inspected) |

**The implementation difference:** The blind agent produced a plan that would compile and mostly work — but would silently miss HTTP actions added via the agent tool path and MCP path. Those would get no default timeout while regular HTTP actions would. The graph agent's plan covers all paths because the graph showed all 5 entry points into `getOperationSettings()`. That's the difference between a feature that works in the happy path and a feature that works everywhere.

### Use cases: How knowledge graphs improve AI-assisted development

#### 1. Onboarding — "Where do I even start?"

Instead of asking an AI assistant to explore a 96K-line library blind, point it at the graph report:

```
Read libs/designer-v2/src/graphify-out/GRAPH_REPORT.md and tell me the top 5
most important abstractions in this library and how they relate.
```

The report immediately surfaces `getOperationSettings` (52 edges), `getReactQueryClient` (45 edges), and `initializeOperationDetails` (24 edges) as the core of the system — no grepping needed.

#### 2. Architecture questions — "How does X connect to Y?"

```bash
# How does the operation settings system connect to the broader codebase?
graphify explain "getOperationSettings()" --graph libs/designer-v2/src/graphify-out/graph.json
```

Output shows all 52 connections — which functions call it, which modules depend on it, extracted vs inferred relationships with confidence scores and source locations.

```bash
# What's the shortest path between serialization and the React Query cache?
graphify path "serializeWorkflow()" "getReactQueryClient()" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

#### 3. Impact analysis — "What breaks if I change this function?"

Before refactoring a god node, check its graph neighborhood:

```bash
graphify explain "parameterValueToString()" --graph libs/designer-v2/src/graphify-out/graph.json
```

This reveals 17 direct connections — every caller and callee. Your AI assistant can then scope the refactor precisely instead of doing a broad grep that misses indirect dependencies.

#### 4. Bug investigation — "Why is this UI component reading from that Redux slice?"

```bash
graphify query "what connects panel UI to Redux state" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

Returns the exact selector chain: `panelSelectors.ts` → `useOperationPanelSelectedNodeId()` → panel slice. Shows which community each belongs to, revealing whether the coupling is intentional (same community) or surprising (cross-community bridge).

#### 5. PR reviews — "Does this change touch a god node?"

The `GRAPH_REPORT.md` lists the top god nodes with edge counts. If a PR modifies `getOperationSettings` (52 edges) or `initializeOperationDetails` (24 edges), reviewers know it's high-impact. AI assistants reading the report can flag this automatically.

#### 6. Cross-library dependency understanding

```bash
# What are the core abstractions in the shared library?
graphify explain "getReactQueryClient()" --graph libs/logic-apps-shared/src/graphify-out/graph.json

# Compare god nodes between v1 and v2
diff <(grep "God Nodes" -A 12 libs/designer/src/graphify-out/GRAPH_REPORT.md) \
     <(grep "God Nodes" -A 12 libs/designer-v2/src/graphify-out/GRAPH_REPORT.md)
```

#### 7. New feature planning — "Where should I add this?"

Ask your AI assistant with graph context:

```
I need to add a new panel type for workflow annotations. Based on the graph
report in libs/designer-v2/src/graphify-out/GRAPH_REPORT.md, which community
should this live in and what existing patterns should I follow?
```

The community structure tells the assistant where similar features cluster, and the god nodes tell it which abstractions to integrate with.

#### 8. Discovering surprising connections

The `GRAPH_REPORT.md` has a "Surprising Connections" section that flags unexpected cross-file or cross-community edges. For designer-v2, this surfaced:

- `DesignerReactFlow()` → `useNotes()` — UI component reaching into notes state
- `usePanelTabs()` → `useSettingValidationErrors()` — panel tabs coupled to settings validation
- `onComboboxMenuOpen()` → `loadDynamicValuesForParameter()` — UI event triggering parameter loading

These are the hidden couplings that cause unexpected bugs when you change "unrelated" code.

### How it works under the hood

Graphify runs a three-stage pipeline on each library:

1. **AST extraction** (Tree-sitter) — Parses TypeScript/TSX files to extract classes, functions, imports, call graphs, and docstrings. This is deterministic and fast (~seconds for 600+ files).
2. **Graph construction** (NetworkX) — Merges all extracted nodes and edges into a graph. Infers additional relationships from import chains and call patterns (tagged `INFERRED` with confidence scores).
3. **Community detection** (Leiden algorithm) — Clusters the graph into communities by edge density. No embeddings or vector DB needed — the graph topology IS the similarity signal.

Every relationship is tagged: `EXTRACTED` (found in source), `INFERRED` (reasonable inference, with confidence 0-1), or `AMBIGUOUS` (flagged for review). You always know what was found vs guessed.

## Scripts & Tooling

- **Monorepo management:** [PNPM](https://pnpm.io/) (`pnpm-workspace.yaml`), [Turborepo](https://turbo.build/).
- **Code style and linting:** ESLint, Prettier, EditorConfig.
- **Testing:** Vitest, Playwright (for E2E).
- **CI/CD:** GitHub Actions workflows in `.github/workflows` and Azure Pipelines.

## Contributing

We welcome contributions and suggestions! Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution. For details, visit [https://cla.opensource.microsoft.com](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide a CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/).

## Support

- For help and support, see [SUPPORT.md](SUPPORT.md).
- Security issues: Please review our [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [MIT License](LICENSE.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Any use of third-party trademarks or logos are subject to those third-party's policies.

---

> For more information, please refer to the official Azure Logic Apps documentation: [https://learn.microsoft.com/azure/logic-apps](https://learn.microsoft.com/azure/logic-apps)