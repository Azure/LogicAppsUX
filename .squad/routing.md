# Routing

File-path → agent routing table. Used to determine which agent(s) own a change.

## Rules

| Pattern | Agent | Priority |
|---------|-------|----------|
| `libs/designer/src/lib/core/**` | designer-core | primary |
| `libs/designer-v2/src/lib/core/**` | designer-core | primary |
| `libs/designer/src/lib/ui/**` | designer-ui | primary |
| `libs/designer-v2/src/lib/ui/**` | designer-ui | primary |
| `libs/designer-ui/src/**` | designer-ui | primary |
| `libs/logic-apps-shared/src/**` | shared-services | primary |
| `libs/data-mapper-v2/src/**` | data-mapper | primary |
| `libs/data-mapper/src/**` | data-mapper | primary |
| `libs/a2a-core/src/**` | data-mapper | secondary |
| `libs/chatbot/src/**` | data-mapper | secondary |
| `apps/iframe-app/src/**` | data-mapper | secondary |
| `libs/vscode-extension/src/**` | vscode | primary |
| `apps/vs-code-designer/**` | vscode | primary |
| `apps/vs-code-react/**` | vscode | primary |
| `apps/Standalone/src/**` | designer-core | primary |
| `e2e/**` | test | primary |
| `**/__test__/**` | test | advisory |
| `**/*.spec.*` | test | advisory |

## Cross-Cutting Spawn Rules

When a changeset touches files owned by multiple agents, spawn all relevant agents and follow these rules:

1. **Interface changes in shared-services** — If `libs/logic-apps-shared/src/designer-client-services/` changes, spawn shared-services (owns contract) + all consuming agents whose code breaks.
2. **State shape changes** — If a Redux slice in designer-core changes its exported types, spawn designer-core + designer-ui (consumes selectors) + test (update mocks).
3. **Theme/token changes** — If `libs/designer-ui/src/lib/tokens/` changes, spawn designer-ui + data-mapper (both consume tokens).
4. **VS Code webview ↔ extension** — If both `apps/vs-code-designer/` and `apps/vs-code-react/` change, a single vscode agent handles both (same domain).
5. **Test-only changes** — If only `__test__/` or `*.spec.*` files change, test agent runs solo. If test changes accompany feature code, test runs alongside the feature agent.

## Fallback

Files not matching any rule (root configs, CI, docs, build scripts) are handled by the requesting agent or escalated to the developer.
