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

**Read the [comprehensive Graphify knowledge graph guide](apps/docs/docs/Development/graphify.md)** for the supported-library inventory, freshness checks, CI behavior, assistant integration, command reference, interpretation guidance, workflows, and troubleshooting.

Each supported library commits a human-readable `src/graphify-out/GRAPH_REPORT.md` and queryable `graph.json`. Read the relevant report before exploring a large package, and check its **Graph Freshness** source commit when branch changes matter. The `update-knowledge-graphs.yml` workflow rebuilds all supported graphs after matching TypeScript changes reach `main`.

Committed reports require no local setup. For interactive queries:

```bash
# One-time setup: install Graphify and the Copilot CLI skill
pnpm run graphify:setup

graphify query "how does the serialization pipeline work?" \
  --graph libs/designer-v2/src/graphify-out/graph.json
```

Use `pnpm run graphify:rebuild` to regenerate every supported graph, or pass `-- <library>` to rebuild one.

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
