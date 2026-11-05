# Debugging the Logic App Data Mapper

The Data Mapper runs across four processes:

| Process | Typical source | Debug configuration |
| --- | --- | --- |
| VS Code extension host | `src/embeddedMapper.ts`, `src/mapEditorProvider.ts`, schema and serialization services | `Run Designer Extension in Dev Mode` |
| React webview | `webview/src/**/*.tsx` and `MapperAppController.ts` | Designer session and Webview Developer Tools |
| TypeScript compiler host | `src/compiler/xsltCompiler.ts` | Attach a Node.js debugger to the child process |
| .NET compiler worker | `tools/compiler-worker/BizTalk.DataMapper.Core/*.cs` | Attach a C# debugger to the worker process |

## Prerequisites

- VS Code 1.104 or later.
- Node.js 20 or later and pnpm 9 or later.
- .NET SDK 8 for building and debugging the compiler worker.
- Run `pnpm install` from the repository root.
- Install the Microsoft C# extension when debugging the .NET worker.

Open the LogicAppsUX repository as the VS Code workspace. The mapper is bundled
into the Logic Apps extension; no separate mapper extension is launched or installed.

```powershell
code C:\src\LogicAppsUX
```

## Debug the extension host

Use this flow for extension activation, commands, BTM persistence, schema
loading, compilation dispatch, and Test Map orchestration.

1. Set a breakpoint in extension-host code, for example:
   - `src/embeddedMapper.ts`
   - `src/mapEditorProvider.ts`
   - `src/schema/btmSerializer.ts`
   - `src/schema/schemaParser.ts`
2. Open **Run and Debug** with `Ctrl+Shift+D`.
3. Select **Run Designer Extension in Dev Mode**.
4. Press `F5`.
5. In the new **Extension Development Host** window, open a folder containing
   the BTM and XSD files to test.
6. Open a `.btm` file and perform the operation that reaches the breakpoint.

The development host loads `apps/vs-code-designer/dist`, including the bundled
mapper and its resources under `assets/data-mapper-v3`.

## Debug the React webview

The default embedded build uses production webview bundles. Inspect the webview
with Developer Tools; source-level TSX debugging requires development bundles
and their matching source maps in the embedded resource directory.

1. Set a breakpoint in one of these files:
   - `webview/src/components/MapperApp.tsx`
   - `webview/src/components/MapperAppController.ts`
   - `webview/src/components/MappingCanvas.tsx`
   - `webview/src/components/SchemaTreeRenderer.tsx`
   - `webview/src/components/FunctoidPalette.tsx`
2. Start **Run Designer Extension in Dev Mode**.
3. Open a `.btm` file in the Extension Development Host.
4. Interact with the map and inspect its behavior in Webview Developer Tools.

For DOM, CSS, React, console, or network inspection, run **Developer: Open
Webview Developer Tools** from the Command Palette in the Extension Development
Host.

## Debug the TypeScript XSLT compiler

`xsltCompiler.ts` does not execute inside the VS Code extension host. The .NET
worker starts it in a separate Node.js process, so it requires a second debugger.

1. Set a breakpoint in `src/compiler/xsltCompiler.ts`.
2. Temporarily set `BIZTALK_DATAMAPPER_COMPILER_INSPECT_PORT` to `9230` in the
   Designer launch configuration's `env`, then start the Designer session.
3. In the Extension Development Host, open a map and select **Validate and
   Compile** or **Test Map**.
4. The compiler host starts with `--inspect-brk` and waits on
   `127.0.0.1:9230`.
5. Return to the original VS Code window.
6. Attach a Node.js debugger to port 9230 without stopping the active
   Extension Host debug session. There is no dedicated mapper launch configuration.
7. Continue execution. Source breakpoints require a development compiler-host
   bundle and matching source maps in the embedded resource directory.

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
2. Start **Run Designer Extension in Dev Mode**.
3. In the Extension Development Host, trigger **Validate and Compile** or
   **Test Map** so `BizTalk.DataMapper.Worker.exe` starts.
4. Return to the original VS Code window.
5. Use the C# debugger's process-attach flow.
6. Select `BizTalk.DataMapper.Worker.exe` from the process list.
7. Repeat the map operation if the code path completed before attachment.

The default embedded build publishes a Release worker and does not copy PDBs.
For source-level C# debugging, use `publish:worker:debug` and provide its matching
worker binaries and PDBs in Designer's embedded runtime directory.

## Debug Vitest tests

Compiler, schema, serializer, protocol, and functoid behavior can often be
debugged faster without launching a second VS Code window.

Use a JavaScript Debug Terminal and run a focused test:

```powershell
pnpm --dir libs/data-mapper-v3 exec vitest run test/xsltCompilerFunctoids.test.ts
```

Run one named test:

```powershell
pnpm --dir libs/data-mapper-v3 exec vitest run -t "implicit loop"
```

Set breakpoints in the TypeScript source before running the command.

## Build commands used by debugging

The Designer F5 configuration uses **Standard Designer: Build Extension**, which
builds the embedded mapper, the Designer host, and the React webviews. To build
the embedded mapper alone from the repository root:

```powershell
pnpm --dir libs/data-mapper-v3 run build:embedded
```

This command:

1. Builds the .NET Framework transform host.
2. Publishes the self-contained .NET worker in Release configuration.
3. Bundles the embedded API and TypeScript compiler host.
4. Bundles the React webview for production.

Production packaging remains separate:

```powershell
pnpm run vscode:designer:pack
```

## Troubleshooting

### Breakpoint is gray or unbound

- Confirm the opened workspace is the LogicAppsUX repository.
- Rebuild using **Standard Designer: Build Extension** and restart the Designer session.
- Open the `.btm` editor before expecting webview breakpoints to bind.
- For `xsltCompiler.ts`, attach to its Node.js process; the Extension Host
  debugger cannot bind to that child process.
- For C# source, attach to `BizTalk.DataMapper.Worker.exe` after triggering a
  compiler or transform operation.

### Installed extension runs instead of development source

Only perform testing in the window titled **Extension Development Host**. The
original VS Code window may continue using the installed VSIX.

### Compiler operation remains paused

When `BIZTALK_DATAMAPPER_COMPILER_INSPECT_PORT` is set, the Node process
intentionally waits for a debugger to attach. Remove that temporary environment
setting when compiler debugging is not needed.

### Find runtime errors

- Select **Output** and inspect the **Log (Extension Host)** channel.
- Open **Help: Toggle Developer Tools** for Extension Host errors.
- Open **Developer: Open Webview Developer Tools** for React/webview errors.
