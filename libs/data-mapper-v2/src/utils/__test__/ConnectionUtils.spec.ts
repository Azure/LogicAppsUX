import { mock } from 'node:test';
import { concatFunction } from '../../__mocks__/FunctionMock';
import type { DataMapOperationState } from '../../core/state/DataMapSlice';
import type { Connection, ConnectionDictionary, NodeConnection, InputConnection, CustomValueConnection } from '../../models/Connection';
import type { FunctionData, FunctionInput } from '../../models/Function';
import { FunctionCategory, functionMock } from '../../models/Function';
import {
  applyConnectionValue,
  bringInParentSourceNodesForRepeating,
  createConnectionEntryIfNeeded,
  createCustomInput,
  createNewEmptyConnection,
  createNodeConnection,
  inputFromHandleId,
  isConnectionUnit,
  isCustomValue,
  isEmptyConnection,
  isFunctionInputSlotAvailable,
  isValidConnectionByType,
  newConnectionWillHaveCircularLogic,
  nodeHasSourceNodeEventually,
  nodeHasSpecificInputEventually,
  nodeHasSpecificOutputEventually,
} from '../Connection.Utils';
import { isSchemaNodeExtended } from '../Schema.Utils';
import { fullConnectionDictionaryForOneToManyLoop, fullMapForSimplifiedLoop } from '../__mocks__';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { NormalizedDataType, SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { current } from 'immer';

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
      expect(isEmptyConnection(connections[schemaNodeKey].inputs[0])).toBeTruthy();
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
    const inputDoesExist = (inputs: InputConnection[], mockSourceReactFlowKey: string) => {
      return inputs.some((input) => input && isConnectionUnit(input) && input.reactFlowKey === mockSourceReactFlowKey);
    };

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
          input: createNodeConnection(mockSourceNode, mockSourceReactFlowKey),
        });

        expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
        expect(mockConnections[mockSourceReactFlowKey].outputs.some((output) => output.reactFlowKey === mockSelfReactFlowKey)).toEqual(
          true
        );

        expect(mockConnections[mockSelfReactFlowKey]).toBeDefined();
        expect(
          mockConnections[mockSelfReactFlowKey].inputs.some(
            (input) => input && isConnectionUnit(input) && input.reactFlowKey === mockSourceReactFlowKey
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
          input: createNodeConnection(mockSourceNode, mockSourceReactFlowKey),
        });

        expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
        expect(mockConnections[mockSourceReactFlowKey].outputs.some((output) => output.reactFlowKey === mockSelfReactFlowKey)).toEqual(
          true
        );

        expect(mockConnections[mockSelfReactFlowKey]).toBeDefined();
        expect(inputDoesExist(mockConnections[mockSelfReactFlowKey].inputs, mockSourceReactFlowKey)).toEqual(true);
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
          input: createNodeConnection(mockSourceNode, mockSourceReactFlowKey),
        });

        expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
        expect(mockConnections[mockSourceReactFlowKey].outputs[0].reactFlowKey).toEqual(mockSelfReactFlowKey);

        expect(mockConnections[mockSelfReactFlowKey]).toBeDefined();
        expect(isEmptyConnection(mockConnections[mockSelfReactFlowKey].inputs[0])).toBeTruthy();
        expect(isConnectionUnit(mockConnections[mockSelfReactFlowKey].inputs[1])).toBeTruthy();
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

      const mockFnNodeConnection = createNodeConnection(atypicallyMockFunctionNode, currentNodeReactFlowKey);
      const oldConNodeConnection = createNodeConnection({} as SchemaNodeExtended, 'oldCon');

      const mockConnections: ConnectionDictionary = {
        oldCon: {
          self: createNodeConnection({} as SchemaNodeExtended, 'oldCon'),
          inputs: [],
          outputs: [mockFnNodeConnection],
        },
        [currentNodeReactFlowKey]: {
          self: mockFnNodeConnection,
          inputs: [oldConNodeConnection, createNewEmptyConnection()],
          outputs: [],
        },
      };

      it('Test new input connection is made (and old connection is removed)', () => {
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          input: createNodeConnection({} as SchemaNodeExtended, 'newCon'),
        });

        expect(mockConnections['oldCon'].outputs.length).toEqual(0);
        expect((mockConnections[currentNodeReactFlowKey].inputs[0] as NodeConnection).reactFlowKey).toEqual('newCon');
      });

      it('Test adding custom value input', () => {
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          input: createCustomInput('Test custom value'),
        });

        expect((mockConnections[currentNodeReactFlowKey].inputs[1] as CustomValueConnection).value).toEqual('Test custom value');
      });

      it('Test clear a custom value - bounded input', () => {
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          input: createNewEmptyConnection(),
        });

        expect(isEmptyConnection(mockConnections[currentNodeReactFlowKey].inputs[1])).toBeTruthy();
      });

      it('Test adding an unbounded input or clearing its custom value', () => {
        atypicallyMockFunctionNode.maxNumberOfInputs = -1;

        // This call is just setup for the next test
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          input: createNewEmptyConnection(),
        });

        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          input: createNewEmptyConnection(),
        });

        expect(isEmptyConnection(mockConnections[currentNodeReactFlowKey].inputs[0])).toBeTruthy();
        expect(isEmptyConnection(mockConnections[currentNodeReactFlowKey].inputs[1])).toBeTruthy();
      });

      it('Adds a new unbounded value', () => {
        atypicallyMockFunctionNode.maxNumberOfInputs = -1;
        const unboundedMockConnections = {};
        applyConnectionValue(unboundedMockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          input: createNodeConnection({} as SchemaNodeExtended, 'newCon'),
        });

        applyConnectionValue(unboundedMockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 1,
          findInputSlot: true,
          input: createNodeConnection({} as SchemaNodeExtended, 'newCon2'),
        });

        expect(isConnectionUnit(unboundedMockConnections[currentNodeReactFlowKey].inputs[0])).toBeTruthy();
        expect(isConnectionUnit(unboundedMockConnections[currentNodeReactFlowKey].inputs[1])).toBeTruthy();
      });

      it('Test delete unbounded input value', () => {
        // danielle what is the intended scenario of this?
        applyConnectionValue(mockConnections, {
          targetNode: atypicallyMockFunctionNode,
          targetNodeReactFlowKey: currentNodeReactFlowKey,
          inputIndex: 0,
          input: null,
        });

        expect(mockConnections[currentNodeReactFlowKey].inputs[0]).toEqual(1);
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
        self: createNodeConnection({} as SchemaNodeExtended, 'Placeholder'),
        inputs: [],
        outputs: [],
      };

      mockBoundedFunctionInputs.forEach((_input, idx) => {
        mockConnection.inputs[idx] = createNodeConnection({} as SchemaNodeExtended, 'Placeholder');
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
        self: createNodeConnection(dummyNode, 'testNode1'),
        inputs: [],
        outputs: [createNodeConnection(dummyNode, desiredInputKey)],
      },
      [desiredInputKey]: {
        self: createNodeConnection(dummyNode, desiredInputKey),
        inputs: [],
        outputs: [],
      },
      [currentNodeKey]: {
        self: createNodeConnection(dummyNode, currentNodeKey),
        inputs: [],
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
      mockConnectionsWithImpendingCircularLogic[currentNodeKey].outputs.push(createNodeConnection(dummyNode, 'testNode1'));

      expect(newConnectionWillHaveCircularLogic(currentNodeKey, desiredInputKey, mockConnectionsWithImpendingCircularLogic)).toEqual(true);
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
