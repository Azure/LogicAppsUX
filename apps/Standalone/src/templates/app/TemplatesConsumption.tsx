import { useCallback, useMemo } from 'react';
import {
  type ConnectionReferences,
  getReactQueryClient,
  getTemplateTypeCategories,
  isOpenApiSchemaVersion,
  TemplatesDataProvider,
  TemplatesDesigner,
  type WorkflowParameter,
} from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { TemplatesView, TemplatesDesignerProvider, templateStore, resetStateOnResourceChange } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  BaseGatewayService,
  BaseTenantService,
  ConsumptionOperationManifestService,
  ConsumptionConnectionService,
  startsWith,
  BaseAppServiceService,
  BaseApiManagementService,
  BaseFunctionService,
  ConsumptionConnectorService,
  ConsumptionTemplateService,
  BaseResourceService,
  BaseTemplateResourceService,
} from '@microsoft/logic-apps-shared';
import {
  getWorkflowAndArtifactsConsumption,
  listCallbackUrl,
  saveWorkflowConsumption,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowAndArtifactsConsumption,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import { getDataForConsumption, WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionMapping } from '@microsoft/logic-apps-designer/src/lib/core/state/templates/workflowSlice';
import { parseWorkflowParameterValue } from '@microsoft/logic-apps-designer';

const workflowIdentifier = '#workflowname#';

export const TemplatesConsumption = () => {
  const { theme, templatesView } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
    templatesView: state.workflowLoader.templatesView,
  }));
  const {
    resourcePath: workflowId,
    language,
    isCreateView,
    enableResourceSelection,
  } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowData } = useWorkflowAndArtifactsConsumption(workflowId!);
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowData?.location ?? 'westus');

  const { workflow, connectionReferences } = useMemo(() => getDataForConsumption(workflowData), [workflowData]);
  const isSingleTemplateView = useMemo(() => templatesView !== 'gallery', [templatesView]);

  const isWorkflowEmpty = useMemo(() => Object.keys((workflow?.definition as any)?.triggers ?? {}).length === 0, [workflow]);
  const queryClient = getReactQueryClient();

  const onBlankWorkflowClick = async () => {
    if (!workflowData) {
      return;
    }

    if (isWorkflowEmpty) {
      alert('Workflow is empty, navigate to designer blade');
    }

    const workflowToSave = {
      definition: {
        ...workflow?.definition,
        triggers: {},
        actions: {},
        outputs: {},
        parameters: {},
      },
      parameters: {},
    };

    await saveWorkflowConsumption(workflowData, workflowToSave, () => {}, { throwError: true });
    alert('Workflow overwrote successfully!');
  };

  const createWorkflowCall = async (
    workflows: { definition: LogicAppsV2.WorkflowDefinition }[],
    connectionsMapping: ConnectionMapping,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    if (workflowId) {
      let sanitizedWorkflowDefinition = JSON.stringify(workflows[0].definition);
      const parameters: Record<string, WorkflowParameter> = {};
      // Sanitizing parameter name & body
      Object.keys(parametersData).forEach((key) => {
        const parameter = parametersData[key];
        const sanitizedParameterName = replaceWorkflowIdentifier(parameter.name);
        parameters[sanitizedParameterName] = {
          type: parameter.type,
          value: parseWorkflowParameterValue(parameter.type, parameter?.value ?? parameter?.default),
        };
        sanitizedWorkflowDefinition = replaceAllStringInWorkflowDefinition(
          sanitizedWorkflowDefinition,
          `parameters('${parameter.name}')`,
          `parameters('${sanitizedParameterName}')`
        );
      });

      const { references, stringifiedDefinition: updatedStringifiedDefinition } = updateConnectionsDataWithNewConnections(
        connectionsMapping,
        sanitizedWorkflowDefinition
      );

      const workflowDefinition = JSON.parse(updatedStringifiedDefinition);
      const workflowToSave: any = {
        definition: workflowDefinition,
        parameters,
        connections: references,
      };

      const workflowArtifacts = await getWorkflowAndArtifactsConsumption(workflowId!);
      await saveWorkflowConsumption(workflowArtifacts, workflowToSave, () => {}, { throwError: true });
      alert('Workflow saved successfully!');
    } else {
      console.log('Select Logic App first!');
    }
  };

  const services = useMemo(
    () => getServices(workflowId!, workflow as any, tenantId, objectId, canonicalLocation, language, onBlankWorkflowClick, queryClient),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, workflow, tenantId, canonicalLocation, language]
  );

  const resourceDetails = new ArmParser(workflowId ?? '');

  const onReloadServices = useCallback(() => {
    const {
      workflow: { subscriptionId, resourceGroup, location },
      templateOptions: { reInitializeServices },
    } = templateStore.getState();
    console.log('onReloadServices - Resource is updated');
    if (reInitializeServices) {
      templateStore.dispatch(
        resetStateOnResourceChange(
          getResourceBasedServices(
            subscriptionId,
            resourceGroup,
            tenantId,
            objectId,
            WorkflowUtility.convertToCanonicalFormat(location ?? 'westus'),
            language,
            queryClient,
            workflowId
          )
        )
      );
    }
  }, [language, objectId, queryClient, tenantId, workflowId]);

  if (!workflowData) {
    return null;
  }
  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <TemplatesDataProvider
        resourceDetails={{
          subscriptionId: resourceDetails.subscriptionId,
          resourceGroup: resourceDetails.resourceGroup,
          location: canonicalLocation,
        }}
        connectionReferences={connectionReferences}
        services={services}
        isConsumption={true}
        isCreateView={!!isCreateView}
        enableResourceSelection={enableResourceSelection}
        viewTemplate={isSingleTemplateView ? { id: templatesView } : undefined}
        onResourceChange={onReloadServices}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          {isSingleTemplateView ? (
            <TemplatesView createWorkflow={createWorkflowCall} showCloseButton={true} onClose={() => window.alert('Template is closing')} />
          ) : (
            <TemplatesDesigner
              createWorkflowCall={createWorkflowCall}
              detailFilters={{
                Category: {
                  displayName: 'Categories',
                  items: [
                    {
                      value: 'Design Patterns',
                      displayName: 'Design Patterns',
                    },
                    {
                      value: 'AI',
                      displayName: 'AI',
                    },
                    {
                      value: 'B2B',
                      displayName: 'B2B',
                    },
                    {
                      value: 'EDI',
                      displayName: 'EDI',
                    },
                    {
                      value: 'Approval',
                      displayName: 'Approval',
                    },
                    {
                      value: 'RAG',
                      displayName: 'RAG',
                    },
                    {
                      value: 'Automation',
                      displayName: 'Automation',
                    },
                  ],
                },
                Type: {
                  displayName: 'Type',
                  items: getTemplateTypeCategories(),
                },
              }}
              isWorkflowEmpty={isWorkflowEmpty}
            />
          )}
        </div>
      </TemplatesDataProvider>
    </TemplatesDesignerProvider>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const getServices = (
  workflowId: string,
  workflow: any,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  locale: string | undefined,
  onBlankWorkflowClick: () => Promise<void>,
  queryClient?: any
): any => {
  const baseUrl = 'https://management.azure.com';
  const { subscriptionId, resourceGroup } = new ArmParser(workflowId);

  const defaultServiceParams = { baseUrl, httpClient, apiVersion };

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
  const templateService = new ConsumptionTemplateService({
    ...defaultServiceParams,
    endpoint: '/templatesLocalProxy/templates/logicapps',
    useEndpointForTemplates: true,
    openBladeAfterCreate: (_workflowName: string | undefined) => {
      window.alert('Open blade after create, consumption creation is complete');
    },
    onAddBlankWorkflow: onBlankWorkflowClick,
  });
  const resourceService = new BaseResourceService(defaultServiceParams);
  const templateResourceService = new BaseTemplateResourceService({ baseUrl, httpClient, apiVersion: '2025-06-01-preview' });

  const { connectionService, oAuthService, operationManifestService, connectorService } = getResourceBasedServices(
    subscriptionId,
    resourceGroup,
    tenantId,
    objectId,
    location,
    locale,
    queryClient,
    workflowId
  );

  return {
    connectionService,
    gatewayService,
    tenantService,
    oAuthService,
    operationManifestService,
    templateService,
    workflowService,
    connectorService,
    resourceService,
    templateResourceService,
  };
};

const getResourceBasedServices = (
  subscriptionId: string,
  resourceGroup: string,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  locale: string | undefined,
  queryClient?: any,
  workflowId?: string
): any => {
  const baseUrl = 'https://management.azure.com';
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

  const appServiceService = new BaseAppServiceService({
    ...defaultServiceParams,
    apiVersion: '2022-03-01',
    subscriptionId,
  });

  const apimService = new BaseApiManagementService({
    ...defaultServiceParams,
    apiVersion: '2021-08-01',
    subscriptionId,
    includeBasePathInTemplate: true,
    queryClient,
  });

  const functionService = new BaseFunctionService({
    baseUrl,
    apiVersion,
    subscriptionId,
    httpClient,
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
    schemaClient: {},
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
    workflowReferenceId: workflowId ?? 'default',
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
  const operationManifestService = new ConsumptionOperationManifestService({
    ...defaultServiceParams,
    apiVersion: '2022-09-01-preview',
    subscriptionId,
    location: location || 'location',
  });

  return {
    connectionService,
    oAuthService,
    operationManifestService,
    connectorService,
  };
};

const updateConnectionsDataWithNewConnections = (
  connections: ConnectionMapping,
  stringifiedDefinition: string
): { references: ConnectionReferences; stringifiedDefinition: string } => {
  const { references, mapping } = connections;
  const referencesToAdd: ConnectionReferences = {};
  let updatedDefinition = stringifiedDefinition;

  for (const connectionKey of Object.keys(mapping)) {
    const referenceKey = mapping[connectionKey];
    referencesToAdd[referenceKey] = references[referenceKey];
    if (connectionKey === referenceKey) {
      updatedDefinition = replaceAllStringInWorkflowDefinition(updatedDefinition, referenceKey, replaceWorkflowIdentifier(referenceKey));
    } else {
      updatedDefinition = replaceAllStringInWorkflowDefinition(updatedDefinition, connectionKey, referenceKey);
    }
  }

  const newConnectionsObj: Record<string, any> = {};
  for (const referenceKey of Object.keys(referencesToAdd)) {
    const reference = referencesToAdd[referenceKey];

    const { api, connection, connectionProperties, connectionRuntimeUrl } = reference;
    newConnectionsObj[replaceWorkflowIdentifier(referenceKey)] = {
      api,
      connection,
      connectionId: isOpenApiSchemaVersion(JSON.parse(stringifiedDefinition)) ? undefined : connection.id,
      connectionProperties,
      connectionRuntimeUrl,
    };
  }

  return {
    references: newConnectionsObj,
    stringifiedDefinition: updatedDefinition,
  };
};

const replaceWorkflowIdentifier = (content: string) => content.replaceAll(workflowIdentifier, 'template');

const replaceAllStringInWorkflowDefinition = (workflowDefinition: string, oldString: string, newString: string) => {
  return workflowDefinition.replaceAll(oldString, newString);
};
