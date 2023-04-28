/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import type { ConnectionReferences, WorkflowParameter } from '../../../common/models/workflow';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { ConnectorWithParsedSwagger } from '../../queries/connections';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationInfo, getOperationManifest } from '../../queries/operation';
import type { DependencyInfo, NodeData, NodeInputs, NodeOperation, NodeOutputs } from '../../state/operation/operationMetadataSlice';
import { initializeOperationInfo, initializeNodes } from '../../state/operation/operationMetadataSlice';
import { addResultSchema } from '../../state/staticresultschema/staticresultsSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokensSlice';
import type { NodesMetadata, Operations } from '../../state/workflow/workflowInterfaces';
import type { RootState } from '../../store';
import { getConnectionReference } from '../../utils/connectors/connections';
import { isRootNodeInGraph } from '../../utils/graph';
import {
  flattenAndUpdateViewModel,
  getAllInputParameters,
  updateDynamicDataInNode,
  updateTokenMetadata,
} from '../../utils/parameters/helper';
import { isTokenValueSegment } from '../../utils/parameters/segment';
import { initializeOperationDetailsForSwagger } from '../../utils/swagger/operation';
import { convertOutputsToTokens, getBuiltInTokens, getTokenNodeIds } from '../../utils/tokens';
import { getAllVariables, getVariableDeclarations, setVariableMetadata } from '../../utils/variables';
import {
  getCustomSwaggerIfNeeded,
  getInputParametersFromManifest,
  getOutputParametersFromManifest,
  updateCallbackUrlInInputs,
} from './initialize';
import { getOperationSettings } from './settings';
import {
  LogEntryLevel,
  LoggerService,
  OperationManifestService,
  StaticResultService,
} from '@microsoft/designer-client-services-logic-apps';
import type { InputParameter, OutputParameter } from '@microsoft/parsers-logic-apps';
import type { LogicAppsV2, OperationManifest } from '@microsoft/utils-logic-apps';
import { isArmResourceId, uniqueArray, getPropertyValue, map, aggregate, equals } from '@microsoft/utils-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';

export interface NodeDataWithOperationMetadata extends NodeData {
  manifest?: OperationManifest;
  operationInfo?: NodeOperation;
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
  workflowParameters: Record<string, WorkflowParameter>,
  dispatch: Dispatch,
  sku?: string
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
    if (operationManifestService.isSupported(operation.type, operation.kind)) {
      promises.push(initializeOperationDetailsForManifest(operationId, operation, !!isTrigger, dispatch, graph, references, sku));
    } else {
      promises.push(initializeOperationDetailsForSwagger(operationId, operation, references, !!isTrigger, dispatch, sku) as any);
    }
  }

  const allNodeData = aggregate((await Promise.all(promises)).filter((data) => !!data) as NodeDataWithOperationMetadata[][]);

  updateTokenMetadataInParameters(allNodeData, operations, workflowParameters, nodesMetadata, triggerNodeId);
  dispatch(
    initializeNodes(
      allNodeData.map((data) => {
        const { id, nodeInputs, nodeOutputs, nodeDependencies, settings, operationMetadata, staticResult } = data;
        const actionMetadata = nodesMetadata?.[id]?.actionMetadata;
        return { id, nodeInputs, nodeOutputs, nodeDependencies, settings, operationMetadata, actionMetadata, staticResult };
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

const initializeConnectorsForReferences = async (references: ConnectionReferences): Promise<ConnectorWithParsedSwagger[]> => {
  const connectorIds = uniqueArray(Object.keys(references || {}).map((key) => references[key].api.id));
  const connectorPromises: Promise<ConnectorWithParsedSwagger | undefined>[] = [];

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

  return (await Promise.all(connectorPromises)).filter((result) => !!result) as ConnectorWithParsedSwagger[];
};

export const initializeOperationDetailsForManifest = async (
  nodeId: string,
  _operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  isTrigger: boolean,
  dispatch: Dispatch,
  graph?: WorkflowNode,
  connectionReferences?: ConnectionReferences,
  sku?: string
): Promise<NodeDataWithOperationMetadata[] | undefined> => {
  const operation = { ..._operation };
  try {
    const staticResultService = StaticResultService();
    const operationInfo = await getOperationInfo(nodeId, operation, isTrigger);

    if (operationInfo) {
      const nodeOperationInfo = { ...operationInfo, type: operation.type, kind: operation.kind };
      const manifest = await getOperationManifest(operationInfo);
      const { iconUri, brandColor } = manifest.properties;

      dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));

      const { connectorId, operationId } = nodeOperationInfo;
      const schema = staticResultService.getOperationResultSchema(connectorId, operationId);
      schema.then((schema) => {
        if (schema) {
          dispatch(addResultSchema({ id: `${connectorId}-${operationId}`, schema: schema }));
        }
      });

      const customSwagger = await getCustomSwaggerIfNeeded(manifest.properties, operation);
      const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
        nodeId,
        manifest,
        customSwagger,
        operation,
        sku
      );

      if (isTrigger) {
        await updateCallbackUrlInInputs(nodeId, nodeOperationInfo, nodeInputs);
      }

      const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
        manifest,
        isTrigger,
        nodeInputs,
        isTrigger ? (operation as LogicAppsV2.TriggerDefinition).splitOn : undefined
      );
      const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
      let rootNodeId = '';
      if (graph?.children) {
        rootNodeId = graph?.children[0].id;
      }
      const settings = getOperationSettings(
        isTrigger,
        nodeOperationInfo,
        nodeOutputs,
        manifest,
        undefined /* swagger */,
        operation,
        rootNodeId,
        connectionReferences,
        dispatch
      );

      const childGraphInputs = processChildGraphAndItsInputs(manifest, operation, sku);

      return [
        {
          id: nodeId,
          nodeInputs,
          nodeOutputs,
          nodeDependencies,
          settings,
          operationInfo: nodeOperationInfo,
          manifest,
          operationMetadata: { iconUri, brandColor },
          staticResult: operation?.runtimeConfiguration?.staticResult,
        },
        ...childGraphInputs,
      ];
    }

    return;
  } catch (error) {
    const errorMessage = `Unable to initialize operation details for operation - ${nodeId}. Error details - ${error}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'operation deserializer',
      message: errorMessage,
      error: error instanceof Error ? error : undefined,
    });

    return;
  }
};

const processChildGraphAndItsInputs = (
  manifest: OperationManifest,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  sku?: string
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
              /* customSwagger */ undefined,
              subOperation[subNodeKey],
              sku
            );
            const subNodeOutputs = { outputs: {} };
            nodesData.push({
              id: subNodeKey,
              nodeInputs: subNodeInputs,
              nodeOutputs: subNodeOutputs,
              nodeDependencies: { inputs: subNodeInputDependencies, outputs: {} },
              operationInfo: { type: '', kind: '', connectorId: '', operationId: '' },
              manifest: subManifest,
              operationMetadata: { iconUri: manifest?.properties?.iconUri ?? '', brandColor: '' },
            });
          }
        }

        const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
          subGraphKey,
          subManifest,
          /* customSwagger */ undefined,
          subOperation,
          sku
        );
        const nodeOutputs = { outputs: {} };
        nodesData.push({
          id: subGraphKey,
          nodeInputs,
          nodeOutputs,
          nodeDependencies: { inputs: inputDependencies, outputs: {} },
          operationInfo: { type: '', kind: '', connectorId: '', operationId: '' },
          manifest: subManifest,
          operationMetadata: { iconUri: '', brandColor: '' },
        });
      }
    }
  }
  return nodesData;
};

const updateTokenMetadataInParameters = (
  nodes: NodeDataWithOperationMetadata[],
  operations: Operations,
  workflowParameters: Record<string, WorkflowParameter>,
  nodesMetadata: NodesMetadata,
  triggerNodeId: string
) => {
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
            return updateTokenMetadata(
              segment,
              actionNodes,
              triggerNodeId,
              nodesData,
              operations,
              workflowParameters,
              nodesMetadata,
              parameter.type
            );
          }

          return segment;
        });
      }

      const viewModel = parameter.editorViewModel;
      if (viewModel) {
        flattenAndUpdateViewModel(
          viewModel,
          actionNodes,
          triggerNodeId,
          nodesData,
          operations,
          workflowParameters,
          nodesMetadata,
          parameter.type
        );
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
  const operationInfos = allNodesData.reduce(
    (result: Record<string, NodeOperation>, nodeData: NodeDataWithOperationMetadata) => ({
      ...result,
      [nodeData.id]: nodeData.operationInfo as NodeOperation,
    }),
    {}
  );

  const result: Record<string, NodeTokens> = {};

  for (const operationId of Object.keys(operations)) {
    const upstreamNodeIds = getTokenNodeIds(operationId, graph, nodesMetadata, nodesWithData, operationInfos, nodeMap);
    const nodeTokens: NodeTokens = { tokens: [], upstreamNodeIds };

    try {
      const nodeData = nodesWithData[operationId];
      const {
        manifest,
        nodeOutputs,
        operationMetadata: { iconUri, brandColor },
      } = nodeData;

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

export const updateDynamicDataInNodes = async (getState: () => RootState, dispatch: Dispatch): Promise<void> => {
  const rootState = getState();
  const {
    workflow: { nodesMetadata, operations },
    operations: { inputParameters, settings, dependencies, operationInfo, actionMetadata },
    tokens: { variables },
    connections,
  } = rootState;
  const allVariables = getAllVariables(variables);
  for (const [nodeId, operation] of Object.entries(operations)) {
    const nodeDependencies = dependencies[nodeId];
    const nodeInputs = inputParameters[nodeId];
    const nodeMetadata = actionMetadata[nodeId];
    const nodeSettings = settings[nodeId];
    const isTrigger = isRootNodeInGraph(nodeId, 'root', nodesMetadata);
    const nodeOperationInfo = operationInfo[nodeId];
    const connectionReference = getConnectionReference(connections, nodeId);

    updateDynamicDataInNode(
      nodeId,
      isTrigger,
      nodeOperationInfo,
      connectionReference,
      nodeDependencies,
      nodeInputs,
      nodeMetadata,
      nodeSettings,
      allVariables,
      dispatch,
      rootState,
      operation
    );
  }
};
