import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { getAuthorizationToken } from './getAuthorizationToken';
import axios from 'axios';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { getAccountCredentials } from '../credentials';

export const createContainerApp = async (context: ILogicAppWizardContext): Promise<void> => {
  const containerAppPayload = {
    type: 'Microsoft.App/containerApps',
    kind: 'workflowapp',
    location: 'northcentralusstage',
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
            env: [
              {
                name: 'AzureWebJobsStorage',
                secretRef: 'azurewebjobsstorage',
              },
              {
                name: 'WEBSITE_AUTH_ENCRYPTION_KEY',
                value: 'EE338799B4FE869B149200B9D62B23B3A3C24BCFE222AC62D611242AA1AACB6F', //TODO: generate new
              },
              {
                name: 'APP_KIND',
                value: 'workflowApp',
              },
              {
                name: 'FUNCTIONS_EXTENSION_VERSION',
                value: '~4',
              },
              {
                name: 'AzureFunctionsJobHost__extensionBundle__id',
                value: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
              },
            ],
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

  const url = `https://management.azure.com/subscriptions/${context.subscriptionId}/resourceGroups/${context.resourceGroup}/providers/Microsoft.App/containerApps/${context.newSiteName}?api-version=2024-02-02-preview`;

  try {
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);
    //const response = await sendAzureRequest(url, context, HTTP_METHODS.PUT);

    const options = {
      headers: { authorization: accessToken },
      body: containerAppPayload,
      uri: url,
    };

    const response = await axios.put(options.uri, options.body, {
      headers: options.headers,
    });

    console.log(response);
  } catch (error) {
    throw new Error(`Error in getting connection - ${error.message}`);
  }
};
