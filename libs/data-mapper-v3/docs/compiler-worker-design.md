# Logic App Data Mapper Compiler Worker Design

## Status

Phase 2 is implemented. Test Map and all editor compilation requests go through
the persistent .NET worker. The parity-tested TypeScript compiler is bundled as
an out-of-process compiler host managed by the worker; it no longer runs in the
VS Code extension host. Porting its individual passes to native C# remains a
separate implementation phase.

## Goals

- Put CPU-heavy and CLR-specific mapper operations in reusable C# code.
- Avoid starting `dotnet run` for every Test Map request.
- Package a self-contained worker so users do not need a .NET SDK or runtime.
- Preserve structured compiler errors instead of returning success-shaped fallbacks.
- Keep the VS Code extension responsive with request correlation, timeouts, and
  worker-process isolation.
- Support incremental migration without changing the webview/editor protocol.

## Non-goals

- Loading the CLR directly into the VS Code Node.js process.
- Referencing the legacy Mapper compiler binaries directly. They depend on
  BizTalk Mapper OM/TOM, COM, .NET Framework, and internal build components.
- Removing the TypeScript compiler before golden parity coverage is complete.

## Architecture

```text
Webview
   |
   | VS Code messages
   v
Extension host (TypeScript)
   |
   | line-delimited JSON requests over stdio
   v
BizTalk.DataMapper.Worker (self-contained .NET process)
   |
   |- BizTalk.DataMapper.Core
   |  |- XSLT execution
   |  |- inline script compilation
   |  `- external extension-object validation/loading
   |- .NET Framework transform host
   |  `- C#, VB.NET, and JScript msxsl:script execution
   `- persistent compiler host process
      `- parity-tested TypeScript XSLT compiler
```

The extension owns editor state, filesystem UX, webview rendering, and command
registration. The worker owns CLR-dependent execution and, in later phases, BTM
compilation.

## Process lifecycle

The worker is created lazily on the first request and reused for the extension
session. Each request has a unique numeric ID. Responses carry the same ID.
Unexpected exit rejects every pending request. Extension disposal sends
`shutdown`, then terminates the specific child if it does not exit.

Development uses `dotnet run` when a packaged executable is unavailable.
Production uses the self-contained executable included in the VSIX.
Transforms containing `msxsl:script` are delegated to a packaged .NET Framework
4.7.2 host so all three legacy script languages use the same CodeDOM behavior
as BizTalk Test Map. XSLT 2.0 or later transforms are delegated to Saxon-HE in
the same host. Script-free XSLT 1.0 transforms stay in the modern .NET worker.

## Protocol

Transport is UTF-8, one JSON object per line. Stdout is reserved for protocol
messages; diagnostics go to stderr.

Request:

```json
{
  "id": 1,
  "method": "testMap",
  "params": {
    "xslt": "...",
    "inputXml": "...",
    "extensionObjectXml": "...",
    "workingDirectory": "C:\\maps"
  }
}
```

Success:

```json
{
  "id": 1,
  "result": {
    "outputXml": "...",
    "diagnostics": []
  }
}
```

Failure:

```json
{
  "id": 1,
  "error": {
    "code": "TRANSFORM_FAILED",
    "message": "...",
    "details": "..."
  }
}
```

Implemented methods are `initialize`, `ping`, `compileMap`, `testMap`, and
`shutdown`. Future methods are `validateMap`, `generateInstance`, and
`validateOutput`.

`initialize` also supplies the Node executable and packaged compiler-host path.
The `compileMap` request carries the hydrated map plus optional normalized
source and target schema trees. Its result is the existing structured compiler
result containing XSLT, extension-object XML, errors, warnings, and assembly
paths.

## Core API

The core library accepts strings and explicit working-directory context. It does
not depend on VS Code or Node. Phase 1 wraps the existing tested transform
implementation behind `TransformService`; the legacy CLI remains available.
The wrapper is transitional and will be decomposed into script compilation,
extension loading, and transform components as compiler work moves into C#.

## Compiler migration

1. Move Test Map and extension-object validation. Complete.
2. Move compilation out of the extension host and behind `compileMap`. Complete.
3. Preserve exact TypeScript compiler behavior as the worker parity engine. Complete.
4. Port BTM/XSD models and resolution to native C#.
5. Port source-dependency analysis and hierarchy matching to native C#.
6. Port target generation and functoid emitters to native C#.
7. Run both engines side-by-side against golden BTMs.
8. Remove the TypeScript engine only after the native C# engine has no parity gaps.

Parity tests compare normalized XSLT, extension-object XML, diagnostic IDs, and
transformation output. Tests must include loops, table grids, scripts, imported
schemas, nil/default behavior, custom XSLT, and sequence preservation.

## Packaging

The worker is published as a self-contained `win-x64` runtime directory under
`tools/compiler-worker/runtime/win-x64`. It intentionally remains multi-file:
Roslyn requires physical framework assembly locations for dynamic script
compilation, which single-file publishing does not provide. VSIX prepublish
builds the runtime before webpack bundling, and the extension locates it through
`ExtensionContext.extensionUri`.

Additional runtime identifiers can be added when the product supports platforms
other than Windows.

The runtime directory also contains `framework-transform`, built for .NET
Framework 4.7.2. Supported Windows versions provide a compatible .NET Framework
4.x runtime; no BizTalk Server installation is required.

## Reliability and security

- No shell command construction; arguments are passed through `spawn`.
- Only the worker's process ID is terminated.
- Request timeouts reject explicitly; they never return placeholder success.
- A timed-out compiler host is terminated and restarted on the next request.
- A client-side worker timeout terminates the unresponsive worker and restarts it
  on the next request.
- Protocol stdout cannot contain logs.
- Modern-runtime external assemblies execute in a collectible
  `AssemblyLoadContext` scoped to one transform. Legacy-runtime assemblies
  execute in the short-lived .NET Framework transform process. Neither is a
  security sandbox.
- Paths are resolved explicitly against the map working directory.
- Worker and protocol versions are checked during initialization.

## Open decisions

- Whether compiler diagnostics should retain BizTalk numeric IDs verbatim.
- Whether compiler requests carry raw BTM/XML or a versioned normalized model.
- Whether long-running compiler operations require per-request cancellation or
  worker restart.
- Whether external assemblies require a dedicated unloadable
  `AssemblyLoadContext`.
