import Constants from '../../../common/constants';
import type { ConnectionReferences, Workflow } from '../../../common/models/workflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { WORKFLOW_NODE_TYPES } from '../../parsers/models/workflowNode';
import { getOperationManifest } from '../../queries/operation';
import { getOperationInputParameters } from '../../state/operation/operationSelector';
import type { RootState } from '../../store';
import { getNode, isRootNode, isRootNodeInGraph } from '../../utils/graph';
import {
  encodePathValue,
  getAndEscapeSegment,
  getEncodeValue,
  getJSONValueFromString,
  parameterValueToString,
} from '../../utils/parameters/helper';
import type { Settings } from './settings';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { Segment } from '@microsoft-logic-apps/parsers';
import { cleanIndexedValue, isAncestorKey, parseEx, SegmentType } from '@microsoft-logic-apps/parsers';
import type { OperationManifest, SubGraphDetail } from '@microsoft-logic-apps/utils';
import {
  equals,
  isNullOrUndefined,
  safeSetObjectPropertyValue,
  AssertionErrorCode,
  AssertionException,
  ConnectionReferenceKeyFormat,
  optional,
  RecurrenceType,
  first,
  isNullOrEmpty,
} from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';

export interface SerializeOptions {
  skipValidation: boolean;
  ignoreNonCriticalErrors?: boolean;
}

export const serializeWorkflow = async (rootState: RootState, options?: SerializeOptions): Promise<Workflow> => {
  const { connectionsMapping, connectionReferences: referencesObject } = rootState.connections;
  const connectionReferences = Object.keys(connectionsMapping).reduce((references: ConnectionReferences, nodeId: string) => {
    const referenceKey = connectionsMapping[nodeId];
    const reference = referencesObject[referenceKey];

    return {
      ...references,
      [referenceKey]: reference,
    };
  }, {});

  return {
    definition: {
      $schema: Constants.SCHEMA.GA_20160601.URL,
      actions: await getActions(rootState, options),
      contentVersion: '1.0.0.0',
      outputs: {}, // TODO - Should get this from original definition
      triggers: await getTrigger(rootState, options),
    },
    connectionReferences,
    parameters: {},
  };
};

const getActions = async (rootState: RootState, options?: SerializeOptions): Promise<LogicAppsV2.Actions> => {
  const rootGraph = rootState.workflow.graph as WorkflowNode;
  const actionsInRootGraph = rootGraph.children?.filter(
    (child) => !isRootNode(child.id, rootState.workflow.nodesMetadata)
  ) as WorkflowNode[];
  const promises: Promise<LogicAppsV2.ActionDefinition | null>[] = [];

  for (const action of actionsInRootGraph) {
    promises.push(serializeOperation(rootState, action.id, options));
  }

  return (await Promise.all(promises)).reduce(
    (actions: LogicAppsV2.Actions, action: LogicAppsV2.ActionDefinition | null, index: number) => {
      if (!isNullOrEmpty(action)) {
        return {
          ...actions,
          [actionsInRootGraph[index].id]: action as LogicAppsV2.ActionDefinition,
        };
      }

      return actions;
    },
    {}
  );
};

const getTrigger = async (rootState: RootState, options?: SerializeOptions): Promise<LogicAppsV2.Triggers> => {
  const rootGraph = rootState.workflow.graph as WorkflowNode;
  const rootNode = rootGraph.children?.find((child) => isRootNode(child.id, rootState.workflow.nodesMetadata)) as WorkflowNode;

  return rootNode
    ? { [rootNode.id]: ((await serializeOperation(rootState, rootNode.id, options)) ?? {}) as LogicAppsV2.TriggerDefinition }
    : {};
};

export const serializeOperation = async (
  rootState: RootState,
  operationId: string,
  _options?: SerializeOptions
): Promise<LogicAppsV2.OperationDefinition | null> => {
  const operation = rootState.operations.operationInfo[operationId];

  // TODO (Danielle): Add logic to identify if this operation is in Recommendation phase.
  // If in recommendation phase then return null;

  let serializedOperation: LogicAppsV2.OperationDefinition;
  if (OperationManifestService().isSupported(operation.type, operation.kind)) {
    serializedOperation = await serializeManifestBasedOperation(rootState, operationId);
  } else {
    // TODO - Implement for ApiConnection type operations [swagger based]
    serializedOperation = rootState.workflow.operations[operationId] ?? {};
  }

  // TODO - We might have to just serialize bare minimum data for partially loaded node.
  // TODO - Serialize metadata for each operation.
  return serializedOperation;
};

const serializeManifestBasedOperation = async (rootState: RootState, operationId: string): Promise<LogicAppsV2.OperationDefinition> => {
  const operation = rootState.operations.operationInfo[operationId];
  const manifest = await getOperationManifest(operation);
  const inputsToSerialize = getOperationInputsToSerialize(rootState, operationId);
  const nodeSettings = rootState.operations.settings[operationId] ?? {};
  const inputPathValue = serializeOperationParameters(inputsToSerialize, manifest);
  const hostInfo = serializeHost(operationId, manifest, rootState);
  const inputs = hostInfo !== undefined ? { ...inputPathValue, ...hostInfo } : inputPathValue;
  const operationFromWorkflow = rootState.workflow.operations[operationId];
  const runAfter = isRootNode(operationId, rootState.workflow.nodesMetadata) ? undefined : getRunAfter(operationFromWorkflow);
  const recurrence =
    isRootNodeInGraph(operationId, 'root', rootState.workflow.nodesMetadata) &&
    manifest.properties.recurrence &&
    manifest.properties.recurrence.type !== RecurrenceType.None
      ? constructInputValues('recurrence.$', inputsToSerialize, false /* encodePathComponents */)
      : undefined;

  const childOperations = manifest.properties.allowChildOperations
    ? await serializeNestedOperations(operationId, manifest, rootState)
    : undefined;

  const retryPolicy = getRetryPolicy(nodeSettings);
  if (retryPolicy) {
    inputs.retryPolicy = retryPolicy;
  }

  return {
    type: operation.type,
    ...optional('kind', operation.kind),
    ...optional((manifest.properties.inputsLocation ?? ['inputs'])[0], inputs),
    ...childOperations,
    ...optional('runAfter', runAfter),
    ...optional('recurrence', recurrence),
    ...serializeSettings(operationId, nodeSettings, rootState),
  };
};

//#region Parameters Serialization
export interface SerializedParameter extends ParameterInfo {
  value: any;
}

const getOperationInputsToSerialize = (rootState: RootState, operationId: string): SerializedParameter[] => {
  return getOperationInputParameters(rootState, operationId)
    .filter((input) => !input.info.serialization?.skip)
    .map((input) => ({
      ...input,
      value: parameterValueToString(input, true /* isDefinitionValue */),
    }));
};

const serializeOperationParameters = (inputs: SerializedParameter[], manifest: OperationManifest): Record<string, any> => {
  const inputsLocation = (manifest.properties.inputsLocation ?? ['inputs']).slice(1);
  const inputPathValue = constructInputValues('inputs.$', inputs, false /* encodePathComponents */);
  let parametersValue: any = inputPathValue;

  while (inputsLocation.length) {
    const property = inputsLocation.pop() as string;
    parametersValue = { [property]: parametersValue };
  }

  return parametersValue;
};

export const constructInputValues = (key: string, inputs: SerializedParameter[], encodePathComponents: boolean): any => {
  let result: any;

  const rootParameter = first((parameter) => cleanIndexedValue(parameter.parameterKey) === cleanIndexedValue(key), inputs);
  if (rootParameter) {
    result = getJSONValueFromString(rootParameter.value, rootParameter.type);
    if (encodePathComponents) {
      const encodeCount = getEncodeValue(rootParameter.info.encode ?? '');
      result = encodePathValue(result, encodeCount);
    }
    return result !== undefined ? result : rootParameter.required ? null : undefined;
  } else {
    const descendantParameters = inputs.filter((item) => isAncestorKey(item.parameterKey, key));
    for (const serializedParameter of descendantParameters) {
      let parameterValue = getJSONValueFromString(serializedParameter.value, serializedParameter.type);
      if (encodePathComponents) {
        const encodeCount = getEncodeValue(serializedParameter.info.encode ?? '');
        parameterValue = encodePathValue(parameterValue, encodeCount);
      }
      result = serializeParameterWithPath(result, parameterValue, key, serializedParameter);
    }
  }

  return result;
};

const serializeParameterWithPath = (
  parent: any,
  serializedValue: any,
  parentKey: string,
  serializedParameter: SerializedParameter
): any => {
  const valueKeys = serializedParameter.alternativeKey
    ? [serializedParameter.parameterKey, serializedParameter.alternativeKey]
    : [serializedParameter.parameterKey];
  const required = serializedParameter.required;
  let result = parent;

  for (const valueKey of valueKeys) {
    if (parentKey === valueKey) {
      return serializedValue;
    }

    if (!required && serializedValue === undefined) {
      return result;
    }

    const parentSegments = parseEx(parentKey);
    const valueSegments = parseEx(valueKey);
    const pathSegments = valueSegments.slice(parentSegments.length);
    if (result === undefined) {
      const firstSegment = pathSegments[0];
      if (firstSegment.type === SegmentType.Index) {
        result = [];
      } else {
        result = {};
      }
    }

    let p = result;
    while (pathSegments.length > 0) {
      const pathSegment = pathSegments.shift() as Segment;
      const propertyKey = getAndEscapeSegment(pathSegment);
      const lastSegment = pathSegments.length === 0;
      if (lastSegment) {
        p[propertyKey] = serializedValue !== undefined ? serializedValue : null;
      } else {
        const nextSegment = pathSegments[0];
        if (p[propertyKey] === undefined) {
          p[propertyKey] = nextSegment.type === SegmentType.Index ? [] : {};
        }
        p = p[propertyKey];
      }
    }
  }

  return result;
};

//#endregion

//#region Host Serialization
interface FunctionConnectionInfo {
  function: {
    connectionName: string;
  };
}

interface ServiceProviderConnectionConfigInfo {
  serviceProviderConfiguration: {
    connectionName: string;
    operationId: string;
    serviceProviderId: string;
  };
}

const serializeHost = (
  nodeId: string,
  manifest: OperationManifest,
  rootState: RootState
): FunctionConnectionInfo | ServiceProviderConnectionConfigInfo | undefined => {
  if (!manifest.properties.connectionReference) {
    return undefined;
  }

  const intl = getIntl();
  const { referenceKeyFormat } = manifest.properties.connectionReference;
  const referenceKey = rootState.connections.connectionsMapping[nodeId];
  const { connectorId, operationId } = rootState.operations.operationInfo[nodeId];

  switch (referenceKeyFormat) {
    case ConnectionReferenceKeyFormat.Function:
      return {
        function: {
          connectionName: referenceKey,
        },
      };
    case ConnectionReferenceKeyFormat.ServiceProvider:
      return {
        serviceProviderConfiguration: {
          connectionName: referenceKey,
          operationId,
          serviceProviderId: connectorId,
        },
      };
    default:
      throw new AssertionException(
        AssertionErrorCode.UNSUPPORTED_MANIFEST_CONNECTION_REFERENCE_FORMAT,
        intl.formatMessage(
          {
            defaultMessage: `Unsupported manifest connection reference format: '{referenceKeyFormat}'`,
            description:
              'Error message to show when reference format is unsupported, {referenceKeyFormat} will be replaced based on action definition',
          },
          {
            referenceKeyFormat,
          }
        )
      );
  }
};

//#endregion

//#region Nested Operations Serialization
const serializeNestedOperations = async (
  nodeId: string,
  manifest: OperationManifest,
  rootState: RootState
): Promise<Partial<LogicAppsV2.Action>> => {
  const { childOperationsLocation, subGraphDetails } = manifest.properties;
  const node = getNode(nodeId, rootState.workflow.graph as WorkflowNode) as WorkflowNode;
  let result: Partial<LogicAppsV2.Action> = {};

  if (childOperationsLocation) {
    result = {
      ...result,
      ...(await serializeSubGraph(node, childOperationsLocation ?? [], [], rootState, {})),
    };
  }

  if (subGraphDetails) {
    const subGraphNodes = node.children?.filter((child) => child.type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE) ?? [];
    for (const subGraphLocation of Object.keys(subGraphDetails)) {
      const subGraphDetail = subGraphDetails[subGraphLocation];
      const subGraphs = subGraphNodes.filter((graph) => graph.subGraphLocation === subGraphLocation);

      if (subGraphDetail.isAdditive) {
        for (const subGraph of subGraphs) {
          const subGraphId = subGraph.id;
          result = {
            ...result,
            ...(await serializeSubGraph(
              subGraph,
              [subGraphLocation, subGraphId, ...(subGraphDetail.location ?? [])],
              [subGraphLocation, subGraphId],
              rootState,
              subGraphDetail
            )),
          };
        }
      } else if (subGraphs.length === 1) {
        result = {
          ...result,
          ...(await serializeSubGraph(
            subGraphs[0],
            [subGraphLocation, ...(subGraphDetail.location ?? [])],
            [subGraphLocation],
            rootState,
            subGraphDetail
          )),
        };
      }
    }
  }

  return result;
};

const serializeSubGraph = async (
  graph: WorkflowNode,
  graphLocation: string[],
  graphInputsLocation: string[],
  rootState: RootState,
  graphDetail: SubGraphDetail
): Promise<Partial<LogicAppsV2.Action>> => {
  const { id: graphId, children } = graph;
  const result: Partial<LogicAppsV2.Action> = {};

  const nestedNodes = children?.filter(isWorkflowOperationNode) ?? [];
  const nestedActionsPromises = nestedNodes.map((nestedNode) =>
    serializeOperation(rootState, nestedNode.id)
  ) as Promise<LogicAppsV2.OperationDefinition>[];
  const nestedActions = await Promise.all(nestedActionsPromises);

  safeSetObjectPropertyValue(
    result,
    graphLocation,
    nestedActions.reduce((actions: LogicAppsV2.Actions, action: LogicAppsV2.OperationDefinition, index: number) => {
      if (!isNullOrEmpty(action)) {
        return {
          ...actions,
          [nestedNodes[index].id]: action,
        };
      }

      return actions;
    }, {})
  );

  if (graphDetail.inputs && graphDetail.inputsLocation) {
    const inputs = serializeOperationParameters(getOperationInputsToSerialize(rootState, graphId), { properties: graphDetail } as any);
    safeSetObjectPropertyValue(result, [...graphInputsLocation, ...graphDetail.inputsLocation], inputs);
  }

  return result;
};

const isWorkflowOperationNode = (node: WorkflowNode) =>
  node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE || node.type === WORKFLOW_NODE_TYPES.GRAPH_NODE;
//#endregion

//#region Settings Serialization
const serializeSettings = (
  operationId: string,
  settings: Settings,
  rootState: RootState
): Partial<LogicAppsV2.Action | LogicAppsV2.Trigger> => {
  const conditionExpressions = settings.conditionExpressions;
  const conditions = conditionExpressions
    ? conditionExpressions.value?.filter((expression) => !!expression).map((expression) => ({ expression }))
    : undefined;
  const timeout = settings.timeout?.isSupported ? { timeout: settings.timeout.value } : undefined;
  const trackedProperties = settings.trackedProperties?.value;

  return {
    ...optional('correlation', settings.correlation?.value),
    ...optional('conditions', conditions),
    ...optional('limit', timeout),
    ...optional('operationOptions', getSerializedOperationOptions(operationId, settings, rootState)),
    ...optional('runtimeConfiguration', getSerializedRuntimeConfiguration(operationId, settings, rootState)),
    ...optional('trackedProperties', trackedProperties),
  };
};

const getSerializedRuntimeConfiguration = (
  operationId: string,
  settings: Settings,
  rootState: RootState
): LogicAppsV2.RuntimeConfiguration | undefined => {
  const runtimeConfiguration: LogicAppsV2.RuntimeConfiguration = {};
  const isTrigger = isRootNodeInGraph(operationId, 'root', rootState.workflow.nodesMetadata);

  const transferMode = settings.uploadChunk?.value?.transferMode;
  const uploadChunkSize = settings.uploadChunk?.value?.uploadChunkSize;
  const downloadChunkSize = settings.downloadChunkSize?.value;
  const pagingItemCount = settings.paging?.value?.enabled ? settings.paging.value.value : undefined;

  if (transferMode) {
    safeSetObjectPropertyValue(
      runtimeConfiguration,
      [Constants.SETTINGS.PROPERTY_NAMES.CONTENT_TRANSFER, Constants.SETTINGS.PROPERTY_NAMES.TRANSFER_MODE],
      transferMode
    );
  }

  if (uploadChunkSize !== undefined) {
    safeSetObjectPropertyValue(
      runtimeConfiguration,
      [Constants.SETTINGS.PROPERTY_NAMES.CONTENT_TRANSFER, Constants.SETTINGS.PROPERTY_NAMES.UPLOAD_CHUNK_SIZE],
      uploadChunkSize
    );
  }

  if (downloadChunkSize !== undefined) {
    safeSetObjectPropertyValue(
      runtimeConfiguration,
      [Constants.SETTINGS.PROPERTY_NAMES.CONTENT_TRANSFER, Constants.SETTINGS.PROPERTY_NAMES.DOWNLOAD_CHUNK_SIZE],
      downloadChunkSize
    );
  }

  if (pagingItemCount !== undefined) {
    safeSetObjectPropertyValue(
      runtimeConfiguration,
      [Constants.SETTINGS.PROPERTY_NAMES.PAGINATION_POLICY, Constants.SETTINGS.PROPERTY_NAMES.MINIMUM_ITEM_COUNT],
      pagingItemCount
    );
  }

  if (!isTrigger) {
    if (!settings.sequential) {
      const repetitions = settings.concurrency?.value?.enabled ? settings.concurrency.value.value : undefined;

      if (repetitions !== undefined) {
        safeSetObjectPropertyValue(
          runtimeConfiguration,
          [Constants.SETTINGS.PROPERTY_NAMES.CONCURRENCY, Constants.SETTINGS.PROPERTY_NAMES.REPETITIONS],
          repetitions
        );
      }
    }
  } else {
    if (!settings.singleInstance) {
      const runs = settings.concurrency?.value?.enabled ? settings.concurrency.value.value : undefined;

      if (runs !== undefined) {
        safeSetObjectPropertyValue(
          runtimeConfiguration,
          [Constants.SETTINGS.PROPERTY_NAMES.CONCURRENCY, Constants.SETTINGS.PROPERTY_NAMES.RUNS],
          runs
        );
      }
    }
  }

  const isSecureInputsSet = settings.secureInputs?.value;
  const isSecureOutputsSet = settings.secureOutputs?.value;

  if (isSecureInputsSet || isSecureOutputsSet) {
    const secureData: LogicAppsV2.SecureData = {
      properties: [
        ...(isSecureInputsSet ? [Constants.SETTINGS.SECURE_DATA_PROPERTY_NAMES.INPUTS] : []),
        ...(isSecureOutputsSet ? [Constants.SETTINGS.SECURE_DATA_PROPERTY_NAMES.OUTPUTS] : []),
      ],
    };

    safeSetObjectPropertyValue(runtimeConfiguration, [Constants.SETTINGS.PROPERTY_NAMES.SECURE_DATA], secureData);
  }

  const requestOptions = settings.requestOptions?.value;
  if (requestOptions?.timeout) {
    safeSetObjectPropertyValue(runtimeConfiguration, ['requestOptions'], requestOptions);
  }

  // TODO - Might need to add for Static results

  return runtimeConfiguration && !Object.keys(runtimeConfiguration).length ? undefined : runtimeConfiguration;
};

const getSerializedOperationOptions = (operationId: string, settings: Settings, rootState: RootState): string | undefined => {
  const originalDefinition = rootState.workflow.operations[operationId];
  const originalOptions = originalDefinition.operationOptions;
  const deserializedOptions = isNullOrUndefined(originalOptions) ? [] : originalOptions.split(',').map((option) => option.trim());

  updateOperationOptions(Constants.SETTINGS.OPERATION_OPTIONS.SINGLE_INSTANCE, true, !!settings.singleInstance, deserializedOptions);
  updateOperationOptions(Constants.SETTINGS.OPERATION_OPTIONS.SEQUENTIAL, true, !!settings.sequential, deserializedOptions);
  updateOperationOptions(
    Constants.SETTINGS.OPERATION_OPTIONS.ASYNCHRONOUS,
    !!settings.asynchronous?.isSupported,
    !!settings.asynchronous?.value,
    deserializedOptions
  );
  updateOperationOptions(
    Constants.SETTINGS.OPERATION_OPTIONS.DISABLE_ASYNC,
    !!settings.disableAsyncPattern?.isSupported,
    !!settings.disableAsyncPattern?.value,
    deserializedOptions
  );
  updateOperationOptions(
    Constants.SETTINGS.OPERATION_OPTIONS.DISABLE_AUTOMATIC_DECOMPRESSION,
    !!settings.disableAutomaticDecompression?.isSupported,
    !!settings.disableAutomaticDecompression?.value,
    deserializedOptions
  );
  updateOperationOptions(
    Constants.SETTINGS.OPERATION_OPTIONS.SUPPRESS_WORKFLOW_HEADERS,
    !!settings.suppressWorkflowHeaders?.isSupported,
    !!settings.suppressWorkflowHeaders?.value,
    deserializedOptions
  );
  updateOperationOptions(
    Constants.SETTINGS.OPERATION_OPTIONS.SUPPRESS_WORKFLOW_HEADERS_ON_RESPONSE,
    !!settings.suppressWorkflowHeadersOnResponse?.isSupported,
    !!settings.suppressWorkflowHeadersOnResponse?.value,
    deserializedOptions
  );
  updateOperationOptions(
    Constants.SETTINGS.OPERATION_OPTIONS.REQUEST_SCHEMA_VALIDATION,
    !!settings.requestSchemaValidation?.isSupported,
    !!settings.requestSchemaValidation?.value,
    deserializedOptions
  );

  return deserializedOptions.length ? deserializedOptions.join(', ') : undefined;
};

const updateOperationOptions = (
  operationOption: string,
  isOptionSupported: boolean,
  isOptionSet: boolean,
  existingOperationOptions: string[]
): void => {
  if (isOptionSupported) {
    const optionIndex = existingOperationOptions.findIndex((option) => equals(option, operationOption));
    if (isOptionSet && optionIndex === -1) {
      existingOperationOptions.push(operationOption);
    }

    if (!isOptionSet && optionIndex !== -1) {
      existingOperationOptions.splice(optionIndex, 1);
    }
  }
};

const getRetryPolicy = (settings: Settings): LogicAppsV2.RetryPolicy | undefined => {
  const retryPolicy = settings.retryPolicy?.value;
  if (!retryPolicy) {
    return undefined;
  }

  const retryPolicyType = retryPolicy.type && retryPolicy.type.toLowerCase();
  switch (retryPolicyType) {
    case Constants.RETRY_POLICY_TYPE.DEFAULT:
      return undefined;

    case Constants.RETRY_POLICY_TYPE.FIXED:
    case Constants.RETRY_POLICY_TYPE.EXPONENTIAL:
      return { ...retryPolicy, type: retryPolicyType };

    case Constants.RETRY_POLICY_TYPE.NONE:
      return { type: Constants.RETRY_POLICY_TYPE.NONE };

    default:
      throw new Error(`Unable to serialize retry policy with type ${retryPolicyType}`);
  }
};

//#endregion

const getRunAfter = (operation: LogicAppsV2.ActionDefinition): LogicAppsV2.RunAfter => {
  return operation.runAfter ?? {};
};
