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
import { getCustomCodeRoots, getLogicAppRoots } from './workspace';
import { getEligibleLogicAppFoldersForCustomCode } from './customCodeUtils';
import { isCodefulLogicApp } from './codeful';

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

export async function updateLogicAppsContext(projectPaths?: string[]) {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    await vscode.commands.executeCommand('setContext', extensionContext.hasProject, false);
    await vscode.commands.executeCommand('setContext', extensionContext.logicAppProjectPaths, []);
  } else {
    projectPaths ??= await getLogicAppRoots();
    const hasLogicApp = projectPaths.length > 0;
    const isCodefulPromises = projectPaths.map(isCodefulLogicApp);
    const isCodeful = (await Promise.all(isCodefulPromises)).some(Boolean);
    await vscode.commands.executeCommand('setContext', extensionContext.hasProject, hasLogicApp);
    await vscode.commands.executeCommand('setContext', extensionContext.isCodeful, isCodeful);
    await vscode.commands.executeCommand('setContext', extensionContext.logicAppProjectPaths, projectPaths);
    await vscode.commands.executeCommand('setContext', extensionContext.customCodeFunctionsFolders, await getCustomCodeRoots());
    await vscode.commands.executeCommand('setContext', extensionContext.customCodeEligibleLogicAppFolders, await getEligibleLogicAppFoldersForCustomCode());
  }
}
