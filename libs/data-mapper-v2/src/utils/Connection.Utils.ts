/* eslint-disable no-param-reassign */
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { DataMapOperationState, SetConnectionInputAction } from '../core/state/DataMapSlice';
import type {
  CustomValueConnection,
  EmptyConnection,
  Connection,
  ConnectionDictionary,
  NodeConnection,
  InputConnection,
} from '../models/Connection';
import type { FunctionData } from '../models/Function';
import { createEdgeId } from './Edge.Utils';
import { isFunctionData } from './Function.Utils';
//import { addReactFlowPrefix, addTargetReactFlowPrefix } from './ReactFlow.Util';
import { isSchemaNodeExtended } from './Schema.Utils';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { NormalizedDataType, SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import { getSplitIdsFromReactFlowConnectionId } from './ReactFlow.Util';
import { UnboundedInput } from '../constants/FunctionConstants';

/**
 * Creates a connection entry in the connections dictionary if it doesn't already exist.
 * This is the gateway for any entries made into dataMapConnections - meaning all default
 * inputs/etc can safely be managed in this singular spot.
 *
 * @param connections The connections dictionary to add the entry to
 * @param node The node to create the connection entry for
 * @param reactFlowKey The reactFlowKey of the node
 */
export const createConnectionEntryIfNeeded = (
  connections: ConnectionDictionary,
  node: SchemaNodeExtended | FunctionData,
  reactFlowKey: string
) => {
  if (!connections[reactFlowKey]) {
    connections[reactFlowKey] = {
      self: { node: node, reactFlowKey: reactFlowKey, isDefined: true, isCustom: false },
      inputs: [],
      outputs: [],
    };

    if (node && isFunctionData(node)) {
      if (node?.maxNumberOfInputs !== UnboundedInput) {
        for (let index = 0; index < node.maxNumberOfInputs; index++) {
          connections[reactFlowKey].inputs[index] = createNewEmptyConnection();
        }
      } else {
        // Start unbounded inputs off with two empty fields (instead of no fields at all)
        connections[reactFlowKey].inputs[0] = createNewEmptyConnection();
        connections[reactFlowKey].inputs[1] = createNewEmptyConnection();
      }
    } else {
      // Schema nodes start with a single empty inputValArray
      connections[reactFlowKey].inputs[0] = createNewEmptyConnection();
    }
  }
};

/**
 * Creates or updates a connection entry's input value.
 * This is the gateway for *setting ANY input values* in dataMapConnections - including
 * both those that are deserialized, handle-drawn, or InputDropdown-set.
 *
 * @param connections The connections dictionary to add the entry to
 * @param targetNode The node to create the connection entry for
 * @param targetNodeReactFlowKey The reactFlowKey of `targetNode`
 * @param inputIndex The index of the input to set the value for (only needed if NOT `findInputSlot`)
 * @param value The value to set the input to (InputConnection, or `null` to delete an unbounded input)
 * @param findInputSlot Flag to find an available input spot if `true`, or use inputIndex if `false`/`undefined` (used for drawn and deserialized connections)
 */
export const applyConnectionValue = (
  connections: ConnectionDictionary,
  { targetNode, targetNodeReactFlowKey, inputIndex, input, findInputSlot, isRepeating }: SetConnectionInputAction
) => {
  if (!findInputSlot && inputIndex === undefined) {
    console.error('Invalid Connection Input Op: inputIndex was not provided for a non-handle-drawn/deserialized connection');
    return;
  }

  if (findInputSlot && (input === undefined || input === null)) {
    console.error('Invalid Connection Input Op: value is undefined or null for a handle-drawn/deserialized connection');
    return;
  }

  if (findInputSlot && inputIndex !== undefined) {
    console.warn('Invalid Connection Input Op: inputIndex was provided for a handle-drawn/deserialized connection');
  }

  let connection = { ...connections[targetNodeReactFlowKey] };

  let isFunctionUnboundedInputOrRepeatingSchemaNode = false;

  if (isSchemaNodeExtended(targetNode) && targetNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
    isFunctionUnboundedInputOrRepeatingSchemaNode = true;
  } else if (isFunctionData(targetNode) && targetNode?.maxNumberOfInputs === UnboundedInput) {
    isFunctionUnboundedInputOrRepeatingSchemaNode = true;
  }

  if (!findInputSlot && inputIndex !== undefined) {
    // Verify if we're updating an old value that's a ConnectionUnit, and if so, remove it from source's outputs[]
    if (connection?.inputs) {
      let inputConnection: InputConnection = createNewEmptyConnection();

      if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
        inputConnection = connection.inputs[inputIndex];
      } else if (connection.inputs[inputIndex]) {
        inputConnection = connection.inputs[inputIndex];
      }

      if (inputConnection && isNodeConnection(inputConnection)) {
        connections[inputConnection.reactFlowKey].outputs = connections[inputConnection.reactFlowKey].outputs.filter(
          (output) => output.reactFlowKey !== targetNodeReactFlowKey
        );
      }
    }
  }

  createConnectionEntryIfNeeded(connections, targetNode, targetNodeReactFlowKey);
  connection = connections[targetNodeReactFlowKey];

  let confirmedInputIndex = inputIndex ?? 0;

  if (findInputSlot && input !== undefined && input !== null) {
    // Schema nodes can only ever have 1 input as long as it is not repeating
    if (isSchemaNodeExtended(targetNode)) {
      if (targetNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
        confirmedInputIndex = UnboundedInput;
      }

      // If the destination has unlimited inputs, all should go on the first input
    } else if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
      // Check if an undefined input field exists first (created through PropPane)
      // - otherwise we can safely just append its value to the end
      if (connection.inputs && connection.inputs[0]) {
        const indexOfFirstOpenInput = connection.inputs.findIndex((inputCon) => !inputCon || isEmptyConnection(inputCon));
        confirmedInputIndex = indexOfFirstOpenInput >= 0 ? indexOfFirstOpenInput : connection.inputs.length;
      }
    } else if (isNodeConnection(input)) {
      // Add input to first available slot (Handle & PropPane validation should guarantee there's at least one)
      confirmedInputIndex = connection.inputs.findIndex((inputCon) => isEmptyConnection(inputCon));
    } else if (isCustomValueConnection(input) && targetNode) {
      // Add input to first available that allows custom values
      confirmedInputIndex = connection.inputs.findIndex(
        (inputCon, idx) => isEmptyConnection(inputCon) && targetNode.inputs[idx].allowCustomInput
      );
    }
  }

  // null is signal to delete unbounded input value
  if (input === null) {
    // danielle test this
    if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
      // const newUnboundedInputValues = connection.inputs[0];
      // newUnboundedInputValues.splice(confirmedInputIndex, 1);
      // connection.inputs[0] = newUnboundedInputValues;
    } else {
      console.error('Invalid Connection Input Op: null was provided for non-unbounded-input value');
    }
  } else if (input === undefined || isEmptyConnection(input)) {
    // danielle what is the intended effect? do we want to delete the connection?
    // Explicit undefined check to handle empty custom values ('') in the next block
    if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
      connection.inputs[confirmedInputIndex] = createNewEmptyConnection();
    } else {
      connection.inputs[confirmedInputIndex] = createNewEmptyConnection(); // danielle confirm
    }
  } else {
    // Set the value (ConnectionUnit or custom value)
    if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
      if (confirmedInputIndex === UnboundedInput && isNodeConnection(input)) {
        // Repeating schema node
        if (typeof input !== 'string') {
          input.isRepeating = isRepeating;
        }
        addRepeatingInputConnection(connection, input);
      } else {
        // Function unbounded input
        const inputCopy: InputConnection[] = [...connection.inputs]; // created to prevent issues with immutable state
        inputCopy[confirmedInputIndex] = input;
        connection.inputs = inputCopy;
        connections[targetNodeReactFlowKey] = connection;
      }
    } else if (confirmedInputIndex !== UnboundedInput) {
      connection.inputs[confirmedInputIndex] = input;
    } else {
      connection.inputs.push(input);
    }

    connections[targetNodeReactFlowKey] = connection;

    // Only need to update/add value to source's outputs[] if it's a ConnectionUnit
    if (isNodeConnection(input)) {
      const tgtConUnit: NodeConnection = {
        node: targetNode,
        reactFlowKey: targetNodeReactFlowKey,
        isRepeating: isRepeating,
        isCustom: false,
        isDefined: true,
      };

      if (isRepeating) {
        input.isRepeating = true;
      }

      createConnectionEntryIfNeeded(connections, input.node, input.reactFlowKey);
      connections[input.reactFlowKey].outputs.push(tgtConUnit);
      connections[input.reactFlowKey].outputs = connections[input.reactFlowKey].outputs.filter(onlyUniqueConnections);
    }
  }
};

export const isValidCustomValueByType = (customValue: string, tgtDataType: NormalizedDataType) => {
  if (tgtDataType === NormalizedDataType.Any) {
    return true;
  }

  switch (tgtDataType) {
    case NormalizedDataType.String: {
      return customValue.startsWith('"') && customValue.endsWith('"');
    }

    case NormalizedDataType.Number: {
      return !Number.isNaN(Number(customValue));
    }

    case NormalizedDataType.Integer: {
      const integerMatch = customValue.match(/^[-+]?[0-9]*$/g);
      return integerMatch ? integerMatch.length > 0 : false;
    }

    case NormalizedDataType.Decimal: {
      const decimalMatch = customValue.match(/^[-+]?[0-9]*(\.[0-9]+)+$/g);
      return decimalMatch ? decimalMatch.length > 0 : false;
    }

    case NormalizedDataType.Boolean: {
      return customValue === '$true' || customValue === '$false';
    }

    case NormalizedDataType.Binary: {
      // TODO
      return true;
    }

    case NormalizedDataType.Array:
    case NormalizedDataType.Complex:
    case NormalizedDataType.Object:
    case NormalizedDataType.DateTime:
    default: {
      return false;
    }
  }
};

export const isValidConnectionByType = (srcDataType: NormalizedDataType, tgtDataType?: NormalizedDataType) => {
  if (srcDataType === NormalizedDataType.Any || tgtDataType === NormalizedDataType.Any) {
    return true;
  }

  if (tgtDataType === NormalizedDataType.Object && srcDataType === NormalizedDataType.Complex) {
    return true;
  }

  if (tgtDataType === srcDataType) {
    return true;
  }

  return false;
};

const addRepeatingInputConnection = (connection: Connection, input: NodeConnection) => {
  if (isEmptyConnection(connection.inputs[0])) {
    connection.inputs[0] = input;
  } else {
    connection.inputs.push(input);
  }
};

export const isFunctionInputSlotAvailable = (targetNodeConnection: Connection | undefined, tgtMaxNumInputs: number) => {
  // danielle test
  // Make sure there's available inputs (unless it's an unbounded input)
  if (
    tgtMaxNumInputs !== UnboundedInput &&
    targetNodeConnection &&
    areAllFunctionInputsFilled(targetNodeConnection.inputs, tgtMaxNumInputs)
  ) {
    return false;
  }
  return true;
};

export const areAllFunctionInputsFilled = (inputs: InputConnection[], _maxInputs: number): boolean => {
  return inputs.every((input) => !isEmptyConnection(input));
};

export const createNewEmptyConnection = (): EmptyConnection => {
  return {
    isDefined: false,
    isCustom: false,
  };
};

export const createNodeConnection = (node: SchemaNodeExtended | FunctionData, reactFlowKey: string): NodeConnection => {
  return {
    isDefined: true,
    isCustom: false,
    node: node,
    reactFlowKey: reactFlowKey,
  };
};

export const createCustomInputConnection = (value: string): CustomValueConnection => {
  return {
    isDefined: true,
    isCustom: true,
    value: value,
  };
};

export const connectionDoesExist = (
  inputConnection: InputConnection | undefined
): inputConnection is CustomValueConnection | NodeConnection => {
  return inputConnection !== undefined && !isEmptyConnection(inputConnection);
};

export const isEmptyConnection = (connectionInput: InputConnection): connectionInput is EmptyConnection =>
  connectionInput !== undefined && connectionInput.isDefined === false;

export const isCustomValueConnection = (connectionInput: InputConnection): connectionInput is CustomValueConnection =>
  connectionInput !== undefined && connectionInput.isCustom === true;
export const isNodeConnection = (connectionInput: InputConnection): connectionInput is NodeConnection =>
  connectionInput !== undefined && connectionInput.isDefined === true && connectionInput.isCustom === false;

const onlyUniqueConnections = (value: NodeConnection, index: number, self: NodeConnection[]) => {
  return self.findIndex((selfValue) => selfValue.reactFlowKey === value.reactFlowKey) === index;
};

export const nodeHasSourceNodeEventually = (currentConnection: Connection, connections: ConnectionDictionary): boolean => {
  if (!currentConnection) {
    return false;
  }

  // Put 0 input, content enricher functions in the node bucket
  const inputs = currentConnection.inputs;
  const customValueInputs = inputs.filter(isCustomValueConnection);
  const definedNonCustomValueInputs: NodeConnection[] = inputs.filter(isNodeConnection);
  const functionInputs = definedNonCustomValueInputs.filter((input) => isFunctionData(input.node) && input.node?.maxNumberOfInputs !== 0);
  const nodeInputs = definedNonCustomValueInputs.filter((input) => isSchemaNodeExtended(input.node) || input.node?.maxNumberOfInputs === 0);

  // All inputs are a mix of nodes and/or custom values
  if (nodeInputs.length + customValueInputs.length === inputs.length) {
    return true;

    // Still have traversing to do
  }
  if (functionInputs.length > 0) {
    return functionInputs.every((functionInput) => {
      return nodeHasSourceNodeEventually(connections[functionInput.reactFlowKey], connections);
    });
  }
  return false;
};

export const nodeHasSpecificInputEventually = (
  sourceKey: string,
  currentConnection: Connection,
  connections: ConnectionDictionary,
  exactMatch: boolean
): boolean => {
  if (!currentConnection) {
    return false;
  }

  if (
    (exactMatch && currentConnection.self.reactFlowKey === sourceKey) ||
    (!exactMatch && currentConnection.self.reactFlowKey.indexOf(sourceKey) > UnboundedInput)
  ) {
    return true;
  }

  const inputs = currentConnection.inputs;
  const nonCustomInputs: NodeConnection[] = inputs.filter(isNodeConnection);

  return nonCustomInputs.some((input) =>
    nodeHasSpecificInputEventually(sourceKey, connections[input.reactFlowKey], connections, exactMatch)
  );
};

export const nodeHasSpecificOutputEventually = (
  sourceKey: string,
  currentConnection: Connection,
  connections: ConnectionDictionary,
  exactMatch: boolean
): boolean => {
  if (!currentConnection) {
    return false;
  }

  if (
    (exactMatch && currentConnection.self.reactFlowKey === sourceKey) ||
    (!exactMatch && currentConnection.self.reactFlowKey.indexOf(sourceKey) > UnboundedInput)
  ) {
    return true;
  }

  const nonCustomOutputs: NodeConnection[] = currentConnection.outputs.filter(isNodeConnection);

  return nonCustomOutputs.some((output) =>
    nodeHasSpecificOutputEventually(sourceKey, connections[output.reactFlowKey], connections, exactMatch)
  );
};

export const collectSourceNodesForConnectionChain = (currentFunction: Connection, connections: ConnectionDictionary): NodeConnection[] => {
  const connectionUnits: NodeConnection[] = currentFunction.inputs.filter(isNodeConnection);

  if (connectionUnits.length > 0) {
    return [
      currentFunction.self,
      ...connectionUnits.flatMap((input) => collectSourceNodesForConnectionChain(connections[input.reactFlowKey], connections)),
    ];
  }

  return [currentFunction.self];
};

export const getActiveNodes = (state: DataMapOperationState, selectedItemKey?: string) => {
  const connectedItems: Record<string, string> = {};
  const connections = state.dataMapConnections;
  if (selectedItemKey) {
    const selectedItemKeyParts = getSplitIdsFromReactFlowConnectionId(selectedItemKey);

    const selectedItemConnectedNodes = [];
    if (connections[selectedItemKeyParts.sourceId]) {
      selectedItemConnectedNodes.push(
        ...collectSourceNodeIdsForConnectionChain(selectedItemKeyParts.sourceId, connections[selectedItemKeyParts.sourceId])
      );
      selectedItemConnectedNodes.push(
        ...collectTargetNodeIdsForConnectionChain(selectedItemKeyParts.sourceId, connections[selectedItemKeyParts.sourceId])
      );
    }

    selectedItemConnectedNodes.forEach((key) => {
      connectedItems[key] = key;
    });

    connectedItems[selectedItemKey] = selectedItemKey;
  }
  return connectedItems;
};

export const collectSourceNodeIdsForConnectionChain = (previousNodeId: string, currentFunction: Connection): string[] => {
  const connectionUnits: NodeConnection[] = currentFunction.inputs.filter(isNodeConnection);
  return [
    currentFunction.self.reactFlowKey,
    createEdgeId(currentFunction.self.reactFlowKey, previousNodeId),
    ...connectionUnits.flatMap((input) => createEdgeId(input.reactFlowKey, currentFunction.self.reactFlowKey)),
    ...connectionUnits.flatMap((input) => (isSchemaNodeExtended(input.node) ? input.reactFlowKey : '')),
  ];
};

export const collectTargetNodeIdsForConnectionChain = (previousNodeId: string, currentFunction: Connection): string[] => {
  const connectionUnits: NodeConnection[] = currentFunction.outputs;
  return [
    currentFunction.self.reactFlowKey,
    createEdgeId(previousNodeId, currentFunction.self.reactFlowKey),
    ...connectionUnits.flatMap((input) => createEdgeId(currentFunction.self.reactFlowKey, input.reactFlowKey)),
    ...connectionUnits.flatMap((input) => (isSchemaNodeExtended(input.node) ? input.reactFlowKey : '')),
  ];
};

export const collectTargetNodesForConnectionChain = (currentFunction: Connection, connections: ConnectionDictionary): NodeConnection[] => {
  const connectionUnits: NodeConnection[] = currentFunction.outputs;

  if (connectionUnits.length > 0) {
    return [
      currentFunction.self,
      ...connectionUnits.flatMap((input) => collectTargetNodesForConnectionChain(connections[input.reactFlowKey], connections)),
    ];
  }

  return [currentFunction.self];
};

export const newConnectionWillHaveCircularLogic = (
  currentNodeKey: string,
  desiredInputKey: string,
  connections: ConnectionDictionary
): boolean => {
  // DFS traversal output-wards
  if (currentNodeKey === desiredInputKey) {
    return true;
  }

  if (connections[currentNodeKey]?.outputs && connections[currentNodeKey].outputs.length > 0) {
    return connections[currentNodeKey].outputs.some((output) =>
      newConnectionWillHaveCircularLogic(output.reactFlowKey, desiredInputKey, connections)
    );
  }

  return false;
};

export const getTargetSchemaNodeConnections = (
  currentTargetSchemaNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary
): Connection[] => {
  if (!currentTargetSchemaNode) {
    return [];
  }

  const connectionValues = Object.values(connections);
  const outputFilteredConnections = currentTargetSchemaNode.children.flatMap((childNode) => {
    const foundConnection = connectionValues.find(
      (connection) => connection.self.node.key === childNode.key && connection.inputs.length > 0
    );
    return foundConnection ? [foundConnection] : [];
  });

  // const targetReactFlowKey = addReactFlowPrefix(currentTargetSchemaNode.key, SchemaType.Target);
  // if (connections[targetReactFlowKey] && flattenInputs(connections[targetReactFlowKey].inputs).length > 0) {
  //   outputFilteredConnections.push(connections[targetReactFlowKey]);
  // }

  return outputFilteredConnections;
};

export const getConnectedSourceSchemaNodes = (
  schemaNodeConnections: Connection[],
  connections: ConnectionDictionary
): SchemaNodeExtended[] => {
  return schemaNodeConnections
    .flatMap((connectedNode) => collectSourceNodesForConnectionChain(connectedNode, connections))
    .filter((connectedNode) => isSchemaNodeExtended(connectedNode.node) && connectedNode.reactFlowKey.includes(sourcePrefix))
    .map((connectedNode) => connectedNode.node) as SchemaNodeExtended[];
};

export const getConnectedTargetSchemaNodes = (
  schemaNodeConnections: Connection[],
  connections: ConnectionDictionary
): SchemaNodeExtended[] => {
  return schemaNodeConnections
    .flatMap((connectedNode) => collectTargetNodesForConnectionChain(connectedNode, connections))
    .filter((connectedNode) => isSchemaNodeExtended(connectedNode.node) && connectedNode.reactFlowKey.includes(targetPrefix))
    .map((connectedNode) => connectedNode.node) as SchemaNodeExtended[];
};

export const getFunctionConnectionUnits = (
  targetSchemaNodeConnections: Connection[],
  connections: ConnectionDictionary
): NodeConnection[] => {
  return targetSchemaNodeConnections
    .flatMap((connectedNode) => collectSourceNodesForConnectionChain(connectedNode, connections))
    .filter((connectionUnit) => isFunctionData(connectionUnit.node));
};

export const generateInputHandleId = (inputName: string, inputNumber: number) => `${inputName}${inputNumber}`;
export const inputFromHandleId = (inputHandleId: string, functionNode: FunctionData): number | undefined => {
  if (functionNode?.maxNumberOfInputs > UnboundedInput) {
    const input = functionNode.inputs.find((input) => inputHandleId === input.name);
    if (input) {
      return functionNode.inputs.indexOf(input);
    }
    return undefined;
  }
  const nameSplit = Number.parseInt(inputHandleId.split(functionNode.inputs[0].name)[1]);
  return Number.isNaN(nameSplit) ? undefined : nameSplit;
};
