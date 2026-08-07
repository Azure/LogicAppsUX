/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager, funcDependencyName, funcPackageName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import {
  downloadAndExtractDependency,
  ensureRuntimeDependenciesDir,
  getCpuArchitecture,
  getFunctionCoreToolsBinariesReleaseUrl,
  getLatestFunctionCoreToolsVersion,
} from '../../utils/binaries';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getBrewPackageName } from '../../utils/funcCoreTools/getBrewPackageName';
import { getNpmDistTag } from '../../utils/funcCoreTools/getNpmDistTag';
import { promptForFuncVersion } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { Platform, type FuncVersion, type INpmDistTag } from '@microsoft/vscode-extension-logic-apps';
import { localize } from 'vscode-nls';

interface InFlightFuncInstall {
  majorVersion?: string;
  work: Promise<void>;
}

/**
 * Tracks the install currently writing to the shared runtime-dependencies folder. `downloadAndExtractDependency`
 * stages into a shared temp folder and `extractDependency` deletes and recreates the target folder, so two
 * concurrent installs would corrupt each other's output.
 */
let inFlightFuncInstall: InFlightFuncInstall | undefined;

/**
 * Whether an extension-managed Functions Core Tools install is currently running in this window.
 * @returns {boolean} True while an install is in progress.
 */
export function isFuncCoreToolsInstallInFlight(): boolean {
  return inFlightFuncInstall !== undefined;
}

/**
 * Waits for the in-flight extension-managed Functions Core Tools install (if any) to settle. Never rejects:
 * the failure belongs to whoever started the install, callers here only need the folder to stop changing
 * before they re-probe the binaries.
 */
export async function waitForFuncCoreToolsInstall(): Promise<void> {
  while (inFlightFuncInstall) {
    const current = inFlightFuncInstall;
    try {
      await current.work;
    } catch {
      // Owned and reported by the caller that started this install.
    }
    if (inFlightFuncInstall === current) {
      // The owner always clears its entry before its promise settles; bail out rather than spin
      // if that invariant is ever broken.
      break;
    }
  }
}

/**
 * Installs the extension-managed Functions Core Tools binaries, ensuring only one install writes to the
 * shared dependencies folder at a time. A concurrent request for the same major version joins the running
 * install; a request for a different version waits for it to finish first.
 * @param {IActionContext} context - Command context.
 * @param {string} majorVersion - Optional major version to install. Defaults to the latest.
 */
export async function installFuncCoreToolsBinaries(context: IActionContext, majorVersion?: string): Promise<void> {
  while (inFlightFuncInstall) {
    const current = inFlightFuncInstall;
    if (current.majorVersion === majorVersion) {
      context.telemetry.properties.funcInstallCoalesced = 'true';
      return current.work;
    }
    context.telemetry.properties.funcInstallSerialized = 'true';
    try {
      await current.work;
    } catch {
      // Failures belong to the caller that started that install; we only need the folder to settle.
    }
    if (inFlightFuncInstall === current) {
      break;
    }
  }

  const entry: InFlightFuncInstall = { majorVersion, work: Promise.resolve() };
  inFlightFuncInstall = entry;
  entry.work = downloadFuncCoreToolsBinaries(context, majorVersion).finally(() => {
    if (inFlightFuncInstall === entry) {
      inFlightFuncInstall = undefined;
    }
  });

  return entry.work;
}

async function downloadFuncCoreToolsBinaries(context: IActionContext, majorVersion?: string): Promise<void> {
  const arch = getCpuArchitecture();
  const targetDirectory = await ensureRuntimeDependenciesDir();
  context.telemetry.properties.lastStep = 'getLatestFunctionCoreToolsVersion';
  const version = await getLatestFunctionCoreToolsVersion(context, majorVersion);
  let azureFunctionCoreToolsReleasesUrl: string;

  context.telemetry.properties.lastStep = 'getFunctionCoreToolsBinariesReleaseUrl';
  switch (process.platform) {
    case Platform.windows: {
      azureFunctionCoreToolsReleasesUrl = getFunctionCoreToolsBinariesReleaseUrl(version, 'win', arch);
      break;
    }

    case Platform.linux: {
      azureFunctionCoreToolsReleasesUrl = getFunctionCoreToolsBinariesReleaseUrl(version, 'linux', arch);
      break;
    }

    case Platform.mac: {
      azureFunctionCoreToolsReleasesUrl = getFunctionCoreToolsBinariesReleaseUrl(version, 'osx', arch);
      break;
    }

    default: {
      throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
  context.telemetry.properties.lastStep = 'downloadAndExtractBinaries';
  await downloadAndExtractDependency(context, azureFunctionCoreToolsReleasesUrl, targetDirectory, funcDependencyName);
}

export async function installFuncCoreToolsSystem(
  context: IActionContext,
  packageManagers: PackageManager[],
  version?: FuncVersion
): Promise<void> {
  version = version || (await promptForFuncVersion(context, localize('selectVersion', 'Select the version of the runtime to install')));

  ext.outputChannel.show();

  const distTag: INpmDistTag = await getNpmDistTag(context, version);
  const brewPackageName: string = getBrewPackageName(version);

  switch (packageManagers[0]) {
    case PackageManager.npm: {
      await executeCommand(ext.outputChannel, undefined, 'npm', 'install', '-g', `${funcPackageName}@${distTag.tag}`);
      break;
    }
    case PackageManager.brew: {
      await executeCommand(ext.outputChannel, undefined, 'brew', 'tap', 'azure/functions');
      await executeCommand(ext.outputChannel, undefined, 'brew', 'install', brewPackageName);
      break;
    }
    default:
      throw new RangeError(localize('invalidPackageManager', 'Invalid package manager "{0}".', packageManagers[0]));
  }
}
