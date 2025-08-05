import { useCallback, useMemo } from 'react';
import {
  McpDataProvider,
  mcpStore,
  McpWizard,
  McpWizardProvider,
  type McpServerCreateData,
  resetMcpStateOnResourceChange,
} from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import {
  getWorkflowAppFromCache,
  saveWorkflowStandard,
  useCurrentObjectId,
  useCurrentTenantId,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import {
  BaseGatewayService,
  BaseResourceService,
  BaseTenantService,
  type IWorkflowService,
  StandardConnectionService,
  StandardConnectorService,
  StandardSearchService,
} from '@microsoft/logic-apps-shared';
import { useMcpStandardStyles } from './styles';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import { CustomConnectionParameterEditorService } from '../../designer/app/AzureLogicAppsDesigner/Services/customConnectionParameterEditorService';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

export const McpStandard = () => {
  const styles = useMcpStandardStyles();
  const { theme } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
  }));

  const hostingPlan = 'standard';

  const resourceDetails = useMemo(
    () => ({
      subscriptionId: 'f34b22a3-2202-4fb1-b040-1332bd928c84',
      resourceGroup: 'TestACSRG',
      location: 'westus',
    }),
    []
  );

  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();

  const services = useMemo(
    () => getServices(/* appId */ undefined, /* workflowApp */ undefined, tenantId, objectId, resourceDetails.location),
    [tenantId, objectId, resourceDetails.location]
  );

  const onResourceChange = useCallback(async () => {
    const {
      mcpOptions: { reInitializeServices },
    } = mcpStore.getState();
    console.log('onReloadServices - Resource is updated');
    if (reInitializeServices) {
      const logicAppId = getWorkflowAppIdFromStore();
      try {
        const appData = await getWorkflowAppFromCache(logicAppId, hostingPlan);
        if (appData) {
          mcpStore.dispatch(
            resetMcpStateOnResourceChange(
              getResourceBasedServices(
                logicAppId as string,
                appData as WorkflowApp,
                tenantId,
                objectId,
                WorkflowUtility.convertToCanonicalFormat(appData.location)
              )
            )
          );
        }
      } catch (error) {
        console.log('Error fetching workflow app data', error);
      }
    }
  }, [objectId, tenantId]);

  const onRegisterMcpServer = useCallback(async (createData: McpServerCreateData, onCompleted?: () => void) => {
    const { logicAppId, workflows, connectionsData } = createData;
    const workflowsToCreate = Object.keys(workflows).map((key) => ({
      name: key.replace(/[^\w-]/g, ''), // Replace invalid characters in workflow name
      workflow: workflows[key],
    }));

    console.log('Generated server data:', createData);

    await saveWorkflowStandard(
      logicAppId,
      workflowsToCreate,
      connectionsData,
      /* parametersData */ undefined,
      /* settingsProperties */ undefined,
      /* customCodeData */ undefined,
      /* clearDirtyState */ () => {},
      { skipValidation: true, throwError: true }
    );
    onCompleted?.();
  }, []);

  const onClose = useCallback(() => {
    console.log('Close button clicked');
  }, []);

  return (
    <McpWizardProvider locale="en-US" theme={theme}>
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <div className={styles.wizardContainer}>
          <div className={styles.wizardContent}>
            <div className={styles.wizardWrapper}>
              <McpDataProvider resourceDetails={resourceDetails} onResourceChange={onResourceChange} services={services}>
                <McpWizard registerMcpServer={onRegisterMcpServer} onClose={onClose} />
                <div id="mcp-layer-host" className={styles.layerHost} />
              </McpDataProvider>
            </div>
          </div>
        </div>
      </div>
    </McpWizardProvider>
  );
};

const getServices = (
  siteResourceId: string | undefined,
  workflowApp: WorkflowApp | undefined,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string
): any => {
  const armUrl = 'https://management.azure.com';

  const gatewayService = new BaseGatewayService({
    baseUrl: armUrl,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
      gateway: '2016-06-01',
    },
  });
  const tenantService = new BaseTenantService({
    baseUrl: armUrl,
    httpClient,
    apiVersion: '2017-08-01',
  });
  const connectionParameterEditorService = new CustomConnectionParameterEditorService();
  const resourceService = new BaseResourceService({ baseUrl: armUrl, httpClient, apiVersion });
  const { connectionService, oAuthService, connectorService, workflowService, searchService } = getResourceBasedServices(
    siteResourceId ?? '',
    workflowApp,
    tenantId,
    objectId,
    location
  );

  return {
    connectionService,
    gatewayService,
    tenantService,
    oAuthService,
    connectionParameterEditorService,
    workflowService,
    connectorService,
    resourceService,
    searchService,
    hostService: {} as any, // Placeholder for IHostService, not used in this context
  };
};

const getResourceBasedServices = (
  siteResourceId: string | undefined,
  workflowApp: WorkflowApp | undefined,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string
): any => {
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const { subscriptionId, resourceGroup, resourceName } = new ArmParser(siteResourceId ?? '');

  if (!subscriptionId) {
    console.warn('Subscription ID is not available in the provided resource ID: ', siteResourceId);
  }

  const defaultServiceParams = { baseUrl, httpClient, apiVersion };

  const searchService = new StandardSearchService({
    ...defaultServiceParams,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      subscriptionId,
      location,
    },
    isDev: false,
    unsupportedConnectorIds: ['/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/gmail'],
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
    workflowAppDetails: { appName: resourceName, identity: workflowApp?.identity as any },
    readConnections: () => Promise.resolve({}),
  });
  const oAuthService = new StandaloneOAuthService({
    ...defaultServiceParams,
    apiVersion: '2018-07-01-preview',
    subscriptionId,
    resourceGroup,
    location,
    tenantId,
    objectId,
  });

  const connectorService = new StandardConnectorService({
    ...defaultServiceParams,
    clientSupportedOperations: [],
    getConfiguration: () => Promise.resolve({}),
    schemaClient: {},
    valuesClient: {},
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: armUrl,
    },
  });

  const workflowService: IWorkflowService = {
    getCallbackUrl: () => Promise.resolve({} as any),
    isExplicitAuthRequiredForManagedIdentity: () => true,
    getAppIdentity: () => workflowApp?.identity as any,
  };

  return {
    connectionService,
    oAuthService,
    workflowService,
    connectorService,
    searchService,
  };
};

const getWorkflowAppIdFromStore = () => {
  const { subscriptionId, resourceGroup, logicAppName } = mcpStore.getState().resource;
  return subscriptionId && resourceGroup && logicAppName
    ? `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}`
    : '';
};
