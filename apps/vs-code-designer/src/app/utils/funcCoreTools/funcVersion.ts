/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dependenciesPathSettingKey, funcCoreToolsBinaryPathSettingKey, funcDependencyName, funcVersionSetting } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getGlobalSetting, getWorkspaceSettingFromAnyFolder, updateGlobalSetting } from '../vsCodeConfig/settings';
import { executeCommand } from './cpUtils';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { FuncVersion, latestGAVersion } from '@microsoft/vscode-extension';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

/**
 * Parses functions core tools version.
 * @param {string | undefined} data - Functions core tools package version.
 * @returns {FuncVersion | undefined} Parsed functions core tools version.
 */
export function tryParseFuncVersion(data: string | undefined): FuncVersion | undefined {
  if (data) {
    const majorVersion: string | undefined = tryGetMajorVersion(data);
    if (majorVersion) {
      return Object.values(FuncVersion).find((version) => version === '~' + majorVersion);
    }
  }

  return undefined;
}

/**
 * Gets major version of package.
 * @param {string} data - Package version.
 * @returns {string | undefined} Major version.
 */
export function tryGetMajorVersion(data: string): string | undefined {
  const match: RegExpMatchArray | null = data.match(/^[~v]?([0-9]+)/i);
  return match ? match[1] : undefined;
}

/**
 * Gets default functions core tools version either from open workspace, local cli or backup.
 * @param {string} context - Command context.
 * @returns {Promise<FuncVersion>} Major version.
 */
export async function getDefaultFuncVersion(context: IActionContext): Promise<FuncVersion> {
  let version: FuncVersion | undefined = tryParseFuncVersion(getWorkspaceSettingFromAnyFolder(funcVersionSetting));
  context.telemetry.properties.runtimeSource = 'VSCodeSetting';

  if (isNullOrUndefined(version)) {
    version = await tryGetLocalFuncVersion();
    context.telemetry.properties.runtimeSource = 'LocalFuncCli';
  }

  if (isNullOrUndefined(version)) {
    version = latestGAVersion;
    context.telemetry.properties.runtimeSource = 'Backup';
  }

  return version;
}

/**
 * Gets functions core tools version from local cli command.
 * @returns {Promise<FuncVersion | undefined>} Functions core tools version.
 */
export async function tryGetLocalFuncVersion(): Promise<FuncVersion | undefined> {
  try {
    const version: string | null = await getLocalFuncCoreToolsVersion();
    if (version) {
      return tryParseFuncVersion(version);
    }
  } catch (err) {
    // swallow errors and return undefined
  }

  return undefined;
}

/**
 * Executes version command and gets it from cli.
 * @returns {Promise<string | null>} Functions core tools version.
 */
export async function getLocalFuncCoreToolsVersion(): Promise<string | null> {
  try {
    const output: string = await executeCommand(undefined, undefined, `${getFunctionsCommand()}`, '--version');
    const version: string | null = semver.clean(output);
    if (version) {
      return version;
    } else {
      // Old versions of the func cli do not support '--version', so we have to parse the command usage to get the version
      const matchResult: RegExpMatchArray | null = output.match(/(?:.*)Azure Functions Core Tools (.*)/);
      if (matchResult !== null) {
        let localVersion: string = matchResult[1].replace(/[()]/g, '').trim(); // remove () and whitespace
        // this is a fix for a bug currently in the Function CLI
        if (localVersion === '220.0.0-beta.0') {
          localVersion = '2.0.1-beta.25';
        }
        return semver.valid(localVersion);
      }

      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Adds functions cli version to telemetry.
 * @param {IActionContext} context - Command context.
 */
export function addLocalFuncTelemetry(context: IActionContext): void {
  context.telemetry.properties.funcCliVersion = 'unknown';

  getLocalFuncCoreToolsVersion()
    .then((version: string) => {
      context.telemetry.properties.funcCliVersion = version || 'none';
    })
    .catch(() => {
      context.telemetry.properties.funcCliVersion = 'none';
    });
}

/**
 * Checks installed functions core tools version is supported.
 * @param {string} version - Placeholder for input.
 */
export function checkSupportedFuncVersion(version: FuncVersion) {
  if (version !== FuncVersion.v2 && version !== FuncVersion.v3 && version !== FuncVersion.v4) {
    throw new Error(
      localize(
        'versionNotSupported',
        'Functions core tools version "{0}" not supported. Only version "{1}" is currently supported for Codeless.',
        version,
        FuncVersion.v2
      )
    );
  }
}

/**
 * Get the functions binaries executable or use the system functions executable.
 */
export function getFunctionsCommand(): string {
  const command = getGlobalSetting<string>(funcCoreToolsBinaryPathSettingKey);
  executeCommand(ext.outputChannel, undefined, 'echo', `getFunctionsCommand = ${command}`);
  return command;
}

export function setFunctionsCommand(): void {
  const binariesLocation = getGlobalSetting<string>(dependenciesPathSettingKey);
  const funcBinariesPath = path.join(binariesLocation, funcDependencyName);
  const binariesExist = fs.existsSync(funcBinariesPath);
  let command = ext.funcCliPath;
  if (binariesExist) {
    // windows the executable is at root folder, linux & macos its in the bin
    command = `${funcBinariesPath}\\${ext.funcCliPath}`;
  }
  executeCommand(ext.outputChannel, undefined, 'echo', `setFunctionsCommand = ${command}`);
  updateGlobalSetting<string>(funcCoreToolsBinaryPathSettingKey, command);
}
