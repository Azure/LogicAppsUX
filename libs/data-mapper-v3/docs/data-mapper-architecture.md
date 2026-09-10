# Logic App Data Mapper for VS Code: High-Level Architecture

## Purpose

The Logic App Data Mapper VSIX is a standalone visual editor for creating,
editing, compiling, and testing BizTalk-compatible `.btm` maps. It separates
interactive editor work from compiler and transformation work so the VS Code
extension host remains responsive and failures are isolated in child
processes.

## System context

```mermaid
flowchart LR
    User[Mapper user]
    VSCode[Visual Studio Code]
    Workspace[Workspace files<br/>BTM, XSD, XML, XSLT]
    VSIX[Logic App Data Mapper VSIX]
    Worker[Compiler worker]

    User <--> VSCode
    VSCode --> VSIX
    VSIX <--> Workspace
    VSIX <--> Worker
```

The VSIX requires VS Code and Windows. It does not require a BizTalk Server
installation or a separately installed modern .NET runtime.

## Component architecture

```mermaid
flowchart TB
    subgraph VSCode["VS Code process"]
        Commands[Commands and activity-bar views]
        Provider[MapEditorProvider]
        Services[BTM, XSD, map model, and functoid services]

        subgraph Webview["Isolated mapper webview"]
            App[Mapper application]
            Trees[Source and target schema trees]
            Canvas[Mapping canvas and links]
            Palette[Functoid palette and properties]
        end

        Commands --> Provider
        Provider <--> Services
        Provider <--> |VS Code messages| Webview
        App --> Trees
        App --> Canvas
        App --> Palette
    end

    subgraph WorkerBoundary["Out-of-process execution boundary"]
        Client[CompilerWorkerClient]
        DotNetWorker[Self-contained .NET worker]
        CompilerHost[Persistent Node compiler host<br/>TypeScript parity compiler]
        Core[TransformService and worker protocol]
        FrameworkHost[.NET Framework transform host]
        MicrosoftEngine[XslCompiledTransform<br/>XSLT 1.0 and scripts]
        Saxon[Saxon-HE<br/>XSLT 2.0 and later]

        Client <--> |line-delimited JSON over stdio| DotNetWorker
        DotNetWorker --> Core
        DotNetWorker <--> CompilerHost
        Core --> FrameworkHost
        FrameworkHost --> MicrosoftEngine
        FrameworkHost --> Saxon
    end

    Files[(BTM, XSD, XML,<br/>XSLT and extension XML)]

    Provider <--> Files
    Services <--> Files
    Provider --> Client
```

The webview uses React 18. `MapperApp` owns the React lifecycle and delegates
map-editing operations to `MapperAppController`. The schema trees, functoid
palette, and SVG mapping canvas are React components exposed through narrow
adapters so coordinate calculation and editor operations remain independently
testable. Host/webview communication uses the shared discriminated unions and
runtime guards in `src/protocol/mapEditorProtocol.ts`.

## Layer responsibilities

| Layer | Primary responsibility |
| --- | --- |
| VS Code integration | Activates the extension, registers commands and views, discovers maps, and hosts the custom `.btm` editor. |
| Webview designer | Renders schemas, pages, links, functoids, dialogs, and map editing interactions in an isolated browser context. |
| Editor services | Deserialize and serialize BTM XML, recursively resolve XSD imports/includes, build schema trees, maintain the map model, and provide functoid metadata. |
| Worker client | Lazily starts the worker, correlates requests and responses, enforces timeouts, reports structured failures, and restarts the worker on the request after a crash. |
| Compiler worker | Owns the stable process boundary for Compile Map and Test Map and manages the persistent compiler host. |
| Compiler host | Runs the parity-tested TypeScript map-to-XSLT compiler outside the VS Code extension host. |
| Transform runtimes | Execute XSLT 1.0, legacy C#/VB.NET/JScript script maps, or XSLT 2.0+ using the appropriate engine. |

## Primary flows

### Open, edit, and save

```mermaid
sequenceDiagram
    actor User
    participant VS as VS Code
    participant Provider as MapEditorProvider
    participant Model as BTM/XSD services
    participant UI as Mapper webview
    participant Disk as Workspace

    User->>VS: Open .btm
    VS->>Provider: Resolve custom editor
    Provider->>Disk: Read BTM and referenced XSD files
    Provider->>Model: Deserialize map and resolve schema dependencies
    Model-->>Provider: MapDocument and schema trees
    Provider->>UI: Initialize editor state and functoid metadata
    User->>UI: Edit links, functoids, pages, or properties
    UI->>Provider: Send updated map
    Provider->>Model: Serialize BizTalk-compatible BTM
    Provider->>Disk: Persist .btm
```

The webview owns transient interaction state. The extension host owns document
persistence and file access.

### Compile map

```mermaid
sequenceDiagram
    actor User
    participant Provider as Extension host
    participant Client as Worker client
    participant Worker as .NET worker
    participant Host as Compiler host
    participant Compiler as TypeScript XSLT compiler

    User->>Provider: Compile or Export XSLT
    Provider->>Client: compileMap(map, source schema, target schema)
    Client->>Worker: JSON request over stdio
    Worker->>Host: Forward normalized compile request
    Host->>Compiler: Compile mapping graph
    Compiler-->>Host: XSLT, extension XML, diagnostics
    Host-->>Worker: Structured result
    Worker-->>Provider: Correlated response
    Provider-->>User: Save output or show diagnostics
```

Compilation is out of process, but the authoritative compiler algorithm remains
TypeScript until its legacy-compatible passes are migrated and parity-tested in
C#.

### Test map

```mermaid
flowchart TD
    Input[Compiled XSLT and sample XML]
    Detect{Stylesheet capability}
    Modern[Modern .NET XSLT 1.0 path]
    Framework[.NET Framework host]
    Script[XslCompiledTransform<br/>C#, VB.NET, JScript]
    Xslt2[Saxon-HE<br/>XSLT 2.0+]
    Result[Output XML or structured diagnostics]

    Input --> Detect
    Detect -->|XSLT 1.0 without script| Modern
    Detect -->|msxsl:script| Framework
    Detect -->|XSLT 2.0 or later| Framework
    Framework --> Script
    Framework --> Xslt2
    Modern --> Result
    Script --> Result
    Xslt2 --> Result
```

Microsoft script blocks and XSLT 2.0+ constructs cannot be combined in one
stylesheet because they require different processors. This combination fails
with an explicit diagnostic.

## Data model and compatibility

```mermaid
flowchart LR
    BTM[BizTalk BTM XML]
    Map[MapDocument<br/>pages, links, functoids, settings]
    XSD[XSD documents]
    Schema[SchemaTree<br/>nodes, types, namespaces]
    Registry[Functoid registry]
    Compiler[Compiler input]

    BTM <--> Map
    XSD -->|recursive imports/includes| Schema
    Map --> Compiler
    Schema --> Compiler
    Registry --> Map
    Registry --> Compiler
```

Compatibility is maintained at the persisted BTM/XSD boundary and at generated
XSLT behavior. The normalized in-memory model decouples the designer from raw
legacy XML while preserving legacy identifiers, schema roots, map settings,
functoid parameters, and link ordering.

The XSD projection resolves recursive imports/includes and QName-based element,
attribute, type, group, and attribute-group references. It retains sequence
order, simple and complex derivation, restrictions, substitution metadata,
wildcards, and list/union type metadata while guarding recursive definitions.

## Reliability boundaries

- The worker starts lazily and is reused across requests.
- Every request has an ID, timeout, structured success result, or structured
  error; protocol stdout is not used for logging.
- If the worker exits, pending operations fail explicitly and the next request
  starts and initializes a new worker. Interrupted operations are not
  automatically retried.
- The persistent compiler host is also isolated and recreated after failure.
- Modern-runtime external assemblies and generated C# script assemblies are
  loaded into a collectible `AssemblyLoadContext` for each transform. Private
  managed and native dependencies are resolved relative to the external
  assembly.
- Legacy script and Saxon transforms run in a short-lived .NET Framework child
  process, providing process-lifetime assembly isolation.
- External assemblies run outside the VS Code extension host, but these
  isolation boundaries are not security sandboxes.
- Map and schema files remain the source of truth; generated artifacts are
  written only through explicit commands.

## Packaging and deployment

```mermaid
flowchart LR
    TS[TypeScript compilation]
    Webpack[Extension and webview bundles]
    Net[Self-contained .NET worker publish]
    FX[.NET Framework host build]
    Runtime[Script engines and Saxon-HE dependencies]
    VSIX[Installable VSIX]

    TS --> Webpack
    Net --> VSIX
    FX --> Runtime
    Runtime --> VSIX
    Webpack --> VSIX
```

The VSIX contains the bundled extension host, webview assets, compiler host,
self-contained `win-x64` worker, .NET Framework transform host, Saxon-HE
dependencies, and third-party notices.

## Related designs

- [`compiler-worker-design.md`](compiler-worker-design.md) describes the worker
  protocol, lifecycle, and compiler migration plan.
- [`functoid-properties-design.md`](functoid-properties-design.md) describes the
  functoid double-click properties experience.
