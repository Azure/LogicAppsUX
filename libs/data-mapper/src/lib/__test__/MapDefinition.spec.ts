import {
  forWithChildrenValueMapDefinitionMock,
  forWithIndexAndValueMapDefinitionMock,
  ifWithChildrenAndValueMapDefinitionMock,
  missingDstSchemaNameMapDefinitionMock,
  missingSrcSchemaNameMapDefinitionMock,
  simpleMapDefExampleConnectionsMock,
  simpleMapDefExampleMapDefinitionMock,
  simpleMockSchema,
} from '../__mocks__';
import { InvalidFormatExceptionCode } from '../exceptions/MapDefinitionExceptions';
import type { ConnectionDictionary } from '../models/Connection';
import type { Schema } from '../models/Schema';
import { convertFromMapDefinition, convertToMapDefinition, parseConditionalMapping, parseLoopMapping } from '../utils/DataMap.Utils';
import { convertSchemaToSchemaExtended } from '../utils/Schema.Utils';

describe('Map definition conversions', () => {
  describe('convertToMapDefinition', () => {
    const schema: Schema = simpleMockSchema;
    const extendedSchema = convertSchemaToSchemaExtended(schema);

    it('Test no connections', () => {
      const connections: ConnectionDictionary = {};

      const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
      expect(mapDefinition).toEqual('$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\n');
    });

    it('Test 1 connection', () => {
      const connections: ConnectionDictionary = {
        '/ns0:CBRInputRecord/Identity/UserID': {
          value: '/ns0:CBRInputRecord/Identity/UserID',
          reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/UserID',
          reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/UserID',
        },
      };

      const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
      expect(mapDefinition).toEqual(
        '$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    UserID: /ns0:CBRInputRecord/Identity/UserID'
      );
    });

    it('Test deep connection', () => {
      const connections: ConnectionDictionary = {
        '/ns0:CBRInputRecord/Identity/Name/FirstName': {
          value: '/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/Name/FirstName',
        },
      };

      const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
      expect(mapDefinition).toEqual(
        '$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    Name:\n      FirstName: /ns0:CBRInputRecord/Identity/Name/FirstName'
      );
    });

    it('Test 2 connections', () => {
      const connections: ConnectionDictionary = {
        '/ns0:CBRInputRecord/Identity/Name/FirstName': {
          value: '/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/Name/FirstName',
        },
        '/ns0:CBRInputRecord/Identity/Name/LastName': {
          value: '/ns0:CBRInputRecord/Identity/Name/LastName',
          reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/Name/LastName',
          reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/Name/LastName',
        },
      };

      const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
      expect(mapDefinition).toEqual(
        '$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    Name:\n      LastName: /ns0:CBRInputRecord/Identity/Name/LastName\n      FirstName: /ns0:CBRInputRecord/Identity/Name/FirstName'
      );
    });

    // TODO Tests for loops

    // TODO Tests for conditionals
  });

  describe('convertFromMapDefinition', () => {
    it('Test simple definition', async () => {
      const actualConnections = convertFromMapDefinition(simpleMapDefExampleMapDefinitionMock);
      expect(actualConnections).toEqual(simpleMapDefExampleConnectionsMock);
    });

    it.skip('Test for with children and value at the same time', () => {
      const actualConnections = convertFromMapDefinition(forWithChildrenValueMapDefinitionMock);
      expect(actualConnections).toEqual({});
    });

    it.skip('Test for with children with index', () => {
      const actualConnections = convertFromMapDefinition(forWithIndexAndValueMapDefinitionMock);
      expect(actualConnections).toEqual({});
    });

    it.skip('Test if with children and value at the same time', () => {
      const actualConnections = convertFromMapDefinition(ifWithChildrenAndValueMapDefinitionMock);
      expect(actualConnections).toEqual({});
    });

    it('Test missing source schema name', () => {
      expect(() => {
        convertFromMapDefinition(missingSrcSchemaNameMapDefinitionMock);
      }).toThrow(InvalidFormatExceptionCode.MISSING_SCHEMA_NAME);
    });

    it('Test missing destination schema name', () => {
      expect(() => {
        convertFromMapDefinition(missingDstSchemaNameMapDefinitionMock);
      }).toThrow(InvalidFormatExceptionCode.MISSING_SCHEMA_NAME);
    });
  });

  describe('parseLoopMapping', () => {
    it('Regular for case: No comma (no index)', async () => {
      expect(parseLoopMapping('for(abcde)')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: No comma case (no index) with random spaces excluding the expression', async () => {
      expect(parseLoopMapping('  for(abcde) ')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: No comma case (no index) with random spaces including the expression', async () => {
      expect(parseLoopMapping('  for (  abcde ) ')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: Yes comma case (yes index)', async () => {
      expect(parseLoopMapping('for(abcde, ind)')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces excluding the expression', async () => {
      expect(parseLoopMapping(' for  (abcde,ind)  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces including the expression', async () => {
      expect(parseLoopMapping(' for  ( abcde,    ind )  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces including the expression', async () => {
      // permitted since starting with "$for" is checked before this function call
      expect(parseLoopMapping('for-example(abcde)')).toEqual({ loopSource: 'abcde' });
    });
  });

  describe('parseConditionalMapping', () => {
    it('Regular if case', async () => {
      expect(parseConditionalMapping('if(not_equal(variable1))')).toEqual('not_equal(variable1)');
    });

    it('Regular if case with random spaces excluding the expression', async () => {
      expect(parseConditionalMapping('if ( not_equal(variable1)) ')).toEqual('not_equal(variable1)');
    });

    it('Regular if case with random spaces including the expression', async () => {
      expect(parseConditionalMapping('if ( not_equal ( variable1 ) ) ')).toEqual('not_equal ( variable1 )');
    });

    it('Not starting with if case', async () => {
      // Permitted since starting with "$if" is checked before this function call
      expect(parseConditionalMapping('if-else-example(not_equal(variable1))')).toEqual('not_equal(variable1)');
    });
  });
});
