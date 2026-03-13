import { useCallback, useMemo } from 'react';
import { KnowledgeDataProvider, KnowledgeWizardProvider, KnowledgeHubWizard } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import {
  BaseCognitiveServiceService,
  BaseGatewayService,
  BaseResourceService,
  StandardConnectionService,
  type LocalConnectionModel,
  type ConnectionAndAppSetting,
  type ConnectionsData,
  clone,
  resolveConnectionsReferences,
} from '@microsoft/logic-apps-shared';
import { useKnowledgeStyles } from './styles';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import {
  createOrUpdateConnection,
  useAppSettings,
  useConnectionsData,
  useParametersData,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { addConnectionInJson, addOrUpdateAppSettings } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { Spinner } from '@fluentui/react-components';
import { CustomConnectionParameterEditorService } from '../Services/connectionParameterEditor';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

export const KnowledgeHub = () => {
  const styles = useKnowledgeStyles();
  const { appId, theme } = useSelector((state: RootState) => ({
    appId: state.workflowLoader.appId,
    theme: state.workflowLoader.theme,
  }));

  const resourceDetails = useMemo(() => {
    const parser = new ArmParser(appId ?? '');
    return {
      subscriptionId: parser.subscriptionId || '',
      resourceGroup: parser.resourceGroup || '',
      logicAppName: parser.resourceName || '',
      location: 'westus2',
    };
  }, [appId]);

  const { data: settingsData, isLoading: isSettingsLoading } = useAppSettings(appId ?? '');
  const { data: parametersData, isLoading: isParametersLoading } = useParametersData(appId);
  const { data: originalConnections, isLoading: isConnectionsLoading } = useConnectionsData(appId);

  const connectionsData = useMemo(
    () =>
      resolveConnectionsReferences(JSON.stringify(clone(originalConnections ?? {})), parametersData ?? {}, settingsData?.properties ?? {}),
    [originalConnections, parametersData, settingsData?.properties]
  );

  const createConnectionInternal = useCallback(
    async (connectionAndSetting: ConnectionAndAppSetting<LocalConnectionModel>) => {
      const { settings } = connectionAndSetting;
      const hasSettings = Object.keys(settings)?.length > 0;
      const connectionsJson = clone(connectionsData);
      addConnectionInJson(connectionAndSetting as any, connectionsJson);

      const settingsToUpdate = hasSettings ? addOrUpdateAppSettings(settings, clone(settingsData.properties)) : undefined;

      await createOrUpdateConnection(appId ?? '', connectionsJson, settingsToUpdate);
    },
    [appId, connectionsData, settingsData?.properties]
  );

  const services = useMemo(
    () => getServices(appId ?? '', connectionsData, createConnectionInternal, settingsData?.properties),
    [appId, connectionsData, createConnectionInternal, settingsData?.properties]
  );

  if (isSettingsLoading || isParametersLoading || isConnectionsLoading) {
    return <Spinner style={{ margin: '0 auto', paddingTop: '100px' }} size="large" />;
  }

  return (
    <KnowledgeWizardProvider locale="en-US" theme={theme}>
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <div className={styles.wizardContainer}>
          <div className={styles.wizardContent}>
            <div className={styles.wizardWrapper}>
              <KnowledgeDataProvider resourceDetails={resourceDetails} services={services} isDarkMode={theme === 'dark'}>
                <KnowledgeHubWizard />
              </KnowledgeDataProvider>
            </div>
          </div>
        </div>
      </div>
    </KnowledgeWizardProvider>
  );
};

const getServices = (
  siteResourceId: string,
  connectionsData: ConnectionsData,
  addConnection: (data: ConnectionAndAppSetting<LocalConnectionModel>) => Promise<void>,
  appSettings: Record<string, string>
): any => {
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const { subscriptionId, resourceGroup } = new ArmParser(siteResourceId);

  const defaultServiceParams = { baseUrl, httpClient, apiVersion };

  const resourceService = new BaseResourceService({ baseUrl: armUrl, httpClient, apiVersion });
  const connectionService = new StandardConnectionService({
    ...defaultServiceParams,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: armUrl,
      subscriptionId,
      resourceGroup,
      location: 'westus', // Api Hub service details should not be used in this scenario, so using a dummy one.
      httpClient,
    },
    readConnections: () => {
      return resolveConnectionsReferences(JSON.stringify(clone(connectionsData ?? {})), undefined, appSettings);
    },
    writeConnection: addConnection as any,
  });

  const gatewayService = new BaseGatewayService({
    baseUrl: armUrl,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
      gateway: '2016-06-01',
    },
  });

  const cognitiveService = new BaseCognitiveServiceService({
    apiVersion: '2023-10-01-preview',
    baseUrl: armUrl,
    httpClient,
    identity: {} as any, // Placeholder for IIdentity, not used in this context
  });

  const connectionParameterEditorService = new CustomConnectionParameterEditorService();

  return {
    connectionService,
    resourceService,
    gatewayService,
    cognitiveService,
    connectionParameterEditorService,
    hostService: {} as any, // Placeholder for IHostService, not used in this context
  };
};
