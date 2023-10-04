/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  artifactsDirectory,
  connectionsFileName,
  DirectoryKind,
  hostFileName,
  mapsDirectory,
  parametersFileName,
  schemasDirectory,
  WEBSITE_CONTENTAZUREFILECONNECTIONSTRING,
  WebsiteContentShare,
  workflowFileName,
  wwwrootDirectory,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getArtifactsPathInLocalProject, getWorkflowsPathInLocalProject, type File } from '../../utils/codeless/common';
import { tryGetFunctionProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../workflows/switchDebugMode/switchDebugMode';
import type { StringDictionary } from '@azure/arm-appservice';
import { type ShareClient, ShareServiceClient } from '@azure/storage-file-share';
import type { ShareDirectoryClient } from '@azure/storage-file-share';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { type IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { ProgressLocation, window } from 'vscode';

export const deployToFileShare = async (context: IActionContext, site: ParsedSite) => {
  await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    const logicAppClient = await site.createClient(context);
    const appSettings: StringDictionary = await logicAppClient.listApplicationSettings();
    const shareName = appSettings.properties[WebsiteContentShare];
    const connectionString = appSettings.properties[WEBSITE_CONTENTAZUREFILECONNECTIONSTRING] ?? '';

    const message: string = localize('uploadingFileShare', 'Uploading files to File Share "{0}"...', shareName);
    ext.outputChannel.appendLog(message);
    progress.report({ message });

    const storageShareClient = await createStorageShareClient(connectionString);
    const shareClient = storageShareClient.getShareClient(shareName);

    if (await shareClient.exists()) {
      const workspaceFolder = await getWorkspaceFolderPath(context);
      const projectPath: string | undefined = await tryGetFunctionProjectRoot(context, workspaceFolder, true /* suppressPrompt */);

      const directoryClient = shareClient.getDirectoryClient(wwwrootDirectory);
      if (await directoryClient.exists()) {
        await deleteFilesAndSubdirectories(directoryClient);
        await directoryClient.delete();
      }

      await shareClient.createDirectory(wwwrootDirectory);

      await uploadRootFiles(shareClient, projectPath);
      await uploadWorkflowsFiles(shareClient, projectPath);
      await uploadeArtifactsFiles(shareClient, projectPath);
    }
  });
};

const createStorageShareClient = async (connectionString: string): Promise<ShareServiceClient> => {
  return ShareServiceClient.fromConnectionString(connectionString);
};

const createDirectories = async (shareClient: ShareClient, directories: string[]) => {
  for (const directory of directories) {
    const directoryClient = shareClient.getDirectoryClient(directory);
    await directoryClient.createIfNotExists();
  }
};

const uploadFiles = async (shareClient: ShareClient, files: File[], directoryPath: string) => {
  for (const file of files) {
    const directoryClient = shareClient.getDirectoryClient(directoryPath);
    const fileClient = directoryClient.getFileClient(file.name);
    await fileClient.uploadFile(file.path);
  }
};

const uploadRootFiles = async (shareClient: ShareClient, projectPath: string | undefined) => {
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
      await uploadFiles(shareClient, [{ path: rootFile.path, name: rootFile.name }], wwwrootDirectory);
    }
  }
};

const uploadWorkflowsFiles = async (shareClient: ShareClient, projectPath: string | undefined) => {
  const workflowFiles = await getWorkflowsPathInLocalProject(projectPath);
  for (const workflowFile of workflowFiles) {
    const directoryPath = path.join(wwwrootDirectory, workflowFile.name);
    await createDirectories(shareClient, [directoryPath]);
    await uploadFiles(shareClient, [{ ...workflowFile, name: workflowFileName }], directoryPath);
  }
};

const uploadeArtifactsFiles = async (shareClient: ShareClient, projectPath: string | undefined) => {
  const artifactsFiles = await getArtifactsPathInLocalProject(projectPath);
  const artifactsPathShare = path.join(wwwrootDirectory, artifactsDirectory);
  await createDirectories(shareClient, [artifactsPathShare]);

  if (artifactsFiles.maps.length > 0) {
    const directoryPath = path.join(wwwrootDirectory, artifactsDirectory, mapsDirectory);
    await createDirectories(shareClient, [directoryPath]);
    await uploadFiles(shareClient, artifactsFiles.maps, directoryPath);
  }

  if (artifactsFiles.schemas.length > 0) {
    const directoryPath = path.join(wwwrootDirectory, artifactsDirectory, schemasDirectory);
    await createDirectories(shareClient, [directoryPath]);
    await uploadFiles(shareClient, artifactsFiles.schemas, directoryPath);
  }
};

const deleteFilesAndSubdirectories = async (directoryClient: ShareDirectoryClient) => {
  try {
    const filesAndDirectories = directoryClient.listFilesAndDirectories();
    for await (const fileOrDirectory of filesAndDirectories) {
      if (fileOrDirectory.kind === DirectoryKind.directory) {
        const subDirectoryClient = directoryClient.getDirectoryClient(fileOrDirectory.name);
        await deleteFilesAndSubdirectories(subDirectoryClient);
        subDirectoryClient.delete();
      } else if (fileOrDirectory.kind === DirectoryKind.file) {
        const fileClient = directoryClient.getFileClient(fileOrDirectory.name);
        await fileClient.delete();
      }
    }
  } catch (error) {
    console.error(`Error deleting files and subdirectories from file share: ${error.message}`);
  }
};
