# Debugging the Logic App Data Mapper

The Data Mapper runs across four processes:

| Process | Typical source | Debug configuration |
| --- | --- | --- |
| VS Code extension host | `src/extension.ts`, `src/mapEditorProvider.ts`, schema and serialization services | `Run Data Mapper Extension` |
| React webview | `webview/src/**/*.tsx` and `MapperAppController.ts` | `Run Data Mapper Extension` |
| TypeScript compiler host | `src/compiler/xsltCompiler.ts` | `Run Data Mapper + Pause Compiler Host`, then `Attach to TypeScript Compiler Host` |
| .NET compiler worker | `tools/compiler-worker/BizTalk.DataMapper.Core/*.cs` | `Attach to Compiler Worker` |

## Prerequisites

- VS Code 1.85 or later.
- Node.js and npm.
- Run `npm install` in the extension directory.
- Install the Microsoft C# extension when debugging the .NET worker.

Open the extension directory itself as the VS Code workspace. The checked-in
launch configurations use `${workspaceFolder}` as the extension root.

```powershell
code C:\src\BizTalk-Server\src\BizTalk.DataMapper.VsCode
```

## Debug the extension host

Use this flow for extension activation, commands, BTM persistence, schema
loading, compilation dispatch, and Test Map orchestration.

1. Set a breakpoint in extension-host code, for example:
   - `src/extension.ts`
   - `src/mapEditorProvider.ts`
   - `src/schema/btmSerializer.ts`
   - `src/schema/schemaParser.ts`
2. Open **Run and Debug** with `Ctrl+Shift+D`.
3. Select **Run Data Mapper Extension**.
4. Press `F5`.
5. In the new **Extension Development Host** window, open a folder containing
   the BTM and XSD files to test.
6. Open a `.btm` file and perform the operation that reaches the breakpoint.

The development host loads the current source checkout instead of the installed
Marketplace or VSIX copy.

## Debug the React webview

The extension-host launch configurations set `debugWebviews` to `true`, so the
VS Code JavaScript debugger can bind directly to TSX source maps.

1. Set a breakpoint in one of these files:
   - `webview/src/components/MapperApp.tsx`
   - `webview/src/components/MapperAppController.ts`
   - `webview/src/components/MappingCanvas.tsx`
   - `webview/src/components/SchemaTreeRenderer.tsx`
   - `webview/src/components/FunctoidPalette.tsx`
2. Start **Run Data Mapper Extension**.
3. Open a `.btm` file in the Extension Development Host.
4. Interact with the map to reach the breakpoint.

For DOM, CSS, React, console, or network inspection, run **Developer: Open
Webview Developer Tools** from the Command Palette in the Extension Development
Host.

## Debug the TypeScript XSLT compiler

`xsltCompiler.ts` does not execute inside the VS Code extension host. The .NET
worker starts it in a separate Node.js process, so it requires a second debugger.

1. Set a breakpoint in `src/compiler/xsltCompiler.ts`.
2. Select **Run Data Mapper + Pause Compiler Host** and press `F5`.
3. In the Extension Development Host, open a map and select **Validate and
   Compile** or **Test Map**.
4. The compiler host starts with `--inspect-brk` and waits on
   `127.0.0.1:9230`.
5. Return to the original VS Code window.
6. Start **Attach to TypeScript Compiler Host** without stopping the active
   Extension Host debug session.
7. Continue execution. Breakpoints in `xsltCompiler.ts` now bind to the
   compiler-host process.

If port 9230 is already occupied, stop the process using that port or update
both `BIZTALK_DATAMAPPER_COMPILER_INSPECT_PORT` and the attach configuration in
`.vscode/launch.json`.

## Debug the .NET compiler worker

Use this flow for worker requests, compiler-host startup, XSLT runtime routing,
external assemblies, and transform execution.

1. Set a breakpoint in:
   - `tools/compiler-worker/BizTalk.DataMapper.Core/CompilerService.cs`
   - `tools/compiler-worker/BizTalk.DataMapper.Core/TransformService.cs`
   - `tools/compiler-worker/BizTalk.DataMapper.Worker/Program.cs`
2. Start **Run Data Mapper Extension**.
3. In the Extension Development Host, trigger **Validate and Compile** or
   **Test Map** so `BizTalk.DataMapper.Worker.exe` starts.
4. Return to the original VS Code window.
5. Start **Attach to Compiler Worker**.
6. Select `BizTalk.DataMapper.Worker.exe` from the process list.
7. Repeat the map operation if the code path completed before attachment.

The `npm: debug:prepare` pre-launch task publishes the worker in Debug
configuration so its PDB files match the current C# source.

## Debug Jest tests

Compiler, schema, serializer, protocol, and functoid behavior can often be
debugged faster without launching a second VS Code window.

Use a JavaScript Debug Terminal and run a focused test:

```powershell
npx jest --runInBand --runTestsByPath test\xsltCompilerFunctoids.test.ts
```

Run one named test:

```powershell
npx jest --runInBand -t "implicit loop"
```

Set breakpoints in the TypeScript source before running the command.

## Build commands used by debugging

The F5 configurations run:

```powershell
npm run debug:prepare
```

This command:

1. Builds the .NET Framework transform host.
2. Publishes the self-contained .NET worker with Debug symbols.
3. Bundles the extension host with full TypeScript source maps.
4. Bundles the React webview with development source maps.

Production packaging remains separate:

```powershell
npm run package
```

## Troubleshooting

### Breakpoint is gray or unbound

- Confirm the opened workspace is
  `C:\src\BizTalk-Server\src\BizTalk.DataMapper.VsCode`.
- Run `npm run debug:prepare` and restart the debug session.
- Open the `.btm` editor before expecting webview breakpoints to bind.
- For `xsltCompiler.ts`, attach **TypeScript Compiler Host**; the Extension Host
  debugger cannot bind to that child process.
- For C# source, attach to `BizTalk.DataMapper.Worker.exe` after triggering a
  compiler or transform operation.

### Installed extension runs instead of development source

Only perform testing in the window titled **Extension Development Host**. The
original VS Code window may continue using the installed VSIX.

### Compiler operation remains paused

When using **Run Data Mapper + Pause Compiler Host**, the Node process
intentionally waits for **Attach to TypeScript Compiler Host**. Use the standard
**Run Data Mapper Extension** configuration when compiler debugging is not
needed.

### Find runtime errors

- Select **Output** and inspect the **Log (Extension Host)** channel.
- Open **Help: Toggle Developer Tools** for Extension Host errors.
- Open **Developer: Open Webview Developer Tools** for React/webview errors.
