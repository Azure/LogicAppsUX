---
title: Graphify knowledge graphs
sidebar_position: 7
---

# Graphify knowledge graphs

Azure Logic Apps UX uses [Graphify](https://graphify.net/) to generate structural knowledge graphs for its largest TypeScript libraries. The graphs complement code search: they identify declarations and typed relationships, rank highly connected abstractions, group related code into communities, and surface connections that are easy to miss when navigating by directory.

Use Graphify to decide where to begin an investigation and which code deserves closer inspection. Always verify graph findings against source code before changing behavior, especially when a relationship is inferred or the graph predates the branch.

## Generated artifacts

Each supported library stores committed artifacts in `libs/<library>/src/graphify-out/`:

| Artifact | Use |
|---|---|
| `GRAPH_REPORT.md` | Human-readable summary with corpus statistics, graph freshness, god nodes, communities, surprising connections, import cycles, and suggested questions |
| `graph.json` | Machine-queryable nodes and edges with source locations, relationship types, communities, and confidence metadata |

Running `graphify update src/` inside a library also creates an interactive `graph.html` visualization. The repository automation commits only `GRAPH_REPORT.md` and `graph.json`.

### Supported libraries

The supported set is defined by both [`scripts/graphify-rebuild.sh`](https://github.com/Azure/LogicAppsUX/blob/main/scripts/graphify-rebuild.sh) and [`.github/workflows/update-knowledge-graphs.yml`](https://github.com/Azure/LogicAppsUX/blob/main/.github/workflows/update-knowledge-graphs.yml):

| Library | Report |
|---|---|
| `designer-v2` | [`libs/designer-v2/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/designer-v2/src/graphify-out/GRAPH_REPORT.md) |
| `designer` | [`libs/designer/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/designer/src/graphify-out/GRAPH_REPORT.md) |
| `designer-ui` | [`libs/designer-ui/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/designer-ui/src/graphify-out/GRAPH_REPORT.md) |
| `logic-apps-shared` | [`libs/logic-apps-shared/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/logic-apps-shared/src/graphify-out/GRAPH_REPORT.md) |
| `data-mapper-v2` | [`libs/data-mapper-v2/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/data-mapper-v2/src/graphify-out/GRAPH_REPORT.md) |
| `a2a-core` | [`libs/a2a-core/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/a2a-core/src/graphify-out/GRAPH_REPORT.md) |
| `chatbot` | [`libs/chatbot/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/chatbot/src/graphify-out/GRAPH_REPORT.md) |
| `vscode-extension` | [`libs/vscode-extension/src/graphify-out/GRAPH_REPORT.md`](https://github.com/Azure/LogicAppsUX/blob/main/libs/vscode-extension/src/graphify-out/GRAPH_REPORT.md) |

Node counts, edge counts, community counts, and god-node rankings change as source changes. Read the **Summary** and **God Nodes** sections in the current report instead of copying those values into long-lived documentation.

## Check graph freshness

Every report has a **Graph Freshness** section with the abbreviated commit used to build it. A report does not need to match `HEAD` when newer commits changed unrelated files. It is stale for an investigation when relevant TypeScript or TSX changed after that source commit.

The following check compares one report with the current branch:

```bash
library=designer-v2
report="libs/$library/src/graphify-out/GRAPH_REPORT.md"
built=$(sed -n 's/.*Built from commit: `\([^`]*\)`.*/\1/p' "$report" | head -1)

git show --no-patch --oneline "$built"

if git diff --quiet "$built"..HEAD -- \
  ":(glob)libs/$library/src/**/*.ts" \
  ":(glob)libs/$library/src/**/*.tsx"; then
  echo "Graph covers the current TypeScript sources"
else
  echo "Graph is stale for this branch; rebuild it before relying on completeness"
fi
```

For a quick conservative check, compare the report's commit with `git rev-parse --short HEAD`. A mismatch means “investigate freshness,” not necessarily “stale,” because unrelated repository changes also advance `HEAD`.

### Automatic rebuilds on `main`

The **Update Knowledge Graphs** workflow:

1. Runs after pushes to `main` that change `libs/*/src/**/*.ts` or `libs/*/src/**/*.tsx`.
2. Installs Python 3.13 and the `graphifyy` package.
3. Rebuilds all eight supported libraries with pure AST extraction; no LLM credentials or API keys are required.
4. Removes workspace-specific absolute paths from generated reports and JSON.
5. Commits changed `GRAPH_REPORT.md` and `graph.json` files with `[skip ci]`.

The workflow does not rebuild graphs on feature branches, for unsupported packages, or for changes outside its TypeScript and TSX path filters. Rebuild locally when branch-only changes matter to your analysis.

## AI assistant integration

Committed reports are ordinary Markdown and JSON, so humans and agents can use them without installing Graphify. Repository instructions tell assistants to read the relevant report before exploring a large library:

- [`docs/ai-setup/shared.md`](https://github.com/Azure/LogicAppsUX/blob/main/docs/ai-setup/shared.md) is the maintained shared source.
- [`.github/copilot-instructions.md`](https://github.com/Azure/LogicAppsUX/blob/main/.github/copilot-instructions.md) provides the generated repository instructions used by GitHub Copilot tools.
- [`CLAUDE.md`](https://github.com/Azure/LogicAppsUX/blob/main/CLAUDE.md) provides the generated Claude Code instructions.
- Package guidance under [`docs/ai-setup/packages`](https://github.com/Azure/LogicAppsUX/tree/main/docs/ai-setup/packages) links agents to package-specific reports.

Run `pnpm run ai:generate` after changing the AI setup sources. The optional Graphify setup below also installs a Copilot CLI skill for interactive graph commands; it is not required to read committed reports.

## Prerequisites and setup

Repository scripts require:

- Node.js 18 or later and PNPM 9 or later.
- Python 3.10 or later.
- `pipx`, which the setup script installs with Homebrew when available or with Python's user-level `pip` otherwise.

From the repository root:

```bash
pnpm run graphify:setup
```

[`scripts/graphify-setup.sh`](https://github.com/Azure/LogicAppsUX/blob/main/scripts/graphify-setup.sh) locates a compatible Python installation, installs the `graphifyy` package through `pipx` when necessary, and runs `graphify copilot install`.

## Commands

The command examples use `designer-v2`, but the same operations work with any supported library's `graph.json`.

### Query by concept

Use natural language when you know the behavior but not its symbols:

```bash
graphify query "how does the serialization pipeline work?" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

### Explain a symbol

Inspect a symbol's callers, callees, neighboring abstractions, relationship types, and source locations:

```bash
graphify explain "getOperationSettings()" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

### Trace a path

Find a structural path between two abstractions:

```bash
graphify path "getOperationSettings()" "initializeOperationDetails()" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

Both symbols are present in the committed `designer-v2` graph. Graphify may route through file or helper nodes because the graph includes declarations, files, imports, and calls rather than only a function-to-function call graph.

### Update one library and create an HTML view

```bash
cd libs/designer-v2
graphify update src/
```

Open `src/graphify-out/graph.html` in a browser for interactive exploration. Use the repository rebuild command before committing generated files because it also removes machine-specific absolute paths.

### Rebuild committed artifacts

From the repository root:

```bash
# Rebuild all supported libraries
pnpm run graphify:rebuild

# Rebuild one supported library
pnpm run graphify:rebuild -- designer-v2
```

[`scripts/graphify-rebuild.sh`](https://github.com/Azure/LogicAppsUX/blob/main/scripts/graphify-rebuild.sh) runs `graphify update src/` in the selected libraries and normalizes generated paths.

### Read current statistics without copying them

```bash
report=libs/designer-v2/src/graphify-out/GRAPH_REPORT.md

sed -n '/^## Summary$/,/^## /p' "$report"
sed -n '/^## God Nodes/,/^## /p' "$report"
sed -n '/^## Surprising Connections/,/^## /p' "$report"
```

## Common workflows

### Onboarding and package orientation

Read the report before opening implementation files:

```text
Read libs/designer-v2/src/graphify-out/GRAPH_REPORT.md. Identify the current
god nodes, the communities relevant to operation initialization, and the
surprising connections I should verify in source before editing.
```

This gives an initial map based on actual connectivity. It does not replace reading package instructions or implementation code.

### Architecture questions

Use `query` when the architecture spans names you do not know, then use `explain` on the returned symbols:

```bash
graphify query "what connects panel UI to Redux state?" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

Community membership can show whether the path stays inside one cohesive subsystem or crosses a boundary that deserves more scrutiny.

### Impact analysis

Before changing a central helper, inspect its neighborhood:

```bash
graphify explain "parameterValueToString()" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

Use the result to enumerate direct consumers, then confirm each relevant source location. This is especially valuable for paired operations such as serialization and deserialization, where asymmetric changes can silently lose workflow data.

### Bug investigation

Start from both ends of unexpected behavior:

1. Explain the UI component, selector, serializer, or service nearest the symptom.
2. Query the behavior in natural language to find alternate entry points.
3. Inspect cross-community and surprising connections.
4. Verify candidate edges in source and reproduce the failing path.

Graphify narrows the search space; runtime evidence and tests still establish the root cause.

### Pull request review

Check whether changed symbols appear in the report's god-node list or connect multiple communities. A change to a highly connected abstraction deserves broader tests and a review of its direct neighbors. Do not equate a high degree with a defect: it is a signal about potential blast radius.

### Feature planning

Use communities to locate comparable implementations and `explain` to enumerate integration points. For example, when changing operation initialization, inspect both `getOperationSettings()` and `initializeOperationDetails()` so regular add-operation flows are not treated as the only entry point.

The original Graphify rollout used a timeout-option planning exercise to demonstrate this benefit: graph-first exploration exposed additional agent and MCP operation-add paths that a limited text-search pass missed. Treat that as historical rationale, not as a current claim about exact files or edge counts; rerun the current queries before planning similar work.

### Compare designer v1 and v2

Read current report sections side by side:

```bash
diff \
  <(sed -n '/^## God Nodes/,/^## /p' libs/designer/src/graphify-out/GRAPH_REPORT.md) \
  <(sed -n '/^## God Nodes/,/^## /p' libs/designer-v2/src/graphify-out/GRAPH_REPORT.md)
```

Matching names do not guarantee matching behavior. Follow each graph back to its version-specific source.

### Investigate surprising connections

The **Surprising Connections** section highlights cross-file relationships selected by Graphify as non-obvious. Use these entries to look for hidden coupling, but verify the relationship and its direction in source before treating it as an architectural fact or bug.

## Interpret the graph

### Relationship confidence

Every edge records a relationship such as `calls`, `contains`, `imports`, `imports_from`, `references`, or `re_exports`, plus a confidence classification:

| Classification | Meaning | How to use it |
|---|---|---|
| `EXTRACTED` | Graphify found the relationship directly in the parsed source structure. | Strong evidence for navigation, but still inspect the source for runtime conditions and semantic intent. |
| `INFERRED` | Graphify resolved a likely relationship from structural context. The JSON can include a numeric `confidence_score`. | Treat it as a focused hypothesis and verify both endpoints and the call/import context. |
| `AMBIGUOUS` | Graphify could not confidently resolve the relationship to one target. | Do not use it as proof. Resolve the symbol manually with code intelligence or source inspection. |

Confidence describes extraction certainty, not business importance, execution frequency, test coverage, or correctness.

### Communities

Communities are groups of densely connected nodes. They help identify cohesive subsystems, likely ownership boundaries, and cross-community bridges. Community numbers are generated identifiers and can change after a rebuild; refer to the symbols and files in a community rather than treating its number as a stable API.

### God nodes

God nodes are the most connected nodes by graph degree. They are useful starting points for onboarding and blast-radius analysis because many relationships meet there. High degree does not prove that a node is well-designed, performance-critical, or safe to change, and duplicated labels can represent distinct declarations in different files.

### Surprising connections

Surprising connections are useful prompts for architecture review and bug investigation. They can reveal UI-to-state access, event-to-loader paths, or other cross-directory coupling. The label means “structurally non-obvious,” not “incorrect.”

## How Graphify builds the repository graphs

The repository-visible pipeline has three stages:

1. **AST extraction** parses TypeScript and TSX and extracts files, declarations, imports, calls, references, and documentation relationships.
2. **Graph construction** combines those nodes and edges, retains source locations, and adds confidence metadata for relationships that require inference.
3. **Community detection and reporting** groups densely connected nodes, calculates highly connected nodes, selects surprising connections, and writes the report and queryable JSON.

The original rollout documentation named Tree-sitter, NetworkX, and the Leiden algorithm as Graphify's implementation technologies. Those are useful historical context but are Graphify internals rather than this repository's maintained contract. The durable repository contract is the checked-in scripts, workflow, report sections, JSON metadata, and supported-library list.

## Maintenance and troubleshooting

### `graphify` is not found

Run `pnpm run graphify:setup` from the repository root. If setup cannot find Python, install Python 3.10 or later and rerun it. Ensure the `pipx` binary directory, commonly `$HOME/.local/bin`, is on `PATH`.

### A report is stale on a feature branch

Run `pnpm run graphify:rebuild -- <library>`. Use the freshness check above before relying on a graph to claim a complete call-site or dependency list.

### A query does not find a known symbol

Check the exact label in `GRAPH_REPORT.md` or `graph.json`. Function labels commonly include `()`, and the same label can occur in multiple files. Use source paths from the output to disambiguate, then fall back to code intelligence or text search.

### Generated files contain local absolute paths

Do not hand-edit generated artifacts. Run `pnpm run graphify:rebuild` from the repository root; the rebuild script strips repository-specific absolute and encoded paths.

### CI did not rebuild a graph

Confirm that:

- The change reached `main`.
- The changed file matches `libs/*/src/**/*.ts` or `libs/*/src/**/*.tsx`.
- The library is in the supported list.
- The **Update Knowledge Graphs** workflow completed and had `contents: write` permission.

Changes to JavaScript, Markdown, apps, or unsupported libraries do not match the current workflow trigger.

### The graph disagrees with source or runtime behavior

Source and runtime evidence win. Check freshness, inspect confidence classifications, confirm conditional and dynamic behavior manually, and use tests or reproduction evidence before deciding that the graph is wrong or the code is broken.

## Historical benchmark guidance

The original README included fixed node and edge totals, source-line locations, token estimates, tool-call counts, and side-by-side agent benchmarks. Those examples explained why graph-first exploration can improve completeness and reduce blind file scanning, but their exact measurements became stale as the repository and Graphify changed.

To evaluate current value:

1. Read current totals and rankings from the generated report.
2. Record the report's source commit and the task prompt.
3. Compare the same task with and without report and CLI access.
4. Measure discovered entry points, verified omissions, tool calls, elapsed time, and confidence.
5. Publish results with the commit and Graphify version instead of presenting them as permanent repository facts.
