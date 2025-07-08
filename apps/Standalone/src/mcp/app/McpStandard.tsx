import { useCallback, useEffect, useMemo, useState } from 'react';
import { McpDataProvider, McpWizard, McpWizardProvider, mcpStore, resetMcpStateOnResourceChange } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import {
  getWorkflowAppFromCache,
  useConnectionsData,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowApp,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { addConnectionInJson, WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import {
  BaseGatewayService,
  BaseResourceService,
  BaseTenantService,
  clone,
  type ConnectionsData,
  equals,
  type IWorkflowService,
  StandardConnectionService,
  StandardConnectorService,
  StandardSearchService,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
import type { ConnectionAndAppSetting } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import { useFunctionalState } from '@react-hookz/web';
import { CustomConnectionParameterEditorService } from '../../designer/app/AzureLogicAppsDesigner/Services/customConnectionParameterEditorService';

export const McpStandard = () => {
  const { theme } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
  }));
  const resourceDetails = {
    subscriptionId: 'f34b22a3-2202-4fb1-b040-1332bd928c84',
    resourceGroup: 'TestACSRG',
    location: 'westus',
  };
  const hostingPlan = 'standard';
  const [appId, setAppId] = useState<string | undefined>(undefined);
  const [shouldReload, setShouldReload] = useState<boolean | undefined>(undefined);
  const { data: workflowAppData } = useWorkflowApp(appId as string, hostingPlan);
  const canonicalLocation = useMemo(
    () => WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? 'westus'),
    [workflowAppData]
  );

  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const { data: originalConnectionsData } = useConnectionsData(appId);

  const [connectionsData, setConnectionsData] = useFunctionalState(originalConnectionsData);

  useEffect(() => {
    if (originalConnectionsData) {
      setConnectionsData(JSON.parse(JSON.stringify(clone(originalConnectionsData ?? {}))));
    }
  }, [originalConnectionsData, setConnectionsData]);
  const addConnectionDataInternal = useCallback(
    async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
      addConnectionInJson(connectionAndSetting, connectionsData() ?? {});
    },
    [connectionsData]
  );

  const getConnectionConfiguration = useCallback(() => Promise.resolve(), []);
  const getWorkflowConnectionsData = useCallback(() => connectionsData() ?? {}, [connectionsData]);
  const services = useMemo(
    () =>
      getServices(
        appId as string,
        workflowAppData as WorkflowApp,
        addConnectionDataInternal,
        getConnectionConfiguration,
        tenantId,
        objectId,
        canonicalLocation,
        getWorkflowConnectionsData
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectionsData, workflowAppData, tenantId, canonicalLocation, appId]
  );

  useEffect(() => {
    if (shouldReload) {
      const {
        resource: { logicAppId },
      } = mcpStore.getState();
      if (equals(logicAppId, workflowAppData?.id)) {
        mcpStore.dispatch(
          resetMcpStateOnResourceChange(
            getResourceBasedServices(
              logicAppId as string,
              workflowAppData as WorkflowApp,
              addConnectionDataInternal,
              getConnectionConfiguration,
              tenantId,
              objectId,
              canonicalLocation,
              getWorkflowConnectionsData
            )
          )
        );
        setShouldReload(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addConnectionDataInternal,
    getConnectionConfiguration,
    getWorkflowConnectionsData,
    objectId,
    shouldReload,
    tenantId,
    workflowAppData,
  ]);

  const onResourceChange = useCallback(async () => {
    const {
      mcpOptions: { reInitializeServices },
      resource: { logicAppId },
    } = mcpStore.getState();
    console.log('onReloadServices - Resource is updated');
    if (reInitializeServices) {
      if (logicAppId && !equals(logicAppId, appId)) {
        try {
          const appData = await getWorkflowAppFromCache(logicAppId, hostingPlan);
          if (appData) {
            setAppId(logicAppId);
            setShouldReload(true);
          }
        } catch (error) {
          console.log('Error fetching workflow app data', error);
        }
      }
    }
  }, [appId, hostingPlan]);

  return (
    <McpWizardProvider locale="en-US" theme={theme}>
      <McpDataProvider
        resourceDetails={{
          subscriptionId: resourceDetails.subscriptionId,
          resourceGroup: resourceDetails.resourceGroup,
          location: canonicalLocation,
        }}
        onResourceChange={onResourceChange}
        services={services}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          <McpWizard
            onCreateCall={() => {
              console.log('MCP Create call is triggered.');
            }}
          />
        </div>
      </McpDataProvider>
    </McpWizardProvider>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const getServices = (
  siteResourceId: string,
  workflowApp: WorkflowApp | undefined,
  addConnection: (data: ConnectionAndAppSetting) => Promise<void>,
  getConfiguration: (connectionId: string) => Promise<any>,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  getConnectionsData: () => ConnectionsData
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
    addConnection,
    getConfiguration,
    tenantId,
    objectId,
    location,
    getConnectionsData
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
  };
};

const getResourceBasedServices = (
  siteResourceId: string,
  workflowApp: WorkflowApp | undefined,
  addConnection: (data: ConnectionAndAppSetting) => Promise<void>,
  getConfiguration: (connectionId: string) => Promise<any>,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  getConnectionsData: () => ConnectionsData
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
    readConnections: () => Promise.resolve(getConnectionsData() as any),
    writeConnection: addConnection as any,
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
    getConfiguration,
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
