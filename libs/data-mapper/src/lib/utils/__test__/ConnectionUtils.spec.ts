import { concatFunction } from '../../__mocks__/FunctionMock';
import type { DataMapOperationState } from '../../core/state/DataMapSlice';
import type { SchemaNodeExtended } from '../../models';
import { NormalizedDataType, SchemaNodeProperty } from '../../models';
import type { Connection, ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
import type { FunctionData, FunctionInput } from '../../models/Function';
import { FunctionCategory, functionMock } from '../../models/Function';
import {
  applyConnectionValue,
  bringInParentSourceNodesForRepeating,
  createConnectionEntryIfNeeded,
  inputFromHandleId,
  isCustomValue,
  isFunctionInputSlotAvailable,
  isValidConnectionByType,
  newConnectionWillHaveCircularLogic,
  nodeHasSourceNodeEventually,
  nodeHasSpecificInputEventually,
  nodeHasSpecificOutputEventually,
} from '../Connection.Utils';
import { isSchemaNodeExtended } from '../Schema.Utils';
import { fullConnectionDictionaryForOneToManyLoop, fullMapForSimplifiedLoop } from '../__mocks__';

const mockBoundedFunctionInputs: FunctionInput[] = [
  {
    name: 'Value',
    allowedTypes: [NormalizedDataType.Integer],
    isOptional: false,
    allowCustomInput: false,
    tooltip: 'The value to use',
    placeHolder: 'The value',
  },
  {
    name: 'Scope',
    allowedTypes: [NormalizedDataType.String],
    isOptional: true,
    allowCustomInput: false,
    tooltip: 'The scope to use',
    placeHolder: 'The scope',
  },
];

describe('utils/Connections', () => {
  describe('createConnectionEntryIfNeeded', () => {
    const connections: ConnectionDictionary = {};

    it('Test new entry for SchemaNodeExtended is created with proper input placeholder', () => {
      const schemaNodeKey = 'schemaNodeTestKey';
      const schemaNode: SchemaNodeExtended = {
        key: '',
        name: '',
        qName: '',
        type: NormalizedDataType.Integer,
        properties: SchemaNodeProperty.None,
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [],
        arrayItemIndex: undefined,
        parentKey: undefined,
      };

      createConnectionEntryIfNeeded(connections, schemaNode, schemaNodeKey);

      expect(connections[schemaNodeKey].self.reactFlowKey).toEqual(schemaNodeKey);
      expect(connections[schemaNodeKey].self.node).toEqual(schemaNode);

      expect(Object.values(connections[schemaNodeKey].inputs).length).toEqual(1);
      expect(connections[schemaNodeKey].inputs[0]).toEqual([]);
    });

    it('Test new entry for Function is created with proper input placeholders', () => {
      const fnNodeKey = 'functionTestKey';
      const functionNode: FunctionData = functionMock.find((fn) => fn.key === 'Maximum') ?? functionMock[0];

      createConnectionEntryIfNeeded(connections, functionNode, fnNodeKey);

      expect(connections[fnNodeKey].self.reactFlowKey).toEqual(fnNodeKey);
      expect(connections[fnNodeKey].self.node).toEqual(functionNode);

      expect(Object.values(connections[fnNodeKey].inputs).length).toEqual(functionNode.inputs.length);
    });
  });

  describe('applyConnectionValue', () => {
    describe('Test drawn/deserialized connections', () => {
      const mockSourceReactFlowKey = 'sourceKey';
      const mockSelfReactFlowKey = 'selfKey';
      const mockSourceNode: SchemaNodeExtended = {
        key: mockSourceReactFlowKey,
        name: 'Source',
        qName: 'Source',
        type: NormalizedDataType.Integer,
        properties: SchemaNodeProperty.None,
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [],
        arrayItemIndex: undefined,
        parentKey: undefined,
      };

      it('Test doubly-linked-connection to schema node is made', () => {
        const mockConnections: ConnectionDictionary = {};
        const mockSelfNode: SchemaNodeExtended = {
          key: mockSelfReactFlowKey,
          name: 'Self',
          qName: 'Self',
          type: NormalizedDataType.Integer,
          properties: SchemaNodeProperty.None,
          nodeProperties: [SchemaNodeProperty.None],
          children: [],
          pathToRoot: [],
          arrayItemIndex: undefined,
          parentKey: undefined,
        };

        applyConnectionValue(mockConnections, {
          targetNode: mockSelfNode,
          targetNodeReactFlowKey: mockSelfReactFlowKey,
          findInputSlot: true,
          input: {
            reactFlowKey: mockSourceReactFlowKey,
            node: mockSourceNode,
          },
        });

        expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
        expect(mockConnections[mockSourceReactFlowKey].outputs.some((output) => output.reactFlowKey === mockSelfReactFlowKey)).toEqual(
          true
        );

        expect(mockConnections[mockSelfReactFlowKey]).toBeDefined();
        expect(
          Object.values(mockConnections[mockSelfReactFlowKey].inputs).some((inputValueArray) =>
            inputValueArray.some((input) => input && !isCustomValue(input) && input.reactFlowKey === mockSourceReactFlowKey)
          )
        ).toEqual(true);
      });

      it('Test doubly-linked-connection to function node is made', () => {
        const mockConnections: ConnectionDictionary = {};
        const mockSelfNode: FunctionData = {
          key: mockSelfReactFlowKey,
          functionName: 'Self',
          displayName: 'Self',
          category: FunctionCategory.Math,
          description: 'Self',
          inputs: mockBoundedFunctionInputs,
          maxNumberOfInputs: mockBoundedFunctionInputs.length,
          outputValueType: NormalizedDataType.Integer,
        };

        applyConnectionValue(mockConnections, {
          targetNode: mockSelfNode,
          targetNodeReactFlowKey: mockSelfReactFlowKey,
          findInputSlot: true,
          input: {
            reactFlowKey: mockSourceReactFlowKey,
            node: mockSourceNode,
          },
        });

        expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
        expect(mockConnections[mockSourceReactFlowKey].outputs.some((output) => output.reactFlowKey === mockSelfReactFlowKey)).toEqual(
          true
        );

        expect(mockConnections[mockSelfReactFlowKey]).toBeDefined();
        expect(
          Object.values(mockConnections[mockSelfReactFlowKey].inputs).some((inputValueArray) =>
            inputValueArray.some((input) => input && !isCustomValue(input) && input.reactFlowKey === mockSourceReactFlowKey)
          )
        ).toEqual(true);
      });

      it('Test that a specific input is connected', () => {
        const mockConnections: ConnectionDictionary = {};
        const mockSelfNode: FunctionData = {
          key: mockSelfReactFlowKey,
          functionName: 'Self',
          displayName: 'Self',
          category: FunctionCategory.Math,
          description: 'Self',
          inputs: mockBoundedFunctionInputs,
          maxNumberOfInputs: mockBoundedFunctionInputs.length,
          outputValueType: NormalizedDataType.Integer,
        };

        applyConnectionValue(mockConnections, {
          targetNode: mockSelfNode,
          targetNodeReactFlowKey: mockSelfReactFlowKey,
          findInputSlot: false,
          inputIndex: 1,
          input: {
            reactFlowKey: mockSourceReactFlowKey,
            node: mockSourceNode,
          },
        });

        expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
        expect(mockConnections[mockSourceReactFlowKey].outputs[0].reactFlowKey).toEqual(mockSelfReactFlowKey);

        expect(mockConnections[mockSelfReactFlowKey]).toBeDefined();
        expect(mockConnections[mockSelfReactFlowKey].inputs[0].length).toEqual(0);
        expect(mockConnections[mockSelfReactFlowKey].inputs[1].length).toEqual(1);
      });
    });

    describe('Test InputDropdown-made connections', () => {
      const currentNodeReactFlowKey = 'currentNodeKey';
      const atypicallyMockFunctionNode: FunctionData = {
        key: currentNodeReactFlowKey,
        functionName: 'Self',
        displayName: 'Self',
        category: FunctionCategory.Math,
        description: 'Self',
        inputs: mockBoundedFunctionInputs,
        maxNumberOfInputs: mockBoundedFunctionInputs.length,
        outputValueType: NormalizedDataType.Integer,
      };

      const mockConnections: ConnectionDictionary = {
        oldCon: {
          self: { reactFlowKey: 'oldCon', node: {} as SchemaNodeExtended },
          inputs: {},
          outputs: [{ reactFlowKey: currentNodeReactFlowKey, node: atypicallyMockFunctionNode }],
        },
        [currentNodeReactFlowKey]: {
          self: { reactFlowKey: currentNodeReactFlowKey, node: atypicallyMockFunctionNode },
          inputs: {
            0: [{ reactFlowKey: 'oldCon', node: {} as SchemaNodeExtended }],
            1: [],
          },
          outputs: [],
        },
      };

      it('Test new input connection is made (and old connection is removed)', () => {
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          input: { reactFlowKey: 'newCon', node: {} as SchemaNodeExtended },
        });

        expect(mockConnections['oldCon'].outputs.length).toEqual(0);
        expect((mockConnections[currentNodeReactFlowKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('newCon');
      });

      it('Test adding custom value input', () => {
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          input: 'Test custom value',
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[1][0]).toEqual('Test custom value');
      });

      it('Test clear a custom value - bounded input', () => {
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          input: undefined,
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[1].length).toEqual(0);
      });

      it('Test adding an unbounded input or clearing its custom value', () => {
        atypicallyMockFunctionNode.maxNumberOfInputs = -1;

        // This call is just setup for the next test
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          input: undefined,
        });

        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          input: undefined,
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[0][1]).toEqual(undefined);
      });

      it('Test delete unbounded input value', () => {
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          input: null,
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[0].length).toEqual(1);
      });
    });
  });

  describe('isValidConnectionByType', () => {
    it('returns true for direct type match', () => {
      expect(isValidConnectionByType(NormalizedDataType.String, NormalizedDataType.String)).toBeTruthy();
    });
    it('returns true target type "any"', () => {
      expect(isValidConnectionByType(NormalizedDataType.String, NormalizedDataType.Any)).toBeTruthy();
    });
    it('returns false for type mismatch', () => {
      expect(isValidConnectionByType(NormalizedDataType.String, NormalizedDataType.Number)).toBeFalsy();
    });
  });

  describe('isFunctionInputSlotAvailable', () => {
    it('Test bounded input with NO available slot', () => {
      const mockConnection: Connection = {
        self: {
          reactFlowKey: 'Placeholder',
          node: {} as SchemaNodeExtended,
        },
        inputs: {},
        outputs: [],
      };

      mockBoundedFunctionInputs.forEach((_input, idx) => {
        mockConnection.inputs[idx] = [''];
      });

      expect(isFunctionInputSlotAvailable(mockConnection, mockBoundedFunctionInputs.length)).toEqual(false);
    });

    it('Test bounded input with an available slot', () => {
      expect(isFunctionInputSlotAvailable(undefined, mockBoundedFunctionInputs.length)).toEqual(true);
    });

    it('Test unbounded input', () => {
      expect(isFunctionInputSlotAvailable(undefined, -1)).toEqual(true);
    });
  });

  describe('newConnectionWillHaveCircularLogic', () => {
    const currentNodeKey = 'testNode3';
    const desiredInputKey = 'desiredInput';
    const dummyNode = {} as SchemaNodeExtended;
    const mockConnectionsWithoutImpendingCircularLogic: ConnectionDictionary = {
      testNode1: {
        self: { node: dummyNode, reactFlowKey: 'testNode1' },
        inputs: {},
        outputs: [{ node: dummyNode, reactFlowKey: desiredInputKey }],
      },
      [desiredInputKey]: {
        self: { node: dummyNode, reactFlowKey: desiredInputKey },
        inputs: {},
        outputs: [],
      },
      [currentNodeKey]: {
        self: { node: dummyNode, reactFlowKey: currentNodeKey },
        inputs: {},
        outputs: [],
      },
    };

    it('Test will NOT have circular logic', () => {
      expect(newConnectionWillHaveCircularLogic(currentNodeKey, desiredInputKey, mockConnectionsWithoutImpendingCircularLogic)).toEqual(
        false
      );
    });

    it('Test will have circular logic', () => {
      const mockConnectionsWithImpendingCircularLogic = { ...mockConnectionsWithoutImpendingCircularLogic };
      mockConnectionsWithImpendingCircularLogic[currentNodeKey].outputs.push({ node: dummyNode, reactFlowKey: 'testNode1' });

      expect(newConnectionWillHaveCircularLogic(currentNodeKey, desiredInputKey, mockConnectionsWithImpendingCircularLogic)).toEqual(true);
    });
  });

  describe('bringInParentSourceNodesForRepeating', () => {
    const dmState: Partial<DataMapOperationState> = {
      dataMapConnections: fullMapForSimplifiedLoop,
      currentSourceSchemaNodes: [],
    };
    it('brings in one parent node for many to many scenario', () => {
      bringInParentSourceNodesForRepeating(parentTargetNode, dmState as DataMapOperationState);
      expect(dmState.currentSourceSchemaNodes?.length).toEqual(1);
    });

    it('brings in all of the parent source nodes for many to one scenario', () => {
      dmState.dataMapConnections = fullConnectionDictionaryForOneToManyLoop;
      dmState.currentSourceSchemaNodes = [];
      bringInParentSourceNodesForRepeating(parentManyToOneTargetNode, dmState as DataMapOperationState);
      expect(dmState.currentSourceSchemaNodes?.length).toEqual(3);
    });
  });

  describe('nodeHasSourceNodeEventually', () => {
    const dummyNode: SchemaNodeExtended = {
      key: '',
      name: '',
      qName: '',
      type: NormalizedDataType.Integer,
      properties: SchemaNodeProperty.None,
      nodeProperties: [SchemaNodeProperty.None],
      children: [],
      pathToRoot: [],
      arrayItemIndex: undefined,
      parentKey: undefined,
    };
    const mockConnections: ConnectionDictionary = {
      testSourceSchema1: {
        self: { node: dummyNode, reactFlowKey: 'testSourceSchema1' },
        inputs: {},
        outputs: [{ node: concatFunction, reactFlowKey: 'concatFunctionNode' }],
      },
      testSourceSchema2: {
        self: { node: dummyNode, reactFlowKey: 'testSourceSchema2' },
        inputs: {},
        outputs: [{ node: concatFunction, reactFlowKey: 'concatFunctionNode' }],
      },
      concatFunctionNode: {
        self: { node: concatFunction, reactFlowKey: 'concatFunctionNode' },
        inputs: {
          '0': [{ reactFlowKey: 'testSourceSchema1', node: dummyNode }],
          '1': [{ reactFlowKey: 'testSourceSchema2', node: dummyNode }],
        },
        outputs: [{ node: dummyNode, reactFlowKey: 'testTargetSchema' }],
      },
      testTargetSchema: {
        self: { node: dummyNode, reactFlowKey: 'testTargetSchema' },
        inputs: { '0': [{ reactFlowKey: 'concatFunctionNode', node: concatFunction }] },
        outputs: [],
      },
      targetSchemaToCustomValueFunction: {
        self: { node: dummyNode, reactFlowKey: 'targetSchemaToCustomValueFunction' },
        inputs: { '0': [{ reactFlowKey: 'concatWithOnlyCustom', node: concatFunction }] },
        outputs: [],
      },
      concatWithOnlyCustom: {
        self: { node: concatFunction, reactFlowKey: 'concatWithOnlyCustom' },
        inputs: {
          '0': [`"String 1"`, `"String 2`],
        },
        outputs: [{ node: dummyNode, reactFlowKey: 'targetSchemaToCustomValueFunction' }],
      },
    };

    it('Test can find a source node from depth == 1', () => {
      expect(isSchemaNodeExtended(dummyNode)).toBeTruthy();
      expect(nodeHasSourceNodeEventually(mockConnections['concatFunctionNode'], mockConnections)).toBeTruthy();
    });

    it('Test can recursively call from depth > 1', () => {
      expect(nodeHasSourceNodeEventually(mockConnections['testTargetSchema'], mockConnections)).toBeTruthy();
    });

    it('All custom is considered valid', () => {
      expect(nodeHasSourceNodeEventually(mockConnections['targetSchemaToCustomValueFunction'], mockConnections)).toBeTruthy();
    });
  });

  describe('nodeHasSpecificInputEventually', () => {
    const dummyNode: SchemaNodeExtended = {
      key: '',
      name: '',
      qName: '',
      type: NormalizedDataType.Integer,
      properties: SchemaNodeProperty.None,
      nodeProperties: [SchemaNodeProperty.None],
      children: [],
      pathToRoot: [],
      arrayItemIndex: undefined,
      parentKey: undefined,
    };
    const mockConnections: ConnectionDictionary = {
      testSourceSchema1: {
        self: { node: dummyNode, reactFlowKey: 'testSourceSchema1' },
        inputs: {},
        outputs: [{ node: concatFunction, reactFlowKey: 'concatFunctionNode' }],
      },
      testSourceSchema2: {
        self: { node: dummyNode, reactFlowKey: 'testSourceSchema2' },
        inputs: {},
        outputs: [{ node: concatFunction, reactFlowKey: 'concatFunctionNode' }],
      },
      concatFunctionNode: {
        self: { node: concatFunction, reactFlowKey: 'concatFunctionNode' },
        inputs: {
          '0': [{ reactFlowKey: 'testSourceSchema1', node: dummyNode }],
          '1': [{ reactFlowKey: 'testSourceSchema2', node: dummyNode }],
        },
        outputs: [{ node: dummyNode, reactFlowKey: 'testTargetSchema' }],
      },
      testTargetSchema: {
        self: { node: dummyNode, reactFlowKey: 'testTargetSchema' },
        inputs: { '0': [{ reactFlowKey: 'concatFunctionNode', node: concatFunction }] },
        outputs: [],
      },
    };

    it('Truthy when sourceKey in currentConnection with exact match', () => {
      expect(nodeHasSpecificInputEventually('testSourceSchema1', mockConnections['testSourceSchema1'], mockConnections, true)).toBeTruthy();
    });

    it('Truthy when sourceKey can be found in currentConnection reactFlowKey', () => {
      expect(nodeHasSpecificInputEventually('Source', mockConnections['testSourceSchema1'], mockConnections, false)).toBeTruthy();
    });

    it('Truthy when sourceKey can be found from depth > 1 (exactMatch = false)', () => {
      expect(nodeHasSpecificInputEventually('Source', mockConnections['testTargetSchema'], mockConnections, false)).toBeTruthy();
    });

    it('Falsy when sourceKey unable to be found from depth > 1 (exactMatch = true)', () => {
      expect(nodeHasSpecificInputEventually('testSourceSchema3', mockConnections['testTargetSchema'], mockConnections, true)).toBeFalsy();
    });
  });

  describe('nodeHasSpecificOutputEventually', () => {
    const dummyNode: SchemaNodeExtended = {
      key: '',
      name: '',
      qName: '',
      type: NormalizedDataType.Integer,
      properties: SchemaNodeProperty.None,
      nodeProperties: [SchemaNodeProperty.None],
      children: [],
      pathToRoot: [],
      arrayItemIndex: undefined,
      parentKey: undefined,
    };
    const mockConnections: ConnectionDictionary = {
      testSourceSchema1: {
        self: { node: dummyNode, reactFlowKey: 'testSourceSchema1' },
        inputs: {},
        outputs: [{ node: concatFunction, reactFlowKey: 'concatFunctionNode' }],
      },
      testSourceSchema2: {
        self: { node: dummyNode, reactFlowKey: 'testSourceSchema2' },
        inputs: {},
        outputs: [{ node: concatFunction, reactFlowKey: 'concatFunctionNode' }],
      },
      concatFunctionNode: {
        self: { node: concatFunction, reactFlowKey: 'concatFunctionNode' },
        inputs: {
          '0': [{ reactFlowKey: 'testSourceSchema1', node: dummyNode }],
          '1': [{ reactFlowKey: 'testSourceSchema2', node: dummyNode }],
        },
        outputs: [{ node: dummyNode, reactFlowKey: 'testTargetSchema' }],
      },
      testTargetSchema: {
        self: { node: dummyNode, reactFlowKey: 'testTargetSchema' },
        inputs: { '0': [{ reactFlowKey: 'concatFunctionNode', node: concatFunction }] },
        outputs: [],
      },
    };

    it('Truthy when sourceKey in currentConnection with exact match', () => {
      expect(
        nodeHasSpecificOutputEventually('testSourceSchema1', mockConnections['testSourceSchema1'], mockConnections, true)
      ).toBeTruthy();
    });

    it('Truthy when sourceKey can be found in currentConnection reactFlowKey', () => {
      expect(nodeHasSpecificOutputEventually('Source', mockConnections['testSourceSchema1'], mockConnections, false)).toBeTruthy();
    });

    it('Truthy when sourceKey can be found recursively (exactMatch = false)', () => {
      expect(nodeHasSpecificOutputEventually('Target', mockConnections['testSourceSchema1'], mockConnections, false)).toBeTruthy();
    });

    it('Falsy when sourceKey unable to be found recursively (exactMatch = true)', () => {
      expect(nodeHasSpecificOutputEventually('testTargetSchema1', mockConnections['testSourceSchema1'], mockConnections, true)).toBeFalsy();
    });
  });

  describe('isValidConnectionByType', () => {
    it('Truthy when both are the same non-Any datatypes', () => {
      expect(isValidConnectionByType(NormalizedDataType.String, NormalizedDataType.String)).toBeTruthy();
    });

    it('Truthy when src is Any data type', () => {
      expect(isValidConnectionByType(NormalizedDataType.Any, NormalizedDataType.Number)).toBeTruthy();
    });

    it('Truthy when tgt is Any data type', () => {
      expect(isValidConnectionByType(NormalizedDataType.Boolean, NormalizedDataType.Any)).toBeTruthy();
    });

    it('Falsy when both are different non-Any datatypes', () => {
      expect(isValidConnectionByType(NormalizedDataType.Integer, NormalizedDataType.String)).toBeFalsy();
    });
  });

  describe('inputFromHandleId', () => {
    it('returns undefined for no inputs', () => {
      const input = {
        allowCustomInput: true,
        allowedTypes: [NormalizedDataType.String],
        isOptional: false,
        name: 'Source value',
        placeHolder: 'The string or array to check the length.',
      };
      const funcData: Partial<FunctionData> = { inputs: [input], maxNumberOfInputs: -1 };
      const inputKey = inputFromHandleId('Source value', funcData as FunctionData);
      expect(inputKey).toBeUndefined();
    });
  });
});

const parentManyToOneTargetNode: SchemaNodeExtended = {
  key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
  name: 'Simple',
  type: NormalizedDataType.Complex,
  properties: 'Repeating',
  children: [
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct',
      name: 'Direct',
      type: NormalizedDataType.String,
      properties: 'None',
      children: [],
      qName: 'Direct',
      parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
      nodeProperties: [SchemaNodeProperty.Repeating],
      pathToRoot: [
        {
          key: '/ns0:TargetSchemaRoot',
          name: 'TargetSchemaRoot',
          qName: 'ns0:TargetSchemaRoot',
          repeating: false,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping',
          name: 'Looping',
          qName: 'Looping',
          repeating: false,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
          name: 'ManyToOne',
          qName: 'ManyToOne',
          repeating: false,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
          name: 'Simple',
          qName: 'Simple',
          repeating: true,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct',
          name: 'Direct',
          qName: 'Direct',
          repeating: false,
        },
      ],
      arrayItemIndex: undefined,
    },
  ],
  qName: 'Simple',
  parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
  nodeProperties: [SchemaNodeProperty.Repeating],
  pathToRoot: [
    {
      key: '/ns0:TargetSchemaRoot',
      name: 'TargetSchemaRoot',
      qName: 'ns0:TargetSchemaRoot',
      repeating: false,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping',
      name: 'Looping',
      qName: 'Looping',
      repeating: false,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
      name: 'ManyToOne',
      qName: 'ManyToOne',
      repeating: false,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
      name: 'Simple',
      qName: 'Simple',
      repeating: true,
    },
  ],
  arrayItemIndex: undefined,
};

const parentTargetNode: SchemaNodeExtended = {
  key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild',
  name: 'SimpleChildChild',
  type: NormalizedDataType.Complex,
  properties: 'Repeating',
  children: [
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild/Direct',
      name: 'Direct',
      type: NormalizedDataType.String,
      properties: 'None',
      qName: 'Direct',
      parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild',
      nodeProperties: [SchemaNodeProperty.None],
      children: [],
      pathToRoot: [
        {
          key: '/ns0:TargetSchemaRoot',
          name: 'TargetSchemaRoot',
          qName: 'ns0:TargetSchemaRoot',
          repeating: false,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping',
          name: 'Looping',
          qName: 'Looping',
          repeating: false,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToMany',
          name: 'ManyToMany',
          qName: 'ManyToMany',
          repeating: false,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple',
          name: 'Simple',
          qName: 'Simple',
          repeating: true,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild',
          name: 'SimpleChild',
          qName: 'SimpleChild',
          repeating: true,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild',
          name: 'SimpleChildChild',
          qName: 'SimpleChildChild',
          repeating: true,
        },
        {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild/Direct',
          name: 'Direct',
          qName: 'Direct',
          repeating: false,
        },
      ],
      arrayItemIndex: undefined,
    },
  ],
  qName: 'SimpleChildChild',
  parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild',
  nodeProperties: [SchemaNodeProperty.Repeating],
  pathToRoot: [
    {
      key: '/ns0:TargetSchemaRoot',
      name: 'TargetSchemaRoot',
      qName: 'ns0:TargetSchemaRoot',
      repeating: false,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping',
      name: 'Looping',
      qName: 'Looping',
      repeating: false,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToMany',
      name: 'ManyToMany',
      qName: 'ManyToMany',
      repeating: false,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple',
      name: 'Simple',
      qName: 'Simple',
      repeating: true,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild',
      name: 'SimpleChild',
      qName: 'SimpleChild',
      repeating: true,
    },
    {
      key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild',
      name: 'SimpleChildChild',
      qName: 'SimpleChildChild',
      repeating: true,
    },
  ],
  arrayItemIndex: undefined,
};
