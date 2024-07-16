import type { IActionContext } from "@microsoft/vscode-azext-utils";
import type { SlotTreeItem } from "../../../tree/slotsTree/SlotTreeItem";
import { getAccountCredentials } from "../../../utils/credentials";
import type { ServiceClientCredentials } from "@azure/ms-rest-js";
import { getAuthorizationToken } from "../../../utils/codeless/getAuthorizationToken";
import axios from "axios";
import { appKindSetting, extensionVersionKey, localSettingsFileName, logicAppKind, sqlStorageConnectionStringKey } from "../../../../constants";
import { isSuccessResponse } from "@microsoft/vscode-extension-logic-apps";
import { localize } from "../../../../localize";
import { getWorkspaceFolder } from "../../../utils/workspace";
import { getLocalSettingsJson } from "../../../utils/appSettings/localSettings";
import { tryGetLogicAppProjectRoot } from "../../../utils/verifyIsProject";
import path from "path";

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
export const createHybridAppSMB = async (context: IActionContext, node: SlotTreeItem, smbFolderName: string, mountDrive:string) => {

    const defaultAppSettings = [
        {
          name: sqlStorageConnectionStringKey,
          value: node.sqlConnectionString,
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
        location: node.location,
        extendedLocation: node.connectedEnvironment.extendedLocation,
        properties: {
          environmentId: node.connectedEnvironment.id,
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
                storageName: smbFolderName,
              },
            ],
          },
        },
      };
    
      const url = `https://management.azure.com/subscriptions/${node.subscription.subscriptionId}/resourceGroups/${node.resourceGroupName}/providers/Microsoft.App/containerApps/${node.hybridSite.name}?api-version=2024-02-02-preview`;
    
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