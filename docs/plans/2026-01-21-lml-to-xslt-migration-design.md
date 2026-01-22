# LML to XSLT Migration Design

## Overview

Remove LML (Logic Mapper Language) files from the Data Mapper v2 workflow. Instead of maintaining separate files for map definitions (LML), XSLT transformations, and metadata, we will embed all mapping information directly into the XSLT file as a structured comment.

## Goals

1. **Single file format** - One XSLT file contains everything needed to load and save a data map
2. **Simplified user experience** - Users only manage one file per map
3. **Backward compatibility** - Existing LML files auto-migrate on open

## File Format

### New XSLT Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- LogicAppsDataMapper:
{
  "version": "2.0",
  "sourceSchema": "SourceOrder.xsd",
  "targetSchema": "TargetOrder.xsd",
  "mapDefinition": {
    "$version": "1.0",
    "$input": "xml",
    "$output": "xml",
    "/Root": [...]
  },
  "metadata": {
    "functionNodes": [...],
    "canvasRect": { "width": 1200, "height": 800 }
  }
}
-->
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <!-- Server-generated XSLT transformation logic -->
</xsl:stylesheet>
```

### Metadata JSON Schema

```typescript
interface XsltMapMetadata {
  version: "2.0";
  sourceSchema: string;
  targetSchema: string;
  mapDefinition: MapDefinitionEntry;  // Reuses existing LML structure
  metadata: {
    functionNodes: FunctionMetadata[];
    canvasRect: Rect;
  };
}
```

### File Locations

| File Type | Old Location | New Location |
|-----------|--------------|--------------|
| Map definition | `DataMaps/{name}.yml` | Embedded in XSLT |
| XSLT | `maps/{name}.xslt` | `maps/{name}.xslt` (unchanged) |
| Metadata | `.vscode/{name}DataMapMetadata-v2.json` | Embedded in XSLT |
| Draft | `DataMaps/{name}.draft.yml` | `maps/{name}.draft.xslt` |

## Implementation

### 1. XSLT Metadata Utilities

Create new file: `libs/data-mapper-v2/src/mapHandling/XsltMetadataSerializer.ts`

```typescript
// Embed metadata into XSLT
export function embedMetadataInXslt(xslt: string, metadata: XsltMapMetadata): string

// Extract metadata from XSLT
export function extractMetadataFromXslt(xslt: string): XsltMapMetadata | null

// Check if XSLT has embedded metadata
export function hasEmbeddedMetadata(xslt: string): boolean
```

### 2. Save Workflow Changes

**EditorCommandBar.tsx** - Update `onSaveClick`:
1. Serialize connections to map definition (existing)
2. Serialize UI metadata (existing)
3. Call backend to generate XSLT (existing)
4. Embed metadata JSON into XSLT comment
5. Save single XSLT file via `saveXsltCall`
6. Delete legacy files (LML, metadata JSON)

### 3. Load Workflow Changes

**DataMapperPanel.ts** - Update load flow:
1. Check for XSLT file in `maps/` folder
2. If XSLT exists with embedded metadata:
   - Extract metadata from comment
   - Parse map definition and UI metadata
   - Load into designer
3. If old LML file exists (migration):
   - Load LML file
   - Load metadata JSON if present
   - Generate XSLT with embedded metadata
   - Save new format
   - Delete old files

### 4. Draft File Handling

**DataMapperPanel.ts**:
- Change `saveDraftDataMapDefinition` to save `maps/{name}.draft.xslt`
- Draft files contain full XSLT with embedded metadata
- On load, check for draft XSLT before main XSLT

### 5. File Service Interface Updates

**IDataMapperFileService**:
- Modify `saveMapDefinitionCall` to `saveMapCall(xsltWithMetadata: string)`
- Remove separate `saveMapMetadata` call
- Update `saveDraftStateCall` to save draft XSLT

### 6. Extension Config Updates

**extensionConfig.ts**:
- Remove `mapDefinitionExtension = '.lml'`
- Update `supportedDataMapDefinitionFileExts` to `['.xslt']`
- Remove `dataMapDefinitionsPath` (no longer needed)

## Migration Strategy

### Auto-Migration on Open

When opening a map:
1. First check for `maps/{name}.xslt` with embedded metadata
2. If not found, check for `DataMaps/{name}.yml` (legacy LML)
3. If LML found:
   - Load LML content
   - Load metadata from `.vscode/` if present
   - Generate XSLT via backend
   - Embed metadata
   - Save to `maps/{name}.xslt`
   - Delete legacy files:
     - `DataMaps/{name}.yml`
     - `DataMaps/{name}.draft.yml`
     - `.vscode/{name}DataMapMetadata-v2.json`

### Files to Delete After Migration

- `DataMaps/{name}.yml`
- `DataMaps/{name}.draft.yml`
- `.vscode/{name}DataMapMetadata-v2.json`

## Testing Strategy

1. Unit tests for metadata serialization/deserialization
2. Unit tests for XSLT embedding/extraction
3. Integration tests for save workflow
4. Integration tests for load workflow
5. Migration tests for LML → XSLT conversion
6. E2E tests in VS Code extension

## Rollout

1. Implement metadata utilities
2. Update save workflow
3. Update load workflow with migration
4. Update draft handling
5. Clean up old code paths
6. Update documentation

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Keep backup of LML before deletion |
| Invalid XSLT after embedding | Validate XML structure after embedding |
| Large metadata bloating XSLT | JSON is compact; LML reuse keeps it small |
| XSLT comment stripped by tools | Document that comment must be preserved |
