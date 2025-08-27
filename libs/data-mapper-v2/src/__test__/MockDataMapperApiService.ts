import type { IDataMapperApiService, TestMapResponse, GenerateXsltResponse } from '../core/services/dataMapperApiService';
import type { FunctionManifest } from '../models/Function';
import type { DataMapSchema, SchemaFileFormat, NormalizedDataType } from '@microsoft/logic-apps-shared';
import { TestSchemaProvider } from './TestSchemaProvider';

/**
 * Mock API Service for Testing - Provides local schema data instead of HTTP calls
 *
 * This service replaces DataMapperApiService to avoid 404 errors when testing
 * with mock schemas that don't exist on the server.
 */
export class MockDataMapperApiService implements IDataMapperApiService {
  async getFunctionsManifest(): Promise<FunctionManifest> {
    console.log('Mock API: Getting functions manifest');
    // Return minimal function manifest for testing
    return {
      version: '1.0.0',
      functionManifest: [],
      transformFunctions: [],
      dataMapperExtensionFunctions: {},
    } as FunctionManifest;
  }

  /**
   * Key method: Provides local schema data instead of HTTP calls
   */
  async getSchemaFile(schemaName: string, schemaFilePath: string): Promise<DataMapSchema> {
    console.log('Mock API: Getting schema file:', { schemaName, schemaFilePath });

    // Check if this is one of our test schemas
    const schemaContent = TestSchemaProvider.getSchemaContent(schemaFilePath);

    if (schemaContent) {
      console.log('✅ Mock API: Found test schema content for:', schemaFilePath);

      // Create a mock DataMapSchema response
      const mockSchema: DataMapSchema = {
        name: schemaName,
        type: schemaFilePath.endsWith('.json') ? ('JSON' as SchemaFileFormat) : ('XML' as SchemaFileFormat),
        targetNamespace: 'http://tempuri.org/test',
        schemaTreeRoot: this.createMockSchemaTree(schemaFilePath, schemaContent),
      };

      return mockSchema;
    }

    // If not a test schema, throw an error similar to the real service
    console.error('❌ Mock API: Schema not found:', schemaFilePath);
    throw new Error(`Mock API: Schema not found: ${schemaFilePath}`);
  }

  async generateDataMapXslt(dataMapDefinition: string): Promise<string> {
    console.log('Mock API: Generating XSLT from definition');
    // Return mock XSLT for testing
    return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <!-- Mock XSLT generated from: ${dataMapDefinition.substring(0, 100)}... -->
  <xsl:template match="/">
    <output>Mock transformation result</output>
  </xsl:template>
</xsl:stylesheet>`;
  }

  async testDataMap(dataMapXsltFilename: string, schemaInputValue: string): Promise<TestMapResponse> {
    console.log('Mock API: Testing data map:', { dataMapXsltFilename, schemaInputValue });

    return {
      statusCode: 200,
      statusText: 'OK',
      outputInstance: {
        $content: '<result>Mock test result</result>',
        '$content-type': 'application/xml',
      },
    };
  }

  getSchemaFileUri(schemaFilename: string, schemaFilePath: string): string {
    console.log('Mock API: Getting schema file URI:', { schemaFilename, schemaFilePath });
    // Return mock URI for test schemas
    return `mock://test-schemas/${schemaFilename}`;
  }

  /**
   * Create mock schema tree from content
   */
  private createMockSchemaTree(filePath: string, content: string): any {
    console.log('Mock API: Creating schema tree for:', filePath);

    // Simplified schema tree creation based on file type
    if (filePath.includes('xslt-source')) {
      return {
        key: '/ns0:SourceRoot',
        name: 'SourceRoot',
        qName: 'ns0:SourceRoot',
        type: 'Complex' as NormalizedDataType,
        properties: '',
        children: [
          {
            key: '/ns0:SourceRoot/ns0:Customer',
            name: 'Customer',
            qName: 'ns0:Customer',
            type: 'Complex' as NormalizedDataType,
            properties: '',
            children: [
              {
                key: '/ns0:SourceRoot/ns0:Customer/ns0:Name',
                name: 'Name',
                qName: 'ns0:Name',
                type: 'String' as NormalizedDataType,
                properties: '',
                children: [],
              },
              {
                key: '/ns0:SourceRoot/ns0:Customer/ns0:Email',
                name: 'Email',
                qName: 'ns0:Email',
                type: 'String' as NormalizedDataType,
                properties: '',
                children: [],
              },
            ],
          },
        ],
      };
    } else if (filePath.includes('xslt-target')) {
      return {
        key: '/ns0:TargetRoot',
        name: 'TargetRoot',
        qName: 'ns0:TargetRoot',
        type: 'Complex' as NormalizedDataType,
        properties: '',
        children: [
          {
            key: '/ns0:TargetRoot/ns0:CustomerInfo',
            name: 'CustomerInfo',
            qName: 'ns0:CustomerInfo',
            type: 'Complex' as NormalizedDataType,
            properties: '',
            children: [
              {
                key: '/ns0:TargetRoot/ns0:CustomerInfo/ns0:Name',
                name: 'Name',
                qName: 'ns0:Name',
                type: 'String' as NormalizedDataType,
                properties: '',
                children: [],
              },
            ],
          },
        ],
      };
    }

    // Default schema tree
    return {
      key: '/ns0:Root',
      name: 'Root',
      qName: 'ns0:Root',
      type: 'Complex' as NormalizedDataType,
      properties: '',
      children: [],
    };
  }
}
