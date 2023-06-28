/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DotnetVersion,
  PackageManager,
  dotNetPackageName,
  dotNetSDKLatestVersion,
  dotNetSDKMajorVersion,
  dotNetSDKVersionSetting,
  versionRegex,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { tryGetMajorVersion } from '../funcCoreTools/funcVersion';
import { getWorkspaceSettingFromAnyFolder } from '../vsCodeConfig/settings';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { parseError } from '@microsoft/vscode-azext-utils';
import * as semver from 'semver';

/**
 * Parses dot net sdk version.
 * @param {string | undefined} data - dot net sdk package version.
 * @returns {DotnetVersion | undefined} Parsed dot net version.
 */
export function tryParseDotNetVersion(data: string | undefined): DotnetVersion | undefined {
  if (data) {
    const majorVersion: string | undefined = tryGetMajorVersion(data);
    if (majorVersion) {
      return Object.values(DotnetVersion).find((version) => version === majorVersion);
    }
  }

  return undefined;
}

/**
 * Gets default .Net SDK  version either from open workspace, local cli or backup.
 * @param {string} context - Command context.
 * @returns {Promise<DotnetVersion>} Major version.
 */
export async function getDefaultDotNetSDKVersion(context: IActionContext): Promise<DotnetVersion> {
  let version: DotnetVersion | undefined = tryParseDotNetVersion(getWorkspaceSettingFromAnyFolder(dotNetSDKVersionSetting));
  context.telemetry.properties.runtimeSource = 'VSCodeSetting';

  if (isNullOrUndefined(version)) {
    version = await tryGetLocalDotNetVersion();
    context.telemetry.properties.runtimeSource = 'LocalDotNetCli';
  }

  if (isNullOrUndefined(version)) {
    version = DotnetVersion.netsdk6;
    context.telemetry.properties.runtimeSource = 'Backup';
  }

  return version;
}

/**
 * Gets .NET SDK version from local cli command.
 * @returns {Promise<string | undefined>} .NET SDK version.
 */
export async function tryGetLocalDotNetVersion(): Promise<DotnetVersion | undefined> {
  try {
    const version: string | null = await getLocalDotNetSDKVersion();
    if (version) {
      return tryParseDotNetVersion(version);
    }
  } catch (err) {
    // swallow errors and return undefined
  }

  return undefined;
}

/**
 * Executes version command and gets it from cli.
 * @returns {Promise<string | null>} .NET SDK version.
 */
export async function getLocalDotNetSDKVersion(): Promise<string | null> {
  try {
    const output: string = await executeCommand(undefined, undefined, ext.dotNetCliPath, '--list-sdks');

    // Creates an array of versions from output
    const sdkList: string[] = output.split(/\r?\n/);
    const directoryRegex = /\[.*?\]/;
    let version: string | null = '-1';
    sdkList.forEach((sdkVersion) => {
      // Removes directory using regex
      const match = sdkVersion.match(directoryRegex);
      if (match) {
        const directory = match[0];
        const checkVersion = semver.clean(sdkVersion.replace(directory, ''));

        if (semver.major(checkVersion) == dotNetSDKMajorVersion) {
          // List of sdk is in-order and therefore the version will be latest.
          version = checkVersion;
        }
      }
    });

    if (version && version != '-1') {
      return version;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getNewestDotNetSDKVersion(
  packageManager: PackageManager | undefined,
  context: IActionContext
): Promise<string | undefined> {
  let version: string | null;
  let match: RegExpMatchArray | null;

  try {
    switch (packageManager) {
      case PackageManager.winget:
        version = await executeCommand(undefined, undefined, 'winget', 'search', `${dotNetPackageName}.${dotNetSDKMajorVersion}`);
        version = version.split('\n')[2]; // Skip headers
        match = version.match(versionRegex);
        if (match) {
          context.telemetry.properties.newestDotNetSDKVersion = match[0];
          return match[0];
        }
        break;

      case PackageManager.brew:
      case PackageManager.wget:
        return dotNetSDKLatestVersion;
    }
  } catch (error) {
    context.telemetry.properties.latestRuntimeError = parseError(error).message;
  }

  return undefined;
}

/**
 * Adds dot net sdk version to telemetry.
 * @param {IActionContext} context - Command context.
 */
export function addLocalDotNetSDKTelemetry(context: IActionContext): void {
  context.telemetry.properties.dotNetSDKVersion = 'unknown';

  getLocalDotNetSDKVersion()
    .then((version: string) => {
      context.telemetry.properties.dotNetSDKVersion = version || 'none';
    })
    .catch(() => {
      context.telemetry.properties.dotNetSDKVersion = 'none';
    });
}
