import type { RootState } from '../../store';
import type { ParameterInfo } from '@microsoft/designer-ui';

export const getOperationInputParameters = (rootState: RootState, nodeId: string): ParameterInfo[] => {
  const nodeInputs = rootState.operations.inputParameters[nodeId];
  const allParameters: ParameterInfo[] = [];

  if (nodeInputs) {
    const { parameterGroups } = nodeInputs;
    if (parameterGroups) {
      for (const parameterGroupId of Object.keys(parameterGroups)) {
        const { parameters } = parameterGroups[parameterGroupId];

        allParameters.push(...parameters.filter((parameter) => !parameter.info.serialization?.skip));
      }
    }
  }

  return allParameters;
};
