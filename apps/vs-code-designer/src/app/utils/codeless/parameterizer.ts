import { isEmptyString } from '@microsoft/logic-apps-shared';
import { workflowLocationKey, workflowSubscriptionIdKey, workflowResourceGroupNameKey } from '../../../constants';
import type {
  ConnectionReferenceModel,
  ServiceProviderConnectionModel,
  FunctionConnectionModel,
  APIManagementConnectionModel,
  Parameter,
  ConnectionsData,
} from '@microsoft/vscode-extension';

const DELIMITER = '/';
const SUBSCRIPTION_INDEX = 2;

/**
 * Managed API Connection Constants
 */
const MANAGED_API_LOCATION_INDEX = 6;
const MANAGED_CONNECTION_RESOURCE_GROUP_INDEX = 4;

/**
 * Function Connection Constants
 */
const FUNCTION_RESOURCE_GROUP_INDEX = 4;
const FUNCTION_SITE_NAME_INDEX = 8;

/**
 * API Management Connection Constants
 */
const API_MANAGEMENT_RESOURCE_GROUP_INDEX = 4;
const API_MANAGEMENT_SERVICE_NAME_INDEX = 8;

/**
 * Parameterizes connection
 * @param connection The connection reference to parameterize.
 * @param referenceKey The reference key of the connection.
 * @param parametersObject The parameters object.
 * @param settingsRecord The settings record.
 * @returns parameterized connection reference
 */
export function parameterizeConnection(
  connection: ConnectionReferenceModel | ServiceProviderConnectionModel | FunctionConnectionModel | APIManagementConnectionModel,
  referenceKey: string,
  parametersObject: any,
  settingsRecord: Record<string, string>
): ConnectionReferenceModel | ServiceProviderConnectionModel | FunctionConnectionModel | APIManagementConnectionModel {
  if (isConnectionReferenceModel(connection)) {
    connection = getParameterizedConnectionReferenceModel(connection, referenceKey, parametersObject, settingsRecord);
  } else if (isFunctionConnectionModel(connection)) {
    connection = getParameterizedFunctionConnectionModel(connection, referenceKey, parametersObject);
  } else if (isAPIManagementConnectionModel(connection)) {
    connection = getParameterizedAPIManagementConnectionModel(connection, referenceKey, parametersObject);
  } else if (isServiceProviderConnectionModel(connection)) {
    /* no-op */
  } else {
    console.error('parameterizer: connection is not supported.');
  }

  return connection;
}

/**
 * Checks if the connections data is parameterized.
 * @param {ConnectionsData} connectionsData - The connections data object.
 * @returns A boolean indicating whether the connections data is parameterized or not.
 */
export function isConnectionsParameterized(connectionsData: ConnectionsData): boolean {
  for (const connectionType in connectionsData) {
    if (connectionType !== 'serviceProviderConnections') {
      const connectionTypeJson = connectionsData[connectionType];
      for (const connectionKey in connectionTypeJson) {
        const connection = connectionTypeJson[connectionKey];
        if (isConnectionReferenceModel(connection)) {
          if (connection.api.id.includes('@appsetting') || connection.connectionRuntimeUrl.includes('@parameters')) {
            return true;
          }
        } else if (isFunctionConnectionModel(connection)) {
          if (connection.function.id.includes('@parameters') || connection.triggerUrl.includes('@parameters')) {
            return true;
          }
        } else if (isAPIManagementConnectionModel(connection)) {
          if (connection.apiId.includes('@parameters') || connection.baseUrl.includes('@parameters')) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Parameterize Managed API connection.
 * @param connection The connection.
 * @param referenceKey The connection reference key.
 * @param parametersObject The parameters object.
 * @param settingsRecord The settings record.
 * @returns Parameterized Managed API connection.
 */
function getParameterizedConnectionReferenceModel(
  connection: ConnectionReferenceModel,
  referenceKey: string,
  parametersObject: any,
  settingsRecord: Record<string, string>
): ConnectionReferenceModel {
  parameterizeManagedApiId(connection);
  parameterizeManagedConnectionId(connection);
  parameterizeManagedConnectionRuntimeUrl(connection, referenceKey, parametersObject, settingsRecord);
  parameterizeManagedConnectionAuthentication(connection, referenceKey, parametersObject);
  return connection;
}

/**
 * Parameterize Function connection.
 * @param connection The connection.
 * @param referenceKey The connection reference key.
 * @param parametersObject The parameters object.
 * @returns Parameterized Function connection.
 */
function getParameterizedFunctionConnectionModel(
  connection: FunctionConnectionModel,
  referenceKey: string,
  parametersObject: any
): FunctionConnectionModel {
  parameterizeFunctionId(connection, referenceKey, parametersObject);
  parameterizeFunctionTriggerUrl(connection, referenceKey, parametersObject);

  return connection;
}

/**
 * Parameterize API Management connection.
 * @param connection The connection.
 * @param referenceKey The connection reference key.
 * @param parametersObject The parameters object.
 * @returns Parameterized API Management connection.
 */
function getParameterizedAPIManagementConnectionModel(
  connection: APIManagementConnectionModel,
  referenceKey: string,
  parametersObject: any
): APIManagementConnectionModel {
  parameterizeApiManagementApiId(connection, referenceKey, parametersObject);
  parameterizeApiManagementBaseUrl(connection, referenceKey, parametersObject);

  return connection;
}

function parameterizeManagedApiId(connection: ConnectionReferenceModel): void {
  const segments = connection.api.id.split(DELIMITER);
  segments[SUBSCRIPTION_INDEX] = getAppSettingReference(workflowSubscriptionIdKey, true);
  segments[MANAGED_API_LOCATION_INDEX] = getAppSettingReference(workflowLocationKey, true);

  connection.api.id = segments.join(DELIMITER);
}

function parameterizeManagedConnectionId(connection: ConnectionReferenceModel): void {
  const segments = connection.connection.id.split(DELIMITER);
  segments[SUBSCRIPTION_INDEX] = getAppSettingReference(workflowSubscriptionIdKey, true);
  segments[MANAGED_CONNECTION_RESOURCE_GROUP_INDEX] = getAppSettingReference(workflowResourceGroupNameKey, true);
  connection.connection.id = segments.join(DELIMITER);
}

function parameterizeManagedConnectionRuntimeUrl(
  connection: ConnectionReferenceModel,
  referenceKey: string,
  parametersObject: any,
  settingsRecord: Record<string, string>
): void {
  if (isEmptyString(connection.connectionRuntimeUrl)) {
    return;
  }

  const propertyName = getPropertyName('ConnectionRuntimeUrl', referenceKey);
  settingsRecord[propertyName] = connection.connectionRuntimeUrl;
  const appSettingReference = getAppSettingReference(propertyName, false);
  connection.connectionRuntimeUrl = getParameterizedProperty(propertyName, appSettingReference, 'String', parametersObject);
}

function parameterizeManagedConnectionAuthentication(
  connection: ConnectionReferenceModel,
  referenceKey: string,
  parametersObject: any
): void {
  const propertyName = getPropertyName('Authentication', referenceKey);
  connection.authentication = getParameterizedProperty(propertyName, connection.authentication, 'Object', parametersObject);
}

function parameterizeFunctionId(connection: FunctionConnectionModel, referenceKey: string, parametersObject: any): void {
  const segments = connection.function.id.split(DELIMITER);
  segments[SUBSCRIPTION_INDEX] = getAppSettingReference(workflowSubscriptionIdKey, true);

  setParameterizedPropertyForSegment(
    segments,
    FUNCTION_RESOURCE_GROUP_INDEX,
    referenceKey,
    'ResourceGroup',
    'String',
    parametersObject,
    true
  );
  setParameterizedPropertyForSegment(segments, FUNCTION_SITE_NAME_INDEX, referenceKey, 'SiteName', 'String', parametersObject, true);

  connection.function.id = segments.join(DELIMITER);
}

function parameterizeApiManagementApiId(connection: APIManagementConnectionModel, referenceKey: string, parametersObject: any): void {
  const segments = connection.apiId.split(DELIMITER);
  segments[SUBSCRIPTION_INDEX] = getAppSettingReference(workflowSubscriptionIdKey, true);

  setParameterizedPropertyForSegment(
    segments,
    API_MANAGEMENT_RESOURCE_GROUP_INDEX,
    referenceKey,
    'ResourceGroup',
    'String',
    parametersObject,
    true
  );
  setParameterizedPropertyForSegment(
    segments,
    API_MANAGEMENT_SERVICE_NAME_INDEX,
    referenceKey,
    'ServiceName',
    'String',
    parametersObject,
    true
  );

  connection.apiId = segments.join(DELIMITER);
}

function parameterizeFunctionTriggerUrl(connection: FunctionConnectionModel, referenceKey: string, parametersObject: any): void {
  const propertyName = getPropertyName('TriggerUrl', referenceKey);
  connection.triggerUrl = getParameterizedProperty(propertyName, connection.triggerUrl, 'String', parametersObject);
}

function parameterizeApiManagementBaseUrl(connection: APIManagementConnectionModel, referenceKey: string, parametersObject: any): void {
  const propertyName = getPropertyName('BaseUrl', referenceKey);
  connection.baseUrl = getParameterizedProperty(propertyName, connection.baseUrl, 'String', parametersObject);
}

function getPropertyName(name: string, key: string): string {
  return `${key}-${name}`;
}

function getParameterizedProperty(name: string, value: any, type: string, parametersObject: any, interpolated = false): any {
  parametersObject[name] = getParameter(type, value);
  return getParameterReference(name, interpolated);
}

function setParameterizedPropertyForSegment(
  segments: string[],
  segmentIndex: number,
  referenceKey: string,
  propertyName: string,
  type: string,
  parametersObject: any,
  interpolated = false
): void {
  const sitePropertyName = getPropertyName(propertyName, referenceKey);
  const parameterizedProperty = getParameterizedProperty(sitePropertyName, segments[segmentIndex], type, parametersObject, interpolated);

  segments[segmentIndex] = parameterizedProperty;
}

/**
 * Gets the app setting reference @appsetting('name')
 * @param name The name of the app setting
 * @param interpolated The flag for interpolated string, add brackets.
 */
function getAppSettingReference(name: string, interpolated = false): string {
  return `@${interpolated ? '{' : ''}appsetting('${name}')${interpolated ? '}' : ''}`;
}

/**
 * Gets the parameter reference @parameter('name')
 * @param name The name of the parameter
 * @param interpolated The flag for interpolated string, add brackets.
 */
function getParameterReference(name: string, interpolated = false): string {
  return `@${interpolated ? '{' : ''}parameters('${name}')${interpolated ? '}' : ''}`;
}

function isConnectionReferenceModel(
  connection: ConnectionReferenceModel | ServiceProviderConnectionModel | FunctionConnectionModel | APIManagementConnectionModel
): connection is ConnectionReferenceModel {
  return 'connection' in connection;
}

function isServiceProviderConnectionModel(
  connection: ConnectionReferenceModel | ServiceProviderConnectionModel | FunctionConnectionModel | APIManagementConnectionModel
): connection is ServiceProviderConnectionModel {
  return 'serviceProvider' in connection;
}

function isFunctionConnectionModel(
  connection: ConnectionReferenceModel | ServiceProviderConnectionModel | FunctionConnectionModel | APIManagementConnectionModel
): connection is FunctionConnectionModel {
  return 'function' in connection;
}

function isAPIManagementConnectionModel(
  connection: ConnectionReferenceModel | ServiceProviderConnectionModel | FunctionConnectionModel | APIManagementConnectionModel
): connection is APIManagementConnectionModel {
  return 'apiId' in connection;
}

function getParameter(type: string, value: any): Parameter {
  return {
    type: type,
    value: value,
  };
}
