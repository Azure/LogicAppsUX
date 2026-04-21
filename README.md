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

Each library has a [Graphify](https://graphify.net/) knowledge graph that maps code structure, god nodes (most-connected abstractions), and cross-file relationships. AI coding assistants automatically use these graphs for structural navigation instead of grepping raw files.

**Works out of the box:** `GRAPH_REPORT.md` files are committed and referenced in `CLAUDE.md` — any AI assistant reads them automatically.

**Optional CLI setup** (one-time, for graph queries):
```bash
pnpm run graphify:setup              # Installs graphify CLI + Copilot hook
```

**Rebuild graphs after major refactors:**
```bash
pnpm run graphify:rebuild                       # All libs (seconds, no LLM cost)
pnpm run graphify:rebuild -- designer-v2        # Specific lib
```

**Query examples:**
```bash
graphify query "how does serialization work?" --graph libs/designer-v2/src/graphify-out/graph.json
graphify path "serializeWorkflow" "BJSDeserializer" --graph libs/designer-v2/src/graphify-out/graph.json
graphify explain "getOperationSettings" --graph libs/designer-v2/src/graphify-out/graph.json
```

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