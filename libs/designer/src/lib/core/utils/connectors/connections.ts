import { ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { Connector } from '@microsoft/utils-logic-apps';
import type { ConnectionReference } from '../../../common/models/workflow';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';

export function getConnectionId(state: ConnectionsStoreState, nodeId: string): string {
  const { connectionsMapping, connectionReferences } = state;
  const reference = connectionReferences[connectionsMapping[nodeId] ?? ''];
  return reference ? reference.connection.id : '';
}

export function getConnectionReference(state: ConnectionsStoreState, nodeId: string): ConnectionReference {
  const { connectionsMapping, connectionReferences } = state;
  return connectionReferences[connectionsMapping[nodeId] ?? ''];
}

export function getAssistedConnectionProps(connector: Connector): AssistedConnectionProps | undefined {
  const isAzureFunctionConnection = connector.properties.capabilities?.includes('azureConnection') ?? false;
  const isApiManagementConnection = connector.properties.capabilities?.includes('azureAPIManagement') ?? false;

  if (!isAzureFunctionConnection && !isApiManagementConnection) {
    return undefined;
  }

  const intl = getIntl();
  const headers = [
    intl.formatMessage({ defaultMessage: 'Name', description: 'Header for resource name', }),
    intl.formatMessage({ defaultMessage: 'Resource Group', description: 'Header for resource group name', }),
    intl.formatMessage({ defaultMessage: 'Location', description: 'Header for resource lcoation', }),
  ];
  if (isAzureFunctionConnection) {
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

    const getColumns = (functionApp: any) => ([functionApp?.name, functionApp?.properties?.resourceGroup, functionApp?.location]);

    return {
      resourceType: 'functionApps',
      subResourceType: 'functionAppFunctions',
      title: functionAppsLabel,
      headers,
      getColumns,
      getResourcesCallback: functionAppsCallback,
      resourcesLoadingText: functionAppsLoadingText,
      fetchSubResourcesCallback: functionsCallback
    };
  } else {
    return undefined;
  }
}
