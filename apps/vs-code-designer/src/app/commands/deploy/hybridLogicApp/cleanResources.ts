import axios from 'axios';
import { localize } from '../../../../localize';
import { getAuthorizationToken } from '../../../utils/codeless/getAuthorizationToken';
import { getAccountCredentials } from '../../../utils/credentials';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';
import { Platform } from '../../../../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../../workflows/switchDebugMode/switchDebugMode';
import { guid } from '@microsoft/logic-apps-shared';
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

export const deleteSMBFolder = async (context: IActionContext, node: SlotTreeItem) => {
  try {
    const workspaceFolder = await getWorkspaceFolderPath(context);
    const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
    await fse.mkdir(path.join(projectPath, `${node.site.siteName}-${guid()}`));
  } catch (error) {
    console.error(`Error deploying to file share: ${error.message}`);
  }
};

export const unMountSMB = async (hostName: string) => {
  let mountCommand: string;
  if (process.platform === Platform.windows) {
    mountCommand = `net use ${hostName} /delete`;
  } else {
    mountCommand = `umount -f /mnt//${hostName}`;
  }
  await executeCommand(undefined, undefined, mountCommand);
};
