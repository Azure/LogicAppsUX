import constants from '../../../common/constants';
import type { ConnectionReference } from '../../../common/models/workflow';
import { getConnection } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import {
  ApiManagementService,
  FunctionService,
  OperationManifestService,
  WorkflowService,
  isServiceProviderOperation,
  getIntl,
  ConnectionParameterTypes,
  ResourceIdentityType,
  equals,
  ConnectionType,
  getResourceName,
  getRecordEntry,
  getPropertyValue,
} from '@microsoft/logic-apps-shared';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import type {
  Connection,
  ConnectionParameterSet,
  ConnectionParameterSets,
  Connector,
  ManagedIdentity,
  OperationManifest,
} from '@microsoft/logic-apps-shared';

export function getConnectionId(state: ConnectionsStoreState, nodeId: string): string {
  return getConnectionReference(state, nodeId)?.connection?.id ?? '';
}

export function getConnectionReference(state: ConnectionsStoreState, nodeId: string): ConnectionReference {
  const { connectionsMapping, connectionReferences } = state;
  return getRecordEntry(connectionReferences, getRecordEntry(connectionsMapping, nodeId) ?? '') ?? mockConnectionReference;
}

const mockConnectionReference: ConnectionReference = {
  api: { id: 'apiId' },
  connection: { id: 'connectionId' },
};

export async function isConnectionReferenceValid(
  operationInfo: NodeOperation,
  reference: ConnectionReference | undefined
): Promise<boolean> {
  const { type, kind, connectorId, operationId } = operationInfo;
  if (OperationManifestService().isSupported(type, kind)) {
    const manifest = await getOperationManifest({ connectorId, operationId });
    if (!manifest?.properties?.connection?.required) {
      return true;
    }
  }
  if (!reference) {
    return false;
  }

  try {
    const connection = await getConnection(reference.connection.id, connectorId, /* fetchResourceIfNeeded */ true);
    return !!connection && !connection.properties?.statuses?.some((status) => equals(status.status, 'error'));
  } catch (error: any) {
    return false;
  }
}

export function getAssistedConnectionProps(connector: Connector, manifest?: OperationManifest): AssistedConnectionProps | undefined {
  const hasAzureConnection = connector.properties.capabilities?.includes('azureConnection') ?? false;

  if (!hasAzureConnection && !manifest) {
    return undefined;
  }

  const intl = getIntl();
  const headers = [
    intl.formatMessage({ defaultMessage: 'Name', id: 'AGCm1p', description: 'Header for resource name' }),
    intl.formatMessage({ defaultMessage: 'Resource Group', id: '/yYyOq', description: 'Header for resource group name' }),
    intl.formatMessage({ defaultMessage: 'Location', id: 'aSnCCB', description: 'Header for resource lcoation' }),
  ];
  if (manifest?.properties.connection?.type === ConnectionType.Function) {
    const functionAppsCallback = () => FunctionService().fetchFunctionApps();
    const fetchSubResourcesCallback = (functionApp?: any) => FunctionService().fetchFunctionAppsFunctions(functionApp.id ?? '');
    const functionAppsLoadingText = intl.formatMessage({
      defaultMessage: 'Loading Function Apps...',
      id: 'LCXZLM',
      description: 'Text for loading function apps',
    });

    const functionAppsLabel = intl.formatMessage({
      defaultMessage: 'Select a function app function',
      id: 'Xkt2vD',
      description: 'Label for function app selection',
    });

    const getColumns = (functionApp: any) => [getResourceName(functionApp), functionApp?.properties?.resourceGroup, functionApp?.location];

    const getSubResourceName = (azureFunction: any) => getResourceName(azureFunction).split('/')?.[1] ?? azureFunction?.id;

    return {
      resourceType: 'functionApps',
      subResourceType: 'functionAppFunctions',
      titleText: functionAppsLabel,
      headers,
      getColumns,
      getResourcesCallback: functionAppsCallback,
      loadingText: functionAppsLoadingText,
      getSubResourceName,
      fetchSubResourcesCallback,
    };
  }
  if (manifest?.properties.connection?.type === ConnectionType.ApiManagement) {
    const apiInstancesCallback = () => ApiManagementService().fetchApiManagementInstances();
    const apisCallback = (apim?: any) => ApiManagementService().fetchApisInApiM(apim.id ?? '');
    const apimInstancesLoadingText = intl.formatMessage({
      defaultMessage: 'Loading Api Management service instances...',
      id: 'LV/BTE',
      description: 'Text for loading apim service instances',
    });

    const apisLabel = intl.formatMessage({
      defaultMessage: 'Select an API from an API Management instance',
      id: '27Nhhv',
      description: 'Label for API selection',
    });

    const getColumns = (apimInstance: any) => [apimInstance?.name, apimInstance?.id.split('/')[4], apimInstance?.location];

    return {
      resourceType: 'apimInstances',
      subResourceType: 'apimApis',
      titleText: apisLabel,
      headers,
      getColumns,
      getResourcesCallback: apiInstancesCallback,
      loadingText: apimInstancesLoadingText,
      getSubResourceName: (api: any) => api.name,
      fetchSubResourcesCallback: apisCallback,
    };
  }

  return undefined;
}

export async function getConnectionParametersForAzureConnection(
  connectionType?: ConnectionType,
  selectedSubResource?: any,
  parameterValues?: Record<string, any>,
  isMultiAuthConnection?: boolean // TODO - Should remove when backend bits are ready for multi-auth in resource picker connections
): Promise<any> {
  if (connectionType === ConnectionType.Function) {
    const functionId = selectedSubResource?.id;
    const triggerUrl = selectedSubResource?.properties?.invoke_url_template;
    const isQueryString = isMultiAuthConnection ? equals(getPropertyValue(parameterValues ?? {}, 'type'), 'querystring') : true;
    let updatedParameterValues = { ...parameterValues };

    if (isQueryString) {
      const authCodeValue = await FunctionService().fetchFunctionKey(functionId);
      updatedParameterValues = isMultiAuthConnection
        ? { ...updatedParameterValues, value: authCodeValue }
        : { ...updatedParameterValues, authentication: { type: 'QueryString', name: 'Code', value: authCodeValue } };
    }

    return {
      ...updatedParameterValues,
      function: { id: functionId },
      triggerUrl,
    };
    // biome-ignore lint/style/noUselessElse: needed for future implementation
  } else if (connectionType === ConnectionType.ApiManagement) {
    // TODO - Need to find apps which have authentication set, check with Alex.
    const apimApiId = selectedSubResource?.id;
    const { api } = await ApiManagementService().fetchApiMSwagger(apimApiId);
    const baseUrl = api.host ? (api.schemes?.length ? `${api.schemes.at(-1)}://${api.host}` : `http://${api.host}`) : 'NotFound';
    const fullUrl = api.basePath ? `${baseUrl}${api.basePath}` : baseUrl;
    const subscriptionKey = (api.securityDefinitions?.apiKeyHeader as any)?.name ?? 'NotFound';

    return {
      ...parameterValues,
      apiId: apimApiId,
      baseUrl: fullUrl,
      subscriptionKey,
    };
  }

  return parameterValues;
}

export function getSupportedParameterSets(
  parameterSets: ConnectionParameterSets | undefined,
  operationType: string,
  connectorCapabilities: string[] | undefined
): ConnectionParameterSets | undefined {
  if (!parameterSets) {
    return undefined;
  }

  const identity = WorkflowService().getAppIdentity?.();
  return {
    ...parameterSets,
    values: parameterSets.values.filter((parameterSet) => {
      return containsManagedIdentityParameter(parameterSet)
        ? isManagedIdentitySupported(operationType, connectorCapabilities, identity)
        : true;
    }),
  };
}

export function isIdentityPresentInLogicApp(identity: string, managedIdentity: ManagedIdentity | undefined): boolean {
  const identitiesInLogicApp = [];
  const type = managedIdentity?.type;
  if (equals(type, ResourceIdentityType.SYSTEM_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    identitiesInLogicApp.push(constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY);
  }

  if (equals(type, ResourceIdentityType.USER_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    for (const identity of Object.keys(managedIdentity?.userAssignedIdentities ?? {})) {
      identitiesInLogicApp.push(identity);
    }
  }

  return identitiesInLogicApp.includes(identity);
}

// NOTE: This method is specifically for Multi-Auth type connectors.
export function isConnectionMultiAuthManagedIdentityType(connection?: Connection | null, connector?: Connector): boolean {
  const connectionParameterValueSet = (connection?.properties as any)?.parameterValueSet;
  const connectorConnectionParameterSets = connector?.properties?.connectionParameterSets;

  if (connectorConnectionParameterSets && connectionParameterValueSet) {
    /* NOTE: Look into the parameterValueSet from the connector manifest that has the same name as the parameterValueSet of the connection to see if
          it has a managedIdentity type parameter. */
    const parameterValueSetWithSameName = connectorConnectionParameterSets.values?.filter(
      (value) => value.name === connectionParameterValueSet.name
    )[0];
    const parameters = parameterValueSetWithSameName?.parameters || {};
    for (const parameter of Object.keys(parameters)) {
      if (parameters[parameter].type === ConnectionParameterTypes.managedIdentity) {
        return true;
      }
    }
  }
  return false;
}

const ALT_PARAMETER_VALUE_TYPE = 'Alternative';
// NOTE: This method is specifically for Single-Auth type connectors.
export function isConnectionSingleAuthManagedIdentityType(connection: Connection): boolean {
  return !!(connection?.properties?.parameterValueType === ALT_PARAMETER_VALUE_TYPE) && !isMultiAuthConnection(connection);
}

function isManagedIdentitySupported(operationType: string, connectorCapabilities: string[] = [], identity?: ManagedIdentity): boolean {
  if (isServiceProviderOperation(operationType)) {
    return (
      isUserAssignedIdentitySupportedForInApp(connectorCapabilities) ||
      !!identity?.type?.toLowerCase()?.includes(ResourceIdentityType.SYSTEM_ASSIGNED.toLowerCase())
    );
  }

  return true;
}

function isUserAssignedIdentitySupportedForInApp(connectorCapabilities: string[] = []) {
  return !!connectorCapabilities?.find((capability) => equals(capability, 'supportsUserAssignedIdentity'));
}

function isMultiAuthConnection(connection: Connection | undefined): boolean {
  return connection !== undefined && (connection.properties as any).parameterValueSet !== undefined;
}

function containsManagedIdentityParameter(parameterSet: ConnectionParameterSet): boolean {
  const { parameters } = parameterSet;
  return Object.keys(parameters).some(
    (parameter) =>
      parameters[parameter].type === ConnectionParameterTypes.managedIdentity ||
      equals(parameters[parameter].uiDefinition?.constraints?.default, 'managedserviceidentity')
  );
}
