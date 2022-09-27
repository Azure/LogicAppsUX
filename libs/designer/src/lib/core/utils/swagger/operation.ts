/* eslint-disable no-param-reassign */

/* eslint-disable no-case-declarations */
import Constants from '../../../common/constants';
import type { ConnectionReferences } from '../../../common/models/workflow';
import { getLegacyConnectionReferenceKey } from '../../actions/bjsworkflow/connections';
import { getInputDependencies } from '../../actions/bjsworkflow/initialize';
import type {
  NodeDataWithOperationMetadata,
  NodeInputsWithDependencies,
  NodeOutputsWithDependencies,
} from '../../actions/bjsworkflow/operationdeserializer';
import { getOperationSettings } from '../../actions/bjsworkflow/settings';
import { getConnectorWithSwagger } from '../../queries/connections';
import type { DependencyInfo, NodeInputs, NodeOperation, OutputInfo } from '../../state/operation/operationMetadataSlice';
import { DynamicLoadStatus, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import { getBrandColorFromConnector, getIconUriFromConnector } from '../card';
import { toOutputInfo, updateOutputsForBatchingTrigger } from '../outputs';
import {
  addRecurrenceParametersInGroup,
  getDependentParameters,
  getParametersSortedByVisibility,
  loadParameterValuesFromDefault,
  ParameterGroupKeys,
  toParameterInfoMap,
  updateParameterWithValues,
} from '../parameters/helper';
import { loadInputValuesFromDefinition } from './inputsbuilder';
import { LogEntryLevel, LoggerService } from '@microsoft-logic-apps/designer-client-services';
import type { Operation, OutputParameter, SwaggerParser } from '@microsoft-logic-apps/parsers';
import {
  create,
  isDynamicSchemaExtension,
  ParameterLocations,
  removeConnectionPrefix,
  isTemplateExpression,
} from '@microsoft-logic-apps/parsers';
import type { OperationInfo } from '@microsoft-logic-apps/utils';
import { copyArray, map, RecurrenceType, equals, parsePathnameAndQueryKeyFromUri, startsWith, unmap } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

interface OperationInputInfo {
  method: string;
  path?: string;
  pathTemplate?: {
    template: string;
    parameters: Record<string, string>;
  };
}

export const initializeOperationDetailsForSwagger = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  references: ConnectionReferences,
  isTrigger: boolean,
  dispatch: Dispatch
): Promise<NodeDataWithOperationMetadata[] | undefined> => {
  try {
    const operationInfo = await getOperationInfo(nodeId, operation as LogicAppsV2.ApiConnectionAction, references);

    if (operationInfo) {
      const nodeOperationInfo = { ...operationInfo, type: operation.type, kind: operation.kind };
      dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));
      const { connector, parsedSwagger } = await getConnectorWithSwagger(operationInfo.connectorId);

      const settings = getOperationSettings(isTrigger, nodeOperationInfo, /* manifest */ undefined, parsedSwagger, operation);
      const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromSwagger(
        nodeId,
        isTrigger,
        parsedSwagger,
        nodeOperationInfo,
        operation
      );
      const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromSwagger(
        parsedSwagger,
        nodeOperationInfo,
        nodeInputs,
        settings.splitOn?.value?.value
      );
      const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };

      return [
        {
          id: nodeId,
          nodeInputs,
          nodeOutputs,
          nodeDependencies,
          brandColor: getBrandColorFromConnector(connector),
          iconUri: getIconUriFromConnector(connector),
          settings,
        },
      ];
    }

    throw new Error('Operation info could not be found for a swagger operation');
  } catch (error) {
    const errorMessage = `Unable to initialize operation details for swagger based operation - ${nodeId}. Error details - ${error}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'operation deserializer',
      message: errorMessage,
    });

    return;
  }
};

export const getInputParametersFromSwagger = (
  nodeId: string,
  isTrigger: boolean,
  swagger: SwaggerParser,
  operationInfo: NodeOperation,
  stepDefinition?: any
): NodeInputsWithDependencies => {
  const { type, operationId } = operationInfo;
  const includeNotificationParameters = !equals(type, Constants.NODE.TYPE.API_CONNECTION);
  const isWebhookOperation = swagger.operationIsWebhook(operationId);
  let inputParametersByKey = swagger.getInputParameters(operationId, {
    excludeInternalParameters: false,
    includeNotificationParameters,
  }).byId;
  const operation = swagger.getOperationByOperationId(operationId);

  // Add the parameters based on the extensions at the operation level.
  if (operation?.operationHeadersExtension) {
    const operationParameters = unmap(inputParametersByKey);
    if (operationParameters.filter((parameter) => parameter.in === ParameterLocations.Header).length !== 0) {
      throw new Error('Invalid use of x-ms-header extension');
    }

    const key = create([ParameterLocations.Header, '$']) as string;
    inputParametersByKey[key] = {
      key,
      name: operation.operationHeadersExtension.name,
      in: ParameterLocations.Header,
      required: true,
      editor: Constants.EDITOR.DICTIONARY,
      editorOptions: {
        valueType: Constants.SWAGGER.TYPE.STRING,
      },
      summary: operation.operationHeadersExtension.summary,
      description: operation.operationHeadersExtension.description,
      type: Constants.SWAGGER.TYPE.OBJECT,
    };
  }

  if (stepDefinition) {
    if (stepDefinition.inputs) {
      if (includeNotificationParameters && equals(type, Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION)) {
        const updatedStepDefinitionInputs = { ...stepDefinition.inputs, host: undefined, authentication: undefined };
        const loadedInputParameters = updateParameterWithValues(
          create(['inputs', '$']) as string,
          updatedStepDefinitionInputs,
          '' /* parameterLocation */,
          unmap(inputParametersByKey),
          true /* createInvisibleParameter */,
          false /* useDefault */
        );

        inputParametersByKey = map(loadedInputParameters, 'key');
      } else {
        const operationPath = removeConnectionPrefix(operation.path);
        const basePath = swagger.api.basePath;
        const loadedInputParameters = loadInputValuesFromDefinition(
          stepDefinition.inputs,
          unmap(inputParametersByKey),
          operationPath,
          basePath as string,
          false /* shouldUsePathTemplateFormat */
        );
        inputParametersByKey = map(loadedInputParameters, 'key');
      }
    }
  } else {
    loadParameterValuesFromDefault(inputParametersByKey);
  }

  const inputParametersAsArray = unmap(inputParametersByKey);
  const allParametersAsArray = toParameterInfoMap(inputParametersAsArray, stepDefinition, nodeId);

  const defaultParameterGroup = {
    id: ParameterGroupKeys.DEFAULT,
    description: '',
    parameters: allParametersAsArray,
  };
  const parameterGroups = { [ParameterGroupKeys.DEFAULT]: defaultParameterGroup };

  if (isTrigger && !isWebhookOperation && !(includeNotificationParameters && swagger.getRelatedNotificationOperationId(operationId))) {
    addRecurrenceParametersInGroup(parameterGroups, { type: RecurrenceType.Basic }, stepDefinition);
  }

  const dynamicInput = inputParametersAsArray.find((parameter) => parameter.dynamicSchema);

  defaultParameterGroup.parameters = getParametersSortedByVisibility(defaultParameterGroup.parameters);

  const nodeInputs = { dynamicLoadStatus: dynamicInput ? DynamicLoadStatus.NOTSTARTED : undefined, parameterGroups };
  return { inputs: nodeInputs, dependencies: getInputDependencies(nodeInputs, inputParametersAsArray) };
};

export const getOutputParametersFromSwagger = (
  swagger: SwaggerParser,
  operationInfo: NodeOperation,
  nodeInputs: NodeInputs,
  splitOnValue?: string
): NodeOutputsWithDependencies => {
  const { operationId, connectorId } = operationInfo;
  const operationOutputs = swagger.getOutputParameters(operationId, {
    expandArrayOutputsDepth: Constants.MAX_INTEGER_NUMBER,
    includeParentObject: true,
  });

  if (!operationOutputs) {
    throw new Error(`Failed to parse operation outputs from swagger for connector - ${connectorId}`);
  }

  const updatedOutputs = updateOutputsForBatchingTrigger(operationOutputs, splitOnValue);
  const nodeOutputs: Record<string, OutputInfo> = {};
  let dynamicOutput: OutputParameter | undefined;
  for (const [key, output] of Object.entries(updatedOutputs)) {
    if (!output.dynamicSchema) {
      nodeOutputs[key] = toOutputInfo(output);
    } else if (!dynamicOutput) {
      dynamicOutput = output;
    }
  }

  const dependencies: Record<string, DependencyInfo> = {};
  if (dynamicOutput?.dynamicSchema) {
    if (isDynamicSchemaExtension(dynamicOutput.dynamicSchema)) {
      dependencies[dynamicOutput.key] = {
        definition: dynamicOutput.dynamicSchema,
        dependencyType: 'ApiSchema',
        dependentParameters: getDependentParameters(nodeInputs, dynamicOutput.dynamicSchema.extension.parameters ?? {}),
        parameter: dynamicOutput,
      };
    }
  }

  return { outputs: { dynamicLoadStatus: dynamicOutput ? DynamicLoadStatus.NOTSTARTED : undefined, outputs: nodeOutputs }, dependencies };
};

const getOperationInfo = async (
  nodeId: string,
  operation: LogicAppsV2.ApiConnectionAction,
  references: ConnectionReferences
): Promise<OperationInfo> => {
  const { type } = operation;
  switch (type.toLowerCase()) {
    case Constants.NODE.TYPE.API_CONNECTION:
    case Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION:
    case Constants.NODE.TYPE.API_CONNECTION_WEBHOOK:
      const reference = references[getLegacyConnectionReferenceKey(operation) ?? ''];
      if (!reference || !reference.api || !reference.api.id) {
        throw new Error(`Incomplete information for operation '${nodeId}'`);
      }
      const connectorId = reference.api.id;
      const { parsedSwagger } = await getConnectorWithSwagger(connectorId);
      const operationInputInfo = getOperationInputInfoFromDefinition(parsedSwagger, operation, type);

      if (!operationInputInfo) {
        throw new Error('Could not fetch operation input info from swagger and definition');
      }

      const operationId = getOperationIdFromDefinition(operationInputInfo, parsedSwagger);

      if (!operationId) {
        throw new Error('Operation Id cannot be determined from definition and swagger');
      }

      return { connectorId, operationId };

    default:
      throw new Error(`Operation type '${type}' does not support swagger`);
  }
};

const getOperationIdFromDefinition = (operationInputInfo: OperationInputInfo, swagger: SwaggerParser): string | undefined => {
  const operations = unmap(swagger.getOperations());

  if (!operationInputInfo.path && (!operationInputInfo.pathTemplate || !operationInputInfo.pathTemplate.template)) {
    throw new Error('Invalid operationInputInfo');
  }

  const path = operationInputInfo.path ?? operationInputInfo?.pathTemplate?.template ?? '';
  return getOperationIdFromSwagger(operationInputInfo.method, path, operations);
};

function getOperationIdFromSwagger(operationMethod: string, operationPath: string, swaggerOperations: Operation[]): string | undefined {
  const operations = copyArray(swaggerOperations) as Operation[];
  let operationId: string | undefined;

  const filteredOperations: any = operations
    .filter((operation) => equals(operation.method, operationMethod))
    .map((operation) => {
      operation.path = removeConnectionPrefix(operation.path);

      const pathKeys = operation.path.match(/{(.*?)}/g);

      if (pathKeys) {
        pathKeys.forEach((key: string) => {
          operation.path = operation.path.replace(key, '.*');
        });
      }

      operation.path = escapeRegExSpecialCharacters(operation.path);
      operation.path = addStartAndEndMarkers(operation.path);

      return {
        operationId: operation.operationId,
        path: operation.path,
        method: operation.method,
      };
    });

  if (filteredOperations) {
    // Ignore unencoded newline characters in the operation path since
    // the regular expression used below does not match across
    // multiple lines.
    operationPath = operationPath.replace(/[\r\n]/g, '');

    // Sort the operations by path so that those with more specific regexes
    // will come first.
    // Example:
    //     \/datasets\/default\/files/.*
    //     \/datasets\/default\/files/.*/content
    // The second regex, with a longer path, should come first, as a path that
    // looked like /datasets/default/files/{parameter}/content would match both.
    filteredOperations.sort((operation1: any, operation2: any) => {
      return operation2.path.length - operation1.path.length;
    });

    for (const operation of filteredOperations) {
      const regExp = new RegExp(operation.path);

      if (regExp.test(operationPath)) {
        operationId = operation.operationId;
        break;
      }
    }
  }

  return operationId;
}

function getOperationInputInfoFromDefinition(swagger: SwaggerParser, operation: any, type: string): OperationInputInfo | null | undefined {
  const stepInputs = operation.inputs;
  if (!stepInputs) {
    return undefined;
  }

  switch (type.toLowerCase()) {
    case Constants.NODE.TYPE.API_CONNECTION:
      return { method: stepInputs.method, path: stepInputs.path };

    case Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION:
      return { method: stepInputs.fetch.method, pathTemplate: stepInputs.fetch.pathTemplate };

    case Constants.NODE.TYPE.HTTP:
      // const swaggerEndpointUrl = operation.metadata['apiDefinitionUrl'];
      // TODO - Make the call to get the http swagger
      return { method: stepInputs.method, path: extractPathFromUri(stepInputs.uri, swagger.api.basePath as string) };

    case Constants.NODE.TYPE.API_CONNECTION_WEBHOOK:
      return { method: Constants.POST, path: stepInputs.path };

    default:
      return undefined;
  }
}

function extractPathFromUri(baseUri: string, path: string): string {
  let basePath = path;
  let uri = baseUri;
  if (basePath && !startsWith(basePath, '/')) {
    throw new Error(`Basepath specified in swagger '${basePath}' is not according to swagger specs. It does not start with '/'`);
  }

  // NOTE(ramacfar): Protocol should always be added while saving HTTP+Swagger, some older workflows may not have had it. Backcompat.
  if (!/^\s*(?:https?|wss?):/i.test(uri)) {
    uri = `https://${uri}`;
  }

  basePath = basePath && !equals(basePath, '/') ? basePath : '';

  const pathname = parsePathnameFromUri(uri);

  if (basePath && !startsWith(pathname, basePath)) {
    throw new Error(`Basepath specified in swagger '${basePath}' not found in pathname '${pathname}'`);
  }

  return pathname.slice(basePath.length);
}

/**
 * Extracts the path from a URI which may contain a template expression
 * which may contain ? to denote optional properties.
 *
 * Question marks are reserved characters for URI parsing since they
 * mark the beginning of a query string.
 *
 * Template expression with optional property after function:
 * https://microsoft.com/api/invoke?id=@{triggerBody()?['ID']}
 *
 * Template expression with optional property after property:
 * https://microsoft.com/api/invoke?id=@{triggerBody()['value']?['nextLink']}
 *
 * @arg {string} uri - A string with the URI which may be a template expression
 * @return {string}
 */
function parsePathnameFromUri(uri: string): string {
  if (isTemplateExpression(uri)) {
    const { pathname } = parsePathnameAndQueryKeyFromUri(uri.replace(/\]\?\[/g, ']%3F[').replace(/\)\?\[/g, ')%3F['));
    return pathname.replace(/\]%3F\[/g, ']?[').replace(/\)%3F\[/g, ')?[');
  } else {
    const { pathname } = parsePathnameAndQueryKeyFromUri(uri);
    return pathname;
  }
}

/**
 * Adds regex characters to strict the start and end matches
 * @arg {string} pattern - The regular expression.
 * @return {string} - The regular expression stamped with start and end markers.
 */
function addStartAndEndMarkers(pattern: string): string {
  return `^${pattern}$`;
}

/**
 * Escapes all the special characters used by Regular Expression in a given pattern
 * @arg {string} pattern - The pattern whose special characters need to be escaped.
 * @return {string} - transformed value after escaping the special characters.
 */
function escapeRegExSpecialCharacters(pattern: string): string {
  return pattern.replace(/([+?^=!:${}()|[\]/\\])/g, '\\$1');
}
