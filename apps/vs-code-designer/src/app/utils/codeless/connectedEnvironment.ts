import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { getAuthorizationToken } from './getAuthorizationToken';
import axios from 'axios';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { getAccountCredentials } from '../credentials';

export const updateSMBConnectedEnvironment = async (context: ILogicAppWizardContext): Promise<void> => {
  const { connectedEnvironment, subscriptionId } = context;
  const resourceGroup = connectedEnvironment.id.split('/')[4];

  const storage = context.newSiteName;
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/connectedEnvironments/${connectedEnvironment.name}/storages/${storage}?api-version=2024-02-02-preview`;

  try {
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);

    const options = {
      headers: { authorization: accessToken },
      body: {
        properties: {
          smb: {
            host: context.fileShare.hostName,
            shareName: context.fileShare.path,
            password: context.fileShare.password,
            username: context.fileShare.userName,
            accessMode: 'ReadWrite',
          },
        },
      },
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
