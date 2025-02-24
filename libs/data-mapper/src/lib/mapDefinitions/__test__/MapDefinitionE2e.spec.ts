import { functionMock } from '../../models';
import { loadMapDefinition } from '../../utils/MapDefinition.Utils';
import { convertSchemaToSchemaExtended, flattenSchemaIntoSortArray } from '../../utils/Schema.Utils';
import { MapDefinitionDeserializer } from '../MapDefinitionDeserializer';
import { convertToMapDefinition } from '../MapDefinitionSerializer';
import type { SchemaExtended } from '@microsoft/logic-apps-shared';
import { comprehensiveMapDefinition, transcriptJsonMapDefinitionString } from '../../../__mocks__/mapDefinitions';
import {
  comprehensiveSourceSchema,
  comprehensiveTargetSchema,
  sourceMockJsonSchema,
  targetMockJsonSchema,
} from '../../../__mocks__/schemas';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('mapDefinitions/MapDefinitionE2e', () => {
  it.skip('XML to XML', () => {
    const mockSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
    const mockTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
    const mockTranscriptMapDefinition = loadMapDefinition(comprehensiveMapDefinition);

    const mapDefinitionDeserializer = new MapDefinitionDeserializer(
      mockTranscriptMapDefinition,
      mockSourceSchema,
      mockTargetSchema,
      functionMock
    );
    const connections = mapDefinitionDeserializer.convertFromMapDefinition();

    const targetSortArray = flattenSchemaIntoSortArray(mockTargetSchema.schemaTreeRoot);

    // Compare YAML as parsed objects to disregard any comments
    const newMapDefinitionString: string = convertToMapDefinition(connections, mockSourceSchema, mockTargetSchema, targetSortArray);

    const newMapDefinition = loadMapDefinition(newMapDefinitionString);

    // NOTE: Will be undefined if string === '', which happens when there's an issue w/ serialization
    expect(newMapDefinition).toBeDefined();

    // NOTE: toEqual will log the specific properties/values that differ
    expect(newMapDefinition).toEqual(mockTranscriptMapDefinition);
  });

  it.skip('JSON to JSON', () => {
    const mockSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceMockJsonSchema);
    const mockTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetMockJsonSchema);
    const mockTranscriptMapDefinition = loadMapDefinition(transcriptJsonMapDefinitionString);

    const mapDefinitionDeserializer = new MapDefinitionDeserializer(
      mockTranscriptMapDefinition,
      mockSourceSchema,
      mockTargetSchema,
      functionMock
    );
    const connections = mapDefinitionDeserializer.convertFromMapDefinition();

    const targetSortArray = flattenSchemaIntoSortArray(mockTargetSchema.schemaTreeRoot);

    // Compare YAML as parsed objects to disregard any comments
    const newMapDefinitionString: string = convertToMapDefinition(connections, mockSourceSchema, mockTargetSchema, targetSortArray);

    const newMapDefinition = loadMapDefinition(newMapDefinitionString);

    // NOTE: Will be undefined if string === '', which happens when there's an issue w/ serialization
    expect(newMapDefinition).toBeDefined();

    // NOTE: toEqual will log the specific properties/values that differ
    expect(newMapDefinition).toEqual(mockTranscriptMapDefinition);
  });
});
