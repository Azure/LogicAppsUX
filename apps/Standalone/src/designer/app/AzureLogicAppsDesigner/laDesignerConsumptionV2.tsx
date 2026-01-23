import { environment } from '../../../environments/environment';
import type { AppDispatch, RootState } from '../../state/store';
import { changeRunId, setIsChatBotEnabled, setMonitoringView, setReadOnly, setRunHistoryEnabled } from '../../state/workflowLoadingSlice';
import { DesignerCommandBar } from './DesignerCommandBarV2';
import { ChildWorkflowService } from './Services/ChildWorkflow';
import { HttpClient } from './Services/HttpClient';
import { StandaloneOAuthService } from './Services/OAuthService';
import {
  listCallbackUrl,
  saveWorkflowConsumption,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowAndArtifactsConsumption,
  validateWorkflowConsumption,
  fetchAgentUrlConsumption,
  useRunInstanceConsumption,
} from './Services/WorkflowAndArtifacts';
import { ArmParser } from './Utilities/ArmParser';
import { getDataForConsumption, WorkflowUtility } from './Utilities/Workflow';
import { CoPilotChatbot } from '@microsoft/logic-apps-chatbot';
import type { ContentType } from '@microsoft/logic-apps-shared';
import {
  BaseApiManagementService,
  BaseAppServiceService,
  BaseFunctionService,
  BaseGatewayService,
  BaseTenantService,
  ConsumptionConnectionService,
  ConsumptionConnectorService,
  ConsumptionOperationManifestService,
  ConsumptionSearchService,
  BaseChatbotService,
  ConsumptionRunService,
  guid,
  startsWith,
  StandardCustomCodeService,
  BaseUserPreferenceService,
  BaseCognitiveServiceService,
  BaseRoleService,
} from '@microsoft/logic-apps-shared';
import type { CustomCodeFileNameMapping, Workflow } from '@microsoft/logic-apps-designer-v2';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
  isOpenApiSchemaVersion,
  getReactQueryClient,
  serializeBJSWorkflow,
  store as DesignerStore,
  getSKUDefaultHostOptions,
  Constants,
  CombineInitializeVariableDialog,
  TriggerDescriptionDialog,
  FloatingRunButton,
} from '@microsoft/logic-apps-designer-v2';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeViewEditor from './CodeViewV2';
import isEqual from 'lodash.isequal';
import { Spinner } from '@fluentui/react-components';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const DesignerEditorConsumption = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { id: workflowId } = useSelector((state: RootState) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: state.workflowLoader.resourcePath!,
  }));

  const {
    isReadOnly: readOnly,
    isDarkMode,
    isMonitoringView,
    runId,
    appId,
    showChatBot,
    hostOptions,
    suppressDefaultNodeSelect,
    showPerformanceDebug,
    language,
  } = useSelector((state: RootState) => state.workflowLoader);

  const workflowName = workflowId.split('/').splice(-1)[0];

  const queryClient = getReactQueryClient();

  const {
    data: workflowAndArtifactsData,
    isFetching: isWorkflowAndArtifactsLoading,
    isError: isWorkflowAndArtifactsError,
    error: workflowAndArtifactsError,
  } = useWorkflowAndArtifactsConsumption(workflowId);

  const {
    workflow: prodWorkflow,
    connectionReferences,
    parameters,
    notes,
  } = useMemo(() => getDataForConsumption(workflowAndArtifactsData), [workflowAndArtifactsData]);

  const { data: draftWorkflowAndArtifactsData, isFetching: isDraftWorkflowAndArtifactsLoading } = useWorkflowAndArtifactsConsumption(
    workflowId,
    true
  );

  const { workflow: draftWorkflow } = useMemo(() => getDataForConsumption(draftWorkflowAndArtifactsData), [draftWorkflowAndArtifactsData]);

  const { data: runInstanceData } = useRunInstanceConsumption(workflowName, appId, runId);

  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();

  // State props
  const [designerID, setDesignerID] = useState(guid());

  const [workflow, setWorkflow] = useState<any>(); // Current workflow on the designer
  const [isDesignerView, setIsDesignerView] = useState(true);
  const [isCodeView, setIsCodeView] = useState(false);

  const [isDraftMode, setIsDraftMode] = useState(true);
  const switchWorkflowMode = useCallback((draftMode: boolean) => {
    setIsDraftMode(draftMode);
  }, []);

  const [definition, setDefinition] = useState<any>();
  const codeEditorRef = useRef<{ getValue: () => string | undefined; hasChanges: () => boolean }>(null);

  // TODO: Implement saveDraftWorkflow properly
  const saveDraftWorkflow = useCallback((_workflow: any) => {
    return true as any;
  }, []);

  const resetDraftWorkflow = useCallback(async () => {
    const response = await saveDraftWorkflow(prodWorkflow);

    if (response.status >= 200 && response.status < 300) {
      // Draft created successfully
      return Promise.resolve();
    }
    return Promise.reject(`Error resetting draft workflow: ${response.status} - ${response.statusText}`);
  }, [prodWorkflow, saveDraftWorkflow]);

  const discardAllChanges = useCallback(() => {
    setDesignerID(guid());

    if (isDraftMode) {
      // Need to reset draft workflow to Production workflow
      resetDraftWorkflow();
    }
  }, [isDraftMode, resetDraftWorkflow]);

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
        ...draftWorkflow,
        id: guid(),
      });
    }
  }, [draftWorkflow, isMonitoringView, toggleMonitoringView]);

  const onRun = useCallback(
    (runId: string) => {
      showMonitoringView();
      dispatch(changeRunId(runId));
    },
    [showMonitoringView, dispatch]
  );

  // Remove (stage) suffix from location for API compatibility
  const rawLocation = workflowAndArtifactsData?.location ?? '';
  const sanitizedLocation = rawLocation.replace(/\s*\(stage\)\s*/gi, '');
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(sanitizedLocation);
  const services = useMemo(
    () =>
      getDesignerServices(
        workflowId,
        workflow as any,
        tenantId,
        objectId,
        canonicalLocation,
        language,
        workflowAndArtifactsData,
        queryClient,
        onRun
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, workflow, tenantId, canonicalLocation, designerID, language, workflowAndArtifactsData, onRun]
  );

  useEffect(() => {
    (async () => {
      if (!services) {
        return;
      }
      if (!workflow?.definition?.actions) {
        return;
      }
      setDefinition(workflow.definition);
    })();
  }, [workflow, services]);

  const saveWorkflowFromDesigner = async (
    workflowFromDesigner: Workflow,
    _customCode: CustomCodeFileNameMapping | undefined,
    clearDirtyState: () => void,
    isDraftSave = false
  ): Promise<void> => {
    if (!workflowAndArtifactsData) {
      return;
    }
    const { definition, connectionReferences, parameters, notes } = workflowFromDesigner;
    const workflowToSave = {
      ...workflow,
      definition,
      parameters,
      connectionReferences,
      notes,
    };

    delete workflowToSave.id;

    try {
      const newConnectionsObj: Record<string, any> = {};
      if (Object.keys(connectionReferences ?? {}).length) {
        await Promise.all(
          Object.keys(connectionReferences).map(async (referenceKey) => {
            const reference = connectionReferences[referenceKey];
            const { api, connection, connectionProperties, connectionRuntimeUrl } = reference;
            newConnectionsObj[referenceKey] = {
              api,
              connection,
              connectionId: isOpenApiSchemaVersion(definition) ? undefined : connection.id,
              connectionProperties,
              connectionRuntimeUrl,
            };
          })
        );
      }
      workflowToSave.connections = newConnectionsObj;

      await saveWorkflowConsumption(workflowAndArtifactsData, workflowToSave, clearDirtyState, undefined, isDraftSave);

      return workflowToSave;
    } catch (e: any) {
      console.error(e);
      alert('Error saving workflow, check console for error object');
      return;
    }
  };

  const saveWorkflowFromCode = async (clearDirtyState: () => void) => {
    if (!workflowAndArtifactsData) {
      return;
    }
    try {
      const codeToConvert = JSON.parse(codeEditorRef.current?.getValue() ?? '');
      if (workflowAndArtifactsData && codeEditorRef.current?.hasChanges()) {
        await validateWorkflowConsumption(workflowId, canonicalLocation, workflowAndArtifactsData, codeToConvert);
      }
      saveWorkflowConsumption(workflowAndArtifactsData, codeToConvert, clearDirtyState, { shouldConvertToConsumption: false });
    } catch (error: any) {
      if (error.status !== 404) {
        alert(`Error converting code to workflow ${error}`);
      }
    }
  };

  const getUpdatedWorkflow = async (): Promise<Workflow> => {
    const designerState = DesignerStore.getState();
    const serializedWorkflow = await serializeBJSWorkflow(designerState, {
      skipValidation: false,
      ignoreNonCriticalErrors: true,
    });
    return serializedWorkflow;
  };

  const openFeedBackPanel = () => {
    alert('Open FeedBack Panel');
  };

  const getAuthToken = async () => {
    return `Bearer ${environment.armToken}`;
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
          await validateWorkflowConsumption(workflowId, canonicalLocation, workflowAndArtifactsData, codeToConvert);
        }
        setWorkflow((prevState: any) => ({
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
    if (isWorkflowAndArtifactsLoading || !prodWorkflow || isDraftWorkflowAndArtifactsLoading) {
      return;
    }

    if (isDraftMode) {
      if (draftWorkflow) {
        setWorkflow(draftWorkflow as any);
      } else {
        setWorkflow(prodWorkflow as any);
      }
    } else {
      setWorkflow(prodWorkflow as any);
    }
  }, [isWorkflowAndArtifactsLoading, draftWorkflow, isDraftMode, prodWorkflow, isDraftWorkflowAndArtifactsLoading]);

  if (isWorkflowAndArtifactsError) {
    throw workflowAndArtifactsError;
  }

  if (isWorkflowAndArtifactsLoading) {
    return <Spinner>Loading...</Spinner>;
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
          readOnly: readOnly || isMonitoringView || !isDraftMode,
          isMonitoringView,
          isDraft: isDraftMode,
          useLegacyWorkflowParameters: true,
          suppressDefaultNodeSelectFunctionality: suppressDefaultNodeSelect,
          hostOptions: {
            ...hostOptions,
            ...getSKUDefaultHostOptions(Constants.SKU.CONSUMPTION),
          },
          showPerformanceDebug,
        }}
      >
        {definition ? (
          <BJSWorkflowProvider
            workflow={{
              definition,
              connectionReferences,
              parameters,
              notes,
            }}
            workflowId={workflow?.id}
            runInstance={runInstanceData as any}
            isMultiVariableEnabled={hostOptions.enableMultiVariable}
          >
            <div style={{ display: 'flex', height: 'inherit' }}>
              {showChatBot ? (
                <CoPilotChatbot
                  getUpdatedWorkflow={getUpdatedWorkflow}
                  openFeedbackPanel={openFeedBackPanel}
                  closeChatBot={() => {
                    dispatch(setIsChatBotEnabled(false));
                  }}
                  getAuthToken={getAuthToken}
                />
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', height: 'inherit', flexGrow: 1, maxWidth: '100%' }}>
                <DesignerCommandBar
                  id={workflowId}
                  saveWorkflow={saveWorkflowFromDesigner}
                  discard={discardAllChanges}
                  location={canonicalLocation}
                  isReadOnly={readOnly}
                  isDarkMode={isDarkMode}
                  isUnitTest={false}
                  isMonitoringView={isMonitoringView}
                  isDesignerView={isDesignerView}
                  isCodeView={isCodeView}
                  saveWorkflowFromCode={saveWorkflowFromCode}
                  showMonitoringView={showMonitoringView}
                  showDesignerView={showDesignerView}
                  showCodeView={showCodeView}
                  switchWorkflowMode={switchWorkflowMode}
                  isDraftMode={isDraftMode}
                  prodWorkflow={prodWorkflow as any}
                  enableCopilot={() => dispatch(setIsChatBotEnabled(!showChatBot))}
                />
                {isCodeView ? (
                  <CodeViewEditor ref={codeEditorRef} isConsumption />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'row', flexGrow: 1, height: '80%', position: 'relative' }}>
                    <Designer />
                    <FloatingRunButton
                      siteResourceId={workflowId}
                      workflowName={workflowName}
                      saveDraftWorkflow={saveWorkflowFromDesigner}
                      onRun={onRun}
                      isDarkMode={isDarkMode}
                      isDraftMode={isDraftMode}
                      isConsumption={true}
                    />
                  </div>
                )}
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
  workflow: any,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  locale: string | undefined,
  workflowAndArtifactsData: any,
  queryClient?: any,
  openRun?: (runId: string) => void
): any => {
  const baseUrl = 'https://management.azure.com';
  const workflowName = workflowId.split('/').splice(-1)[0];
  const { subscriptionId, resourceGroup } = new ArmParser(workflowId);

  const defaultServiceParams = { baseUrl, httpClient, apiVersion };

  const connectionService = new ConsumptionConnectionService({
    apiVersion: '2018-07-01-preview',
    baseUrl,
    subscriptionId,
    resourceGroup,
    location,
    tenantId,
    httpClient,
    locale,
  });

  const apimService = new BaseApiManagementService({
    ...defaultServiceParams,
    apiVersion: '2021-08-01',
    subscriptionId,
    includeBasePathInTemplate: true,
    queryClient,
  });

  const childWorkflowService = new ChildWorkflowService({
    apiVersion,
    baseUrl,
    siteResourceId: workflowId,
    httpClient,
    workflowName,
  });

  const appServiceService = new BaseAppServiceService({
    ...defaultServiceParams,
    apiVersion: '2022-03-01',
    subscriptionId,
  });

  const connectorService = new ConsumptionConnectorService({
    ...defaultServiceParams,
    clientSupportedOperations: [
      ['/connectionProviders/workflow', 'invokeWorkflow'],
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
    schemaClient: {
      getLogicAppSwagger: (args: any) => childWorkflowService.getLogicAppSwagger(args.parameters.workflowId),
      getApimOperationSchema: (args: any) => {
        const { parameters, isInput = false } = args;
        const { apiId, operationId } = parameters;
        if (!apiId || !operationId) {
          return Promise.resolve();
        }
        return apimService.getOperationSchema(apiId, operationId, isInput);
      },
      getSwaggerOperationSchema: (args: any) => {
        const { parameters, isInput } = args;
        return appServiceService.getOperationSchema(
          parameters.swaggerUrl,
          parameters.operationId,
          isInput,
          true /* supportsAuthenticationParameter */
        );
      },
      getAppserviceSwaggerOperationSchema: (args: any) => {
        const { parameters, isInput } = args;
        return appServiceService.getOperationSchema(
          parameters.swaggerUrl,
          parameters.operationId,
          isInput,
          false /* supportsAuthenticationParameter */
        );
      },
      getMapSchema: (_args: any) => {
        throw new Error('getMapSchema not implemented for consumption standalone');
      },
    },
    valuesClient: {
      getSwaggerOperations: (args: any) => {
        const { parameters } = args;
        return appServiceService.getOperations(parameters.swaggerUrl);
      },
      getApimOperations: (args: any) => {
        const { parameters } = args;
        const { apiId } = parameters;
        if (!apiId) {
          throw new Error('Missing api information to make dynamic operations call');
        }
        return apimService.getOperations(apiId);
      },
      getSwaggerFunctionOperations: (args: any) => {
        const { parameters } = args;
        const functionAppId = parameters.functionAppId;
        return functionService.getOperations(functionAppId);
      },
    },
    apiVersion: '2018-07-01-preview',
    workflowReferenceId: workflowId,
  });

  const gatewayService = new BaseGatewayService({
    baseUrl,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
      gateway: '2016-06-01',
    },
  });

  const tenantService = new BaseTenantService({
    ...defaultServiceParams,
    apiVersion: '2017-08-01',
  });

  const operationManifestService = new ConsumptionOperationManifestService({
    ...defaultServiceParams,
    apiVersion: '2022-09-01-preview',
    subscriptionId,
    location: location || 'location',
  });

  const searchService = new ConsumptionSearchService({
    ...defaultServiceParams,
    openApiConnectionMode: false, // This should be turned on for Open Api testing.
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      openApiVersion: undefined, //'2022-09-01-preview', //Uncomment to test Open Api
      subscriptionId,
      location,
    },
    isDev: false,
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

  const workflowService = {
    getCallbackUrl: (triggerName: string) => listCallbackUrl(workflowId, triggerName, true),
    getAgentUrl: async (isDraftMode?: boolean) => {
      // For Consumption workflows, construct agent URL with API key authentication
      const accessEndpoint = workflowAndArtifactsData?.properties?.accessEndpoint;
      return fetchAgentUrlConsumption(workflowId, workflowName, accessEndpoint, isDraftMode);
    },
    getAppIdentity: () => workflow?.identity,
    isExplicitAuthRequiredForManagedIdentity: () => false,
    getDefinitionSchema: (operationInfos: { type: string; kind?: string }[]) => {
      return operationInfos.some((info) => startsWith(info.type, 'openapiconnection'))
        ? 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2023-01-31-preview/workflowdefinition.json#'
        : undefined;
    },
    notifyCallbackUrlUpdate: (triggerName: string, newTriggerId: string) => {
      alert(`Callback URL for ${triggerName} trigger updated to ${newTriggerId}`);
    },
  };

  const functionService = new BaseFunctionService({
    baseUrl,
    apiVersion,
    subscriptionId,
    httpClient,
  });

  const runService = new ConsumptionRunService({
    apiVersion: '2016-10-01',
    baseUrl,
    workflowId,
    httpClient,
  });

  const roleService = new BaseRoleService({
    baseUrl,
    apiVersion: '2022-05-01-preview',
    httpClient,
    subscriptionId,
    tenantId: tenantId ?? '',
    userIdentityId: objectId ?? '',
    appIdentityId: workflow?.identity?.principalId ?? '',
  });

  const cognitiveServiceService = new BaseCognitiveServiceService({
    apiVersion: '2023-10-01-preview',
    baseUrl,
    httpClient,
  });

  const chatbotService = new BaseChatbotService({
    // temporarily having brazilus as the baseUrl until deployment finishes in prod
    baseUrl: 'https://brazilus.management.azure.com',
    apiVersion: '2022-09-01-preview',
    subscriptionId,
    // temporarily hardcoding location until we have deployed to all regions
    location: 'westcentralus',
  });

  // This isn't correct but without it I was getting errors
  //   It's fine just to unblock standalone consumption
  const customCodeService = new StandardCustomCodeService({
    apiVersion: '2018-11-01',
    baseUrl: 'test',
    subscriptionId,
    resourceGroup,
    appName: 'test',
    workflowName,
    httpClient,
  });

  const hostService = {
    fetchAndDisplayContent: (title: string, url: string, type: ContentType) => console.log(title, url, type),
    openMonitorView: (resourceId: string, runName: string) => console.log('openMonitorView:', resourceId, runName),
    openRun,
  };

  return {
    appServiceService,
    connectionService,
    connectorService,
    gatewayService,
    tenantService,
    operationManifestService,
    searchService,
    loggerService: undefined,
    oAuthService,
    workflowService,
    apimService,
    functionService,
    runService,
    roleService,
    hostService,
    chatbotService,
    customCodeService,
    cognitiveServiceService,
    userPreferenceService: new BaseUserPreferenceService(),
  };
};

export default DesignerEditorConsumption;
