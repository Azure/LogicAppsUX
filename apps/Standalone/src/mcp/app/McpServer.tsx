import { useCallback, useMemo } from 'react';
import { McpWizardProvider, McpServerDataProvider, McpServersWizard, type ServerNotificationData } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import { updateMcpServers } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { BaseResourceService, BaseTenantService, type McpServer as McpServerType } from '@microsoft/logic-apps-shared';
import { useMcpStandardStyles } from './styles';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

export const McpServer = () => {
  const styles = useMcpStandardStyles();
  const { theme } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
  }));

  const appId = '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/TestACSRG/providers/Microsoft.Web/sites/prititemplates';
  const resourceDetails = useMemo(() => {
    const parser = new ArmParser(appId);
    return {
      subscriptionId: parser.subscriptionId || '',
      resourceGroup: parser.resourceGroup || '',
      logicAppName: parser.resourceName || '',
      location: 'westus2',
    };
  }, []);

  const services = useMemo(() => getServices(), []);

  const handleOpenCreateTools = useCallback(() => {
    window.alert('Open create tools clicked');
  }, []);

  const handleOpenWorkflow = useCallback((workflowName: string) => {
    window.alert(`Open workflow clicked for workflow id: ${workflowName}`);
  }, []);

  const handleOpenManageOAuth = useCallback(() => {
    window.alert('Open manage OAuth clicked');
  }, []);

  const handleUpdateServers = useCallback(async (servers: McpServerType[], toasterData: ServerNotificationData) => {
    return updateMcpServers(appId, servers, toasterData);
  }, []);

  return (
    <McpWizardProvider locale="en-US" theme={theme}>
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <div className={styles.wizardContainer}>
          <div className={styles.wizardContent}>
            <div className={styles.wizardWrapper}>
              <McpServerDataProvider resourceDetails={resourceDetails} services={services} isDarkMode={theme === 'dark'}>
                <McpServersWizard
                  onUpdateServers={handleUpdateServers}
                  onOpenWorkflow={handleOpenWorkflow}
                  onOpenCreateTools={handleOpenCreateTools}
                  onOpenManageOAuth={handleOpenManageOAuth}
                />
                <div id="mcp-layer-host" className={styles.layerHost} />
              </McpServerDataProvider>
            </div>
          </div>
        </div>
      </div>
    </McpWizardProvider>
  );
};

const getServices = (): any => {
  const armUrl = 'https://management.azure.com';

  const tenantService = new BaseTenantService({
    baseUrl: armUrl,
    httpClient,
    apiVersion: '2017-08-01',
  });
  const resourceService = new BaseResourceService({ baseUrl: armUrl, httpClient, apiVersion });

  return {
    tenantService,
    resourceService,
    hostService: {} as any, // Placeholder for IHostService, not used in this context
  };
};
