import { describe, it, expect } from 'vitest';
import {
  embedMetadataInXslt,
  extractMetadataFromXslt,
  hasEmbeddedMetadata,
  removeMetadataFromXslt,
  createXsltMapMetadata,
  createXsltMapMetadataV3,
  extractSchemaNames,
  isV2Metadata,
  isV3Metadata,
  type XsltMapMetadata,
  type XsltMapMetadataV3,
} from '../XsltMetadataSerializer';
import type { MapDefinitionEntry, MapMetadataV2 } from '@microsoft/logic-apps-shared';

describe('XsltMetadataSerializer', () => {
  const sampleXslt = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Root>
      <xsl:value-of select="/Source/Value" />
    </Root>
  </xsl:template>
</xsl:stylesheet>`;

  const sampleXsltNoDecl = `<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Root />
  </xsl:template>
</xsl:stylesheet>`;

  const sampleMapDefinition: MapDefinitionEntry = {
    $version: '1.0',
    $input: 'xml',
    $output: 'xml',
    $sourceSchema: 'Source.xsd',
    $targetSchema: 'Target.xsd',
    '/Root': {
      Value: '/Source/Value',
    },
  };

  const sampleUiMetadata: MapMetadataV2 = {
    functionNodes: [
      {
        reactFlowGuid: 'func-123',
        functionKey: 'concat',
        position: { x: 100, y: 200 },
        connections: [{ name: 'target-1', inputOrder: 0 }],
        connectionShorthand: '0-target-1,',
      },
    ],
    canvasRect: { x: 0, y: 0, width: 1200, height: 800 },
  };

  const sampleMetadata: XsltMapMetadata = {
    version: '2.0',
    sourceSchema: 'Source.xsd',
    targetSchema: 'Target.xsd',
    mapDefinition: sampleMapDefinition,
    metadata: sampleUiMetadata,
  };

  describe('createXsltMapMetadata', () => {
    it('should create metadata object with correct structure', () => {
      const result = createXsltMapMetadata('Source.xsd', 'Target.xsd', sampleMapDefinition, sampleUiMetadata);

      expect(result.version).toBe('2.0');
      expect(result.sourceSchema).toBe('Source.xsd');
      expect(result.targetSchema).toBe('Target.xsd');
      expect(result.mapDefinition).toEqual(sampleMapDefinition);
      expect(result.metadata).toEqual(sampleUiMetadata);
    });
  });

  describe('embedMetadataInXslt', () => {
    it('should embed metadata after XML declaration', () => {
      const result = embedMetadataInXslt(sampleXslt, sampleMetadata);

      expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(result).toContain('<!-- LogicAppsDataMapper:');
      expect(result).toContain('"version": "2.0"');
      expect(result).toContain('"sourceSchema": "Source.xsd"');
      expect(result).toContain('<xsl:stylesheet');
      // Metadata should be before stylesheet
      expect(result.indexOf('LogicAppsDataMapper')).toBeLessThan(result.indexOf('<xsl:stylesheet'));
    });

    it('should embed metadata at the start when no XML declaration', () => {
      const result = embedMetadataInXslt(sampleXsltNoDecl, sampleMetadata);

      expect(result).toContain('<!-- LogicAppsDataMapper:');
      expect(result.indexOf('LogicAppsDataMapper')).toBeLessThan(result.indexOf('<xsl:stylesheet'));
    });

    it('should preserve original XSLT content', () => {
      const result = embedMetadataInXslt(sampleXslt, sampleMetadata);

      expect(result).toContain('<xsl:template match="/">');
      expect(result).toContain('<xsl:value-of select="/Source/Value" />');
    });

    it('should format JSON with indentation', () => {
      const result = embedMetadataInXslt(sampleXslt, sampleMetadata);

      // JSON should be indented (not minified)
      expect(result).toContain('  "version"');
    });
  });

  describe('extractMetadataFromXslt', () => {
    it('should extract metadata from XSLT with embedded comment', () => {
      const xsltWithMetadata = embedMetadataInXslt(sampleXslt, sampleMetadata);
      const result = extractMetadataFromXslt(xsltWithMetadata);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('2.0');
      expect(result?.sourceSchema).toBe('Source.xsd');
      expect(result?.targetSchema).toBe('Target.xsd');
      expect(result?.mapDefinition).toEqual(sampleMapDefinition);
      expect(result?.metadata).toEqual(sampleUiMetadata);
    });

    it('should return null for XSLT without metadata', () => {
      const result = extractMetadataFromXslt(sampleXslt);

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON in comment', () => {
      const invalidXslt = `<?xml version="1.0"?>
<!-- LogicAppsDataMapper:
{ invalid json }
-->
<xsl:stylesheet />`;

      const result = extractMetadataFromXslt(invalidXslt);

      expect(result).toBeNull();
    });

    it('should return null for metadata missing required fields', () => {
      const incompleteMetadata = `<?xml version="1.0"?>
<!-- LogicAppsDataMapper:
{
  "version": "2.0"
}
-->
<xsl:stylesheet />`;

      const result = extractMetadataFromXslt(incompleteMetadata);

      expect(result).toBeNull();
    });
  });

  describe('hasEmbeddedMetadata', () => {
    it('should return true for XSLT with metadata', () => {
      const xsltWithMetadata = embedMetadataInXslt(sampleXslt, sampleMetadata);

      expect(hasEmbeddedMetadata(xsltWithMetadata)).toBe(true);
    });

    it('should return false for XSLT without metadata', () => {
      expect(hasEmbeddedMetadata(sampleXslt)).toBe(false);
    });

    it('should return false for XSLT with regular comments', () => {
      const xsltWithComment = `<?xml version="1.0"?>
<!-- This is a regular comment -->
<xsl:stylesheet />`;

      expect(hasEmbeddedMetadata(xsltWithComment)).toBe(false);
    });
  });

  describe('removeMetadataFromXslt', () => {
    it('should remove metadata comment from XSLT', () => {
      const xsltWithMetadata = embedMetadataInXslt(sampleXslt, sampleMetadata);
      const result = removeMetadataFromXslt(xsltWithMetadata);

      expect(result).not.toContain('LogicAppsDataMapper');
      expect(result).toContain('<xsl:stylesheet');
      expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it('should return unchanged XSLT if no metadata present', () => {
      const result = removeMetadataFromXslt(sampleXslt);

      expect(result).toBe(sampleXslt);
    });
  });

  describe('extractSchemaNames', () => {
    it('should extract schema names from map definition', () => {
      const result = extractSchemaNames(sampleMapDefinition);

      expect(result).not.toBeNull();
      expect(result?.sourceSchema).toBe('Source.xsd');
      expect(result?.targetSchema).toBe('Target.xsd');
    });

    it('should return null if sourceSchema is missing', () => {
      const mapDef: MapDefinitionEntry = {
        $targetSchema: 'Target.xsd',
      };

      expect(extractSchemaNames(mapDef)).toBeNull();
    });

    it('should return null if targetSchema is missing', () => {
      const mapDef: MapDefinitionEntry = {
        $sourceSchema: 'Source.xsd',
      };

      expect(extractSchemaNames(mapDef)).toBeNull();
    });

    it('should return null if schema names are not strings', () => {
      const mapDef: MapDefinitionEntry = {
        $sourceSchema: { nested: 'object' },
        $targetSchema: 'Target.xsd',
      };

      expect(extractSchemaNames(mapDef)).toBeNull();
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve all data through embed and extract cycle', () => {
      const original = createXsltMapMetadata('MySource.json', 'MyTarget.json', sampleMapDefinition, sampleUiMetadata);

      const xsltWithMetadata = embedMetadataInXslt(sampleXslt, original);
      const extracted = extractMetadataFromXslt(xsltWithMetadata);

      expect(extracted).toEqual(original);
    });

    it('should handle complex map definitions', () => {
      const complexMapDef: MapDefinitionEntry = {
        $version: '1.0',
        $input: 'xml',
        $output: 'json',
        $sourceSchema: 'Complex.xsd',
        $targetSchema: 'Complex.json',
        '/Root': [
          {
            Items: [
              {
                '$for(Item)': {
                  Name: './Name',
                  Value: 'concat(./Value, "-suffix")',
                },
              },
            ],
          },
        ],
      };

      const metadata = createXsltMapMetadata('Complex.xsd', 'Complex.json', complexMapDef, sampleUiMetadata);

      const xsltWithMetadata = embedMetadataInXslt(sampleXslt, metadata);
      const extracted = extractMetadataFromXslt(xsltWithMetadata);

      expect(extracted?.mapDefinition).toEqual(complexMapDef);
    });

    it('should handle multiple function nodes in metadata', () => {
      const multipleNodeMetadata: MapMetadataV2 = {
        functionNodes: [
          {
            reactFlowGuid: 'func-1',
            functionKey: 'concat',
            position: { x: 100, y: 100 },
            connections: [],
            connectionShorthand: '',
          },
          {
            reactFlowGuid: 'func-2',
            functionKey: 'upper-case',
            position: { x: 200, y: 150 },
            connections: [{ name: 'func-1', inputOrder: 0 }],
            connectionShorthand: '0-func-1,',
          },
          {
            reactFlowGuid: 'func-3',
            functionKey: 'if',
            position: { x: 300, y: 200 },
            connections: [],
            connectionShorthand: '',
          },
        ],
        canvasRect: { x: 0, y: 0, width: 2000, height: 1000 },
      };

      const metadata = createXsltMapMetadata('Source.xsd', 'Target.xsd', sampleMapDefinition, multipleNodeMetadata);

      const xsltWithMetadata = embedMetadataInXslt(sampleXslt, metadata);
      const extracted = extractMetadataFromXslt(xsltWithMetadata);

      expect(extracted?.metadata.functionNodes).toHaveLength(3);
      expect(extracted?.metadata.functionNodes[1].functionKey).toBe('upper-case');
    });
  });

  describe('v3 metadata (without mapDefinition)', () => {
    const sampleV3Metadata: XsltMapMetadataV3 = {
      version: '3.0',
      sourceSchema: 'Source.xsd',
      targetSchema: 'Target.xsd',
      metadata: sampleUiMetadata,
    };

    describe('createXsltMapMetadataV3', () => {
      it('should create v3 metadata object without mapDefinition', () => {
        const result = createXsltMapMetadataV3('Source.xsd', 'Target.xsd', sampleUiMetadata);

        expect(result.version).toBe('3.0');
        expect(result.sourceSchema).toBe('Source.xsd');
        expect(result.targetSchema).toBe('Target.xsd');
        expect(result.metadata).toEqual(sampleUiMetadata);
        expect('mapDefinition' in result).toBe(false);
      });
    });

    describe('isV2Metadata and isV3Metadata type guards', () => {
      it('should correctly identify v2 metadata', () => {
        expect(isV2Metadata(sampleMetadata)).toBe(true);
        expect(isV3Metadata(sampleMetadata)).toBe(false);
      });

      it('should correctly identify v3 metadata', () => {
        expect(isV3Metadata(sampleV3Metadata)).toBe(true);
        expect(isV2Metadata(sampleV3Metadata)).toBe(false);
      });
    });

    describe('embedMetadataInXslt with v3', () => {
      it('should embed v3 metadata without mapDefinition', () => {
        const result = embedMetadataInXslt(sampleXslt, sampleV3Metadata);

        expect(result).toContain('<!-- LogicAppsDataMapper:');
        expect(result).toContain('"version": "3.0"');
        expect(result).toContain('"sourceSchema": "Source.xsd"');
        expect(result).not.toContain('"mapDefinition"');
      });
    });

    describe('extractMetadataFromXslt with v3', () => {
      it('should extract v3 metadata from XSLT', () => {
        const xsltWithMetadata = embedMetadataInXslt(sampleXslt, sampleV3Metadata);
        const result = extractMetadataFromXslt(xsltWithMetadata);

        expect(result).not.toBeNull();
        expect(result?.version).toBe('3.0');
        expect(result?.sourceSchema).toBe('Source.xsd');
        expect(result?.targetSchema).toBe('Target.xsd');
        expect(result?.metadata).toEqual(sampleUiMetadata);
        expect('mapDefinition' in result!).toBe(false);
      });

      it('should correctly identify extracted v3 metadata with type guard', () => {
        const xsltWithMetadata = embedMetadataInXslt(sampleXslt, sampleV3Metadata);
        const result = extractMetadataFromXslt(xsltWithMetadata);

        expect(result).not.toBeNull();
        expect(isV3Metadata(result!)).toBe(true);
        expect(isV2Metadata(result!)).toBe(false);
      });
    });

    describe('v3 round-trip serialization', () => {
      it('should preserve all v3 data through embed and extract cycle', () => {
        const original = createXsltMapMetadataV3('MySource.json', 'MyTarget.json', sampleUiMetadata);

        const xsltWithMetadata = embedMetadataInXslt(sampleXslt, original);
        const extracted = extractMetadataFromXslt(xsltWithMetadata);

        expect(extracted).toEqual(original);
      });
    });
  });
});
