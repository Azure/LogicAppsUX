import { useMemo } from 'react';
import { ConfigureTemplateDataProvider, ConfigureTemplateWizard } from '@microsoft/logic-apps-designer';
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
  const subscriptionId = armParser?.subscriptionId ?? '';
  const resourceGroup = armParser?.resourceGroup ?? '';
  const location = 'westus';

  // Need to fetch template resource to get location.

  const services = useMemo(
    () => getServices(subscriptionId, resourceGroup, location, tenantId ?? ''),
    [resourceGroup, subscriptionId, tenantId]
  );

  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <ConfigureTemplateDataProvider
        resourceDetails={{
          subscriptionId,
          resourceGroup,
          location,
        }}
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
  const siteResourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites`;
  const operationManifestService = new StandardOperationManifestService({
    apiVersion,
    baseUrl: `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`,
    httpClient,
  });
  const resourceService = new BaseResourceService({ baseUrl: armUrl, httpClient, apiVersion });
  const templateResourceService = new BaseTemplateResourceService({ baseUrl: armUrl, httpClient, apiVersion });

  const { connectionService } = getResourceBasedServices(subscriptionId, resourceGroup, location, '', tenantId);
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
  };
};
