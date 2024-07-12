import { isSuccessResponse, type ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { getAuthorizationToken } from './getAuthorizationToken';
import axios from 'axios';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { getAccountCredentials } from '../credentials';
import { getWorkspaceFolder } from '../workspace';
import { getLocalSettingsJson } from '../appSettings/localSettings';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import path from 'path';
import {
  appKindSetting,
  extensionVersionKey,
  localSettingsFileName,
  logicAppKind,
  sqlStorageConnectionStringKey,
} from '../../../constants';
import { localize } from '../../../localize';

const getAppSettingsFromLocal = async (context) => {
  const appSettingsToskip = ['AzureWebJobsStorage', 'ProjectDirectoryPath', 'FUNCTIONS_WORKER_RUNTIME'];
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
  const settings = await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName));
  return Object.entries(settings.Values)
    .map((value) => ({
      name: value[0],
      value: value[1],
    }))
    .filter((p) => !appSettingsToskip.includes(p.name));
};

/**
 * Creates a hybrid app using the provided context.
 * @param context - The context object containing the necessary information for creating the hybrid app.
 * @returns A Promise that resolves when the hybrid app is created.
 */
export const createHybridApp = async (context: ILogicAppWizardContext) => {
  const defaultAppSettings = [
    {
      name: sqlStorageConnectionStringKey,
      value: context.sqlConnectionString,
    },
    {
      name: appKindSetting,
      value: logicAppKind,
    },
    {
      name: extensionVersionKey,
      value: '~4',
    },
    {
      name: 'AzureFunctionsJobHost__extensionBundle__id',
      value: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
    },
    {
      name: 'AzureWebJobsSecretStorageType',
      value: 'files',
    },
  ];

  const appSettings = (await getAppSettingsFromLocal(context)).concat(defaultAppSettings);
  const containerAppPayload = {
    type: 'Microsoft.App/containerApps',
    kind: logicAppKind,
    location: context._location.name,
    extendedLocation: context.connectedEnvironment.extendedLocation,
    properties: {
      environmentId: context.connectedEnvironment.id,
      configuration: {
        activeRevisionsMode: 'Single',
        ingress: {
          external: true,
          targetPort: 80,
          allowInsecure: true,
        },
      },
      template: {
        containers: [
          {
            image: 'mcr.microsoft.com/azurelogicapps/logicapps-base:preview',
            name: 'logicapps-container',
            env: appSettings,
            resources: {
              cpu: 1.0,
              memory: '2.0Gi',
            },
            volumeMounts: [
              {
                volumeName: 'artifacts-store',
                mountPath: '/home/site/wwwroot',
              },
            ],
          },
        ],
        scale: {
          minReplicas: 1,
          maxReplicas: 30,
        },
        volumes: [
          {
            name: 'artifacts-store',
            storageType: 'Smb',
            storageName: context.newSiteName,
          },
        ],
      },
    },
  };

  const url = `https://management.azure.com/subscriptions/${context.subscriptionId}/resourceGroups/${context.resourceGroup.name}/providers/Microsoft.App/containerApps/${context.newSiteName}?api-version=2024-02-02-preview`;

  try {
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);

    const options = {
      headers: { authorization: accessToken },
      body: containerAppPayload,
      uri: url,
    };

    const response = await axios.put(options.uri, options.body, {
      headers: options.headers,
    });

    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    throw new Error(`${localize('errorCreatingHybrid', 'Error in creating hybrid logic app')} - ${error.message}`);
  }
};

/**
 * Creates a Logic App extension.
 * @param context - The context object containing the necessary information for creating the extension.
 * @returns A promise that resolves when the Logic App extension is created.
 * @throws An error if there is an issue in getting the connection.
 */
export const createLogicAppExtension = async (context: ILogicAppWizardContext) => {
  const url = `https://management.azure.com/subscriptions/${context.subscriptionId}/resourceGroups/${context.resourceGroup.name}/providers/Microsoft.App/containerApps/${context.newSiteName}/providers/Microsoft.App/logicApps/${context.newSiteName}?api-version=2024-02-02-preview`;

  try {
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);

    const options = {
      headers: { authorization: accessToken },
      body: {
        type: 'Microsoft.App/logicApps',
        location: context._location.name,
      },
      uri: url,
    };

    const response = await axios.put(options.uri, options.body, {
      headers: options.headers,
    });
    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    throw new Error(`${localize('errorCreatingLogicAppExtension', 'Error in creating logic app extension')} - ${error.message}`);
  }
};
