import { clientSupportedOperations } from './constants';
import { BaseOAuthService } from './services/oAuth';
import { resolveConnectionsReferences } from './utilities/workflow';
import {
  StandardConnectionService,
  StandardConnectorService,
  StandardOperationManifestService,
  StandardSearchService,
  BaseGatewayService,
  StandardRunService,
  StandardArtifactService,
  BaseApiManagementService,
  BaseFunctionService,
  BaseAppServiceService,
  HTTP_METHODS,
  clone,
  isEmptyString,
  BaseTenantService,
  BaseCognitiveServiceService,
  BaseRoleService,
} from '@microsoft/logic-apps-shared';
import type {
  ApiHubServiceDetails,
  ConnectionCreationInfo,
  ConnectionsData,
  ContentType,
  IHostService,
  ILoggerService,
  IWorkflowService,
  ManagedIdentity,
  ConnectionAndAppSetting,
  LocalConnectionModel,
} from '@microsoft/logic-apps-shared';
import type { IDesignerPanelMetadata, MessageToVsix } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, HttpClient } from '@microsoft/vscode-extension-logic-apps';
import type { QueryClient } from '@tanstack/react-query';
import type { WebviewApi } from 'vscode-webview';
import { CustomEditorService } from './customEditorService';
import packagejson from '../../../package.json';
import { LoggerService } from '../services/Logger';
import { CustomConnectionParameterEditorService } from './services/customConnectionParameterEditorService';

export interface IDesignerServices {
  connectionService: StandardConnectionService;
  connectorService: StandardConnectorService;
  operationManifestService: StandardOperationManifestService;
  searchService: StandardSearchService;
  oAuthService: BaseOAuthService;
  gatewayService: BaseGatewayService;
  tenantService: BaseTenantService;
  workflowService: IWorkflowService;
  hostService: IHostService;
  runService: StandardRunService;
  roleService: BaseRoleService;
  editorService: CustomEditorService;
  apimService: BaseApiManagementService;
  functionService: BaseFunctionService;
  loggerService: ILoggerService;
  connectionParameterEditorService: CustomConnectionParameterEditorService;
  cognitiveServiceService: BaseCognitiveServiceService;
}

export const getDesignerServices = (
  baseUrl: string,
  workflowRuntimeBaseUrl: string,
  apiVersion: string,
  apiHubDetails: ApiHubServiceDetails,
  isLocal: boolean,
  connectionData: ConnectionsData,
  panelMetadata: IDesignerPanelMetadata | null,
  createFileSystemConnection: (connectionInfo: ConnectionCreationInfo, connectionName: string) => Promise<ConnectionCreationInfo>,
  vscode: WebviewApi<unknown>,
  oauthRedirectUrl: string,
  hostVersion: string,
  queryClient: QueryClient,
  sendMsgToVsix: (msg: MessageToVsix) => void
): IDesignerServices => {
  let authToken = '';
  let panelId = '';
  let workflowDetails: Record<string, any> = {};
  let appSettings = {};
  let isStateful = false;
  let connectionsData: ConnectionsData = { ...connectionData };
  let workflowName = '';

  const { subscriptionId = 'subscriptionId', resourceGroup, location } = apiHubDetails;

  const armUrl = 'https://management.azure.com';

  const emptyArmId = '00000000-0000-0000-0000-000000000000';

  if (panelMetadata) {
    authToken = panelMetadata.accessToken ?? '';
    panelId = panelMetadata.panelId;
    workflowDetails = panelMetadata.workflowDetails;
    workflowName = panelMetadata.workflowName;
    appSettings = panelMetadata.localSettings;
    isStateful = panelMetadata.standardApp?.stateful ?? false;
  }

  const addConnectionData = async (connectionAndSetting: ConnectionAndAppSetting<LocalConnectionModel>): Promise<void> => {
    connectionsData = addConnectionInJson(connectionAndSetting, connectionsData ?? {});
    appSettings = addOrUpdateAppSettings(connectionAndSetting.settings, appSettings ?? {});
    return vscode.postMessage({
      command: ExtensionCommand.addConnection,
      connectionAndSetting,
    });
  };

  const httpClient = new HttpClient({
    accessToken: authToken,
    baseUrl,
    apiHubBaseUrl: apiHubDetails.baseUrl,
    hostVersion,
  });
  const apiHubServiceDetails = {
    ...apiHubDetails,
    httpClient,
    apiVersion: apiHubDetails.apiVersion ?? apiVersion,
    baseUrl: apiHubDetails.baseUrl ?? baseUrl,
  };

  const connectionService = new StandardConnectionService({
    baseUrl,
    apiVersion,
    httpClient,
    apiHubServiceDetails,
    readConnections: () => Promise.resolve(connectionsData),
    writeConnection: (connectionData: ConnectionAndAppSetting<LocalConnectionModel>) => {
      return addConnectionData(connectionData);
    },
    connectionCreationClients: {
      FileSystem: {
        connectionCreationFunc: createFileSystemConnection,
      },
    },
  });
  const apimService = new BaseApiManagementService({
    apiVersion: '2021-08-01',
    baseUrl,
    subscriptionId,
    httpClient,
    queryClient,
  });

  const artifactService = new StandardArtifactService({
    apiVersion,
    baseUrl,
    httpClient,
    integrationAccountCallbackUrl:
      panelMetadata?.localSettings && panelMetadata?.localSettings['WORKFLOW_INTEGRATION_ACCOUNT_CALLBACK_URL'],
    apiHubServiceDetails,
    schemaArtifacts: panelMetadata?.schemaArtifacts,
    mapArtifacts: panelMetadata?.mapArtifacts,
  });

  const manualWorkflows = Object.keys(workflowDetails).map((name) => ({
    value: name,
    displayName: name,
  }));
  const appService = new BaseAppServiceService({
    baseUrl: armUrl,
    apiVersion,
    subscriptionId,
    httpClient,
  });

  const connectorService = new StandardConnectorService({
    apiVersion,
    baseUrl,
    httpClient,
    clientSupportedOperations: clientSupportedOperations,
    getConfiguration: async (connectionId: string): Promise<any> => {
      if (!connectionId) {
        return Promise.resolve();
      }

      const defaultConfiguration: Record<string, any> = {
        workflowAppLocation: '/Users/carloscastrotrejo/Downloads/IssueDavis/XMLissue/LogicApp',
      };

      const connectionName = connectionId.split('/').splice(-1)[0];
      const connectionsInfo = {
        ...connectionsData?.serviceProviderConnections,
        ...connectionsData?.apiManagementConnections,
      };
      const connectionInfo = connectionsInfo[connectionName];

      if (connectionInfo) {
        const resolvedConnectionInfo = resolveConnectionsReferences(JSON.stringify(connectionInfo), {}, appSettings);
        delete resolvedConnectionInfo.displayName;
        defaultConfiguration.connection = resolvedConnectionInfo;
      }

      return defaultConfiguration;
    },
    schemaClient: {
      getWorkflowSwagger: (args) => {
        const workflowName = args.parameters.name;
        return Promise.resolve(workflowDetails[workflowName] || {});
      },
      getApimOperationSchema: (args: any) => {
        const { configuration, parameters, isInput } = args;
        if (!configuration?.connection?.apiId) {
          throw new Error('Missing api information to make dynamic call');
        }

        return apimService.getOperationSchema(configuration.connection.apiId, parameters.operationId, isInput);
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
    },
    valuesClient: {
      getWorkflows: () => Promise.resolve(manualWorkflows),
      getMapArtifacts: (args: any) => {
        const { mapType, mapSource } = args.parameters;
        return artifactService.getMapArtifacts(mapType, mapSource);
      },
      getSchemaArtifacts: (args: any) => artifactService.getSchemaArtifacts(args.parameters.schemaSource),
      getApimOperations: (args: any) => {
        const { configuration } = args;
        if (!configuration?.connection?.apiId) {
          throw new Error('Missing api information to make dynamic call');
        }
        return apimService.getOperations(configuration?.connection?.apiId);
      },
      getSwaggerOperations: (args: any) => {
        const { parameters } = args;
        return appService.getOperations(parameters.swaggerUrl);
      },
    },
    apiHubServiceDetails,
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
    apiHubServiceDetails,
    isDev: false,
    showStatefulOperations: isStateful,
  });

  const oAuthService = new BaseOAuthService({
    vscode,
    panelId,
    authToken,
    oauthRedirectUrl,
    baseUrl: apiHubServiceDetails.baseUrl,
    apiVersion: '2018-07-01-preview',
    httpClient,
    subscriptionId,
    resourceGroup,
    location,
  });

  const functionService = new BaseFunctionService({
    baseUrl: armUrl,
    apiVersion,
    httpClient,
    subscriptionId,
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

  // Workflow service needs to be implemented to get the callback url for azure resources
  const workflowService: IWorkflowService = {
    getCallbackUrl: async () => {
      if (isLocal) {
        return Promise.resolve({
          method: HTTP_METHODS.POST,
          value: 'Url not available during authoring in local project. Check Overview page.',
        });
      }
      return Promise.resolve({
        method: HTTP_METHODS.POST,
        value: 'Url not available during authoring in local project. Check Overview page.',
      });
    },
    getAppIdentity: () => {
      return {
        principalId: emptyArmId,
        tenantId: emptyArmId,
        type: 'SystemAssigned',
      } as ManagedIdentity;
    },
    isExplicitAuthRequiredForManagedIdentity: () => true,
  };

  const hostService: IHostService = {
    fetchAndDisplayContent: async (title: string, url: string, type: ContentType) => {
      const content = await httpClient.get({ uri: url });
      return vscode.postMessage({
        command: ExtensionCommand.showContent,
        content: JSON.stringify(content, null, 4),
        header: type,
        id: title,
        title,
      });
    },
  };

  const runService = new StandardRunService({
    apiVersion,
    baseUrl: isEmptyString(workflowRuntimeBaseUrl) ? baseUrl : workflowRuntimeBaseUrl,
    workflowName: workflowName ?? '',
    httpClient,
  });

  // MSI is not supported in VS Code
  const roleService = new BaseRoleService({
    baseUrl: armUrl,
    apiVersion: '2022-05-01-preview',
    httpClient,
    tenantId: emptyArmId,
    userIdentityId: emptyArmId,
    appIdentityId: emptyArmId,
    subscriptionId,
  });

  const cognitiveServiceService = new BaseCognitiveServiceService({
    apiVersion: '2023-10-01-preview',
    baseUrl: armUrl,
    httpClient,
  });

  const editorService = new CustomEditorService({
    areCustomEditorsEnabled: true,
    openRelativeLink: (relativeLink: string) => {
      return vscode.postMessage({
        command: ExtensionCommand.openRelativeLink,
        content: relativeLink,
      });
    },
  });

  const loggerService = new LoggerService(sendMsgToVsix, {
    designerVersion: packagejson.version,
  });

  const connectionParameterEditorService = new CustomConnectionParameterEditorService();

  return {
    connectionService,
    connectorService,
    operationManifestService,
    searchService,
    oAuthService,
    gatewayService,
    tenantService,
    workflowService,
    hostService,
    runService,
    roleService,
    editorService,
    apimService,
    loggerService,
    connectionParameterEditorService,
    cognitiveServiceService,
    functionService,
  };
};

const addConnectionInJson = (
  connectionAndSetting: ConnectionAndAppSetting<LocalConnectionModel>,
  connectionsJson: ConnectionsData
): ConnectionsData => {
  const { connectionData, connectionKey, pathLocation } = connectionAndSetting;
  const pathToSetConnectionsData: any = clone(connectionsJson);

  for (const path of pathLocation) {
    if (!pathToSetConnectionsData[path]) {
      pathToSetConnectionsData[path] = {};
    }

    if (pathToSetConnectionsData && pathToSetConnectionsData[path][connectionKey]) {
      break;
    }
    pathToSetConnectionsData[path][connectionKey] = connectionData;
  }

  return pathToSetConnectionsData as ConnectionsData;
};

const addOrUpdateAppSettings = (settings: Record<string, string>, originalSettings: Record<string, string>): Record<string, string> => {
  const updatedSettings: any = clone(originalSettings);

  const settingsToAdd = Object.keys(settings);

  for (const settingKey of settingsToAdd) {
    updatedSettings[settingKey] = settings[settingKey];
  }

  return updatedSettings;
};
