import Constants from '../../../common/constants';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectionsForConnector, getConnectorWithSwagger } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { initEmptyConnectionMap } from '../../state/connection/connectionSlice';
import type { NodeData, NodeOperation, OperationMetadataState } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { changePanelNode, isolateTab, showDefaultTabs } from '../../state/panel/panelSlice';
import { addResultSchema } from '../../state/staticresultschema/staticresultsSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokens/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokens/tokensSlice';
import type { WorkflowState } from '../../state/workflow/workflowInterfaces';
import { addNode, setFocusNode } from '../../state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../../store';
import { getBrandColorFromConnector, getBrandColorFromManifest, getIconUriFromConnector, getIconUriFromManifest } from '../../utils/card';
import { getTriggerNodeId, isRootNodeInGraph } from '../../utils/graph';
import { updateDynamicDataInNode } from '../../utils/parameters/helper';
import { getInputParametersFromSwagger, getOutputParametersFromSwagger } from '../../utils/swagger/operation';
import { getTokenNodeIds, getBuiltInTokens, convertOutputsToTokens } from '../../utils/tokens';
import { setVariableMetadata, getVariableDeclarations, getAllVariables } from '../../utils/variables';
import { isConnectionRequiredForOperation, updateNodeConnection } from './connections';
import {
  getInputParametersFromManifest,
  getOutputParametersFromManifest,
  updateAllUpstreamNodes,
  updateInvokerSettings,
} from './initialize';
import type { NodeDataWithOperationMetadata } from './operationdeserializer';
import type { Settings } from './settings';
import { getOperationSettings } from './settings';
import { ConnectionService, OperationManifestService, StaticResultService } from '@microsoft/designer-client-services-logic-apps';
import type { SwaggerParser } from '@microsoft/parsers-logic-apps';
import { ManifestParser } from '@microsoft/parsers-logic-apps';
import type {
  Connector,
  DiscoveryOperation,
  DiscoveryResultTypes,
  OperationManifest,
  SomeKindOfAzureOperationDiscovery,
} from '@microsoft/utils-logic-apps';
import { equals } from '@microsoft/utils-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

type AddOperationPayload = {
  operation: DiscoveryOperation<DiscoveryResultTypes> | undefined;
  relationshipIds: RelationshipIds;
  nodeId: string;
  isParallelBranch?: boolean;
  isTrigger?: boolean;
  presetParameterValues?: Record<string, any>;
  actionMetadata?: Record<string, any>;
};

export const addOperation = createAsyncThunk('addOperation', async (payload: AddOperationPayload, { dispatch, getState }) => {
  batch(() => {
    const { operation, nodeId: actionId, presetParameterValues, actionMetadata } = payload;
    if (!operation) throw new Error('Operation does not exist'); // Just an optional catch, should never happen
    let count = 1;
    let nodeId = actionId;
    while ((getState() as RootState).workflow.nodesMetadata[nodeId]) {
      nodeId = `${actionId}_${count}`;
      count++;
    }

    const newPayload = { ...payload, nodeId };

    dispatch(addNode(newPayload as any));

    const nodeOperationInfo = {
      connectorId: operation.properties.api.id, // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
      operationId: operation.name,
      type: getOperationType(operation),
      kind: operation.properties.operationKind,
    };

    dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));
    initializeOperationDetails(nodeId, nodeOperationInfo, getState as () => RootState, dispatch, presetParameterValues, actionMetadata);

    // Update settings for children and parents

    dispatch(setFocusNode(nodeId));
  });
});

const initializeOperationDetails = async (
  nodeId: string,
  operationInfo: NodeOperation,
  getState: () => RootState,
  dispatch: Dispatch,
  presetParameterValues?: Record<string, any>,
  actionMetadata?: Record<string, any>
): Promise<void> => {
  const state = getState();
  const isTrigger = isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata);
  const { type, kind, connectorId, operationId } = operationInfo;
  let isConnectionRequired = true;
  let connector: Connector | undefined;
  const operationManifestService = OperationManifestService();
  const staticResultService = StaticResultService();

  dispatch(changePanelNode(nodeId));
  dispatch(isolateTab(Constants.PANEL_TAB_NAMES.LOADING));

  let initData: NodeData;
  let manifest: OperationManifest | undefined = undefined;
  let swagger: SwaggerParser | undefined = undefined;
  let parsedManifest: ManifestParser | undefined = undefined;
  if (operationManifestService.isSupported(type, kind)) {
    manifest = await getOperationManifest(operationInfo);
    isConnectionRequired = isConnectionRequiredForOperation(manifest);
    connector = manifest.properties?.connector;

    const iconUri = getIconUriFromManifest(manifest);
    const brandColor = getBrandColorFromManifest(manifest);
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(nodeId, manifest, presetParameterValues);
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
      manifest,
      isTrigger,
      nodeInputs,
      /* splitOnValue */ undefined,
      operationInfo,
      nodeId
    );
    let updatedOutputs = nodeOutputs;
    parsedManifest = new ManifestParser(manifest);

    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
    const settings = getOperationSettings(
      isTrigger,
      operationInfo,
      nodeOutputs,
      manifest,
      /* swagger */ undefined,
      /* operation */ undefined,
      state.workflow.workflowKind
    );

    // We should update the outputs when splitOn is enabled.
    if (isTrigger && settings.splitOn?.value?.value) {
      updatedOutputs = getOutputParametersFromManifest(
        manifest,
        isTrigger,
        nodeInputs,
        settings.splitOn?.value?.value,
        operationInfo,
        nodeId
      ).outputs;
    }

    initData = {
      id: nodeId,
      nodeInputs,
      nodeOutputs: updatedOutputs,
      nodeDependencies,
      settings,
      operationMetadata: { iconUri, brandColor },
      actionMetadata,
    };
    dispatch(initializeNodes([initData]));
    addTokensAndVariables(nodeId, type, { ...initData, manifest }, state, dispatch);
  } else {
    const { connector: swaggerConnector, parsedSwagger } = await getConnectorWithSwagger(connectorId);
    swagger = parsedSwagger;
    connector = swaggerConnector;
    const iconUri = getIconUriFromConnector(connector);
    const brandColor = getBrandColorFromConnector(connector);

    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromSwagger(
      nodeId,
      isTrigger,
      parsedSwagger,
      operationInfo
    );
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromSwagger(
      isTrigger,
      parsedSwagger,
      operationInfo,
      nodeInputs
    );
    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
    const settings = getOperationSettings(
      isTrigger,
      operationInfo,
      nodeOutputs,
      /* manifest */ undefined,
      parsedSwagger,
      /* operation */ undefined,
      state.workflow.workflowKind
    );

    initData = {
      id: nodeId,
      nodeInputs,
      actionMetadata,
      nodeOutputs,
      nodeDependencies,
      settings,
      operationMetadata: { iconUri, brandColor },
    };
    dispatch(initializeNodes([initData]));
    addTokensAndVariables(
      nodeId,
      type,
      { id: nodeId, nodeInputs, nodeOutputs, settings, operationMetadata: { iconUri, brandColor }, nodeDependencies },
      state,
      dispatch
    );
  }

  if (!isConnectionRequired) {
    updateDynamicDataInNode(
      nodeId,
      isTrigger,
      operationInfo,
      undefined,
      initData.nodeDependencies,
      initData.nodeInputs,
      initData.settings as Settings,
      getAllVariables(getState().tokens.variables),
      dispatch,
      getState
    );
  } else if (connector) {
    await trySetDefaultConnectionForNode(nodeId, connector, dispatch, isConnectionRequired);
  }

  const schemaService = staticResultService.getOperationResultSchema(connectorId, operationId, swagger || parsedManifest);
  let hasSchema;
  schemaService.then((schema) => {
    if (schema) {
      hasSchema = true;
      dispatch(addResultSchema({ id: `${connectorId}-${operationId}`, schema: schema }));
    }
  });

  const triggerNodeManifest = await getTriggerNodeManifest(state.workflow, state.operations);

  if (triggerNodeManifest) {
    updateInvokerSettings(isTrigger, triggerNodeManifest, nodeId, initData.settings as Settings, dispatch);
  }

  updateAllUpstreamNodes(getState() as RootState, dispatch);
  dispatch(showDefaultTabs({ isScopeNode: operationInfo?.type.toLowerCase() === Constants.NODE.TYPE.SCOPE, hasSchema: hasSchema }));
};

export const initializeSwitchCaseFromManifest = async (id: string, manifest: OperationManifest, dispatch: Dispatch): Promise<void> => {
  const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(id, manifest);
  const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
    manifest,
    false,
    nodeInputs,
    /* splitOnValue */ undefined,
    /* operationInfo */ undefined,
    id
  );
  const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
  const initData = {
    id,
    nodeInputs,
    nodeOutputs,
    nodeDependencies,
    operationMetadata: { iconUri: manifest.properties.iconUri ?? '', brandColor: '' },
  };
  dispatch(initializeNodes([initData]));
};

export const trySetDefaultConnectionForNode = async (
  nodeId: string,
  connector: Connector,
  dispatch: AppDispatch,
  isConnectionRequired: boolean
) => {
  const connectorId = connector.id;
  const connections = (await getConnectionsForConnector(connectorId)).filter((c) => c.properties.overallStatus !== 'Error');
  if (connections.length > 0) {
    await ConnectionService().setupConnectionIfNeeded(connections[0]);
    dispatch(updateNodeConnection({ nodeId, connection: connections[0], connector }));
  } else if (isConnectionRequired) {
    dispatch(initEmptyConnectionMap(nodeId));
    dispatch(isolateTab(Constants.PANEL_TAB_NAMES.CONNECTION_CREATE));
  }
};

export const addTokensAndVariables = (
  nodeId: string,
  operationType: string,
  nodeData: NodeDataWithOperationMetadata,
  state: RootState,
  dispatch: Dispatch
): void => {
  const { graph, nodesMetadata, operations } = state.workflow;
  const {
    nodeInputs,
    nodeOutputs,
    settings,
    operationMetadata: { iconUri, brandColor },
    manifest,
  } = nodeData;
  const nodeMap = Object.keys(operations).reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {
    [nodeId]: nodeId,
  });
  const upstreamNodeIds = getTokenNodeIds(
    nodeId,
    graph as WorkflowNode,
    nodesMetadata,
    { [nodeId]: nodeData },
    state.operations.operationInfo,
    nodeMap
  );
  const tokensAndVariables = {
    outputTokens: {
      [nodeId]: { tokens: [], upstreamNodeIds } as NodeTokens,
    },
    variables: {} as Record<string, VariableDeclaration[]>,
  };

  tokensAndVariables.outputTokens[nodeId].tokens.push(...getBuiltInTokens(manifest));
  tokensAndVariables.outputTokens[nodeId].tokens.push(
    ...convertOutputsToTokens(
      isRootNodeInGraph(nodeId, 'root', nodesMetadata) ? undefined : nodeId,
      operationType,
      nodeOutputs.outputs ?? {},
      { iconUri, brandColor },
      settings
    )
  );

  if (equals(operationType, Constants.NODE.TYPE.INITIALIZE_VARIABLE)) {
    setVariableMetadata(iconUri, brandColor);

    const variables = getVariableDeclarations(nodeInputs);
    if (variables.length) {
      tokensAndVariables.variables[nodeId] = variables;
    }
  }
  dispatch(initializeTokensAndVariables(tokensAndVariables));
};

const getOperationType = (operation: DiscoveryOperation<DiscoveryResultTypes>): string => {
  const operationType = operation.properties.operationType;
  return !operationType
    ? (operation.properties as SomeKindOfAzureOperationDiscovery).isWebhook
      ? Constants.NODE.TYPE.API_CONNECTION_WEBHOOK
      : (operation.properties as SomeKindOfAzureOperationDiscovery).isNotification
      ? Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION
      : Constants.NODE.TYPE.API_CONNECTION
    : operationType;
};

export const getTriggerNodeManifest = async (
  workflowState: WorkflowState,
  operations: OperationMetadataState
): Promise<OperationManifest | undefined> => {
  const triggerNodeId = getTriggerNodeId(workflowState);
  const operationInfo = operations.operationInfo[triggerNodeId];
  if (operationInfo && OperationManifestService().isSupported(operationInfo.type, operationInfo.kind)) {
    const { connectorId, operationId } = operationInfo;
    return getOperationManifest({ connectorId, operationId });
  }
  return undefined;
};
