import { type FileShare, isSuccessResponse } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import { localize } from '../../../../localize';
import { azurePublicBaseUrl } from '../../../../constants';

export const updateSMBConnectedEnvironment = async (
  accessToken: string,
  subscriptionId: string,
  connectedEnvironmentId: string,
  siteName: string,
  fileShare: FileShare
) => {
  const url = `${azurePublicBaseUrl}/${connectedEnvironmentId}/storages/${siteName}?api-version=2024-02-02-preview`;
  let domain: string = null;
  let username: string = null;
  if (fileShare.userName.includes('\\')) {
    username = fileShare.userName.split('\\')[1];
    domain = fileShare.userName.split('\\')[0];
  } else {
    username = fileShare.userName;
  }
  try {
    const options = {
      headers: { authorization: accessToken },
      body: {
        properties: {
          smb: {
            host: fileShare.hostName,
            shareName: fileShare.path,
            password: fileShare.password,
            username: username,
            domain: domain,
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
