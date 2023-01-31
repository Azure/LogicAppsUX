import { concatFunction } from '../../__mocks__/FunctionMock';
import type { DataMapOperationState } from '../../core/state/DataMapSlice';
import type { SchemaNodeExtended } from '../../models';
import { NormalizedDataType, SchemaNodeProperty } from '../../models';
import type { Connection, ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
import type { FunctionData, FunctionInput } from '../../models/Function';
import { FunctionCategory, functionMock } from '../../models/Function';
import {
  bringInParentSourceNodesForRepeating,
  createConnectionEntryIfNeeded,
  isCustomValue,
  isFunctionInputSlotAvailable,
  isValidConnectionByType,
  newConnectionWillHaveCircularLogic,
  nodeHasSourceNodeEventually,
  setConnectionInputValue,
} from '../Connection.Utils';
import { isSchemaNodeExtended } from '../Schema.Utils';
import { fullConnectionDictionaryForOneToManyLoop, fullMapForSimplifiedLoop } from '../__mocks__';

// TODO: nodeHasSourceNodeEventually
// TODO: nodeHasSpecificInputEventually
// TODO: collectNodesForConnectionChain ?

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
        fullName: '',
        normalizedDataType: NormalizedDataType.Integer,
        properties: SchemaNodeProperty.NotSpecified,
        nodeProperties: [SchemaNodeProperty.NotSpecified],
        children: [],
        pathToRoot: [],
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

  describe('setConnectionInputValue', () => {
    describe('Test drawn/deserialized connections', () => {
      const mockSourceReactFlowKey = 'sourceKey';
      const mockSelfReactFlowKey = 'selfKey';
      const mockSourceNode: SchemaNodeExtended = {
        key: mockSourceReactFlowKey,
        name: 'Source',
        fullName: 'Source',
        normalizedDataType: NormalizedDataType.Integer,
        properties: SchemaNodeProperty.NotSpecified,
        nodeProperties: [SchemaNodeProperty.NotSpecified],
        children: [],
        pathToRoot: [],
      };

      it('Test doubly-linked-connection to schema node is made', () => {
        const mockConnections: ConnectionDictionary = {};
        const mockSelfNode: SchemaNodeExtended = {
          key: mockSelfReactFlowKey,
          name: 'Self',
          fullName: 'Self',
          normalizedDataType: NormalizedDataType.Integer,
          properties: SchemaNodeProperty.NotSpecified,
          nodeProperties: [SchemaNodeProperty.NotSpecified],
          children: [],
          pathToRoot: [],
        };

        setConnectionInputValue(mockConnections, {
          targetNode: mockSelfNode,
          targetNodeReactFlowKey: mockSelfReactFlowKey,
          findInputSlot: true,
          value: {
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
          type: 'Function',
          inputs: mockBoundedFunctionInputs,
          maxNumberOfInputs: mockBoundedFunctionInputs.length,
          outputValueType: NormalizedDataType.Integer,
        };

        setConnectionInputValue(mockConnections, {
          targetNode: mockSelfNode,
          targetNodeReactFlowKey: mockSelfReactFlowKey,
          findInputSlot: true,
          value: {
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
          type: 'Function',
          inputs: mockBoundedFunctionInputs,
          maxNumberOfInputs: mockBoundedFunctionInputs.length,
          outputValueType: NormalizedDataType.Integer,
        };

        setConnectionInputValue(mockConnections, {
          targetNode: mockSelfNode,
          targetNodeReactFlowKey: mockSelfReactFlowKey,
          findInputSlot: false,
          inputIndex: 1,
          value: {
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
        type: 'Function',
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
        setConnectionInputValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          value: { reactFlowKey: 'newCon', node: {} as SchemaNodeExtended },
        });

        expect(mockConnections['oldCon'].outputs.length).toEqual(0);
        expect((mockConnections[currentNodeReactFlowKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('newCon');
      });

      it('Test adding custom value input', () => {
        setConnectionInputValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          value: 'Test custom value',
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[1][0]).toEqual('Test custom value');
      });

      it('Test clear a custom value - bounded input', () => {
        setConnectionInputValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          value: undefined,
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[1].length).toEqual(0);
      });

      it('Test adding an unbounded input or clearing its custom value', () => {
        atypicallyMockFunctionNode.maxNumberOfInputs = -1;

        // This call is just setup for the next test
        setConnectionInputValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          value: undefined,
        });

        setConnectionInputValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          value: undefined,
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[0][1]).toEqual(undefined);
      });

      it('Test delete unbounded input value', () => {
        setConnectionInputValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          value: null,
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[0].length).toEqual(1);
      });
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
      fullName: '',
      normalizedDataType: NormalizedDataType.Integer,
      properties: SchemaNodeProperty.NotSpecified,
      nodeProperties: [SchemaNodeProperty.NotSpecified],
      children: [],
      pathToRoot: [],
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
        outputs: [{ node: dummyNode, reactFlowKey: 'testTargetScehema' }],
      },
      testTargetSchema: {
        self: { node: dummyNode, reactFlowKey: 'testTargetSchema' },
        inputs: { '0': [{ reactFlowKey: 'concatFunctionNode', node: concatFunction }] },
        outputs: [],
      },
    };

    it('Test can find a source node from depth == 1', () => {
      expect(isSchemaNodeExtended(dummyNode)).toBeTruthy();
      expect(nodeHasSourceNodeEventually(mockConnections['concatFunctionNode'], mockConnections)).toEqual(true);
    });

    it('Test can recursively call from depth > 1', () => {
      expect(nodeHasSourceNodeEventually(mockConnections['testTargetSchema'], mockConnections)).toEqual(true);
    });
  });

  // describe('nodeHasSpecificInputEventually')

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
});

const parentManyToOneTargetNode: SchemaNodeExtended = {
  key: '/ns0:Root/ManyToOne/Date',
  name: 'Date',
  normalizedDataType: NormalizedDataType.ComplexType,
  properties: 'Repeating',
  children: [
    {
      key: '/ns0:Root/ManyToOne/Date/DayName',
      name: 'DayName',
      normalizedDataType: NormalizedDataType.String,
      properties: 'NotSpecified',
      children: [],
      fullName: 'DayName',
      parentKey: '/ns0:Root/ManyToOne/Date',
      nodeProperties: [SchemaNodeProperty.Repeating],
      pathToRoot: [
        {
          key: '/ns0:Root',
          name: 'Root',
          fullName: 'ns0:Root',
          repeating: false,
        },
        {
          key: '/ns0:Root/ManyToOne',
          name: 'ManyToOne',
          fullName: 'ManyToOne',
          repeating: false,
        },
        {
          key: '/ns0:Root/ManyToOne/Date',
          name: 'Date',
          fullName: 'Date',
          repeating: true,
        },
        {
          key: '/ns0:Root/ManyToOne/Date/DayName',
          name: 'DayName',
          fullName: 'DayName',
          repeating: false,
        },
      ],
    },
  ],
  fullName: 'Date',
  parentKey: '/ns0:Root/ManyToOne',
  nodeProperties: [SchemaNodeProperty.Repeating],
  pathToRoot: [
    {
      key: '/ns0:Root',
      name: 'Root',
      fullName: 'ns0:Root',
      repeating: false,
    },
    {
      key: '/ns0:Root/ManyToOne',
      name: 'ManyToOne',
      fullName: 'ManyToOne',
      repeating: false,
    },
    {
      key: '/ns0:Root/ManyToOne/Date',
      name: 'Date',
      fullName: 'Date',
      repeating: true,
    },
  ],
};

const parentTargetNode: SchemaNodeExtended = {
  key: '/ns0:Root/ManyToMany/Year/Month/Day',
  name: 'Day',
  normalizedDataType: NormalizedDataType.ComplexType,
  properties: 'Repeating',
  children: [
    {
      key: '/ns0:Root/ManyToMany/Year/Month/Day/Date',
      name: 'Date',
      normalizedDataType: NormalizedDataType.String,
      properties: 'NotSpecified',
      fullName: 'Date',
      parentKey: '/ns0:Root/ManyToMany/Year/Month/Day',
      nodeProperties: [SchemaNodeProperty.NotSpecified],
      children: [],
      pathToRoot: [
        {
          key: '/ns0:Root',
          name: 'Root',
          fullName: 'ns0:Root',
          repeating: false,
        },
        {
          key: '/ns0:Root/ManyToMany',
          name: 'ManyToMany',
          fullName: 'ManyToMany',
          repeating: false,
        },
        {
          key: '/ns0:Root/ManyToMany/Year',
          name: 'Year',
          fullName: 'Year',
          repeating: true,
        },
        {
          key: '/ns0:Root/ManyToMany/Year/Month',
          name: 'Month',
          fullName: 'Month',
          repeating: true,
        },
        {
          key: '/ns0:Root/ManyToMany/Year/Month/Day',
          name: 'Day',
          fullName: 'Day',
          repeating: true,
        },
        {
          key: '/ns0:Root/ManyToMany/Year/Month/Day/Date',
          name: 'Date',
          fullName: 'Date',
          repeating: false,
        },
      ],
    },
  ],
  fullName: 'Day',
  parentKey: '/ns0:Root/ManyToMany/Year/Month',
  nodeProperties: [SchemaNodeProperty.Repeating],
  pathToRoot: [
    {
      key: '/ns0:Root',
      name: 'Root',
      fullName: 'ns0:Root',
      repeating: false,
    },
    {
      key: '/ns0:Root/ManyToMany',
      name: 'ManyToMany',
      fullName: 'ManyToMany',
      repeating: false,
    },
    {
      key: '/ns0:Root/ManyToMany/Year',
      name: 'Year',
      fullName: 'Year',
      repeating: true,
    },
    {
      key: '/ns0:Root/ManyToMany/Year/Month',
      name: 'Month',
      fullName: 'Month',
      repeating: true,
    },
    {
      key: '/ns0:Root/ManyToMany/Year/Month/Day',
      name: 'Day',
      fullName: 'Day',
      repeating: true,
    },
  ],
};
