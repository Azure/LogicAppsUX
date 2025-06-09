/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DependencyVersion,
  Platform,
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
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { onboardBinaries } from '../../onboarding';
import { isNodeJsInstalled } from '../commands/nodeJs/validateNodeJsInstalled';
import { executeCommand } from './funcCoreTools/cpUtils';
import { getNpmCommand } from './nodeJs/nodeJsVersion';
import { getGlobalSetting, getWorkspaceSetting, updateGlobalSetting } from './vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IGitHubReleaseInfo } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';

import AdmZip = require('adm-zip');
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import { setFunctionsCommand } from './funcCoreTools/funcVersion';
import { startAllDesignTimeApis } from './codeless/startDesignTimeApi';

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

  axios.get(downloadUrl, { responseType: 'stream' }).then((response) => {
    executeCommand(ext.outputChannel, undefined, 'echo', `Creating temporary folder... ${tempFolderPath}`);
    fs.mkdirSync(tempFolderPath, { recursive: true });
    fs.chmodSync(tempFolderPath, 0o777);

    const writer = fs.createWriteStream(dependencyFilePath);
    response.data.pipe(writer);

    writer.on('finish', async () => {
      executeCommand(ext.outputChannel, undefined, 'echo', `Successfully downloaded ${dependencyName} dependency.`);
      fs.chmodSync(dependencyFilePath, 0o777);

      // Extract to targetFolder
      if (dependencyName === dotnetDependencyName) {
        const version = dotNetVersion ?? semver.major(DependencyVersion.dotnet6);
        process.platform === Platform.windows
          ? await executeCommand(
              ext.outputChannel,
              undefined,
              'powershell -ExecutionPolicy Bypass -File',
              dependencyFilePath,
              '-InstallDir',
              targetFolder,
              '-Channel',
              `${version}.0`
            )
          : await executeCommand(ext.outputChannel, undefined, dependencyFilePath, '-InstallDir', targetFolder, '-Channel', `${version}.0`);
      } else {
        await extractDependency(dependencyFilePath, targetFolder, dependencyName);
        vscode.window.showInformationMessage(localize('successInstall', `Successfully installed ${dependencyName}`));
        if (dependencyName === funcDependencyName) {
          await setFunctionsCommand();
          await startAllDesignTimeApis();
        }
      }
      // remove the temp folder.
      fs.rmSync(tempFolderPath, { recursive: true });
      executeCommand(ext.outputChannel, undefined, 'echo', `Removed ${tempFolderPath}`);
    });
    writer.on('error', async (error) => {
      // log the error message the VSCode window and to telemetry.
      const errorMessage = `Error downloading and extracting the ${dependencyName} zip file: ${error.message}`;
      vscode.window.showErrorMessage(errorMessage);
      context.telemetry.properties.error = errorMessage;

      // remove the target folder.
      fs.rmSync(targetFolder, { recursive: true });
      await executeCommand(ext.outputChannel, undefined, 'echo', `[ExtractError]: Removed ${targetFolder}`);
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
    if (checkMajorVersion(latestVersion, majorVersion)) {
      return latestVersion;
    }
    throw new Error(
      localize(
        'latestVersionNotFound',
        'Latest version of Azure Functions Core Tools not found for major version {0}. Latest version is {1}.',
        majorVersion,
        latestVersion
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
        let latestVersion: string | null;
        for (const releaseInfo of response) {
          const releaseVersion: string | null = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (
            checkMajorVersion(releaseVersion, majorVersion) &&
            (isNullOrUndefined(latestVersion) || semver.gt(releaseVersion, latestVersion))
          ) {
            latestVersion = releaseVersion;
          }
        }
        return latestVersion;
      })
      .catch((error) => {
        context.telemetry.properties.latestVersionSource = 'fallback';
        context.telemetry.properties.errorNewestDotNetVersion = `Error getting latest .NET SDK version: ${error}`;
        return DependencyVersion.dotnet6;
      });
  }

  context.telemetry.properties.latestVersionSource = 'fallback';
  return DependencyVersion.dotnet6;
}

export async function getLatestNodeJsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.nodeMajorVersion = majorVersion;

  if (majorVersion) {
    return await readJsonFromUrl('https://api.github.com/repos/nodejs/node/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.latestVersionSource = 'github';
        for (const releaseInfo of response) {
          const releaseVersion = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (checkMajorVersion(releaseVersion, majorVersion)) {
            return releaseVersion;
          }
        }
      })
      .catch((error) => {
        context.telemetry.properties.latestNodeJSVersion = 'fallback';
        context.telemetry.properties.errorLatestNodeJsVersion = `Error getting latest Node JS version: ${error}`;
        return DependencyVersion.nodeJs;
      });
  }

  context.telemetry.properties.latestNodeJSVersion = 'fallback';
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
export function binariesExist(dependencyName: string): boolean {
  if (!useBinariesDependencies()) {
    return false;
  }
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const binariesPath = path.join(binariesLocation, dependencyName);
  const binariesExist = fs.existsSync(binariesPath);

  executeCommand(ext.outputChannel, undefined, 'echo', `${dependencyName} Binaries: ${binariesPath}`);
  return binariesExist;
}

async function readJsonFromUrl(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      return response.data;
    }
    throw new Error(`Request failed with status: ${response.status}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Error reading JSON from URL ${url} : ${error.message}`);
    throw error;
  }
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
  cleanDirectory(targetFolder);
  await executeCommand(ext.outputChannel, undefined, 'echo', `Extracting ${dependencyFilePath}`);
  try {
    if (dependencyFilePath.endsWith('.zip')) {
      const zip = new AdmZip(dependencyFilePath);
      await zip.extractAllTo(targetFolder, /* overwrite */ true, /* Permissions */ true);
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
  return semver.major(version) === Number(majorVersion);
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
 * @param {IActionContext} context - Command context.
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
 * Propmts warning message to decide the auto validation/installation of dependency binaries.
 * @param {IActionContext} context - Activation context.
 */
export async function installBinaries(context: IActionContext) {
  const useBinaries = useBinariesDependencies();

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

/**
 * Returns boolean to determine if workspace uses binaries dependencies.
 */
export const useBinariesDependencies = (): boolean => {
  const binariesInstallation = getGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting);
  return !!binariesInstallation;
};
