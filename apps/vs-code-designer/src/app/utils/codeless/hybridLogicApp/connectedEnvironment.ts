import { type FileShare, isSuccessResponse } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import { localize } from '../../../../localize';
import type { ConnectedEnvironment } from '@azure/arm-appcontainers';

export const updateSMBConnectedEnvironment = async (
  accessToken: string,
  subscriptionId: string,
  connectedEnvironment: ConnectedEnvironment,
  siteName: string,
  fileShare: FileShare
) => {
  const resourceGroup = connectedEnvironment.id.split('/')[4];

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/connectedEnvironments/${connectedEnvironment.name}/storages/${siteName}?api-version=2024-02-02-preview`;

  try {
    const options = {
      headers: { authorization: accessToken },
      body: {
        properties: {
          smb: {
            host: fileShare.hostName,
            shareName: fileShare.path,
            password: fileShare.password,
            username: fileShare.userName,
            accessMode: 'ReadWrite',
          },
        },
      },
      uri: url,
    };

    const response = await axios.put(options.uri, options.body, { headers: options.headers });
    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    throw new Error(`${localize('errorConnectingSMB', 'Error in connecting smb environment')} - ${error.message}`);
  }
};
