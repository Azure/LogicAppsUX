/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DependencyVersion,
  Platform,
  autoBinariesInstallationSetting,
  defaultDependencyPathValue,
  dependenciesPathSettingKey,
  dependencyTimeoutSettingKey,
  dotnetDependencyName,
  funcPackageName,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { validateDotNetIsLatest } from '../commands/dotnet/validateDotNetIsLatest';
import { validateFuncCoreToolsIsLatest } from '../commands/funcCoreTools/validateFuncCoreToolsIsLatest';
import { isNodeJsInstalled } from '../commands/nodeJs/validateNodeJsInstalled';
import { validateNodeJsIsLatest } from '../commands/nodeJs/validateNodeJsIsLatest';
import { getDependenciesVersion } from './bundleFeed';
import { setDotNetCommand } from './dotnet/dotnet';
import { executeCommand } from './funcCoreTools/cpUtils';
import { setFunctionsCommand } from './funcCoreTools/funcVersion';
import { getNpmCommand, setNodeJsCommand } from './nodeJs/nodeJsVersion';
import { runWithDurationTelemetry } from './telemetry';
import { timeout } from './timeout';
import { tryGetFunctionProjectRoot } from './verifyIsProject';
import { getGlobalSetting, getWorkspaceSetting, updateGlobalSetting } from './vsCodeConfig/settings';
import { getWorkspaceFolder } from './workspace';
import { DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed, IGitHubReleaseInfo } from '@microsoft/vscode-extension';
import * as AdmZip from 'adm-zip';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as request from 'request';
import * as semver from 'semver';
import * as vscode from 'vscode';

export async function validateAndInstallBinaries(context: IActionContext) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification, // Location of the progress indicator
      title: 'Validating dependency binaries', // Title displayed in the progress notification
      cancellable: false, // Allow the user to cancel the task
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        // Handle cancellation logic
        executeCommand(ext.outputChannel, undefined, 'echo', 'validateAndInstallBinaries was canceled');
      });

      context.telemetry.properties.lastStep = 'getGlobalSetting';
      progress.report({ increment: 10, message: `Get Settings` });

      const dependencyTimeout = (await getDependencyTimeout()) * 1000;

      context.telemetry.properties.dependencyTimeout = `${dependencyTimeout} milliseconds`;
      if (!getGlobalSetting<string>(dependenciesPathSettingKey)) {
        await updateGlobalSetting(dependenciesPathSettingKey, defaultDependencyPathValue);
        context.telemetry.properties.dependencyPath = defaultDependencyPathValue;
      }

      context.telemetry.properties.lastStep = 'getDependenciesVersion';
      progress.report({ increment: 10, message: `Get dependency version from CDN` });
      let dependenciesVersions: IBundleDependencyFeed;
      try {
        dependenciesVersions = await getDependenciesVersion(context);
        context.telemetry.properties.dependenciesVersions = JSON.stringify(dependenciesVersions);
      } catch (error) {
        // Unable to get dependency.json, will default to fallback versions
        console.log(error);
      }

      context.telemetry.properties.lastStep = 'validateNodeJsIsLatest';
      await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateNodeJsIsLatest', async () => {
        progress.report({ increment: 20, message: `Node Js` });
        await timeout(validateNodeJsIsLatest, dependencyTimeout, dependenciesVersions?.nodejs);
        await setNodeJsCommand();
      });

      context.telemetry.properties.lastStep = 'validateFuncCoreToolsIsLatest';
      await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async () => {
        progress.report({ increment: 20, message: `Azure Function Core Tools` });
        await timeout(validateFuncCoreToolsIsLatest, dependencyTimeout, dependenciesVersions?.funcCoreTools);
        await setFunctionsCommand();
      });

      context.telemetry.properties.lastStep = 'validateDotNetIsLatest';
      await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateDotNetIsLatest', async () => {
        progress.report({ increment: 20, message: `.NET SDK` });
        await timeout(validateDotNetIsLatest, dependencyTimeout, dependenciesVersions?.dotnet);
        await setDotNetCommand();
      });
    }
  );
}

/**
 * Download and Extracts Binaries zip.
 * @param {string} binariesUrl - Binaries release url.
 * @param {string} targetFolder - Module name to check.
 * @param {string} dependencyName - The Dedepency name.
 * @param {string} dotNetVersion - The .NET Major Version from CDN.
 */

export async function downloadAndExtractBinaries(
  binariesUrl: string,
  targetFolder: string,
  dependencyName: string,
  dotNetVersion?: string
): Promise<void> {
  const tempFolderPath = path.join(os.tmpdir(), '.azurelogicapps', dependencyName);
  targetFolder = path.join(targetFolder, dependencyName);
  fs.mkdirSync(targetFolder, { recursive: true });

  // Read and write permissions
  fs.chmodSync(targetFolder, 0o777);

  const binariesFileExtension = getCompressionFileExtension(binariesUrl);
  const binariesFilePath = path.join(tempFolderPath, `${dependencyName}${binariesFileExtension}`);

  try {
    await executeCommand(ext.outputChannel, undefined, 'echo', `Creating temporary folder... ${tempFolderPath}`);
    fs.mkdirSync(tempFolderPath, { recursive: true });
    fs.chmodSync(tempFolderPath, 0o777);

    // Download the compressed binaries
    await new Promise<void>((resolve, reject) => {
      executeCommand(ext.outputChannel, undefined, 'echo', `Downloading binaries from: ${binariesUrl}`);
      const downloadStream = request(binariesUrl).pipe(fs.createWriteStream(binariesFilePath));
      downloadStream.on('finish', async () => {
        await executeCommand(ext.outputChannel, undefined, 'echo', `Successfullly downloaded ${dependencyName} binaries.`);

        fs.chmodSync(binariesFilePath, 0o777);

        // Extract to targetFolder
        if (dependencyName == dotnetDependencyName) {
          const version = dotNetVersion ?? semver.major(DependencyVersion.dotnet6);
          process.platform == Platform.windows
            ? await executeCommand(
                ext.outputChannel,
                undefined,
                'powershell -ExecutionPolicy Bypass -File',
                binariesFilePath,
                '-InstallDir',
                targetFolder,
                '-Channel',
                `${version}.0`
              )
            : await executeCommand(ext.outputChannel, undefined, binariesFilePath, '-InstallDir', targetFolder, '-Channel', `${version}.0`);
        } else {
          await extractBinaries(binariesFilePath, targetFolder, dependencyName);
          vscode.window.showInformationMessage(localize('successInstall', `Successfully installed ${dependencyName}`));
        }
        resolve();
      });
      downloadStream.on('error', reject);
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Error downloading and extracting the ${dependencyName} zip file: ${error.message}`);
    await executeCommand(ext.outputChannel, undefined, 'echo', `[ExtractError]: Remove ${targetFolder}`);
    fs.rmSync(targetFolder, { recursive: true });
    throw error;
  } finally {
    fs.rmSync(tempFolderPath, { recursive: true });
    await executeCommand(ext.outputChannel, undefined, 'echo', `Removed ${tempFolderPath}`);
  }
}

export async function getLatestFunctionCoreToolsVersion(context: IActionContext, majorVersion: string): Promise<string> {
  context.telemetry.properties.funcCoreTools = majorVersion;

  // Use npm to find newest func core tools version
  const hasNodeJs = await isNodeJsInstalled();
  let latestVersion: string | null;
  if (majorVersion && hasNodeJs) {
    context.telemetry.properties.latestVersionSource = 'node';
    const npmCommand = getNpmCommand();
    try {
      latestVersion = (await executeCommand(undefined, undefined, `${npmCommand}`, 'view', funcPackageName, 'version'))?.trim();
      if (checkMajorVersion(latestVersion, majorVersion)) {
        return latestVersion;
      }
    } catch (error) {
      console.log(error);
    }
  } else if (majorVersion) {
    // fallback to github api to look for latest version
    await readJsonFromUrl('https://api.github.com/repos/Azure/azure-functions-core-tools/releases/latest').then(
      (response: IGitHubReleaseInfo) => {
        latestVersion = semver.valid(semver.coerce(response.tag_name));
        context.telemetry.properties.latestVersionSource = 'github';
        context.telemetry.properties.latestGithubVersion = response.tag_name;
        if (checkMajorVersion(latestVersion, majorVersion)) {
          return latestVersion;
        }
      }
    );
  }

  // Fall back to hardcoded version
  context.telemetry.properties.getLatestFunctionCoreToolsVersion = 'fallback';
  return DependencyVersion.funcCoreTools;
}

export async function getLatestDotNetVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.dotNetMajorVersion = majorVersion;

  if (majorVersion) {
    await readJsonFromUrl('https://api.github.com/repos/dotnet/sdk/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.latestVersionSource = 'github';
        response.forEach((releaseInfo: IGitHubReleaseInfo) => {
          const releaseVersion: string | null = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (checkMajorVersion(releaseVersion, majorVersion)) {
            return releaseVersion;
          }
        });
      })
      .catch((error) => {
        throw Error(localize('errorNewestDotNetVersion', `Error getting latest .NET SDK version: ${error}`));
      });
  }

  context.telemetry.properties.latestVersionSource = 'fallback';
  return DependencyVersion.dotnet6;
}

export async function getLatestNodeJsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.nodeMajorVersion = majorVersion;

  if (majorVersion) {
    await readJsonFromUrl('https://api.github.com/repos/nodejs/node/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.latestVersionSource = 'github';
        response.forEach((releaseInfo: IGitHubReleaseInfo) => {
          const releaseVersion = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (checkMajorVersion(releaseVersion, majorVersion)) {
            return releaseVersion;
          }
        });
      })
      .catch((error) => {
        throw Error(localize('errorNewestNodeJsVersion', `Error getting latest Node JS version: ${error}`));
      });
  }

  context.telemetry.properties.latestVersionSource = 'fallback';
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

export function getDotNetBinariesReleaseUrl(): string {
  return process.platform == Platform.windows ? 'https://dot.net/v1/dotnet-install.ps1' : 'https://dot.net/v1/dotnet-install.sh';
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
      throw new Error(`Request failed with status: ${response.status}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error reading JSON from URL: ${error.message}`);
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

async function extractBinaries(binariesFilePath: string, targetFolder: string, dependencyName: string): Promise<void> {
  await executeCommand(ext.outputChannel, undefined, 'echo', `Extracting ${binariesFilePath}`);
  try {
    if (binariesFilePath.endsWith('.zip')) {
      const zip = new AdmZip(binariesFilePath);
      await zip.extractAllTo(targetFolder, /* overwrite */ true, /* Permissions */ true);
    } else {
      await executeCommand(ext.outputChannel, undefined, 'tar', `-xzvf`, binariesFilePath, '-C', targetFolder);
    }
    cleanupContainerFolder(targetFolder);
    await executeCommand(ext.outputChannel, undefined, 'echo', `Extraction ${dependencyName} successfully completed.`);
  } catch (error) {
    throw new Error(`Error extracting ${dependencyName}: ${error}`);
  }
}

function checkMajorVersion(version: string, majorVersion: string): boolean {
  return semver.major(version) === Number(majorVersion);
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

/**
 * Gets dependency timeout setting value from workspace settings.
 * @param {IActionContext} context - Command context.
 * @returns {number} Timeout value in seconds.
 */
function getDependencyTimeout(): number {
  const dependencyTimeoutValue: number | undefined = getWorkspaceSetting<number>(dependencyTimeoutSettingKey);
  const timeoutInSeconds = Number(dependencyTimeoutValue);
  if (isNaN(timeoutInSeconds)) {
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
export async function promptInstallBinariesOption(context: IActionContext) {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspace = await getWorkspaceFolder(context);
    const projectPath = await tryGetFunctionProjectRoot(context, workspace);
    const message = localize('useBinaries', 'Always validate and install the latest dependency binaries at launch');
    const confirm = { title: localize('yesRecommended', 'Yes (Recommended)') };
    let result: vscode.MessageItem;

    const binariesInstallation = getGlobalSetting(autoBinariesInstallationSetting);

    if (projectPath && binariesInstallation === undefined) {
      result = await context.ui.showWarningMessage(message, confirm, DialogResponses.dontWarnAgain);
      if (result === confirm) {
        await updateGlobalSetting(autoBinariesInstallationSetting, true);
        context.telemetry.properties.autoBinariesInstallation = 'true';
      } else if (result === DialogResponses.dontWarnAgain) {
        await updateGlobalSetting(autoBinariesInstallationSetting, false);
        context.telemetry.properties.autoBinariesInstallation = 'false';
      }
    }
  }
}
