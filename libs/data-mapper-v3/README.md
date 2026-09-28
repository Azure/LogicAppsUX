# Logic App Data Mapper for VS Code

A Logic App Data Mapper extension for Visual Studio Code with BizTalk-compatible `.btm` support. Create and edit schema-to-schema data mappings visually — **no BizTalk Server installation required**.

## Features

- **Visual Schema Mapping** — Drag-and-drop mapping between source and target XSD schemas
- **Functoid Palette** — Built-in functoids:
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

### Data Mapper Assistant layout

Ask **Data Mapper Assistant** to "Arrange the functoids on all pages so the map
is less cluttered" to lay out every page, or specify "this page" or a page name
to limit the scope. The Assistant proposes a compact layout operation; the
editor computes dependency-based positions locally rather than asking the
model for hundreds of coordinate patches. Only functoid X/Y coordinates change,
not links, parameters, scripts, or page order.

Review the proposal and select **Apply Changes**. The entire operation is one
undoable edit. For maps that exceed the selected model's input context, the
Assistant uses a compact page summary for layout-only requests; mapping-logic
edits still require the full context.

The mapper surface expands to fit the active page's functoids. Horizontal and
vertical scrollbars appear when the map extends beyond the visible surface;
the scrollable area adjusts when zooming or changing pages.

Canvas functoids use a compact 32-pixel body diameter at 100% zoom (half the
previous size), with proportionally scaled labels and connectors. Hover over a
functoid to see its full name. Saved node positions and canvas zoom are unchanged.

Selecting a connection reveals its start and end points. Linked schema nodes
are expanded and scrolled into view, while the mapper surface adjusts its zoom
and scroll position to show the connected functoids. This changes the view only,
not the saved functoid positions or mapping.

Legacy BTM links accept both `<Schema>` and `<schema>` wrapper paths while
preserving the original saved paths. Schema elements can declare local namespace
prefixes for imported types and element references, including overrides of
inherited prefixes, so those connections resolve to the correct fields.
XSD schema and element declarations also accept alternate prefixes such as
`q1:schema`, including mixed prefixes and imported schemas; existing XSD files
do not need their prefixes rewritten.

## BizTalk compatibility

The mapper is not yet a feature-complete replacement for the legacy BizTalk
Mapper. See the [BizTalk compatibility gap report](docs/biztalk-compatibility-gaps.md)
for the comparison tables, completed fixes, remaining correctness and authoring
gaps, source evidence, and acceptance criteria. Registered functoids and
successful XSLT generation do not establish full behavioral parity or
input/output XSD validity.

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

### Replace a source or target schema

Right-click anywhere in the source or target schema pane and choose **Replace
Source Schema…** or **Replace Target Schema…**, then select an XSD. The pane's
**Replace…** button provides the same action using the keyboard. Empty panes
offer **Add Source/Target Schema…** in the menu or the existing **Load Schema**
button. Includes and imports are resolved using the normal schema loader.

Replacement checks links on **every map page**, retaining links whose exact
element or attribute paths exist in the new schema. Replacing an existing schema
always displays a warning requiring explicit acceptance, even when all links
match. If paths are missing, the warning also reports the number of links that
would be removed. Choose **Replace Schema** to proceed; canceling or dismissing
the warning keeps the existing schema and map unchanged. Only removed
links and their functoid link references/parameters are deleted; functoids and
unrelated mapping remain unchanged. The schema and link changes form one
undoable document edit; Undo/Redo also restores the displayed schemas.
Cancelling, a load failure, or editing the map while selection/confirmation is
open leaves the pending replacement unapplied.

### String Find

String Find returns the first 1-based substring position, or `0` when no match
exists. For example, `String Find("abc", "z")` returns `0`, while
`String Find("abc", "b")` returns `2`. Matching remains case-sensitive.

### Constant values in compiled XSLT

Target values, schema defaults/fixed values, and functoid constants are escaped
for both XPath string syntax and XML attributes. Quotes and XML-special
characters remain literal data: for example, a value containing two double
quotes compiles as `select="'&quot;&quot;'"`, without removing the quotes.

### Generated sample input

Sample generation recognizes X12 date (`X12_DT`), time (`X12_TM`), integer
(`X12_Nn`), and decimal (`X12_R`) types, including namespace-prefixed and
directly declared named types. Date samples use `19990531` (or `990531` when
the schema requires six characters), not element-name placeholders.
String samples honor length/minimum/maximum length facets. Explicit test
values, element fixed/default values, and enumerations take precedence.
Unsupported date/time lengths are reported instead of producing invalid samples.

Generated values are illustrative data, not business identifiers or a guarantee
of full XSD validity. For example, BEG03 supplies the map's `OrderGroupID` value;
use a test-value override to supply a realistic purchase-order number. Direct
links copy values without implicit type conversion: mapping an X12 date to
`xs:date` requires an explicit conversion from `yyyyMMdd` to `yyyy-MM-dd`.

## Data Mapper logs

Run **Logic App: Show Data Mapper Logs** from the Command Palette, or select
**Logic App Data Mapper** in the Output panel. This single channel is shared by
the map editor and compiler worker; there is no separate Worker channel.
Compile and Test Map automatically reveal it without taking keyboard focus.

Logs include schema loading, instance generation, compilation, worker startup,
request IDs and durations, timeouts, transformation/fallback, and output saves.
Each compiler warning is logged at Warning level with its message and available
page/element identifiers, including schema paths, for both Compile and Test Map.
Use the channel's log-level control to enable Debug for schema-dependency and
editor-message details. XML/XSLT contents, scripts, prompts, and raw worker
responses are omitted. Errors log their stage and safe error category; full
compilation and transformation diagnostics remain in the editor's result/error
UI. Input/output parsing logs do not imply XSD validation.

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

Legacy endpoint paths containing `<Sequence>`, `<Choice>`, `<All>`,
`<Group:name>`, or `<AttrGroup:name>` are resolved against schema-derived
aliases while the tree remains flattened. The same resolver is used for
connections, endpoint navigation, schema replacement, compilation, constants,
and source test values. Original BTM paths are preserved on save. Ambiguous
flattened paths are rejected rather than connected to the first matching branch.
Nested choice branches retain their identity, so multiple fields in a single
sequence/group branch are not treated as competing choices.

The older `srctree`/`sinktree`/`functions` dialect is not supported. Such maps
are rejected explicitly instead of being imported as empty maps. XML
well-formedness and successful link round-tripping do not certify successful
BizTalk compilation or XSLT equivalence; missing functoid configuration and
unsupported constructs can still prevent compilation.

Functoids with no output links remain in the map but produce a compilation
warning instead of configuration errors, matching the legacy Mapper behavior.
A Table Looping functoid with any output link still requires a valid, non-empty
table grid; the compiler does not invent missing rows or suppress that error.

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
