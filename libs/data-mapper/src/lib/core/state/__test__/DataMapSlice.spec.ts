import { simpleMockSchema } from '../../../__mocks__';
import { concatFunction } from '../../../__mocks__/FunctionMock';
import type { FunctionData, FunctionDictionary } from '../../../models';
import { FunctionCategory, functionMock } from '../../../models';
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
import {
  assignFunctionNodePositionsFromMetadata,
  deleteConnectionFromConnections,
  deleteNodeFromConnections,
  deleteParentRepeatingConnections,
} from '../DataMapSlice';
import type { FunctionMetadata, FunctionPositionMetadata, Schema, SchemaExtended } from '@microsoft/utils-logic-apps';
import { NormalizedDataType, SchemaNodeProperty, SchemaType } from '@microsoft/utils-logic-apps';

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

  describe('assignFunctionNodePositionsFromMetadata', () => {
    it.skip('matches correct function together', () => {
      const expectedPosition: FunctionPositionMetadata = {
        targetKey: '/ns0:Root/DirectTranslation/Employee/Name',
        position: {
          x: 600,
          y: 700,
        },
      };
      const mockManifest: FunctionMetadata = {
        functionKey: 'ToLower',
        reactFlowGuid: 'ToLower-C7328819-6073-42FE-98F2-53E20D2DBC4B',
        positions: [expectedPosition],
        connections: [
          { name: 'source-/ns0:Root/DirectTranslation/EmployeeName', inputOrder: 0 },
          { name: '/ns0:Root/DirectTranslation/Employee/Name', inputOrder: 1 },
        ],
        connectionShorthand: '',
      };
      assignFunctionNodePositionsFromMetadata(connectionDict, [mockManifest], functionDict);
      expect(functionDict['ToLower-C7328819-6073-42FE-98F2-53E20D2DBC4B'].functionData.positions).toEqual([expectedPosition]);
    });
  });
});

const functionData = functionMock.find((func) => func.key === 'ToLower') as FunctionData;

const functionDict: FunctionDictionary = {
  'ToLower-C7328819-6073-42FE-98F2-53E20D2DBC4B': {
    functionLocations: [],
    functionData,
  },
};

const connectionDict: ConnectionDictionary = {
  'ToLower-C7328819-6073-42FE-98F2-53E20D2DBC4B': {
    self: {
      node: {
        key: 'ToLower',
        maxNumberOfInputs: 1,
        functionName: 'lower-case',
        outputValueType: NormalizedDataType.String,
        inputs: [
          {
            name: 'Value',
            allowedTypes: [NormalizedDataType.String],
            isOptional: false,
            allowCustomInput: true,
            tooltip: 'The value to use',
            placeHolder: 'The value',
          },
        ],
        displayName: 'To Lower',
        category: FunctionCategory.String,
        description: 'Sets a string to be all lower case',
        tooltip: 'Lower case',
        children: [],
      },
      reactFlowKey: 'ToLower-C7328819-6073-42FE-98F2-53E20D2DBC4B',
    },
    inputs: {
      '0': [
        {
          reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeName',
          node: {
            key: '/ns0:Root/DirectTranslation/EmployeeName',
            name: 'EmployeeName',
            type: NormalizedDataType.String,
            properties: 'None',
            qName: 'EmployeeName',
            parentKey: '/ns0:Root/DirectTranslation',
            nodeProperties: [],
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                qName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/DirectTranslation',
                name: 'DirectTranslation',
                qName: 'DirectTranslation',
                repeating: false,
              },
              {
                key: '/ns0:Root/DirectTranslation/EmployeeName',
                name: 'EmployeeName',
                qName: 'EmployeeName',
                repeating: false,
              },
            ],
          },
        },
      ],
    },
    outputs: [
      {
        node: {
          key: '/ns0:Root/DirectTranslation/Employee/Name',
          name: 'Name',
          type: NormalizedDataType.String,
          properties: 'None',
          qName: 'Name',
          parentKey: '/ns0:Root/DirectTranslation/Employee',
          nodeProperties: [],
          children: [],
          pathToRoot: [
            {
              key: '/ns0:Root',
              name: 'Root',
              qName: 'ns0:Root',
              repeating: false,
            },
            {
              key: '/ns0:Root/DirectTranslation',
              name: 'DirectTranslation',
              qName: 'DirectTranslation',
              repeating: false,
            },
            {
              key: '/ns0:Root/DirectTranslation/Employee',
              name: 'Employee',
              qName: 'Employee',
              repeating: false,
            },
            {
              key: '/ns0:Root/DirectTranslation/Employee/Name',
              name: 'Name',
              qName: 'Name',
              repeating: false,
            },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/DirectTranslation/Employee/Name',
      },
    ],
  },
  'source-/ns0:Root/DirectTranslation/EmployeeName': {
    self: {
      node: {
        key: '/ns0:Root/DirectTranslation/EmployeeName',
        name: 'EmployeeName',
        type: NormalizedDataType.String,
        properties: 'None',
        qName: 'EmployeeName',
        parentKey: '/ns0:Root/DirectTranslation',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/DirectTranslation',
            name: 'DirectTranslation',
            qName: 'DirectTranslation',
            repeating: false,
          },
          {
            key: '/ns0:Root/DirectTranslation/EmployeeName',
            name: 'EmployeeName',
            qName: 'EmployeeName',
            repeating: false,
          },
        ],
      },
      reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeName',
    },
    inputs: {
      '0': [],
    },
    outputs: [
      {
        node: {
          key: 'ToLower',
          maxNumberOfInputs: 1,
          functionName: 'lower-case',
          outputValueType: NormalizedDataType.String,
          inputs: [
            {
              name: 'Value',
              allowedTypes: [NormalizedDataType.String],
              isOptional: false,
              allowCustomInput: true,
              tooltip: 'The value to use',
              placeHolder: 'The value',
            },
          ],
          displayName: 'To Lower',
          category: FunctionCategory.String,
          description: 'Sets a string to be all lower case',
          tooltip: 'Lower case',
          children: [],
          positions: [
            {
              targetKey: '/ns0:Root/DirectTranslation/Employee',
              position: {
                x: 340.85643738977075,
                y: 55.14426807760134,
              },
            },
            {
              targetKey: '/ns0:Root/DirectTranslation/Employee',
              position: {
                x: 311.7326278659612,
                y: 40.905961199294495,
              },
            },
          ],
        },
        reactFlowKey: 'ToLower-C7328819-6073-42FE-98F2-53E20D2DBC4B',
      },
    ],
  },
  'target-/ns0:Root/DirectTranslation/Employee/Name': {
    self: {
      node: {
        key: '/ns0:Root/DirectTranslation/Employee/Name',
        name: 'Name',
        type: NormalizedDataType.String,
        properties: 'None',
        qName: 'Name',
        parentKey: '/ns0:Root/DirectTranslation/Employee',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/DirectTranslation',
            name: 'DirectTranslation',
            qName: 'DirectTranslation',
            repeating: false,
          },
          {
            key: '/ns0:Root/DirectTranslation/Employee',
            name: 'Employee',
            qName: 'Employee',
            repeating: false,
          },
          {
            key: '/ns0:Root/DirectTranslation/Employee/Name',
            name: 'Name',
            qName: 'Name',
            repeating: false,
          },
        ],
      },
      reactFlowKey: 'target-/ns0:Root/DirectTranslation/Employee/Name',
    },
    inputs: {
      '0': [
        {
          reactFlowKey: 'ToLower-C7328819-6073-42FE-98F2-53E20D2DBC4B',
          node: {
            key: 'ToLower',
            maxNumberOfInputs: 1,
            functionName: 'lower-case',
            outputValueType: NormalizedDataType.String,
            inputs: [
              {
                name: 'Value',
                allowedTypes: [NormalizedDataType.String],
                isOptional: false,
                allowCustomInput: true,
                tooltip: 'The value to use',
                placeHolder: 'The value',
              },
            ],
            displayName: 'To Lower',
            category: FunctionCategory.Collection,
            description: 'Sets a string to be all lower case',
            tooltip: 'Lower case',
            children: [],
            positions: [
              {
                targetKey: '/ns0:Root/DirectTranslation/Employee',
                position: {
                  x: 340.85643738977075,
                  y: 55.14426807760134,
                },
              },
              {
                targetKey: '/ns0:Root/DirectTranslation/Employee',
                position: {
                  x: 311.7326278659612,
                  y: 40.905961199294495,
                },
              },
            ],
          },
        },
      ],
    },
    outputs: [],
  },
};
