/* eslint-disable no-param-reassign */
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { DataMapOperationState, SetConnectionInputAction } from '../core/state/DataMapSlice';
import type { SchemaNodeExtended } from '../models';
import { NormalizedDataType, SchemaNodeDataType, SchemaNodeProperty, SchemaType } from '../models';
import type { Connection, ConnectionDictionary, ConnectionUnit, InputConnection, InputConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionInput } from '../models/Function';
import { isFunctionData } from './Function.Utils';
import { addReactFlowPrefix, addTargetReactFlowPrefix } from './ReactFlow.Util';
import { isSchemaNodeExtended } from './Schema.Utils';
import type { WritableDraft } from 'immer/dist/internal';

// NOTE: This method should be the gateway for anything getting into dataMapConnections
// - meaning all default inputs/etc can safely be managed in this singular spot
export const createConnectionEntryIfNeeded = (
  connections: ConnectionDictionary,
  node: SchemaNodeExtended | FunctionData,
  reactFlowKey: string
) => {
  if (!connections[reactFlowKey]) {
    connections[reactFlowKey] = {
      self: { node: node, reactFlowKey: reactFlowKey },
      inputs: {},
      outputs: [],
    };

    if (isFunctionData(node)) {
      if (node.maxNumberOfInputs !== -1) {
        for (let index = 0; index < node.maxNumberOfInputs; index++) {
          connections[reactFlowKey].inputs[index] = [];
        }
      } else {
        // Start unbounded inputs off with two empty fields (instead of no fields at all)
        connections[reactFlowKey].inputs[0] = [undefined, undefined];
      }
    } else {
      // Schema nodes start with a single empty inputValArray
      connections[reactFlowKey].inputs[0] = [];
    }
  }
};

// NOTE: This should be the gateway for setting any input values in dataMapConnections
export const setConnectionInputValue = (
  connections: ConnectionDictionary,
  {
    targetNode,
    targetNodeReactFlowKey,
    inputIndex,
    value,
    isFunctionUnboundedInputOrRepeatingSchemaNode,
    isHandleDrawnOrDeserialized,
  }: SetConnectionInputAction
) => {
  if (!isHandleDrawnOrDeserialized && inputIndex === undefined) {
    console.error('Invalid Connection Input Op: inputIndex was not provided for a non-handle-drawn/deserialized connection');
    return;
  }

  if (isHandleDrawnOrDeserialized && (value === undefined || value === null)) {
    console.error('Invalid Connection Input Op: value is undefined or null for a handle-drawn/deserialized connection');
    return;
  }

  if (isHandleDrawnOrDeserialized && inputIndex !== undefined) {
    console.warn('Invalid Connection Input Op: inputIndex was provided for a handle-drawn/deserialized connection');
  }

  let connection = connections[targetNodeReactFlowKey];

  if (!isHandleDrawnOrDeserialized && inputIndex !== undefined) {
    // Verify if we're updating an old value that's a ConnectionUnit, and if so, remove it from source's outputs[]
    if (connection?.inputs) {
      let inputConnection: InputConnection = undefined;

      if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
        inputConnection = connection.inputs[0][inputIndex];
      } else if (connection.inputs[inputIndex].length > 0) {
        inputConnection = connection.inputs[inputIndex][0];
      }

      if (inputConnection && isConnectionUnit(inputConnection)) {
        connections[inputConnection.reactFlowKey].outputs = connections[inputConnection.reactFlowKey].outputs.filter(
          (output) => output.reactFlowKey !== targetNodeReactFlowKey
        );
      }
    }
  }

  createConnectionEntryIfNeeded(connections, targetNode, targetNodeReactFlowKey);
  connection = connections[targetNodeReactFlowKey];

  let confirmedInputIndex = inputIndex ?? 0;

  // Find appropriate input slot (for handle-drawn/deserialized connections)
  if (isHandleDrawnOrDeserialized && value !== undefined && value !== null) {
    // Schema nodes can only ever have 1 input as long as it is not repeating
    if (isSchemaNodeExtended(targetNode)) {
      if (targetNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
        confirmedInputIndex = -1;
      }
    } else {
      // If the destination has unlimited inputs, all should go on the first input
      if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
        // Check if an undefined input field exists first (created through PropPane)
        // - otherwise we can safely just append its value to the end
        const indexOfFirstOpenInput = connection.inputs[0].findIndex((inputCon) => !inputCon);
        confirmedInputIndex = indexOfFirstOpenInput >= 0 ? indexOfFirstOpenInput : -1;
      } else {
        if (isConnectionUnit(value)) {
          // Add input to first available and type-matched place (handle & PropPane validation should guarantee there's at least one)
          confirmedInputIndex = Object.values(connection.inputs).findIndex(
            (inputCon, idx) =>
              inputCon.length < 1 &&
              targetNode.inputs[idx].allowedTypes.some(
                (type) =>
                  type === NormalizedDataType.Any ||
                  (isSchemaNodeExtended(value.node) ? type === value.node.normalizedDataType : type === value.node.outputValueType)
              )
          );
        } else if (isCustomValue(value)) {
          // Add input to first available that allows custom values
          confirmedInputIndex = Object.values(connection.inputs).findIndex(
            (inputCon, idx) => inputCon.length < 1 && targetNode.inputs[idx].allowCustomInput
          );
        }
      }
    }
  }

  // null is signal to delete unbounded input value
  if (value === null) {
    if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
      const newUnboundedInputValues = connection.inputs[0];
      newUnboundedInputValues.splice(confirmedInputIndex, 1);
      connection.inputs[0] = newUnboundedInputValues;
    } else {
      console.error('Invalid Connection Input Op: null was provided for non-unbounded-input value');
    }
  } else if (value === undefined) {
    // Explicit undefined check to handle empty custom values ('') in the next block
    if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
      connection.inputs[0][confirmedInputIndex] = undefined;
    } else {
      connection.inputs[confirmedInputIndex] = [];
    }
  } else {
    // Set the value (ConnectionUnit or custom value)
    if (isFunctionUnboundedInputOrRepeatingSchemaNode) {
      if (confirmedInputIndex === -1) {
        // Repeating schema node
        connection.inputs[0].push(value);
      } else {
        // Function unbounded input
        connection.inputs[0][confirmedInputIndex] = value;
      }
    } else {
      if (confirmedInputIndex !== -1) {
        connection.inputs[confirmedInputIndex][0] = value;
      } else {
        connection.inputs[0].push(value);
      }
    }

    // Only need to update/add value to source's outputs[] if it's a ConnectionUnit
    if (isConnectionUnit(value)) {
      const tgtConUnit: ConnectionUnit = {
        node: targetNode,
        reactFlowKey: targetNodeReactFlowKey,
      };

      createConnectionEntryIfNeeded(connections, value.node, value.reactFlowKey);
      connections[value.reactFlowKey].outputs.push(tgtConUnit);
      connections[value.reactFlowKey].outputs = connections[value.reactFlowKey].outputs.filter(onlyUniqueConnections);
    }
  }
};

export const isValidSchemaNodeToSchemaNodeConnection = (srcDataType: SchemaNodeDataType, tgtDataType: SchemaNodeDataType) =>
  srcDataType === SchemaNodeDataType.AnyAtomicType || tgtDataType === SchemaNodeDataType.AnyAtomicType || srcDataType === tgtDataType;
export const isValidFunctionNodeToSchemaNodeConnection = (srcDataType: NormalizedDataType, tgtDataType: NormalizedDataType) =>
  srcDataType === NormalizedDataType.Any || tgtDataType === NormalizedDataType.Any || srcDataType === tgtDataType;

export const isValidInputToFunctionNode = (
  srcNodeType: NormalizedDataType,
  targetNodeConnection: Connection | undefined,
  tgtMaxNumInputs: number,
  tgtInputs: FunctionInput[]
) => {
  try {
    // If Function has unbounded inputs, just check if type matches
    if (tgtMaxNumInputs === -1) {
      return isFunctionTypeSupported(srcNodeType, tgtInputs);
    }

    // Make sure there's available inputs
    if (targetNodeConnection) {
      if (flattenInputs(targetNodeConnection.inputs).length === tgtMaxNumInputs) {
        return false;
      }
    }

    return isFunctionTypeSupportedAndAvailable(srcNodeType, targetNodeConnection, tgtInputs);
  } catch (e) {
    console.error(`Error validating Function input!`);
    console.error(e);

    console.error(`--------Related Details------------`);
    console.error(`Src node type: ${srcNodeType}`);
    console.error(`Target node connection:`);
    console.error(targetNodeConnection);
    console.error(`Target function max inputs: ${tgtMaxNumInputs}`);
    console.error(`Target function input info:`);
    console.error(tgtInputs);

    return false;
  }
};

const isFunctionTypeSupportedAndAvailable = (
  inputNodeType: NormalizedDataType,
  connection: Connection | undefined,
  tgtInputs: FunctionInput[]
) => {
  if (connection) {
    // No inputs, so just verify type
    if (Object.keys(connection.inputs).length === 0 && isFunctionTypeSupported(inputNodeType, tgtInputs)) {
      return true;
    }

    // If inputs, verify that there's an open/undefined spot that matches type
    let supportedTypeInputIsAvailable = false;
    tgtInputs.forEach((targetInput, index) => {
      if (
        inputNodeType === NormalizedDataType.Any ||
        targetInput.allowedTypes.some((allowedType) => allowedType === inputNodeType || allowedType === NormalizedDataType.Any)
      ) {
        if (!connection.inputs || !(index in connection.inputs) || connection.inputs[index].length < 1) {
          supportedTypeInputIsAvailable = true;
        }
      }
    });

    return supportedTypeInputIsAvailable;
  } else {
    // No existing connection, so just make sure (bounded) inputs have a matching type
    if (isFunctionTypeSupported(inputNodeType, tgtInputs)) {
      return true;
    }
  }

  return false;
};

// Iterate through each input's supported types for a match
const isFunctionTypeSupported = (inputNodeType: NormalizedDataType, tgtInputs: FunctionInput[]) => {
  return (
    inputNodeType === NormalizedDataType.Any ||
    tgtInputs.some((input) =>
      input.allowedTypes.some((allowedType) => allowedType === NormalizedDataType.Any || allowedType === inputNodeType)
    )
  );
};

export const flattenInputs = (inputs: InputConnectionDictionary): InputConnection[] => Object.values(inputs).flatMap((value) => value);

export const isCustomValue = (connectionInput: InputConnection): connectionInput is string =>
  connectionInput !== undefined && typeof connectionInput === 'string';
export const isConnectionUnit = (connectionInput: InputConnection): connectionInput is ConnectionUnit =>
  connectionInput !== undefined && typeof connectionInput !== 'string';

const onlyUniqueConnections = (value: ConnectionUnit, index: number, self: ConnectionUnit[]) => {
  return self.findIndex((selfValue) => selfValue.reactFlowKey === value.reactFlowKey) === index;
};

export const nodeHasSourceNodeEventually = (currentConnection: Connection, connections: ConnectionDictionary): boolean => {
  if (!currentConnection) {
    return false;
  }

  // Put 0 input, content enricher functions in the node bucket
  const flattenedInputs = flattenInputs(currentConnection.inputs);
  const customValueInputs = flattenedInputs.filter(isCustomValue);
  const definedNonCustomValueInputs: ConnectionUnit[] = flattenedInputs.filter(isConnectionUnit);
  const functionInputs = definedNonCustomValueInputs.filter((input) => isFunctionData(input.node) && input.node.maxNumberOfInputs !== 0);
  const nodeInputs = definedNonCustomValueInputs.filter((input) => isSchemaNodeExtended(input.node) || input.node.maxNumberOfInputs === 0);

  // All inputs are a mix of nodes and/or custom values
  if (nodeInputs.length + customValueInputs.length === flattenedInputs.length) {
    return true;
  } else {
    // Still have traversing to do
    if (functionInputs.length > 0) {
      return functionInputs.every((functionInput) => {
        return nodeHasSourceNodeEventually(connections[functionInput.reactFlowKey], connections);
      });
    } else {
      return false;
    }
  }
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
    (!exactMatch && currentConnection.self.reactFlowKey.indexOf(sourceKey) > -1)
  ) {
    return true;
  }

  const flattenedInputs = flattenInputs(currentConnection.inputs);
  const nonCustomInputs: ConnectionUnit[] = flattenedInputs.filter(isConnectionUnit);

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
    (!exactMatch && currentConnection.self.reactFlowKey.indexOf(sourceKey) > -1)
  ) {
    return true;
  }

  const nonCustomOutputs: ConnectionUnit[] = currentConnection.outputs.filter(isConnectionUnit);

  return nonCustomOutputs.some((output) =>
    nodeHasSpecificOutputEventually(sourceKey, connections[output.reactFlowKey], connections, exactMatch)
  );
};

export const collectSourceNodesForConnectionChain = (currentFunction: Connection, connections: ConnectionDictionary): ConnectionUnit[] => {
  const connectionUnits: ConnectionUnit[] = flattenInputs(currentFunction.inputs).filter(isConnectionUnit);

  if (connectionUnits.length > 0) {
    return [
      currentFunction.self,
      ...connectionUnits.flatMap((input) => collectSourceNodesForConnectionChain(connections[input.reactFlowKey], connections)),
    ];
  }

  return [currentFunction.self];
};

export const collectTargetNodesForConnectionChain = (currentFunction: Connection, connections: ConnectionDictionary): ConnectionUnit[] => {
  const connectionUnits: ConnectionUnit[] = currentFunction.outputs;

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
      (connection) => connection.self.node.key === childNode.key && flattenInputs(connection.inputs).length > 0
    );
    return foundConnection ? [foundConnection] : [];
  });

  const targetReactFlowKey = addReactFlowPrefix(currentTargetSchemaNode.key, SchemaType.Target);
  if (connections[targetReactFlowKey] && flattenInputs(connections[targetReactFlowKey].inputs).length > 0) {
    outputFilteredConnections.push(connections[targetReactFlowKey]);
  }

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
): ConnectionUnit[] => {
  return targetSchemaNodeConnections
    .flatMap((connectedNode) => collectSourceNodesForConnectionChain(connectedNode, connections))
    .filter((connectionUnit) => isFunctionData(connectionUnit.node));
};

export const bringInParentSourceNodesForRepeating = (
  parentTargetNode: WritableDraft<SchemaNodeExtended> | undefined,
  newState: DataMapOperationState
) => {
  if (parentTargetNode) {
    const inputsToParentTarget = newState.dataMapConnections[addTargetReactFlowPrefix(parentTargetNode?.key)]?.inputs;
    if (inputsToParentTarget) {
      Object.keys(inputsToParentTarget).forEach((key) => {
        const inputs = inputsToParentTarget[key];
        inputs.forEach((input) => {
          if (input && typeof input !== 'string') {
            const inputSrc = input.node;
            if (isSchemaNodeExtended(inputSrc) && !newState.currentSourceSchemaNodes.find((node) => node.key === inputSrc.key)) {
              newState.currentSourceSchemaNodes.push(inputSrc);
            }
          }
        });
      });
    }
  }
};
