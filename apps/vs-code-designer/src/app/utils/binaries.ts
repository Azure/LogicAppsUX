/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DependencyVersion,
  autoRuntimeDependenciesValidationAndInstallationSetting,
  autoRuntimeDependenciesPathSettingKey,
  dependencyTimeoutSettingKey,
  dotnetDependencyName,
  funcPackageName,
  defaultLogicAppsFolder,
  dotNetBinaryPathSettingKey,
  DependencyDefaultPath,
  nodeJsBinaryPathSettingKey,
  funcCoreToolsBinaryPathSettingKey,
  funcDependencyName,
  extensionBundleId,
  nodeJsDependencyName,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { isNodeJsInstalled } from '../commands/nodeJs/validateNodeJsInstalled';
import { executeCommand } from './funcCoreTools/cpUtils';
import { getNpmCommand } from './nodeJs/nodeJsVersion';
import { getGlobalSetting, getWorkspaceSetting, updateGlobalSetting } from './vsCodeConfig/settings';
import { onboardBinaries, useBinariesDependencies } from './runtimeDependencies';
import { isDevContainerWorkspaceSync } from './devContainerUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { Platform, type IGitHubReleaseInfo } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';

import AdmZip from 'adm-zip';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import { repairFuncCoreToolsExecutablePermissions, setFunctionsCommand } from './funcCoreTools/funcVersion';
import { startAllDesignTimeApis, stopAllDesignTimeApis } from './codeless/startDesignTimeApi';

export { useBinariesDependencies } from './runtimeDependencies';

/**
 * Download and Extracts dependency zip.
 * @param {string} downloadUrl - download url.
 * @param {string} targetFolder - Module name to check.
 * @param {string} dependencyName - The Dedependency name.
 * @param {string} folderName - Optional Folder name. Will default to dependency name if empty.
 * @param {string} dotNetVersion - The .NET Major Version from CDN.
 */

export async function downloadAndExtractDependency(
  context: IActionContext,
  downloadUrl: string,
  targetFolder: string,
  dependencyName: string,
  folderName?: string,
  dotNetVersion?: string
): Promise<void> {
  folderName = folderName || dependencyName;
  const tempFolderPath = path.join(os.tmpdir(), defaultLogicAppsFolder, folderName);
  targetFolder = path.join(targetFolder, folderName);
  fs.mkdirSync(targetFolder, { recursive: true });

  // Read and write permissions
  fs.chmodSync(targetFolder, 0o777);

  const dependencyFileExtension = getCompressionFileExtension(downloadUrl);
  const dependencyFilePath = path.join(tempFolderPath, `${dependencyName}${dependencyFileExtension}`);

  executeCommand(ext.outputChannel, undefined, 'echo', `Downloading dependency from: ${downloadUrl}`);

  const response = await axios.get(downloadUrl, { responseType: 'stream' });
  await new Promise<void>((resolve, reject) => {
    const rejectDownload = async (error: Error) => {
      const errorMessage = `Error downloading and extracting the ${dependencyName} zip file: ${error.message}`;
      vscode.window.showErrorMessage(errorMessage);
      context.telemetry.properties.error = errorMessage;

      try {
        fs.rmSync(targetFolder, { recursive: true, force: true });
        await executeCommand(ext.outputChannel, undefined, 'echo', `[ExtractError]: Removed ${targetFolder}`);
      } catch (cleanupError) {
        try {
          await executeCommand(
            ext.outputChannel,
            undefined,
            'echo',
            `[ExtractError]: Failed to remove ${targetFolder}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
          );
        } catch {
          // Keep rejection behavior deterministic even if cleanup logging fails.
        }
      } finally {
        reject(new Error(errorMessage));
      }
    };

    executeCommand(ext.outputChannel, undefined, 'echo', `Creating temporary folder... ${tempFolderPath}`);
    fs.mkdirSync(tempFolderPath, { recursive: true });
    fs.chmodSync(tempFolderPath, 0o777);

    const writer = fs.createWriteStream(dependencyFilePath);
    response.data.on?.('error', rejectDownload);
    response.data.pipe(writer);

    writer.on('finish', async () => {
      try {
        executeCommand(ext.outputChannel, undefined, 'echo', `Successfully downloaded ${dependencyName} dependency.`);
        fs.chmodSync(dependencyFilePath, 0o777);

        // Extract to targetFolder
        if (dependencyName === dotnetDependencyName) {
          const version = dotNetVersion ?? semver.major(DependencyVersion.dotnet8);
          if (process.platform === Platform.windows) {
            await executeCommand(
              ext.outputChannel,
              undefined,
              'powershell -ExecutionPolicy Bypass -File',
              dependencyFilePath,
              '-InstallDir',
              targetFolder,
              '-Channel',
              `${version}.0`
            );
          } else {
            await executeCommand(ext.outputChannel, undefined, dependencyFilePath, '-InstallDir', targetFolder, '-Channel', `${version}.0`);
          }
        } else {
          if (dependencyName === funcDependencyName || dependencyName === extensionBundleId) {
            await stopAllDesignTimeApis();
          }
          await extractDependency(dependencyFilePath, targetFolder, dependencyName);
          ext.outputChannel.appendLog(localize('successInstall', 'Successfully installed {0}', dependencyName));
          if (dependencyName === funcDependencyName) {
            repairFuncCoreToolsExecutablePermissions(targetFolder);
            await setFunctionsCommand();
            await startAllDesignTimeApis();
          } else if (dependencyName === extensionBundleId) {
            await startAllDesignTimeApis();
          }
        }
        // remove the temp folder.
        fs.rmSync(tempFolderPath, { recursive: true });
        executeCommand(ext.outputChannel, undefined, 'echo', `Removed ${tempFolderPath}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    writer.on('error', async (error) => {
      await rejectDownload(error);
    });
  });
}

const getFunctionCoreToolVersionFromGithub = async (context: IActionContext, majorVersion: string): Promise<string> => {
  try {
    const response: IGitHubReleaseInfo = await readJsonFromUrl(
      'https://api.github.com/repos/Azure/azure-functions-core-tools/releases/latest'
    );
    const latestVersion = semver.valid(semver.coerce(response.tag_name));
    context.telemetry.properties.latestVersionSource = 'github';
    context.telemetry.properties.latestGithubVersion = response.tag_name;
    if (latestVersion && checkMajorVersion(latestVersion, majorVersion)) {
      return latestVersion;
    }
    throw new Error(
      localize(
        'latestVersionNotFound',
        'Latest version of Azure Functions Core Tools not found for major version {0}. Latest version is {1}.',
        majorVersion,
        latestVersion ?? 'unknown'
      )
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : isString(error) ? error : 'Unknown error';
    context.telemetry.properties.latestVersionSource = 'fallback';
    context.telemetry.properties.errorLatestFunctionCoretoolsVersion = `Error getting latest function core tools version from github: ${errorMessage}`;
    return DependencyVersion.funcCoreTools;
  }
};

export async function getLatestFunctionCoreToolsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.funcCoreTools = majorVersion;

  if (!majorVersion) {
    context.telemetry.properties.latestVersionSource = 'fallback';
    return DependencyVersion.funcCoreTools;
  }

  // Use npm to find newest func core tools version
  const hasNodeJs = await isNodeJsInstalled();
  if (hasNodeJs) {
    context.telemetry.properties.latestVersionSource = 'node';
    try {
      const npmCommand = getNpmCommand();
      const latestVersion = (await executeCommand(undefined, undefined, `${npmCommand}`, 'view', funcPackageName, 'version'))?.trim();
      if (checkMajorVersion(latestVersion, majorVersion)) {
        return latestVersion;
      }
    } catch (error) {
      context.telemetry.properties.errorLatestFunctionCoretoolsVersion = `Error executing npm command to get latest function core tools version: ${error}`;
    }
  }
  return await getFunctionCoreToolVersionFromGithub(context, majorVersion);
}

/**
 * Retrieves the latest version of .NET SDK.
 * @param {IActionContext} context - The action context.
 * @param {string} majorVersion - The major version of .NET SDK to retrieve. (optional)
 * @returns A promise that resolves to the latest version of .NET SDK.
 * @throws An error if there is an issue retrieving the latest .NET SDK version.
 */
export async function getLatestDotNetVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.dotNetMajorVersion = majorVersion;

  if (majorVersion) {
    return await readJsonFromUrl('https://api.github.com/repos/dotnet/sdk/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.latestVersionSource = 'github';
        let latestVersion: string | null = null;
        for (const releaseInfo of response) {
          const releaseVersion: string | null = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (!releaseVersion) {
            continue;
          }
          if (
            checkMajorVersion(releaseVersion, majorVersion) &&
            (isNullOrUndefined(latestVersion) || semver.gt(releaseVersion, latestVersion))
          ) {
            latestVersion = releaseVersion;
          }
        }
        return latestVersion ?? DependencyVersion.dotnet8;
      })
      .catch((error) => {
        context.telemetry.properties.latestVersionSource = 'fallback';
        context.telemetry.properties.errorNewestDotNetVersion = `Error getting latest .NET SDK version: ${error}`;
        return DependencyVersion.dotnet8;
      });
  }

  context.telemetry.properties.latestVersionSource = 'fallback';
  return DependencyVersion.dotnet8;
}

export async function getLatestNodeJsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.nodeMajorVersion = majorVersion;

  if (majorVersion) {
    try {
      const response: IGitHubReleaseInfo[] = await readJsonFromUrl('https://api.github.com/repos/nodejs/node/releases');
      let latestVersion: string | undefined;
      for (const releaseInfo of response) {
        const releaseVersion = semver.valid(semver.coerce(releaseInfo.tag_name));
        context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
        if (releaseVersion && checkMajorVersion(releaseVersion, majorVersion)) {
          latestVersion = latestVersion && semver.gt(latestVersion, releaseVersion) ? latestVersion : releaseVersion;
        }
      }
      if (latestVersion) {
        context.telemetry.properties.latestVersionSource = 'github';
        context.telemetry.properties.latestNodeJSVersion = latestVersion;
        return latestVersion;
      }
      context.telemetry.properties.latestNodeJSVersion = 'fallback-no-match';
      context.telemetry.properties.latestVersionSource = 'fallback';
      context.telemetry.properties.errorLatestNodeJsVersion = 'No matching Node JS version found.';
      return DependencyVersion.nodeJs;
    } catch (error) {
      context.telemetry.properties.latestNodeJSVersion = 'fallback';
      context.telemetry.properties.latestVersionSource = 'fallback';
      context.telemetry.properties.errorLatestNodeJsVersion = `Error getting latest Node JS version from GitHub: ${error}`;
      return DependencyVersion.nodeJs;
    }
  }

  context.telemetry.properties.latestNodeJSVersion = 'fallback';
  context.telemetry.properties.latestVersionSource = 'fallback';
  return DependencyVersion.nodeJs;
}

export function getNodeJsBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  if (osPlatform === 'win') {
    return `https://nodejs.org/dist/v${version}/node-v${version}-${osPlatform}-${arch}.zip`;
  }

  return `https://nodejs.org/dist/v${version}/node-v${version}-${osPlatform}-${arch}.tar.gz`;
}

export function getFunctionCoreToolsBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  return `https://github.com/Azure/azure-functions-core-tools/releases/download/${version}/Azure.Functions.Cli.${osPlatform}-${arch}.${version}.zip`;
}

export function getDotNetBinariesReleaseUrl(): string {
  return process.platform === Platform.windows ? 'https://dot.net/v1/dotnet-install.ps1' : 'https://dot.net/v1/dotnet-install.sh';
}

export function getCpuArchitecture() {
  switch (process.arch) {
    case 'x64':
    case 'arm64':
      return process.arch;

    default:
      throw new Error(localize('UnsupportedCPUArchitecture', `Unsupported CPU architecture: ${process.arch}`));
  }
}

/**
 * Checks if binaries folder directory path exists.
 * @param dependencyName The name of the dependency.
 * @returns true if expected binaries folder directory path exists
 */
export async function binariesExist(dependencyName: string): Promise<boolean> {
  if (!(await useBinariesDependencies())) {
    return false;
  }

  return await binariesExistFromSettings(dependencyName, true);
}

export function binariesExistSync(dependencyName: string): boolean {
  if (!useBinariesDependenciesFromSettings()) {
    return false;
  }

  return binariesExistFromSettings(dependencyName, false);
}

function useBinariesDependenciesFromSettings(): boolean {
  if (isDevContainerWorkspaceSync()) {
    return false;
  }

  const binariesInstallation = getGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting);
  return !!binariesInstallation;
}

function getExpectedBinaryPath(dependencyName: string): string | undefined {
  if (dependencyName === funcDependencyName) {
    return getGlobalSetting<string>(funcCoreToolsBinaryPathSettingKey);
  }
  if (dependencyName === dotnetDependencyName) {
    return getGlobalSetting<string>(dotNetBinaryPathSettingKey);
  }
  if (dependencyName === nodeJsDependencyName) {
    return getGlobalSetting<string>(nodeJsBinaryPathSettingKey);
  }
  return undefined;
}

async function binariesExistFromSettings(dependencyName: string, updateMissingExeSetting: true): Promise<boolean>;
function binariesExistFromSettings(dependencyName: string, updateMissingExeSetting: false): boolean;
function binariesExistFromSettings(dependencyName: string, updateMissingExeSetting: boolean): boolean | Promise<boolean> {
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  if (!binariesLocation) {
    return false;
  }
  const binariesPath = path.join(binariesLocation, dependencyName);
  const binariesExist = fs.existsSync(binariesPath);
  const expectedBinaryPath = binariesExist ? getExpectedBinaryPath(dependencyName) : undefined;

  executeCommand(ext.outputChannel, undefined, 'echo', `${dependencyName} Binaries: ${binariesPath}`);
  if (expectedBinaryPath && !fs.existsSync(expectedBinaryPath)) {
    // On Windows, binaries have .exe extension but the setting may have been stored without it.
    // Try the .exe variant before declaring the binary missing.
    const exeVariant = `${expectedBinaryPath}.exe`;
    if (process.platform === Platform.windows && !expectedBinaryPath.toLowerCase().endsWith('.exe') && fs.existsSync(exeVariant)) {
      // Update the setting to the correct .exe path so future checks are fast
      if (updateMissingExeSetting) {
        return updateBinaryPathSetting(dependencyName, exeVariant).then(() => true);
      }
      return true;
    }
    executeCommand(ext.outputChannel, undefined, 'echo', `${dependencyName} binary is missing: ${expectedBinaryPath}`);
    return false;
  }

  return binariesExist;
}

async function updateBinaryPathSetting(dependencyName: string, binaryPath: string): Promise<void> {
  if (dependencyName === funcDependencyName) {
    await updateGlobalSetting<string>(funcCoreToolsBinaryPathSettingKey, binaryPath);
  } else if (dependencyName === dotnetDependencyName) {
    await updateGlobalSetting<string>(dotNetBinaryPathSettingKey, binaryPath);
  } else if (dependencyName === nodeJsDependencyName) {
    await updateGlobalSetting<string>(nodeJsBinaryPathSettingKey, binaryPath);
  }
}

async function readJsonFromUrl(url: string): Promise<any> {
  const response = await axios.get(url);
  if (response.status === 200) {
    return response.data;
  }
  throw new Error(`Request failed with status: ${response.status}`);
}

function getCompressionFileExtension(binariesUrl: string): string {
  if (binariesUrl.endsWith('.zip')) {
    return '.zip';
  }

  if (binariesUrl.endsWith('.tar.gz')) {
    return '.tar.gz';
  }

  if (binariesUrl.endsWith('.tar.xz')) {
    return '.tar.xz';
  }

  if (binariesUrl.endsWith('.ps1')) {
    return '.ps1';
  }

  if (binariesUrl.endsWith('.sh')) {
    return '.sh';
  }

  throw new Error(localize('UnsupportedCompressionFileExtension', `Unsupported compression file extension: ${binariesUrl}`));
}

function cleanDirectory(targetFolder: string): void {
  // Read all files/folders in targetFolder
  const entries = fs.readdirSync(targetFolder);
  for (const entry of entries) {
    const entryPath = path.join(targetFolder, entry);
    // Remove files or directories recursively
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}

async function extractDependency(dependencyFilePath: string, targetFolder: string, dependencyName: string): Promise<void> {
  // Clear targetFolder's contents without deleting the folder itself
  // TODO(aeldridge): It is possible there is a lock on a file in targetFolder, should be handled.
  cleanDirectory(targetFolder);
  await executeCommand(ext.outputChannel, undefined, 'echo', `Extracting ${dependencyFilePath}`);
  try {
    if (dependencyFilePath.endsWith('.zip')) {
      const zip = new AdmZip(dependencyFilePath);
      zip.extractAllTo(targetFolder, /* overwrite */ true, /* Permissions */ true);
    } else {
      await executeCommand(ext.outputChannel, undefined, 'tar', '-xzvf', dependencyFilePath, '-C', targetFolder);
    }
    extractContainerFolder(targetFolder);
    await executeCommand(ext.outputChannel, undefined, 'echo', `Extraction ${dependencyName} successfully completed.`);
  } catch (error) {
    throw new Error(`Error extracting ${dependencyName}: ${error}`);
  }
}

/**
 * Checks if the major version of a given version string matches the specified major version.
 * @param {string} version - The version string to check.
 * @param {string} majorVersion - The major version to compare against.
 * @returns A boolean indicating whether the major version matches.
 */
function checkMajorVersion(version: string, majorVersion: string): boolean {
  const requestedMajorVersion = getMajorVersion(majorVersion);
  return requestedMajorVersion !== undefined && semver.major(version) === requestedMajorVersion;
}

function getMajorVersion(version: string): number | undefined {
  const coercedVersion = semver.coerce(version);
  return coercedVersion ? semver.major(coercedVersion) : undefined;
}

/**
 * Cleans up by removing Container Folder:
 * path/to/folder/container/files --> /path/to/folder/files
 * @param targetFolder
 */
function extractContainerFolder(targetFolder: string) {
  const extractedContents = fs.readdirSync(targetFolder);
  if (extractedContents.length === 1 && fs.statSync(path.join(targetFolder, extractedContents[0])).isDirectory()) {
    const containerFolderPath = path.join(targetFolder, extractedContents[0]);
    const containerContents = fs.readdirSync(containerFolderPath);
    containerContents.forEach((content) => {
      const contentPath = path.join(containerFolderPath, content);
      const destinationPath = path.join(targetFolder, content);
      fs.renameSync(contentPath, destinationPath);
    });

    if (fs.readdirSync(containerFolderPath).length === 0) {
      fs.rmSync(containerFolderPath, { recursive: true });
    }
  }
}

/**
 * Gets dependency timeout setting value from workspace settings.
 * @returns {number} Timeout value in seconds.
 */
export function getDependencyTimeout(): number {
  const dependencyTimeoutValue: number | undefined = getWorkspaceSetting<number>(dependencyTimeoutSettingKey);
  const timeoutInSeconds = Number(dependencyTimeoutValue);
  if (Number.isNaN(timeoutInSeconds)) {
    throw new Error(
      localize(
        'invalidSettingValue',
        'The setting "{0}" must be a number, but instead found "{1}".',
        dependencyTimeoutValue,
        dependencyTimeoutValue
      )
    );
  }

  return timeoutInSeconds;
}

/**
 * Prompts warning message to decide the auto validation/installation of dependency binaries.
 * @param {IActionContext} context - Activation context.
 */
export async function installBinaries(context: IActionContext) {
  const useBinaries = await useBinariesDependencies();

  if (useBinaries) {
    await onboardBinaries(context);
    context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting = 'true';
  } else {
    await updateGlobalSetting(dotNetBinaryPathSettingKey, DependencyDefaultPath.dotnet);
    await updateGlobalSetting(nodeJsBinaryPathSettingKey, DependencyDefaultPath.node);
    await updateGlobalSetting(funcCoreToolsBinaryPathSettingKey, DependencyDefaultPath.funcCoreTools);
    context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting = 'false';
  }
}
