import type { IDataMapperFileService, SchemaFile } from '../core/services/dataMapperFileService/dataMapperFileService';
import { TestSchemaProvider } from './TestSchemaProvider';
import { store } from '../core/state/Store';
import { loadCurrentSchemaOptions } from '../core/state/SchemaSlice';
import { setInitialSchema, setInitialXsltDataMap } from '../core/state/DataMapSlice';
import type { SchemaType } from '@microsoft/logic-apps-shared';
import { LogEntryLevel } from '@microsoft/logic-apps-shared';

/**
 * Mock File Service for Testing - Provides test schemas to the dropdown
 */
export class MockDataMapperFileService implements IDataMapperFileService {
  getSchemaFromFile(schemaType: SchemaType): void {
    console.log(`Mock: Getting schema from file for type: ${schemaType}`);
    // This would typically open a file dialog
    // For testing, we could auto-select a test schema
  }

  saveMapDefinitionCall(dataMapDefinition: string, mapMetadata: string): void {
    console.log('Mock: Saving map definition:', {
      definitionLength: dataMapDefinition.length,
      metadataLength: mapMetadata.length,
    });
  }

  saveDraftStateCall(dataMapDefinition: string): void {
    console.log('Mock: Saving draft state:', { length: dataMapDefinition.length });
  }

  /**
   * Key method: Provides test schemas to the dropdown
   */
  readCurrentSchemaOptions(): void {
    console.log('Mock: Reading current schema options - providing test schemas');

    // Get test schemas from the provider
    const testSchemas = TestSchemaProvider.getTestSchemas();

    // Dispatch to store to populate the dropdown
    store.dispatch(loadCurrentSchemaOptions(testSchemas));

    console.log('✅ Test schemas loaded into dropdown:', testSchemas.length);
  }

  saveXsltCall(xslt: string): void {
    console.log('Mock: Saving XSLT:', { length: xslt.length });
  }

  readCurrentCustomXsltPathOptions(): void {
    console.log('Mock: Reading custom XSLT path options');
    // Could provide test XSLT files here
  }

  /**
   * Get schema content for a given path (public method for testing)
   */
  public getSchemaContent(path: string): string {
    return TestSchemaProvider.getSchemaContent(path);
  }

  /**
   * Handle when user selects a schema from dropdown
   */
  addSchemaFromFile(selectedSchemaFile: SchemaFile): void {
    console.log('Mock: Adding schema from file:', selectedSchemaFile);

    const schemaContent = TestSchemaProvider.getSchemaContent(selectedSchemaFile.path);
    const schemaType = selectedSchemaFile.type;

    if (schemaContent) {
      try {
        // Parse the schema content (simplified for testing)
        const mockSchema = this.createMockSchemaFromContent(schemaContent, selectedSchemaFile.path, schemaType);

        // Dispatch to store
        store.dispatch(
          setInitialSchema({
            schema: mockSchema,
            schemaType: schemaType,
          })
        );

        console.log(`✅ Test ${schemaType} schema loaded:`, selectedSchemaFile.path);
        this.sendNotification('Schema Loaded', `Test ${schemaType} schema loaded successfully`, LogEntryLevel.Verbose);
      } catch (error) {
        console.error('❌ Error loading test schema:', error);
        this.sendNotification('Schema Load Error', `Failed to load test schema: ${error}`, LogEntryLevel.Error);
      }
    } else {
      console.error('❌ No content found for schema path:', selectedSchemaFile.path);
    }
  }

  sendNotification(title: string, text: string, level: number): void {
    console.log(`📢 Notification [${level}]: ${title} - ${text}`);
  }

  isTestDisabledForOS(): void {
    // For testing, assume tests are enabled
    console.log('Mock: Test is enabled for current OS');
  }

  /**
   * Create a mock schema object from content (simplified)
   */
  private createMockSchemaFromContent(content: string, path: string, schemaType: SchemaType) {
    // This is a simplified mock - in real implementation,
    // this would parse XSD/JSON schema into SchemaExtended format

    const mockSchema = {
      name:
        path
          .split('/')
          .pop()
          ?.replace(/\.[^/.]+$/, '') || 'TestSchema',
      type: schemaType,
      namespaces: {},
      targetNamespace: 'http://tempuri.org/test',
      schemaTreeRoot: this.createMockSchemaNode(path, content),
    };

    return mockSchema;
  }

  /**
   * Create mock schema node structure
   */
  private createMockSchemaNode(path: string, content: string): any {
    // Simplified mock node creation
    if (path.includes('xslt-source')) {
      return {
        key: '/SourceRoot',
        name: 'SourceRoot',
        qName: 'SourceRoot',
        type: 'object',
        properties: [],
        nodeProperties: [],
        children: [
          {
            key: '/SourceRoot/Customer',
            name: 'Customer',
            qName: 'Customer',
            type: 'object',
            properties: [],
            nodeProperties: [],
            children: [
              {
                key: '/SourceRoot/Customer/Name',
                name: 'Name',
                qName: 'Name',
                type: 'string',
                properties: [],
                nodeProperties: [],
                children: [],
                parentKey: '/SourceRoot/Customer',
                pathToRoot: [],
              },
              {
                key: '/SourceRoot/Customer/Email',
                name: 'Email',
                qName: 'Email',
                type: 'string',
                properties: [],
                nodeProperties: [],
                children: [],
                parentKey: '/SourceRoot/Customer',
                pathToRoot: [],
              },
            ],
            parentKey: '/SourceRoot',
            pathToRoot: [],
          },
        ],
        parentKey: undefined,
        pathToRoot: [],
      };
    } else if (path.includes('xslt-target')) {
      return {
        key: '/TargetRoot',
        name: 'TargetRoot',
        qName: 'TargetRoot',
        type: 'object',
        properties: [],
        nodeProperties: [],
        children: [
          {
            key: '/TargetRoot/CustomerInfo',
            name: 'CustomerInfo',
            qName: 'CustomerInfo',
            type: 'object',
            properties: [],
            nodeProperties: [],
            children: [
              {
                key: '/TargetRoot/CustomerInfo/Name',
                name: 'Name',
                qName: 'Name',
                type: 'string',
                properties: [],
                nodeProperties: [],
                children: [],
                parentKey: '/TargetRoot/CustomerInfo',
                pathToRoot: [],
              },
            ],
            parentKey: '/TargetRoot',
            pathToRoot: [],
          },
        ],
        parentKey: undefined,
        pathToRoot: [],
      };
    }

    // Default simple schema
    return {
      key: '/Root',
      name: 'Root',
      qName: 'Root',
      type: 'object',
      properties: [],
      nodeProperties: [],
      children: [],
      parentKey: undefined,
      pathToRoot: [],
    };
  }
}
