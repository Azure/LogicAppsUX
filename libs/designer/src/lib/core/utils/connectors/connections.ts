import type { ConnectionReference } from '../../../common/models/workflow';
import { getApiManagementSwagger } from '../../queries/connections';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';
import { ApiManagementService, FunctionService, WorkflowService } from '@microsoft/designer-client-services-logic-apps';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { ConnectionParameterSet, ConnectionParameterSets, Connector, OperationManifest } from '@microsoft/utils-logic-apps';
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
          !equals(operationType, 'serviceprovider') ||
          identity?.type?.toLowerCase()?.includes(ResourceIdentityType.SYSTEM_ASSIGNED.toLowerCase())
        );
      }

      return true;
    }),
  };
}

function containsManagedIdentityParameter(parameterSet: ConnectionParameterSet): boolean {
  const { parameters } = parameterSet;
  return Object.keys(parameters).some(
    (parameter) =>
      parameters[parameter].type === ConnectionParameterTypes[ConnectionParameterTypes.managedIdentity] ||
      equals(parameters[parameter].uiDefinition?.constraints?.default, 'managedserviceidentity')
  );
}
