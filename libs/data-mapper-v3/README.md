# Logic App Data Mapper for VS Code

A Logic App Data Mapper extension for Visual Studio Code with BizTalk-compatible `.btm` support. Create and edit schema-to-schema data mappings visually — **no BizTalk Server installation required**.

## Features

- **Visual Schema Mapping** — Drag-and-drop mapping between source and target XSD schemas
- **Functoid Palette** — Full suite of built-in functoids:
  - **String**: Concatenate, Left, Right, Uppercase, Lowercase, Length, Substring, Trim, Contains
  - **Math**: Add, Subtract, Multiply, Divide, Modulo, Round, Floor, Ceiling, Abs, Max, Min
  - **Logical**: Equal, Not Equal, Greater/Less Than, AND, OR, NOT, IsNil, Value Mapping
  - **DateTime**: Current Date/Time, Add Days, Date Diff
  - **Conversion**: To String, To Number, ASCII/Character conversion
- **Worker-based XSLT Compilation** — Compile maps out-of-process to XSLT 1.0 or 2.0 stylesheets
- **BTM File Support** — Native `.btm` file format (compatible with BizTalk Server maps)
- **Auto-Link by Name** — Automatically link matching source/target nodes
- **Multi-Page Maps** — Organize complex mappings across multiple pages
- **Map Testing** — Test maps with sample XML input
- **Map Validation** — Validate map completeness and correctness

## Installation

Install from the VS Code Marketplace or from a `.vsix` file:

```bash
code --install-extension biztalk-data-mapper-1.0.0.vsix
```

## Usage

1. **Create a new map**: Run command `BizTalk: New Data Map` from the Command Palette
2. **Open existing maps**: Double-click any `.btm` file
3. **Load schemas**: Click "Load Source Schema" / "Load Target Schema" buttons
4. **Create links**: Click the connector (◉) on a source node, then click a target node
5. **Add functoids**: Click a functoid in the palette to add it to the canvas
6. **Compile**: Click the "Compile" button to generate XSLT
7. **Test**: Click "Test" and select an input XML file

## Building from Source

```bash
cd src/BizTalk.DataMapper.VsCode
npm install
npm run compile
npm run compile:webview
npm run publish:worker
```

For breakpoint setup across the extension host, React webview, TypeScript
compiler host, and .NET worker, see `docs/debugging.md`.

## Packaging as VSIX

```bash
npm run package
```

This produces `biztalk-data-mapper-1.0.0.vsix` ready for distribution.

## Architecture

```
src/
├── extension.ts            # VS Code extension activation
├── mapEditorProvider.ts    # Custom editor provider (webview host)
├── model/                  # TypeScript models (MapDocument, SchemaTree)
├── schema/                 # XSD parser & BTM serializer
├── compiler/               # XSLT compiler (map → stylesheet)
├── functoids/              # Functoid registry & definitions
├── worker/                 # Persistent .NET worker client
webview/
├── src/
│   ├── index.tsx           # React webview entry point
│   └── components/         # React UI components and mapper controller
tools/compiler-worker/
├── BizTalk.DataMapper.Core/    # Reusable transform/validation library
└── BizTalk.DataMapper.Worker/  # Stdio protocol host
```

Test Map execution uses a self-contained .NET worker packaged with the VSIX; an
installed .NET runtime is not required. Map compilation is also routed through
the worker, which owns a persistent out-of-process compiler host. See
`docs/data-mapper-architecture.md` for the complete high-level VSIX architecture.
See
`docs/compiler-worker-design.md` for the protocol and native C# migration plan.
See `docs/functoid-properties-design.md` for the designer functoid-properties
architecture and interaction flow.

## Requirements

- VS Code 1.85.0 or later
- No BizTalk Server installation needed
- Self-contained compiler worker; no separately installed modern .NET runtime
- Windows with .NET Framework 4.7.2 or later for legacy VB.NET/JScript Test Map execution

## File Format

The `.btm` file format is XML-based and compatible with BizTalk Server mapper files:

```xml
<mapsource Name="MyMap" Version="1" ...>
  <SrcTree><Reference Location="source.xsd"/></SrcTree>
  <TrgTree><Reference Location="target.xsd"/></TrgTree>
  <Pages>
    <Page Name="Page 1">
      <Link LinkID="..." SourcePath="..." TargetPath="..."/>
      <Functoid FunctoidID="..." TypeID="100" Category="String" .../>
    </Page>
  </Pages>
</mapsource>
```

## License

Copyright (c) Microsoft Corporation. All rights reserved.
