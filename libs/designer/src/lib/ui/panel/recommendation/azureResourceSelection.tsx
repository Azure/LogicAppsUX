import Constants from '../../../common/constants';
import { Text } from '@fluentui/react';
import { ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import { AzureResourcePicker } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

type AzureResourceSelectionProps = {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
};

export const AzureResourceSelection = (props: AzureResourceSelectionProps) => {
  const { operation } = props;

  const resourceApiId = useMemo(() => operation.properties.api.id, [operation]);

  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(undefined);

  switch (operation.id) {
    case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_ACTION:
    case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_TRIGGER:
      break;

    case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_ACTION:
    case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_TRIGGER:
      break;

    case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_FUNCTION_ACTION:
      break;

    case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_MANUAL_WORKFLOW_ACTION:
      break;

    case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_BATCH_WORKFLOW_ACTION:
      break;

    default:
      throw new Error(`Unexpected API category type '${operation.id}'`);
  }

  const intl = useIntl();
  const headers = [
    intl.formatMessage({ defaultMessage: 'Name', description: 'Header for resource name' }),
    intl.formatMessage({ defaultMessage: 'Resource Group', description: 'Header for resource group name' }),
    intl.formatMessage({ defaultMessage: 'Location', description: 'Header for resource lcoation' }),
  ];

  const getResourcesCallback = () => ConnectionService().fetchFunctionApps();
  const fetchSubResourcesCallback = (functionAppId?: string) => ConnectionService().fetchFunctionAppsFunctions(functionAppId ?? '');

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading resources...',
    description: 'Text for loading Azure Resources',
  });

  const titleText = intl.formatMessage({
    defaultMessage: 'TITLE',
    description: 'Label for function app selection',
  });

  const getColumns = (resource: any) => [resource?.name, resource?.properties?.resourceGroup, resource?.location];

  return (
    <>
      <Text variant="medium">{operation.name}</Text>
      <Text variant="medium">{resourceApiId}</Text>
      <Text variant="small">{operation.description}</Text>
      <br />

      <AzureResourcePicker
        titleText={titleText}
        loadingText={loadingText}
        headers={headers}
        getColumns={getColumns}
        resourceType={'level1'}
        getResourcesCallback={getResourcesCallback}
        selectedResourceId={selectedResourceId}
        onResourceSelect={(resourceId: string) => setSelectedResourceId(resourceId)}
        subResourceType={'level2'}
        getSubResourceName={(azureFunction: any) => JSON.stringify(azureFunction)}
        fetchSubResourcesCallback={fetchSubResourcesCallback}
        onSubResourceSelect={(subResourceId: string) => console.log(subResourceId)}
      />
    </>
  );
};
