import { workflowLocationKey, workflowSubscriptionIdKey, workflowResourceGroupNameKey } from '../../../constants';
import { isEmptyString } from '@microsoft/utils-logic-apps';
import type { Parameter, ConnectionReferenceModel } from '@microsoft/vscode-extension';

const DELIMITER = '/';
const SUBSCRIPTION_INDEX = 2;
const API_LOCATION_INDEX = 6;
const CONNECTION_RESOURCE_GROUP_INDEX = 4;

/**
 * Parameterizes connection reference
 * @param connection The connection reference to parameterize.
 * @param referenceKey The reference key of the connection.
 * @param parametersObject The parameters object.
 * @returns parameterized connection reference
 */
export function parameterizeConnectionReference(
  connection: ConnectionReferenceModel,
  referenceKey: string,
  parametersObject: any
): ConnectionReferenceModel {
  connection.api.id = parameterizeApiId(connection.api.id);
  connection.connection.id = parameterizeConnectionId(connection.connection.id);
  connection.connectionRuntimeUrl = parameterizeConnectionRuntimeUrl(connection.connectionRuntimeUrl, referenceKey, parametersObject);
  connection.authentication = parameterizeAuthentication(connection.authentication, referenceKey, parametersObject);
  return connection;
}

function parameterizeApiId(id: string): string {
  const segments = id.split(DELIMITER);
  segments[SUBSCRIPTION_INDEX] = getAppSettingToken(workflowSubscriptionIdKey);
  segments[API_LOCATION_INDEX] = getAppSettingToken(workflowLocationKey);
  return segments.join(DELIMITER);
}

function parameterizeConnectionId(id: string): string {
  const segments = id.split(DELIMITER);
  segments[SUBSCRIPTION_INDEX] = getAppSettingToken(workflowSubscriptionIdKey);
  segments[CONNECTION_RESOURCE_GROUP_INDEX] = getAppSettingToken(workflowResourceGroupNameKey);
  return segments.join(DELIMITER);
}

function parameterizeConnectionRuntimeUrl(runtimeUrl: string, referenceKey: string, parametersObject: any): string {
  if (isEmptyString(runtimeUrl)) {
    return runtimeUrl;
  }

  const propertyName = getPropertyName('ConnectionRuntimeUrl', referenceKey);
  return parameterizeProperty(propertyName, runtimeUrl, 'String', parametersObject);
}

function parameterizeAuthentication(authentication: any, referenceKey: string, parametersObject: any): any {
  const propertyName = getPropertyName('Authentication', referenceKey);
  return parameterizeProperty(propertyName, authentication, 'Object', parametersObject);
}

function getPropertyName(name: string, key: string): string {
  return `${key}${name}`;
}

function parameterizeProperty(name: string, value: any, type: string, parametersObject: any): any {
  parametersObject[name] = GetParameter(type, value);
  return getParametersToken(name);
}

function getAppSettingToken(name: string): string {
  return `@appsetting('${name}')`;
}

function getParametersToken(name: string): string {
  return `@parameters('${name}')`;
}

function GetParameter(type: string, value: any): Parameter {
  return {
    type: type,
    value: value,
  };
}
