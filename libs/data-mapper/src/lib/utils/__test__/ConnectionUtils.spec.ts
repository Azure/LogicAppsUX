import { NormalizedDataType, SchemaNodeDataType, SchemaNodeProperties } from '../../models';
import type { SchemaNodeExtended } from '../../models';
import type { Connection, ConnectionDictionary } from '../../models/Connection';
import { functionMock } from '../../models/Function';
import type { FunctionData, FunctionInput } from '../../models/Function';
import { createConnectionEntryIfNeeded, isValidInputToFunctionNode, newConnectionWillHaveCircularLogic } from '../Connection.Utils';

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
        properties: SchemaNodeProperties.NotSpecified,
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

  // TODO: addNodeToConnections (drawn connections) && updateConnectionInputValue (PropPane InputDropdowns)

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
