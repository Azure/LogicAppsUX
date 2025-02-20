import { useCallback, useEffect, useMemo } from 'react';
import { getReactQueryClient, TemplatesDataProvider, templateStore, TemplatesView } from '@microsoft/logic-apps-designer';
import { environment } from '../../environments/environment';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  BaseGatewayService,
  StandardTemplateService,
  BaseTenantService,
  StandardConnectionService,
  clone,
  escapeSpecialChars,
  isArmResourceId,
  optional,
  StandardOperationManifestService,
  guid,
  setObjectPropertyValue,
  StandardConnectorService,
  BaseAppServiceService,
  BaseApiManagementService,
} from '@microsoft/logic-apps-shared';
import {
  getConnectionStandard,
  useAppSettings,
  useConnectionsData,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowApp,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ConnectionAndAppSetting, ConnectionsData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import { WorkflowUtility, addConnectionInJson, addOrUpdateAppSettings } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { Template, LogicAppsV2, IWorkflowService } from '@microsoft/logic-apps-shared';
import { saveWorkflowStandard } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ParametersData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import axios from 'axios';
import type { ConnectionMapping } from '@microsoft/logic-apps-designer/src/lib/core/state/templates/workflowSlice';
import { parseWorkflowParameterValue } from '@microsoft/logic-apps-designer';
import { useFunctionalState } from '@react-hookz/web';
import { ArtifactService } from '../../designer/app/AzureLogicAppsDesigner/Services/Artifact';
import { ChildWorkflowService } from '../../designer/app/AzureLogicAppsDesigner/Services/ChildWorkflow';
import type { QueryClient } from '@tanstack/react-query';

interface StringifiedWorkflow {
  name: string;
  kind: string;
  definition: string;
}

const workflowIdentifier = '#workflowname#';
export const TemplatesStandard = () => {
  const { theme, templatesView } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
    templatesView: state.workflowLoader.templatesView,
  }));
  const { appId, hostingPlan, workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowAppData } = useWorkflowApp(appId as string, hostingPlan);
  const canonicalLocation = useMemo(
    () => WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? 'westus'),
    [workflowAppData]
  );
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const { data: originalConnectionsData } = useConnectionsData(appId);
  const { data: originalSettingsData } = useAppSettings(appId as string);

  const [connectionsData, setConnectionsData] = useFunctionalState(originalConnectionsData);
  const [settingsData, setSettingsData] = useFunctionalState(originalSettingsData);
  const queryClient = getReactQueryClient();

  useEffect(() => {
    if (originalSettingsData) {
      setSettingsData(originalSettingsData);
    }
  }, [originalSettingsData, setSettingsData]);

  useEffect(() => {
    if (originalConnectionsData) {
      setConnectionsData(JSON.parse(JSON.stringify(clone(originalConnectionsData ?? {}))));
    }
  }, [originalConnectionsData, setConnectionsData]);

  const connectionReferences = useMemo(() => WorkflowUtility.convertConnectionsDataToReferences(connectionsData()), [connectionsData]);
  const isSingleTemplateView = useMemo(() => templatesView !== 'gallery', [templatesView]);

  const createWorkflowCall = async (
    workflows: { name: string | undefined; kind: string | undefined; definition: LogicAppsV2.WorkflowDefinition }[],
    connectionsMapping: ConnectionMapping,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    if (appId) {
      if (hostingPlan === 'standard') {
        let sanitizedWorkflowDefinitions = workflows.map((workflow) => ({
          name: workflow.name as string,
          kind: workflow.kind as string,
          definition: JSON.stringify(workflow.definition),
        }));
        const sanitizedParameterData: ParametersData = {};
        const uniqueIdentifier = getUniqueName(workflows.map((workflow) => workflow.name as string));

        // Sanitizing parameter name & body
        Object.keys(parametersData).forEach((key) => {
          const parameter = parametersData[key];
          const sanitizedParameterName = replaceWithWorkflowName(parameter.name, uniqueIdentifier);
          sanitizedParameterData[sanitizedParameterName] = {
            type: parameter.type,
            value: parseWorkflowParameterValue(parameter.type, parameter?.value ?? parameter?.default),
          };
          sanitizedWorkflowDefinitions = replaceAllStringInAllWorkflows(
            sanitizedWorkflowDefinitions,
            `parameters('${parameter.name}')`,
            `parameters('${sanitizedParameterName}')`
          );
        });

        const {
          connectionsData: updatedConnectionsData,
          settingProperties: updatedSettingProperties,
          workflowsJsonString: updatedWorkflowsJsonString,
        } = await updateConnectionsDataWithNewConnections(
          connectionsData(),
          settingsData()?.properties,
          connectionsMapping,
          sanitizedWorkflowDefinitions,
          uniqueIdentifier
        );
        sanitizedWorkflowDefinitions = updatedWorkflowsJsonString;

        const templateName = templateStore.getState().template.templateName;
        const workflowsToSave = sanitizedWorkflowDefinitions.map((workflow) => ({
          name: workflow.name,
          workflow: {
            definition: JSON.parse(workflow.definition),
            kind: workflow.kind,
            metadata: {
              templates: { name: templateName },
            },
          },
        }));

        const getExistingParametersData = async () => {
          try {
            const response = await axios.get(
              `https://management.azure.com${appId}/hostruntime/admin/vfs/parameters.json?api-version=2018-11-01&relativepath=1`,
              {
                headers: {
                  'If-Match': '*',
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${environment.armToken}`,
                },
              }
            );
            return response.data as ParametersData;
          } catch (error: any) {
            return error?.response?.status === 404 ? {} : undefined;
          }
        };
        const existingParametersData = await getExistingParametersData();

        if (!existingParametersData) {
          alert('Error fetching parameters');
          throw new Error('Error fetching parameters');
        }

        const updatedParametersData: ParametersData = {
          ...existingParametersData,
          ...sanitizedParameterData,
        };
        await saveWorkflowStandard(
          appId,
          workflowsToSave,
          updatedConnectionsData,
          updatedParametersData,
          updatedSettingProperties,
          undefined,
          () => {},
          { skipValidation: true, throwError: true }
        );
      } else {
        console.log('Hosting plan is not ready yet!');
      }
    } else {
      console.log('Select App Id first!');
    }
  };

  const addConnectionDataInternal = useCallback(
    async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
      addConnectionInJson(connectionAndSetting, connectionsData() ?? {});
      addOrUpdateAppSettings(connectionAndSetting.settings, settingsData()?.properties ?? {});
    },
    [connectionsData, settingsData]
  );

  const getConnectionConfiguration = useCallback(
    async (connectionId: string): Promise<any> => {
      if (!connectionId) {
        return Promise.resolve();
      }

      const connectionName = connectionId.split('/').splice(-1)[0];
      const connectionInfo =
        connectionsData()?.serviceProviderConnections?.[connectionName] ?? connectionsData()?.apiManagementConnections?.[connectionName];

      if (connectionInfo) {
        // TODO(psamband): Add new settings in this blade so that we do not resolve all the appsettings in the connectionInfo.
        const resolvedConnectionInfo = WorkflowUtility.resolveConnectionsReferences(
          JSON.stringify(connectionInfo),
          {},
          settingsData()?.properties
        );
        delete resolvedConnectionInfo.displayName;

        return {
          connection: resolvedConnectionInfo,
        };
      }

      return undefined;
    },
    [connectionsData, settingsData]
  );

  const services = useMemo(
    () =>
      getServices(
        appId as string,
        connectionsData() ?? {},
        workflowAppData as WorkflowApp,
        addConnectionDataInternal,
        getConnectionConfiguration,
        tenantId,
        objectId,
        canonicalLocation,
        queryClient,
        settingsData()?.properties ?? {}
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectionsData, settingsData, workflowAppData, tenantId, canonicalLocation, appId]
  );
  const resourceDetails = new ArmParser(appId ?? '');

  if (!workflowAppData) {
    return null;
  }
  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <TemplatesDataProvider
        resourceDetails={{
          subscriptionId: resourceDetails.subscriptionId,
          resourceGroup: resourceDetails.resourceGroup,
          location: canonicalLocation,
          workflowAppName: resourceDetails.resourceName,
        }}
        connectionReferences={connectionReferences}
        services={services}
        isConsumption={false}
        isCreateView={true}
        existingWorkflowName={existingWorkflowName}
        viewTemplate={
          isSingleTemplateView
            ? {
                id: templatesView,
                parametersOverride: {
                  'odataTopDefault_#workflowname#': { value: 0, isEditable: false },
                  'sharepoint-site-name_#workflowname#': { value: 'overriden-empty' },
                  'TeamsChannelID_#workflowname#': { value: 'overriden-default', isEditable: false },
                  'TeamsTeamID_#workflowname#': { value: 'overriden-default-editable' },
                  'OpenAIEmbeddingModel_#workflowname#': { value: 'overriden-default-editable' },
                  'SharepointSiteAddress_#workflowname#': { value: 'overriden-default-non-editable', isEditable: false },
                },
                basicsOverride: {
                  [templatesView]: {
                    name: { value: 'overriden-name', isEditable: false },
                    kind: { value: 'stateful', isEditable: false },
                  },
                  ['ingest-index-ai-sharepoint-rag']: {
                    name: { value: 'overriden-name', isEditable: false },
                    kind: { value: 'stateful', isEditable: false },
                  },
                },
              }
            : undefined
        }
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
                    {
                      value: 'BizTalk Migration',
                      displayName: 'BizTalk Migration',
                    },
                    {
                      value: 'Mainframe Modernization',
                      displayName: 'Mainframe Modernization',
                    },
                  ],
                },
              }}
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
  siteResourceId: string,
  connectionsData: ConnectionsData,
  workflowApp: WorkflowApp | undefined,
  addConnection: (data: ConnectionAndAppSetting) => Promise<void>,
  getConfiguration: (connectionId: string) => Promise<any>,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  queryClient: QueryClient,
  appSettings: Record<string, string>
): any => {
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const { subscriptionId, resourceGroup, resourceName } = new ArmParser(siteResourceId ?? '');

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
    workflowAppDetails: { appName: resourceName, identity: workflowApp?.identity as any },
    readConnections: () => Promise.resolve(connectionsData),
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
  const tenantService = new BaseTenantService({
    baseUrl: armUrl,
    httpClient,
    apiVersion: '2017-08-01',
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
  const operationManifestService = new StandardOperationManifestService(defaultServiceParams);

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
    workflowName: 'default',
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
    schemaClient: {},
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

  const workflowService: IWorkflowService = {
    getCallbackUrl: () => Promise.resolve({} as any),
    getAppIdentity: () => workflowApp?.identity as any,
  };

  const templateService = new StandardTemplateService({
    endpoint: 'https://priti-cxf4h5cpcteue4az.b02.azurefd.net',
    baseUrl: armUrl,
    appId: siteResourceId,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
      gateway: '2018-11-01',
    },
    openBladeAfterCreate: (workflowName: string | undefined) => {
      window.alert(`Open blade after create, workflowName is: ${workflowName}`);
    },
    onAddBlankWorkflow: async () => {
      console.log('On add blank workflow click');
    },
  });

  return {
    connectionService,
    gatewayService,
    tenantService,
    oAuthService,
    operationManifestService,
    templateService,
    workflowService,
    connectorService,
  };
};

const getUniqueName = (names: string[]): string => (names.length === 1 ? names[0] : guid().replaceAll('-', '').substring(0, 8));

const replaceWithWorkflowName = (content: string, workflowName: string) => content.replaceAll(workflowIdentifier, workflowName);

const replaceAllStringInAllWorkflows = (workflows: StringifiedWorkflow[], oldString: string, newString: string) => {
  return workflows.map((workflow) => {
    return {
      ...workflow,
      definition: replaceAllStringInWorkflowDefinition(workflow.definition, oldString, newString),
    };
  });
};

const replaceAllStringInWorkflowDefinition = (workflowDefinition: string, oldString: string, newString: string) => {
  return workflowDefinition.replaceAll(oldString, newString);
};

const removeUnusedConnections = (
  connectionsData: ConnectionsData,
  connections: ConnectionMapping
): { connectionsData: ConnectionsData; connections: ConnectionMapping } => {
  const { references, mapping } = clone(connections);
  const updatedConnectionsData = clone(connectionsData);
  for (const connectionKey of Object.keys(mapping)) {
    const referenceKey = mapping[connectionKey];
    const isArmResource = isArmResourceId(references[referenceKey]?.api.id);

    if (connectionKey !== referenceKey && referenceKey.startsWith(connectionKey) && !isArmResource) {
      setObjectPropertyValue(
        updatedConnectionsData.serviceProviderConnections ?? {},
        [connectionKey],
        updatedConnectionsData.serviceProviderConnections?.[referenceKey]
      );

      delete references[referenceKey];
      delete updatedConnectionsData.serviceProviderConnections?.[referenceKey];

      mapping[connectionKey] = connectionKey;
    }

    if (!isArmResource) {
      const serviceProviderConnections = { ...(updatedConnectionsData.serviceProviderConnections ?? {}) };
      for (const key of Object.keys(serviceProviderConnections)) {
        if (key !== connectionKey && key.startsWith(connectionKey)) {
          delete updatedConnectionsData.serviceProviderConnections?.[key];
        }
      }

      const currentReferences = { ...references };
      for (const key of Object.keys(currentReferences)) {
        if (key !== connectionKey && key.startsWith(connectionKey)) {
          delete references[key];
        }
      }
    }
  }

  return { connectionsData: updatedConnectionsData, connections: { references, mapping } };
};

const updateConnectionsDataWithNewConnections = async (
  originalConnectionsData: ConnectionsData,
  settingProperties: Record<string, string>,
  connections: ConnectionMapping,
  workflowsJsonString: StringifiedWorkflow[],
  workflowName: string
): Promise<{ connectionsData: ConnectionsData; settingProperties: Record<string, string>; workflowsJsonString: StringifiedWorkflow[] }> => {
  const {
    connectionsData: updatedConnectionsData,
    connections: { references, mapping },
  } = removeUnusedConnections(originalConnectionsData, connections);
  let updatedSettings = { ...settingProperties };
  let updatedWorkflowsJsonString = workflowsJsonString;
  let updatedConnectionsJsonString = JSON.stringify(updatedConnectionsData);
  const referencesToProcess: string[] = [];

  for (const connectionKey of Object.keys(mapping)) {
    const referenceKey = mapping[connectionKey];
    if (connectionKey === referenceKey) {
      referencesToProcess.push(referenceKey);
    } else {
      updatedWorkflowsJsonString = replaceAllStringInAllWorkflows(updatedWorkflowsJsonString, connectionKey, referenceKey);
    }
  }

  if (referencesToProcess.length) {
    const newManagedApiConnections = updatedConnectionsData.managedApiConnections ?? {};
    const referencesToNormalize: string[] = [];
    await Promise.all(
      referencesToProcess.map(async (referenceKey) => {
        const reference = references[referenceKey];
        const normalizedReferenceKey = replaceWithWorkflowName(referenceKey, workflowName);
        if (isArmResourceId(reference?.connection?.id)) {
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

          newManagedApiConnections[normalizedReferenceKey] = newConnectionObj;
        } else {
          referencesToNormalize.push(referenceKey);
        }

        updatedWorkflowsJsonString = replaceAllStringInAllWorkflows(updatedWorkflowsJsonString, referenceKey, normalizedReferenceKey);
      })
    );
    updatedConnectionsData.managedApiConnections = newManagedApiConnections;

    updatedConnectionsJsonString = JSON.stringify(updatedConnectionsData);
    for (const referenceKey of referencesToNormalize) {
      const normalizedReferenceKey = replaceWithWorkflowName(referenceKey, workflowName);
      const escapedReferenceKeyForSettings = escapeSpecialChars(referenceKey);
      const normalizedEscapedReferenceKeyForSettings = replaceWithWorkflowName(escapedReferenceKeyForSettings, workflowName);

      updatedConnectionsJsonString = updatedConnectionsJsonString.replaceAll(referenceKey, normalizedReferenceKey);
      updatedConnectionsJsonString = updatedConnectionsJsonString.replaceAll(
        escapedReferenceKeyForSettings,
        normalizedEscapedReferenceKeyForSettings
      );
      updatedSettings = updateSettingsKeyWithWorkflowName(
        updatedSettings,
        escapedReferenceKeyForSettings,
        normalizedEscapedReferenceKeyForSettings
      );
    }
  }

  return {
    connectionsData: JSON.parse(updatedConnectionsJsonString),
    settingProperties: updatedSettings,
    workflowsJsonString: updatedWorkflowsJsonString,
  };
};

const updateSettingsKeyWithWorkflowName = (
  settingProperties: Record<string, string>,
  referenceKey: string,
  normalizedReferenceKey: string
): Record<string, string> => {
  const updatedSettings = { ...settingProperties };
  for (const key of Object.keys(settingProperties)) {
    if (key.includes(referenceKey)) {
      const normalizedKey = key.replace(referenceKey, normalizedReferenceKey);
      updatedSettings[normalizedKey] = settingProperties[key];
      delete updatedSettings[key];
    }
  }

  return updatedSettings;
};
