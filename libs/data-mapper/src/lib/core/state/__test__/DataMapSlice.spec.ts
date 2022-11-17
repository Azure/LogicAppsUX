import type { Schema, SchemaExtended, SchemaNodeExtended } from '../../../models';
import { SchemaType, SchemaNodeProperty } from '../../../models';
import type { ConnectionDictionary } from '../../../models/Connection';
import { addNodeToConnections, flattenInputs } from '../../../utils/Connection.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from '../../../utils/ReactFlow.Util';
import { convertSchemaToSchemaExtended } from '../../../utils/Schema.Utils';
import { canDeleteConnection, deleteConnectionFromConnections, deleteNodeFromConnections } from '../DataMapSlice';
import { simpleMockSchema } from '../__mocks__';
import { concatFunction } from '../__mocks__/FunctionMock';

// NOTE: Functions with an unbounded input (like our concatFunction mock) will have two empty (undefined) values/fields by default

describe('DataMapSlice', () => {
  const schema: Schema = simpleMockSchema;
  const extendedSchema: SchemaExtended = convertSchemaToSchemaExtended(schema);
  const node = extendedSchema.schemaTreeRoot.children[0];
  const sourceId = addReactFlowPrefix(node.key, SchemaType.Source);
  const destinationId = addReactFlowPrefix(node.key, SchemaType.Target);
  const functionId = createReactFlowFunctionKey(concatFunction);

  describe('addNodeToConnections', () => {
    it('Add passthrough connection', () => {
      const connections: ConnectionDictionary = {};

      addNodeToConnections(connections, node, sourceId, node, destinationId);

      expect(Object.keys(connections).length).toEqual(2);

      expect(connections[sourceId]).toBeDefined();
      expect(connections[sourceId].self).toBeDefined();
      expect(connections[sourceId].outputs.length).toEqual(1);
      expect(flattenInputs(connections[sourceId].inputs).length).toEqual(0);

      expect(connections[destinationId]).toBeDefined();
      expect(connections[destinationId].self).toBeDefined();
      expect(connections[destinationId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[destinationId].inputs).length).toEqual(1);
    });

    it('Add function connection', () => {
      const connections: ConnectionDictionary = {};

      addNodeToConnections(connections, concatFunction, functionId, node, destinationId);
      addNodeToConnections(connections, node, sourceId, concatFunction, functionId);

      expect(Object.keys(connections).length).toEqual(3);

      expect(connections[sourceId]).toBeDefined();
      expect(connections[sourceId].self).toBeDefined();
      expect(connections[sourceId].outputs.length).toEqual(1);
      expect(flattenInputs(connections[sourceId].inputs).length).toEqual(0);

      expect(connections[functionId]).toBeDefined();
      expect(connections[functionId].self).toBeDefined();
      expect(connections[functionId].outputs.length).toEqual(1);
      expect(flattenInputs(connections[functionId].inputs).length).toEqual(2);

      expect(connections[destinationId]).toBeDefined();
      expect(connections[destinationId].self).toBeDefined();
      expect(connections[destinationId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[destinationId].inputs).length).toEqual(1);
    });

    it('Add same function connection twice', () => {
      const connections: ConnectionDictionary = {};

      addNodeToConnections(connections, concatFunction, functionId, node, destinationId);
      addNodeToConnections(connections, node, sourceId, concatFunction, functionId);
      addNodeToConnections(connections, concatFunction, functionId, node, destinationId);

      expect(Object.keys(connections).length).toEqual(3);

      expect(connections[sourceId]).toBeDefined();
      expect(connections[sourceId].self).toBeDefined();
      expect(connections[sourceId].outputs.length).toEqual(1);
      expect(flattenInputs(connections[sourceId].inputs).length).toEqual(0);

      expect(connections[functionId]).toBeDefined();
      expect(connections[functionId].self).toBeDefined();
      expect(connections[functionId].outputs.length).toEqual(1);
      expect(flattenInputs(connections[functionId].inputs).length).toEqual(2);

      expect(connections[destinationId]).toBeDefined();
      expect(connections[destinationId].self).toBeDefined();
      expect(connections[destinationId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[destinationId].inputs).length).toEqual(1);
    });
  });

  describe('deleteNodeFromConnections', () => {
    it('Delete node with no connections', () => {
      const connections: ConnectionDictionary = {};

      deleteNodeFromConnections(connections, destinationId);

      expect(Object.keys(connections).length).toEqual(0);
    });

    it('Delete node with a connection', () => {
      const connections: ConnectionDictionary = {};

      addNodeToConnections(connections, node, sourceId, node, destinationId);
      deleteNodeFromConnections(connections, destinationId);

      expect(Object.keys(connections).length).toEqual(1);

      expect(connections[sourceId]).toBeDefined();
      expect(connections[sourceId].self).toBeDefined();
      expect(connections[sourceId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[sourceId].inputs).length).toEqual(0);

      expect(connections[destinationId]).toBeUndefined();
    });

    it('Delete function node', () => {
      const connections: ConnectionDictionary = {};

      addNodeToConnections(connections, concatFunction, functionId, node, destinationId);
      addNodeToConnections(connections, node, sourceId, concatFunction, functionId);

      deleteNodeFromConnections(connections, functionId);

      expect(Object.keys(connections).length).toEqual(2);

      expect(connections[sourceId]).toBeDefined();
      expect(connections[sourceId].self).toBeDefined();
      expect(connections[sourceId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[sourceId].inputs).length).toEqual(0);

      expect(connections[functionId]).toBeUndefined();

      expect(connections[destinationId]).toBeDefined();
      expect(connections[destinationId].self).toBeDefined();
      expect(connections[destinationId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[destinationId].inputs).length).toEqual(0);
    });
  });

  describe('deleteConnectionFromConnections', () => {
    it('Delete passthrough connection', () => {
      const connections: ConnectionDictionary = {};

      addNodeToConnections(connections, node, sourceId, node, destinationId);
      deleteConnectionFromConnections(connections, sourceId, destinationId);

      expect(Object.keys(connections).length).toEqual(2);

      expect(connections[sourceId]).toBeDefined();
      expect(connections[sourceId].self).toBeDefined();
      expect(connections[sourceId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[sourceId].inputs).length).toEqual(0);

      expect(connections[destinationId]).toBeDefined();
      expect(connections[destinationId].self).toBeDefined();
      expect(connections[destinationId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[destinationId].inputs).length).toEqual(0);
    });

    it('Delete function connection', () => {
      const connections: ConnectionDictionary = {};

      addNodeToConnections(connections, concatFunction, functionId, node, destinationId);
      addNodeToConnections(connections, node, sourceId, concatFunction, functionId);

      deleteConnectionFromConnections(connections, functionId, destinationId);

      expect(Object.keys(connections).length).toEqual(3);

      expect(connections[sourceId]).toBeDefined();
      expect(connections[sourceId].self).toBeDefined();
      expect(connections[sourceId].outputs.length).toEqual(1);
      expect(flattenInputs(connections[sourceId].inputs).length).toEqual(0);

      expect(connections[functionId]).toBeDefined();
      expect(connections[functionId].self).toBeDefined();
      expect(connections[functionId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[functionId].inputs).length).toEqual(2);

      expect(connections[destinationId]).toBeDefined();
      expect(connections[destinationId].self).toBeDefined();
      expect(connections[destinationId].outputs.length).toEqual(0);
      expect(flattenInputs(connections[destinationId].inputs).length).toEqual(0);
    });
  });

  describe('canDeleteConnection', () => {
    it('returns true with non-repeating connection', () => {
      const connections: ConnectionDictionary = {};
      const source = 'abc';
      const target = '';
      const canDelete = canDeleteConnection(connections, source, target, { abc: simpleSourceNode }, {});
      expect(canDelete).toBeTruthy();
    });
  });
});

const simpleSourceNode: SchemaNodeExtended = {
  children: [],
  nodeProperties: [SchemaNodeProperty.NotSpecified],
  pathToRoot: [],
  key: 'abc',
  fullName: 'ABC',
} as unknown as SchemaNodeExtended;
