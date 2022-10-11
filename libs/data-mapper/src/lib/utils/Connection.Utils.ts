import { NormalizedDataType, type SchemaNodeDataType } from '../models';
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
  // Make sure there's available inputs
  if (currentNodeConnection) {
    const numInputsWithValue = currentNodeConnection.inputs.filter((input) => !!input).length;
    if (numInputsWithValue === tgtMaxNumInputs) {
      return false;
    }
  }

  return isTypeSupportedAndAvailable(srcNodeType, currentNodeConnection, tgtInputs);
};

const isTypeSupportedAndAvailable = (inputNodeType: NormalizedDataType, curCon: Connection | undefined, tgtInputs: FunctionInput[]) => {
  if (curCon) {
    if (curCon.inputs.length === 0 && isTypeSupported(inputNodeType, tgtInputs)) {
      return true;
    }

    let supportedTypeInputIsAvailable = false;
    curCon.inputs.forEach((input, idx) => {
      if (!input) {
        if (tgtInputs[idx].allowedTypes.some((allowedType) => allowedType === inputNodeType)) {
          supportedTypeInputIsAvailable = true;
        }
      }
    });

    return supportedTypeInputIsAvailable;
  } else {
    if (isTypeSupported(inputNodeType, tgtInputs)) {
      return true;
    }
  }

  return false;
};

const isTypeSupported = (inputNodeType: NormalizedDataType, tgtInputs: FunctionInput[]) => {
  return tgtInputs.some((input) =>
    input.allowedTypes.some((allowedType) => allowedType === NormalizedDataType.Any || allowedType === inputNodeType)
  );
};
