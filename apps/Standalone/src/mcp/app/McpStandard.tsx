import { useMemo } from 'react';
import { McpDataProvider, McpWizard, McpWizardProvider } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import { useWorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { StandardSearchService } from '@microsoft/logic-apps-shared';
import { useMcpStandardStyles } from './styles';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import { McpHeader } from './McpHeader';
import { AwaitingConnection } from './AwaitingConnection';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

export const McpStandard = () => {
  const styles = useMcpStandardStyles();
  const { theme, appId, hostingPlan } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
    appId: state.workflowLoader.appId,
    hostingPlan: state.workflowLoader.hostingPlan,
  }));

  const hasValidAppId = !!appId && appId.trim() !== '';
  const resourceIdValidation =
    /^\/subscriptions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/resourceGroups\/[a-zA-Z0-9](?:[a-zA-Z0-9-_.]*[a-zA-Z0-9])?\/providers\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+$/;
  const isValidResourceId = hasValidAppId && resourceIdValidation.test(appId);

  const {
    data: workflowAppData,
    isLoading: isWorkflowLoading,
    error: workflowError,
  } = useWorkflowApp(isValidResourceId ? appId : '', hostingPlan, isValidResourceId);

  const canonicalLocation = useMemo(
    () => WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? 'westus'),
    [workflowAppData]
  );

  const resourceDetails = useMemo(() => {
    if (!isValidResourceId) {
      return null;
    }
    return new ArmParser(appId);
  }, [appId, isValidResourceId]);

  const isConnected = !!(isValidResourceId && workflowAppData && resourceDetails && !workflowError && !isWorkflowLoading);

  const services = useMemo(() => {
    const siteResourceId = new ArmParser(appId ?? '').topmostResourceId;
    const armUrl = 'https://management.azure.com';
    const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
    const defaultServiceParams = { baseUrl, httpClient, apiVersion };

    const searchService = new StandardSearchService({
      ...defaultServiceParams,
      apiHubServiceDetails: {
        apiVersion: '2018-07-01-preview',
        subscriptionId: resourceDetails?.subscriptionId ?? '',
        location: canonicalLocation,
      },
      isDev: false,
      unsupportedConnectorIds: ['/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/gmail'],
    });

    return {
      searchService,
    };
  }, [appId, canonicalLocation, resourceDetails]);

  return (
    <McpWizardProvider locale="en-US" theme={theme}>
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <McpHeader isConnected={isConnected} workflowAppData={workflowAppData} canonicalLocation={canonicalLocation} />

        {isConnected ? (
          <div className={styles.wizardContainer}>
            <div className={styles.wizardContent}>
              <div className={styles.wizardWrapper}>
                <McpDataProvider
                  resourceDetails={{
                    subscriptionId: resourceDetails!.subscriptionId,
                    resourceGroup: resourceDetails!.resourceGroup,
                    location: canonicalLocation,
                  }}
                  services={services}
                >
                  <McpWizard />
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
