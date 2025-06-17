import * as fse from 'fs-extra';
import * as path from 'path';
import { executeCommandWithSanityLogging } from '../../../utils/funcCoreTools/cpUtils';
import { localize } from '../../../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../../extensionVariables';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../../workflows/switchDebugMode/switchDebugMode';
import type { File } from '../../../utils/codeless/common';
import { getArtifactsPathInLocalProject, getWorkflowsPathInLocalProject } from '../../../utils/codeless/common';
import {
  artifactsDirectory,
  connectionsFileName,
  hostFileName,
  libDirectory,
  localSettingsFileName,
  mapsDirectory,
  parametersFileName,
  Platform,
  rulesDirectory,
  schemasDirectory,
  workflowFileName,
} from '../../../../constants';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';

export const connectToSMB = async (context: IActionContext, node: SlotTreeItem, smbFolderName: string, mountDrive: string) => {
  const message: string = localize('connectingToMSB', 'Connecting to logic app SMB storage...');
  ext.outputChannel.appendLog(message);

  try {
    const workspaceFolder = await getWorkspaceFolderPath(context);
    const { hostName, path: fileSharePath, userName, password } = node.fileShare || {};
    await mountSMB(hostName, fileSharePath, userName, password, mountDrive);
    const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
    const smbFolderPath = path.join(mountDrive, smbFolderName);
    await fse.ensureDir(smbFolderPath);
    await uploadRootFiles(projectPath, smbFolderPath);
    await uploadWorkflowsFiles(projectPath, smbFolderPath);
    await uploadArtifactsFiles(projectPath, smbFolderPath);
    await uploadLibFolderFiles(projectPath, smbFolderPath);
  } catch (error) {
    throw new Error(`Error uploading files to SMB: ${error.message}`);
  }
};

const mountSMB = async (hostName: string, fileSharePath: string, userName: string, password: string, mountDrive: string) => {
  let mountCommand: string;
  let sanitizedCommandForLogging: string;
  if (process.platform === Platform.windows) {
    mountCommand = `net use ${mountDrive} \\\\${hostName}\\${fileSharePath} ${password} /user:${userName}`;
    sanitizedCommandForLogging = `net use ${mountDrive} \\\\${hostName}\\${fileSharePath} /user:${userName}`;
  } else if (process.platform === Platform.mac) {
    mountCommand = `open smb://${userName}:${password}@${hostName}/${fileSharePath}`;
    sanitizedCommandForLogging = `open smb://${userName}@${hostName}/${fileSharePath}`;
  } else {
    mountCommand = `mount -t cifs //${hostName}/${fileSharePath} /mnt/test -o username=${userName},password=${password},dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30`;
    sanitizedCommandForLogging = `mount -t cifs //${hostName}/${fileSharePath} /mnt/test -o username=${userName},dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30`;
  }
  await executeCommandWithSanityLogging(undefined, undefined, sanitizedCommandForLogging, mountCommand);
};

const uploadFiles = async (files: File[], smbFolderPath: string) => {
  for (const file of files) {
    await fse.copy(file.path, path.join(smbFolderPath, file.name), { overwrite: true });
  }
};

const uploadRootFiles = async (projectPath: string | undefined, smbFolderPath: string) => {
  const hostJsonPath: string = path.join(projectPath, hostFileName);
  const parametersJsonPath: string = path.join(projectPath, parametersFileName);
  const connectionsJsonPath: string = path.join(projectPath, connectionsFileName);
  const localSettinsJsonPath: string = path.join(projectPath, localSettingsFileName);
  const rootFiles = [
    { path: hostJsonPath, name: hostFileName },
    { path: parametersJsonPath, name: parametersFileName },
    { path: connectionsJsonPath, name: connectionsFileName },
    { path: localSettinsJsonPath, name: localSettingsFileName },
  ];
  for (const rootFile of rootFiles) {
    if (await fse.pathExists(rootFile.path)) {
      await uploadFiles([{ path: rootFile.path, name: rootFile.name }], smbFolderPath);
    }
  }
};

const uploadWorkflowsFiles = async (projectPath: string | undefined, smbFolderPath: string) => {
  const workflowFiles = await getWorkflowsPathInLocalProject(projectPath);
  for (const workflowFile of workflowFiles) {
    await uploadFiles([{ ...workflowFile, name: path.join(workflowFile.name, workflowFileName) }], smbFolderPath);
  }
};

const uploadArtifactsFiles = async (projectPath: string | undefined, smbFolderPath: string) => {
  const artifactsFiles = await getArtifactsPathInLocalProject(projectPath);

  if (artifactsFiles.maps.length > 0) {
    await uploadFiles(artifactsFiles.maps, path.join(smbFolderPath, artifactsDirectory, mapsDirectory));
  }

  if (artifactsFiles.schemas.length > 0) {
    await uploadFiles(artifactsFiles.schemas, path.join(smbFolderPath, artifactsDirectory, schemasDirectory));
  }

  if (artifactsFiles.rules.length > 0) {
    await uploadFiles(artifactsFiles.rules, path.join(smbFolderPath, artifactsDirectory, rulesDirectory));
  }
};

const uploadLibFolderFiles = async (projectPath: string, smbFolderPath: string) => {
  const libFolderPath = path.join(projectPath, libDirectory);
  const remoteFolderPath = path.join(smbFolderPath, libDirectory);

  if (await fse.pathExists(libFolderPath)) {
    await fse.copy(libFolderPath, remoteFolderPath, { overwrite: true });
  }
};
