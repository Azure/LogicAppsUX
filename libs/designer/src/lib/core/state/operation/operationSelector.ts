import type { NodeStaticResults } from '../../actions/bjsworkflow/staticresults';
import type { RootState } from '../../store';
import { shouldUseParameterInGroup } from '../../utils/parameters/helper';
import type { ErrorInfo, NodeInputs } from './operationMetadataSlice';
import { ErrorLevel } from './operationMetadataSlice';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';

export const getOperationInputParameters = (rootState: RootState, nodeId: string): ParameterInfo[] => {
  const nodeInputs = rootState.operations.inputParameters[nodeId];
  const allParameters: ParameterInfo[] = [];

  if (nodeInputs) {
    const { parameterGroups } = nodeInputs;
    if (parameterGroups) {
      for (const parameterGroupId of Object.keys(parameterGroups)) {
        const { parameters } = parameterGroups[parameterGroupId];

        allParameters.push(
          ...parameters.filter((parameter) => shouldUseParameterInGroup(parameter, parameters) && !parameter.info.serialization?.skip)
        );
      }
    }
  }

  return allParameters;
};

export const useOperationErrorInfo = (nodeId: string): ErrorInfo | undefined => {
  return useSelector((rootState: RootState) => {
    return getTopErrorInOperation(rootState.operations.errors[nodeId]);
  });
};

export const useOperationsInputParameters = (): Record<string, NodeInputs> => {
  return useSelector((rootState: RootState) => rootState.operations.inputParameters);
};

export const useSecureInputsOutputs = (nodeId: string): boolean => {
  return useSelector(
    (rootState: RootState) =>
      !!(rootState.operations.settings?.[nodeId]?.secureInputs?.value || rootState.operations.settings?.[nodeId]?.secureOutputs?.value)
  );
};

export const useParameterStaticResult = (nodeId: string): NodeStaticResults => {
  return useSelector((rootState: RootState) => rootState.operations.staticResults[nodeId]);
};

export const useTokenDependencies = (nodeId: string) =>
  useSelector((rootState: RootState) => {
    const operationInputParameters = rootState.operations.inputParameters[nodeId];
    if (!operationInputParameters) {
      return new Set();
    }
    const dependencies = new Set();
    for (const group of Object.values(operationInputParameters.parameterGroups)) {
      for (const parameter of group.parameters) {
        for (const value of parameter.value) {
          if (value.token?.actionName) {
            dependencies.add(value.token.actionName);
          }
        }
      }
    }
    return dependencies;
  });

export const useParameterValidationErrors = (nodeId: string) => {
  return useSelector((rootState: RootState) => {
    const allParameters = getOperationInputParameters(rootState, nodeId);
    return allParameters
      .map((parameter) => parameter.validationErrors)
      .flat()
      .filter((error) => error);
  });
};

export const useNodesInitialized = () => {
  return useSelector((rootState: RootState) => rootState.operations.loadStatus.nodesInitialized);
};

const getTopErrorInOperation = (errors: Record<ErrorLevel, ErrorInfo | undefined>): ErrorInfo | undefined => {
  if (!errors) {
    return undefined;
  } else if (errors[ErrorLevel.Critical]) {
    return errors[ErrorLevel.Critical];
  } else if (errors[ErrorLevel.Connection]) {
    return errors[ErrorLevel.Connection];
  } else if (errors[ErrorLevel.DynamicInputs]) {
    return errors[ErrorLevel.DynamicInputs];
  } else if (errors[ErrorLevel.DynamicOutputs]) {
    return errors[ErrorLevel.DynamicOutputs];
  } else if (errors[ErrorLevel.Default]) {
    return errors[ErrorLevel.Default];
  } else {
    return undefined;
  }
};
