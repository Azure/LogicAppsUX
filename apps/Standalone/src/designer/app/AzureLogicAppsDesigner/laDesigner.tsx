import { environment } from '../../../environments/environment';
import type { AppDispatch, RootState } from '../../state/store';
import { changeRunId, setIsChatBotEnabled } from '../../state/workflowLoadingSlice';
import { DesignerCommandBar } from './DesignerCommandBar';
import type { ConnectionAndAppSetting, ConnectionsData, ParametersData } from './Models/Workflow';
import { Artifact } from './Models/Workflow';
import type { WorkflowApp } from './Models/WorkflowApp';
import { ArtifactService } from './Services/Artifact';
import { ChildWorkflowService } from './Services/ChildWorkflow';
import { FileSystemConnectionCreationClient } from './Services/FileSystemConnectionCreationClient';
import { HttpClient, getExtraHeaders, getRequestUrl, isSuccessResponse } from './Services/HttpClient';
import { StandaloneOAuthService } from './Services/OAuthService';
import {
  getConnectionStandard,
  getCustomCodeAppFiles,
  listCallbackUrl,
  saveWorkflowStandard,
  useAllCustomCodeFiles,
  useAppSettings,
  useCurrentObjectId,
  useCurrentTenantId,
  useRunInstanceStandard,
  useWorkflowAndArtifactsStandard,
  useWorkflowApp,
} from './Services/WorkflowAndArtifacts';
import { ArmParser } from './Utilities/ArmParser';
import { WorkflowUtility, addConnectionInJson, addOrUpdateAppSettings } from './Utilities/Workflow';
import { Chatbot, chatbotPanelWidth } from '@microsoft/logic-apps-chatbot';
import {
  BaseApiManagementService,
  BaseAppServiceService,
  BaseChatbotService,
  BaseFunctionService,
  BaseGatewayService,
  BaseTenantService,
  StandardConnectionService,
  StandardConnectorService,
  StandardCustomCodeService,
  StandardOperationManifestService,
  StandardRunService,
  StandardSearchService,
  clone,
  equals,
  guid,
  isArmResourceId,
  optional,
} from '@microsoft/logic-apps-shared';
import type { ContentType, IWorkflowService, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { AllCustomCodeFiles, CustomCodeFileNameMapping, Workflow } from '@microsoft/logic-apps-designer';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
  getReactQueryClient,
  serializeBJSWorkflow,
  store as DesignerStore,
  Constants,
  getSKUDefaultHostOptions,
} from '@microsoft/logic-apps-designer';
import axios from 'axios';
import isEqual from 'lodash.isequal';
import { useEffect, useMemo, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useHostingPlan } from '../../state/workflowLoadingSelectors';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const DesignerEditor = () => {
  const { id: workflowId } = useSelector((state: RootState) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: state.workflowLoader.resourcePath!,
  }));

  const dispatch = useDispatch<AppDispatch>();
  const {
    isReadOnly,
    isDarkMode,
    isMonitoringView,
    runId,
    appId,
    showChatBot,
    language,
    hostOptions,
    hostingPlan,
    showConnectionsPanel,
    showPerformanceDebug,
    suppressDefaultNodeSelect,
  } = useSelector((state: RootState) => state.workflowLoader);
  const isHybridLogicApp = hostingPlan === 'hybrid';
  const workflowName = workflowId.split('/').splice(-1)[0];
  const siteResourceId = new ArmParser(workflowId).topmostResourceId;
  const { data: customCodeData, isLoading: customCodeLoading } = useAllCustomCodeFiles(appId, workflowName, isHybridLogicApp);
  const { data, isLoading, isError, error } = useWorkflowAndArtifactsStandard(workflowId);
  const { data: settingsData, isLoading: settingsLoading, isError: settingsIsError, error: settingsError } = useAppSettings(siteResourceId);
  const { data: workflowAppData, isLoading: appLoading } = useWorkflowApp(siteResourceId, useHostingPlan());
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const [designerID, setDesignerID] = useState(guid());
  const [workflow, setWorkflow] = useState(data?.properties.files[Artifact.WorkflowFile]);
  const originalConnectionsData = useMemo(() => data?.properties.files[Artifact.ConnectionsFile] ?? {}, [data?.properties.files]);
  const originalCustomCodeData = useMemo(() => Object.keys(customCodeData ?? {}), [customCodeData]);
  const parameters = useMemo(() => data?.properties.files[Artifact.ParametersFile] ?? {}, [data?.properties.files]);
  const queryClient = getReactQueryClient();

  const onRunInstanceSuccess = async (runDefinition: LogicAppsV2.RunInstanceDefinition) => {
    if (isMonitoringView) {
      const standardAppInstance = {
        ...workflow,
        definition: runDefinition.properties.workflow.properties.definition,
      };
      setWorkflow(standardAppInstance);
    }
  };
  const { data: runInstanceData } = useRunInstanceStandard(workflowName, onRunInstanceSuccess, appId, runId);

  const connectionsData = useMemo(
    () =>
      WorkflowUtility.resolveConnectionsReferences(
        JSON.stringify(clone(originalConnectionsData ?? {})),
        parameters,
        settingsData?.properties ?? {}
      ),
    [originalConnectionsData, parameters, settingsData?.properties]
  );

  const addConnectionDataInternal = async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
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

  const connectionReferences = WorkflowUtility.convertConnectionsDataToReferences(connectionsData);

  const discardAllChanges = () => {
    setDesignerID(guid());
  };

  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? '');
  const services = useMemo(
    () =>
      getDesignerServices(
        workflowId,
        equals(workflow?.kind, 'stateful'),
        isHybridLogicApp,
        connectionsData ?? {},
        workflowAppData as WorkflowApp,
        addConnectionDataInternal,
        getConnectionConfiguration,
        tenantId,
        objectId,
        canonicalLocation,
        language,
        queryClient,
        dispatch
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflow, workflowId, connectionsData, settingsData, workflowAppData, tenantId, designerID, runId, language]
  );

  // Our iframe root element is given a strange padding (not in this repo), this removes it
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.padding = '0px';
      root.style.overflow = 'hidden';
    }
  }, []);

  useEffect(() => {
    setWorkflow(data?.properties.files[Artifact.WorkflowFile]);
  }, [data?.properties.files]);

  if (isLoading || appLoading || settingsLoading || customCodeLoading) {
    return <></>;
  }

  const originalSettings: Record<string, string> = {
    ...(settingsData?.properties ?? {}),
  };
  const originalParametersData: ParametersData = clone(parameters ?? {});

  if (isError || settingsIsError) {
    throw error ?? settingsError;
  }

  const saveWorkflowFromDesigner = async (
    workflowFromDesigner: Workflow,
    customCode: CustomCodeFileNameMapping | undefined,
    clearDirtyState: () => void
  ): Promise<void> => {
    const { definition, connectionReferences, parameters } = workflowFromDesigner;
    const workflowToSave = {
      ...workflow,
      definition,
    };

    const newManagedApiConnections = {
      ...(connectionsData?.managedApiConnections ?? {}),
    };
    const newServiceProviderConnections: Record<string, any> = {};

    const referenceKeys = Object.keys(connectionReferences ?? {});
    if (referenceKeys.length) {
      await Promise.all(
        referenceKeys.map(async (referenceKey) => {
          const reference = connectionReferences[referenceKey];
          if (isArmResourceId(reference?.connection?.id) && !newManagedApiConnections[referenceKey]) {
            // Managed API Connection
            const {
              api: { id: apiId },
              connection: { id: connectionId },
              connectionProperties,
            } = reference;
            const connection = await getConnectionStandard(connectionId);
            const userIdentity = connectionProperties?.authentication?.identity;
            const newConnectionObj = {
              api: { id: apiId },
              connection: { id: connectionId },
              authentication: {
                type: 'ManagedServiceIdentity',
                ...optional('identity', userIdentity),
              },
              connectionRuntimeUrl: connection?.properties?.connectionRuntimeUrl ?? '',
              connectionProperties,
            };
            newManagedApiConnections[referenceKey] = newConnectionObj;
          } else if (reference?.connection?.id.startsWith('/serviceProviders/')) {
            // Service Provider Connection
            const connectionKey = reference.connection.id.split('/').splice(-1)[0];
            // We can't apply this directly in case there is a temporary key overlap
            // We need to move the data out to a new object, delete the old data, then apply the new data at the end
            newServiceProviderConnections[referenceKey] = connectionsData?.serviceProviderConnections?.[connectionKey];
            delete connectionsData?.serviceProviderConnections?.[connectionKey];
          }
        })
      );
      (connectionsData as ConnectionsData).managedApiConnections = newManagedApiConnections;
      (connectionsData as ConnectionsData).serviceProviderConnections = {
        ...connectionsData?.serviceProviderConnections,
        ...newServiceProviderConnections,
      };
    }

    const connectionsToUpdate = getConnectionsToUpdate(originalConnectionsData, connectionsData ?? {});
    const customCodeToUpdate = await getCustomCodeToUpdate(originalCustomCodeData, customCode ?? {}, appId);
    const parametersToUpdate = isEqual(originalParametersData, parameters) ? undefined : (parameters as ParametersData);
    const settingsToUpdate = isEqual(settingsData?.properties, originalSettings) ? undefined : settingsData?.properties;

    return saveWorkflowStandard(
      siteResourceId,
      workflowName,
      workflowToSave,
      connectionsToUpdate,
      parametersToUpdate,
      settingsToUpdate,
      customCodeToUpdate,
      clearDirtyState
    );
  };

  const getUpdatedWorkflow = async (): Promise<Workflow> => {
    const designerState = DesignerStore.getState();
    const serializedWorkflow = await serializeBJSWorkflow(designerState, {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    });
    return serializedWorkflow;
  };

  // This is a callback used in Azure Portal, but not supported in standalone
  const openPanel = (s: string) => {
    alert(s);
  };

  const getAuthToken = async () => {
    return `Bearer ${environment.armToken}` ?? '';
  };

  return (
    <div key={designerID} style={{ height: 'inherit', width: 'inherit' }}>
      <DesignerProvider
        id={designerID}
        key={designerID}
        locale={language}
        options={{
          services,
          isDarkMode,
          readOnly: isReadOnly,
          isMonitoringView,
          suppressDefaultNodeSelectFunctionality: suppressDefaultNodeSelect,
          hostOptions: {
            ...hostOptions,
            ...getSKUDefaultHostOptions(Constants.SKU.STANDARD),
          },
          showConnectionsPanel,
          showPerformanceDebug,
        }}
      >
        {workflow?.definition ? (
          <BJSWorkflowProvider
            workflow={{
              definition: workflow?.definition,
              connectionReferences,
              parameters,
              kind: workflow?.kind,
            }}
            customCode={customCodeData}
            runInstance={runInstanceData}
            appSettings={settingsData?.properties}
          >
            <div style={{ height: 'inherit', width: 'inherit' }}>
              <DesignerCommandBar
                id={workflowId}
                saveWorkflow={saveWorkflowFromDesigner}
                discard={discardAllChanges}
                location={canonicalLocation}
                isReadOnly={isReadOnly}
                isDarkMode={isDarkMode}
                showConnectionsPanel={showConnectionsPanel}
                rightShift={showChatBot ? chatbotPanelWidth : undefined}
                enableCopilot={async () => {
                  dispatch(setIsChatBotEnabled(!showChatBot));
                }}
              />
              <Designer rightShift={showChatBot ? chatbotPanelWidth : undefined} />
              {showChatBot ? (
                <Chatbot
                  openAzureCopilotPanel={() => openPanel('Azure Copilot Panel has been opened')}
                  getAuthToken={getAuthToken}
                  getUpdatedWorkflow={getUpdatedWorkflow}
                  openFeedbackPanel={() => openPanel('Azure Feedback Panel has been opened')}
                  closeChatBot={() => dispatch(setIsChatBotEnabled(false))}
                />
              ) : null}
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
  isHybrid: boolean,
  connectionsData: ConnectionsData,
  workflowApp: WorkflowApp,
  addConnection: (data: ConnectionAndAppSetting) => Promise<void>,
  getConfiguration: (connectionId: string) => Promise<any>,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  locale: string | undefined,
  queryClient: QueryClient,
  dispatch: AppDispatch
): any => {
  const siteResourceId = new ArmParser(workflowId).topmostResourceId;
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const workflowName = workflowId.split('/').splice(-1)[0];
  const workflowIdWithHostRuntime = `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}`;
  const appName = siteResourceId.split('/').splice(-1)[0];
  const { subscriptionId, resourceGroup } = new ArmParser(workflowId);

  const defaultServiceParams = { baseUrl, httpClient, apiVersion };
  const armServiceParams = {
    ...defaultServiceParams,
    baseUrl: armUrl,
    siteResourceId,
  };

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
    workflowAppDetails: { appName, identity: workflowApp?.identity as any },
    readConnections: () => Promise.resolve(connectionsData),
    writeConnection: addConnection as any,
    connectionCreationClients: {
      FileSystem: new FileSystemConnectionCreationClient({
        baseUrl: armUrl,
        subscriptionId,
        resourceGroup,
        appName,
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
  const childWorkflowService = new ChildWorkflowService({
    apiVersion,
    baseUrl: armUrl,
    siteResourceId,
    httpClient,
    workflowName,
  });
  const artifactService = new ArtifactService({
    ...armServiceParams,
    siteResourceId,
    integrationAccountCallbackUrl: undefined,
  });
  const appService = new BaseAppServiceService({
    baseUrl: armUrl,
    apiVersion,
    subscriptionId,
    httpClient,
  });
  const connectorService = new StandardConnectorService({
    ...defaultServiceParams,
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
        return appService.getOperationSchema(
          parameters.swaggerUrl,
          parameters.operationId,
          isInput,
          true /* supportsAuthenticationParameter */
        );
      },
      getWorkflowSubSchema: (args: any) => {
        const { parameters } = args;
        if (parameters.param1 && parameters.param2 && parameters.param3) {
          const objectType = `${parameters.param1}Type`;
          return Promise.resolve({
            type: 'object',
            properties: {
              numberType: {
                type: 'number',
              },
              [objectType]: {
                type: 'object',
                properties: {
                  o1: {
                    type: 'integer',
                  },
                  dynamicObject2: {
                    type: 'object',
                    properties: {},
                    'x-ms-dynamic-properties': {
                      dynamicState: {
                        extension: {
                          operationId: 'getWorkflowSubSubSchema',
                        },
                        isInput: true,
                      },
                      parameters: {
                        param1: {
                          parameterReference: 'host.workflow.id',
                          required: true,
                        },
                        param2: {
                          parameterReference: 'body.objectType.p1',
                          required: true,
                        },
                        param3: {
                          parameterReference: `body.dynamicObject.${objectType}.o1`,
                          required: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });
        }

        return Promise.resolve({
          type: 'object',
          properties: {
            mockString: {
              type: 'string',
            },
          },
        });
      },
      getWorkflowSubSubSchema: (args: any) => {
        const { parameters } = args;
        if (parameters.param1 && parameters.param2 && parameters.param3) {
          return Promise.resolve({
            type: 'object',
            properties: {
              [`${parameters.param1}-Type`]: {
                type: 'string',
              },
              [`${parameters.param2}-Type`]: {
                type: 'string',
              },
              [`${parameters.param3}-Type`]: {
                type: 'string',
              },
            },
          });
        }

        return Promise.resolve({
          type: 'object',
          properties: {
            mockBool: {
              type: 'boolean',
            },
          },
        });
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
    },
  });
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
    apiVersion: '2017-08-01',
    httpClient,
  });

  const operationManifestService = new StandardOperationManifestService(defaultServiceParams);
  const searchService = new StandardSearchService({
    ...defaultServiceParams,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      subscriptionId,
      location,
    },
    showStatefulOperations: isStateful,
    isDev: false,
    hybridLogicApp: isHybrid,
    locale,
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

  const workflowService: IWorkflowService = {
    getCallbackUrl: (triggerName: string) => listCallbackUrl(workflowIdWithHostRuntime, triggerName),
    getAppIdentity: () => workflowApp.identity as any,
    isExplicitAuthRequiredForManagedIdentity: () => true,
    resubmitWorkflow: async (runId, actionsToResubmit) => {
      const options = {
        uri: `${workflowIdWithHostRuntime}/runs/${runId}/resubmit?api-version=2018-11-01`,
        content: {
          actionsToResubmit: actionsToResubmit.map((name) => ({
            name,
          })),
        },
      };
      const response = await axios.post(getRequestUrl(options), options.content, {
        headers: {
          ...getExtraHeaders(),
          'Content-Type': 'application/json',
          Authorization: `Bearer ${environment.armToken}`,
        },
      });

      if (!isSuccessResponse(response.status)) {
        return Promise.reject(response);
      }

      const workflowId: string = response.headers['x-ms-workflow-run-id'];
      dispatch(changeRunId(workflowId));
    },
  };

  const hostService = {
    fetchAndDisplayContent: (title: string, url: string, type: ContentType) => console.log(title, url, type),
    openWorkflowParametersBlade: () => console.log('openWorkflowParametersBlade'),
    openConnectionResource: (connectionId: string) => console.log('openConnectionResource:', connectionId),
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

  const chatbotService = new BaseChatbotService({
    baseUrl: armUrl,
    apiVersion: '2022-09-01-preview',
    subscriptionId,
    location,
  });

  const customCodeService = new StandardCustomCodeService({
    apiVersion: '2018-11-01',
    baseUrl: armUrl,
    subscriptionId,
    resourceGroup,
    appName,
    workflowName,
    httpClient,
  });

  return {
    appService,
    connectionService,
    connectorService,
    gatewayService,
    tenantService,
    operationManifestService,
    searchService,
    loggerService: null,
    oAuthService,
    workflowService,
    apimService: apiManagementService,
    functionService,
    runService,
    hostService,
    chatbotService,
    customCodeService,
  };
};

const hasNewKeys = (original: Record<string, any> = {}, updated: Record<string, any> = {}) => {
  return !Object.keys(updated).some((key) => !Object.keys(original).includes(key));
};

const getConnectionsToUpdate = (
  originalConnectionsJson: ConnectionsData,
  connectionsJson: ConnectionsData
): ConnectionsData | undefined => {
  const hasNewFunctionKeys = hasNewKeys(originalConnectionsJson.functionConnections, connectionsJson.functionConnections);
  const hasNewApimKeys = hasNewKeys(originalConnectionsJson.apiManagementConnections, connectionsJson.apiManagementConnections);
  const hasNewManagedApiKeys = hasNewKeys(originalConnectionsJson.managedApiConnections, connectionsJson.managedApiConnections);
  const hasNewServiceProviderKeys = hasNewKeys(
    originalConnectionsJson.serviceProviderConnections,
    connectionsJson.serviceProviderConnections
  );

  if (!hasNewFunctionKeys && !hasNewApimKeys && !hasNewManagedApiKeys && !hasNewServiceProviderKeys) {
    return undefined;
  }

  const connectionsToUpdate = { ...connectionsJson };

  if (hasNewFunctionKeys) {
    for (const functionConnectionName of Object.keys(connectionsJson.functionConnections ?? {})) {
      if (originalConnectionsJson.functionConnections?.[functionConnectionName]) {
        (connectionsToUpdate.functionConnections as any)[functionConnectionName] =
          originalConnectionsJson.functionConnections[functionConnectionName];
      }
    }
  }

  if (hasNewApimKeys) {
    for (const apimConnectionName of Object.keys(connectionsJson.apiManagementConnections ?? {})) {
      if (originalConnectionsJson.apiManagementConnections?.[apimConnectionName]) {
        (connectionsToUpdate.apiManagementConnections as any)[apimConnectionName] =
          originalConnectionsJson.apiManagementConnections[apimConnectionName];
      }
    }
  }

  if (hasNewManagedApiKeys) {
    for (const managedApiConnectionName of Object.keys(connectionsJson.managedApiConnections ?? {})) {
      if (originalConnectionsJson.managedApiConnections?.[managedApiConnectionName]) {
        // eslint-disable-next-line no-param-reassign
        (connectionsJson.managedApiConnections as any)[managedApiConnectionName] =
          originalConnectionsJson.managedApiConnections[managedApiConnectionName];
      }
    }
  }

  if (hasNewServiceProviderKeys) {
    for (const serviceProviderConnectionName of Object.keys(connectionsJson.serviceProviderConnections ?? {})) {
      if (originalConnectionsJson.serviceProviderConnections?.[serviceProviderConnectionName]) {
        // eslint-disable-next-line no-param-reassign
        (connectionsJson.serviceProviderConnections as any)[serviceProviderConnectionName] =
          originalConnectionsJson.serviceProviderConnections[serviceProviderConnectionName];
      }
    }
  }

  return connectionsToUpdate;
};

const getCustomCodeToUpdate = async (
  originalCustomCodeData: string[],
  customCode: CustomCodeFileNameMapping,
  appId?: string
): Promise<AllCustomCodeFiles | undefined> => {
  const filteredCustomCodeMapping: CustomCodeFileNameMapping = {};
  if (!customCode || Object.keys(customCode).length === 0) {
    return;
  }
  const appFiles = await getCustomCodeAppFiles(appId, customCode);

  Object.entries(customCode).forEach(([fileName, customCodeData]) => {
    const { isModified, isDeleted } = customCodeData;

    if ((isDeleted && originalCustomCodeData.includes(fileName)) || (isModified && !isDeleted)) {
      filteredCustomCodeMapping[fileName] = { ...customCodeData };
    }
  });
  return { customCodeFiles: filteredCustomCodeMapping, appFiles };
};

export default DesignerEditor;
