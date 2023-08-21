/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dependenciesPathSettingKey, nodeJsDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { getGlobalSetting } from '../vsCodeConfig/settings';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

/**
 * Executes nodejs version command and gets it from cli.
 * @returns {Promise<string | null>} Functions core tools version.
 */
export async function getLocalNodeJsVersion(): Promise<string | null> {
  try {
    const output: string = await executeCommand(undefined, undefined, `${getNodeJsCommand()}`, '--version');
    const version: string | null = semver.clean(output);
    if (version) {
      return version;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Get the nodejs binaries executable or use the system nodejs executable.
 */
export function getNodeJsCommand(): string {
  const binariesLocation = getGlobalSetting<string>(dependenciesPathSettingKey);
  const nodeJsBinariesPath = path.join(binariesLocation, nodeJsDependencyName);
  const binariesExist = fs.existsSync(nodeJsBinariesPath);
  const command = binariesExist ? `${nodeJsBinariesPath}\\${ext.nodeJsCliPath}` : ext.nodeJsCliPath;
  executeCommand(ext.outputChannel, undefined, 'echo', `${command}`);
  return command;
}

/**
 * Get the npm binaries executable or use the system npm executable.
 */
export function getNpmCommand(): string {
  const binariesLocation = getGlobalSetting<string>(dependenciesPathSettingKey);
  const nodeJsBinariesPath = path.join(binariesLocation, nodeJsDependencyName);
  const binariesExist = fs.existsSync(nodeJsBinariesPath);
  const command = binariesExist ? `${nodeJsBinariesPath}\\${ext.npmCliPath}` : ext.npmCliPath;
  executeCommand(ext.outputChannel, undefined, 'echo', `${command}`);
  return command;
}
