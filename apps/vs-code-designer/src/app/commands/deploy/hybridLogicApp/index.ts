import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { localize } from '../../../../localize';
import { connectToSMB } from './connectToSMB';
import { cleanSMB, deleteSMBFolder, unMountSMB } from './cleanResources';
import { getRandomHexString } from '../../../utils/fs';
import { createOrUpdateHybridApp } from '../../../utils/codeless/hybridLogicApp/hybridApp';
import { updateSMBConnectedEnvironment } from '../../../utils/codeless/hybridLogicApp/connectedEnvironment';
import path from 'path';
import { getAuthorizationToken } from '../../../utils/codeless/getAuthorizationToken';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import { azurePublicBaseUrl, driveLetterSMBSetting, hybridAppApiVersion } from '../../../../constants';
import axios from 'axios';
import { isSuccessResponse } from '@microsoft/vscode-extension-logic-apps';

export const deployHybridLogicApp = async (context: IActionContext, node: SlotTreeItem) => {
  const mountDrive: string = getWorkspaceSetting<string>(driveLetterSMBSetting);

  try {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: localize('deployingHibridLogicApp', 'Deploying hybrid logic app'),
        cancellable: true,
      },
      async (progress) => {
        context.telemetry.properties.lastStep = 'connectToSMB';

        const newSmbFolderName = `${node.hybridSite.name}-${getRandomHexString(32 - node.hybridSite.name.length - 1)}`.toLowerCase();

        const accessToken = await getAuthorizationToken();

        progress.report({ increment: 16, message: 'Connecting to SMB and uploading files' });

        if (!node.fileShare) {
          await getSMBDetails(context, node);
        }

        const smbPathParts = node.fileShare.path.split(path.sep);
        const currentSmbFolder = smbPathParts.length === 2 ? smbPathParts[1] : null;
        node.fileShare.path = smbPathParts[0];

        await connectToSMB(context, node, newSmbFolderName, mountDrive);

        progress.report({
          increment: 16,
          message: 'Update SMB to connected environment',
        });

        await updateSMBConnectedEnvironment(
          accessToken,
          node.subscription.subscriptionId,
          node.connectedEnvironment?.id ?? node.hybridSite.environmentId,
          newSmbFolderName,
          {
            ...node.fileShare,
            path: path.join(node.fileShare.path, newSmbFolderName),
          }
        );

        progress.report({ increment: 16, message: 'Updating hybrid logic app' });
        const hybridAppOptions = {
          sqlConnectionString: node.sqlConnectionString,
          location: node.location,
          connectedEnvironment: node.connectedEnvironment,
          storageName: newSmbFolderName,
          subscriptionId: node.subscription.subscriptionId,
          resourceGroup: node.resourceGroupName ?? node.hybridSite.id.split('/')[4],
          siteName: node.hybridSite.name,
          hybridApp: node.hybridSite,
        };
        await createOrUpdateHybridApp(context, accessToken, hybridAppOptions);

        if (currentSmbFolder) {
          progress.report({ increment: 16, message: 'Cleaning up previous resources' });
          await cleanSMB(node.hybridSite.environmentId, currentSmbFolder, accessToken);
          await deleteSMBFolder(mountDrive, currentSmbFolder);
        }

        progress.report({ increment: 20, message: 'Unmounting SMB' });
      }
    );
  } catch (error) {
    throw new Error(`${localize('errorDeployingHybridLogicApp', 'Error deploying hybrid logic app')} - ${error.message}`);
  } finally {
    await unMountSMB(mountDrive);
  }
};

const getSMBDetails = async (context: IActionContext, node: SlotTreeItem) => {
  const smbError = new Error(
    localize('errorDeployingHybridLogicApp', `The logic app ${node.hybridSite.name} is not configured to use SMB`)
  );
  try {
    const volumeMount = node.hybridSite.template.containers[0]?.volumeMounts?.find((v) => v.mountPath === '/home/site/wwwroot');
    const smbVolume = node.hybridSite.template.volumes.find((v) => v.name === volumeMount.volumeName);

    if (smbVolume.storageType !== 'Smb') {
      context.telemetry.properties.smbConfig = 'false';
      throw smbError;
    }
    context.telemetry.properties.smbConfig = 'true';
    await getStorageInfoForConnectedEnv(node.hybridSite.environmentId, smbVolume.storageName, context, node);
  } catch (error) {
    context.telemetry.properties.smbError = error instanceof Error ? error.message : error;
    context.telemetry.properties.smbConfig = 'false';
    throw smbError;
  }
};

const getStorageInfoForConnectedEnv = async (connectedEnvId: string, storageName: string, context: IActionContext, node: SlotTreeItem) => {
  const accessToken = await getAuthorizationToken();

  const url = `${azurePublicBaseUrl}/${connectedEnvId}/storages/${storageName}?api-version=${hybridAppApiVersion}`;

  try {
    const response = await axios.get(url, { headers: { authorization: accessToken } });

    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }

    node.fileShare = {
      hostName: response.data?.properties?.smb?.host,
      path: response.data?.properties?.smb?.shareName,
    };
    const fileSharePath = `${path.sep}${path.sep}${node.fileShare.hostName}${path.sep}${node.fileShare.path.split(path.sep)[0]}`;
    node.fileShare.userName = await context.ui.showInputBox({
      placeHolder: localize('userNameFileShare', `User name for ${fileSharePath}`),
      prompt: localize('userNamePrompt', 'Provide the user name for SMB authentication.'),
      validateInput: async (input: string): Promise<string | undefined> => await validateUserName(input),
    });

    node.fileShare.password = await context.ui.showInputBox({
      placeHolder: localize('passwordFileShare', `Password for ${fileSharePath}`),
      prompt: localize('passwordPrompt', 'Provide the password for SMB authentication.'),
      password: true,
      validateInput: async (input: string): Promise<string | undefined> => await validatePassword(input),
    });
  } catch (error) {
    throw new Error(`${localize('errorGettingSMBDetails', 'Error fetching SMB details')} - ${error.message}`);
  }
};

const validateUserName = async (userName: string | undefined): Promise<string | undefined> => {
  if (!userName) {
    return localize('emptyUserNameError', 'The user name cannot be empty.');
  }
};

const validatePassword = async (password: string | undefined): Promise<string | undefined> => {
  if (!password) {
    return localize('emptyPasswordError', 'The password cannot be empty.');
  }
};
