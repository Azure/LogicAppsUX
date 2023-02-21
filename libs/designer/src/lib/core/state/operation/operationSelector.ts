import type { RootState } from '../../store';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import { shouldUseParameterInGroup } from '../../utils/parameters/helper';

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

export const useParameterValidationErrors = (nodeId: string) => {
  return useSelector((rootState: RootState) => {
    const allParameters = getOperationInputParameters(rootState, nodeId);
    return allParameters
      .map((parameter) => parameter.validationErrors)
      .flat()
      .filter((error) => error);
  });
};
