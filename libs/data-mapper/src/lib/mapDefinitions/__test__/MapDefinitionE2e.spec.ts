import { sourceMockSchema, targetMockSchema, transcriptMockMapDefinitionString } from '../../__mocks__';
import { functionMock } from '../../models';
import type { MapDefinitionEntry, SchemaExtended } from '../../models';
import type { ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
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

  // TODO: remove
  console.dir(Object.entries(deserializedConnectionDictionary).slice(3, 8), { depth: null });

  describe('Initial deserialization', () => {
    it('Direct translation (passthrough)', () => {
      expect(
        (deserializedConnectionDictionary['target-/ns0:Root/DirectTranslation/Employee/ID']?.inputs[0][0] as ConnectionUnit).reactFlowKey
      ).toBe('source-/ns0:Root/DirectTranslation/EmployeeID');
      expect(
        (deserializedConnectionDictionary['target-/ns0:Root/DirectTranslation/Employee/Name']?.inputs[0][0] as ConnectionUnit).reactFlowKey
      ).toBe('source-/ns0:Root/DirectTranslation/EmployeeName');
    });

    it('Data translation (attributes)', () => {
      expect(
        (deserializedConnectionDictionary['target-/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime']?.inputs[0][0] as ConnectionUnit)
          .reactFlowKey
      ).toBe('source-/ns0:Root/DataTranslation/Employee/EmploymentStatus');

      expect(
        (
          deserializedConnectionDictionary['target-/ns0:Root/DataTranslation/EmployeeName']?.inputs[0][0] as ConnectionUnit
        ).reactFlowKey.includes('Concat')
      ).toBe(true);
      // TODO: Ensure the Concat node's inputs match what the map definition specifies
    });

    it('Content enrichment', () => {
      expect(
        (
          deserializedConnectionDictionary['target-/ns0:Root/ContentEnrich/DateOfDemo']?.inputs[0][0] as ConnectionUnit
        ).reactFlowKey.includes('CurrentDate')
      ).toBe(true);
    });

    it('Cumulative expression (loops w/ functions)', () => {
      expect(true).toBeTruthy(); // TODO
    });

    it('Conditional mapping', () => {
      expect(true).toBeTruthy(); // TODO
    });

    it('Looping', () => {
      expect(true).toBeTruthy(); // TODO
    });

    it('Conditional looping', () => {
      expect(true).toBeTruthy(); // TODO
    });

    // TODO: WI #16700911
    it.skip('Looping w/ index', () => {
      expect(true).toBeTruthy();
    });

    // TODO: WI #16700908 - this scenario technically occurs within that ^ category
    // from the mapDef, so may need to do some rearranging/re-labeling

    // TODO: Figure out what this category is testing for (or if it's just demo'ing a different real-world scenario)
    it('Name value transforms (???)', () => {
      expect(true).toBeTruthy();
    });

    // TODO: WI #16701021
    it.skip('Dot value-access', () => {
      expect(true).toBeTruthy();
    });
  });

  describe('Re-serialization', () => {
    // Compare YAML as parsed objects to disregard any comments
    const reserializedMapDefinitionString: string = convertToMapDefinition(
      deserializedConnectionDictionary,
      mockSourceSchema,
      mockTargetSchema
    );
    const reserializedMapDefinition: MapDefinitionEntry = yaml.load(reserializedMapDefinitionString) as MapDefinitionEntry;

    it('Current map definition data was able to be serialized', () => {
      // NOTE: Will be undefined if string === '', which happens when there's an issue w/ serialization
      expect(reserializedMapDefinition).toBeDefined();
    });

    it('Unmodified / re-serialized map definition reproduces exact same initial map definition', () => {
      // NOTE: toEqual will log the specific properties/values that differ
      expect(reserializedMapDefinition).toEqual(mockTranscriptMapDefinition);
    });
  });
});
