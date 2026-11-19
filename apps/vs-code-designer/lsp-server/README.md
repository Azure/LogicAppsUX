# Logic Apps language server

This directory contains the .NET 10 language server used by the Logic Apps VS Code extension for C# workflow authoring.

The server provides hover, completion, CodeLens, document synchronization, and workflow metadata features. The extension owns the language client, custom commands, asset installation, telemetry configuration, and release.

## Structure

- `Server/` contains the language server.
- `Server.Tests/` contains xUnit tests.
- `global.json` selects the local .NET SDK.
- `NuGet.config` keeps the public .NET build independent from private package feeds.

The server does not compile against `Microsoft.Azure.Workflows.Sdk`. At startup, the extension passes an SDK nupkg through `--sdk`. The server extracts its assemblies and uses them as Roslyn metadata references.

## Commands

Run commands from the repository root:

```powershell
pnpm --dir apps/vs-code-designer run lsp:build
pnpm --dir apps/vs-code-designer run lsp:test
pnpm --dir apps/vs-code-designer run lsp:package -- --sdk-package <path-to-Microsoft.Azure.Workflows.Sdk.nupkg>
```

The SDK package is used only to validate the managed server tests. It is not copied into the extension. `SDK_NUPKG_PATH` may be set instead of passing `--sdk-package`.

The packaging command:

1. Restores locked NuGet dependencies.
2. Builds the server and tests.
3. Runs all server tests against the selected SDK package.
4. Publishes a framework-dependent server.
5. Creates `src/assets/LSPServer/LSPServer.zip`.
6. Updates `src/assets/LSPServer/lsp-assets.json`.
7. Verifies that the archive contains `LSPServer/LogicAppsLanguageServer.dll`.

The normal TypeScript build and pull-request validation do not rebuild the server. Commit the updated ZIP and manifest with source changes that affect the shipped server.

## Asset contract

`src/assets/LSPServer/lsp-assets.json` is the source of truth for:

- The server archive filename and SHA-256 revision.

The extension uses this hash as the server installation revision marker. Do not edit the manifest by hand.

The ZIP must preserve this layout:

```text
LSPServer/
  LogicAppsLanguageServer.dll
  ...
```

## Development

Use the `Run Designer Extension in Dev Mode` launch configuration. Its prelaunch task builds the extension and a Debug LSP server, then sets `LSP_SERVER_DEV_PATH` to the local DLL.

Use `Attach to Logic Apps Language Server` to attach the .NET debugger to the running server process.

The server and extension share these contracts:

- `custom/getWorkflowMetadata`
- `custom/updateApiConfig`
- `custom/updateConnections`
- `azureLogicAppsStandard.openLanguageServerConnectionView`
- LSP initialization options for API configuration, connections, and telemetry

Change both sides and their tests in the same pull request when one of these contracts changes.

## SDK updates

The current SDK source is maintained in [Azure/logicapps-sdk](https://github.com/Azure/logicapps-sdk).

The extension resolves the SDK package referenced by each codeful project from its restored NuGet cache. SDK convention changes can affect detection of `WorkflowActions`, `WorkflowTriggers`, connector attributes, agent attributes, and dynamic metadata, so validate the managed server with the target package before release.
