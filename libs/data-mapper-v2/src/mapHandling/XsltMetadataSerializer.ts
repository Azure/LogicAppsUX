import type { MapDefinitionEntry, MapMetadataV2 } from '@microsoft/logic-apps-shared';

/**
 * Metadata embedded in XSLT files for Data Mapper v2.
 * Contains all information needed to reconstruct the visual map.
 * @deprecated Use XsltMapMetadataV3 which doesn't embed mapDefinition
 */
export interface XsltMapMetadata {
  /** Schema version for forward compatibility */
  version: '2.0';
  /** Source schema filename */
  sourceSchema: string;
  /** Target schema filename */
  targetSchema: string;
  /** Map definition (same structure as LML) */
  mapDefinition: MapDefinitionEntry;
  /** UI metadata (function positions, canvas state) */
  metadata: MapMetadataV2;
}

/**
 * Metadata embedded in XSLT files for Data Mapper v3.
 * Only embeds layout metadata - mapping logic is derived from XSLT content.
 * This makes XSLT the source of truth for mappings.
 */
export interface XsltMapMetadataV3 {
  /** Schema version for forward compatibility */
  version: '3.0';
  /** Source schema filename */
  sourceSchema: string;
  /** Target schema filename */
  targetSchema: string;
  /** UI metadata (function positions, canvas state) */
  metadata: MapMetadataV2;
}

/**
 * Union type supporting both v2 (with mapDefinition) and v3 (without mapDefinition) formats.
 * v3 is preferred as it makes XSLT the source of truth for mapping logic.
 */
export type XsltMapMetadataAny = XsltMapMetadata | XsltMapMetadataV3;

/**
 * Type guard to check if metadata is v2 format (with mapDefinition)
 */
export const isV2Metadata = (metadata: XsltMapMetadataAny): metadata is XsltMapMetadata => {
  return metadata.version === '2.0' && 'mapDefinition' in metadata;
};

/**
 * Type guard to check if metadata is v3 format (without mapDefinition)
 */
export const isV3Metadata = (metadata: XsltMapMetadataAny): metadata is XsltMapMetadataV3 => {
  return metadata.version === '3.0';
};

/**
 * Marker used to identify the metadata comment in XSLT.
 * Must be unique to avoid false positives.
 */
const METADATA_MARKER = 'LogicAppsDataMapper:';

/**
 * Extracts metadata content from XSLT using string-based parsing.
 * Avoids regex to prevent potential catastrophic backtracking.
 *
 * @param xslt - The XSLT content to search
 * @returns Object with content and indices, or null if not found
 */
const findMetadataComment = (xslt: string): { content: string; startIndex: number; endIndex: number } | null => {
  const commentStart = '<!--';
  const commentEnd = '-->';

  // Find the metadata marker
  const markerIndex = xslt.indexOf(METADATA_MARKER);
  if (markerIndex === -1) {
    return null;
  }

  // Find the opening comment before the marker
  const searchStart = Math.max(0, markerIndex - 20); // Allow some whitespace before marker
  const openIndex = xslt.lastIndexOf(commentStart, markerIndex);
  if (openIndex === -1 || openIndex < searchStart) {
    return null;
  }

  // Find the closing comment after the marker
  const closeIndex = xslt.indexOf(commentEnd, markerIndex);
  if (closeIndex === -1) {
    return null;
  }

  // Extract content after the marker
  const contentStart = markerIndex + METADATA_MARKER.length;
  const content = xslt.substring(contentStart, closeIndex).trim();

  return {
    content,
    startIndex: openIndex,
    endIndex: closeIndex + commentEnd.length,
  };
};

/**
 * Embeds metadata into an XSLT string as an XML comment at the top.
 * Supports both v2 (with mapDefinition) and v3 (without mapDefinition) formats.
 *
 * @param xslt - The XSLT content (without metadata)
 * @param metadata - The metadata to embed (v2 or v3 format)
 * @returns XSLT with embedded metadata comment
 */
export const embedMetadataInXslt = (xslt: string, metadata: XsltMapMetadataAny): string => {
  // Format JSON with indentation for readability
  const metadataJson = JSON.stringify(metadata, null, 2);

  // Find the position after the XML declaration (if present)
  const xmlDeclMatch = xslt.match(/^<\?xml[^?]*\?>\s*/);
  const insertPosition = xmlDeclMatch ? xmlDeclMatch[0].length : 0;

  const beforeDecl = xslt.substring(0, insertPosition);
  const afterDecl = xslt.substring(insertPosition);

  // Build the comment block
  const metadataComment = `<!-- ${METADATA_MARKER}\n${metadataJson}\n-->\n`;

  return `${beforeDecl}${metadataComment}${afterDecl}`;
};

/**
 * Extracts metadata from an XSLT string if present.
 * Supports both v2 (with mapDefinition) and v3 (without mapDefinition) formats.
 *
 * @param xslt - The XSLT content (potentially with embedded metadata)
 * @returns The extracted metadata, or null if not found or invalid
 */
export const extractMetadataFromXslt = (xslt: string): XsltMapMetadataAny | null => {
  const found = findMetadataComment(xslt);

  if (!found || !found.content) {
    return null;
  }

  try {
    const metadata = JSON.parse(found.content) as XsltMapMetadataAny;

    // Validate required fields (common to both v2 and v3)
    if (!metadata.version || !metadata.sourceSchema || !metadata.targetSchema) {
      console.warn('XSLT metadata missing required fields');
      return null;
    }

    // v2 requires mapDefinition, v3 does not
    if (metadata.version === '2.0' && !('mapDefinition' in metadata)) {
      console.warn('XSLT metadata v2.0 missing mapDefinition');
      return null;
    }

    return metadata;
  } catch (error) {
    console.error('Failed to parse XSLT metadata JSON:', error);
    return null;
  }
};

/**
 * Extracts v2 metadata specifically (with mapDefinition).
 * Returns null if metadata is v3 or not present.
 * @deprecated Use extractMetadataFromXslt with type guards instead
 */
export const extractV2MetadataFromXslt = (xslt: string): XsltMapMetadata | null => {
  const metadata = extractMetadataFromXslt(xslt);
  if (metadata && isV2Metadata(metadata)) {
    return metadata;
  }
  return null;
};

/**
 * Checks if an XSLT string has embedded metadata.
 *
 * @param xslt - The XSLT content to check
 * @returns True if metadata comment is present
 */
export const hasEmbeddedMetadata = (xslt: string): boolean => {
  return findMetadataComment(xslt) !== null;
};

/**
 * Removes the metadata comment from an XSLT string.
 * Useful when sending to backend for processing.
 *
 * @param xslt - The XSLT content with embedded metadata
 * @returns XSLT with metadata comment removed
 */
export const removeMetadataFromXslt = (xslt: string): string => {
  const found = findMetadataComment(xslt);
  if (!found) {
    return xslt;
  }

  const before = xslt.substring(0, found.startIndex);
  const after = xslt.substring(found.endIndex);

  // Clean up any leading newline from the remaining content
  return (before + after).replace(/^\s*\n/, '');
};

/**
 * Creates a v2 metadata object from separate components.
 * @deprecated Use createXsltMapMetadataV3 to avoid embedding mapDefinition
 *
 * @param sourceSchemaName - Source schema filename
 * @param targetSchemaName - Target schema filename
 * @param mapDefinition - The map definition entry
 * @param uiMetadata - UI metadata (function positions, canvas)
 * @returns Complete metadata object ready for embedding
 */
export const createXsltMapMetadata = (
  sourceSchemaName: string,
  targetSchemaName: string,
  mapDefinition: MapDefinitionEntry,
  uiMetadata: MapMetadataV2
): XsltMapMetadata => {
  return {
    version: '2.0',
    sourceSchema: sourceSchemaName,
    targetSchema: targetSchemaName,
    mapDefinition,
    metadata: uiMetadata,
  };
};

/**
 * Creates a v3 metadata object without mapDefinition.
 * This is the preferred method as it makes XSLT the source of truth.
 * Mapping logic should be derived from the actual XSLT content, not embedded metadata.
 *
 * @param sourceSchemaName - Source schema filename
 * @param targetSchemaName - Target schema filename
 * @param uiMetadata - UI metadata (function positions, canvas)
 * @returns Metadata object ready for embedding (without mapDefinition)
 */
export const createXsltMapMetadataV3 = (
  sourceSchemaName: string,
  targetSchemaName: string,
  uiMetadata: MapMetadataV2
): XsltMapMetadataV3 => {
  return {
    version: '3.0',
    sourceSchema: sourceSchemaName,
    targetSchema: targetSchemaName,
    metadata: uiMetadata,
  };
};

/**
 * Parses an LML YAML string to extract schema names.
 * Used during migration from LML to XSLT format.
 *
 * @param mapDefinition - The parsed map definition
 * @returns Object with source and target schema names, or null if not found
 */
export const extractSchemaNames = (mapDefinition: MapDefinitionEntry): { sourceSchema: string; targetSchema: string } | null => {
  const sourceSchema = mapDefinition['$sourceSchema'];
  const targetSchema = mapDefinition['$targetSchema'];

  if (typeof sourceSchema !== 'string' || typeof targetSchema !== 'string') {
    return null;
  }

  return { sourceSchema, targetSchema };
};
