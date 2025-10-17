/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, logicAppsStandardExtensionId } from '../../constants';
import * as vscode from 'vscode';
import {
  supportedDataMapDefinitionFileExts,
  supportedDataMapperFolders,
  supportedSchemaFileExts,
} from '../commands/dataMapper/extensionConfig';

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
  vscode.commands.executeCommand(
    'setContext',
    extensionCommand.dataMapSetSupportedDataMapDefinitionFileExts,
    supportedDataMapDefinitionFileExts
  );
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetSupportedSchemaFileExts, supportedSchemaFileExts);
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetSupportedFileExts, [
    ...supportedDataMapDefinitionFileExts,
    ...supportedSchemaFileExts,
  ]);
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetDmFolders, supportedDataMapperFolders);
};
