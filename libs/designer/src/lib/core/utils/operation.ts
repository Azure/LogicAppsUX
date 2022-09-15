/* eslint-disable no-param-reassign */

/* eslint-disable no-case-declarations */
import Constants from '../../common/constants';
import type { ConnectionReferences } from '../../common/models/workflow';
import { getLegacyConnectionReferenceKey } from '../actions/bjsworkflow/connections';
import { getOperationSettings } from '../actions/bjsworkflow/settings';
import { getConnectorWithSwagger } from '../queries/connections';
import type { NodeData } from '../state/operation/operationMetadataSlice';
import { initializeOperationInfo } from '../state/operation/operationMetadataSlice';
import { LogEntryLevel, LoggerService } from '@microsoft-logic-apps/designer-client-services';
import { isTemplateExpression } from '@microsoft-logic-apps/parsers';
import type { OperationInfo } from '@microsoft-logic-apps/utils';
import { equals, parsePathnameAndQueryKeyFromUri, startsWith, unmap } from '@microsoft-logic-apps/utils';
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
): Promise<NodeData[] | undefined> => {
  try {
    const operationInfo = await getOperationInfo(nodeId, operation as LogicAppsV2.ApiConnectionAction, references);

    if (operationInfo) {
      dispatch(initializeOperationInfo({ id: nodeId, ...operationInfo, type: operation.type, kind: operation.kind }));

      getOperationSettings(isTrigger, operation.type, operation.kind, /* manifest */ undefined, operation);
      /*const nodeInputs = getInputParametersFromManifest(nodeId, manifest, operation);
        const { nodeOutputs, dynamicOutput } = getOutputParametersFromManifest(
          manifest,
          isTrigger,
          nodeInputs,
          settings.splitOn?.value?.value
        );
        const nodeDependencies = getParameterDependencies(manifest, nodeInputs, nodeOutputs, dynamicOutput);
  
        const childGraphInputs = processChildGraphAndItsInputs(manifest, operation);
  
        return [{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings, manifest }, ...childGraphInputs]; */
    }

    return;
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

const getOperationIdFromDefinition = (operationInputInfo: OperationInputInfo, swagger: any): string | undefined => {
  const operations = unmap(swagger.getOperations());

  if (!operationInputInfo.path && (!operationInputInfo.pathTemplate || !operationInputInfo.pathTemplate.template)) {
    throw new Error('Invalid operationInputInfo');
  }

  const path = operationInputInfo.path ?? operationInputInfo?.pathTemplate?.template ?? '';
  return getOperationIdFromSwagger(operationInputInfo.method, path, operations);
};

export function getOperationIdFromSwagger(operationMethod: string, operationPath: string, swaggerOperations: any[]): string | undefined {
  let operations = swaggerOperations,
    operationId: string | undefined;

  operations = operations
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

  if (operations) {
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
    operations.sort((operation1, operation2) => {
      return operation2.path.length - operation1.path.length;
    });

    for (const operation of operations) {
      const regExp = new RegExp(operation.path);

      if (regExp.test(operationPath)) {
        operationId = operation.operationId;
        break;
      }
    }
  }

  return operationId;
}

function getOperationInputInfoFromDefinition(swagger: any, operation: any, type: string): OperationInputInfo | null | undefined {
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
 * Gets the operation path value stripping off the connector information
 * @arg {string} pathTemplate - the operation path template as in the swagger.
 * @return {string} - The operation path after stripping connector information.
 */
export function removeConnectionPrefix(pathTemplate: string): string {
  const pathPrefix = '{connectionId}';
  let updatedTemplate = pathTemplate;

  updatedTemplate = updatedTemplate.replace(pathPrefix, '');
  updatedTemplate = updatedTemplate.replace('//', '/');

  return updatedTemplate;
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
