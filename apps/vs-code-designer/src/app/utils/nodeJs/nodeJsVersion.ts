/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { Platform, autoRuntimeDependenciesPathSettingKey, nodeJsBinaryPathSettingKey, nodeJsDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { getGlobalSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { isString } from '@microsoft/logic-apps-shared';
import { binariesExist } from '../binaries';

/**
 * Executes nodejs version command and gets it from cli.
 * @returns {Promise<string | null>} Functions core tools version.
 */
export async function getLocalNodeJsVersion(context: IActionContext): Promise<string | null> {
  try {
    const output: string = await executeCommand(undefined, undefined, `${getNodeJsCommand()}`, '--version');
    const version: string | null = semver.clean(output);
    if (version) {
      return version;
    }
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : isString(error) ? error : 'Unknown error';
    context.telemetry.properties.error = errorMessage;
    return null;
  }
}

/**
 * Get the npm binaries executable or use the system npm executable.
 */
export function getNpmCommand(): string {
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const nodeJsBinariesPath = path.join(binariesLocation, nodeJsDependencyName);
  const binaries = binariesExist(nodeJsDependencyName);
  let command = ext.npmCliPath;
  if (binaries) {
    // windows the executable is at root folder, linux & macos its in the bin
    command = path.join(nodeJsBinariesPath, ext.npmCliPath);
    if (process.platform !== Platform.windows) {
      const nodeSubFolder = getNodeSubFolder(command);
      command = path.join(nodeJsBinariesPath, nodeSubFolder, 'bin', ext.npmCliPath);
    }
  }
  return command;
}

/**
 * Get the nodejs binaries executable or use the system nodejs executable.
 */
export function getNodeJsCommand(): string {
  const command = getGlobalSetting<string>(nodeJsBinaryPathSettingKey);
  return command;
}

export async function setNodeJsCommand(): Promise<void> {
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const nodeJsBinariesPath = path.join(binariesLocation, nodeJsDependencyName);
  const binariesExist = fs.existsSync(nodeJsBinariesPath);
  let command = ext.nodeJsCliPath;
  if (binariesExist) {
    // windows the executable is at root folder, linux & macos its in the bin
    command = path.join(nodeJsBinariesPath, ext.nodeJsCliPath);
    if (process.platform !== Platform.windows) {
      const nodeSubFolder = getNodeSubFolder(command);
      command = path.join(nodeJsBinariesPath, nodeSubFolder, 'bin', ext.nodeJsCliPath);

      fs.chmodSync(nodeJsBinariesPath, 0o777);
    }
  }
  await updateGlobalSetting<string>(nodeJsBinaryPathSettingKey, command);
}

function getNodeSubFolder(directoryPath: string): string | null {
  try {
    const items = fs.readdirSync(directoryPath);

    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory() && item.includes('node')) {
        return item;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  return ''; // No 'node' subfolders found
}
