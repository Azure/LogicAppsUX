import { NormalizedDataType } from '../models';
import type { SchemaNodeDataType } from '../models';
import type { Connection } from '../models/Connection';
import type { FunctionInput } from '../models/Function';

export const isValidSourceSchemaNodeToTargetSchemaNodeConnection = (srcDataType: SchemaNodeDataType, tgtDataType: SchemaNodeDataType) =>
  srcDataType === tgtDataType;
export const isValidFunctionNodeToTargetSchemaNodeConnection = (srcDataType: NormalizedDataType, tgtDataType: NormalizedDataType) =>
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
    const numInputsWithValue = currentNodeConnection.inputs.filter((input) => !!input).length;
    if (numInputsWithValue === tgtMaxNumInputs) {
      return false;
    }
  }

  return isFunctionTypeSupportedAndAvailable(srcNodeType, currentNodeConnection, tgtInputs);
};

const isFunctionTypeSupportedAndAvailable = (
  inputNodeType: NormalizedDataType,
  curCon: Connection | undefined,
  tgtInputs: FunctionInput[]
) => {
  if (curCon) {
    // No inputs, so just verify type
    if (curCon.inputs.length === 0 && isFunctionTypeSupported(inputNodeType, tgtInputs)) {
      return true;
    }

    // If inputs, verify that there's an open/undefined spot that matches type
    let supportedTypeInputIsAvailable = false;
    curCon.inputs.forEach((input, idx) => {
      if (!input) {
        if (tgtInputs[idx].allowedTypes.some((allowedType) => allowedType === inputNodeType || allowedType === NormalizedDataType.Any)) {
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
