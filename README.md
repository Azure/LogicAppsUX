# Azure Logic Apps UX

Azure Logic Apps UX is the monorepo for the visual workflow designer, shared UI components, data-mapping experiences, chat integrations, and VS Code extension used to author and manage Azure Logic Apps.

Product documentation is available at [aka.ms/logicappsux](https://aka.ms/logicappsux).

## Quick start

### Prerequisites

- Node.js 18 or later
- PNPM 9 or later

From the repository root:

```bash
pnpm install
pnpm run start
```

The Standalone development app is available at [http://localhost:4200](http://localhost:4200). To start only that workspace, run `pnpm --filter standalone dev`.

Use `pnpm run start:arm` when developing against Azure Resource Manager. This generates an ARM token before starting the development tasks.

## Common commands

| Command | Description |
|---|---|
| `pnpm run start` | Start workspace development tasks |
| `pnpm run start:arm` | Generate an ARM token and start development tasks |
| `pnpm run build` | Build all workspaces |
| `pnpm run build:lib` | Build library packages |
| `pnpm run build:extension` | Build the VS Code extension and webviews |
| `pnpm run test:lib` | Run library unit tests |
| `pnpm run test:iframe-app` | Run iframe chat app unit tests |
| `pnpm run test:extension-unit` | Run VS Code extension unit tests |
| `pnpm run test:e2e` | Run Playwright end-to-end tests |
| `pnpm run test:e2e:ui` | Open the Playwright test UI |
| `pnpm run check` | Format and lint the repository with Biome |
| `pnpm run extract` | Extract localizable strings |
| `pnpm run compile:loc` | Compile localization resources |

## Repository structure

This is a PNPM workspace managed with Turborepo.

### Applications

| Path | Purpose |
|---|---|
| `apps/Standalone` | Vite development host for the designers, data mappers, templates, MCP, and VS Code webview previews |
| `apps/docs` | Docusaurus documentation site |
| `apps/iframe-app` | Embeddable A2A chat application |
| `apps/vs-code-designer` | VS Code extension host |
| `apps/vs-code-react` | React applications rendered in VS Code webviews |

### Libraries

| Path | Package | Purpose |
|---|---|---|
| `libs/a2a-core` | `@microsoft/logic-apps-chat` | A2A protocol client and React chat SDK |
| `libs/chatbot` | `@microsoft/logic-apps-chatbot` | Designer chatbot integration |
| `libs/data-mapper` | `@microsoft/logic-apps-data-mapper` | Legacy data mapper |
| `libs/data-mapper-v2` | `@microsoft/logic-apps-data-mapper-v2` | Current data mapper |
| `libs/designer` | `@microsoft/logic-apps-designer` | Production workflow designer |
| `libs/designer-v2` | `@microsoft/logic-apps-designer-v2` | Next-generation workflow designer |
| `libs/designer-ui` | `@microsoft/designer-ui` | Shared stateless designer UI components |
| `libs/logic-apps-shared` | `@microsoft/logic-apps-shared` | Service contracts, models, parsers, and utilities |
| `libs/shared-test-utils` | `@microsoft/logic-apps-shared-test-utils` | Test helpers shared across packages |
| `libs/vscode-extension` | `@microsoft/vscode-extension-logic-apps` | Shared VS Code extension utilities and message types |

Other important directories include:

- `e2e` - Playwright end-to-end tests
- `Localize` - Localization source and compiled resources
- `scripts` - Repository maintenance and generation scripts
- `docs/ai-setup` - Source documentation used to generate AI assistant guidance

## Architecture

`logic-apps-shared` provides the service and model foundation. `designer-ui` builds reusable, stateless UI on top of that foundation. The designer, data-mapper, chatbot, Standalone, and VS Code packages compose those libraries for their respective hosts.

The production designer and designer v2 use React, Redux Toolkit, React Query, Fluent UI, and XY Flow. Environment-specific services are injected through providers so the same designer libraries can run in Azure Portal, Standalone, and VS Code.

## AI-assisted development with Graphify

This repository uses [Graphify](https://graphify.net/) to maintain per-package knowledge graphs that map code structure, identify core abstractions, and surface cross-file relationships. These graphs help developers and AI assistants navigate the codebase structurally instead of relying only on text search.

### Graph contents

Supported packages contain a `src/graphify-out` directory with:

| File | Purpose |
|---|---|
| `GRAPH_REPORT.md` | Core abstractions, communities, surprising connections, and suggested questions |
| `graph.json` | Queryable nodes, edges, communities, relationship types, and confidence scores |

Read the relevant `GRAPH_REPORT.md` before exploring a large package. Reports are available for the main designer packages, shared UI and services, data mapper v2, A2A core, chatbot, and VS Code extension utilities.

### Keeping graphs current

The `update-knowledge-graphs.yml` GitHub workflow rebuilds supported graphs when TypeScript source files change on `main`. Each report includes the source commit used to create it, so compare that value with the branch HEAD when freshness matters.

To rebuild graphs locally:

```bash
# One-time setup: install the Graphify CLI and Copilot CLI skill
pnpm run graphify:setup

# Rebuild every supported package
pnpm run graphify:rebuild

# Rebuild one package
pnpm run graphify:rebuild -- designer-v2
```

The setup command requires Python 3.10 or later and installs `graphifyy` with `pipx`.

### AI assistant integration

Graph guidance is already included in the repository instructions used by GitHub Copilot CLI, VS Code Copilot Chat, and Claude Code. No per-user setup is required to read committed reports. The optional CLI setup is only needed for interactive queries or local graph regeneration.

### Interactive queries

```bash
# Find the abstractions involved in a workflow
graphify query "how does the serialization pipeline work?" \
  --graph libs/designer-v2/src/graphify-out/graph.json

# Trace the shortest dependency path between two abstractions
graphify path "serializeWorkflow" "BJSDeserializer" \
  --graph libs/designer-v2/src/graphify-out/graph.json

# Inspect callers, callees, and neighboring abstractions
graphify explain "getOperationSettings" \
  --graph libs/designer-v2/src/graphify-out/graph.json

# Generate an interactive HTML visualization
cd libs/designer-v2
graphify update src/
open src/graphify-out/graph.html
```

### Common use cases

#### Onboarding

Start with a package report to identify its most connected abstractions and community boundaries before reading implementation files:

```text
Read libs/designer-v2/src/graphify-out/GRAPH_REPORT.md and explain the five
most important abstractions and how they relate.
```

#### Impact analysis

Before changing a central helper, inspect its graph neighborhood to find direct callers, callees, and cross-module dependencies:

```bash
graphify explain "parameterValueToString()" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

This is particularly useful for paired operations such as deserialization and serialization, where an asymmetric change can silently lose workflow data.

#### Architecture and bug investigation

Use natural-language queries to locate state-to-UI paths or non-obvious couplings:

```bash
graphify query "what connects panel UI to Redux state" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

The report's **Surprising Connections** section also highlights relationships that are not obvious from the directory structure.

#### Feature planning and code review

Graph communities show where related behavior clusters, while highly connected nodes indicate changes that deserve broader validation. Use them to identify all add-operation paths, compare designer v1 and v2, and check whether a pull request touches a central abstraction.

### How Graphify works

Graphify builds each report in three stages:

1. **AST extraction** parses TypeScript and TSX to identify declarations, imports, calls, and docstrings.
2. **Graph construction** combines extracted relationships and marks additional inferred relationships with confidence scores.
3. **Community detection** groups densely connected nodes to expose cohesive subsystems and cross-community bridges.

Relationships are labeled as `EXTRACTED`, `INFERRED`, or `AMBIGUOUS`, making it clear which connections came directly from source and which require review.

## Contributing

Most contributions require a [Contributor License Agreement](https://cla.opensource.microsoft.com). This project follows the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/); see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

Before submitting changes, use the package-specific guidance under `docs/ai-setup/packages` and run the smallest relevant build, test, and lint commands.

## Support and security

- For support, see [SUPPORT.md](SUPPORT.md).
- To report a security issue, follow [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [MIT License](LICENSE.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Third-party trademarks and logos are subject to their respective policies.
