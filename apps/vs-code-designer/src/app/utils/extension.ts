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
import { getWorkspaceCustomCodeFunctionsProjectRoots, getWorkspaceLogicAppRoots } from './workspace';
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

export const initializeCustomExtensionContext = (context?: vscode.ExtensionContext) => {
  // Data Mapper context
  vscode.commands.executeCommand(
    'setContext',
    extensionContext.dataMapSupportedDataMapDefinitionFileExts,
    supportedDataMapDefinitionFileExts
  );
  vscode.commands.executeCommand('setContext', extensionContext.dataMapSupportedSchemaFileExts, supportedSchemaFileExts);
  vscode.commands.executeCommand('setContext', extensionContext.dataMapSupportedFileExts, [
    ...supportedDataMapDefinitionFileExts,
    ...supportedSchemaFileExts,
  ]);
  vscode.commands.executeCommand('setContext', extensionContext.dataMapDmFolders, supportedDataMapperFolders);
  if (context) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/{workflow.json,*.csproj}');
    context.subscriptions.push(
      watcher,
      watcher.onDidCreate(updateLogicAppsContext),
      watcher.onDidChange(updateLogicAppsContext),
      watcher.onDidDelete(updateLogicAppsContext)
    );
  }
};

let projectContextRevision = 0;

export async function updateLogicAppsContext() {
  const revision = ++projectContextRevision;
  const [logicAppRoots, customCodeRoots, eligibleRoots] = vscode.workspace.workspaceFolders?.length
    ? await Promise.all([
        getWorkspaceLogicAppRoots(),
        getWorkspaceCustomCodeFunctionsProjectRoots(),
        getEligibleLogicAppFoldersForCustomCode(),
      ])
    : [[], [], []];
  if (revision !== projectContextRevision) {
    return;
  }
  await Promise.all([
    vscode.commands.executeCommand('setContext', extensionContext.hasProject, logicAppRoots.length > 0),
    vscode.commands.executeCommand('setContext', extensionContext.logicAppProjectFolders, [
      ...new Set(logicAppRoots.map((root) => vscode.Uri.file(root).fsPath)),
    ]),
    vscode.commands.executeCommand('setContext', extensionContext.customCodeFunctionsFolders, customCodeRoots),
    vscode.commands.executeCommand('setContext', extensionContext.customCodeEligibleLogicAppFolders, eligibleRoots),
  ]);
}
