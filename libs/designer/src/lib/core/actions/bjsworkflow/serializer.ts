import Constants from '../../../common/constants';
import type { ConnectionReferences, Workflow, WorkflowParameter } from '../../../common/models/workflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import type { NodeInputs, NodeOperation, ParameterGroup } from '../../state/operation/operationMetadataSlice';
import { ErrorLevel } from '../../state/operation/operationMetadataSlice';
import { getOperationInputParameters } from '../../state/operation/operationSelector';
import type { WorkflowParameterDefinition } from '../../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../../store';
import { getNode, getTriggerNodeId, isRootNode, isRootNodeInGraph } from '../../utils/graph';
import {
  encodePathValue,
  getAndEscapeSegment,
  getEncodeValue,
  getJSONValueFromString,
  parameterValueToString,
} from '../../utils/parameters/helper';
import { buildOperationDetailsFromControls } from '../../utils/swagger/inputsbuilder';
import type { Settings } from './settings';
import type { NodeStaticResults } from './staticresults';
import { LogEntryLevel, LoggerService, OperationManifestService, WorkflowService } from '@microsoft/designer-client-services-logic-apps';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { UIConstants } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { Segment } from '@microsoft/parsers-logic-apps';
import {
  create,
  removeConnectionPrefix,
  cleanIndexedValue,
  isAncestorKey,
  parseEx,
  SegmentType,
  DeserializationType,
  PropertySerializationType,
} from '@microsoft/parsers-logic-apps';
import type {
  Assertion,
  AssertionDefintion,
  LocationSwapMap,
  LogicAppsV2,
  OperationManifest,
  OperationMock,
  SubGraphDetail,
} from '@microsoft/utils-logic-apps';
import {
  SerializationErrorCode,
  SerializationException,
  clone,
  deleteObjectProperty,
  getObjectPropertyValue,
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
  WORKFLOW_NODE_TYPES,
  replaceTemplatePlaceholders,
  unmap,
  filterRecord,
  excludePathValueFromTarget,
} from '@microsoft/utils-logic-apps';
import merge from 'lodash.merge';

export interface SerializeOptions {
  skipValidation: boolean;
  ignoreNonCriticalErrors?: boolean;
}

export const serializeWorkflow = async (rootState: RootState, options?: SerializeOptions): Promise<Workflow> => {
  if (!options?.skipValidation) {
    const intl = getIntl();

    const operationsWithConnectionErrors = Object.entries(rootState.operations.errors).filter(
      ([_id, errors]) => !!errors[ErrorLevel.Connection]
    );
    if (operationsWithConnectionErrors.length > 0) {
      const invalidNodes = operationsWithConnectionErrors.map(([id]) => id).join(', ');
      throw new SerializationException(
        SerializationErrorCode.INVALID_CONNECTIONS,
        intl.formatMessage(
          {
            defaultMessage: 'Workflow has invalid connections on the following operations: {invalidNodes}',
            description: 'Error message to show when there are invalid connections in the nodes.',
          },
          { invalidNodes }
        ),
        { errorMessage: `Workflow has invalid connections on the following operations: ${invalidNodes}` }
      );
    }

    const operationsWithSettingsErrors = (Object.entries(rootState.settings.validationErrors) ?? []).filter(
      ([_id, errorArr]) => errorArr.length > 0
    );
    if (operationsWithSettingsErrors.length > 0) {
      const invalidNodes = operationsWithSettingsErrors.map(([id, _errorArr]) => id).join(', ');
      throw new SerializationException(
        SerializationErrorCode.INVALID_SETTINS,
        intl.formatMessage(
          {
            defaultMessage: 'Workflow has settings validation errors on the following operations: {invalidNodes}',
            description: 'Error message to show when there are invalid connections in the nodes.',
          },
          { invalidNodes }
        ),
        { errorMessage: `Workflow has settings validation errors on the following operations: ${invalidNodes}` }
      );
    }

    const operationsWithParameterErrors = (Object.entries(rootState.operations.inputParameters) ?? []).filter(
      ([_id, nodeInputs]: [id: string, i: NodeInputs]) =>
        Object.values(nodeInputs.parameterGroups).some((parameterGroup: ParameterGroup) =>
          parameterGroup.parameters.some((parameter: ParameterInfo) => (parameter?.validationErrors?.length ?? 0) > 0)
        )
    );
    if (operationsWithParameterErrors.length > 0) {
      const invalidNodes = operationsWithParameterErrors.map(([id]) => id).join(', ');
      throw new SerializationException(
        SerializationErrorCode.INVALID_PARAMETERS,
        intl.formatMessage(
          {
            defaultMessage: 'The workflow has parameter validation errors in the following operations: {invalidNodes}',
            description: 'Error message to show when there are invalid connections in the nodes.',
          },
          { invalidNodes }
        ),
        { errorMessage: `Workflow has parameter validation errors on the following operations: ${invalidNodes}` }
      );
    }
  }

  const { connectionsMapping, connectionReferences: referencesObject } = rootState.connections;
  const connectionReferences = Object.keys(connectionsMapping).reduce((references: ConnectionReferences, nodeId: string) => {
    const referenceKey = connectionsMapping[nodeId];
    if (!referenceKey || !referencesObject[referenceKey]) {
      return references;
    }

    return {
      ...references,
      [referenceKey]: referencesObject[referenceKey],
    };
  }, {});

  const parameters = getWorkflowParameters(filterRecord(rootState.workflowParameters.definitions, (key, _) => key !== '')) ?? {};

  const serializedWorkflow: Workflow = {
    definition: {
      ...rootState.workflow.originalDefinition,
      $schema:
        WorkflowService().getDefinitionSchema?.(unmap(rootState.operations.operationInfo)) ?? rootState.workflow.originalDefinition.$schema,
      actions: await getActions(rootState, options),
      ...(Object.keys(rootState?.staticResults?.properties).length > 0 ? { staticResults: rootState.staticResults.properties } : {}),
      triggers: await getTrigger(rootState, options),
    },
    connectionReferences,
    parameters,
  };

  const workflowService = WorkflowService();
  if (workflowService && workflowService.getDefinitionWithDynamicInputs) {
    serializedWorkflow.definition = workflowService.getDefinitionWithDynamicInputs(
      serializedWorkflow.definition,
      rootState.operations.outputParameters
    );
  }

  return serializedWorkflow;
};

const getActions = async (rootState: RootState, options?: SerializeOptions): Promise<LogicAppsV2.Actions> => {
  const idReplacements = rootState.workflow.idReplacements;
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
      const originalid = actionsInRootGraph[index].id;
      if (!isNullOrEmpty(action)) {
        return {
          ...actions,
          [idReplacements[originalid] ?? originalid]: action as LogicAppsV2.ActionDefinition,
        };
      }

      return actions;
    },
    {}
  );
};

const getTrigger = async (rootState: RootState, options?: SerializeOptions): Promise<LogicAppsV2.Triggers> => {
  const rootNodeId = getTriggerNodeId(rootState.workflow);
  if (rootNodeId === Constants.NODE.TYPE.PLACEHOLDER_TRIGGER) {
    return {}; // Placeholder trigger was found, return empty object
  }
  const idReplacements = rootState.workflow.idReplacements;
  return rootNodeId
    ? {
        [idReplacements[rootNodeId] ?? rootNodeId]: ((await serializeOperation(rootState, rootNodeId, options)) ??
          {}) as LogicAppsV2.TriggerDefinition,
      }
    : {};
};

const getWorkflowParameters = (
  workflowParameters: Record<string, WorkflowParameterDefinition>
): Record<string, WorkflowParameter> | undefined => {
  return Object.keys(workflowParameters).reduce((result: Record<string, WorkflowParameter>, parameterId: string) => {
    const parameter = workflowParameters[parameterId];
    const parameterDefinition: any = { ...parameter };
    const value = parameterDefinition.value;
    const defaultValue = parameterDefinition.defaultValue;

    delete parameterDefinition['name'];
    delete parameterDefinition['isEditable'];

    parameterDefinition.value = equals(parameterDefinition.type, UIConstants.WORKFLOW_PARAMETER_TYPE.STRING)
      ? value
      : value === ''
      ? undefined
      : typeof value !== 'string'
      ? value
      : JSON.parse(value);

    parameterDefinition.defaultValue = equals(parameterDefinition.type, UIConstants.WORKFLOW_PARAMETER_TYPE.STRING)
      ? defaultValue
      : defaultValue === ''
      ? undefined
      : typeof defaultValue !== 'string'
      ? defaultValue
      : JSON.parse(defaultValue);

    return { ...result, [parameter.name]: parameterDefinition };
  }, {});
};

export const serializeOperation = async (
  rootState: RootState,
  operationId: string,
  _options?: SerializeOptions
): Promise<LogicAppsV2.OperationDefinition | null> => {
  const errors = rootState.operations.errors[operationId];

  if (errors?.[ErrorLevel.Critical]) {
    return rootState.workflow.operations[operationId];
  }

  const operation = rootState.operations.operationInfo[operationId];

  let serializedOperation: LogicAppsV2.OperationDefinition;
  if (OperationManifestService().isSupported(operation.type, operation.kind)) {
    serializedOperation = await serializeManifestBasedOperation(rootState, operationId);
  } else {
    switch (operation.type.toLowerCase()) {
      case Constants.NODE.TYPE.API_CONNECTION:
      case Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION:
      case Constants.NODE.TYPE.API_CONNECTION_WEBHOOK:
        serializedOperation = await serializeSwaggerBasedOperation(rootState, operationId);
        break;

      default:
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'operation serializer',
          message: `Do not recognize type: '${operation.type} as swagger based operation'`,
        });
        serializedOperation = rootState.workflow.operations[operationId] ?? {};
        break;
    }
  }

  const actionMetadata = rootState.operations.actionMetadata[operationId];
  if (actionMetadata) {
    serializedOperation.metadata = { ...serializedOperation.metadata, ...actionMetadata };
  }

  return serializedOperation;
};

const serializeManifestBasedOperation = async (rootState: RootState, operationId: string): Promise<LogicAppsV2.OperationDefinition> => {
  const idReplacements = rootState.workflow.idReplacements;
  const operation = rootState.operations.operationInfo[operationId];
  const manifest = await getOperationManifest(operation);
  const isTrigger = isRootNodeInGraph(operationId, 'root', rootState.workflow.nodesMetadata);
  const inputsToSerialize = getOperationInputsToSerialize(rootState, operationId);
  const nodeSettings = rootState.operations.settings[operationId] ?? {};
  const nodeStaticResults = rootState.operations.staticResults[operationId] ?? {};
  const inputPathValue = serializeParametersFromManifest(inputsToSerialize, manifest);
  const hostInfo = serializeHost(operationId, manifest, rootState);
  const inputs = hostInfo !== undefined ? mergeHostWithInputs(hostInfo, inputPathValue) : inputPathValue;
  const operationFromWorkflow = rootState.workflow.operations[operationId];
  const runAfter = isRootNode(operationId, rootState.workflow.nodesMetadata)
    ? undefined
    : getRunAfter(operationFromWorkflow, idReplacements);
  const recurrence =
    isTrigger && manifest.properties.recurrence && manifest.properties.recurrence.type !== RecurrenceType.None
      ? constructInputValues('recurrence.$.recurrence', inputsToSerialize, false /* encodePathComponents */)
      : undefined;
  const childOperations = manifest.properties.allowChildOperations
    ? await serializeNestedOperations(operationId, manifest, rootState)
    : undefined;

  const retryPolicy = getRetryPolicy(nodeSettings);
  if (retryPolicy) {
    inputs.retryPolicy = retryPolicy;
  }

  const inputsLocation = manifest.properties.inputsLocation ?? ['inputs'];

  return {
    type: operation.type,
    ...optional('description', operationFromWorkflow.description),
    ...optional('kind', operation.kind),
    ...(inputsLocation.length ? optional(inputsLocation[0], inputs) : inputs),
    ...childOperations,
    ...optional('runAfter', runAfter),
    ...optional('recurrence', recurrence),
    ...serializeSettings(operationId, nodeSettings, nodeStaticResults, isTrigger, rootState),
  };
};

const serializeSwaggerBasedOperation = async (rootState: RootState, operationId: string): Promise<LogicAppsV2.OperationDefinition> => {
  const idReplacements = rootState.workflow.idReplacements;
  const operationInfo = rootState.operations.operationInfo[operationId];
  const { type, kind } = operationInfo;
  const operationFromWorkflow = rootState.workflow.operations[operationId];
  const isTrigger = isRootNode(operationId, rootState.workflow.nodesMetadata);
  const inputsToSerialize = getOperationInputsToSerialize(rootState, operationId);
  const nodeSettings = rootState.operations.settings[operationId] ?? {};
  const nodeStaticResults = rootState.operations.staticResults[operationId] ?? {};
  const runAfter = isTrigger ? undefined : getRunAfter(operationFromWorkflow, idReplacements);
  const recurrence =
    isTrigger && equals(type, Constants.NODE.TYPE.API_CONNECTION)
      ? constructInputValues('recurrence.$.recurrence', inputsToSerialize, false /* encodePathComponents */)
      : undefined;
  const retryPolicy = getRetryPolicy(nodeSettings);
  const inputPathValue = await serializeParametersFromSwagger(inputsToSerialize, operationInfo);
  const hostInfo = { host: { connection: { referenceName: rootState.connections.connectionsMapping[operationId] } } };
  const inputs = { ...hostInfo, ...inputPathValue, retryPolicy };
  const serializedType = equals(type, Constants.NODE.TYPE.API_CONNECTION)
    ? Constants.SERIALIZED_TYPE.API_CONNECTION
    : equals(type, Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION)
    ? Constants.SERIALIZED_TYPE.API_CONNECTION_NOTIFICATION
    : equals(type, Constants.NODE.TYPE.API_CONNECTION_WEBHOOK)
    ? Constants.SERIALIZED_TYPE.API_CONNECTION_WEBHOOK
    : type;

  return {
    type: serializedType,
    ...optional('description', operationFromWorkflow.description),
    ...optional('kind', kind),
    ...optional('inputs', inputs),
    ...optional('runAfter', runAfter),
    ...optional('recurrence', recurrence),
    ...serializeSettings(operationId, nodeSettings, nodeStaticResults, isTrigger, rootState),
  };
};

const getRunAfter = (operation: LogicAppsV2.ActionDefinition, idReplacements: Record<string, string>): LogicAppsV2.RunAfter => {
  if (!operation.runAfter) {
    return {};
  }
  return Object.entries(operation.runAfter).reduce((acc: LogicAppsV2.RunAfter, [key, value]) => {
    return {
      ...acc,
      [idReplacements[key] ?? key]: value,
    };
  }, {});
};

//#region Parameters Serialization
export interface SerializedParameter extends ParameterInfo {
  value: any;
}

const getOperationInputsToSerialize = (rootState: RootState, operationId: string): SerializedParameter[] => {
  const idReplacements = rootState.workflow.idReplacements;
  return getOperationInputParameters(rootState, operationId).map((input) => ({
    ...input,
    value: parameterValueToString(input, true /* isDefinitionValue */, idReplacements),
  }));
};

const serializeParametersFromManifest = (inputs: SerializedParameter[], manifest: OperationManifest): Record<string, any> => {
  const inputsLocation = (manifest.properties.inputsLocation ?? ['inputs']).slice(1);
  const inputPathValue = constructInputValues('inputs.$', inputs, false /* encodePathComponents */);
  let parametersValue: any = inputPathValue;

  while (inputsLocation.length) {
    const property = inputsLocation.pop() as string;
    parametersValue = property === '[*]' ? [parametersValue] : { [property]: parametersValue };
  }

  return swapInputsLocationIfNeeded(parametersValue, manifest.properties.inputsLocationSwapMap);
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
    const propertyNameParameters: SerializedParameter[] = [];
    const pathTemplateParameters: SerializedParameter[] = [];
    const isPathTemplateParameter = (param: SerializedParameter) =>
      param.info.deserialization?.type === DeserializationType.PathTemplateProperties;

    const serializedParameters = inputs
      .filter((item) => isAncestorKey(item.parameterKey, key))
      .map((descendantParameter) => {
        let parameterValue = getJSONValueFromString(descendantParameter.value, descendantParameter.type);
        if (encodePathComponents) {
          const encodeCount = getEncodeValue(descendantParameter.info.encode ?? '');
          parameterValue = encodePathValue(parameterValue, encodeCount);
        }

        const serializedParameter = { ...descendantParameter, value: parameterValue };
        if (descendantParameter.info.serialization?.property?.type === PropertySerializationType.ParentObject) {
          propertyNameParameters.push(serializedParameter);
        }

        if (isPathTemplateParameter(descendantParameter)) {
          pathTemplateParameters.push(serializedParameter);
        }

        return serializedParameter;
      });

    const pathParameters = pathTemplateParameters.reduce(
      (allPathParams: Record<string, string>, current: SerializedParameter) => ({
        ...allPathParams,
        [current.parameterName.split('.').at(-1) as string]: current.value,
      }),
      {}
    );
    const parametersToSerialize = serializedParameters.filter((param) => !isPathTemplateParameter(param));
    for (const serializedParameter of parametersToSerialize) {
      if (serializedParameter.info.serialization?.property?.type === PropertySerializationType.PathTemplate) {
        serializedParameter.value = replaceTemplatePlaceholders(pathParameters, serializedParameter.value);
        result = serializeParameterWithPath(result, serializedParameter.value, key, serializedParameter);
      } else if (serializedParameter.info.serialization?.value) {
        result = serializeParameterWithPath(
          result,
          serializedParameter.value ? serializedParameter.value : serializedParameter.info.serialization.value,
          key,
          serializedParameter
        );
      } else if (!propertyNameParameters.find((param) => param.parameterKey === serializedParameter.parameterKey)) {
        let parameterKey = serializedParameter.parameterKey;
        for (const propertyNameParameter of propertyNameParameters) {
          const propertyName = propertyNameParameter.info.serialization?.property?.name as string;
          parameterKey = parameterKey.replace(propertyName, propertyNameParameter.value);
        }

        result = serializeParameterWithPath(result, serializedParameter.value, key, { ...serializedParameter, parameterKey });
      }
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
  const parameterAlias = serializedParameter.info?.alias;
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

    if (parameterAlias) {
      // Aliased inputs (e.g., OpenAPI) may appear in the following format:
      //   'inputs.$.foo.foo/bar.foo/bar/baz'
      // This branch handles the case where we do NOT want the parameters to maintain that path, so the result should be:
      //   'foo/bar/baz'
      // To do this, eliminate the redundant path segments.
      for (let i = 0; i < pathSegments.length - 1; i++) {
        const currentPathSegmentStringValue = `${pathSegments[i].value}`;
        const nextPathSegmentStringValue = `${pathSegments[i + 1].value}`;

        if (nextPathSegmentStringValue.startsWith(`${currentPathSegmentStringValue}/`)) {
          pathSegments.splice(i, 1);
          i--;
        }
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

const serializeParametersFromSwagger = async (
  inputs: SerializedParameter[],
  operationInfo: NodeOperation
): Promise<Record<string, any>> => {
  const { operationId, connectorId, type } = operationInfo;
  const { parsedSwagger } = await getConnectorWithSwagger(connectorId);

  const operation = parsedSwagger.getOperationByOperationId(operationId);
  if (!operation) {
    throw new Error('APIM Operation not found');
  }

  const { method, path } = operation;
  const operationPath = removeConnectionPrefix(path);
  const operationMethod = equals(type, Constants.NODE.TYPE.API_CONNECTION_WEBHOOK) ? undefined : method;
  const parameterInputs = equals(type, Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION)
    ? constructInputValues(create(['inputs', '$']) as string, inputs, false /* encodePathComponents */)
    : buildOperationDetailsFromControls(inputs, operationPath, false /* encodePathComponents */, operationMethod);

  // Ignore unencoded newline characters in the operation path since
  // the regular expression used to match paths to their operations
  // does not match across multiple lines.
  if (parameterInputs.path) {
    parameterInputs.path = parameterInputs.path.replace(/[\r\n]/g, '');
  }

  return parameterInputs;
};

const swapInputsLocationIfNeeded = (parametersValue: any, swapMap: LocationSwapMap[] | undefined): any => {
  if (!swapMap?.length) {
    return parametersValue;
  }
  let finalValue = clone(parametersValue);
  for (const { source, target } of swapMap) {
    const propertyValue = getObjectPropertyValue(parametersValue, source);
    deleteObjectProperty(finalValue, source);

    if (typeof propertyValue !== 'object') {
      finalValue = safeSetObjectPropertyValue(finalValue, target, propertyValue);
      continue;
    }

    const value = { ...excludePathValueFromTarget(parametersValue, source, target), ...getObjectPropertyValue(parametersValue, source) };
    finalValue = !target.length ? { ...finalValue, ...value } : safeSetObjectPropertyValue(finalValue, target, value);
  }

  return finalValue;
};

//#endregion

//#region Host Serialization
interface ApiManagementConnectionInfo {
  apiManagement: {
    connection: string;
  };
}

interface FunctionConnectionInfo {
  function: {
    connectionName: string;
  };
}

interface OpenApiConnectionInfo {
  host: LogicAppsV2.OpenApiConnectionHost;
}

interface HybridTriggerConnectionInfo {
  host: LogicAppsV2.HybridTriggerConnectionHost;
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
):
  | FunctionConnectionInfo
  | ApiManagementConnectionInfo
  | OpenApiConnectionInfo
  | ServiceProviderConnectionConfigInfo
  | HybridTriggerConnectionInfo
  | undefined => {
  if (!manifest.properties.connectionReference) {
    return undefined;
  }

  const intl = getIntl();
  const { referenceKeyFormat } = manifest.properties.connectionReference;
  const referenceKey = rootState.connections.connectionsMapping[nodeId] ?? '';
  const { connectorId, operationId } = rootState.operations.operationInfo[nodeId];

  switch (referenceKeyFormat) {
    case ConnectionReferenceKeyFormat.Function:
      return {
        function: {
          connectionName: referenceKey,
        },
      };
    case ConnectionReferenceKeyFormat.ApiManagement:
      return {
        apiManagement: {
          connection: referenceKey,
        },
      };
    case ConnectionReferenceKeyFormat.OpenApi:
      return {
        host: {
          apiId: connectorId,
          connection: referenceKey,
          operationId,
        },
      };
    case ConnectionReferenceKeyFormat.OpenApiConnection:
      // eslint-disable-next-line no-case-declarations
      const connectorSegments = connectorId.split('/');
      return {
        host: {
          apiId: `/${connectorSegments.at(-2)}/${connectorSegments.at(-1)}`,
          connection: {
            referenceName: referenceKey,
          },
          operationId,
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
    case ConnectionReferenceKeyFormat.HybridTrigger:
      return {
        host: {
          connection: {
            name: `@parameters('$connections')['${referenceKey}']['connectionId']`,
          },
        },
      };
    default:
      throw new AssertionException(
        AssertionErrorCode.UNSUPPORTED_MANIFEST_CONNECTION_REFERENCE_FORMAT,
        intl.formatMessage(
          {
            defaultMessage: `Unsupported manifest connection reference format: ''{referenceKeyFormat}''`,
            description:
              'Error message to show when reference format is unsupported, {referenceKeyFormat} will be replaced based on action definition. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
          },
          {
            referenceKeyFormat,
          }
        )
      );
  }
};

const mergeHostWithInputs = (hostInfo: Record<string, any>, inputs: any): any => {
  for (const [key, value] of Object.entries(hostInfo)) {
    if (inputs[key]) {
      // eslint-disable-next-line no-param-reassign
      inputs[key] = { ...inputs[key], ...value };
    } else {
      // eslint-disable-next-line no-param-reassign
      inputs[key] = value;
    }
  }

  return inputs;
};

//#endregion

//#region Nested Operations Serialization
const serializeNestedOperations = async (
  nodeId: string,
  manifest: OperationManifest,
  rootState: RootState
): Promise<Partial<LogicAppsV2.Action>> => {
  const { childOperationsLocation, subGraphDetails } = manifest.properties;
  const idReplacements = rootState.workflow.idReplacements;
  const node = getNode(nodeId, rootState.workflow.graph as WorkflowNode) as WorkflowNode;
  let result: Partial<LogicAppsV2.Action> = {};

  if (childOperationsLocation) {
    result = merge(result, await serializeSubGraph(node, childOperationsLocation ?? [], [], rootState, {}));
  }

  if (subGraphDetails) {
    const subGraphNodes = node.children?.filter((child) => child.type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE) ?? [];
    for (const subGraphLocation of Object.keys(subGraphDetails)) {
      const subGraphDetail = subGraphDetails[subGraphLocation];
      const subGraphs = subGraphNodes.filter((graph) => graph.subGraphLocation === subGraphLocation);

      if (subGraphDetail.isAdditive) {
        for (const subGraph of subGraphs) {
          const subGraphId = idReplacements[subGraph.id] ?? subGraph.id;
          result = merge(
            result,
            await serializeSubGraph(
              subGraph,
              [subGraphLocation, subGraphId, ...(subGraphDetail.location ?? [])],
              [subGraphLocation, subGraphId],
              rootState,
              subGraphDetail
            )
          );
        }
      } else if (subGraphs.length === 1) {
        result = merge(
          result,
          await serializeSubGraph(
            subGraphs[0],
            [subGraphLocation, ...(subGraphDetail.location ?? [])],
            [subGraphLocation],
            rootState,
            subGraphDetail
          )
        );
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
  const idReplacements = rootState.workflow.idReplacements;

  safeSetObjectPropertyValue(
    result,
    graphLocation,
    nestedActions.reduce((actions: LogicAppsV2.Actions, action: LogicAppsV2.OperationDefinition, index: number) => {
      if (!isNullOrEmpty(action)) {
        return {
          ...actions,
          [idReplacements[nestedNodes[index].id] ?? [nestedNodes[index].id]]: action,
        };
      }

      return actions;
    }, {})
  );

  if (graphDetail.inputs && graphDetail.inputsLocation) {
    const inputs = serializeParametersFromManifest(getOperationInputsToSerialize(rootState, graphId), { properties: graphDetail } as any);
    safeSetObjectPropertyValue(result, [...graphInputsLocation, ...graphDetail.inputsLocation], inputs);
  }

  return result;
};

export const isWorkflowOperationNode = (node: WorkflowNode) =>
  node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE || node.type === WORKFLOW_NODE_TYPES.GRAPH_NODE;
//#endregion

//#region Settings Serialization
const serializeSettings = (
  operationId: string,
  settings: Settings,
  nodeStaticResults: NodeStaticResults,
  isTrigger: boolean,
  rootState: RootState
): Partial<LogicAppsV2.Action | LogicAppsV2.Trigger> => {
  const conditionExpressions = settings.conditionExpressions;
  const conditions = conditionExpressions
    ? conditionExpressions.value?.filter((expression) => !!expression).map((expression) => ({ expression }))
    : undefined;
  const timeout = settings.timeout?.isSupported && settings.timeout.value ? { timeout: settings.timeout.value } : undefined;
  const trackedProperties = settings.trackedProperties?.value;

  return {
    ...optional('correlation', settings.correlation?.value),
    ...(settings.invokerConnection?.value?.enabled
      ? optional('isInvokerConnectionEnabled', settings.invokerConnection?.value?.enabled)
      : {}),
    ...optional('conditions', conditions),
    ...optional('limit', timeout),
    ...optional('operationOptions', getSerializedOperationOptions(operationId, settings, rootState)),
    ...optional('runtimeConfiguration', getSerializedRuntimeConfiguration(operationId, settings, nodeStaticResults, rootState)),
    ...optional('trackedProperties', trackedProperties),
    ...(getSplitOn(isTrigger, settings) ?? {}),
  };
};

const getSerializedRuntimeConfiguration = (
  operationId: string,
  settings: Settings,
  nodeStaticResults: NodeStaticResults,
  rootState: RootState
): LogicAppsV2.RuntimeConfiguration | undefined => {
  const runtimeConfiguration: LogicAppsV2.RuntimeConfiguration = {};
  const isTrigger = isRootNodeInGraph(operationId, 'root', rootState.workflow.nodesMetadata);

  const transferMode = settings.uploadChunk?.value?.transferMode;
  const uploadChunkSize = settings.uploadChunk?.value?.uploadChunkSize;
  const downloadChunkSize = settings.downloadChunkSize?.value;
  const pagingItemCount = settings.paging?.value?.enabled ? settings.paging.value.value : undefined;

  if (Object.keys(nodeStaticResults).length > 0) {
    safeSetObjectPropertyValue(runtimeConfiguration, [Constants.SETTINGS.PROPERTY_NAMES.STATIC_RESULT], nodeStaticResults);
  }

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

const getSplitOn = (
  isTrigger: boolean,
  { splitOn, splitOnConfiguration }: Settings
):
  | {
      splitOn: string;
      splitOnConfiguration?: { correlation?: { clientTrackingId?: string } };
    }
  | undefined => {
  if (!isTrigger || !splitOn?.value?.enabled) {
    return undefined;
  }

  return {
    splitOn: splitOn.value.value as string,
    ...(splitOnConfiguration ? { splitOnConfiguration } : {}),
  };
};

export const serializeUnitTestDefinition = async (rootState: RootState): Promise<any> => {
  const { mockResults, assertions } = rootState.unitTest;

  return {
    triggerMocks: getTriggerMocks(mockResults),
    actionMocks: getActionMocks(mockResults),
    assertions: getAssertions(assertions),
  };
};

const getAssertions = (assertions: Record<string, AssertionDefintion>): Assertion[] => {
  return Object.values(assertions).map((assertion) => {
    const { name, description } = assertion;
    return { name, description };
  });
};

const getTriggerMocks = (mockResults: { [key: string]: string }): Record<string, OperationMock> => {
  const result: Record<string, OperationMock> = {};
  Object.keys(mockResults).forEach((key) => {
    if (key.charAt(0) === '&') {
      const value = mockResults[key];
      if (value) {
        // return trigger
        const mockTriggerJson = JSON.parse(value);
        const triggerName = key.substring(1); // take off meta data
        result[triggerName] = mockTriggerJson;
      }
    }
  });
  return result;
};

const getActionMocks = (mockResults: { [key: string]: string }): Record<string, OperationMock> => {
  const result: Record<string, OperationMock> = {};
  Object.keys(mockResults).forEach((key) => {
    if (key.charAt(0) !== '&') {
      const value = mockResults[key];
      if (value) {
        const mockResultJson = JSON.parse(value);
        result[key] = mockResultJson;
      }
    }
  });
  return result;
};

//#endregion
