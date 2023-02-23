import type { ConnectionReference } from '../../../common/models/workflow';
import { getApiManagementSwagger } from '../../queries/connections';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';
import { ApiManagementService, ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { Connector, OperationManifest } from '@microsoft/utils-logic-apps';
import { ConnectionType } from '@microsoft/utils-logic-apps';

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
    const functionAppsCallback = () => ConnectionService().fetchFunctionApps();
    const functionsCallback = (functionAppId?: string) => ConnectionService().fetchFunctionAppsFunctions(functionAppId ?? '');
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
      title: functionAppsLabel,
      headers,
      getColumns,
      getResourcesCallback: functionAppsCallback,
      resourcesLoadingText: functionAppsLoadingText,
      getSubResourceName: (azureFunction: any) => azureFunction.name.split('/')[1],
      fetchSubResourcesCallback: functionsCallback,
    };
  } else if (manifest?.properties.connection?.type === ConnectionType.ApiManagement) {
    const apiInstancesCallback = () => ApiManagementService().fetchApiManagementInstances();
    const apisCallback = (apimId?: string) => ApiManagementService().fetchApisInApiM(apimId ?? '');
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
      title: apisLabel,
      headers,
      getColumns,
      getResourcesCallback: apiInstancesCallback,
      resourcesLoadingText: apimInstancesLoadingText,
      getSubResourceName: (api: any) => api.name,
      fetchSubResourcesCallback: apisCallback,
    };
  }

  return undefined;
}

export async function getConnectionParametersForAzureConnection(connectionType?: ConnectionType, selectedSubResource?: any): Promise<any> {
  if (connectionType === ConnectionType.Function) {
    const functionId = selectedSubResource?.id;
    const authCodeValue = await ConnectionService().fetchFunctionKey(functionId);
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
    const apiSwagger = await getApiManagementSwagger(apimApiId);
    const baseUrl = apiSwagger.api.host ?? 'NotFound';
    const subscriptionKey = (apiSwagger.api.securityDefinitions?.apiKeyHeader as any)?.name ?? 'NotFound';

    return {
      apiId: apimApiId,
      baseUrl,
      subscriptionKey,
    };
  }

  return {};
}
