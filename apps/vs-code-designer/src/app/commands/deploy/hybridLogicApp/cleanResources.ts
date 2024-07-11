import axios from 'axios';
import { localize } from '../../../../localize';
import { getAuthorizationToken } from '../../../utils/codeless/getAuthorizationToken';
import { getAccountCredentials } from '../../../utils/credentials';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';

/**
 * Creates a hybrid app using the provided context.
 * @param context - The context object containing the necessary information for creating the hybrid app.
 * @returns A Promise that resolves when the hybrid app is created.
 */
export const cleanSMB = async (context: IActionContext, node: SlotTreeItem): Promise<void> => {
  const url = `https://management.azure.com/subscriptions/${node.subscription.subscriptionId}/resourceGroups/${node.site.resourceGroup}/providers/Microsoft.App/connectedEnvironments/${node.connectedEnvironment.name}/storages/${node.site.siteName}?api-version=2024-02-02-preview`;
  try {
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);

    const options = {
      headers: { authorization: accessToken },
      uri: url,
    };

    const response = await axios.delete(options.uri, {
      headers: options.headers,
    });
    console.log(response.data);
  } catch (error) {
    throw new Error(`${localize('errorCleaningSMB', 'Error in cleaning SMB')} - ${error.message}`);
  }
};
