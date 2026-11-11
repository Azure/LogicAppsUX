# Language server development

## Build and run

From the LogicAppsUX repository root:

```powershell
pnpm --dir apps/vs-code-designer run lsp:build:debug
pnpm run build:extension
```

Press `F5` and select `Run Designer Extension in Dev Mode`. The launch configuration starts the extension with:

```text
LSP_SERVER_DEV_PATH=${workspaceFolder}/apps/vs-code-designer/lsp-server/Server/bin/Debug/net8.0/SdkLspServer.dll
```

The extension starts the server through its managed `dotnet` host and passes the installed SDK nupkg through `--sdk`.

## Debug

1. Start `Run Designer Extension in Dev Mode`.
2. Open or create a C# workflow project in the Extension Development Host.
3. Select `Attach to Logic Apps SDK LSP Server`.
4. Choose the `dotnet` process whose command line contains `SdkLspServer.dll`.

Reload the Extension Development Host after rebuilding the server.

## Test

```powershell
pnpm --dir apps/vs-code-designer run lsp:test
```

To run SDK-dependent tests against a specific package:

```powershell
$env:SDK_NUPKG_PATH = '<path-to-Microsoft.Azure.Workflows.Sdk.nupkg>'
pnpm --dir apps/vs-code-designer run lsp:test
```

Run the full packaging command before updating the checked-in assets:

```powershell
pnpm --dir apps/vs-code-designer run lsp:package -- --sdk-package <path-to-sdk-package>
```

## Common failures

- **SDK failed to load:** Check the nupkg path passed through `--sdk`.
- **Locked files during asset installation:** Stop the running `SdkLspServer.dll` process or reload VS Code.
- **Changes do not appear:** Rebuild the Debug server and reload the Extension Development Host.
- **SDK compatibility test fails:** Review the SDK surface change before updating the expected behavior or asset manifest.
