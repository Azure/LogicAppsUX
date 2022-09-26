import {
  forWithChildrenValueMapDefinitionMock,
  forWithIndexAndValueMapDefinitionMock,
  ifWithChildrenAndValueMapDefinitionMock,
  simpleMapDefExampleConnectionsMock,
  simpleMapDefExampleMapDefinitionMock,
  simpleMockSchema,
} from '../__mocks__';
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
      expect(mapDefinition).toEqual(
        '$version: 1.0\n$input: XML\n$output: XML\n$sourceSchema: CBRSourceSchema.xsd\n$targetSchema: CBRSourceSchema.xsd\n'
      );
    });

    it('Test 1 connection', () => {
      const connections: ConnectionDictionary = {
        '/ns0:CBRInputRecord/Identity/UserID': {
          destination: '/ns0:CBRInputRecord/Identity/UserID',
          sourceValue: '/ns0:CBRInputRecord/Identity/UserID',
          reactFlowSource: 'source-/ns0:CBRInputRecord/Identity/UserID',
          reactFlowDestination: 'target-/ns0:CBRInputRecord/Identity/UserID',
        },
      };

      const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
      expect(mapDefinition).toEqual(
        '$version: 1.0\n$input: XML\n$output: XML\n$sourceSchema: CBRSourceSchema.xsd\n$targetSchema: CBRSourceSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    UserID: /ns0:CBRInputRecord/Identity/UserID'
      );
    });

    it('Test deep connection', () => {
      const connections: ConnectionDictionary = {
        '/ns0:CBRInputRecord/Identity/Name/FirstName': {
          destination: '/ns0:CBRInputRecord/Identity/Name/FirstName',
          sourceValue: '/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowSource: 'source-/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowDestination: 'target-/ns0:CBRInputRecord/Identity/Name/FirstName',
        },
      };

      const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
      expect(mapDefinition).toEqual(
        '$version: 1.0\n$input: XML\n$output: XML\n$sourceSchema: CBRSourceSchema.xsd\n$targetSchema: CBRSourceSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    Name:\n      FirstName: /ns0:CBRInputRecord/Identity/Name/FirstName'
      );
    });

    it('Test 2 connections', () => {
      const connections: ConnectionDictionary = {
        '/ns0:CBRInputRecord/Identity/Name/FirstName': {
          destination: '/ns0:CBRInputRecord/Identity/Name/FirstName',
          sourceValue: '/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowSource: 'source-/ns0:CBRInputRecord/Identity/Name/FirstName',
          reactFlowDestination: 'target-/ns0:CBRInputRecord/Identity/Name/FirstName',
        },
        '/ns0:CBRInputRecord/Identity/Name/LastName': {
          destination: '/ns0:CBRInputRecord/Identity/Name/LastName',
          sourceValue: '/ns0:CBRInputRecord/Identity/Name/LastName',
          reactFlowSource: 'source-/ns0:CBRInputRecord/Identity/Name/LastName',
          reactFlowDestination: 'target-/ns0:CBRInputRecord/Identity/Name/LastName',
        },
      };

      const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
      expect(mapDefinition).toEqual(
        '$version: 1.0\n$input: XML\n$output: XML\n$sourceSchema: CBRSourceSchema.xsd\n$targetSchema: CBRSourceSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    Name:\n      LastName: /ns0:CBRInputRecord/Identity/Name/LastName\n      FirstName: /ns0:CBRInputRecord/Identity/Name/FirstName'
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
  });

  describe('parseLoopMapping', () => {
    it('Regular for case: No comma (no index)', async () => {
      expect(parseLoopMapping('for(abcde)')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: No comma case (no index) with random spaces excluding the function', async () => {
      expect(parseLoopMapping('  for(abcde) ')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: No comma case (no index) with random spaces including the function', async () => {
      expect(parseLoopMapping('  for (  abcde ) ')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: Yes comma case (yes index)', async () => {
      expect(parseLoopMapping('for(abcde, ind)')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces excluding the function', async () => {
      expect(parseLoopMapping(' for  (abcde,ind)  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces including the function', async () => {
      expect(parseLoopMapping(' for  ( abcde,    ind )  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces including the function', async () => {
      // permitted since starting with "$for" is checked before this function call
      expect(parseLoopMapping('for-example(abcde)')).toEqual({ loopSource: 'abcde' });
    });
  });

  describe('parseConditionalMapping', () => {
    it('Regular if case', async () => {
      expect(parseConditionalMapping('if(not_equal(variable1))')).toEqual('not_equal(variable1)');
    });

    it('Regular if case with random spaces excluding the function', async () => {
      expect(parseConditionalMapping('if ( not_equal(variable1)) ')).toEqual('not_equal(variable1)');
    });

    it('Regular if case with random spaces including the function', async () => {
      expect(parseConditionalMapping('if ( not_equal ( variable1 ) ) ')).toEqual('not_equal ( variable1 )');
    });

    it('Not starting with if case', async () => {
      // Permitted since starting with "$if" is checked before this function call
      expect(parseConditionalMapping('if-else-example(not_equal(variable1))')).toEqual('not_equal(variable1)');
    });
  });
});
