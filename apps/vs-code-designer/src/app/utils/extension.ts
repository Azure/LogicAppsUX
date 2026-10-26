/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionContext, logicAppsStandardExtensionId } from '../../constants';
import * as vscode from 'vscode';
import {
  supportedDataMapDefinitionFileExts,
  supportedDataMapperFolders,
  supportedSchemaFileExts,
} from '../commands/dataMapper/extensionConfig';
import { getWorkspaceCustomCodeFunctionsProjectRoots, getWorkspaceFolderWithoutPrompting } from './workspace';
import { isLogicAppProjectInRoot } from './verifyIsProject';
import { getEligibleLogicAppFoldersForCustomCode } from './customCodeUtils';

/**
 * Gets extension version from the package.json version.
 * @returns {string} Extension version.
 */
export const getExtensionVersion = (): string => {
  const extension = vscode.extensions.getExtension(logicAppsStandardExtensionId);

  if (extension) {
    const { packageJSON } = extension;

    if (packageJSON) {
      const version = packageJSON.version;
      return version;
    }
  }

  return '';
};

export const initializeCustomExtensionContext = () => {
  // Data Mapper context
  vscode.commands.executeCommand('setContext', extensionContext.dataMapSupportedDataMapDefinitionFileExts, supportedDataMapDefinitionFileExts);
  vscode.commands.executeCommand('setContext', extensionContext.dataMapSupportedSchemaFileExts, supportedSchemaFileExts);
  vscode.commands.executeCommand('setContext', extensionContext.dataMapSupportedFileExts, [...supportedDataMapDefinitionFileExts, ...supportedSchemaFileExts]);
  vscode.commands.executeCommand('setContext', extensionContext.dataMapDmFolders, supportedDataMapperFolders);
};

export async function updateLogicAppsContext() {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    await vscode.commands.executeCommand('setContext', extensionContext.hasProject, false);
  } else {
    const workspaceFolder = await getWorkspaceFolderWithoutPrompting();
    const logicAppOpened = await isLogicAppProjectInRoot(workspaceFolder);
    await vscode.commands.executeCommand('setContext', extensionContext.hasProject, logicAppOpened);
    await vscode.commands.executeCommand('setContext', extensionContext.customCodeFunctionsFolders, await getWorkspaceCustomCodeFunctionsProjectRoots());
    await vscode.commands.executeCommand('setContext', extensionContext.customCodeEligibleLogicAppFolders, await getEligibleLogicAppFoldersForCustomCode());
  }
}
