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