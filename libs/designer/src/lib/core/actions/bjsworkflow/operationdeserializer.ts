/* eslint-disable no-param-reassign */
import { isCustomCodeParameter } from '@microsoft/designer-ui';
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
import { getConnectionReference, isConnectionReferenceValid, mockConnectionReference } from '../../utils/connectors/connections';
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
import { getVariableDeclarations, setVariableMetadata } from '../../utils/variables';
import { initializeAgentParameters } from '../../utils/agentParameters';
import type { PasteScopeParams } from './copypaste';
import {
  getCustomSwaggerIfNeeded,
  getInputParametersFromManifest,
  getOutputParametersFromManifest,
  getSupportedChannelsFromManifest,
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
  cleanResourceId,
  deepCompareObjects,
} from '@microsoft/logic-apps-shared';
import type { InputParameter, OutputParameter, LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
import { operationSupportsSplitOn } from '../../utils/outputs';
import { initializeConnectorOperationDetails } from './agent';

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
    if (operation.type === Constants.NODE.TYPE.CONNECTOR) {
      promises.push(initializeConnectorOperationDetails(operationId, operation as LogicAppsV2.ConnectorAction, workflowKind, dispatch));
    } else if (operationManifestService.isSupported(operation.type, operation.kind)) {
      promises.push(initializeOperationDetailsForManifest(operationId, operation, customCode, !!isTrigger, workflowKind, dispatch));
    } else {
      promises.push(initializeOperationDetailsForSwagger(operationId, operation, references, !!isTrigger, workflowKind, dispatch));
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
    initializeNodes({
      nodes: allNodeData.map((data) => {
        const { id, nodeInputs, nodeOutputs, nodeDependencies, settings, operationMetadata, staticResult, supportedChannels } = data;
        return {
          id,
          nodeInputs,
          nodeOutputs,
          nodeDependencies,
          settings,
          operationMetadata,
          staticResult,
          supportedChannels,
          actionMetadata: getRecordEntry(nodesMetadata, id)?.actionMetadata,
          repetitionInfo: getRecordEntry(repetitionInfos, id),
        };
      }),
      clearExisting: !pasteParams,
    })
  );

  const variables = initializeVariables(operations, allNodeData);
  const agentParameters = initializeAgentParameters(nodesMetadata, allNodeData);
  const outputTokens = initializeOutputTokensForOperations(allNodeData, operations, graph, nodesMetadata);
  dispatch(
    initializeTokensAndVariables({
      outputTokens,
      variables,
      agentParameters,
    })
  );

  LoggerService().log({
    level: LogEntryLevel.Verbose,
    area: 'initializeOperationMetadata',
    message: 'Workflow Operation Metadata initialized',
  });
};

const initializeConnectorsForReferences = async (references: ConnectionReferences): Promise<ConnectorWithParsedSwagger[]> => {
  const connectorIds = uniqueArray(Object.keys(references || {}).map((key) => cleanResourceId(references[key].api.id)));
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
    const parsedManifest = new ManifestParser(manifest, OperationManifestService().isAliasingSupported(operation.type, operation.kind));
    const schema = staticResultService.getOperationResultSchema(connectorId, operationId, parsedManifest);
    schema.then((schema) => {
      if (schema) {
        dispatch(addResultSchema({ id: `${connectorId}-${operationId}`, schema }));
      }
    });

    const customSwagger = await getCustomSwaggerIfNeeded(manifest.properties, operation);
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
      nodeId,
      nodeOperationInfo,
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
    if (customCodeParameter && isCustomCodeParameter(customCodeParameter)) {
      updateCustomCodeInInputs(customCodeParameter, customCode);
    }

    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
      nodeId,
      manifest,
      isTrigger,
      nodeInputs,
      nodeOperationInfo,
      dispatch,
      operationSupportsSplitOn(isTrigger) ? getSplitOnValue(manifest, undefined, undefined, operation) : undefined
    );
    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };

    const supportedChannels = getSupportedChannelsFromManifest(nodeId, nodeOperationInfo, manifest);

    const settings = getOperationSettings(isTrigger, nodeOperationInfo, manifest, undefined /* swagger */, operation, workflowKind);

    const childGraphInputs = processChildGraphAndItsInputs(manifest, operation, dispatch);

    return [
      {
        id: nodeId,
        nodeInputs,
        nodeOutputs,
        nodeDependencies,
        settings,
        operationInfo: nodeOperationInfo,
        manifest,
        supportedChannels,
        operationMetadata: { iconUri, brandColor },
        staticResult: operation?.runtimeConfiguration?.staticResult,
      },
      ...childGraphInputs,
    ];
  } catch (error: any) {
    const errorMessage = parseErrorMessage(error);
    const message = `Can't initialize operation details for operation: ${nodeId}. Error details: ${errorMessage}`;
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
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  dispatch: Dispatch
): NodeDataWithOperationMetadata[] => {
  const { subGraphDetails, brandColor = '', iconUri = '' } = manifest.properties;
  const nodesData: NodeDataWithOperationMetadata[] = [];

  if (subGraphDetails) {
    for (const subGraphKey of Object.keys(subGraphDetails)) {
      const { inputs, isAdditive, ...restOfManifest } = subGraphDetails[subGraphKey];
      const subOperation = getPropertyValue(operation, subGraphKey) ?? {};
      if (inputs) {
        const subManifest = {
          properties: { inputs, ...restOfManifest, iconUri, brandColor },
        } as OperationManifest;
        if (isAdditive) {
          for (const subNodeKey of Object.keys(subOperation)) {
            const { inputs: subNodeInputs, dependencies: subNodeInputDependencies } = getInputParametersFromManifest(
              subNodeKey,
              { type: '', kind: '', connectorId: '', operationId: '' },
              subManifest,
              /* presetParameterValues */ undefined,
              /* customSwagger */ undefined,
              subOperation[subNodeKey]
            );

            const { outputs: subNodeOutputs, dependencies: subNodeOutputDependencies } = getOutputParametersFromManifest(
              subNodeKey,
              subManifest,
              false,
              subNodeInputs,
              { type: '', kind: '', connectorId: '', operationId: '' },
              dispatch,
              /* splitOnValue */ undefined
            );

            nodesData.push({
              id: subNodeKey,
              nodeInputs: subNodeInputs,
              nodeOutputs: subNodeOutputs,
              nodeDependencies: { inputs: subNodeInputDependencies, outputs: subNodeOutputDependencies },
              operationInfo: { type: '', kind: '', connectorId: '', operationId: '' },
              manifest: subManifest,
              operationMetadata: { iconUri, brandColor },
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
      const { value: segments, editorViewModel, type } = parameter;
      let error = '';
      let hasToken = false;
      if (segments && segments.length) {
        parameter.value = segments.map((segment) => {
          let updatedSegment = segment;

          if (isTokenValueSegment(segment)) {
            updatedSegment = updateTokenMetadata(
              updatedSegment,
              repetitionInfo,
              actionNodes,
              pasteParams ? pasteParams.rootTriggerId : triggerNodeId,
              nodesData,
              operations,
              workflowParameters,
              nodesMetadata,
              type,
              id
            );

            if (pasteParams) {
              const { updatedTokenSegment, tokenError } = updateScopePasteTokenMetadata(updatedSegment, pasteParams);
              updatedSegment = updatedTokenSegment;
              error = tokenError;
              hasToken = true;
            }
          }
          return updatedSegment;
        });
      }
      if (pasteParams) {
        if (hasToken) {
          parameter.preservedValue = undefined;
        }
        if (error) {
          parameter.validationErrors = [error];
        }
      }
      if (editorViewModel) {
        flattenAndUpdateViewModel(
          id,
          repetitionInfo,
          editorViewModel,
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
  const operationInfos: Record<string, NodeOperation> = {};

  for (const node of allNodesData) {
    nodesWithData[node.id] = node;
    operationInfos[node.id] = node.operationInfo as NodeOperation;
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
    } catch (error: any) {
      // No tokens will be added if there is an exception. This will allow continuining loading other operations.
      const errorMessage = parseErrorMessage(error);
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'OperationDeserializer:InitializeOutputTokens',
        message: `Error occurred while initializing output tokens for operation: ${operationId}. Error details: ${errorMessage}`,
      });
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
    operations: { dependencies, operationInfo, errors },
    connections,
  } = rootState;
  await Promise.all(
    Object.entries(operations).map(([nodeId, operation]) => {
      if (operationsToInitialize && !operationsToInitialize.includes(nodeId)) {
        return;
      }
      if (nodeId === Constants.NODE.TYPE.PLACEHOLDER_TRIGGER) {
        return;
      }
      if (getRecordEntry(errors, nodeId)?.[ErrorLevel.Critical]) {
        return;
      }

      const nodeOperationInfo = getRecordEntry(operationInfo, nodeId);
      const nodeDependencies = getRecordEntry(dependencies, nodeId);
      if (!nodeOperationInfo || !nodeDependencies) {
        return;
      }

      const isTrigger = isRootNodeInGraph(nodeId, 'root', nodesMetadata);
      const connectionReference = getConnectionReference(connections, nodeId);
      const isFreshCreatedAgent =
        (Object.keys(connections.connectionReferences).length === 0 || deepCompareObjects(connectionReference, mockConnectionReference)) &&
        equals(operation.type, Constants.NODE.TYPE.AGENT);

      return updateDynamicDataForValidConnection(
        nodeId,
        isTrigger,
        nodeOperationInfo,
        connectionReference,
        nodeDependencies,
        dispatch,
        getState,
        operation,
        isFreshCreatedAgent
      );
    })
  );

  dispatch(updateDynamicDataLoadStatus(true));
};

const updateDynamicDataForValidConnection = async (
  nodeId: string,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  reference: ConnectionReference | undefined,
  dependencies: NodeDependencies,
  dispatch: Dispatch,
  getState: () => RootState,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  isFreshCreatedAgent: boolean
): Promise<void> => {
  const isValidConnection = await isConnectionReferenceValid(operationInfo, reference);

  if (isValidConnection) {
    const {
      tokens: { variables },
      workflowParameters: { definitions },
    } = getState() as RootState;
    await updateDynamicDataInNode(
      nodeId,
      isTrigger,
      operationInfo,
      reference,
      dependencies,
      dispatch,
      getState,
      variables,
      definitions,
      true /* updateTokenMetadata */,
      operation
    );
  } else if (!isFreshCreatedAgent) {
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
            defaultMessage: 'Invalid connection. To load complete details, complete or update the connection.',
            id: '4bT5AR',
            description: 'Error message to show for connection error during deserialization.',
          }),
        },
      })
    );
  }
};
