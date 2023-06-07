import { simpleMockSchema } from '../../../__mocks__';
import { concatFunction } from '../../../__mocks__/FunctionMock';
import type { Schema, SchemaExtended } from '../../../models';
import { SchemaType } from '../../../models';
import type { ConnectionDictionary } from '../../../models/Connection';
import { applyConnectionValue, flattenInputs } from '../../../utils/Connection.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from '../../../utils/ReactFlow.Util';
import { convertSchemaToSchemaExtended } from '../../../utils/Schema.Utils';
import {
  fullConnectionDictionaryForOneToManyLoop,
  fullMapForSimplifiedLoop,
  indexedConnections,
  manyToManyConnectionSourceName,
} from '../../../utils/__mocks__';
import { deleteConnectionFromConnections, deleteNodeFromConnections, deleteParentRepeatingConnections } from '../DataMapSlice';

// NOTE: Functions with an unbounded input (like our concatFunction mock) will have two empty (undefined) values/fields by default
describe('DataMapSlice', () => {
  const schema: Schema = simpleMockSchema;
  const extendedSchema: SchemaExtended = convertSchemaToSchemaExtended(schema);
  const node = extendedSchema.schemaTreeRoot.children[0];
  const sourceId = addReactFlowPrefix(node.key, SchemaType.Source);
  const destinationId = addReactFlowPrefix(node.key, SchemaType.Target);
  const functionId = createReactFlowFunctionKey(concatFunction);

  describe('Simulate handle-drawn / deserialization-made connection', () => {
    it('Add passthrough connection', () => {
      const connections: ConnectionDictionary = {};

      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceId,
          node: node,
        },
      });

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

      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: functionId,
          node: concatFunction,
        },
      });
      applyConnectionValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: functionId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceId,
          node: node,
        },
      });

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

      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: functionId,
          node: concatFunction,
        },
      });
      applyConnectionValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: functionId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceId,
          node: node,
        },
      });
      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: functionId,
          node: concatFunction,
        },
      });

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

      const newConnections = deleteNodeFromConnections(connections, destinationId);

      expect(Object.keys(connections).length).toEqual(0);
      expect(Object.keys(newConnections).length).toEqual(0);
    });

    it('Delete node with a connection', () => {
      const connections: ConnectionDictionary = {};

      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceId,
          node: node,
        },
      });

      const newConnections = deleteNodeFromConnections(connections, destinationId);

      expect(Object.keys(connections).length).toEqual(2);
      expect(Object.keys(newConnections).length).toEqual(1);

      expect(newConnections[sourceId]).toBeDefined();
      expect(newConnections[sourceId].self).toBeDefined();
      expect(newConnections[sourceId].outputs.length).toEqual(0);
      expect(flattenInputs(newConnections[sourceId].inputs).length).toEqual(0);

      expect(newConnections[destinationId]).toBeUndefined();
    });

    it('Delete function node', () => {
      const connections: ConnectionDictionary = {};

      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: functionId,
          node: concatFunction,
        },
      });
      applyConnectionValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: functionId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceId,
          node: node,
        },
      });

      const newConnections = deleteNodeFromConnections(connections, functionId);

      expect(Object.keys(connections).length).toEqual(3);
      expect(Object.keys(newConnections).length).toEqual(2);

      expect(newConnections[sourceId]).toBeDefined();
      expect(newConnections[sourceId].self).toBeDefined();
      expect(newConnections[sourceId].outputs.length).toEqual(0);
      expect(flattenInputs(newConnections[sourceId].inputs).length).toEqual(0);

      expect(newConnections[functionId]).toBeUndefined();

      expect(newConnections[destinationId]).toBeDefined();
      expect(newConnections[destinationId].self).toBeDefined();
      expect(newConnections[destinationId].outputs.length).toEqual(0);
      expect(flattenInputs(newConnections[destinationId].inputs).length).toEqual(0);
    });
  });

  describe('deleteConnectionFromConnections', () => {
    it('Delete passthrough connection', () => {
      const connections: ConnectionDictionary = {};

      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceId,
          node: node,
        },
      });
      deleteConnectionFromConnections(connections, sourceId, destinationId, undefined);

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

      applyConnectionValue(connections, {
        targetNode: node,
        targetNodeReactFlowKey: destinationId,
        findInputSlot: true,
        input: {
          reactFlowKey: functionId,
          node: concatFunction,
        },
      });
      applyConnectionValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: functionId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceId,
          node: node,
        },
      });

      deleteConnectionFromConnections(connections, functionId, destinationId, undefined);

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

  describe('deleteParentRepeatingConnections', () => {
    it('deletes all parent connections when selected deleted connection is only one', () => {
      const connections1 = JSON.parse(JSON.stringify(fullMapForSimplifiedLoop));
      // removing the connection that is 'deleted
      connections1['source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'].outputs =
        [];
      deleteParentRepeatingConnections(connections1, manyToManyConnectionSourceName);
      expect(
        connections1['source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild'].outputs
      ).toHaveLength(0);
      expect(connections1['source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild'].outputs).toHaveLength(0);
      expect(connections1['source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple'].outputs).toHaveLength(0);
    });

    it('doesnt delete any other parent connections if another child is connected', () => {
      const connections = { ...fullMapForSimplifiedLoop };
      deleteParentRepeatingConnections(connections, manyToManyConnectionSourceName);
      expect(
        connections['source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild'].outputs
      ).toHaveLength(1);
      expect(connections['source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild'].outputs).toHaveLength(1);
      expect(connections['source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple'].outputs).toHaveLength(1);
    });

    it('doesnt delete parent connection if index is being used', () => {
      const connections = { ...indexedConnections };
      // removing the connection that is 'deleted
      connections['source-/ns0:Root/Looping/Employee/TelephoneNumber'].outputs = [];
      deleteParentRepeatingConnections(connections, 'source-/ns0:Root/Looping/Employee/TelephoneNumber');
      expect(connections['source-/ns0:Root/Looping/Employee'].outputs).toHaveLength(1); // has one output to the index
    });

    it('deletes all connections for many-to-one', () => {
      const connections = fullConnectionDictionaryForOneToManyLoop;
      connections['source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'].outputs =
        [];
      deleteParentRepeatingConnections(
        connections,
        'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
      );
      expect(
        connections['source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'].outputs
      ).toHaveLength(0);
      expect(connections['source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild'].outputs).toHaveLength(0);
      expect(connections['source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple'].outputs).toHaveLength(0);
    });
  });
});
