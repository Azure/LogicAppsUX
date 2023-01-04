import { sourceMockSchema, targetMockSchema, transcriptMockMapDefinitionString } from '../../__mocks__';
import { functionMock } from '../../models';
import type { MapDefinitionEntry, SchemaExtended } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { convertFromMapDefinition } from '../MapDefinitionDeserializer';
import { convertToMapDefinition } from '../MapDefinitionSerializer';
import * as yaml from 'js-yaml';

describe('mapDefinitions/MapDefinitionE2e', () => {
  const mockSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceMockSchema);
  const mockTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetMockSchema);
  const mockTranscriptMapDefinition: MapDefinitionEntry = yaml.load(transcriptMockMapDefinitionString) as MapDefinitionEntry;

  const deserializedConnectionDictionary: ConnectionDictionary = convertFromMapDefinition(
    mockTranscriptMapDefinition,
    mockSourceSchema,
    mockTargetSchema,
    functionMock
  );
  describe('Initial deserialization', () => {
    it('TODO: Each individual deserialization case', () => {
      expect(true).toBeTruthy();
    });
  });

  // Compare YAML as parsed objects to disregard any comments
  const reserializedMapDefinition: MapDefinitionEntry = yaml.load(
    convertToMapDefinition(deserializedConnectionDictionary, mockSourceSchema, mockTargetSchema)
  ) as MapDefinitionEntry;
  describe('Re-serialization', () => {
    it('Unmodified / re-serialized map definition reproduces exact same initial map definition', () => {
      expect(reserializedMapDefinition).toEqual(mockTranscriptMapDefinition);
    });
  });
});
