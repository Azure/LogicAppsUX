import * as fse from 'fs-extra';
import * as path from 'path';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';
import { localize } from '../../../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../../extensionVariables';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../../workflows/switchDebugMode/switchDebugMode';
import type { File } from '../../../utils/codeless/common';
import { getArtifactsPathInLocalProject, getWorkflowsPathInLocalProject } from '../../../utils/codeless/common';
import { connectionsFileName, hostFileName, parametersFileName, Platform, workflowFileName } from '../../../../constants';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { guid } from '@microsoft/logic-apps-shared';

export const connectToSMB = async (context: IActionContext, node: SlotTreeItem) => {
  const message: string = localize('connectingToMSB', 'Connecting to logic app SMB storage...');
  ext.outputChannel.appendLog(message);

  try {
    const workspaceFolder = await getWorkspaceFolderPath(context);
    const { hostName, path: fileSharePath, userName, password } = node.fileShare || {};
    await mountSMB(hostName, fileSharePath, userName, password);
    const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
    const smbFoldername = `${node.hybridSite.name}-${guid()}`;
    await fse.mkdir(path.join(projectPath, smbFoldername));
    await uploadRootFiles(projectPath, hostName, fileSharePath);
    await uploadWorkflowsFiles(projectPath, hostName, fileSharePath);
    await uploadArtifactsFiles(projectPath, hostName, fileSharePath);
  } catch (error) {
    console.error(`Error deploying to file share: ${error.message}`);
  }
};

const mountSMB = async (hostName: string, fileSharePath: string, userName: string, password: string) => {
  let mountCommand: string;
  if (process.platform === Platform.windows) {
    mountCommand = `net use ${hostName}/${fileSharePath} ${password} /user:${userName}`;
  } else if (process.platform === Platform.mac) {
    mountCommand = `open smb://${userName}:${password}@${hostName}/${fileSharePath}`;
  } else {
    mountCommand = `mount -t cifs //${hostName}/${fileSharePath} /mnt/test -o username=${userName},password=${password},dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30`;
  }
  await executeCommand(undefined, undefined, mountCommand);
};

const uploadFiles = async (files: File[], hostName: string, fileSharePath: string) => {
  for (const file of files) {
    await fse.copy(file.path, `${hostName}/${fileSharePath}`, { overwrite: true });
  }
};

const uploadRootFiles = async (projectPath: string | undefined, hostName: string, fileSharePath: string) => {
  const hostJsonPath: string = path.join(projectPath, hostFileName);
  const parametersJsonPath: string = path.join(projectPath, parametersFileName);
  const connectionsJsonPath: string = path.join(projectPath, connectionsFileName);
  const rootFiles = [
    { path: hostJsonPath, name: hostFileName },
    { path: parametersJsonPath, name: parametersFileName },
    { path: connectionsJsonPath, name: connectionsFileName },
  ];
  for (const rootFile of rootFiles) {
    if (await fse.pathExists(rootFile.path)) {
      await uploadFiles([{ path: rootFile.path, name: rootFile.name }], hostName, fileSharePath);
    }
  }
};

const uploadWorkflowsFiles = async (projectPath: string | undefined, hostName: string, fileSharePath: string) => {
  const workflowFiles = await getWorkflowsPathInLocalProject(projectPath);
  for (const workflowFile of workflowFiles) {
    await uploadFiles([{ ...workflowFile, name: workflowFileName }], hostName, fileSharePath);
  }
};

const uploadArtifactsFiles = async (projectPath: string | undefined, hostName: string, fileSharePath: string) => {
  const artifactsFiles = await getArtifactsPathInLocalProject(projectPath);

  if (artifactsFiles.maps.length > 0) {
    await uploadFiles(artifactsFiles.maps, hostName, fileSharePath);
  }

  if (artifactsFiles.schemas.length > 0) {
    await uploadFiles(artifactsFiles.schemas, hostName, fileSharePath);
  }
};
