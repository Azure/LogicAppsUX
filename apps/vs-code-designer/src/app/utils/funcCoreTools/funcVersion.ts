/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  autoRuntimeDependenciesPathSettingKey,
  funcCoreToolsBinaryPathSettingKey,
  funcDependencyName,
  funcVersionSetting,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getGlobalSetting, getWorkspaceSettingFromAnyFolder, updateGlobalSetting } from '../vsCodeConfig/settings';
import { executeCommand } from './cpUtils';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { FuncVersion, latestGAVersion } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

export function getFuncCoreToolsCandidatePaths(funcBinariesPath: string): string[] {
  const executableNames =
    process.platform === 'win32' && !ext.funcCliPath.toLowerCase().endsWith('.exe')
      ? [`${ext.funcCliPath}.exe`, ext.funcCliPath]
      : [ext.funcCliPath, `${ext.funcCliPath}.exe`];
  const uniqueExecutableNames = [...new Set(executableNames)];
  return ['', 'in-proc8', 'in-proc6'].flatMap((subdir) =>
    uniqueExecutableNames.map((executableName) => path.join(funcBinariesPath, subdir, executableName))
  );
}

function resolveFuncCoreToolsCommand(funcBinariesPath: string): string {
  const candidates = getFuncCoreToolsCandidatePaths(funcBinariesPath);
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function getManagedFuncCoreToolsPath(command?: string): string | undefined {
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const funcBinariesPath = binariesLocation ? path.join(binariesLocation, funcDependencyName) : undefined;
  if (!funcBinariesPath) {
    return undefined;
  }

  if (!command) {
    return fs.existsSync(funcBinariesPath) ? funcBinariesPath : undefined;
  }

  const relativePath = path.relative(funcBinariesPath, command);
  const isManagedCommand = relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  return isManagedCommand ? funcBinariesPath : undefined;
}

function getFuncCoreToolsExecutableRepairCandidates(funcBinariesPath: string): string[] {
  const executableNames = process.platform === 'win32' ? ['func.exe', 'func'] : ['func'];
  const knownCandidates = ['', 'in-proc8', 'in-proc6'].flatMap((subdir) =>
    executableNames.map((executableName) => path.join(funcBinariesPath, subdir, executableName))
  );
  const discoveredCandidates: string[] = [];
  const directoriesToScan = [funcBinariesPath];

  for (const directory of directoriesToScan) {
    if (!fs.existsSync(directory)) {
      continue;
    }

    try {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          directoriesToScan.push(entryPath);
        } else if (executableNames.includes(entry.name)) {
          discoveredCandidates.push(entryPath);
        }
      }
    } catch (error) {
      ext.outputChannel.appendLog(`Unable to inspect FuncCoreTools directory ${directory}: ${error}`);
    }
  }

  return [...new Set([...knownCandidates, ...discoveredCandidates])];
}

function getFuncCoreToolsDirectories(funcBinariesPath: string): string[] {
  const directoriesToScan = [funcBinariesPath];

  for (const directory of directoriesToScan) {
    if (!fs.existsSync(directory)) {
      continue;
    }

    try {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          directoriesToScan.push(path.join(directory, entry.name));
        }
      }
    } catch (error) {
      ext.outputChannel.appendLog(`Unable to inspect FuncCoreTools directory ${directory}: ${error}`);
    }
  }

  return [...new Set(directoriesToScan)];
}

function addExecutePermission(filePath: string): void {
  const stats = fs.statSync(filePath);
  fs.chmodSync(filePath, stats.mode | 0o111);
}

function isExecutable(filePath: string): boolean {
  if (process.platform === 'win32') {
    return true;
  }

  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function repairFuncCoreToolsExecutablePermissions(funcBinariesPath: string): void {
  if (process.platform === 'win32' || !fs.existsSync(funcBinariesPath)) {
    return;
  }

  const pathsToRepair = [...getFuncCoreToolsDirectories(funcBinariesPath), ...getFuncCoreToolsExecutableRepairCandidates(funcBinariesPath)];
  for (const candidate of pathsToRepair) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    try {
      addExecutePermission(candidate);
    } catch (error) {
      ext.outputChannel.appendLog(`Unable to set execute permission on FuncCoreTools file ${candidate}: ${error}`);
    }
  }
}

export function areFuncCoreToolsExecutablePermissionsValid(funcBinariesPath: string, selectedCommand?: string): boolean {
  if (process.platform === 'win32') {
    return true;
  }

  const candidates = selectedCommand
    ? [selectedCommand, ...getFuncCoreToolsExecutableRepairCandidates(funcBinariesPath)]
    : getFuncCoreToolsExecutableRepairCandidates(funcBinariesPath);
  return [...new Set(candidates)].every((candidate) => !fs.existsSync(candidate) || isExecutable(candidate));
}

export function ensureFuncCoreToolsCommandExecutablePermissions(command: string): boolean {
  const managedFuncBinariesPath = getManagedFuncCoreToolsPath(command);
  if (!managedFuncBinariesPath) {
    return true;
  }

  repairFuncCoreToolsExecutablePermissions(managedFuncBinariesPath);
  return areFuncCoreToolsExecutablePermissionsValid(managedFuncBinariesPath, command);
}

/**
 * Parses functions core tools version.
 * @param {string | undefined} data - Functions core tools package version.
 * @returns {FuncVersion | undefined} Parsed functions core tools version.
 */
export function tryParseFuncVersion(data: string | undefined): FuncVersion | undefined {
  if (data) {
    const majorVersion: string | undefined = tryGetMajorVersion(data);
    if (majorVersion) {
      return Object.values(FuncVersion).find((version) => version === `~${majorVersion}`);
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
  } catch {
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
    }
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
  } catch {
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
 *
 * The path is normally written to the global setting by `setFunctionsCommand` after binary install.
 * In a freshly opened window the install is still racing with whatever the user does next, so we
 * also self-heal here: if the global setting is empty but the binaries already exist on disk
 * (which they do once `installBinaries` finishes in any window), we run `setFunctionsCommand`
 * synchronously and re-read the setting.
 */
export function getFunctionsCommand(): string {
  let command = getGlobalSetting<string>(funcCoreToolsBinaryPathSettingKey);
  if (!command) {
    const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
    const funcBinariesPath = binariesLocation ? path.join(binariesLocation, funcDependencyName) : undefined;
    if (funcBinariesPath && fs.existsSync(funcBinariesPath)) {
      repairFuncCoreToolsExecutablePermissions(funcBinariesPath);
      const candidate = resolveFuncCoreToolsCommand(funcBinariesPath);
      if (fs.existsSync(candidate)) {
        command = candidate;
      }
    }
  }

  if (!command) {
    throw Error('Functions Core Tools Binary Path Setting is empty');
  }

  ensureFuncCoreToolsCommandExecutablePermissions(command);
  return command;
}

export async function setFunctionsCommand(): Promise<void> {
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  let command = ext.funcCliPath;
  if (binariesLocation) {
    const funcBinariesPath = path.join(binariesLocation, funcDependencyName);
    const binariesExist = fs.existsSync(funcBinariesPath);
    if (binariesExist) {
      repairFuncCoreToolsExecutablePermissions(funcBinariesPath);
      command = resolveFuncCoreToolsCommand(funcBinariesPath);
    }
  }

  await updateGlobalSetting<string>(funcCoreToolsBinaryPathSettingKey, command);
}
