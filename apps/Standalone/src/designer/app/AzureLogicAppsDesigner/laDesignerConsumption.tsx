import { environment } from '../../../environments/environment';
import type { AppDispatch, RootState } from '../../state/store';
import { changeRunId, setIsChatBotEnabled, setMonitoringView, setReadOnly, setRunHistoryEnabled } from '../../state/workflowLoadingSlice';
import { DesignerCommandBar } from './DesignerCommandBar';
import { ChildWorkflowService } from './Services/ChildWorkflow';
import { HttpClient } from './Services/HttpClient';
import { StandaloneOAuthService } from './Services/OAuthService';
import {
  listCallbackUrl,
  saveWorkflowConsumption,
  useCurrentObjectId,
  useCurrentTenantId,
  useRunInstanceConsumption,
  useWorkflowAndArtifactsConsumption,
  validateWorkflowConsumption,
} from './Services/WorkflowAndArtifacts';
import { ArmParser } from './Utilities/ArmParser';
import { getDataForConsumption, WorkflowUtility } from './Utilities/Workflow';
import { Chatbot } from '@microsoft/logic-apps-chatbot';
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
} from '@microsoft/logic-apps-shared';
import type { CustomCodeFileNameMapping, Workflow } from '@microsoft/logic-apps-designer';
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
  RunHistoryPanel,
} from '@microsoft/logic-apps-designer';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeViewEditor from './CodeView';

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
    showRunHistory,
    hostOptions,
    showConnectionsPanel,
    suppressDefaultNodeSelect,
    showPerformanceDebug,
    language,
  } = useSelector((state: RootState) => state.workflowLoader);

  const workflowName = workflowId.split('/').splice(-1)[0];

  const queryClient = getReactQueryClient();

  const {
    data: workflowAndArtifactsData,
    isLoading: isWorkflowAndArtifactsLoading,
    isError: isWorklowAndArtifactsError,
    error: workflowAndArtifactsError,
  } = useWorkflowAndArtifactsConsumption(workflowId);
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const [designerID, setDesignerID] = useState(guid());

  const {
    workflow: baseWorkflow,
    connectionReferences,
    parameters,
  } = useMemo(() => getDataForConsumption(workflowAndArtifactsData), [workflowAndArtifactsData]);

  const { data: runInstanceData } = useRunInstanceConsumption(workflowName, appId, runId);
  const [runWorkflow, setRunWorkflow] = useState<any>();

  useEffect(() => {
    if (runInstanceData && isMonitoringView) {
      const appInstance = {
        ...baseWorkflow,
        definition: runInstanceData.properties.workflow.properties.definition,
      };
      setRunWorkflow(appInstance);
    }
  }, [runInstanceData, baseWorkflow, isMonitoringView]);

  const workflow = useMemo(() => runWorkflow ?? baseWorkflow, [runWorkflow, baseWorkflow]);

  const [definition, setDefinition] = useState(workflow.definition);
  const [workflowDefinitionId, setWorkflowDefinitionId] = useState(guid());
  const [designerView, setDesignerView] = useState(true);
  const codeEditorRef = useRef<{ getValue: () => string | undefined }>(null);

  const discardAllChanges = () => {
    setDesignerID(guid());
  };
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAndArtifactsData?.location ?? '');
  const services = useMemo(
    () => getDesignerServices(workflowId, workflow as any, tenantId, objectId, canonicalLocation, language, undefined, queryClient),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, workflow, tenantId, canonicalLocation, designerID, language]
  );

  useEffect(() => {
    (async () => {
      if (!services) {
        return;
      }
      if (!(workflow.definition as any)?.actions) {
        return;
      }
      setDefinition(workflow.definition);
      setDesignerView(true);
    })();
  }, [services, workflow.definition]);

  // Our iframe root element is given a strange padding (not in this repo), this removes it
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.padding = '0px';
      root.style.overflow = 'hidden';
    }
  }, []);

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

  if (!definition || isWorkflowAndArtifactsLoading) {
    return <></>;
  }

  if (isWorklowAndArtifactsError) {
    throw workflowAndArtifactsError;
  }

  const saveWorkflowFromDesigner = async (
    workflowFromDesigner: Workflow,
    _customCode: CustomCodeFileNameMapping | undefined,
    clearDirtyState: () => void
  ): Promise<void> => {
    if (!workflowAndArtifactsData) {
      return;
    }
    const { definition, connectionReferences, parameters } = workflowFromDesigner;
    const workflowToSave = {
      ...workflow,
      definition,
      parameters,
      connectionReferences,
    };

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

      const response = await saveWorkflowConsumption(workflowAndArtifactsData, workflowToSave, clearDirtyState);
      alert('Workflow saved successfully!');
      return response;
    } catch (e: any) {
      console.error(e);
      alert('Error saving workflow, check console for error object');
      return;
    }
  };

  const saveWorkflowFromCode = async (clearDirtyState: () => void) => {
    try {
      const codeToConvert = JSON.parse(codeEditorRef.current?.getValue() ?? '');
      await validateWorkflowConsumption(workflowId, canonicalLocation, workflowAndArtifactsData, codeToConvert);
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

  const handleSwitchView = async () => {
    if (designerView) {
      setDesignerView(false);
    } else {
      try {
        const codeToConvert = JSON.parse(codeEditorRef.current?.getValue() ?? '');
        if (workflowAndArtifactsData) {
          await validateWorkflowConsumption(workflowId, canonicalLocation, workflowAndArtifactsData, codeToConvert);
          setDefinition(codeToConvert.definition);
          setWorkflowDefinitionId(guid());
          setDesignerView(true);
        }
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
        key={designerID}
        locale={language}
        options={{
          services,
          isDarkMode,
          readOnly,
          isMonitoringView,
          useLegacyWorkflowParameters: true,
          showConnectionsPanel,
          suppressDefaultNodeSelectFunctionality: suppressDefaultNodeSelect,
          hostOptions: {
            ...hostOptions,
            ...getSKUDefaultHostOptions(Constants.SKU.CONSUMPTION),
          },
          showPerformanceDebug,
        }}
      >
        {workflow?.definition ? (
          <BJSWorkflowProvider
            workflow={{
              definition,
              connectionReferences,
              parameters,
            }}
            workflowId={workflowDefinitionId}
            runInstance={runInstanceData}
          >
            <div style={{ display: 'flex', height: 'inherit' }}>
              <RunHistoryPanel
                collapsed={!showRunHistory}
                onClose={() => dispatch(setRunHistoryEnabled(false))}
                onRunSelected={onRunSelected}
              />
              {showChatBot ? (
                <Chatbot
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
                  isDesignerView={designerView}
                  isUnitTest={false}
                  isMonitoringView={isMonitoringView}
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
                />
                {designerView ? <Designer /> : <CodeViewEditor ref={codeEditorRef} isConsumption />}
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
  loggerService?: any,
  queryClient?: any
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
    getAppIdentity: () => workflow?.identity,
    isExplicitAuthRequiredForManagedIdentity: () => false,
    getDefinitionSchema: (operationInfos: { type: string; kind?: string }[]) => {
      return operationInfos.some((info) => startsWith(info.type, 'openapiconnection'))
        ? 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2023-01-31-preview/workflowdefinition.json#'
        : undefined;
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
  };

  return {
    appServiceService,
    connectionService,
    connectorService,
    gatewayService,
    tenantService,
    operationManifestService,
    searchService,
    loggerService,
    oAuthService,
    workflowService,
    apimService,
    functionService,
    runService,
    hostService,
    chatbotService,
    customCodeService,
    userPreferenceService: new BaseUserPreferenceService(),
  };
};

export default DesignerEditorConsumption;
