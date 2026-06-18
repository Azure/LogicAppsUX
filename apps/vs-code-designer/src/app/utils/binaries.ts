/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DependencyVersion,
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
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { isNodeJsInstalled } from '../commands/nodeJs/validateNodeJsInstalled';
import { executeCommand } from './funcCoreTools/cpUtils';
import { getNpmCommand } from './nodeJs/nodeJsVersion';
import { getGlobalSetting, getWorkspaceSetting, updateGlobalSetting } from './vsCodeConfig/settings';
import { onboardBinaries, useBinariesDependencies } from './runtimeDependencies';
import { type DownloadAttemptResult, downloadFileWithVerification as downloadFileWithVerificationCore } from './integrity';
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
import { setFunctionsCommand } from './funcCoreTools/funcVersion';
import { startAllDesignTimeApis, stopAllDesignTimeApis } from './codeless/startDesignTimeApi';

export { useBinariesDependencies } from './runtimeDependencies';
export { DownloadIntegrityError } from './integrity';
export type { DownloadAttemptResult } from './integrity';

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
): Promise<DownloadAttemptResult | undefined> {
  folderName = folderName || dependencyName;
  const tempFolderPath = path.join(os.tmpdir(), defaultLogicAppsFolder, folderName);
  targetFolder = path.join(targetFolder, folderName);
  fs.mkdirSync(targetFolder, { recursive: true });

  // Read and write permissions
  fs.chmodSync(targetFolder, 0o777);

  const dependencyFileExtension = getCompressionFileExtension(downloadUrl);
  const dependencyFilePath = path.join(tempFolderPath, `${dependencyName}${dependencyFileExtension}`);

  executeCommand(ext.outputChannel, undefined, 'echo', `Downloading dependency from: ${downloadUrl}`);
  fs.mkdirSync(tempFolderPath, { recursive: true });
  fs.chmodSync(tempFolderPath, 0o777);

  let integrityResult: DownloadAttemptResult | undefined;
  try {
    integrityResult = await downloadFileWithVerification(context, downloadUrl, dependencyFilePath, dependencyName);
  } catch (error) {
    const errorMessage = `Error downloading the ${dependencyName} file: ${error instanceof Error ? error.message : String(error)}`;
    vscode.window.showErrorMessage(errorMessage);
    context.telemetry.properties.error = errorMessage;
    // Clean up partials before bailing.
    try {
      if (fs.existsSync(tempFolderPath)) {
        fs.rmSync(tempFolderPath, { recursive: true, force: true });
      }
      if (fs.existsSync(targetFolder)) {
        fs.rmSync(targetFolder, { recursive: true, force: true });
      }
    } catch {
      // Best-effort cleanup; ignore secondary errors.
    }
    throw error;
  }

  executeCommand(ext.outputChannel, undefined, 'echo', `Successfully downloaded ${dependencyName} dependency.`);
  fs.chmodSync(dependencyFilePath, 0o777);

  try {
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
        stopAllDesignTimeApis();
      }
      await extractDependency(dependencyFilePath, targetFolder, dependencyName);
      vscode.window.showInformationMessage(localize('successInstall', `Successfully installed ${dependencyName}`));
      if (dependencyName === funcDependencyName) {
        // Add execute permissions for func and gozip binaries
        if (process.platform !== Platform.windows) {
          fs.chmodSync(`${targetFolder}/func`, 0o755);
          fs.chmodSync(`${targetFolder}/gozip`, 0o755);
          fs.chmodSync(`${targetFolder}/in-proc8/func`, 0o755);
          fs.chmodSync(`${targetFolder}/in-proc6/func`, 0o755);
        }
        await setFunctionsCommand();
        await startAllDesignTimeApis();
      } else if (dependencyName === extensionBundleId) {
        await startAllDesignTimeApis();
      }
    }
  } finally {
    // remove the temp folder.
    if (fs.existsSync(tempFolderPath)) {
      fs.rmSync(tempFolderPath, { recursive: true, force: true });
      executeCommand(ext.outputChannel, undefined, 'echo', `Removed ${tempFolderPath}`);
    }
  }

  return integrityResult;
}

/**
 * Streams a file from `url` to `destPath`, verifying integrity against
 * `Content-Length` and `Content-MD5` response headers when present.
 *
 * Thin wrapper that adds extension-host telemetry + log lines on top of the
 * vscode-free implementation in `./integrity`.
 */
export async function downloadFileWithVerification(
  context: IActionContext,
  url: string,
  destPath: string,
  dependencyName: string,
  maxAttempts?: number
): Promise<DownloadAttemptResult> {
  let attemptsUsed = 0;
  try {
    const result = await downloadFileWithVerificationCore(url, destPath, {
      maxAttempts,
      hooks: {
        onSuccess: (attempt, attemptResult, durationMs) => {
          attemptsUsed = attempt;
          context.telemetry.properties[`${dependencyName}DownloadAttempts`] = String(attempt);
          context.telemetry.properties[`${dependencyName}ExpectedSize`] =
            attemptResult.expectedSize === undefined ? 'unknown' : String(attemptResult.expectedSize);
          context.telemetry.properties[`${dependencyName}ActualSize`] = String(attemptResult.actualSize);
          context.telemetry.properties[`${dependencyName}Md5Match`] = attemptResult.expectedMd5 ? 'true' : 'skipped';
          context.telemetry.measurements ??= {};
          context.telemetry.measurements[`${dependencyName}DownloadDurationMs`] = durationMs;
        },
        onAttempt: (attempt, error, willRetry) => {
          attemptsUsed = attempt;
          executeCommand(
            ext.outputChannel,
            undefined,
            'echo',
            `Download attempt ${attempt} for ${dependencyName} failed: ${
              error instanceof Error ? error.message : String(error)
            }${willRetry ? ' — retrying.' : ''}`
          );
        },
      },
    });
    return result;
  } catch (error) {
    if (attemptsUsed > 0) {
      context.telemetry.properties[`${dependencyName}DownloadAttempts`] = String(attemptsUsed);
    }
    throw error;
  }
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
    return await readJsonFromUrl('https://api.github.com/repos/nodejs/node/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.latestVersionSource = 'github';
        for (const releaseInfo of response) {
          const releaseVersion = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (releaseVersion && checkMajorVersion(releaseVersion, majorVersion)) {
            return releaseVersion;
          }
        }
        context.telemetry.properties.latestNodeJSVersion = 'fallback-no-match';
        context.telemetry.properties.errorLatestNodeJsVersion = 'No matching Node JS version found.';
        return DependencyVersion.nodeJs;
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
export async function binariesExist(dependencyName: string): Promise<boolean> {
  if (!(await useBinariesDependencies())) {
    return false;
  }

  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  if (!binariesLocation) {
    return false;
  }
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Error reading JSON from URL ${url} : ${errorMessage}`);
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
