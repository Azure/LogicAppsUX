import { sourceMockSchema, targetMockSchema, transcriptMockMapDefinitionString } from '../../__mocks__';
import { functionMock } from '../../models';
import type { MapDefinitionEntry, SchemaExtended } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { convertFromMapDefinition } from '../MapDefinitionDeserializer';
import { convertToMapDefinition } from '../MapDefinitionSerializer';
import * as yaml from 'js-yaml';

// TODO: Un-skip once all deserialization scenarios are supported/working
describe.skip('mapDefinitions/MapDefinitionE2e', () => {
  const mockSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceMockSchema);
  const mockTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetMockSchema);
  const mockTranscriptMapDefinition: MapDefinitionEntry = yaml.load(transcriptMockMapDefinitionString) as MapDefinitionEntry;

  const deserializedConnectionDictionary: ConnectionDictionary = convertFromMapDefinition(
    mockTranscriptMapDefinition,
    mockSourceSchema,
    mockTargetSchema,
    functionMock
  );

  // Compare YAML as parsed objects to disregard any comments
  const reserializedMapDefinitionString: string = convertToMapDefinition(
    deserializedConnectionDictionary,
    mockSourceSchema,
    mockTargetSchema
  );
  const reserializedMapDefinition: MapDefinitionEntry = yaml.load(reserializedMapDefinitionString) as MapDefinitionEntry;

  it('Map definition data was able to be serialized', () => {
    // NOTE: Will be undefined if string === '', which happens when there's an issue w/ serialization
    expect(reserializedMapDefinition).toBeDefined();
  });

  it('Deserializing then re-serializing produces the same map definition', () => {
    // NOTE: toEqual will log the specific properties/values that differ
    expect(reserializedMapDefinition).toEqual(mockTranscriptMapDefinition);
  });
});
