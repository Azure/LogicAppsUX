import { environment } from '../../../environments/environment';
import type { AppDispatch, RootState } from '../../state/store';
import { changeRunId, setIsChatBotEnabled, setMonitoringView, setReadOnly, setRunHistoryEnabled } from '../../state/workflowLoadingSlice';
import { DesignerCommandBar } from './DesignerCommandBarV2';
import type { ConnectionAndAppSetting, ConnectionReferenceModel, ConnectionsData, NotesData, ParametersData } from './Models/Workflow';
import { Artifact, VfsArtifact } from './Models/Workflow';
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
  fetchAgentUrl,
  useAllCustomCodeFiles,
  useAppSettings,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowAndArtifactsStandard,
  useWorkflowApp,
  validateWorkflowStandard,
  deployArtifacts,
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
  BaseRoleService,
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
  BaseCognitiveServiceService,
  RoleService,
  resolveConnectionsReferences,
} from '@microsoft/logic-apps-shared';
import type { ContentType, IHostService, IWorkflowService } from '@microsoft/logic-apps-shared';
import type { AllCustomCodeFiles, CustomCodeFileNameMapping, Workflow } from '@microsoft/logic-apps-designer-v2';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
  getReactQueryClient,
  serializeBJSWorkflow,
  store as DesignerStore,
  Constants,
  getSKUDefaultHostOptions,
  CombineInitializeVariableDialog,
  TriggerDescriptionDialog,
  getMissingRoleDefinitions,
  roleQueryKeys,
  isAgentWorkflow,
  useRun,
} from '@microsoft/logic-apps-designer-v2';
import axios from 'axios';
import isEqual from 'lodash.isequal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useHostingPlan } from '../../state/workflowLoadingSelectors';
import CodeViewEditor from './CodeViewV2';
import { CustomConnectionParameterEditorService } from './Services/customConnectionParameterEditorService';
import { CustomEditorService } from './Services/customEditorService';
import { FloatingRunButton } from '../../../../../../libs/designer-v2/src/lib/ui/FloatingRunButton';

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
    language,
    hostOptions,
    hostingPlan,
    showPerformanceDebug,
    suppressDefaultNodeSelect,
  } = useSelector((state: RootState) => state.workflowLoader);
  const isHybridLogicApp = hostingPlan === 'hybrid';
  const workflowName = workflowId.split('/').splice(-1)[0];
  const siteResourceId = new ArmParser(workflowId).topmostResourceId;
  const {
    data: customCodeData,
    isLoading: customCodeLoading,
    refetch: customCodeRefetch,
  } = useAllCustomCodeFiles(appId, workflowName, isHybridLogicApp);
  const { data: artifactData, isLoading: artifactsLoading, isError, error } = useWorkflowAndArtifactsStandard(workflowId);
  const { data: settingsData, isLoading: settingsLoading, isError: settingsIsError, error: settingsError } = useAppSettings(siteResourceId);
  const { data: workflowAppData, isLoading: appLoading } = useWorkflowApp(siteResourceId, useHostingPlan());
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();

  // State props
  const [designerID, setDesignerID] = useState(guid());
  const [workflow, setWorkflow] = useState<Workflow>(); // Current workflow on the designer
  const [isDesignerView, setIsDesignerView] = useState(true);
  const [isCodeView, setIsCodeView] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(true);

  const codeEditorRef = useRef<{ getValue: () => string | undefined; hasChanges: () => boolean }>(null);
  const originalConnectionsData = useMemo(
    () => artifactData?.properties.files[Artifact.ConnectionsFile] ?? {},
    [artifactData?.properties.files]
  );
  const originalCustomCodeData = useMemo(() => Object.keys(customCodeData ?? {}), [customCodeData]);
  const prodWorkflow = useMemo(() => artifactData?.properties.files[Artifact.WorkflowFile], [artifactData?.properties.files]);
  const draftWorkflow = useMemo(() => customCodeData?.[Artifact.DraftFile], [customCodeData]);
  const parameters = useMemo(() => artifactData?.properties.files[Artifact.ParametersFile] ?? {}, [artifactData?.properties.files]);
  const notes = useMemo(() => customCodeData?.[VfsArtifact.NotesFile] ?? {}, [customCodeData]);
  const queryClient = getReactQueryClient();
  const displayCopilotChatbot = showChatBot && isDesignerView;
  const connectionsData = useMemo(
    () => resolveConnectionsReferences(JSON.stringify(clone(originalConnectionsData ?? {})), parameters, settingsData?.properties ?? {}),
    [originalConnectionsData, parameters, settingsData?.properties]
  );
  const connectionReferences = WorkflowUtility.convertConnectionsDataToReferences(connectionsData);
  const { data: runInstanceData } = useRun(runId);

  const addConnectionDataInternal = async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
    addConnectionInJson(connectionAndSetting, connectionsData ?? {});
    addOrUpdateAppSettings(connectionAndSetting.settings, settingsData?.properties ?? {});
  };

  const switchWorkflowMode = useCallback((draftMode: boolean) => {
    setIsDraftMode(draftMode);
  }, []);

  const getConnectionConfiguration = async (connectionId: string): Promise<any> => {
    if (!connectionId) {
      return Promise.resolve();
    }

    const connectionName = connectionId.split('/').splice(-1)[0];
    const connectionInfo =
      connectionsData?.serviceProviderConnections?.[connectionName] ?? connectionsData?.apiManagementConnections?.[connectionName];

    if (connectionInfo) {
      // TODO(psamband): Add new settings in this blade so that we do not resolve all the appsettings in the connectionInfo.
      const resolvedConnectionInfo = resolveConnectionsReferences(JSON.stringify(connectionInfo), {}, settingsData?.properties);
      delete resolvedConnectionInfo.displayName;

      return {
        connection: resolvedConnectionInfo,
      };
    }

    return undefined;
  };

  const saveDraftWorkflow = useCallback(
    (workflow: Workflow) => {
      return deployArtifacts(siteResourceId, workflowName, workflow.definition, undefined, undefined, undefined, true);
    },
    [siteResourceId, workflowName]
  );

  const resetDraftWorkflow = useCallback(async () => {
    const response = await saveDraftWorkflow(prodWorkflow);

    if (response.status >= 200 && response.status < 300) {
      // Draft created successfully
      customCodeRefetch();
      return Promise.resolve();
    }
    return Promise.reject(`Error resetting draft workflow: ${response.status} - ${response.statusText}`);
  }, [customCodeRefetch, prodWorkflow, saveDraftWorkflow]);

  const discardAllChanges = useCallback(() => {
    setDesignerID(guid());

    if (isDraftMode) {
      // Need to reset draft workflow to Production workflow
      resetDraftWorkflow();
    }
  }, [isDraftMode, resetDraftWorkflow]);

  const onRunSelected = useCallback(
    (runId: string) => {
      dispatch(changeRunId(runId));
    },
    [dispatch]
  );

  // RUN HISTORY

  const toggleMonitoringView = useCallback(() => {
    dispatch(setMonitoringView(!isMonitoringView));
    dispatch(setReadOnly(!isMonitoringView));
    dispatch(setRunHistoryEnabled(!isMonitoringView));
    if (runId) {
      dispatch(changeRunId(undefined));
    }
  }, [dispatch, isMonitoringView, runId]);

  const showMonitoringView = useCallback(() => {
    if (!isMonitoringView) {
      setIsDesignerView(false);
      setIsCodeView(false);
      toggleMonitoringView();
    }
  }, [isMonitoringView, toggleMonitoringView]);

  const hideMonitoringView = useCallback(() => {
    if (isMonitoringView) {
      toggleMonitoringView();
      setWorkflow({
        ...artifactData?.properties.files[Artifact.WorkflowFile],
        id: guid(),
      });
    }
  }, [artifactData?.properties.files, isMonitoringView, toggleMonitoringView]);

  const onRun = useCallback(
    (runId: string | undefined) => {
      showMonitoringView();
      dispatch(changeRunId(runId));
    },
    [dispatch, showMonitoringView]
  );

  // Services

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
        dispatch,
        onRunSelected
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflow, workflowId, connectionsData, settingsData, workflowAppData, tenantId, designerID, runId, language]
  );

  const originalSettings: Record<string, string> = useMemo(() => {
    return { ...(settingsData?.properties ?? {}) };
  }, [settingsData?.properties]);

  const originalParametersData: ParametersData = clone(parameters ?? {});
  const originalNotesData: NotesData = clone(notes ?? {});

  const saveWorkflowFromDesigner = useCallback(
    async (
      workflowFromDesigner: Workflow,
      customCode: CustomCodeFileNameMapping | undefined,
      clearDirtyState: () => void,
      autoSave?: boolean
    ): Promise<any> => {
      const { definition, connectionReferences, parameters, notes } = workflowFromDesigner;
      const workflowToSave = {
        ...workflow,
        definition,
      };

      delete workflowToSave.id;

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
        if (isAgentWorkflow(workflow?.kind ?? '')) {
          (connectionsData as ConnectionsData).agentConnections = {
            ...connectionsData?.agentConnections,
            ...newAgentConnections,
          };

          // Assign MSI roles if needed
          /**
           *  This is currently only for Agentic workflows,
           *    but we should work to make this generic in the future
           *  The issue with making it generic is that we don't have a good way of getting the required definition names for any given connection reference
           *  The required roles are listed on connection parameters which we don't have access to here,
           *    and would take several requests to check for each connection, when most will not need it, leading to unnecessary slowdown during save
           *  One option is to populate that info somewhere in the connection reference for use here,
           *    but that is unavailable at authoring time when we are populating the values that require the roles
           */
          for (const [_refKey, agentConnection] of Object.entries(newAgentConnections)) {
            if (agentConnection?.authentication?.type === 'ManagedServiceIdentity') {
              const definitionNames = ['Azure AI User', 'Azure AI Administrator', 'Cognitive Services Contributor'];
              const missingRoleAssignments = await getMissingRoleDefinitions(agentConnection?.resourceId, definitionNames);
              const assignmentPromises = [];
              for (const roleDefinition of missingRoleAssignments) {
                assignmentPromises.push(RoleService().addAppRoleAssignmentForResource(agentConnection?.resourceId, roleDefinition.id));
              }
              await Promise.all(assignmentPromises);

              // Invalidate the cache for the role assignments
              const cacheKey = [roleQueryKeys.appIdentityRoleAssignments, agentConnection?.resourceId];
              const queryClient = getReactQueryClient();
              queryClient.invalidateQueries(cacheKey);
            }
          }
        }
      }

      const connectionsToUpdate = getConnectionsToUpdate(originalConnectionsData, connectionsData ?? {});
      const customCodeToUpdate = await getCustomCodeToUpdate(originalCustomCodeData, customCode ?? {}, appId);
      const parametersToUpdate = isEqual(originalParametersData, parameters) ? undefined : (parameters as ParametersData);
      const settingsToUpdate = isEqual(settingsData?.properties, originalSettings) ? undefined : settingsData?.properties;
      const notesToUpdate = isEqual(originalNotesData, notes) ? undefined : (notes as NotesData);

      await saveWorkflowStandard(
        siteResourceId,
        [{ name: workflowName, workflow: workflowToSave }],
        connectionsToUpdate,
        parametersToUpdate,
        settingsToUpdate,
        customCodeToUpdate,
        notesToUpdate,
        clearDirtyState,
        undefined,
        autoSave
      );

      return workflowToSave;
    },
    [
      appId,
      connectionsData,
      originalConnectionsData,
      originalCustomCodeData,
      originalNotesData,
      originalParametersData,
      originalSettings,
      settingsData?.properties,
      siteResourceId,
      workflow,
      workflowName,
    ]
  );

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
        /*notes*/ undefined,
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

  const showCodeView = async () => {
    if (isCodeView) {
      return;
    }

    if (isMonitoringView) {
      hideMonitoringView();
      setIsCodeView(true);
    }

    if (isDesignerView) {
      setIsDesignerView(false);
      setIsCodeView(true);
    }
  };

  const showDesignerView = async () => {
    if (isDesignerView) {
      return;
    }

    if (isMonitoringView) {
      hideMonitoringView();
      setIsDesignerView(true);
    }

    if (isCodeView) {
      try {
        const codeToConvert = JSON.parse(codeEditorRef.current?.getValue() ?? '');
        if (codeEditorRef.current?.hasChanges() && !isEqual(codeToConvert, { definition: workflow?.definition, kind: workflow?.kind })) {
          await validateWorkflowStandard(siteResourceId, workflowName, codeToConvert);
        }
        setWorkflow((prevState) => ({
          ...prevState,
          definition: codeToConvert.definition,
          kind: codeToConvert.kind,
          connectionReferences: codeToConvert.connectionReferences ?? {},
          id: guid(),
        }));
        setIsDesignerView(true);
        setIsCodeView(false);
      } catch (error: any) {
        if (error.status !== 404) {
          alert(`Error converting code to workflow ${error}`);
        }
      }
    }
  };

  // Our iframe root element is given a strange padding (not in this repo), this removes it
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.padding = '0px';
      root.style.overflow = 'hidden';
    }
  }, []);

  useEffect(() => {
    if (isMonitoringView && runInstanceData) {
      setWorkflow((previousWorkflow?: Workflow) => {
        if (!previousWorkflow) {
          // Do not update the workflow if previousWorkflow is undefined; return previous value unchanged
          return previousWorkflow;
        }
        return {
          ...previousWorkflow,
          definition: (runInstanceData.properties.workflow as any).properties.definition,
        };
      });
    }
  }, [isMonitoringView, runInstanceData]);

  useEffect(() => {
    if (customCodeLoading || artifactsLoading || !prodWorkflow) {
      return;
    }

    if (isDraftMode) {
      if (draftWorkflow) {
        setWorkflow(draftWorkflow as any);
      } else {
        resetDraftWorkflow()
          .then(() => {
            // Draft created successfully
          })
          .catch((_error) => {
            setIsDraftMode(false);
            setWorkflow(prodWorkflow as any);
          });
      }
    } else {
      setWorkflow(prodWorkflow as any);
    }
  }, [artifactsLoading, customCodeLoading, draftWorkflow, isDraftMode, prodWorkflow, resetDraftWorkflow]);

  if (isError || settingsIsError) {
    throw error ?? settingsError;
  }

  if (artifactsLoading || appLoading || settingsLoading || customCodeLoading) {
    return <></>;
  }

  return (
    <div key={designerID} style={{ height: 'inherit', width: 'inherit' }}>
      <DesignerProvider
        id={workflow?.id}
        key={designerID}
        locale={language}
        options={{
          services,
          isDarkMode,
          readOnly: isReadOnly || isMonitoringView || !isDraftMode,
          isMonitoringView,
          isUnitTest,
          suppressDefaultNodeSelectFunctionality: suppressDefaultNodeSelect,
          hostOptions: {
            ...hostOptions,
            ...getSKUDefaultHostOptions(Constants.SKU.STANDARD),
          },
          showPerformanceDebug,
        }}
      >
        {workflow?.definition ? (
          <BJSWorkflowProvider
            workflow={{
              definition: workflow?.definition,
              connectionReferences,
              parameters,
              notes,
              kind: workflow?.kind,
            }}
            workflowId={workflow?.id}
            customCode={customCodeData}
            runInstance={runInstanceData as any}
            appSettings={settingsData?.properties}
            isMultiVariableEnabled={hostOptions.enableMultiVariable && !isMonitoringView}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                height: 'inherit',
              }}
            >
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
                  isMonitoringView={isMonitoringView}
                  isDesignerView={isDesignerView}
                  isCodeView={isCodeView}
                  enableCopilot={() => dispatch(setIsChatBotEnabled(!showChatBot))}
                  saveWorkflowFromCode={saveWorkflowFromCode}
                  showMonitoringView={showMonitoringView}
                  showDesignerView={showDesignerView}
                  showCodeView={showCodeView}
                  switchWorkflowMode={switchWorkflowMode}
                  isDraftMode={isDraftMode}
                  prodWorkflow={artifactData?.properties.files[Artifact.WorkflowFile]}
                />
                {!isCodeView && (
                  <div style={{ display: 'flex', flexDirection: 'row', flexGrow: 1, height: '80%', position: 'relative' }}>
                    <Designer />
                    <FloatingRunButton
                      siteResourceId={siteResourceId}
                      workflowName={workflowName}
                      saveDraftWorkflow={saveWorkflowFromDesigner}
                      onRun={onRun}
                      isDarkMode={isDarkMode}
                      isDraftMode={isDraftMode}
                    />
                  </div>
                )}
                {isCodeView && <CodeViewEditor ref={codeEditorRef} workflowKind={workflow?.kind} />}
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
  dispatch: AppDispatch,
  openRun: (runId: string) => void
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
    readConnections: () => {
      return resolveConnectionsReferences(JSON.stringify(clone(connectionsData ?? {})), undefined, appSettings);
    },
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
    isHybrid,
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
    getAgentUrl: () => fetchAgentUrl(siteResourceId, workflowName, workflowApp?.properties?.defaultHostName ?? ''),
    getAppIdentity: () => workflowApp?.identity,
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
    openRun,
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

  const roleService = new BaseRoleService({
    baseUrl: armUrl,
    httpClient,
    apiVersion: '2022-04-01',
    subscriptionId,
    tenantId: tenantId ?? '',
    userIdentityId: objectId ?? '',
    appIdentityId: workflowApp?.identity?.principalId ?? '',
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

  const cognitiveServiceService = new BaseCognitiveServiceService({
    apiVersion: '2023-10-01-preview',
    baseUrl: armUrl,
    httpClient,
    identity: workflowApp?.identity,
  });

  const connectionParameterEditorService = new CustomConnectionParameterEditorService();
  const editorService = new CustomEditorService();

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
    roleService,
    hostService,
    chatbotService,
    customCodeService,
    cognitiveServiceService,
    connectionParameterEditorService,
    editorService,
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
