import type { NodeStaticResults } from '../../actions/bjsworkflow/staticresults';
import type { RootState } from '../../store';
import { shouldUseParameterInGroup } from '../../utils/parameters/helper';
import type { ErrorInfo, NodeDependencies, NodeInputs } from './operationMetadataSlice';
import { ErrorLevel } from './operationMetadataSlice';
import type { NodeOutputs } from '@microsoft/logic-apps-shared';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { createSelector } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const getOperationState = (state: RootState) => state.operations;

export const useOperationVisuals = (nodeId: string) =>
  useSelector(
    createSelector(getOperationState, (state) => getRecordEntry(state.operationMetadata, nodeId) ?? { brandColor: '', iconUri: '' })
  );

export const getOperationInputParameters = (rootState: RootState, nodeId: string): ParameterInfo[] => {
  const nodeInputs = getRecordEntry(rootState.operations.inputParameters, nodeId);
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

export const useOperationInputParameters = (nodeId: string): ParameterInfo[] => {
  const nodeInputs = useSelector((rootState: RootState) => getRecordEntry(rootState.operations.inputParameters, nodeId));
  return useMemo(() => {
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
  }, [nodeInputs]);
};

export const useOperationErrorInfo = (nodeId: string): ErrorInfo | undefined =>
  useSelector(createSelector(getOperationState, (state) => getTopErrorInOperation(getRecordEntry(state.errors, nodeId))));

export const useAllConnectionErrors = (): Record<string, string> =>
  useSelector(
    createSelector(getOperationState, (state) =>
      Object.entries(state.errors ?? {}).reduce((acc: any, [nodeId, errors]) => {
        const connectionError = errors?.[ErrorLevel.Connection];
        // eslint-disable-next-line no-param-reassign
        if (connectionError) acc[nodeId] = connectionError.message;
        return acc;
      }, {})
    )
  );

export const useOperationsInputParameters = (): Record<string, NodeInputs> =>
  useSelector(createSelector(getOperationState, (state) => state.inputParameters));

export const useSecureInputsOutputs = (nodeId: string): boolean =>
  useSelector(
    createSelector(getOperationState, (state) => {
      const nodeSettings = getRecordEntry(state.settings, nodeId);
      return !!(nodeSettings?.secureInputs?.value || nodeSettings?.secureOutputs?.value);
    })
  );

export const useParameterStaticResult = (nodeId: string): NodeStaticResults | undefined =>
  useSelector(createSelector(getOperationState, (state) => getRecordEntry(state.staticResults, nodeId)));

export const useRawInputParameters = (nodeId: string): NodeInputs | undefined =>
  useSelector(createSelector(getOperationState, (state) => getRecordEntry(state.inputParameters, nodeId)));

export const useRawOutputParameters = (nodeId: string): NodeOutputs | undefined =>
  useSelector(createSelector(getOperationState, (state) => getRecordEntry(state.outputParameters, nodeId)));

const mockDeps: NodeDependencies = { inputs: {}, outputs: {} };
export const useDependencies = (nodeId: string) =>
  useSelector(createSelector(getOperationState, (state) => getRecordEntry(state.dependencies, nodeId) ?? mockDeps));

export const useTokenDependencies = (nodeId: string) => {
  const operationInputParameters = useRawInputParameters(nodeId);
  return useMemo(() => {
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
  }, [operationInputParameters]);
};

export const useAllOperationErrors = () => useSelector(createSelector(getOperationState, (state) => state.errors));

export const useParameterValidationErrors = (nodeId: string) => {
  const allParameters = useOperationInputParameters(nodeId);
  return useMemo(
    () =>
      allParameters
        .map((parameter) => parameter.validationErrors)
        .flat()
        .filter((error) => error),
    [allParameters]
  );
};

export const useNodesInitialized = () => useSelector(createSelector(getOperationState, (state) => state.loadStatus.nodesInitialized));

export const useNodesAndDynamicDataInitialized = () =>
  useSelector(createSelector(getOperationState, (state) => state.loadStatus.nodesAndDynamicDataInitialized));

const getTopErrorInOperation = (errors?: Record<ErrorLevel, ErrorInfo | undefined>): ErrorInfo | undefined => {
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

export const useBrandColor = (nodeId: string) =>
  useSelector(createSelector(getOperationState, (state) => getRecordEntry(state.operationMetadata, nodeId)?.brandColor ?? ''));

export const useIconUri = (nodeId: string) =>
  useSelector(createSelector(getOperationState, (state) => getRecordEntry(state.operationMetadata, nodeId)?.iconUri ?? ''));

export const useNodeConnectorId = (nodeId: string) =>
  useSelector(createSelector(getOperationState, (state) => getRecordEntry(state.operationInfo, nodeId)?.connectorId));
