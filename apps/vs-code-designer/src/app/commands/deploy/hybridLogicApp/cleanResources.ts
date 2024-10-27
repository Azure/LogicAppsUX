import axios from 'axios';
import { localize } from '../../../../localize';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';
import { azurePublicBaseUrl, Platform } from '../../../../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import { isSuccessResponse } from '@microsoft/vscode-extension-logic-apps';
/**
 * Creates a hybrid app using the provided context.
 * @param context - The context object containing the necessary information for creating the hybrid app.
 * @returns A Promise that resolves when the hybrid app is created.
 */
export const cleanSMB = async (connectedEnvironmentId: string, storageName: string, accessToken: string): Promise<void> => {
  const url = `${azurePublicBaseUrl}/${connectedEnvironmentId}/storages/${storageName}?api-version=2024-02-02-preview`;
  try {
    const response = await axios.delete(url, {
      headers: { authorization: accessToken },
    });

    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    console.error(`${localize('errorCleaningSMB', 'Error in deleting  SMB storage in connected environment')} - ${error.message}`);
  }
};

export const deleteSMBFolder = async (mountDrive: string, smbFolderName: string) => {
  try {
    const smbFolderPath = path.join(mountDrive, smbFolderName);

    await fse.rmdir(smbFolderPath, { recursive: true });
  } catch (error) {
    console.error(`${localize('errorDeletingSMBFolder', 'Error deleting SMB folder')} - ${error.message}`);
  }
};

export const unMountSMB = async (mountDrive: string) => {
  let unMountCommand: string;

  try {
    if (process.platform === Platform.windows) {
      unMountCommand = `if exist ${mountDrive} net use ${mountDrive} /delete`;
    } else if (process.platform === Platform.mac) {
      unMountCommand = `umount -f /mnt//${mountDrive}`;
    } else {
      unMountCommand = `umount -f /mnt//${mountDrive}`;
    }
    await executeCommand(undefined, undefined, unMountCommand);
  } catch (error) {
    console.error(`${localize('errorUnmountingSMB', 'Error unmounting SMB')} - ${error.message}`);
  }
};
