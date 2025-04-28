import { environment } from '../../../environments/environment';
import type { AppDispatch, RootState } from '../../state/store';
import { changeRunId, setIsChatBotEnabled, setMonitoringView, setReadOnly, setRunHistoryEnabled } from '../../state/workflowLoadingSlice';
import { DesignerCommandBar } from './DesignerCommandBar';
import type { ConnectionAndAppSetting, ConnectionReferenceModel, ConnectionsData, ParametersData } from './Models/Workflow';
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
  validateWorkflowStandard,
} from './Services/WorkflowAndArtifacts';
import { ArmParser } from './Utilities/ArmParser';
import { WorkflowUtility, addConnectionInJson, addOrUpdateAppSettings } from './Utilities/Workflow';
import { CoPilotChatbot } from '@microsoft/logic-apps-chatbot';
import {
  BaseApiManagementService,
  BaseAppServiceService,
  BaseChatbotService,
  BaseExperimentationService,
  BaseUserPreferenceService,
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
import type { ContentType, IHostService, IWorkflowService } from '@microsoft/logic-apps-shared';
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
  RunHistoryPanel,
  CombineInitializeVariableDialog,
  TriggerDescriptionDialog,
} from '@microsoft/logic-apps-designer';
import axios from 'axios';
import isEqual from 'lodash.isequal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useHostingPlan } from '../../state/workflowLoadingSelectors';
import CodeViewEditor from './CodeView';

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
    isUnitTest,
    isMonitoringView,
    runId,
    appId,
    showChatBot,
    showRunHistory,
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
  const [workflow, setWorkflow] = useState<Workflow>({
    ...data?.properties.files[Artifact.WorkflowFile],
    id: guid(),
  });
  const [designerView, setDesignerView] = useState(true);
  const codeEditorRef = useRef<{ getValue: () => string | undefined }>(null);
  const originalConnectionsData = useMemo(() => data?.properties.files[Artifact.ConnectionsFile] ?? {}, [data?.properties.files]);
  const originalCustomCodeData = useMemo(() => Object.keys(customCodeData ?? {}), [customCodeData]);
  const parameters = useMemo(() => data?.properties.files[Artifact.ParametersFile] ?? {}, [data?.properties.files]);
  const queryClient = getReactQueryClient();
  const displayCopilotChatbot = showChatBot && designerView;

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
  const supportsStateful = !equals(workflow?.kind, 'stateless');
  const services = useMemo(
    () =>
      getDesignerServices(
        workflowId,
        supportsStateful,
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
        settingsData?.properties ?? {},
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

  const { data: runInstanceData } = useRunInstanceStandard(workflowName, appId, runId);

  useEffect(() => {
    if (isMonitoringView && runInstanceData) {
      setWorkflow((previousWorkflow: Workflow) => {
        return {
          ...previousWorkflow,
          definition: runInstanceData.properties.workflow.properties.definition,
        };
      });
    }
  }, [isMonitoringView, runInstanceData]);

  useEffect(() => {
    setWorkflow(data?.properties.files[Artifact.WorkflowFile]);
    setDesignerView(true);
  }, [data?.properties.files]);

  // RUN HISTORY
  const toggleMonitoringView = useCallback(() => {
    dispatch(setMonitoringView(!isMonitoringView));
    dispatch(setReadOnly(!isMonitoringView));
    dispatch(setRunHistoryEnabled(!isMonitoringView));
    if (runId) {
      dispatch(changeRunId(undefined));
    }
  }, [dispatch, isMonitoringView, runId]);
  const onRunSelected = useCallback(
    (runId: string) => {
      dispatch(changeRunId(runId));
    },
    [dispatch]
  );

  const workflowDefinition = useMemo(() => {
    if (equals(workflow?.kind ?? '', 'Agentic', true)) {
      if (workflow?.definition) {
        const { actions, triggers, outputs, parameters } = workflow.definition;
        if (
          Object.keys(actions ?? {}).length === 0 &&
          Object.keys(triggers ?? {}).length === 0 &&
          Object.keys(outputs ?? {}).length === 0 &&
          Object.keys(parameters ?? {}).length === 0
        ) {
          return {
            ...workflow.definition,
            actions: {
              Default_Agent: {
                type: 'Agent',
                limit: {},
                inputs: {},
                tools: {},
                runAfter: {},
              },
            },
          };
        }
      } else {
        return {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          actions: {
            Default_Agent: {
              type: 'Agent',
              limit: {},
              inputs: {},
              tools: {},
              runAfter: {},
            },
          },
          outputs: {},
          triggers: {},
        };
      }
    }
    return workflow?.definition;
  }, [workflow?.definition, workflow?.kind]);

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
    const newAgentConnections: Record<string, any> = {};

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
          } else if (reference?.connection?.id.startsWith('/connectionProviders/agent/')) {
            // Service Provider Connection
            const connectionKey = reference.connection.id.split('/').splice(-1)[0];
            // We can't apply this directly in case there is a temporary key overlap
            // We need to move the data out to a new object, delete the old data, then apply the new data at the end
            newAgentConnections[referenceKey] = connectionsData?.agentConnections?.[connectionKey];
            delete connectionsData?.agentConnections?.[connectionKey];
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
      if (workflow?.kind?.toLowerCase() === 'agentic') {
        (connectionsData as ConnectionsData).agentConnections = {
          ...connectionsData?.agentConnections,
          ...newAgentConnections,
        };
      }
    }

    const connectionsToUpdate = getConnectionsToUpdate(originalConnectionsData, connectionsData ?? {});
    const customCodeToUpdate = await getCustomCodeToUpdate(originalCustomCodeData, customCode ?? {}, appId);
    const parametersToUpdate = isEqual(originalParametersData, parameters) ? undefined : (parameters as ParametersData);
    const settingsToUpdate = isEqual(settingsData?.properties, originalSettings) ? undefined : settingsData?.properties;

    return saveWorkflowStandard(
      siteResourceId,
      [{ name: workflowName, workflow: workflowToSave }],
      connectionsToUpdate,
      parametersToUpdate,
      settingsToUpdate,
      customCodeToUpdate,
      clearDirtyState
    );
  };

  const saveWorkflowFromCode = async (clearDirtyState: () => void) => {
    try {
      const codeToConvert = JSON.parse(codeEditorRef.current?.getValue() ?? '');
      // code view editor cannot add/remove connections, parameters, settings, or customcode
      saveWorkflowStandard(
        siteResourceId,
        [{ name: workflowName, workflow: codeToConvert }],
        /*connections*/ undefined,
        /*parameters*/ undefined,
        /*settings*/ undefined,
        /*customcode*/ undefined,
        clearDirtyState
      );
    } catch (error: any) {
      if (error.status !== 404) {
        alert(`Error converting code to workflow ${error}`);
      }
    }
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
    return environment?.armToken ? `Bearer ${environment.armToken}` : '';
  };

  const handleSwitchView = async () => {
    if (designerView) {
      setDesignerView(false);
    } else {
      try {
        const codeToConvert = JSON.parse(codeEditorRef.current?.getValue() ?? '');
        await validateWorkflowStandard(siteResourceId, workflowName, codeToConvert);
        setWorkflow((prevState) => ({
          ...prevState,
          definition: codeToConvert.definition,
          kind: codeToConvert.kind,
          connectionReferences: codeToConvert.connectionReferences ?? {},
          id: guid(),
        }));
        setDesignerView(true);
      } catch (error: any) {
        if (error.status !== 404) {
          alert(`Error converting code to workflow ${error}`);
        }
      }
    }
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
          isUnitTest,
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
              definition: workflowDefinition,
              connectionReferences,
              parameters,
              kind: workflow?.kind,
            }}
            workflowId={workflow?.id}
            customCode={customCodeData}
            runInstance={runInstanceData}
            appSettings={settingsData?.properties}
            isMultiVariableEnabled={hostOptions.enableMultiVariable}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                height: 'inherit',
              }}
            >
              <RunHistoryPanel
                collapsed={!showRunHistory}
                onClose={() => dispatch(setRunHistoryEnabled(false))}
                onRunSelected={onRunSelected}
              />
              {displayCopilotChatbot ? (
                <CoPilotChatbot
                  openAzureCopilotPanel={() => openPanel('Azure Copilot Panel has been opened')}
                  getAuthToken={getAuthToken}
                  getUpdatedWorkflow={getUpdatedWorkflow}
                  openFeedbackPanel={() => openPanel('Azure Feedback Panel has been opened')}
                  closeChatBot={() => dispatch(setIsChatBotEnabled(false))}
                />
              ) : null}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'inherit',
                  flexGrow: 1,
                  maxWidth: '100%',
                }}
              >
                <DesignerCommandBar
                  id={workflowId}
                  saveWorkflow={saveWorkflowFromDesigner}
                  discard={discardAllChanges}
                  location={canonicalLocation}
                  isReadOnly={isReadOnly}
                  isUnitTest={isUnitTest}
                  isDarkMode={isDarkMode}
                  isDesignerView={designerView}
                  showConnectionsPanel={showConnectionsPanel}
                  enableCopilot={() => dispatch(setIsChatBotEnabled(!showChatBot))}
                  toggleMonitoringView={toggleMonitoringView}
                  showRunHistory={showRunHistory}
                  toggleRunHistory={() => dispatch(setRunHistoryEnabled(!showRunHistory))}
                  selectRun={(runId: string) => {
                    toggleMonitoringView();
                    dispatch(changeRunId(runId));
                  }}
                  switchViews={handleSwitchView}
                  saveWorkflowFromCode={saveWorkflowFromCode}
                  setWorkflow={setWorkflow}
                />
                {designerView ? <Designer /> : <CodeViewEditor ref={codeEditorRef} workflowKind={workflow?.kind} />}
                <CombineInitializeVariableDialog />
                <TriggerDescriptionDialog workflowId={workflowId} />
              </div>
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
  appSettings: Record<string, string>,
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
    workflowAppDetails: isHybrid
      ? {
          appName,
          identity: {
            principalId: appSettings['WORKFLOWAPP_AAD_OBJECTID'],
            tenantId: appSettings['WORKFLOWAPP_AAD_TENANTID'],
          },
        }
      : { appName, identity: workflowApp?.identity as any },
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
    apiVersion: '2021-08-01',
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
    integrationAccountCallbackUrl: appSettings['WORKFLOW_INTEGRATION_ACCOUNT_CALLBACK_URL'],
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
    unsupportedConnectorIds: ['/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/gmail'],
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
    isSplitOnSupported: () => !!isStateful,
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
    notifyCallbackUrlUpdate: (triggerName, newTriggerId) => {
      alert(`Callback URL for ${triggerName} trigger updated to ${newTriggerId}`);
    },
  };

  const hostService: IHostService = {
    fetchAndDisplayContent: (title: string, url: string, type: ContentType) => console.log(title, url, type),
    openWorkflowParametersBlade: () => console.log('openWorkflowParametersBlade'),
    openConnectionResource: (connectionId: string) => console.log('openConnectionResource:', connectionId),
    openMonitorView: (workflowName: string, runName: string) => console.log('openMonitorView:', workflowName, runName),
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
    apiVersion: '2024-06-01-preview',
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
    userPreferenceService: new BaseUserPreferenceService(),
    experimentationService: new BaseExperimentationService(),
  };
};
const hasNewKeys = (original: Record<string, any>, updated: Record<string, any>) => {
  return Object.keys(updated).some((key) => !Object.keys(original).includes(key));
};

const hasNewConnectionRuntimeUrl = (
  original: Record<string, ConnectionReferenceModel>,
  updated: Record<string, ConnectionReferenceModel>
) => {
  return Object.keys(updated).some((key) => {
    const originalConnection = original[key];
    const updatedConnection = updated[key];
    const haveDifferentRuntimeUrl = originalConnection?.connectionRuntimeUrl !== updatedConnection?.connectionRuntimeUrl;
    const haveSameConnectionId = originalConnection?.connection.id === updatedConnection?.connection.id;
    return haveDifferentRuntimeUrl && haveSameConnectionId;
  });
};

const getConnectionsToUpdate = (
  originalConnectionsJson: ConnectionsData,
  connectionsJson: ConnectionsData
): ConnectionsData | undefined => {
  const hasNewFunctionKeys = hasNewKeys(originalConnectionsJson.functionConnections ?? {}, connectionsJson.functionConnections ?? {});
  const hasNewApimKeys = hasNewKeys(originalConnectionsJson.apiManagementConnections ?? {}, connectionsJson.apiManagementConnections ?? {});
  const hasNewManagedApiKeys = hasNewKeys(originalConnectionsJson.managedApiConnections ?? {}, connectionsJson.managedApiConnections ?? {});
  const hasNewServiceProviderKeys = hasNewKeys(
    originalConnectionsJson.serviceProviderConnections ?? {},
    connectionsJson.serviceProviderConnections ?? {}
  );

  const hasNewManagedApiConnectionRuntimeUrl = hasNewConnectionRuntimeUrl(
    originalConnectionsJson.managedApiConnections ?? {},
    connectionsJson.managedApiConnections ?? {}
  );

  const hasNewAgentKeys = hasNewKeys(originalConnectionsJson.agentConnections ?? {}, connectionsJson.agentConnections ?? {});

  if (!hasNewFunctionKeys && !hasNewApimKeys && !hasNewManagedApiKeys && !hasNewServiceProviderKeys && !hasNewAgentKeys) {
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
        (connectionsToUpdate.managedApiConnections as any)[managedApiConnectionName] =
          originalConnectionsJson.managedApiConnections[managedApiConnectionName];

        if (hasNewManagedApiConnectionRuntimeUrl) {
          const newRuntimeUrl = connectionsJson?.managedApiConnections?.[managedApiConnectionName]?.connectionRuntimeUrl;
          if (newRuntimeUrl !== undefined) {
            (connectionsToUpdate.managedApiConnections as any)[managedApiConnectionName].connectionRuntimeUrl = newRuntimeUrl;
          }
        }
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

  if (hasNewAgentKeys) {
    for (const agentConnectionName of Object.keys(connectionsJson.agentConnections ?? {})) {
      if (originalConnectionsJson.agentConnections?.[agentConnectionName]) {
        // eslint-disable-next-line no-param-reassign
        (connectionsJson.agentConnections as any)[agentConnectionName] = originalConnectionsJson.agentConnections[agentConnectionName];
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
