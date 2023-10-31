/* eslint-disable @typescript-eslint/ban-types */
import { environment } from '../../environments/environment';
import type { AppDispatch, RootState } from '../../state/store';
import { useIsDarkMode, useIsMonitoringView, useIsReadOnly, useShowChatBot } from '../../state/workflowLoadingSelectors';
import { setIsChatBotEnabled } from '../../state/workflowLoadingSlice';
import { DesignerCommandBar } from './DesignerCommandBar';
import type { ParametersData } from './Models/Workflow';
import { ChildWorkflowService } from './Services/ChildWorkflow';
import { HttpClient } from './Services/HttpClient';
import {
  listCallbackUrl,
  saveWorkflowConsumption,
  useCurrentTenantId,
  useWorkflowAndArtifactsConsumption,
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
  ConsumptionConnectionService,
  ConsumptionConnectorService,
  ConsumptionOperationManifestService,
  ConsumptionSearchService,
} from '@microsoft/designer-client-services-logic-apps';
import type { Workflow } from '@microsoft/logic-apps-designer';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
  isOpenApiSchemaVersion,
  getReactQueryClient,
  serializeBJSWorkflow,
  store as DesignerStore,
} from '@microsoft/logic-apps-designer';
import { guid, startsWith } from '@microsoft/utils-logic-apps';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const DesignerEditorConsumption = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { id: workflowId } = useSelector((state: RootState) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: state.workflowLoader.resourcePath!,
  }));

  const isDarkMode = useIsDarkMode();
  const readOnly = useIsReadOnly();
  const isMonitoringView = useIsMonitoringView();
  const showChatBot = useShowChatBot();

  const queryClient = getReactQueryClient();

  // const workflowName = workflowId.split('/').splice(-1)[0];
  const {
    data: workflowAndArtifactsData,
    isLoading: isWorkflowAndArtifactsLoading,
    isError: isWorklowAndArtifactsError,
    error: workflowAndArtifactsError,
  } = useWorkflowAndArtifactsConsumption(workflowId);
  const { data: tenantId } = useCurrentTenantId();
  const [designerID, setDesignerID] = React.useState(guid());

  const { workflow, connectionReferences, parameters } = React.useMemo(
    () => getDataForConsumption(workflowAndArtifactsData),
    [workflowAndArtifactsData]
  );
  const { definition } = workflow;

  const discardAllChanges = () => {
    setDesignerID(guid());
  };
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAndArtifactsData?.location ?? '');
  const services = React.useMemo(
    () => getDesignerServices(workflowId, workflow as any, tenantId, canonicalLocation, undefined, queryClient),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, workflow, tenantId, canonicalLocation, designerID]
  );

  const [parsedDefinition, setParsedDefinition] = React.useState<any>(undefined);

  React.useEffect(() => {
    (async () => {
      if (!services) return;
      if (!(definition as any)?.actions) return;
      setParsedDefinition(definition);
    })();
  }, [definition, services]);

  // Our iframe root element is given a strange padding (not in this repo), this removes it
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.padding = '0px';
      root.style.overflow = 'hidden';
    }
  }, []);

  if (!parsedDefinition || isWorkflowAndArtifactsLoading) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  }

  if (isWorklowAndArtifactsError) throw workflowAndArtifactsError;

  const saveWorkflowFromDesigner = async (workflowFromDesigner: Workflow): Promise<void> => {
    if (!workflowAndArtifactsData) return;
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

      const response = await saveWorkflowConsumption(workflowAndArtifactsData, workflowToSave);
      alert(`Workflow saved successfully!`);
      return response;
    } catch (e: any) {
      console.error(e);
      alert(`Error saving workflow, check console for error object`);
      return;
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

  return (
    <div key={designerID} style={{ height: 'inherit', width: 'inherit' }}>
      <DesignerProvider locale={'en-US'} options={{ services, isDarkMode, readOnly, isMonitoringView, useLegacyWorkflowParameters: true }}>
        {workflow?.definition ? (
          <BJSWorkflowProvider workflow={{ definition: parsedDefinition, connectionReferences, parameters }}>
            <div style={{ height: 'inherit', width: 'inherit' }}>
              <DesignerCommandBar
                id={workflowId}
                saveWorkflow={saveWorkflowFromDesigner}
                discard={discardAllChanges}
                location={canonicalLocation}
                isReadOnly={readOnly}
                isDarkMode={isDarkMode}
                isConsumption
              />
              <Designer />
              {showChatBot ? (
                <Chatbot
                  endpoint={environment.chatbotEndpoint}
                  getUpdatedWorkflow={getUpdatedWorkflow}
                  openFeedbackPanel={openFeedBackPanel}
                  closeChatBot={() => {
                    console.log('close chatbot');
                    dispatch(setIsChatBotEnabled(false));
                  }}
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
  workflow: any,
  tenantId: string | undefined,
  location: string,
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
  });
  const apimService = new BaseApiManagementService({
    ...defaultServiceParams,
    apiVersion: '2019-12-01',
    subscriptionId,
    includeBasePathInTemplate: true,
    queryClient,
  });
  const childWorkflowService = new ChildWorkflowService({ apiVersion, baseUrl, siteResourceId: workflowId, httpClient, workflowName });

  const appServiceService = new BaseAppServiceService({
    ...defaultServiceParams,
    apiVersion: '2022-03-01',
    subscriptionId,
  });
  const connectorService = new ConsumptionConnectorService({
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
    schemaClient: {
      getLogicAppSwagger: (args: any) => childWorkflowService.getLogicAppSwagger(args.parameters.workflowId),
      getApimOperationSchema: (args: any) => {
        const { parameters, isInput = false } = args;
        const { apiId, operationId } = parameters;
        if (!apiId || !operationId) return Promise.resolve();
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
        const { nodeMetadata } = args;
        const swaggerUrl = nodeMetadata?.['apiDefinitionUrl'];
        return appServiceService.getOperations(swaggerUrl);
      },
      getApimOperations: (args: any) => {
        const { configuration } = args;
        if (!configuration?.connection?.apiId) {
          throw new Error('Missing api information to make dynamic call');
        }
        return apimService.getOperations(configuration?.connection?.apiId);
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
  });

  const oAuthService = new BaseOAuthService({
    ...defaultServiceParams,
    apiVersion: '2018-07-01-preview',
    subscriptionId,
    resourceGroup,
    location,
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

  return {
    appServiceService,
    connectionService,
    connectorService,
    gatewayService,
    operationManifestService,
    searchService,
    loggerService,
    oAuthService,
    workflowService,
    apimService,
    functionService,
  };
};

const getDataForConsumption = (data: any) => {
  const properties = data?.properties as any;

  const definition = removeProperties(properties?.definition, ['parameters']);
  const connections =
    (isOpenApiSchemaVersion(definition) ? properties?.connectionReferences : properties?.parameters?.$connections?.value) ?? {};

  const workflow = { definition, connections };
  const connectionReferences = formatConnectionReferencesForConsumption(connections);
  const parameters: ParametersData = formatWorkflowParametersForConsumption(properties);

  return { workflow, connectionReferences, parameters };
};

const removeProperties = (obj: any = {}, props: string[] = []): Object => {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key)));
};

const formatConnectionReferencesForConsumption = (connectionReferences: Record<string, any>): any => {
  return Object.fromEntries(
    Object.entries(connectionReferences).map(([key, value]) => [key, formatConnectionReferenceForConsumption(value)])
  );
};

const formatConnectionReferenceForConsumption = (connectionReference: any): any => {
  const connectionReferenceCopy = { ...connectionReference };
  connectionReferenceCopy.connection = connectionReference.connection ?? { id: connectionReference.connectionId };
  delete connectionReferenceCopy.connectionId;
  connectionReferenceCopy.api = connectionReference.api ?? { id: connectionReference.id };
  delete connectionReferenceCopy.id;
  return connectionReferenceCopy;
};

const formatWorkflowParametersForConsumption = (properties: any): ParametersData => {
  const parameters = removeProperties(properties?.definition?.parameters, ['$connections']) as ParametersData;
  Object.entries(properties?.parameters ?? {}).forEach(([key, parameter]: [key: string, parameter: any]) => {
    if (parameters[key]) parameters[key].value = parameter?.value;
  });
  return parameters;
};

export default DesignerEditorConsumption;
