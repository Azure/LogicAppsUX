import * as fse from 'fs-extra';
import * as path from 'path';
import { ProgressLocation, window } from 'vscode';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { localize } from '../../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../workflows/switchDebugMode/switchDebugMode';
import type { File } from '../../utils/codeless/common';
import { getWorkflowsPathInLocalProject } from '../../utils/codeless/common';
import { artifactsDirectory, connectionsFileName, hostFileName, parametersFileName, workflowFileName } from '../../../constants';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';

export const deployToFileShare = async (context: IActionContext, node: SlotTreeItem) => {
  await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    const message: string = localize('uploadingFileShare', 'Uploading files to logic app SMB storage...');
    ext.outputChannel.appendLog(message);
    progress.report({ message });

    try {
      const workspaceFolder = await getWorkspaceFolderPath(context);
      const { hostName, path: fileSharePath, userName, password } = node.fileShare || {};

      const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
      await executeCommand(undefined, undefined, `net use ${hostName}/${fileSharePath} ${password} /user:${userName}`);
      await uploadRootFiles(projectPath);
      await uploadWorkflowsFiles(projectPath);
      await uploadArtifactFiles(projectPath);
    } catch (error) {
      console.error(`Error deploying to file share: ${error.message}`);
    } finally {
      await executeCommand(undefined, undefined, 'net use X: /delete');
    }
  });
};

const uploadFiles = async (files: File[]) => {
  for (const file of files) {
    try {
      await fse.copy(file.path, `X:\\${file.name}`, { overwrite: true });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
};

const uploadRootFiles = async (projectPath: string | undefined) => {
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
      await uploadFiles([{ path: rootFile.path, name: rootFile.name }]);
    }
  }
};

const uploadWorkflowsFiles = async (projectPath: string | undefined) => {
  const workflowFiles = await getWorkflowsPathInLocalProject(projectPath);
  for (const workflowFile of workflowFiles) {
    await uploadFiles([{ ...workflowFile, name: `${workflowFile.name}\\${workflowFileName}` }]);
  }
};

const uploadArtifactFiles = async (projectPath: string | undefined) => {
  try {
    const artifactsPath = path.join(projectPath, artifactsDirectory);
    await fse.copy(artifactsPath, `X:\\${artifactsDirectory}`);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
