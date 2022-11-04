import type { SchemaNodeExtended } from '../../models';
import { NormalizedDataType, SchemaNodeDataType, SchemaNodeProperty } from '../../models';
import type { Connection, ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
import type { FunctionData, FunctionInput } from '../../models/Function';
import { functionMock, FunctionCategory } from '../../models/Function';
import {
  addNodeToConnections,
  createConnectionEntryIfNeeded,
  isCustomValue,
  isValidInputToFunctionNode,
  newConnectionWillHaveCircularLogic,
  updateConnectionInputValue,
} from '../Connection.Utils';

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

const mockUnboundedFunctionInput: FunctionInput[] = [
  {
    name: 'Value',
    allowedTypes: [NormalizedDataType.String],
    isOptional: false,
    allowCustomInput: true,
    tooltip: 'The value to use',
    placeHolder: 'The value',
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
        schemaNodeDataType: SchemaNodeDataType.Integer,
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

  describe('addNodeToConnections (primarily drawn connections)', () => {
    const mockSourceReactFlowKey = 'sourceKey';
    const mockSelfReactFlowKey = 'selfKey';
    const mockSourceNode: SchemaNodeExtended = {
      key: mockSourceReactFlowKey,
      name: 'Source',
      fullName: 'Source',
      schemaNodeDataType: SchemaNodeDataType.Integer,
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
        schemaNodeDataType: SchemaNodeDataType.Integer,
        normalizedDataType: NormalizedDataType.Integer,
        properties: SchemaNodeProperty.NotSpecified,
        nodeProperties: [SchemaNodeProperty.NotSpecified],
        children: [],
        pathToRoot: [],
      };

      addNodeToConnections(mockConnections, mockSourceNode, mockSourceReactFlowKey, mockSelfNode, mockSelfReactFlowKey);

      expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
      expect(mockConnections[mockSourceReactFlowKey].outputs.some((output) => output.reactFlowKey === mockSelfReactFlowKey)).toEqual(true);

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

      addNodeToConnections(mockConnections, mockSourceNode, mockSourceReactFlowKey, mockSelfNode, mockSelfReactFlowKey);

      expect(mockConnections[mockSourceReactFlowKey]).toBeDefined();
      expect(mockConnections[mockSourceReactFlowKey].outputs.some((output) => output.reactFlowKey === mockSelfReactFlowKey)).toEqual(true);

      expect(mockConnections[mockSelfReactFlowKey]).toBeDefined();
      expect(
        Object.values(mockConnections[mockSelfReactFlowKey].inputs).some((inputValueArray) =>
          inputValueArray.some((input) => input && !isCustomValue(input) && input.reactFlowKey === mockSourceReactFlowKey)
        )
      ).toEqual(true);
    });
  });

  describe('updateConnectionInputValue (primarily InputDropdown connections)', () => {
    const currentNodeReactFlowKey = 'currentNodeKey';
    const atypicalyMockFunctionNode: FunctionData = {
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
        outputs: [{ reactFlowKey: currentNodeReactFlowKey, node: atypicalyMockFunctionNode }],
      },
      [currentNodeReactFlowKey]: {
        self: { reactFlowKey: currentNodeReactFlowKey, node: atypicalyMockFunctionNode },
        inputs: {
          0: [{ reactFlowKey: 'oldCon', node: {} as SchemaNodeExtended }],
          1: [],
        },
        outputs: [],
      },
    };

    it('Test new input connection is made (and old connection is removed)', () => {
      updateConnectionInputValue(mockConnections, {
        targetNode: atypicalyMockFunctionNode,
        targetNodeReactFlowKey: currentNodeReactFlowKey,
        inputIndex: 0,
        value: { reactFlowKey: 'newCon', node: {} as SchemaNodeExtended },
      });

      expect(mockConnections['oldCon'].outputs.length).toEqual(0);
      expect((mockConnections[currentNodeReactFlowKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('newCon');
    });

    it('Test adding custom value input', () => {
      updateConnectionInputValue(mockConnections, {
        targetNode: atypicalyMockFunctionNode,
        targetNodeReactFlowKey: currentNodeReactFlowKey,
        inputIndex: 1,
        value: 'Test custom value',
      });

      expect(mockConnections[currentNodeReactFlowKey].inputs[1][0]).toEqual('Test custom value');
    });

    it('Test clear a custom value - bounded input', () => {
      updateConnectionInputValue(mockConnections, {
        targetNode: atypicalyMockFunctionNode,
        targetNodeReactFlowKey: currentNodeReactFlowKey,
        inputIndex: 1,
        value: undefined,
      });

      expect(mockConnections[currentNodeReactFlowKey].inputs[1].length).toEqual(0);
    });

    it('Test adding an unbounded input or clearing its custom value', () => {
      // This call is just setup for the next test
      updateConnectionInputValue(mockConnections, {
        targetNode: atypicalyMockFunctionNode,
        targetNodeReactFlowKey: currentNodeReactFlowKey,
        inputIndex: 0,
        value: undefined,
        isUnboundedInput: true,
      });

      updateConnectionInputValue(mockConnections, {
        targetNode: atypicalyMockFunctionNode,
        targetNodeReactFlowKey: currentNodeReactFlowKey,
        inputIndex: 1,
        value: undefined,
        isUnboundedInput: true,
      });

      expect(mockConnections[currentNodeReactFlowKey].inputs[0][1]).toEqual(undefined);
    });

    it('Test delete unbounded input value', () => {
      updateConnectionInputValue(mockConnections, {
        targetNode: atypicalyMockFunctionNode,
        targetNodeReactFlowKey: currentNodeReactFlowKey,
        inputIndex: 0,
        value: null,
        isUnboundedInput: true,
      });

      expect(mockConnections[currentNodeReactFlowKey].inputs[0].length).toEqual(1);
    });
  });

  describe('isValidInputToFunctionNode', () => {
    it('Test specific-typed, matching input with no slot available', () => {
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

      expect(
        isValidInputToFunctionNode(NormalizedDataType.Integer, mockConnection, mockBoundedFunctionInputs.length, mockBoundedFunctionInputs)
      ).toEqual(false);
    });

    it('Test specific-typed, matching input with slot available', () => {
      expect(
        isValidInputToFunctionNode(NormalizedDataType.Integer, undefined, mockBoundedFunctionInputs.length, mockBoundedFunctionInputs)
      ).toEqual(true);
    });

    it('Test type-Any input with slot available', () => {
      expect(
        isValidInputToFunctionNode(NormalizedDataType.Any, undefined, mockBoundedFunctionInputs.length, mockBoundedFunctionInputs)
      ).toEqual(true);
    });

    it('Test specific-typed, NON-matching input with slot available', () => {
      expect(
        isValidInputToFunctionNode(NormalizedDataType.Boolean, undefined, mockBoundedFunctionInputs.length, mockBoundedFunctionInputs)
      ).toEqual(false);
    });

    it('Test type-matched input to unbounded input', () => {
      expect(isValidInputToFunctionNode(NormalizedDataType.String, undefined, -1, mockUnboundedFunctionInput)).toEqual(true);
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
});
