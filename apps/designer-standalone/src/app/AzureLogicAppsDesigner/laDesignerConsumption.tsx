/* eslint-disable @typescript-eslint/ban-types */
import type { RootState } from '../../state/store';
import { useIsDarkMode, useIsMonitoringView, useIsReadOnly, useShowChatBot } from '../../state/workflowLoadingSelectors';
import { DesignerCommandBar } from './DesignerCommandBar';
import type { ParametersData } from './Models/Workflow';
import type { WorkflowApp } from './Models/WorkflowApp';
import { ChildWorkflowService } from './Services/ChildWorkflow';
import { HttpClient } from './Services/HttpClient';
import {
  listCallbackUrl,
  saveWorkflowConsumption,
  useCurrentTenantId,
  useWorkflowAndArtifactsConsumption,
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
  ConsumptionConnectionService,
  ConsumptionConnectorService,
  ConsumptionOperationManifestService,
  ConsumptionSearchService,
} from '@microsoft/designer-client-services-logic-apps';
import type { Workflow } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, isOpenApiSchemaVersion } from '@microsoft/logic-apps-designer';
import { guid, startsWith } from '@microsoft/utils-logic-apps';
import * as React from 'react';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const DesignerEditorConsumption = () => {
  const { id: workflowId } = useSelector((state: RootState) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: state.workflowLoader.resourcePath!,
  }));

  const isDarkMode = useIsDarkMode();
  const readOnly = useIsReadOnly();
  const isMonitoringView = useIsMonitoringView();
  const showChatBot = useShowChatBot();

  const queryClient = useQueryClient();

  // const workflowName = workflowId.split('/').splice(-1)[0];
  const siteResourceId = new ArmParser(workflowId).topmostResourceId;
  const {
    data: workflowAndArtifactsData,
    isLoading: isWorkflowAndArtifactsLoading,
    isError: isWorklowAndArtifactsError,
    error: workflowAndArtifactsError,
  } = useWorkflowAndArtifactsConsumption(workflowId);
  const {
    data: workflowAppData,
    isLoading: isWorkflowAppLoading,
    isError: isWorkflowAppError,
    error: workflowAppError,
  } = useWorkflowApp(siteResourceId, true);
  const { data: tenantId } = useCurrentTenantId();
  const [designerID, setDesignerID] = React.useState(guid());

  const { workflow, connectionReferences, parameters } = React.useMemo(
    () => getDataForConsumption(workflowAndArtifactsData),
    [workflowAndArtifactsData]
  );
  const { definition } = workflow;

  const getConnectionConfiguration = async (_connectionId: string): Promise<any> => {
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
        workflowAppData as WorkflowApp,
        getConnectionConfiguration,
        tenantId,
        canonicalLocation,
        undefined,
        queryClient
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, workflowAppData, tenantId, canonicalLocation, designerID]
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

  const isLoading = React.useMemo(
    () => isWorkflowAndArtifactsLoading || isWorkflowAppLoading,
    [isWorkflowAndArtifactsLoading, isWorkflowAppLoading]
  );

  const isError = React.useMemo(() => isWorklowAndArtifactsError || isWorkflowAppError, [isWorklowAndArtifactsError, isWorkflowAppError]);

  const error = React.useMemo(() => workflowAndArtifactsError ?? workflowAppError, [workflowAndArtifactsError, workflowAppError]);

  if (!parsedDefinition || isLoading) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  }

  if (isError) {
    throw error;
  }

  if (isWorklowAndArtifactsError) throw workflowAndArtifactsError;

  const saveWorkflowFromDesigner = async (workflowFromDesigner: Workflow): Promise<void> => {
    if (!workflowAndArtifactsData) return;
    const { definition, connectionReferences, parameters } = workflowFromDesigner;
    const workflowToSave = {
      ...workflow,
      definition,
      parameters,
      connections: {},
    };

    try {
      const newConnectionsObj: Record<string, any> = {};
      if (Object.keys(connectionReferences ?? {}).length) {
        await Promise.all(
          Object.keys(connectionReferences).map(async (referenceKey) => {
            const reference = connectionReferences[referenceKey];
            const { api, connection, connectionProperties } = reference;
            newConnectionsObj[referenceKey] = {
              api,
              connection,
              connectionProperties,
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
  workflow: any,
  getConfiguration: (connectionId: string) => Promise<any>,
  tenantId: string | undefined,
  location: string,
  loggerService?: any,
  queryClient?: any
): any => {
  console.log('### Getting services');
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
    getConfiguration,
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
        return appServiceService.getOperationSchema(parameters.swaggerUrl, parameters.operationId, isInput);
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
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl,
      subscriptionId,
      resourceGroup,
    },
    workflowReferenceId: '',
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
    openApiConnectionMode: true, // This should be turned on for Open Api testing.
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      openApiVersion: '2022-09-01-preview', //Uncomment to test Open Api
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
  const connectionsData: Record<string, any> = {};
  const connectionReferences = formatConnectionReferencesForConsumption(connections);
  const parameters: ParametersData = formatWorkflowParametersForConsumption(properties);

  return { workflow, connectionsData, connectionReferences, parameters };
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
