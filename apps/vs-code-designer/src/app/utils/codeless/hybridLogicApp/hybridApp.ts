import { isSuccessResponse, type ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import { getLocalSettingsJson } from '../../appSettings/localSettings';
import { tryGetLogicAppProjectRoot } from '../../verifyIsProject';
import path from 'path';
import {
  appKindSetting,
  azurePublicBaseUrl,
  azureWebJobsStorageKey,
  extensionVersionKey,
  hybridAppApiVersion,
  localSettingsFileName,
  logicAppKind,
  sqlConnectionStringSecretName,
  sqlStorageConnectionStringKey,
} from '../../../../constants';
import { localize } from '../../../../localize';
import { getWorkspaceFolder } from '../../workspace';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ConnectedEnvironment, ContainerApp, EnvironmentVar } from '@azure/arm-appcontainers';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';

interface createHybridAppOptions {
  sqlConnectionString: string;
  location: string;
  connectedEnvironment: ConnectedEnvironment;
  storageName: string;
  subscriptionId: string;
  resourceGroup: string;
  siteName: string;
  hybridApp?: ContainerApp;
}

const getAppSettingsFromLocal = async (context): Promise<EnvironmentVar[]> => {
  const appSettingsToskip = [azureWebJobsStorageKey, 'ProjectDirectoryPath', 'FUNCTIONS_WORKER_RUNTIME'];
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

export const createOrUpdateHybridApp = async (context: IActionContext, accessToken: string, options: createHybridAppOptions) => {
  const { sqlConnectionString, location, connectedEnvironment, storageName, subscriptionId, resourceGroup, siteName, hybridApp } = options;

  const sqlConnectionappSetting = hybridApp
    ? hybridApp.template.containers[0].env.find((e) => e.name === sqlStorageConnectionStringKey)
    : {
        name: sqlStorageConnectionStringKey,
        secretRef: sqlConnectionStringSecretName,
      };

  const defaultAppSettings = [
    sqlConnectionappSetting,
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
  const templatePayload = {
    containers: [
      {
        image: 'mcr.microsoft.com/azurelogicapps/logicapps-base:latest',
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
        storageName: storageName,
      },
    ],
  };

  const containerAppPayload = hybridApp
    ? {
        type: 'Microsoft.App/containerApps',
        kind: logicAppKind,
        location: location,
        extendedLocation: hybridApp.extendedLocation,
        properties: {
          environmentId: hybridApp.environmentId,
          template: templatePayload,
        },
      }
    : {
        type: 'Microsoft.App/containerApps',
        kind: logicAppKind,
        location: location,
        extendedLocation: connectedEnvironment.extendedLocation,
        properties: {
          environmentId: connectedEnvironment.id,
          configuration: {
            secrets: [
              {
                name: sqlConnectionStringSecretName,
                value: sqlConnectionString,
              },
            ],
            activeRevisionsMode: 'Single',
            ingress: {
              external: true,
              targetPort: 80,
              allowInsecure: true,
            },
          },
          template: templatePayload,
        },
      };

  const url = `${azurePublicBaseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/containerApps/${siteName}?api-version=${hybridAppApiVersion}`;

  try {
    const method = hybridApp ? HTTP_METHODS.PATCH : HTTP_METHODS.PUT;
    const response = await axios({
      method,
      url,
      headers: { authorization: accessToken },
      data: containerAppPayload,
    });

    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }
    return {
      ...response.data?.properties,
      name: siteName,
      type: 'Microsoft.App/containerApps',
    };
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
export const createLogicAppExtension = async (context: ILogicAppWizardContext, accessToken: string) => {
  const url = `${azurePublicBaseUrl}/subscriptions/${context.subscriptionId}/resourceGroups/${context.resourceGroup.name}/providers/Microsoft.App/containerApps/${context.newSiteName}/providers/Microsoft.App/logicApps/${context.newSiteName}?api-version=${hybridAppApiVersion}`;

  try {
    const response = await axios.put(
      url,
      {
        type: 'Microsoft.App/logicApps',
        location: context._location.name,
      },
      {
        headers: { authorization: accessToken },
      }
    );
    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    throw new Error(`${localize('errorCreatingLogicAppExtension', 'Error in creating logic app extension')} - ${error.message}`);
  }
};
