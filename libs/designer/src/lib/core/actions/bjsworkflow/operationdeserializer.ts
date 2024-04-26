/* eslint-disable no-param-reassign */
import { isCustomCode } from '@microsoft/designer-ui';
import type { CustomCodeFileNameMapping } from '../../..';
import Constants from '../../../common/constants';
import type { ConnectionReference, ConnectionReferences, WorkflowParameter } from '../../../common/models/workflow';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { ConnectorWithParsedSwagger } from '../../queries/connections';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationInfo, getOperationManifest } from '../../queries/operation';
import type {
  DependencyInfo,
  NodeData,
  NodeDependencies,
  NodeInputs,
  NodeOperation,
  NodeOutputs,
} from '../../state/operation/operationMetadataSlice';
import {
  ErrorLevel,
  updateErrorDetails,
  initializeOperationInfo,
  initializeNodes,
  updateDynamicDataLoadStatus,
} from '../../state/operation/operationMetadataSlice';
import { addResultSchema } from '../../state/staticresultschema/staticresultsSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokens/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokens/tokensSlice';
import type { NodesMetadata, Operations, WorkflowKind } from '../../state/workflow/workflowInterfaces';
import type { RootState } from '../../store';
import { getConnectionReference, isConnectionReferenceValid } from '../../utils/connectors/connections';
import { isRootNodeInGraph } from '../../utils/graph';
import { getRepetitionContext } from '../../utils/loops';
import type { RepetitionContext } from '../../utils/parameters/helper';
import {
  flattenAndUpdateViewModel,
  getAllInputParameters,
  getParameterFromName,
  shouldIncludeSelfForRepetitionReference,
  updateDynamicDataInNode,
  updateScopePasteTokenMetadata,
  updateTokenMetadata,
} from '../../utils/parameters/helper';
import { isTokenValueSegment } from '../../utils/parameters/segment';
import { initializeOperationDetailsForSwagger } from '../../utils/swagger/operation';
import { convertOutputsToTokens, getBuiltInTokens, getTokenNodeIds } from '../../utils/tokens';
import { getAllVariables, getVariableDeclarations, setVariableMetadata } from '../../utils/variables';
import type { PasteScopeParams } from './copypaste';
import {
  getCustomSwaggerIfNeeded,
  getInputParametersFromManifest,
  getOutputParametersFromManifest,
  updateCallbackUrlInInputs,
  updateCustomCodeInInputs,
  updateInvokerSettings,
} from './initialize';
import { getOperationSettings, getSplitOnValue } from './settings';
import type { Settings } from './settings';
import {
  LogEntryLevel,
  LoggerService,
  OperationManifestService,
  StaticResultService,
  getIntl,
  ManifestParser,
  isArmResourceId,
  uniqueArray,
  getPropertyValue,
  map,
  aggregate,
  equals,
  getRecordEntry,
  parseErrorMessage,
} from '@microsoft/logic-apps-shared';
import type { InputParameter, OutputParameter, LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
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

export interface PasteScopeAdditionalParams extends PasteScopeParams {
  existingOutputTokens: Record<string, NodeTokens>;
  rootTriggerId: string;
}

export const initializeOperationMetadata = async (
  deserializedWorkflow: DeserializedWorkflow,
  references: ConnectionReferences,
  workflowParameters: Record<string, WorkflowParameter>,
  customCode: CustomCodeFileNameMapping,
  workflowKind: WorkflowKind,
  forceEnableSplitOn: boolean,
  dispatch: Dispatch,
  pasteParams?: PasteScopeAdditionalParams
): Promise<void> => {
  initializeConnectorsForReferences(references);

  const promises: Promise<NodeDataWithOperationMetadata[] | undefined>[] = [];
  const { actionData: operations, graph, nodesMetadata } = deserializedWorkflow;
  const operationManifestService = OperationManifestService();

  let triggerNodeId = '';

  for (const [operationId, operation] of Object.entries(operations)) {
    if (operationId === Constants.NODE.TYPE.PLACEHOLDER_TRIGGER) {
      continue;
    }
    const isTrigger = isRootNodeInGraph(operationId, 'root', nodesMetadata);

    if (isTrigger) {
      triggerNodeId = operationId;
    }
    if (operationManifestService.isSupported(operation.type, operation.kind)) {
      promises.push(
        initializeOperationDetailsForManifest(operationId, operation, customCode, !!isTrigger, workflowKind, forceEnableSplitOn, dispatch)
      );
    } else {
      promises.push(
        initializeOperationDetailsForSwagger(operationId, operation, references, !!isTrigger, workflowKind, forceEnableSplitOn, dispatch)
      );
    }
  }

  const allNodeData = aggregate((await Promise.all(promises)).filter((data) => !!data) as NodeDataWithOperationMetadata[][]);
  const repetitionInfos = await initializeRepetitionInfos(triggerNodeId, operations, allNodeData, nodesMetadata);
  updateTokenMetadataInParameters(allNodeData, operations, workflowParameters, nodesMetadata, triggerNodeId, repetitionInfos, pasteParams);

  const triggerNodeManifest = allNodeData.find((nodeData) => nodeData.id === triggerNodeId)?.manifest;
  if (triggerNodeManifest) {
    for (const nodeData of allNodeData) {
      const { id, settings } = nodeData;
      if (settings) {
        updateInvokerSettings(
          id === triggerNodeId,
          triggerNodeManifest,
          settings,
          (invokerSettings: Settings) => (nodeData.settings = { ...settings, ...invokerSettings }),
          references
        );
      }
    }
  }

  dispatch(
    initializeNodes(
      allNodeData.map((data) => {
        const { id, nodeInputs, nodeOutputs, nodeDependencies, settings, operationMetadata, staticResult } = data;
        return {
          id,
          nodeInputs,
          nodeOutputs,
          nodeDependencies,
          settings,
          operationMetadata,
          staticResult,
          actionMetadata: getRecordEntry(nodesMetadata, id)?.actionMetadata,
          repetitionInfo: getRecordEntry(repetitionInfos, id),
        };
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

  LoggerService().log({
    level: LogEntryLevel.Verbose,
    area: 'initializeOperationMetadata',
    message: 'Workflow Operation Metadata initialized',
  });
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
  customCode: CustomCodeFileNameMapping,
  isTrigger: boolean,
  workflowKind: WorkflowKind,
  forceEnableSplitOn: boolean,
  dispatch: Dispatch
): Promise<NodeDataWithOperationMetadata[] | undefined> => {
  const operation = { ..._operation };
  try {
    const staticResultService = StaticResultService();
    const operationInfo = await getOperationInfo(nodeId, operation, isTrigger);

    if (!operationInfo) {
      return;
    }
    const nodeOperationInfo = { ...operationInfo, type: operation.type, kind: operation.kind };
    const manifest = await getOperationManifest(operationInfo);
    const { iconUri, brandColor } = manifest.properties;

    dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));

    const { connectorId, operationId } = nodeOperationInfo;
    const parsedManifest = new ManifestParser(manifest);
    const schema = staticResultService.getOperationResultSchema(connectorId, operationId, parsedManifest);
    schema.then((schema) => {
      if (schema) {
        dispatch(addResultSchema({ id: `${connectorId}-${operationId}`, schema }));
      }
    });

    const customSwagger = await getCustomSwaggerIfNeeded(manifest.properties, operation);
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
      nodeId,
      manifest,
      /* presetParameterValues */ undefined,
      customSwagger,
      operation
    );

    if (isTrigger) {
      await updateCallbackUrlInInputs(nodeId, nodeOperationInfo, nodeInputs);
    }

    const customCodeParameter = getParameterFromName(nodeInputs, Constants.DEFAULT_CUSTOM_CODE_INPUT);
    // Populate Customcode with values gotten from file system
    if (customCodeParameter && isCustomCode(customCodeParameter?.editor, customCodeParameter?.editorOptions?.language)) {
      updateCustomCodeInInputs(customCodeParameter, customCode);
    }

    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
      manifest,
      isTrigger,
      nodeInputs,
      isTrigger ? getSplitOnValue(manifest, undefined, undefined, operation) : undefined,
      operationInfo,
      nodeId
    );
    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };

    const settings = getOperationSettings(
      isTrigger,
      nodeOperationInfo,
      nodeOutputs,
      manifest,
      undefined /* swagger */,
      operation,
      workflowKind,
      forceEnableSplitOn
    );

    const childGraphInputs = processChildGraphAndItsInputs(manifest, operation);

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
  } catch (error: any) {
    const errorMessage = parseErrorMessage(error);
    const message = `Unable to initialize operation details for operation - ${nodeId}. Error details - ${errorMessage}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'operation deserializer',
      message,
      error,
    });

    dispatch(updateErrorDetails({ id: nodeId, errorInfo: { level: ErrorLevel.Critical, error, message } }));
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
      const subOperation = getPropertyValue(operation, subGraphKey) ?? {};
      if (inputs) {
        const subManifest = { properties: { inputs, inputsLocation } } as any;
        if (isAdditive) {
          for (const subNodeKey of Object.keys(subOperation)) {
            const { inputs: subNodeInputs, dependencies: subNodeInputDependencies } = getInputParametersFromManifest(
              subNodeKey,
              subManifest,
              /* presetParameterValues */ undefined,
              /* customSwagger */ undefined,
              subOperation[subNodeKey]
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
  triggerNodeId: string,
  repetitionInfos: Record<string, RepetitionContext>,
  pasteParams?: PasteScopeAdditionalParams
) => {
  const nodesData = map(nodes, 'id');
  const actionNodesArray = nodes.map((node) => node.id).filter((nodeId) => nodeId !== triggerNodeId);
  const actionNodes: Record<string, string> = {};
  for (const id of actionNodesArray) {
    actionNodes[id] = id;
  }

  for (const nodeData of nodes) {
    const { id, nodeInputs } = nodeData;
    const allParameters = getAllInputParameters(nodeInputs);
    const repetitionInfo = getRecordEntry(repetitionInfos, id) ?? { repetitionReferences: [] };
    for (const parameter of allParameters) {
      const segments = parameter.value;
      let error = '';
      if (segments && segments.length) {
        parameter.value = segments.map((segment) => {
          let updatedSegment = segment;

          if (isTokenValueSegment(segment)) {
            if (pasteParams) {
              const result = updateScopePasteTokenMetadata(segment, pasteParams);
              updatedSegment = result.updatedSegment;
              error = result.error;
            }
            return updateTokenMetadata(
              updatedSegment,
              repetitionInfo,
              actionNodes,
              pasteParams ? pasteParams.rootTriggerId : triggerNodeId,
              nodesData,
              operations,
              workflowParameters,
              nodesMetadata,
              parameter.type
            );
          }
          return updatedSegment;
        });
      }
      if (error) {
        parameter.validationErrors = [error];
      }
      const viewModel = parameter.editorViewModel;
      if (viewModel) {
        flattenAndUpdateViewModel(
          repetitionInfo,
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
  nodesMetadata: NodesMetadata,
  existingOutputTokens: string[] = []
): Record<string, NodeTokens> => {
  const nodeMap: Record<string, string> = {};
  for (const id of Object.keys(operations)) {
    nodeMap[id] = id;
  }
  const nodesWithData: Record<string, NodeDataWithOperationMetadata> = {};
  for (const nodeData of allNodesData) {
    nodesWithData[nodeData.id] = nodeData;
  }
  const operationInfos: Record<string, NodeOperation> = {};
  for (const nodeData of allNodesData) {
    operationInfos[nodeData.id] = nodeData.operationInfo as NodeOperation;
  }

  const result: Record<string, NodeTokens> = {};

  for (const operationId of Object.keys(operations)) {
    const upstreamNodeIds = getTokenNodeIds(operationId, graph, nodesMetadata, nodesWithData, operationInfos, nodeMap);
    const nodeTokens: NodeTokens = { tokens: [], upstreamNodeIds: [...upstreamNodeIds, ...existingOutputTokens] };

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
    if (equals(getRecordEntry(operations, id)?.type, Constants.NODE.TYPE.INITIALIZE_VARIABLE)) {
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

const initializeRepetitionInfos = async (
  triggerNodeId: string,
  allOperations: Operations,
  nodesData: NodeDataWithOperationMetadata[],
  nodesMetadata: NodesMetadata
): Promise<Record<string, RepetitionContext>> => {
  const promises: Promise<{ id: string; repetition: RepetitionContext }>[] = [];
  const operationInfos: Record<string, any> = {};
  const inputs: Record<string, any> = {};
  const settings: Record<string, any> = {};
  for (const nodeData of nodesData) {
    const { id, nodeInputs, operationInfo, settings: _settings } = nodeData;
    operationInfos[id] = operationInfo as NodeOperation;
    inputs[id] = nodeInputs;
    settings[id] = _settings;
  }

  const splitOn = settings[triggerNodeId]
    ? settings[triggerNodeId].splitOn?.value?.enabled
      ? (settings[triggerNodeId].splitOn?.value?.value as string)
      : undefined
    : (allOperations[triggerNodeId] as LogicAppsV2.Trigger)?.splitOn;

  const getNodeRepetition = async (nodeId: string, includeSelf: boolean): Promise<{ id: string; repetition: RepetitionContext }> => {
    const repetition = await getRepetitionContext(nodeId, operationInfos, inputs, nodesMetadata, includeSelf, splitOn);
    return { id: nodeId, repetition };
  };

  for (const nodeData of nodesData) {
    const { id, manifest } = nodeData;
    const includeSelf = manifest ? shouldIncludeSelfForRepetitionReference(manifest) : false;
    promises.push(getNodeRepetition(id, includeSelf));
  }

  const allRepetitions = (await Promise.all(promises)).filter((data) => !!data);
  const mappedRepitions: Record<string, RepetitionContext> = {};
  for (const { id, repetition } of allRepetitions) {
    mappedRepitions[id] = repetition;
  }
  return mappedRepitions;
};

export const initializeDynamicDataInNodes = async (
  getState: () => RootState,
  dispatch: Dispatch,
  operationsToInitialize?: string[]
): Promise<void> => {
  const rootState = getState();
  const {
    workflow: { nodesMetadata, operations },
    operations: { inputParameters, settings, dependencies, operationInfo, errors },
    tokens: { variables },
    connections,
  } = rootState;
  const allVariables = getAllVariables(variables);
  for (const [nodeId, operation] of Object.entries(operations)) {
    if (operationsToInitialize && !operationsToInitialize.includes(nodeId)) {
      continue;
    }
    if (nodeId === Constants.NODE.TYPE.PLACEHOLDER_TRIGGER) {
      continue;
    }
    if (getRecordEntry(errors, nodeId)?.[ErrorLevel.Critical]) {
      continue;
    }

    const nodeOperationInfo = getRecordEntry(operationInfo, nodeId);
    const nodeDependencies = getRecordEntry(dependencies, nodeId);
    const nodeInputs = getRecordEntry(inputParameters, nodeId);
    const nodeSettings = getRecordEntry(settings, nodeId);
    if (!nodeOperationInfo || !nodeDependencies || !nodeInputs || !nodeSettings) {
      continue;
    }

    const isTrigger = isRootNodeInGraph(nodeId, 'root', nodesMetadata);
    const connectionReference = getConnectionReference(connections, nodeId);

    updateDynamicDataForValidConnection(
      nodeId,
      isTrigger,
      nodeOperationInfo,
      connectionReference,
      nodeDependencies,
      nodeInputs,
      nodeSettings,
      allVariables,
      dispatch,
      getState,
      operation
    );
  }

  dispatch(updateDynamicDataLoadStatus(true));
};

const updateDynamicDataForValidConnection = async (
  nodeId: string,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  reference: ConnectionReference | undefined,
  dependencies: NodeDependencies,
  nodeInputs: NodeInputs,
  settings: Settings,
  variables: any,
  dispatch: Dispatch,
  getState: () => RootState,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition
): Promise<void> => {
  const isValidConnection = await isConnectionReferenceValid(operationInfo, reference);

  if (isValidConnection) {
    updateDynamicDataInNode(
      nodeId,
      isTrigger,
      operationInfo,
      reference,
      dependencies,
      nodeInputs,
      settings,
      variables,
      dispatch,
      getState,
      operation
    );
  } else {
    LoggerService().log({
      level: LogEntryLevel.Warning,
      area: 'OperationDeserializer:UpdateDynamicData',
      message: 'Invalid connection message shown on the card.',
    });

    const intl = getIntl();
    dispatch(
      updateErrorDetails({
        id: nodeId,
        errorInfo: {
          level: ErrorLevel.Connection,
          message: intl.formatMessage({
            defaultMessage: 'Invalid connection, please update your connection to load complete details',
            id: 'tMdcE1',
            description: 'Error message to show on connection error during deserialization',
          }),
        },
      })
    );
  }
};
