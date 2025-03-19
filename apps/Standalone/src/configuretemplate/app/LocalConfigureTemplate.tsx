import { useCallback, useMemo } from 'react';
import {
  ConfigureTemplateDataProvider,
  ConfigureTemplateWizard,
  resetStateOnResourceChange,
  templateStore,
} from '@microsoft/logic-apps-designer';
import { TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  StandardConnectionService,
  StandardOperationManifestService,
  BaseResourceService,
  BaseTemplateResourceService,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { RootState } from '../state/Store';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { useCurrentTenantId } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';

export const LocalConfigureTemplate = () => {
  const { theme, resourcePath } = useSelector((state: RootState) => ({
    theme: state.configureTemplateLoader.theme,
    resourcePath: state.configureTemplateLoader.resourcePath,
  }));
  const { data: tenantId } = useCurrentTenantId();
  const armParser = new ArmParser(resourcePath ?? '');
  const defaultSubscriptionId = armParser?.subscriptionId ?? 'f34b22a3-2202-4fb1-b040-1332bd928c84';
  const defaultResourceGroup = armParser?.resourceGroup ?? 'TestACSRG';
  const defaultLocation = 'westus';

  // Need to fetch template resource to get location.
  const services = useMemo(
    () => getServices(defaultSubscriptionId, defaultResourceGroup, defaultLocation, tenantId ?? ''),
    [defaultResourceGroup, defaultSubscriptionId, tenantId]
  );

  const onResourceChange = useCallback(async () => {
    const {
      workflow: { subscriptionId, resourceGroup, location, workflowAppName },
      templateOptions: { reInitializeServices },
    } = templateStore.getState();
    if (reInitializeServices) {
      templateStore.dispatch(
        resetStateOnResourceChange(getResourceBasedServices(subscriptionId, resourceGroup, location, workflowAppName ?? '', tenantId ?? ''))
      );
    }
  }, [tenantId]);

  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <ConfigureTemplateDataProvider
        resourceDetails={{
          subscriptionId: defaultSubscriptionId,
          resourceGroup: defaultResourceGroup,
          location: defaultLocation,
        }}
        onResourceChange={onResourceChange}
        templateId={resourcePath ?? ''}
        services={services}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          <ConfigureTemplateWizard />
        </div>
      </ConfigureTemplateDataProvider>
    </TemplatesDesignerProvider>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();
const getServices = (subscriptionId: string, resourceGroup: string, location: string, tenantId: string): any => {
  const armUrl = 'https://management.azure.com';
  const resourceService = new BaseResourceService({ baseUrl: armUrl, httpClient, apiVersion });
  const templateResourceService = new BaseTemplateResourceService({ baseUrl: armUrl, httpClient, apiVersion });

  const { connectionService, operationManifestService } = getResourceBasedServices(subscriptionId, resourceGroup, location, '', tenantId);
  return {
    connectionService,
    operationManifestService,
    resourceService,
    templateResourceService,
  };
};

const getResourceBasedServices = (
  subscriptionId: string,
  resourceGroup: string,
  location: string,
  appName: string,
  tenantId: string
): any => {
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/hostruntime/runtime/webhooks/workflow/api/management`;
  const defaultServiceParams = { baseUrl, httpClient, apiVersion };
  const operationManifestService = new StandardOperationManifestService({
    apiVersion,
    baseUrl,
    httpClient,
  });
  const connectionService = new StandardConnectionService({
    ...defaultServiceParams,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: armUrl,
      subscriptionId,
      resourceGroup,
      location,
      tenantId,
      httpClient,
    },
    readConnections: () => Promise.resolve({}),
  });

  return {
    connectionService,
    operationManifestService,
  };
};
