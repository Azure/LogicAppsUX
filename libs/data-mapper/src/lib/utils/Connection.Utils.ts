/* eslint-disable no-param-reassign */
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { DataMapOperationState, UpdateConnectionInputAction } from '../core/state/DataMapSlice';
import type { SchemaNodeExtended } from '../models';
import { NormalizedDataType, SchemaNodeDataType, SchemaType } from '../models';
import type { Connection, ConnectionDictionary, ConnectionUnit, InputConnection, InputConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionInput } from '../models/Function';
import { isFunctionData } from './Function.Utils';
import { addReactFlowPrefix } from './ReactFlow.Util';
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

// Primarily used for drawn connections
export const addNodeToConnections = (
  connections: ConnectionDictionary,
  sourceNode: SchemaNodeExtended | FunctionData,
  sourceReactFlowKey: string,
  self: SchemaNodeExtended | FunctionData,
  selfReactFlowKey: string
) => {
  if (sourceNode && self) {
    createConnectionEntryIfNeeded(connections, self, selfReactFlowKey);
    const currentConnectionInputs = connections[selfReactFlowKey].inputs;
    const newInputValue = { node: sourceNode, reactFlowKey: sourceReactFlowKey };

    // Schema nodes can only ever have 1 input
    if (isSchemaNodeExtended(self)) {
      currentConnectionInputs[0] = [newInputValue];
    } else {
      // If the destination has unlimited inputs, all should go on the first input
      if (self.maxNumberOfInputs === -1) {
        // Check if an undefined input field exists first (created through PropPane)
        const indexOfFirstOpenInput = currentConnectionInputs[0].findIndex((inputCon) => !inputCon);

        if (indexOfFirstOpenInput >= 0) {
          currentConnectionInputs[0][indexOfFirstOpenInput] = newInputValue;
        } else {
          // Otherwise we can safely just append its value to the end
          currentConnectionInputs[0].push(newInputValue);
        }
      } else {
        // Add input to first available and type-matched place (handle & PropPane validation should guarantee there's at least one)
        let added = false;
        Object.entries(currentConnectionInputs).forEach(([key, value], idx) => {
          if (
            !added &&
            value.length < 1 &&
            self.inputs[idx].allowedTypes.some(
              (type) =>
                type === NormalizedDataType.Any ||
                (isSchemaNodeExtended(sourceNode) ? type === sourceNode.normalizedDataType : type === sourceNode.outputValueType)
            )
          ) {
            currentConnectionInputs[key].push(newInputValue);
            added = true;
          }
        });
      }
    }

    createConnectionEntryIfNeeded(connections, sourceNode, sourceReactFlowKey);
    connections[sourceReactFlowKey].outputs.push({ node: self, reactFlowKey: selfReactFlowKey });
    connections[sourceReactFlowKey].outputs = connections[sourceReactFlowKey].outputs.filter(onlyUniqueConnections);
  }
};

// Primarily used by PropPane InputDropdowns
export const updateConnectionInputValue = (
  connections: ConnectionDictionary,
  { targetNode, targetNodeReactFlowKey, inputIndex, value, isUnboundedInput }: UpdateConnectionInputAction
) => {
  // Verify if old value was a ConnectionUnit, and if so, remove it from source's outputs[]
  let connection = connections[targetNodeReactFlowKey];
  if (connection?.inputs) {
    let inputConnection: InputConnection = undefined;

    if (isUnboundedInput) {
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

  createConnectionEntryIfNeeded(connections, targetNode, targetNodeReactFlowKey);
  connection = connections[targetNodeReactFlowKey];

  // null is signal to delete unbounded input value
  if (value === null) {
    if (isUnboundedInput) {
      const newUnboundedInputValues = connection.inputs[0];
      newUnboundedInputValues.splice(inputIndex, 1);
      connection.inputs[0] = newUnboundedInputValues;
    } else {
      console.error('Invalid Connection Input Op: null was provided for non-unbounded-input value');
    }
  } else if (value === undefined) {
    // NOTE: Explicit undefined check to account for empty custom values ('')
    if (isUnboundedInput) {
      connection.inputs[0][inputIndex] = undefined;
    } else {
      connection.inputs[inputIndex] = [];
    }
  } else {
    if (isUnboundedInput) {
      connection.inputs[0][inputIndex] = value;
    } else {
      connection.inputs[inputIndex][0] = value;
    }

    // Only need to update/add value to source's outputs[] if it's a ConnectionUnit
    if (isConnectionUnit(value)) {
      const tgtConUnit: ConnectionUnit = {
        node: targetNode,
        reactFlowKey: targetNodeReactFlowKey,
      };

      createConnectionEntryIfNeeded(connections, value.node, value.reactFlowKey);
      connections[value.reactFlowKey].outputs.push(tgtConUnit);
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

export const collectNodesForConnectionChain = (currentFunction: Connection, connections: ConnectionDictionary): ConnectionUnit[] => {
  const connectionUnits: ConnectionUnit[] = flattenInputs(currentFunction.inputs).filter(isConnectionUnit);

  if (connectionUnits.length > 0) {
    return [
      currentFunction.self,
      ...connectionUnits.flatMap((input) => collectNodesForConnectionChain(connections[input.reactFlowKey], connections)),
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
  targetSchemaNodeConnections: Connection[],
  connections: ConnectionDictionary
): SchemaNodeExtended[] => {
  return targetSchemaNodeConnections
    .flatMap((connectedNode) => collectNodesForConnectionChain(connectedNode, connections))
    .filter((connectedNode) => isSchemaNodeExtended(connectedNode.node) && !connectedNode.reactFlowKey.includes(targetPrefix))
    .map((connectedNode) => connectedNode.node) as SchemaNodeExtended[];
};

export const getFunctionConnectionUnits = (
  targetSchemaNodeConnections: Connection[],
  connections: ConnectionDictionary
): ConnectionUnit[] => {
  return targetSchemaNodeConnections
    .flatMap((connectedNode) => collectNodesForConnectionChain(connectedNode, connections))
    .filter((connectionUnit) => isFunctionData(connectionUnit.node));
};

export const bringInParentSourceNodesForRepeating = (
  parentTargetNode: WritableDraft<SchemaNodeExtended> | undefined,
  newState: DataMapOperationState
) => {
  if (parentTargetNode) {
    const inputsToParentTarget = newState.dataMapConnections['target-' + parentTargetNode?.key].inputs; // do I need to add prefix
    // Danielle: is it possible that there can be a function in between that we need to pull in?
    console.log(JSON.stringify(inputsToParentTarget));
    Object.keys(inputsToParentTarget).forEach((key) => {
      const inputObj = inputsToParentTarget[key][0];
      if (inputObj && typeof inputObj !== 'string') {
        const inputSrc = inputObj.node;
        if (isSchemaNodeExtended(inputSrc)) {
          newState.currentSourceSchemaNodes.push(inputSrc);
          console.log(JSON.stringify(inputObj));
        }
      }
    });
  }
};
