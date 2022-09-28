/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationInfo, getOperationManifest } from '../../queries/operation';
import type { DependencyInfo, NodeData, NodeInputs, NodeOutputs } from '../../state/operation/operationMetadataSlice';
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
import { initializeOperationDetailsForSwagger } from '../../utils/swagger/operation';
import { convertOutputsToTokens, getBuiltInTokens, getTokenNodeIds } from '../../utils/tokens';
import { getAllVariables, getVariableDeclarations, setVariableMetadata } from '../../utils/variables';
import { getInputParametersFromManifest, getOutputParametersFromManifest } from './initialize';
import { getOperationSettings } from './settings';
import type { ConnectorWithSwagger } from '@microsoft-logic-apps/designer-client-services';
import { LogEntryLevel, LoggerService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { InputParameter, OutputParameter } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { isArmResourceId, uniqueArray, getPropertyValue, map, aggregate, equals } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

export interface NodeDataWithOperationMetadata extends NodeData {
  manifest?: OperationManifest;
  iconUri: string;
  brandColor: string;
}

export interface NodeInputsWithDependencies {
  inputs: NodeInputs;
  dependencies: Record<string, DependencyInfo>;
  dynamicInput?: InputParameter;
}

export interface NodeOutputsWithDependencies {
  outputs: NodeOutputs;
  dependencies: Record<string, DependencyInfo>;
  dynamicOutput?: OutputParameter;
}

export interface OperationMetadata {
  iconUri: string;
  brandColor: string;
}

export const initializeOperationMetadata = async (
  deserializedWorkflow: DeserializedWorkflow,
  references: ConnectionReferences,
  dispatch: Dispatch
): Promise<void> => {
  initializeConnectorsForReferences(references);

  const promises: Promise<NodeDataWithOperationMetadata[] | undefined>[] = [];
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
      promises.push(initializeOperationDetailsForSwagger(operationId, operation, references, !!isTrigger, dispatch) as any);
    }
  }

  const allNodeData = aggregate((await Promise.all(promises)).filter((data) => !!data) as NodeDataWithOperationMetadata[][]);

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

const initializeConnectorsForReferences = async (references: ConnectionReferences): Promise<ConnectorWithSwagger[]> => {
  const connectorIds = uniqueArray(Object.keys(references || {}).map((key) => references[key].api.id));
  const connectorPromises: Promise<ConnectorWithSwagger | undefined>[] = [];

  for (const connectorId of connectorIds) {
    if (isArmResourceId(connectorId)) {
      connectorPromises.push(
        getConnectorWithSwagger(connectorId).catch(() =>
          // NOTE: Attempt to fetch all connectors even if some fail.
          Promise.resolve(undefined)
        )
      );
    }
  }

  return (await Promise.all(connectorPromises)).filter((result) => !!result) as ConnectorWithSwagger[];
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  isTrigger: boolean,
  dispatch: Dispatch
): Promise<NodeDataWithOperationMetadata[] | undefined> => {
  try {
    const operationInfo = await getOperationInfo(nodeId, operation);

    if (operationInfo) {
      const nodeOperationInfo = { ...operationInfo, type: operation.type, kind: operation.kind };
      const manifest = await getOperationManifest(operationInfo);
      const { iconUri, brandColor } = manifest.properties;

      dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));

      const settings = getOperationSettings(isTrigger, nodeOperationInfo, manifest, undefined /* swagger */, operation);
      const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(nodeId, manifest, operation);
      const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
        manifest,
        isTrigger,
        nodeInputs,
        settings.splitOn?.value?.enabled ? settings.splitOn.value.value : undefined
      );
      const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };

      const childGraphInputs = processChildGraphAndItsInputs(manifest, operation);

      return [{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings, manifest, iconUri, brandColor }, ...childGraphInputs];
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
): NodeDataWithOperationMetadata[] => {
  const { subGraphDetails } = manifest.properties;
  const nodesData: NodeDataWithOperationMetadata[] = [];

  if (subGraphDetails) {
    for (const subGraphKey of Object.keys(subGraphDetails)) {
      const { inputs, inputsLocation, isAdditive } = subGraphDetails[subGraphKey];
      const subOperation = getPropertyValue(operation, subGraphKey);
      if (inputs) {
        const subManifest = { properties: { inputs, inputsLocation } } as any;
        if (isAdditive) {
          for (const subNodeKey of Object.keys(subOperation)) {
            const { inputs: subNodeInputs, dependencies: subNodeInputDependencies } = getInputParametersFromManifest(
              subNodeKey,
              subManifest,
              subOperation[subNodeKey]
            );
            const subNodeOutputs = { outputs: {} };
            nodesData.push({
              id: subNodeKey,
              nodeInputs: subNodeInputs,
              nodeOutputs: subNodeOutputs,
              nodeDependencies: { inputs: subNodeInputDependencies, outputs: {} },
              manifest: subManifest,
              iconUri: '',
              brandColor: '',
            });
          }
        }

        const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
          subGraphKey,
          subManifest,
          subOperation
        );
        const nodeOutputs = { outputs: {} };
        nodesData.push({
          id: subGraphKey,
          nodeInputs,
          nodeOutputs,
          nodeDependencies: { inputs: inputDependencies, outputs: {} },
          manifest: subManifest,
          iconUri: '',
          brandColor: '',
        });
      }
    }
  }

  return nodesData;
};

const updateTokenMetadataInParameters = (nodes: NodeDataWithOperationMetadata[], operations: Operations, triggerNodeId: string) => {
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
  allNodesData: NodeDataWithOperationMetadata[],
  operations: Operations,
  graph: WorkflowNode,
  nodesMetadata: NodesMetadata
): Record<string, NodeTokens> => {
  const nodeMap = Object.keys(operations).reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {});
  const nodesWithData = allNodesData.reduce(
    (actionNodes: Record<string, NodeDataWithOperationMetadata>, nodeData: NodeDataWithOperationMetadata) => ({
      ...actionNodes,
      [nodeData.id]: nodeData,
    }),
    {}
  );

  const result: Record<string, NodeTokens> = {};

  for (const operationId of Object.keys(operations)) {
    const upstreamNodeIds = getTokenNodeIds(operationId, graph, nodesMetadata, nodesWithData, nodeMap);
    const nodeTokens: NodeTokens = { tokens: [], upstreamNodeIds };

    try {
      const nodeData = nodesWithData[operationId];
      const { manifest, nodeOutputs, iconUri, brandColor } = nodeData;

      nodeTokens.tokens.push(...getBuiltInTokens(manifest));
      nodeTokens.tokens.push(
        ...convertOutputsToTokens(
          isRootNodeInGraph(operationId, 'root', nodesMetadata) ? undefined : operationId,
          operations[operationId]?.type,
          nodeOutputs.outputs ?? {},
          { iconUri, brandColor },
          nodesWithData[operationId]?.settings
        )
      );
    } catch (e) {
      // No tokens will be added if there is an exception. This will allow continuining loading other operations.
    }

    result[operationId] = nodeTokens;
  }

  return result;
};

const initializeVariables = (
  operations: Operations,
  allNodesData: NodeDataWithOperationMetadata[]
): Record<string, VariableDeclaration[]> => {
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
    const isManifestBased = nodeOperationInfo
      ? OperationManifestService().isSupported(nodeOperationInfo.type, nodeOperationInfo.kind)
      : false;

    // TODO - The below if check should be removed once swagger based operations are correctly implemented
    if (isManifestBased) {
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
