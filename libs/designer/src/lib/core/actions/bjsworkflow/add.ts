import { isCustomCode } from '@microsoft/designer-ui';
import Constants from '../../../common/constants';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectionsForConnector, getConnectorWithSwagger } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { initEmptyConnectionMap } from '../../state/connection/connectionSlice';
import type { NodeData, NodeOperation, OperationMetadataState } from '../../state/operation/operationMetadataSlice';
import {
  ErrorLevel,
  initializeNodes,
  initializeOperationInfo,
  updateErrorDetails,
  updateNodeSettings,
} from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { changePanelNode, openPanel, setIsPanelLoading } from '../../state/panel/panelSlice';
import { addResultSchema } from '../../state/staticresultschema/staticresultsSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokens/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokens/tokensSlice';
import type { NodesMetadata, WorkflowState } from '../../state/workflow/workflowInterfaces';
import { addNode, setFocusNode } from '../../state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../../store';
import { getBrandColorFromManifest, getIconUriFromManifest } from '../../utils/card';
import { getTriggerNodeId, isRootNodeInGraph } from '../../utils/graph';
import { getParameterFromName, updateDynamicDataInNode } from '../../utils/parameters/helper';
import { getInputParametersFromSwagger, getOutputParametersFromSwagger } from '../../utils/swagger/operation';
import { convertOutputsToTokens, getBuiltInTokens, getTokenNodeIds } from '../../utils/tokens';
import { getVariableDeclarations, setVariableMetadata } from '../../utils/variables';
import { isConnectionRequiredForOperation, updateNodeConnection } from './connections';
import {
  getInputParametersFromManifest,
  getOutputParametersFromManifest,
  initializeCustomCodeDataInInputs,
  updateAllUpstreamNodes,
  updateInvokerSettings,
} from './initialize';
import type { NodeDataWithOperationMetadata } from './operationdeserializer';
import type { Settings } from './settings';
import { getOperationSettings, getSplitOnValue } from './settings';
import {
  ConnectionService,
  OperationManifestService,
  StaticResultService,
  ManifestParser,
  equals,
  getBrandColorFromConnector,
  getIconUriFromConnector,
  getRecordEntry,
  isNumber,
} from '@microsoft/logic-apps-shared';
import type {
  Connector,
  DiscoveryOperation,
  DiscoveryResultTypes,
  OperationManifest,
  SomeKindOfAzureOperationDiscovery,
  SwaggerParser,
} from '@microsoft/logic-apps-shared';
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
    if (!operation) {
      throw new Error('Operation does not exist'); // Just an optional catch, should never happen
    }

    const workflowState = (getState() as RootState).workflow;
    const nodeId = getNonDuplicateNodeId(workflowState.nodesMetadata, actionId, workflowState.idReplacements);
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

export const initializeOperationDetails = async (
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

  dispatch(setIsPanelLoading(true));
  dispatch(changePanelNode(nodeId));

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
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
      nodeId,
      operationInfo,
      manifest,
      presetParameterValues
    );
    const customCodeParameter = getParameterFromName(nodeInputs, Constants.DEFAULT_CUSTOM_CODE_INPUT);
    if (customCodeParameter && isCustomCode(customCodeParameter?.editor, customCodeParameter?.editorOptions?.language)) {
      initializeCustomCodeDataInInputs(customCodeParameter, nodeId, dispatch);
    }
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
      manifest,
      isTrigger,
      nodeInputs,
      operationInfo,
      isTrigger ? getSplitOnValue(manifest, undefined, undefined, undefined) : undefined,
      nodeId
    );
    parsedManifest = new ManifestParser(manifest, operationManifestService.isAliasingSupported(type, kind));

    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
    const settings = getOperationSettings(
      isTrigger,
      operationInfo,
      nodeOutputs,
      manifest,
      /* swagger */ undefined,
      /* operation */ undefined,
      state.workflow.workflowKind,
      state.designerOptions.hostOptions.forceEnableSplitOn
    );

    // We should update the outputs when splitOn is enabled.
    let updatedOutputs = nodeOutputs;
    if (isTrigger && settings.splitOn?.value?.value) {
      updatedOutputs = getOutputParametersFromManifest(
        manifest,
        isTrigger,
        nodeInputs,
        operationInfo,
        settings.splitOn?.value?.value,
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
      state.workflow.workflowKind,
      state.designerOptions.hostOptions.forceEnableSplitOn
    );

    // We should update the outputs when splitOn is enabled.
    let updatedOutputs = nodeOutputs;
    if (isTrigger && settings.splitOn?.value?.value) {
      updatedOutputs = getOutputParametersFromSwagger(
        isTrigger,
        swagger,
        operationInfo,
        nodeInputs,
        settings.splitOn?.value?.value
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
    addTokensAndVariables(nodeId, type, initData, state, dispatch);
  }

  if (isConnectionRequired) {
    try {
      await trySetDefaultConnectionForNode(nodeId, connector as Connector, dispatch, isConnectionRequired);
    } catch (e: any) {
      dispatch(
        updateErrorDetails({
          id: nodeId,
          errorInfo: {
            level: ErrorLevel.Connection,
            message: e?.message,
          },
        })
      );
    }
  } else {
    updateDynamicDataInNode(nodeId, isTrigger, operationInfo, undefined, initData.nodeDependencies, dispatch, getState);
  }

  dispatch(setIsPanelLoading(false));

  staticResultService.getOperationResultSchema(connectorId, operationId, swagger || parsedManifest).then((schema) => {
    if (schema) {
      dispatch(addResultSchema({ id: `${connectorId}-${operationId}`, schema: schema }));
    }
  });

  const triggerNodeManifest = await getTriggerNodeManifest(state.workflow, state.operations);

  if (triggerNodeManifest) {
    updateInvokerSettings(isTrigger, triggerNodeManifest, initData.settings as Settings, (invokerSettings: Settings) =>
      dispatch(updateNodeSettings({ id: nodeId, settings: invokerSettings }))
    );
  }

  updateAllUpstreamNodes(getState() as RootState, dispatch);
};

export const initializeSwitchCaseFromManifest = async (id: string, manifest: OperationManifest, dispatch: Dispatch): Promise<void> => {
  const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
    id,
    { type: '', kind: '', connectorId: '', operationId: '' },
    manifest
  );
  const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
    manifest,
    false,
    nodeInputs,
    { type: '', kind: '', connectorId: '', operationId: '' },
    /* splitOnValue */ undefined,
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
    dispatch(openPanel({ nodeId, panelMode: 'Connection', referencePanelMode: 'Operation' }));
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
  const nodeMap: Record<string, string> = { nodeId };
  for (const key of Object.keys(operations)) {
    nodeMap[key] = key;
  }

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

  const outputTokens = getRecordEntry(tokensAndVariables.outputTokens, nodeId)?.tokens ?? [];
  outputTokens.push(...getBuiltInTokens(manifest));
  outputTokens.push(
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
  return operationType
    ? operationType
    : (operation.properties as SomeKindOfAzureOperationDiscovery).isWebhook
      ? Constants.NODE.TYPE.API_CONNECTION_WEBHOOK
      : (operation.properties as SomeKindOfAzureOperationDiscovery).isNotification
        ? Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION
        : Constants.NODE.TYPE.API_CONNECTION;
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

export const getNonDuplicateNodeId = (nodesMetadata: NodesMetadata, actionId: string, idReplacements: Record<string, string> = {}) => {
  let count = 1;
  let nodeId = actionId;

  // Note: This is a temporary fix for the issue where the node id is not unique
  // Because the workflow state isn't always up to date with action name changes unless flow is reloaded after saving
  // To account for this we use the idReplacements to check for duplicates/changes in the same session
  // This check should be once the workflow state is properly updated for all action name changes
  while (getRecordEntry(nodesMetadata, nodeId) || Object.values(idReplacements).includes(nodeId)) {
    nodeId = `${actionId}_${count}`;
    count++;
  }
  return nodeId;
};

export const getNonDuplicateId = (existingActionNames: Record<string, string>, actionId: string): string => {
  let newActionId = actionId.replaceAll(' ', '_');
  const splitActionId = newActionId.split('_');
  let nodeId = newActionId;
  let count = 1;
  if (isNumber(splitActionId[splitActionId.length - 1])) {
    splitActionId.pop();
    newActionId = splitActionId.join('_');
  }

  while (getRecordEntry(existingActionNames, nodeId)) {
    nodeId = `${newActionId}_${count}`;
    count++;
  }
  return nodeId;
};
