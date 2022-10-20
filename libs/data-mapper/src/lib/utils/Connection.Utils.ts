/* eslint-disable no-param-reassign */
import type { UpdateConnectionInputAction } from '../core/state/DataMapSlice';
import type { SchemaNodeExtended } from '../models';
import { NormalizedDataType, SchemaNodeDataType } from '../models';
import type { Connection, ConnectionDictionary, ConnectionUnit, InputConnection, InputConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionInput } from '../models/Function';
import { isFunctionData } from './Function.Utils';
import { isSchemaNodeExtended } from './Schema.Utils';

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

    if (isFunctionData(node) && node.maxNumberOfInputs !== -1) {
      for (let index = 0; index <= node.maxNumberOfInputs; index++) {
        connections[reactFlowKey].inputs[index] = [];
      }
    } else {
      connections[reactFlowKey].inputs[0] = [];
    }
  }
};

export const addNodeToConnections = (
  connections: ConnectionDictionary,
  sourceNode: SchemaNodeExtended | FunctionData,
  sourceReactFlowKey: string,
  self: SchemaNodeExtended | FunctionData,
  selfReactFlowKey: string,
  desiredInput?: string
) => {
  if (sourceNode && self) {
    createConnectionEntryIfNeeded(connections, self, selfReactFlowKey);
    const currentConnectionInputs = connections[selfReactFlowKey].inputs;

    // Nodes can only ever have 1 input
    if (isSchemaNodeExtended(self)) {
      currentConnectionInputs[0] = [{ node: sourceNode, reactFlowKey: sourceReactFlowKey }];
    } else {
      // If the destination has unlimited inputs, all should go on the first input
      if (self.maxNumberOfInputs === -1) {
        currentConnectionInputs[0].push({ node: sourceNode, reactFlowKey: sourceReactFlowKey });
      } else {
        if (desiredInput) {
          if (currentConnectionInputs[desiredInput].length < 1) {
            currentConnectionInputs[desiredInput].push({ node: sourceNode, reactFlowKey: sourceReactFlowKey });
          } else {
            console.error('Input already filled. Failed to add');
            return;
          }
        } else {
          let added = false;
          Object.entries(currentConnectionInputs).forEach(([key, value]) => {
            if (!added && value.length < 1) {
              currentConnectionInputs[key].push({ node: sourceNode, reactFlowKey: sourceReactFlowKey });
              added = true;
            }
          });
        }
      }
    }

    createConnectionEntryIfNeeded(connections, sourceNode, sourceReactFlowKey);
    connections[sourceReactFlowKey].outputs.push({ node: self, reactFlowKey: selfReactFlowKey });
    connections[sourceReactFlowKey].outputs = connections[sourceReactFlowKey].outputs.filter(onlyUniqueConnections);
  }
};

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
  currentNodeConnection: Connection | undefined,
  tgtMaxNumInputs: number,
  tgtInputs: FunctionInput[]
) => {
  // If Function has unbounded inputs, just check if type matches
  if (tgtMaxNumInputs === -1) {
    return isFunctionTypeSupported(srcNodeType, tgtInputs);
  }

  // Make sure there's available inputs
  if (currentNodeConnection) {
    if (flattenInputs(currentNodeConnection.inputs).length === tgtMaxNumInputs) {
      return false;
    }
  }

  return isFunctionTypeSupportedAndAvailable(srcNodeType, currentNodeConnection, tgtInputs);
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
      if (targetInput.allowedTypes.some((allowedType) => allowedType === inputNodeType || allowedType === NormalizedDataType.Any)) {
        if (!connection.inputs || connection.inputs[index].length < 1) {
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
  return tgtInputs.some((input) =>
    input.allowedTypes.some((allowedType) => allowedType === NormalizedDataType.Any || allowedType === inputNodeType)
  );
};

export const flattenInputs = (inputs: InputConnectionDictionary): InputConnection[] => Object.values(inputs).flatMap((value) => value);

export const isCustomValue = (connectionInput: InputConnection): connectionInput is string =>
  !!connectionInput && typeof connectionInput === 'string';
export const isConnectionUnit = (connectionInput: InputConnection): connectionInput is ConnectionUnit =>
  !!connectionInput && typeof connectionInput !== 'string';

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

  // All the sources are input nodes
  if (nodeInputs.length === flattenedInputs.length) {
    return true;
  } else if (customValueInputs.length === flattenedInputs.length) {
    // All inputs are custom values
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

export const nodeHasSpecificSourceNodeEventually = (
  sourceKey: string,
  currentConnection: Connection,
  connections: ConnectionDictionary
): boolean => {
  if (!currentConnection) {
    return false;
  }

  if (currentConnection.self.reactFlowKey === sourceKey) {
    return true;
  }

  const flattenedInputs = flattenInputs(currentConnection.inputs);
  const nonCustomInputs: ConnectionUnit[] = flattenedInputs.filter(isConnectionUnit);

  return nonCustomInputs.some((input) => nodeHasSpecificSourceNodeEventually(sourceKey, connections[input.reactFlowKey], connections));
};

export const collectNodesForConnectionChain = (currentFunction: Connection, connections: ConnectionDictionary): ConnectionUnit[] => {
  const connectionUnits: ConnectionUnit[] = flattenInputs(currentFunction.inputs).filter(isConnectionUnit);
  if (connectionUnits.length > 0) {
    return connectionUnits.flatMap((input) => collectNodesForConnectionChain(connections[input.reactFlowKey], connections));
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
