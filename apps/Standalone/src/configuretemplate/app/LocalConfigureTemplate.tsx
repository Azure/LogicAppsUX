import { useCallback, useMemo, useState } from 'react';
import {
  ConfigureTemplateDataProvider,
  ConfigureTemplateWizard,
  resetStateOnResourceChange,
  templateStore,
  TemplateInfoToast,
  type TemplateInfoToasterProps,
} from '@microsoft/logic-apps-designer';
import { TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  StandardConnectionService,
  StandardOperationManifestService,
  BaseResourceService,
  BaseTemplateResourceService,
  ConsumptionOperationManifestService,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { RootState } from '../state/Store';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { useCurrentTenantId } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';

const testTemplateId =
  '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/TestACSRG/providers/Microsoft.Logic/templates/priticustomtest';
export const LocalConfigureTemplate = () => {
  const { theme, resourcePath } = useSelector((state: RootState) => ({
    theme: state.configureTemplateLoader.theme,
    resourcePath: state.configureTemplateLoader.resourcePath,
  }));
  const { data: tenantId } = useCurrentTenantId();
  const armParser = new ArmParser(resourcePath ?? '');
  const defaultSubscriptionId = armParser?.subscriptionId ?? 'f34b22a3-2202-4fb1-b040-1332bd928c84';
  const defaultResourceGroup = armParser?.resourceGroup ?? 'TestACSRG';
  const defaultLocation = 'brazilsouth';
  const [toasterData, setToasterData] = useState({ title: '', content: '', show: false });
  const [hideToaster, setHideToaster] = useState(false);

  // Need to fetch template resource to get location.
  const services = useMemo(
    () => getServices(defaultSubscriptionId, defaultResourceGroup, defaultLocation, tenantId ?? '', /* isConsumption */ false),
    [defaultResourceGroup, defaultSubscriptionId, tenantId]
  );

  const onResourceChange = useCallback(async () => {
    const {
      workflow: { subscriptionId, resourceGroup, location, workflowAppName, isConsumption },
      templateOptions: { reInitializeServices },
    } = templateStore.getState();
    if (reInitializeServices) {
      templateStore.dispatch(
        resetStateOnResourceChange(
          getResourceBasedServices(subscriptionId, resourceGroup, location, workflowAppName ?? '', tenantId ?? '', !!isConsumption)
        )
      );
    }
  }, [tenantId]);

  const onRenderToaster = useCallback((data: TemplateInfoToasterProps, hideToaster: boolean) => {
    setHideToaster(hideToaster);
    setToasterData(data);
  }, []);

  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <ConfigureTemplateDataProvider
        resourceDetails={{
          subscriptionId: defaultSubscriptionId,
          resourceGroup: defaultResourceGroup,
          location: defaultLocation,
        }}
        onResourceChange={onResourceChange}
        templateId={resourcePath ?? testTemplateId}
        services={services}
      >
        {hideToaster ? null : <TemplateInfoToast {...toasterData} />}
        <div
          style={{
            margin: '20px',
          }}
        >
          <ConfigureTemplateWizard onRenderToaster={onRenderToaster} />
        </div>
      </ConfigureTemplateDataProvider>
    </TemplatesDesignerProvider>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();
const getServices = (subscriptionId: string, resourceGroup: string, location: string, tenantId: string, isConsumption: boolean): any => {
  const armUrl = 'https://management.azure.com';
  const resourceService = new BaseResourceService({ baseUrl: armUrl, httpClient, apiVersion });
  const templateResourceService = new BaseTemplateResourceService({ baseUrl: armUrl, httpClient, apiVersion: '2025-06-01-preview' });

  const { connectionService, operationManifestService } = getResourceBasedServices(
    subscriptionId,
    resourceGroup,
    location,
    '',
    tenantId,
    isConsumption
  );
  return {
    connectionService,
    operationManifestService,
    resourceService,
    templateResourceService,
    workflowService: {},
  };
};

const getResourceBasedServices = (
  subscriptionId: string,
  resourceGroup: string,
  location: string,
  appName: string,
  tenantId: string,
  isConsumption: boolean
): any => {
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/hostruntime/runtime/webhooks/workflow/api/management`;
  const defaultServiceParams = { baseUrl, httpClient, apiVersion };
  const operationManifestService = isConsumption
    ? new ConsumptionOperationManifestService({
        baseUrl: armUrl,
        httpClient,
        apiVersion: '2022-09-01-preview',
        subscriptionId,
        location: location || 'location',
      })
    : new StandardOperationManifestService({
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
