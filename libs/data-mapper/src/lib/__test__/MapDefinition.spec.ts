import { sourceMockSchema } from '../__mocks__';
import { concatFunction } from '../__mocks__/FunctionMock';
import type { MapDefinitionEntry, Schema, SchemaExtended } from '../models';
import { SchemaTypes } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { addNodeToConnections } from '../utils/Connection.Utils';
import { generateMapDefinitionBody, generateMapDefinitionHeader, splitKeyIntoChildren } from '../utils/DataMap.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { convertSchemaToSchemaExtended } from '../utils/Schema.Utils';

describe('Map definition conversions', () => {
  describe('generateMapDefinitionHeader', () => {
    const sourceSchema: Schema = sourceMockSchema;
    const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

    const targetSchema: Schema = sourceMockSchema;
    const extendedTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetSchema);

    it('Generates header', async () => {
      const mapDefinition: MapDefinitionEntry = {};
      generateMapDefinitionHeader(mapDefinition, extendedSourceSchema, extendedTargetSchema);

      expect(Object.keys(mapDefinition).length).toEqual(7);
    });

    it('Generates body with passthrough', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[0];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[0];
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      addNodeToConnections(
        connections,
        sourceNode.children[0],
        addReactFlowPrefix(sourceNode.children[0].key, SchemaTypes.Source),
        targetNode.children[0],
        addReactFlowPrefix(targetNode.children[0].key, SchemaTypes.Target)
      );

      addNodeToConnections(
        connections,
        sourceNode.children[1],
        addReactFlowPrefix(sourceNode.children[1].key, SchemaTypes.Source),
        targetNode.children[1],
        addReactFlowPrefix(targetNode.children[1].key, SchemaTypes.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('DirectTranslation');
      expect(rootChildren[0][1]).not.toBe('string');

      const nodeChildren = Object.entries((mapDefinition['ns0:Root'] as MapDefinitionEntry)['DirectTranslation']);
      expect(nodeChildren.length).toEqual(2);
      expect(nodeChildren[0][0]).toEqual('EmployeeID');
      expect(nodeChildren[0][1]).toEqual('/ns0:Root/DirectTranslation/EmployeeID');
      expect(nodeChildren[1][0]).toEqual('EmployeeName');
      expect(nodeChildren[1][1]).toEqual('/ns0:Root/DirectTranslation/EmployeeName');
    });

    it('Generates body with function', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[0];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[0];
      const functionId = createReactFlowFunctionKey(concatFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      addNodeToConnections(
        connections,
        sourceNode.children[0],
        addReactFlowPrefix(sourceNode.children[0].key, SchemaTypes.Source),
        concatFunction,
        functionId
      );
      addNodeToConnections(
        connections,
        sourceNode.children[1],
        addReactFlowPrefix(sourceNode.children[1].key, SchemaTypes.Source),
        concatFunction,
        functionId
      );
      addNodeToConnections(
        connections,
        concatFunction,
        functionId,
        targetNode.children[0],
        addReactFlowPrefix(targetNode.children[0].key, SchemaTypes.Target)
      );

      addNodeToConnections(
        connections,
        sourceNode.children[1],
        addReactFlowPrefix(sourceNode.children[1].key, SchemaTypes.Source),
        targetNode.children[1],
        addReactFlowPrefix(targetNode.children[1].key, SchemaTypes.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('DirectTranslation');
      expect(rootChildren[0][1]).not.toBe('string');

      const nodeChildren = Object.entries((mapDefinition['ns0:Root'] as MapDefinitionEntry)['DirectTranslation']);
      expect(nodeChildren.length).toEqual(2);
      expect(nodeChildren[0][0]).toEqual('EmployeeID');
      expect(nodeChildren[0][1]).toEqual('concat(/ns0:Root/DirectTranslation/EmployeeID, /ns0:Root/DirectTranslation/EmployeeName)');
      expect(nodeChildren[1][0]).toEqual('EmployeeName');
      expect(nodeChildren[1][1]).toEqual('/ns0:Root/DirectTranslation/EmployeeName');
    });
  });

  describe('splitKeyIntoChildren', () => {
    it('No nested functions', async () => {
      expect(splitKeyIntoChildren('to-lower(EmployeeName)')).toEqual(['EmployeeName']);
    });

    it('Multiple node ids', async () => {
      expect(splitKeyIntoChildren('concat(EmployeeName, EmployeeID)')).toEqual(['EmployeeName', 'EmployeeID']);
    });

    it('Content enricher', async () => {
      expect(splitKeyIntoChildren('get-date()')).toEqual([]);
    });

    it('Mixed node and function', async () => {
      expect(splitKeyIntoChildren('concat(EmployeeName, string(EmployeeID))')).toEqual(['EmployeeName', 'string(EmployeeID)']);
    });

    it('Multiple functions', async () => {
      expect(splitKeyIntoChildren('concat(to-lower(EmployeeName), string(EmployeeID))')).toEqual([
        'to-lower(EmployeeName)',
        'string(EmployeeID)',
      ]);
    });

    it('Single constant', async () => {
      expect(splitKeyIntoChildren('to-lower("UpperCase")')).toEqual([`"UpperCase"`]);
    });

    it('Constants with parenthesis', async () => {
      expect(splitKeyIntoChildren('to-lower("(UpperCase)")')).toEqual([`"(UpperCase)"`]);
    });

    it('Constants with half parenthesis', async () => {
      expect(splitKeyIntoChildren('concat(to-lower("(SingleLeft"), "(2ndSingleLeft")')).toEqual([
        `to-lower("(SingleLeft")`,
        `"(2ndSingleLeft"`,
      ]);
    });

    it('Complex', async () => {
      expect(splitKeyIntoChildren('concat(to-lower(EmployeeName), "Start Date: ", get-date(), string(EmployeeID))')).toEqual([
        'to-lower(EmployeeName)',
        `"Start Date: "`,
        'get-date()',
        'string(EmployeeID)',
      ]);
    });
  });
});
