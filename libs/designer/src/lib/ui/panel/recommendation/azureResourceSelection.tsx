import Constants from '../../../common/constants';
import { PrimaryButton, Text } from '@fluentui/react';
import { ApiManagementService, FunctionService, SearchService, AppServiceService } from '@microsoft/designer-client-services-logic-apps';
import { AzureResourcePicker } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { getResourceGroupFromWorkflowId } from '@microsoft/utils-logic-apps';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

type AzureResourceSelectionProps = {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
  onSubmit: (resource: any) => void;
};

export const AzureResourceSelection = (props: AzureResourceSelectionProps) => {
  const { operation, onSubmit } = props;

  // const resourceApiId = useMemo(() => operation.properties.api.id, [operation]);

  const intl = useIntl();
  const apimTitleText = intl.formatMessage({
    defaultMessage: 'Select an API Management resource',
    description: 'Select an API Management resource',
  });
  const appServiceTitleText = intl.formatMessage({
    defaultMessage: 'Select an App Service resource',
    description: 'Select an App Service resource',
  });
  const functionAppTitleText = intl.formatMessage({
    defaultMessage: 'Select a Function App resource',
    description: 'Select a Function App resource',
  });
  const manualWorkflowTitleText = intl.formatMessage({
    defaultMessage: 'Select a Manual Workflow resource',
    description: 'Select a Manual Workflow resource',
  });
  const batchWorkflowTitleText = intl.formatMessage({
    defaultMessage: 'Select a Batch Workflow resource',
    description: 'Select a Batch Workflow resource',
  });

  const [titleText, setTitleText] = useState('');

  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(undefined);
  const [selectedSubResource, setSelectedSubResource] = useState<string | undefined>(undefined);

  const [resourceTypes, setResourceTypes] = useState<string[]>([]);

  const [getResourcesCallback, setGetResourcesCallback] = useState<(any?: any) => Promise<any>>(() => () => Promise.resolve([]));
  const [getSubResourcesCallback, setGetSubResourcesCallback] = useState<(any?: any) => Promise<any>>(() => () => Promise.resolve([]));

  useEffect(() => {
    switch (operation.id) {
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_ACTION:
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_TRIGGER:
        setTitleText(apimTitleText);
        setResourceTypes(['apiManagement', 'action', 'operation']);
        setGetResourcesCallback(() => () => ApiManagementService().fetchApiManagementInstances());
        setGetSubResourcesCallback(() => (apiManagementId?: string) => ApiManagementService().fetchApisInApiM(apiManagementId ?? ''));
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_ACTION:
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_TRIGGER:
        setTitleText(appServiceTitleText);
        setResourceTypes(['appService', 'service']);
        setGetResourcesCallback(() => () => AppServiceService().fetchAppServices());
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_FUNCTION_ACTION:
        setTitleText(functionAppTitleText);
        setResourceTypes(['functionApp', 'function']);
        setGetResourcesCallback(() => () => FunctionService().fetchFunctionApps());
        setGetSubResourcesCallback(() => (functionAppId?: string) => FunctionService().fetchFunctionAppsFunctions(functionAppId ?? ''));
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_MANUAL_WORKFLOW_ACTION:
        setTitleText(manualWorkflowTitleText);
        setResourceTypes(['manualWorkflow', 'trigger']);
        setGetResourcesCallback(() => () => SearchService().getRequestWorkflows());
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_BATCH_WORKFLOW_ACTION:
        setTitleText(batchWorkflowTitleText);
        setResourceTypes(['batchWorkflow', 'trigger']);
        setGetResourcesCallback(() => () => SearchService().getBatchWorkflows());
        setGetSubResourcesCallback(() => (batchWorkflowId?: string) => SearchService().getWorkflowTriggers(batchWorkflowId ?? ''));
        break;

      default:
        throw new Error(`Unexpected API category type '${operation.id}'`);
    }
  }, [apimTitleText, appServiceTitleText, batchWorkflowTitleText, functionAppTitleText, manualWorkflowTitleText, operation.id]);

  const headers = [
    intl.formatMessage({ defaultMessage: 'Name', description: 'Header for resource name' }),
    intl.formatMessage({ defaultMessage: 'Resource Group', description: 'Header for resource group name' }),
    intl.formatMessage({ defaultMessage: 'Location', description: 'Header for resource location' }),
  ];

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading resources...',
    description: 'Text for loading Azure Resources',
  });

  const getColumns = (resource: any) => [
    resource?.properties?.name ?? resource?.name ?? resource?.id,
    resource?.properties?.resourceGroup ?? resource?.resourceGroup ?? getResourceGroupFromWorkflowId(resource?.id),
    resource?.properties?.location ?? resource?.location,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="msla-flex-row" style={{ justifyContent: 'flex-start' }}>
        <img
          src={operation.properties.api.iconUri}
          alt={operation.properties.api.name}
          style={{ width: '32px', height: '32px', borderRadius: '2px', overflow: 'hidden' }}
        />
        <Text variant="large">{operation.properties.summary}</Text>
      </div>
      <AzureResourcePicker
        titleText={titleText}
        loadingText={loadingText}
        headers={headers}
        getColumns={getColumns}
        resourceType={resourceTypes[0]}
        getResourcesCallback={getResourcesCallback}
        selectedResourceId={selectedResourceId}
        onResourceSelect={(resourceId: string) => setSelectedResourceId(resourceId)}
        subResourceType={resourceTypes[1]}
        getSubResourceName={(subResource: any) => subResource?.properties?.name ?? subResource?.name ?? subResource?.id}
        fetchSubResourcesCallback={getSubResourcesCallback}
        onSubResourceSelect={(subResource: any) => setSelectedSubResource(subResource)}
      />
      <PrimaryButton
        disabled={!selectedSubResource}
        onClick={() => {
          if (!selectedResourceId || !selectedSubResource) return;
          onSubmit(selectedSubResource);
        }}
      >
        {intl.formatMessage({ defaultMessage: 'Select', description: 'Select button text' })}
      </PrimaryButton>
    </div>
  );
};
