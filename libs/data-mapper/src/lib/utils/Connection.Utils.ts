/* eslint-disable no-param-reassign */
import type { SchemaNodeDataType, SchemaNodeExtended } from '../models';
import { NormalizedDataType } from '../models';
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
  selfReactFlowKey: string
) => {
  if (sourceNode && self) {
    createConnectionEntryIfNeeded(connections, self, selfReactFlowKey);

    // Nodes can only ever have 1 input
    if (isSchemaNodeExtended(self)) {
      connections[selfReactFlowKey].inputs[0] = [{ node: sourceNode, reactFlowKey: sourceReactFlowKey }];
    } else {
      // If the destination has unlimited inputs, all should go on the first input
      if (self.maxNumberOfInputs === -1) {
        connections[selfReactFlowKey].inputs[0].push({ node: sourceNode, reactFlowKey: sourceReactFlowKey });
        connections[selfReactFlowKey].inputs[0] = connections[selfReactFlowKey].inputs[0].filter(onlyUnique);
      } else {
        let added = false;
        Object.entries(connections[selfReactFlowKey].inputs).forEach(([key, value]) => {
          if (!added && value.length < 1) {
            connections[selfReactFlowKey].inputs[key].push({ node: sourceNode, reactFlowKey: sourceReactFlowKey });
            added = true;
          }
        });
      }
    }

    createConnectionEntryIfNeeded(connections, sourceNode, sourceReactFlowKey);
    connections[sourceReactFlowKey].outputs.push({ node: self, reactFlowKey: selfReactFlowKey });
    connections[sourceReactFlowKey].outputs = connections[sourceReactFlowKey].outputs.filter(onlyUnique);
  }
};

export const isValidSchemaNodeToSchemaNodeConnection = (srcDataType: SchemaNodeDataType, tgtDataType: SchemaNodeDataType) =>
  srcDataType === tgtDataType;
export const isValidFunctionNodeToSchemaNodeConnection = (srcDataType: NormalizedDataType, tgtDataType: NormalizedDataType) =>
  srcDataType === tgtDataType;

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
        if (connection.inputs[index].length < 1) {
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

export const isCustomValue = (connectionInput: InputConnection): connectionInput is string => typeof connectionInput === 'string';
export const isConnectionUnit = (connectionInput: InputConnection): connectionInput is ConnectionUnit =>
  typeof connectionInput !== 'string';

const onlyUnique = (value: any, index: any, self: string | any[]) => {
  return self.indexOf(value) === index;
};
