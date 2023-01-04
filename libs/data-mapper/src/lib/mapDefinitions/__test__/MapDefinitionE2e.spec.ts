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

      const concatRfKey = (
        deserializedConnectionDictionary['target-/ns0:Root/DataTranslation/EmployeeName']?.inputs[0][0] as ConnectionUnit
      ).reactFlowKey;
      expect(concatRfKey.includes('Concat')).toBe(true);
      expect((deserializedConnectionDictionary[concatRfKey]?.inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
        'source-/ns0:Root/DataTranslation/Employee/FirstName'
      );
      expect(deserializedConnectionDictionary[concatRfKey]?.inputs[0][1] as ConnectionUnit).toBe(`" "`);
      expect((deserializedConnectionDictionary[concatRfKey]?.inputs[0][2] as ConnectionUnit).reactFlowKey).toBe(
        'source-/ns0:Root/DataTranslation/Employee/LastName'
      );
    });

    it('Content enrichment', () => {
      expect(
        (
          deserializedConnectionDictionary['target-/ns0:Root/ContentEnrich/DateOfDemo']?.inputs[0][0] as ConnectionUnit
        ).reactFlowKey.includes('CurrentDate')
      ).toBe(true);
    });

    it('Cumulative expression (loops w/ functions)', () => {
      expect(
        (deserializedConnectionDictionary['target-/ns0:Root/CumulativeExpression/PopulationSummary/State']?.inputs[0][0] as ConnectionUnit)
          .reactFlowKey
      ).toBe('source-/ns0:Root/CumulativeExpression/Population/State');
      expect(
        (
          deserializedConnectionDictionary['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/Name']
            ?.inputs[0][0] as ConnectionUnit
        ).reactFlowKey
      ).toBe('source-/ns0:Root/CumulativeExpression/Population/State/Name');

      /* TODO/ISSUE: Deserialization failure - BUG #16711817
      // console.log(deserializedConnectionDictionary['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio']?.inputs);

      const divideRfKey = (
        deserializedConnectionDictionary['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio']
          ?.inputs[0][0] as ConnectionUnit
      ).reactFlowKey;
      expect(divideRfKey.includes('Divide')).toBe(true);
      const divideConnection = deserializedConnectionDictionary[divideRfKey];

      const firstCountRfKey = (divideConnection?.inputs[0][0] as ConnectionUnit).reactFlowKey;
      const secondCountRfKey = (divideConnection?.inputs[1][0] as ConnectionUnit).reactFlowKey;
      expect(firstCountRfKey.includes('Count')).toBe(true);
      expect(secondCountRfKey.includes('Count')).toBe(true);

      expect((deserializedConnectionDictionary[firstCountRfKey]?.inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
        'source-/ns0:Root/CumulativeExpression/Population/County/Person/Sex/Male'
      );
      expect((deserializedConnectionDictionary[secondCountRfKey]?.inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
        'source-/ns0:Root/CumulativeExpression/Population/County/Person/Sex/Female'
      );
      */
    });

    it('Conditional mapping', () => {
      expect(
        (deserializedConnectionDictionary['target-/ns0:Root/ConditionalMapping/ItemPrice']?.inputs[0][0] as ConnectionUnit).reactFlowKey
      ).toBe('source-/ns0:Root/ConditionalMapping/ItemPrice');
      expect(
        (deserializedConnectionDictionary['target-/ns0:Root/ConditionalMapping/ItemQuantity']?.inputs[0][0] as ConnectionUnit).reactFlowKey
      ).toBe('source-/ns0:Root/ConditionalMapping/ItemQuantity');

      /* TODO/ISSUE: Deserialization failure - BUG #16711867
        // console.log(deserializedConnectionDictionary['target-/ns0:Root/ConditionalMapping/ItemDiscount']?.inputs);

            TODO: Write test(s) against expected results
        */
    });

    it('Looping', () => {
      expect((deserializedConnectionDictionary['target-/ns0:Root/Looping/Person']?.inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
        'source-/ns0:Root/Looping/Employee'
      );

      expect((deserializedConnectionDictionary['target-/ns0:Root/Looping/Person/Name']?.inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
        'source-/ns0:Root/Looping/Employee/Name'
      );
      expect(
        (deserializedConnectionDictionary['target-/ns0:Root/Looping/Person/Address']?.inputs[0][0] as ConnectionUnit).reactFlowKey
      ).toBe('source-/ns0:Root/Looping/Employee/Address');
      expect((deserializedConnectionDictionary['target-/ns0:Root/Looping/Person/Other']?.inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
        'source-/ns0:Root/Looping/Employee/Country'
      );
    });

    // TODO (Support deserialization): WI #16700904
    it.skip('Conditional looping', () => {
      expect(true).toBeTruthy(); // TODO
    });

    // TODO (Support deserialization): WI #16700911
    it.skip('Looping w/ index', () => {
      expect(true).toBeTruthy();
    });

    // TODO (Support deserialization): WI #16700908 - this scenario technically occurs within that ^ category
    // from the mapDef, so may want to do some rearranging/re-labeling

    it.skip('Name value transforms (???)', () => {
      // TODO: Figure out what this category is testing for (or if it's just demo'ing a different real-world scenario)
      expect(true).toBeTruthy();
    });

    // TODO (Support deserialization): WI #16701021
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
