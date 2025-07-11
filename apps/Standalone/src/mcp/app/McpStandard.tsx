import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  McpDataProvider,
  mcpStore,
  McpWizard,
  McpWizardProvider,
  type McpWorkflowsData,
  resetMcpStateOnResourceChange,
} from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import {
  getWorkflowAppFromCache,
  saveWorkflowStandard,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowApp,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import {
  BaseGatewayService,
  BaseResourceService,
  BaseTenantService,
  equals,
  type IWorkflowService,
  StandardConnectionService,
  StandardConnectorService,
  StandardSearchService,
} from '@microsoft/logic-apps-shared';
import { useMcpStandardStyles } from './styles';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import { McpHeader } from './McpHeader';
import { AwaitingConnection } from './AwaitingConnection';
import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import { CustomConnectionParameterEditorService } from '../../designer/app/AzureLogicAppsDesigner/Services/customConnectionParameterEditorService';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

export const McpStandard = () => {
  const styles = useMcpStandardStyles();
  const { theme, appId } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
    appId: state.workflowLoader.appId,
  }));

  const hostingPlan = 'standard';
  const [shouldReload, setShouldReload] = useState<boolean | undefined>(undefined);
  const hasValidAppId = !!appId && appId.trim() !== '';
  const resourceIdValidation =
    /^\/subscriptions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/resourceGroups\/[a-zA-Z0-9](?:[a-zA-Z0-9-_.]*[a-zA-Z0-9])?\/providers\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+$/;
  const isValidResourceId = hasValidAppId && resourceIdValidation.test(appId);

  const resourceDetails = useMemo(
    () => ({
      subscriptionId: 'f34b22a3-2202-4fb1-b040-1332bd928c84',
      resourceGroup: 'TestACSRG',
      location: 'westus',
    }),
    []
  );
  const {
    data: workflowAppData,
    isLoading: isWorkflowLoading,
    error: workflowError,
  } = useWorkflowApp(isValidResourceId ? appId : '', hostingPlan, isValidResourceId);

  const canonicalLocation = useMemo(
    () => WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? 'westus'),
    [workflowAppData]
  );

  const isConnected = !!(isValidResourceId && workflowAppData && resourceDetails && !workflowError && !isWorkflowLoading);

  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();

  const services = useMemo(
    () => getServices(appId as string, workflowAppData as WorkflowApp, tenantId, objectId, canonicalLocation),
    [appId, workflowAppData, tenantId, objectId, canonicalLocation]
  );

  useEffect(() => {
    if (shouldReload) {
      const logicAppId = getWorkflowAppIdFromStore();
      if (equals(logicAppId, workflowAppData?.id)) {
        mcpStore.dispatch(
          resetMcpStateOnResourceChange(
            getResourceBasedServices(logicAppId as string, workflowAppData as WorkflowApp, tenantId, objectId, canonicalLocation)
          )
        );
        setShouldReload(false);
      }
    }
  }, [canonicalLocation, objectId, shouldReload, tenantId, workflowAppData]);

  const onResourceChange = useCallback(async () => {
    const {
      mcpOptions: { reInitializeServices },
    } = mcpStore.getState();
    console.log('onReloadServices - Resource is updated');
    if (reInitializeServices) {
      const logicAppId = getWorkflowAppIdFromStore();
      if (logicAppId && !equals(logicAppId, appId)) {
        try {
          const appData = await getWorkflowAppFromCache(logicAppId, hostingPlan);
          if (appData) {
            setShouldReload(true);
          }
        } catch (error) {
          console.log('Error fetching workflow app data', error);
        }
      }
    }
  }, [appId, hostingPlan]);

  const onRegisterMcpServer = useCallback(
    async ({ logicAppId, workflows, connectionsData }: McpWorkflowsData, onCompleted?: () => void) => {
      const workflowsToCreate = Object.keys(workflows).map((key) => ({
        name: key,
        workflow: workflows[key].definition,
        kind: workflows[key].kind,
      }));

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
    },
    []
  );

  return (
    <McpWizardProvider locale="en-US" theme={theme}>
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <McpHeader isConnected={isConnected} workflowAppData={workflowAppData} canonicalLocation={canonicalLocation} />

        {isConnected ? (
          <div className={styles.wizardContainer}>
            <div className={styles.wizardContent}>
              <div className={styles.wizardWrapper}>
                <McpDataProvider resourceDetails={resourceDetails} onResourceChange={onResourceChange} services={services}>
                  <McpWizard registerMcpServer={onRegisterMcpServer} />
                  <div id="mcp-layer-host" className={styles.layerHost} />
                </McpDataProvider>
              </div>
            </div>
          </div>
        ) : (
          <AwaitingConnection />
        )}
      </div>
    </McpWizardProvider>
  );
};

const getServices = (
  siteResourceId: string,
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
    siteResourceId,
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
  siteResourceId: string,
  workflowApp: WorkflowApp | undefined,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string
): any => {
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const { subscriptionId, resourceGroup, resourceName } = new ArmParser(siteResourceId ?? '');

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
