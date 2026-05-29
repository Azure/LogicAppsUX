import type { NodeStaticResults } from '../../actions/bjsworkflow/staticresults';
import type { RootState } from '../../store';
import { getParameterFromName, shouldUseParameterInGroup } from '../../utils/parameters/helper';
import type { ErrorInfo, NodeDependencies, NodeInputs, OperationMetadataState } from './operationMetadataSlice';
import { ErrorLevel } from './operationMetadataSlice';
import type { NodeOutputs } from '@microsoft/logic-apps-shared';
import { DynamicLoadStatus, type ParameterInfo } from '@microsoft/designer-ui';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { createSelector } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const getOperationState = (state: RootState) => state.operations;

export const useOperationVisuals = (nodeId: string) =>
  useSelector(
    useMemo(
      () =>
        createSelector(
          getOperationState,
          (state) =>
            getRecordEntry(state.operationMetadata, nodeId) ?? {
              brandColor: '',
              iconUri: '',
            }
        ),
      [nodeId]
    )
  );

export const useOperationsVisuals = (nodesId: string[]) =>
  useSelector(
    useMemo(
      () =>
        createSelector(getOperationState, (state) => {
          return nodesId.map((nodeId) => {
            return {
              ...(getRecordEntry(state.operationMetadata, nodeId) ?? {
                brandColor: '',
                iconUri: '',
              }),
              id: nodeId,
            };
          });
        }),
      [nodesId]
    )
  );

export const getNodeOperationData = (state: OperationMetadataState, nodeId: string) => {
  return {
    nodeInputs: getRecordEntry(state.inputParameters, nodeId),
    nodeOutputs: getRecordEntry(state.outputParameters, nodeId),
    nodeDependencies: getRecordEntry(state.dependencies, nodeId),
    operationMetadata: getRecordEntry(state.operationMetadata, nodeId),
    settings: getRecordEntry(state.settings, nodeId),
    staticResult: getRecordEntry(state.staticResults, nodeId),
    actionMetadata: getRecordEntry(state.actionMetadata, nodeId),
    repetitionInfo: getRecordEntry(state.repetitionInfos, nodeId),
  };
};

export const getOperationInputParameters = (nodeInputs: NodeInputs): ParameterInfo[] => {
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

export const useOperationParameterByName = (nodeId: string, parameterName: string): ParameterInfo | undefined => {
  const nodeInputs = useSelector((rootState: RootState) => getRecordEntry(rootState.operations.inputParameters, nodeId));
  return useMemo(() => {
    if (!nodeInputs) {
      return undefined;
    }
    return getParameterFromName(nodeInputs, parameterName);
  }, [nodeInputs, parameterName]);
};

export const useOperationErrorInfo = (nodeId: string): ErrorInfo | undefined =>
  useSelector(
    useMemo(() => createSelector(getOperationState, (state) => getTopErrorInOperation(getRecordEntry(state.errors, nodeId))), [nodeId])
  );

export const useOperationDynamicInputsError = (nodeId: string | undefined): string | undefined =>
  useSelector(
    useMemo(
      () =>
        createSelector(getOperationState, (state) => {
          const errors = getRecordEntry(state.errors, nodeId);
          return errors?.[ErrorLevel.DynamicInputs]?.message;
        }),
      [nodeId]
    )
  );

const selectAllConnectionErrors = createSelector(getOperationState, (state) => {
  const result: Record<string, string> = {};
  for (const [nodeId, errors] of Object.entries(state.errors ?? {})) {
    const connectionError = errors?.[ErrorLevel.Connection];
    if (connectionError) {
      result[nodeId] = connectionError.message;
    }
  }
  return result;
});

export const useAllConnectionErrors = (): Record<string, string> => useSelector(selectAllConnectionErrors);

const selectOperationsInputParameters = createSelector(getOperationState, (state) => state.inputParameters);

export const useOperationsInputParameters = (): Record<string, NodeInputs> => useSelector(selectOperationsInputParameters);

export const useSecureInputsOutputs = (nodeId: string): boolean =>
  useSelector(
    useMemo(
      () =>
        createSelector(getOperationState, (state) => {
          const nodeSettings = getRecordEntry(state.settings, nodeId);
          return !!(nodeSettings?.secureInputs?.value || nodeSettings?.secureOutputs?.value);
        }),
      [nodeId]
    )
  );

export const useParameterStaticResult = (nodeId: string): NodeStaticResults | undefined =>
  useSelector(useMemo(() => createSelector(getOperationState, (state) => getRecordEntry(state.staticResults, nodeId)), [nodeId]));

export const useRawInputParameters = (nodeId: string): NodeInputs | undefined =>
  useSelector(useMemo(() => createSelector(getOperationState, (state) => getRecordEntry(state.inputParameters, nodeId)), [nodeId]));

export const useRawOutputParameters = (nodeId: string): NodeOutputs | undefined =>
  useSelector(useMemo(() => createSelector(getOperationState, (state) => getRecordEntry(state.outputParameters, nodeId)), [nodeId]));

const mockDeps: NodeDependencies = { inputs: {}, outputs: {} };
export const useDependencies = (nodeId: string) =>
  useSelector(
    useMemo(() => createSelector(getOperationState, (state) => getRecordEntry(state.dependencies, nodeId) ?? mockDeps), [nodeId])
  );

interface TokenDependencies {
  dependencies: Set<string>;
  loopSources: Set<string>;
}
export const useTokenDependencies = (nodeId: string): TokenDependencies => {
  const operationInputParameters = useRawInputParameters(nodeId);
  const variables = useSelector((state: RootState) => state.tokens.variables);

  return useMemo(() => {
    if (!operationInputParameters) {
      return { dependencies: new Set(), loopSources: new Set() };
    }
    const dependencies = new Set<string>();
    const loopSources = new Set<string>();

    for (const group of Object.values(operationInputParameters.parameterGroups)) {
      for (const parameter of group.parameters) {
        for (const value of parameter.value) {
          if (value.token?.arrayDetails?.loopSource) {
            loopSources.add(value.token.arrayDetails.loopSource);
          }
          if (value.token?.actionName) {
            dependencies.add(value.token.actionName);
          }
          // Check for variable tokens
          if (value.token?.tokenType === 'variable' && value.token?.name) {
            // Find which node initializes this variable
            for (const [nodeId, nodeVariables] of Object.entries(variables)) {
              if (nodeVariables.some((v) => v.name === value.token?.name)) {
                dependencies.add(nodeId);
                break;
              }
            }
          }
        }
      }
    }
    return { dependencies, loopSources };
  }, [operationInputParameters, variables]);
};

export const useNodesTokenDependencies = (nodes: Set<string>) => {
  const operationsInputsParameters = useOperationsInputParameters();
  const variables = useSelector((state: RootState) => state.tokens.variables);
  return useMemo(() => {
    const dependencies: Record<string, Set<string>> = {};
    if (!operationsInputsParameters) {
      return dependencies;
    }
    for (const node of nodes) {
      const operationInputParameters = getRecordEntry(operationsInputsParameters, node);
      if (!operationInputParameters) {
        dependencies[node] = new Set();
        continue;
      }
      const innerDependencies = new Set<string>();
      for (const group of Object.values(operationInputParameters.parameterGroups)) {
        for (const parameter of group.parameters) {
          for (const value of parameter.value) {
            if (value.token?.actionName) {
              innerDependencies.add(value.token.actionName);
            }
            if (value.token?.arrayDetails?.loopSource) {
              innerDependencies.add(value.token.arrayDetails.loopSource);
            }
            // Check for variable tokens
            if (value.token?.tokenType === 'variable' && value.token?.name) {
              // Find which node initializes this variable
              for (const [nodeId, nodeVariables] of Object.entries(variables)) {
                if (nodeVariables.some((v) => v.name === value.token?.name)) {
                  innerDependencies.add(nodeId);
                  break;
                }
              }
            }
          }
        }
      }
      dependencies[node] = innerDependencies;
    }
    return dependencies;
  }, [nodes, operationsInputsParameters, variables]);
};

const selectAllOperationErrors = createSelector(getOperationState, (state) => state.errors);

export const useAllOperationErrors = () => useSelector(selectAllOperationErrors);

export const useParameterValidationErrors = (nodeId: string) => {
  const allParameters = useOperationInputParameters(nodeId);
  return useMemo(() => allParameters.flatMap((parameter) => parameter.validationErrors).filter((error) => error), [allParameters]);
};

const selectNodesInitialized = createSelector(getOperationState, (state) => state.loadStatus.nodesInitialized);

export const useNodesInitialized = () => useSelector(selectNodesInitialized);

const selectNodesAndDynamicDataInitialized = createSelector(getOperationState, (state) => state.loadStatus.nodesAndDynamicDataInitialized);

export const useNodesAndDynamicDataInitialized = () => useSelector(selectNodesAndDynamicDataInitialized);

export const useIsNodeLoadingDynamicData = (nodeId: string) =>
  useSelector(
    useMemo(
      () =>
        createSelector(getOperationState, (state) => {
          const parameterGroups = getRecordEntry(state.inputParameters, nodeId)?.parameterGroups;
          return Object.values(parameterGroups ?? {}).some((parameterGroup) =>
            parameterGroup.parameters.some((parameter) => parameter.dynamicData?.status === DynamicLoadStatus.LOADING)
          );
        }),
      [nodeId]
    )
  );

const getTopErrorInOperation = (errors?: Record<ErrorLevel, ErrorInfo | undefined>): ErrorInfo | undefined => {
  if (!errors) {
    return undefined;
  }
  if (errors[ErrorLevel.Critical]) {
    return errors[ErrorLevel.Critical];
  }
  if (errors[ErrorLevel.Connection]) {
    return errors[ErrorLevel.Connection];
  }
  if (errors[ErrorLevel.DynamicInputs]) {
    return errors[ErrorLevel.DynamicInputs];
  }
  if (errors[ErrorLevel.DynamicOutputs]) {
    return errors[ErrorLevel.DynamicOutputs];
  }
  if (errors[ErrorLevel.Default]) {
    return errors[ErrorLevel.Default];
  }
  return undefined;
};

export const useBrandColor = (nodeId: string) =>
  useSelector(
    useMemo(() => createSelector(getOperationState, (state) => getRecordEntry(state.operationMetadata, nodeId)?.brandColor ?? ''), [nodeId])
  );

export const useIconUri = (nodeId: string) =>
  useSelector(
    useMemo(() => createSelector(getOperationState, (state) => getRecordEntry(state.operationMetadata, nodeId)?.iconUri ?? ''), [nodeId])
  );

const selectAllIcons = createSelector(getOperationState, (state) => {
  const icons: Record<string, string> = {};
  Object.entries(state.operationMetadata).forEach(([nodeId, metadata]) => {
    if (metadata?.iconUri) {
      icons[nodeId] = metadata.iconUri;
    }
  });
  return icons;
});

export const useAllIcons = () => useSelector(selectAllIcons);

export const useNodeConnectorId = (nodeId: string) =>
  useSelector(
    useMemo(() => createSelector(getOperationState, (state) => getRecordEntry(state.operationInfo, nodeId)?.connectorId), [nodeId])
  );
