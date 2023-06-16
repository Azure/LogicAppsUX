import type { RootState } from '../../state/store';
import { DesignerCommandBar } from './DesignerCommandBar';
import type { ConnectionAndAppSetting, ConnectionsData, ParametersData } from './Models/Workflow';
import { Artifact } from './Models/Workflow';
import type { WorkflowApp } from './Models/WorkflowApp';
import { ArtifactService } from './Services/Artifact';
import { ChildWorkflowService } from './Services/ChildWorkflow';
import { FileSystemConnectionCreationClient } from './Services/FileSystemConnectionCreationClient';
import { HttpClient } from './Services/HttpClient';
import {
  getConnectionStandard,
  listCallbackUrl,
  saveWorkflowStandard,
  useAppSettings,
  useCurrentTenantId,
  useRunInstanceStandard,
  useWorkflowAndArtifactsStandard,
  useWorkflowApp,
} from './Services/WorkflowAndArtifacts';
import { ArmParser } from './Utilities/ArmParser';
import { WorkflowUtility } from './Utilities/Workflow';
import { Chatbot } from '@microsoft/chatbot';
import {
  BaseApiManagementService,
  BaseAppServiceService,
  BaseFunctionService,
  BaseGatewayService,
  BaseOAuthService,
  StandardConnectionService,
  StandardConnectorService,
  StandardOperationManifestService,
  StandardRunService,
  StandardSearchService,
} from '@microsoft/designer-client-services-logic-apps';
import type { Workflow } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { clone, equals, guid, isArmResourceId } from '@microsoft/utils-logic-apps';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import isEqual from 'lodash.isequal';
import * as React from 'react';
import type { QueryClient } from 'react-query';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const DesignerEditor = () => {
  const { id: workflowId } = useSelector((state: RootState) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: state.workflowLoader.resourcePath!,
  }));

  const {
    readOnly: isReadOnly,
    darkMode: isDarkMode,
    monitoringView,
    runId,
    appId,
    showChatBot,
    language,
  } = useSelector((state: RootState) => state.workflowLoader);

  const workflowName = workflowId.split('/').splice(-1)[0];
  const siteResourceId = new ArmParser(workflowId).topmostResourceId;
  const { data, isLoading, isError, error } = useWorkflowAndArtifactsStandard(workflowId);
  const { data: settingsData, isLoading: settingsLoading, isError: settingsIsError, error: settingsError } = useAppSettings(siteResourceId);
  const { data: workflowAppData, isLoading: appLoading } = useWorkflowApp(siteResourceId);
  const { data: tenantId } = useCurrentTenantId();
  const [designerID, setDesignerID] = React.useState(guid());
  const [workflow, setWorkflow] = React.useState(data?.properties.files[Artifact.WorkflowFile]);
  const connectionsData = data?.properties.files[Artifact.ConnectionsFile] ?? {};
  const connectionReferences = WorkflowUtility.convertConnectionsDataToReferences(connectionsData);
  const parameters = data?.properties.files[Artifact.ParametersFile] ?? {};
  const queryClient = useQueryClient();

  const onRunInstanceSuccess = async (runDefinition: LogicAppsV2.RunInstanceDefinition) => {
    if (monitoringView) {
      const standardAppInstance = {
        ...workflow,
        definition: runDefinition.properties.workflow.properties.definition,
      };
      setWorkflow(standardAppInstance);
    }
  };
  const { data: runInstanceData } = useRunInstanceStandard(workflowName, onRunInstanceSuccess, appId, runId);

  const addConnectionData = async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
    addConnectionInJson(connectionAndSetting, connectionsData ?? {});
    addOrUpdateAppSettings(connectionAndSetting.settings, settingsData?.properties ?? {});
  };

  const getConnectionConfiguration = async (connectionId: string): Promise<any> => {
    if (!connectionId) {
      return Promise.resolve();
    }

    const connectionName = connectionId.split('/').splice(-1)[0];
    const connectionInfo =
      connectionsData?.serviceProviderConnections?.[connectionName] ?? connectionsData?.apiManagementConnections?.[connectionName];

    if (connectionInfo) {
      // TODO(psamband): Add new settings in this blade so that we do not resolve all the appsettings in the connectionInfo.
      const resolvedConnectionInfo = WorkflowUtility.resolveConnectionsReferences(
        JSON.stringify(connectionInfo),
        {},
        settingsData?.properties
      );
      delete resolvedConnectionInfo.displayName;

      return {
        connection: resolvedConnectionInfo,
      };
    }

    return undefined;
  };

  const discardAllChanges = () => {
    setDesignerID(guid());
  };
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? '');
  const services = React.useMemo(
    () =>
      getDesignerServices(
        workflowId,
        equals(workflow?.kind, 'stateful'),
        connectionsData ?? {},
        workflowAppData as WorkflowApp,
        addConnectionData,
        getConnectionConfiguration,
        tenantId,
        canonicalLocation,
        queryClient
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflow, workflowId, connectionsData, settingsData, workflowAppData, tenantId, designerID]
  );

  // Our iframe root element is given a strange padding (not in this repo), this removes it
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.padding = '0px';
      root.style.overflow = 'hidden';
    }
  }, []);

  React.useEffect(() => {
    setWorkflow(data?.properties.files[Artifact.WorkflowFile]);
  }, [data?.properties.files]);

  if (isLoading || appLoading || settingsLoading) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  }

  const originalSettings: Record<string, string> = { ...(settingsData?.properties ?? {}) };
  const originalConnectionsData: ConnectionsData = clone(connectionsData ?? {});
  const originalParametersData: ParametersData = clone(parameters ?? {});

  if (isError || settingsIsError) {
    throw error ?? settingsError;
  }

  const saveWorkflowFromDesigner = async (workflowFromDesigner: Workflow): Promise<void> => {
    const { definition, connectionReferences, parameters } = workflowFromDesigner;
    const workflowToSave = {
      ...workflow,
      definition,
    };

    const referencesToAdd = { ...(connectionsData?.managedApiConnections ?? {}) };
    if (Object.keys(connectionReferences ?? {}).length) {
      await Promise.all(
        Object.keys(connectionReferences).map(async (referenceKey) => {
          const reference = connectionReferences[referenceKey];
          if (isArmResourceId(reference.connection.id) && !referencesToAdd[referenceKey]) {
            const {
              api: { id: apiId },
              connection: { id: connectionId },
              connectionProperties,
            } = reference;
            const connection = await getConnectionStandard(connectionId);
            referencesToAdd[referenceKey] = {
              api: { id: apiId },
              connection: { id: connectionId },
              authentication: { type: 'ManagedServiceIdentity' },
              connectionRuntimeUrl: connection?.properties?.connectionRuntimeUrl ?? '',
              connectionProperties,
            };
          }
        })
      );
      (connectionsData as ConnectionsData).managedApiConnections = referencesToAdd;
    }

    const connectionsToUpdate = getConnectionsToUpdate(originalConnectionsData, connectionsData ?? {});
    const parametersToUpdate = !isEqual(originalParametersData, parameters) ? (parameters as ParametersData) : undefined;
    const settingsToUpdate = !isEqual(settingsData?.properties, originalSettings) ? settingsData?.properties : undefined;

    return saveWorkflowStandard(siteResourceId, workflowName, workflowToSave, connectionsToUpdate, parametersToUpdate, settingsToUpdate);
  };

  return (
    <div key={designerID} style={{ height: 'inherit', width: 'inherit' }}>
      <DesignerProvider locale={language} options={{ services, isDarkMode, readOnly: isReadOnly, isMonitoringView: monitoringView }}>
        {workflow?.definition ? (
          <BJSWorkflowProvider
            workflow={{ definition: workflow?.definition, connectionReferences, parameters }}
            runInstance={runInstanceData}
          >
            <div style={{ height: 'inherit', width: 'inherit' }}>
              <DesignerCommandBar
                id={workflowId}
                saveWorkflow={saveWorkflowFromDesigner}
                discard={discardAllChanges}
                location={canonicalLocation}
                isReadOnly={isReadOnly}
                isDarkMode={isDarkMode}
              />
              <Designer />
              {showChatBot ? <Chatbot /> : null}
            </div>
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </div>
  );
};

const getDesignerServices = (
  workflowId: string,
  isStateful: boolean,
  connectionsData: ConnectionsData,
  workflowApp: WorkflowApp,
  addConnection: (data: ConnectionAndAppSetting) => Promise<void>,
  getConfiguration: (connectionId: string) => Promise<any>,
  tenantId: string | undefined,
  location: string,
  queryClient: QueryClient
): any => {
  const siteResourceId = new ArmParser(workflowId).topmostResourceId;
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const workflowName = workflowId.split('/').splice(-1)[0];
  const workflowIdWithHostRuntime = `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}`;
  const { subscriptionId, resourceGroup } = new ArmParser(workflowId);

  const connectionService = new StandardConnectionService({
    baseUrl,
    apiVersion,
    httpClient,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: armUrl,
      subscriptionId,
      resourceGroup,
      location,
    },
    tenantId,
    workflowAppDetails: { appName: siteResourceId.split('/').splice(-1)[0], identity: workflowApp?.identity as any },
    readConnections: () => Promise.resolve(connectionsData),
    writeConnection: addConnection as any,
    connectionCreationClients: {
      FileSystem: new FileSystemConnectionCreationClient({
        baseUrl: armUrl,
        subscriptionId,
        resourceGroup,
        appName: siteResourceId.split('/').splice(-1)[0],
        apiVersion: '2022-03-01',
        httpClient,
      }),
    },
  });
  const apiManagementService = new BaseApiManagementService({
    apiVersion: '2019-12-01',
    baseUrl,
    subscriptionId,
    httpClient,
    queryClient,
  });
  const childWorkflowService = new ChildWorkflowService({ apiVersion, baseUrl: armUrl, siteResourceId, httpClient, workflowName });
  const artifactService = new ArtifactService({
    apiVersion,
    baseUrl: armUrl,
    siteResourceId,
    httpClient,
    integrationAccountCallbackUrl: undefined,
  });
  const appService = new BaseAppServiceService({ baseUrl: armUrl, apiVersion, subscriptionId, httpClient });
  const connectorService = new StandardConnectorService({
    apiVersion,
    baseUrl,
    httpClient,
    clientSupportedOperations: [
      ['connectionProviders/localWorkflowOperation', 'invokeWorkflow'],
      ['connectionProviders/xmlOperations', 'xmlValidation'],
      ['connectionProviders/xmlOperations', 'xmlTransform'],
      ['connectionProviders/liquidOperations', 'liquidJsonToJson'],
      ['connectionProviders/liquidOperations', 'liquidJsonToText'],
      ['connectionProviders/liquidOperations', 'liquidXmlToJson'],
      ['connectionProviders/liquidOperations', 'liquidXmlToText'],
      ['connectionProviders/flatFileOperations', 'flatFileDecoding'],
      ['connectionProviders/flatFileOperations', 'flatFileEncoding'],
      ['connectionProviders/swiftOperations', 'SwiftDecode'],
      ['connectionProviders/swiftOperations', 'SwiftEncode'],
      ['/connectionProviders/apiManagementOperation', 'apiManagement'],
      ['connectionProviders/http', 'httpswaggeraction'],
      ['connectionProviders/http', 'httpswaggertrigger'],
    ].map(([connectorId, operationId]) => ({ connectorId, operationId })),
    getConfiguration,
    schemaClient: {
      getWorkflowSwagger: (args: any) => childWorkflowService.getWorkflowTriggerSchema(args.parameters.name),
      getApimOperationSchema: (args: any) => {
        const { configuration, parameters, isInput } = args;
        if (!configuration?.connection?.apiId) {
          throw new Error('Missing api information to make dynamic call');
        }
        return apiManagementService.getOperationSchema(configuration.connection.apiId, parameters.operationId, isInput);
      },
      getSwaggerOperationSchema: (args: any) => {
        const { parameters, isInput } = args;
        return appService.getOperationSchema(parameters.swaggerUrl, parameters.operationId, isInput);
      },
    },
    valuesClient: {
      getWorkflows: () => childWorkflowService.getWorkflowsWithRequestTrigger(),
      getMapArtifacts: (args: any) => {
        const { mapType, mapSource } = args.parameters;
        return artifactService.getMapArtifacts(mapType, mapSource);
      },
      getSwaggerOperations: (args: any) => {
        const { parameters } = args;
        return appService.getOperations(parameters.swaggerUrl);
      },
      getSchemaArtifacts: (args: any) => artifactService.getSchemaArtifacts(args.parameters.schemaSource),
      getApimOperations: (args: any) => {
        const { configuration } = args;
        if (!configuration?.connection?.apiId) {
          throw new Error('Missing api information to make dynamic call');
        }

        return apiManagementService.getOperations(configuration?.connection?.apiId);
      },
    },
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: armUrl,
      subscriptionId,
      resourceGroup,
    },
    workflowReferenceId: '',
  });
  const gatewayService = new BaseGatewayService({
    baseUrl: armUrl,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
      gateway: '2016-06-01',
    },
  });

  const operationManifestService = new StandardOperationManifestService({
    apiVersion,
    baseUrl,
    httpClient,
  });
  const searchService = new StandardSearchService({
    baseUrl,
    apiVersion,
    httpClient,
    apiHubServiceDetails: { apiVersion: '2018-07-01-preview', subscriptionId, location },
    showStatefulOperations: isStateful,
    isDev: false,
  });

  const oAuthService = new BaseOAuthService({
    apiVersion: '2018-07-01-preview',
    baseUrl,
    httpClient,
    subscriptionId,
    resourceGroup,
    location,
  });

  const workflowService = {
    getCallbackUrl: (triggerName: string) => listCallbackUrl(workflowIdWithHostRuntime, triggerName),
    getAppIdentity: () => workflowApp.identity,
    isExplicitAuthRequiredForManagedIdentity: () => true,
  };

  const functionService = new BaseFunctionService({
    baseUrl: armUrl,
    apiVersion,
    subscriptionId,
    httpClient,
  });

  const runService = new StandardRunService({
    apiVersion,
    baseUrl,
    workflowName,
    httpClient,
  });

  return {
    appService,
    connectionService,
    connectorService,
    gatewayService,
    operationManifestService,
    searchService,
    loggerService: null,
    oAuthService,
    workflowService,
    apimService: apiManagementService,
    functionService,
    runService,
  };
};

const addConnectionInJson = (connectionAndSetting: ConnectionAndAppSetting, connectionsJson: ConnectionsData): void => {
  const { connectionData, connectionKey, pathLocation } = connectionAndSetting;

  let pathToSetConnectionsData: any = connectionsJson;

  for (const path of pathLocation) {
    if (!pathToSetConnectionsData[path]) {
      pathToSetConnectionsData[path] = {};
    }

    pathToSetConnectionsData = pathToSetConnectionsData[path];
  }

  if (pathToSetConnectionsData && pathToSetConnectionsData[connectionKey]) {
    // TODO: To show this in a notification of info bar on the blade.
    // const message = 'ConnectionKeyAlreadyExist - Connection key \'{0}\' already exists.'.format(connectionKey);
    return;
  }

  pathToSetConnectionsData[connectionKey] = connectionData;
};

const addOrUpdateAppSettings = (settings: Record<string, string>, originalSettings: Record<string, string>): Record<string, string> => {
  const settingsToAdd = Object.keys(settings);

  for (const settingKey of settingsToAdd) {
    if (originalSettings[settingKey]) {
      // TODO: To show this in a notification of info bar on the blade that key will be overriden.
    }

    // eslint-disable-next-line no-param-reassign
    originalSettings[settingKey] = settings[settingKey];
  }

  return originalSettings;
};

const getConnectionsToUpdate = (
  originalConnectionsJson: ConnectionsData,
  connectionsJson: ConnectionsData
): ConnectionsData | undefined => {
  const originalKeys = Object.keys({
    ...(originalConnectionsJson.functionConnections ?? {}),
    ...(originalConnectionsJson.apiManagementConnections ?? {}),
    ...(originalConnectionsJson.managedApiConnections ?? {}),
    ...(originalConnectionsJson.serviceProviderConnections ?? {}),
  });

  const updatedKeys = Object.keys({
    ...(connectionsJson.functionConnections ?? {}),
    ...(connectionsJson.apiManagementConnections ?? {}),
    ...(connectionsJson.managedApiConnections ?? {}),
    ...(connectionsJson.serviceProviderConnections ?? {}),
  });

  // NOTE: We don't edit connections from the workflow, so existing connections should not be changed. If no new connections are added, there was no change.
  if (!updatedKeys.some((conn) => !originalKeys.includes(conn))) {
    return undefined;
  }

  const connectionsToUpdate = { ...connectionsJson };
  for (const functionConnectionName of Object.keys(connectionsJson.functionConnections ?? {})) {
    if (originalConnectionsJson.functionConnections?.[functionConnectionName]) {
      (connectionsToUpdate.functionConnections as any)[functionConnectionName] =
        originalConnectionsJson.functionConnections[functionConnectionName];
    }
  }

  for (const apimConnectionName of Object.keys(connectionsJson.apiManagementConnections ?? {})) {
    if (originalConnectionsJson.apiManagementConnections?.[apimConnectionName]) {
      (connectionsToUpdate.apiManagementConnections as any)[apimConnectionName] =
        originalConnectionsJson.apiManagementConnections[apimConnectionName];
    }
  }

  for (const managedApiConnectionName of Object.keys(connectionsJson.managedApiConnections ?? {})) {
    if (originalConnectionsJson.managedApiConnections?.[managedApiConnectionName]) {
      // eslint-disable-next-line no-param-reassign
      (connectionsJson.managedApiConnections as any)[managedApiConnectionName] =
        originalConnectionsJson.managedApiConnections[managedApiConnectionName];
    }
  }

  for (const serviceProviderConnectionName of Object.keys(connectionsJson.serviceProviderConnections ?? {})) {
    if (originalConnectionsJson.serviceProviderConnections?.[serviceProviderConnectionName]) {
      // eslint-disable-next-line no-param-reassign
      (connectionsJson.serviceProviderConnections as any)[serviceProviderConnectionName] =
        originalConnectionsJson.serviceProviderConnections[serviceProviderConnectionName];
    }
  }

  return connectionsToUpdate;
};

export default DesignerEditor;
