/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getOperationInfo, getOperationManifest } from '../../queries/operation';
import type { NodeData } from '../../state/operation/operationMetadataSlice';
import { initializeOperationInfo, initializeNodes } from '../../state/operation/operationMetadataSlice';
import { clearPanel } from '../../state/panel/panelSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokensSlice';
import type { NodesMetadata, Operations } from '../../state/workflow/workflowInterfaces';
import type { RootState } from '../../store';
import { getConnectionId } from '../../utils/connectors/connections';
import { isRootNodeInGraph } from '../../utils/graph';
import {
  getAllInputParameters,
  getGroupAndParameterFromParameterKey,
  loadDynamicData,
  loadDynamicValuesForParameter,
  updateTokenMetadata,
} from '../../utils/parameters/helper';
import { isTokenValueSegment } from '../../utils/parameters/segment';
import { convertOutputsToTokens, getBuiltInTokens, getTokenNodeIds } from '../../utils/tokens';
import { getAllVariables, getVariableDeclarations, setVariableMetadata } from '../../utils/variables';
import { getInputParametersFromManifest, getOutputParametersFromManifest, getParameterDependencies } from './initialize';
import { getOperationSettings } from './settings';
import { LogEntryLevel, LoggerService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { getPropertyValue, map, aggregate, equals } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

export interface NodeDataWithManifest extends NodeData {
  manifest: OperationManifest;
}

export const initializeOperationMetadata = async (deserializedWorkflow: DeserializedWorkflow, dispatch: Dispatch): Promise<void> => {
  const promises: Promise<NodeDataWithManifest[] | undefined>[] = [];
  const { actionData: operations, graph, nodesMetadata } = deserializedWorkflow;
  const operationManifestService = OperationManifestService();
  let triggerNodeId = '';

  for (const [operationId, operation] of Object.entries(operations)) {
    const isTrigger = isRootNodeInGraph(operationId, 'root', nodesMetadata);

    if (isTrigger) {
      triggerNodeId = operationId;
    }
    if (operationManifestService.isSupported(operation.type)) {
      promises.push(initializeOperationDetailsForManifest(operationId, operation, !!isTrigger, dispatch));
    } else {
      // swagger case here
    }
  }

  const allNodeData = aggregate((await Promise.all(promises)).filter((data) => !!data) as NodeDataWithManifest[][]);

  updateTokenMetadataInParameters(allNodeData, operations, triggerNodeId);
  dispatch(clearPanel());
  dispatch(
    initializeNodes(
      allNodeData.map((data) => {
        const { id, nodeInputs, nodeOutputs, nodeDependencies, settings } = data;
        return { id, nodeInputs, nodeOutputs, nodeDependencies, settings };
      })
    )
  );

  const variables = initializeVariables(operations, allNodeData);
  dispatch(
    initializeTokensAndVariables({
      outputTokens: initializeOutputTokensForOperations(allNodeData, operations, graph, nodesMetadata),
      variables,
    })
  );
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  isTrigger: boolean,
  dispatch: Dispatch
): Promise<NodeDataWithManifest[] | undefined> => {
  try {
    const operationInfo = await getOperationInfo(nodeId, operation);

    if (operationInfo) {
      const nodeOperationInfo = { ...operationInfo, type: operation.type, kind: operation.kind };
      const manifest = await getOperationManifest(operationInfo);

      dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));

      const settings = getOperationSettings(isTrigger, operation.type, operation.kind, manifest, operation);
      const nodeInputs = getInputParametersFromManifest(nodeId, manifest, operation);
      const { nodeOutputs, dynamicOutput } = getOutputParametersFromManifest(
        manifest,
        isTrigger,
        nodeInputs,
        settings.splitOn?.value?.value
      );
      const nodeDependencies = getParameterDependencies(manifest, nodeInputs, nodeOutputs, dynamicOutput);

      const childGraphInputs = processChildGraphAndItsInputs(manifest, operation);

      return [{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings, manifest }, ...childGraphInputs];
    }

    return;
  } catch (error) {
    const errorMessage = `Unable to initialize operation details for operation - ${nodeId}. Error details - ${error}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'operation deserializer',
      message: errorMessage,
    });

    return;
  }
};

const processChildGraphAndItsInputs = (
  manifest: OperationManifest,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition
): NodeDataWithManifest[] => {
  const { subGraphDetails } = manifest.properties;
  const nodesData: NodeDataWithManifest[] = [];

  if (subGraphDetails) {
    for (const subGraphKey of Object.keys(subGraphDetails)) {
      const { inputs, inputsLocation, isAdditive } = subGraphDetails[subGraphKey];
      const subOperation = getPropertyValue(operation, subGraphKey);
      if (inputs) {
        const subManifest = { properties: { inputs, inputsLocation } } as any;
        if (isAdditive) {
          for (const subNodeKey of Object.keys(subOperation)) {
            const subNodeInputs = getInputParametersFromManifest(subNodeKey, subManifest, subOperation[subNodeKey]);
            const subNodeOutputs = { outputs: {} };
            nodesData.push({
              id: subNodeKey,
              nodeInputs: subNodeInputs,
              nodeOutputs: subNodeOutputs,
              nodeDependencies: getParameterDependencies(subManifest, subNodeInputs, subNodeOutputs),
              manifest: subManifest,
            });
          }
        }

        const nodeInputs = getInputParametersFromManifest(subGraphKey, subManifest, subOperation);
        const nodeOutputs = { outputs: {} };
        nodesData.push({
          id: subGraphKey,
          nodeInputs,
          nodeOutputs,
          nodeDependencies: getParameterDependencies(subManifest, nodeInputs, nodeOutputs),
          manifest: subManifest,
        });
      }
    }
  }

  return nodesData;
};

const updateTokenMetadataInParameters = (nodes: NodeDataWithManifest[], operations: Operations, triggerNodeId: string) => {
  const nodesData = map(nodes, 'id');
  const actionNodes = nodes
    .map((node) => node.id)
    .filter((nodeId) => nodeId !== triggerNodeId)
    .reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {});

  for (const nodeData of nodes) {
    const allParameters = getAllInputParameters(nodeData.nodeInputs);
    for (const parameter of allParameters) {
      const segments = parameter.value;

      if (segments && segments.length) {
        parameter.value = segments.map((segment) => {
          if (isTokenValueSegment(segment)) {
            segment = updateTokenMetadata(segment, actionNodes, triggerNodeId, nodesData, operations, parameter.type);
          }

          return segment;
        });
      }
    }
  }
};

const initializeOutputTokensForOperations = (
  allNodesData: NodeDataWithManifest[],
  operations: Operations,
  graph: WorkflowNode,
  nodesMetadata: NodesMetadata
): Record<string, NodeTokens> => {
  const nodeMap = Object.keys(operations).reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {});
  const nodesWithManifest = allNodesData.reduce(
    (actionNodes: Record<string, NodeDataWithManifest>, nodeData: NodeDataWithManifest) => ({ ...actionNodes, [nodeData.id]: nodeData }),
    {}
  );

  const result: Record<string, NodeTokens> = {};

  for (const operationId of Object.keys(operations)) {
    const upstreamNodeIds = getTokenNodeIds(operationId, graph, nodesMetadata, nodesWithManifest, nodeMap);
    const nodeTokens: NodeTokens = { tokens: [], upstreamNodeIds };
    const nodeData = nodesWithManifest[operationId];
    const nodeManifest = nodeData?.manifest;

    nodeTokens.tokens.push(...getBuiltInTokens(nodeManifest));
    nodeTokens.tokens.push(
      ...convertOutputsToTokens(
        isRootNodeInGraph(operationId, 'root', nodesMetadata) ? undefined : operationId,
        operations[operationId]?.type,
        nodeData?.nodeOutputs.outputs ?? {},
        nodeManifest,
        nodesWithManifest[operationId]?.settings
      )
    );

    result[operationId] = nodeTokens;
  }

  return result;
};

const initializeVariables = (operations: Operations, allNodesData: NodeDataWithManifest[]): Record<string, VariableDeclaration[]> => {
  const declarations: Record<string, VariableDeclaration[]> = {};
  let detailsInitialized = false;

  for (const nodeData of allNodesData) {
    const { id, nodeInputs, manifest } = nodeData;
    if (equals(operations[id]?.type, Constants.NODE.TYPE.INITIALIZE_VARIABLE)) {
      if (!detailsInitialized && manifest) {
        setVariableMetadata(manifest.properties.iconUri, manifest.properties.brandColor);
        detailsInitialized = true;
      }

      const variables = getVariableDeclarations(nodeInputs);
      if (variables.length) {
        declarations[id] = variables;
      }
    }
  }

  return declarations;
};

export const updateDynamicDataInNodes = async (
  connectionsPromise: Promise<void>,
  getState: () => RootState,
  dispatch: Dispatch
): Promise<void> => {
  await connectionsPromise;
  const rootState = getState();
  const {
    workflow: { nodesMetadata, operations },
    operations: { inputParameters, settings, dependencies, operationInfo },
    tokens: { variables },
  } = rootState;
  for (const [nodeId, operation] of Object.entries(operations)) {
    const nodeDependencies = dependencies[nodeId];
    const nodeInputs = inputParameters[nodeId];
    const nodeSettings = settings[nodeId];
    const connectionId = getConnectionId(rootState.connections, nodeId);
    const isTrigger = isRootNodeInGraph(nodeId, 'root', nodesMetadata);
    const nodeOperationInfo = operationInfo[nodeId];

    // TODO - The below if check should be removed once swagger based operations are correctly implemented
    if (nodeOperationInfo) {
      loadDynamicData(
        nodeId,
        isTrigger,
        nodeOperationInfo,
        connectionId,
        nodeDependencies,
        nodeInputs,
        nodeSettings,
        getAllVariables(variables),
        dispatch,
        operation
      );

      for (const parameterKey of Object.keys(nodeDependencies.inputs)) {
        const dependencyInfo = nodeDependencies.inputs[parameterKey];
        if (dependencyInfo.dependencyType === 'ListValues') {
          const details = getGroupAndParameterFromParameterKey(nodeInputs, parameterKey);
          if (details) {
            loadDynamicValuesForParameter(
              nodeId,
              details.groupId,
              details.parameter.id,
              nodeOperationInfo,
              connectionId,
              nodeInputs,
              nodeDependencies,
              dispatch
            );
          }
        }
      }
    }
  }
};
