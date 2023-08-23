/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DependencyVersion,
  Platform,
  defaultDependencyPathValue,
  dependenciesPathSettingKey,
  dotnetDependencyName,
  funcPackageName,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { validateDotNetIsLatest } from '../commands/dotnet/validateDotNetIsLatest';
import { validateFuncCoreToolsIsLatest } from '../commands/funcCoreTools/validateFuncCoreToolsIsLatest';
import { validateNodeJsIsLatest } from '../commands/nodeJs/validateNodeIsLatest';
import { isNodeJsInstalled } from '../commands/nodeJs/validateNodeJsInstalled';
import { getDependenciesVersion } from './bundleFeed';
import { executeCommand } from './funcCoreTools/cpUtils';
import { getNpmCommand } from './nodeJs/nodeJsVersion';
import { getGlobalSetting, updateGlobalSetting } from './vsCodeConfig/settings';
import { DialogResponses, openUrl, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed, IGitHubReleaseInfo } from '@microsoft/vscode-extension';
import * as AdmZip from 'adm-zip';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as request from 'request';
import * as semver from 'semver';
import * as tar from 'tar';
import * as vscode from 'vscode';
import type { MessageItem } from 'vscode';

export async function validateOrInstallBinaries(context: IActionContext) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification, // Location of the progress indicator
      title: 'Validating Dependencies Binaries', // Title displayed in the progress notification
      cancellable: true, // Allow the user to cancel the task
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        // Handle cancellation logic
        executeCommand(ext.outputChannel, undefined, 'echo', 'validateOrInstallBinaries was cancelled');
      });
      progress.report({ increment: 10, message: `Get Settings` });
      if (!getGlobalSetting<string>(dependenciesPathSettingKey)) {
        await updateGlobalSetting(dependenciesPathSettingKey, defaultDependencyPathValue);
        context.telemetry.properties.dependencyPath = defaultDependencyPathValue;
      }
      progress.report({ increment: 10, message: `Get Dependency Version from CDN` });
      const dependenciesVersions: IBundleDependencyFeed = await getDependenciesVersion(context);
      context.telemetry.properties.dependenciesVersions = dependenciesVersions?.toString();

      progress.report({ increment: 20, message: `NodeJs` });
      await validateNodeJsIsLatest(dependenciesVersions?.nodejs);
      progress.report({ increment: 20, message: `Azure Function Core Tools` });
      await validateFuncCoreToolsIsLatest(dependenciesVersions?.funcCoreTools);
      progress.report({ increment: 20, message: `DotNet SDK` });
      await validateDotNetIsLatest(dependenciesVersions?.dotnet);
    }
  );
}

/**
 * Download and Extracts Binaries zip.
 * @param {IActionContext} context - The context.
 * @param {string} binariesUrl - Binaries release url.
 * @param {string} targetFolder - Module name to check.
 */

export async function downloadAndExtractBinaries(binariesUrl: string, targetFolder: string, dependencyName: string): Promise<void> {
  const tempFolderPath = path.join(os.tmpdir(), '.azurelogicapps', dependencyName);
  targetFolder = path.join(targetFolder, dependencyName);
  fs.mkdirSync(targetFolder, { recursive: true });

  // Read and write permissions
  fs.chmod(targetFolder, 0o666, (chmodError) => {
    if (chmodError) {
      throw new Error(localize('ErrorChangingPermissions', `Error changing permissions: ${chmodError.message}`));
    }
  });

  const binariesFileExtension = getCompressionFileExtension(binariesUrl);
  const binariesFilePath = path.join(tempFolderPath, `${dependencyName}.${binariesFileExtension}`);

  try {
    executeCommand(ext.outputChannel, undefined, 'echo', `Creating temporary folder... ${tempFolderPath}`);
    fs.mkdirSync(tempFolderPath, { recursive: true });

    // Download the compressed binaries
    await new Promise<void>((resolve, reject) => {
      executeCommand(ext.outputChannel, undefined, 'echo', `Donwloading binaries from: ${binariesUrl}`);
      const downloadStream = request(binariesUrl).pipe(fs.createWriteStream(binariesFilePath));
      downloadStream.on('finish', () => {
        executeCommand(ext.outputChannel, undefined, 'echo', `Successfullly downloaded ${dependencyName}.`);
        resolve();
      });
      downloadStream.on('error', reject);
    });

    // Extract to targetFolder
    extractBinaries(binariesFilePath, targetFolder, dependencyName);

    // Build dotnet source code
    if (dependencyName == dotnetDependencyName) {
      await dotNetBuild(targetFolder, dependencyName);
    } else {
      vscode.window.showInformationMessage(localize('successInstall', `Successfully installed ${dependencyName}`));
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error downloading and extracting the ${dependencyName} zip: ${error.message}`);
    fs.rmSync(targetFolder, { recursive: true });
    throw error;
  } finally {
    fs.rmSync(tempFolderPath, { recursive: true });
    executeCommand(ext.outputChannel, undefined, 'echo', `Removed ${tempFolderPath}`);
  }
}

export async function getLatestFunctionCoreToolsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.funcCoreTools = majorVersion;

  // Use npm to find newest func core tools version
  const hasNodeJs = await isNodeJsInstalled();
  let latestVersion: string | null;
  if (hasNodeJs) {
    context.telemetry.properties.getLatestFunctionCoreToolsVersion = 'node';
    latestVersion = (await executeCommand(undefined, undefined, `${getNpmCommand()}`, 'view', funcPackageName, 'version'))?.trim();
    if (checkMajorVersion(latestVersion, majorVersion)) {
      return latestVersion;
    }
  }

  // fallback to github api to look for latest version
  await readJsonFromUrl('https://api.github.com/repos/Azure/azure-functions-core-tools/releases/latest').then(
    (response: IGitHubReleaseInfo) => {
      latestVersion = semver.valid(semver.coerce(response.tag_name));
      context.telemetry.properties.getLatestFunctionCoreToolsVersion = 'github';
      context.telemetry.properties.latestGithubVersion = response.tag_name;
      if (checkMajorVersion(latestVersion, majorVersion)) {
        return latestVersion;
      }
    }
  );

  // Fall back to hardcoded version
  context.telemetry.properties.getLatestFunctionCoreToolsVersion = 'fallback';
  return DependencyVersion.funcCoreTools;
}

export async function getLatestDotNetVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.dotNetMajorVersion = majorVersion;

  if (majorVersion) {
    await readJsonFromUrl('https://api.github.com/repos/dotnet/sdk/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.getLatestDotNetVersion = 'github';
        response.forEach((releaseInfo: IGitHubReleaseInfo) => {
          const releaseVersion: string | null = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (checkMajorVersion(releaseVersion, majorVersion)) {
            return releaseVersion;
          }
        });
      })
      .catch((error) => {
        throw Error(localize('errorNewestDotNetVersion', `Error getting latest dotnet sdk version: ${error}`));
      });
  }

  context.telemetry.properties.getLatestDotNetVersion = 'fallback';
  return DependencyVersion.dotnet6;
}

export async function getLatestNodeJsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.nodeMajorVersion = majorVersion;

  if (majorVersion) {
    await readJsonFromUrl('https://api.github.com/repos/nodejs/node/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.getLatestNodeJsVersion = 'github';
        response.forEach((releaseInfo: IGitHubReleaseInfo) => {
          const releaseVersion = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (checkMajorVersion(releaseVersion, majorVersion)) {
            return releaseVersion;
          }
        });
      })
      .catch((error) => {
        throw Error(localize('errorNewestNodeJsVersion', `Error getting latest node version: ${error}`));
      });
  }

  context.telemetry.properties.getLatestNodeJsVersion = 'fallback';
  return DependencyVersion.nodeJs;
}

export function getNodeJsBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  if (osPlatform != 'win') {
    return `https://nodejs.org/dist/v${version}/node-v${version}-${osPlatform}-${arch}.tar.gz`;
  }

  return `https://nodejs.org/dist/v${version}/node-v${version}-${osPlatform}-${arch}.zip`;
}

export function getFunctionCoreToolsBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  return `https://github.com/Azure/azure-functions-core-tools/releases/download/${version}/Azure.Functions.Cli.${osPlatform}-${arch}.${version}.zip`;
}

export function getDotNetBinariesReleaseUrl(version: string): string {
  return `https://github.com/dotnet/sdk/archive/refs/tags/v${version}.zip`;
}

export function getCpuArchitecture() {
  switch (process.arch) {
    case 'x64':
    case 'arm64':
      return process.arch;

    default:
      throw new Error(localize('UnsupportedCPUArchitecture', `Unsupported CPU Architecture: ${process.arch}`));
  }
}

/**
 * Checks if binaries folder directory path exists.
 * @param dependencyName The name of the dependency.
 * @returns true if expected binaries folder directory path exists
 */
export function binariesExist(dependencyName: string): boolean {
  const binariesLocation = getGlobalSetting<string>(dependenciesPathSettingKey);
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
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error reading JSON from URL: ${error.message}`);
    throw error;
  }
}

function getCompressionFileExtension(binariesUrl: string): string {
  if (binariesUrl.endsWith('.zip')) {
    return 'zip';
  }

  if (binariesUrl.endsWith('.tar.gz')) {
    return 'tar.gz';
  }

  if (binariesUrl.endsWith('.tar.xz')) {
    return 'tar.xz';
  }

  throw new Error(localize('UnsupportedCompressionFileExtension', `Unsupported Compression file extension: ${binariesUrl}`));
}

function extractBinaries(binariesFilePath: string, targetFolder: string, dependencyName: string): void {
  executeCommand(ext.outputChannel, undefined, 'echo', `Extracting ${binariesFilePath}`);
  if (binariesFilePath.endsWith('.zip')) {
    const zip = new AdmZip(binariesFilePath);
    zip.extractAllTo(targetFolder, /* overwrite */ true, /* Permissions */ true);
  } else {
    tar.x({
      file: binariesFilePath,
      cwd: targetFolder,
    });
  }
  cleanupContainerFolder(targetFolder);
  executeCommand(ext.outputChannel, undefined, 'echo', `Extraction ${dependencyName} completed successfully.`);
}

function checkMajorVersion(version: string, majorVersion: string): boolean {
  return semver.satisfies(version, `^${majorVersion}.x`);
}

/**
 * Runs the build script.
 * @param targetFolder
 * @param dependencyName
 */
async function dotNetBuild(targetFolder: string, dependencyName: string) {
  try {
    switch (process.platform) {
      case Platform.windows:
        await executeCommand(ext.outputChannel, targetFolder, 'build.cmd');
        break;

      default:
        await executeCommand(ext.outputChannel, targetFolder, 'build.sh');
    }
  } catch (error) {
    // Output shows errors but .dotnet sdk exe runs - need to test
    // Seems comparable to the manual binary installation. Maybe clean up the folder...
    if (!fs.existsSync(path.join(targetFolder, '.dotnet'))) {
      const errorMessage: string = localize('buildErrorDotNet', `Error building ${dependencyName}: ${error}`);
      fs.rmSync(targetFolder, { recursive: true });
      let result: MessageItem;
      do {
        result = await vscode.window.showWarningMessage(errorMessage, DialogResponses.learnMore);
        if (result == DialogResponses.learnMore) {
          await openUrl('https://dotnet.microsoft.com/en-us/download/dotnet/6.0');
        }
      } while (result === DialogResponses.learnMore);
    }
  } finally {
    // Build task creates .NET Host processes ...
    await executeCommand(undefined, targetFolder, 'taskkill /f /im dotnet.exe');
  }
}

/**
 * Cleans up by removing Container Folder:
 * path/to/folder/container/files --> /path/to/folder/files
 * @param targetFolder
 */
function cleanupContainerFolder(targetFolder: string) {
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
