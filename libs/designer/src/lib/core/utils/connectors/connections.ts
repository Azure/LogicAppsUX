import constants from '../../../common/constants';
import type { ConnectionReference } from '../../../common/models/workflow';
import { getApiManagementSwagger, getConnection } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import {
  ApiManagementService,
  FunctionService,
  OperationManifestService,
  WorkflowService,
  isServiceProviderOperation,
} from '@microsoft/designer-client-services-logic-apps';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type {
  Connection,
  ConnectionParameterSet,
  ConnectionParameterSets,
  Connector,
  ManagedIdentity,
  OperationManifest,
} from '@microsoft/utils-logic-apps';
import { ConnectionParameterTypes, ResourceIdentityType, equals, ConnectionType } from '@microsoft/utils-logic-apps';

export function getConnectionId(state: ConnectionsStoreState, nodeId: string): string {
  const { connectionsMapping, connectionReferences } = state;
  const reference = connectionReferences[connectionsMapping[nodeId] ?? ''];
  return reference ? reference.connection.id : '';
}

export function getConnectionReference(state: ConnectionsStoreState, nodeId: string): ConnectionReference {
  const { connectionsMapping, connectionReferences } = state;
  return connectionReferences[connectionsMapping[nodeId] ?? ''];
}

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

  const connection = await getConnection(reference.connection.id, connectorId, /* fetchResourceIfNeeded */true);
  return !!connection && !connection.properties?.statuses?.some((status) => equals(status.status, 'error'));
}

export function getAssistedConnectionProps(connector: Connector, manifest?: OperationManifest): AssistedConnectionProps | undefined {
  const hasAzureConnection = connector.properties.capabilities?.includes('azureConnection') ?? false;

  if (!hasAzureConnection && !manifest) {
    return undefined;
  }

  const intl = getIntl();
  const headers = [
    intl.formatMessage({ defaultMessage: 'Name', description: 'Header for resource name' }),
    intl.formatMessage({ defaultMessage: 'Resource Group', description: 'Header for resource group name' }),
    intl.formatMessage({ defaultMessage: 'Location', description: 'Header for resource lcoation' }),
  ];
  if (manifest?.properties.connection?.type === ConnectionType.Function) {
    const functionAppsCallback = () => FunctionService().fetchFunctionApps();
    const functionsCallback = (functionApp?: any) => FunctionService().fetchFunctionAppsFunctions(functionApp.id ?? '');
    const functionAppsLoadingText = intl.formatMessage({
      defaultMessage: 'Loading Function Apps...',
      description: 'Text for loading function apps',
    });

    const functionAppsLabel = intl.formatMessage({
      defaultMessage: 'Select a function app function',
      description: 'Label for function app selection',
    });

    const getColumns = (functionApp: any) => [functionApp?.name, functionApp?.properties?.resourceGroup, functionApp?.location];

    return {
      resourceType: 'functionApps',
      subResourceType: 'functionAppFunctions',
      titleText: functionAppsLabel,
      headers,
      getColumns,
      getResourcesCallback: functionAppsCallback,
      loadingText: functionAppsLoadingText,
      getSubResourceName: (azureFunction: any) => azureFunction.name.split('/')[1],
      fetchSubResourcesCallback: functionsCallback,
    };
  } else if (manifest?.properties.connection?.type === ConnectionType.ApiManagement) {
    const apiInstancesCallback = () => ApiManagementService().fetchApiManagementInstances();
    const apisCallback = (apim?: any) => ApiManagementService().fetchApisInApiM(apim.id ?? '');
    const apimInstancesLoadingText = intl.formatMessage({
      defaultMessage: 'Loading Api Management service instances...',
      description: 'Text for loading apim service instances',
    });

    const apisLabel = intl.formatMessage({
      defaultMessage: 'Select an api from apim instance',
      description: 'Label for api selection',
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

export async function getConnectionParametersForAzureConnection(connectionType?: ConnectionType, selectedSubResource?: any): Promise<any> {
  if (connectionType === ConnectionType.Function) {
    const functionId = selectedSubResource?.id;
    const authCodeValue = await FunctionService().fetchFunctionKey(functionId);
    const triggerUrl = selectedSubResource?.properties?.invoke_url_template;
    return {
      function: { id: functionId },
      triggerUrl,
      authentication: {
        type: 'QueryString',
        name: 'Code',
        value: authCodeValue,
      },
    };
  } else if (connectionType === ConnectionType.ApiManagement) {
    // TODO - Need to find apps which have authentication set, check with Alex.
    const apimApiId = selectedSubResource?.id;
    const { api } = await getApiManagementSwagger(apimApiId);
    const baseUrl = api.host ? (api.schemes?.length ? `${api.schemes.at(-1)}://${api.host}` : `http://${api.host}`) : 'NotFound';
    const fullUrl = api.basePath ? `${baseUrl}${api.basePath}` : baseUrl;
    const subscriptionKey = (api.securityDefinitions?.apiKeyHeader as any)?.name ?? 'NotFound';

    return {
      apiId: apimApiId,
      baseUrl: fullUrl,
      subscriptionKey,
    };
  }

  return {};
}

export function getSupportedParameterSets(
  parameterSets: ConnectionParameterSets | undefined,
  operationType: string
): ConnectionParameterSets | undefined {
  if (!parameterSets) {
    return undefined;
  }

  const identity = WorkflowService().getAppIdentity?.();
  return {
    ...parameterSets,
    values: parameterSets.values.filter((parameterSet) => {
      if (containsManagedIdentityParameter(parameterSet)) {
        return (
          !isServiceProviderOperation(operationType) ||
          identity?.type?.toLowerCase()?.includes(ResourceIdentityType.SYSTEM_ASSIGNED.toLowerCase())
        );
      }

      return true;
    }),
  };
}

export function isIdentityPresentInLogicApp(identity: string, managedIdentity: ManagedIdentity): boolean {
  const identitiesInLogicApp = [];
  const type = managedIdentity.type;
  if (equals(type, ResourceIdentityType.SYSTEM_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    identitiesInLogicApp.push(constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY);
  }

  if (equals(type, ResourceIdentityType.USER_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    for (const identity of Object.keys(managedIdentity.userAssignedIdentities ?? {})) {
      identitiesInLogicApp.push(identity);
    }
  }

  return identitiesInLogicApp.includes(identity);
}

// NOTE: This method is specifically for Multi-Auth type connectors.
export function isConnectionMultiAuthManagedIdentityType(connection: Connection | undefined, connector: Connector | undefined): boolean {
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
      if (parameters[parameter].type === ConnectionParameterTypes[ConnectionParameterTypes.managedIdentity]) {
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

function isMultiAuthConnection(connection: Connection | undefined): boolean {
  return connection !== undefined && (connection.properties as any).parameterValueSet !== undefined;
}

function containsManagedIdentityParameter(parameterSet: ConnectionParameterSet): boolean {
  const { parameters } = parameterSet;
  return Object.keys(parameters).some(
    (parameter) =>
      parameters[parameter].type === ConnectionParameterTypes[ConnectionParameterTypes.managedIdentity] ||
      equals(parameters[parameter].uiDefinition?.constraints?.default, 'managedserviceidentity')
  );
}
