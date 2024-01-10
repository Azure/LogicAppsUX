/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DotnetVersion,
  Platform,
  autoRuntimeDependenciesPathSettingKey,
  dotNetBinaryPathSettingKey,
  dotnetDependencyName,
  isolatedSdkName,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { runWithDurationTelemetry } from '../telemetry';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { getGlobalSetting, updateGlobalSetting, updateWorkspaceSetting } from '../vsCodeConfig/settings';
import { findFiles, getWorkspaceFolder } from '../workspace';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzExtFsExtra } from '@microsoft/vscode-azext-utils';
import type { IWorkerRuntime } from '@microsoft/vscode-extension';
import { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';

export class ProjectFile {
  public name: string;
  public fullPath: string;
  private cachedContents: string | undefined;

  constructor(name: string, projectPath: string) {
    this.name = name;
    this.fullPath = path.join(projectPath, name);
  }

  public async getContents(): Promise<string> {
    if (this.cachedContents === undefined) {
      this.cachedContents = await AzExtFsExtra.readFile(this.fullPath);
    }
    return this.cachedContents;
  }
}

/**
 * Gets .NET files from workspace.
 * @param {IActionContext} context - Command context.
 * @param {ProjectLanguage} projectLanguage - Language from project.
 * @param {string} projectPath - Workspace path.
 * @returns {Promise<ProjectFile[]>} Array of files.
 */
export async function getProjFiles(context: IActionContext, projectLanguage: ProjectLanguage, projectPath: string): Promise<ProjectFile[]> {
  return await runWithDurationTelemetry(context, 'getNetProjFiles', async () => {
    const pattern = projectLanguage === ProjectLanguage.FSharp ? '*.fsproj' : '*.csproj';
    const uris = await findFiles(projectPath, pattern);
    return uris
      .map((uri) => path.basename(uri.fsPath))
      .filter((f) => f.toLowerCase() !== 'extensions.csproj')
      .map((f) => new ProjectFile(f, projectPath));
  });
}

/**
 * Checks if the project file has isolated azure functions sdk.
 * @param {ProjectFile} projFile - File.
 * @returns {Promise<string>} Returns true if it has isolated sdk, otherwise returns false.
 */
export async function getIsIsolated(projFile: ProjectFile): Promise<boolean> {
  try {
    return (await projFile.getContents()).toLowerCase().includes(isolatedSdkName.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Gets template key.
 * @param {string} targetFramework - Target framework for template.
 * @param {boolean} isIsolated - Project path.
 * @returns {string} Template key.
 */
function getProjectTemplateKey(targetFramework: string, isIsolated: boolean): string {
  // Remove any OS-specific stuff from target framework if present https://docs.microsoft.com/dotnet/standard/frameworks#net-5-os-specific-tfms
  let result = targetFramework.split('-')[0];
  if (isIsolated) {
    result += '-isolated';
  }
  return result;
}

/**
 * Gets property in project file.
 * @param {ProjectFile} projFile - File.
 * @param {string} property - Property key name.
 * @returns {Promise<string>} Property value.
 */
async function getPropertyInProjFile(projFile: ProjectFile, property: string): Promise<string> {
  const regExp = new RegExp(`<${property}>(.*)<\\/${property}>`);
  const matches: RegExpMatchArray | null = (await projFile.getContents()).match(regExp);
  if (!matches) {
    throw new Error(localize('failedToFindProp', 'Failed to find "{0}" in project file "{1}".', property, projFile.name));
  } else {
    return matches[1];
  }
}

/**
 * Gets target framework property in project file.
 * @param {ProjectFile} projFile - File.
 * @returns {Promise<string>} Property value.
 */
export async function getTargetFramework(projFile: ProjectFile): Promise<string> {
  return await getPropertyInProjFile(projFile, 'TargetFramework');
}

/**
 * Gets template key from project file or from framework version.
 * @param {IActionContext} context - Command context.
 * @param {string | undefined} projectPath - Project path.
 * @param {FuncVersion} version - Functions core tools version.
 * @param {ProjectLanguage} language - Project language.
 * @returns {Promise<string>} Template key.
 */
export async function getTemplateKeyFromProjFile(
  context: IActionContext,
  projectPath: string | undefined,
  version: FuncVersion,
  language: ProjectLanguage
): Promise<string> {
  let isIsolated = false;
  let targetFramework: string;

  switch (version) {
    case FuncVersion.v4:
      targetFramework = DotnetVersion.net6;
      break;
    case FuncVersion.v3:
      targetFramework = DotnetVersion.net3;
      break;
    case FuncVersion.v2:
      targetFramework = DotnetVersion.net2;
      break;
    case FuncVersion.v1:
      targetFramework = DotnetVersion.net48;
      break;
  }

  if (projectPath && (await AzExtFsExtra.pathExists(projectPath))) {
    const projFiles = await getProjFiles(context, language, projectPath);
    if (projFiles.length === 1) {
      targetFramework = await getTargetFramework(projFiles[0]);
      isIsolated = await getIsIsolated(projFiles[0]);
    }
  }

  return getProjectTemplateKey(targetFramework, isIsolated);
}

/**
 * Gets Dotnet debug path.
 * @param {string} targetFramework - Target framework for template.
 * @returns {string} Dotnet debug path.
 */
export function getDotnetDebugSubpath(targetFramework: string): string {
  return path.posix.join('bin', 'Debug', targetFramework);
}

/**
 * Gets azure functions version property in project file.
 * @param {ProjectFile} projFile - File.
 * @returns {Promise<string | undefined>} Property value.
 */
export async function tryGetFuncVersion(projFile: ProjectFile): Promise<string | undefined> {
  try {
    return await getPropertyInProjFile(projFile, 'AzureFunctionsVersion');
  } catch {
    return undefined;
  }
}

export function getTemplateKeyFromFeedEntry(runtimeInfo: IWorkerRuntime): string {
  const isIsolated = runtimeInfo.sdk.name.toLowerCase() === isolatedSdkName.toLowerCase();
  return getProjectTemplateKey(runtimeInfo.targetFramework, isIsolated);
}

export async function getLocalDotNetVersionFromBinaries(): Promise<string> {
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const dotNetBinariesPath = path.join(binariesLocation, dotnetDependencyName);
  const sdkVersionFolder = path.join(dotNetBinariesPath, 'sdk');

  // First try to get sdk from Binary installation folder
  const files = fs.existsSync(sdkVersionFolder) ? fs.readdirSync(sdkVersionFolder, { withFileTypes: true }) : null;
  if (Array.isArray(files)) {
    for (const file of files) {
      if (file.isDirectory()) {
        const version = file.name;
        await executeCommand(ext.outputChannel, undefined, 'echo', 'Local binary .NET SDK version', version);
        return version;
      }
    }
  }

  try {
    const output: string = await executeCommand(ext.outputChannel, undefined, `${getDotNetCommand()}`, '--version');
    const version: string | null = semver.clean(output);
    if (version) {
      return version;
    }
  } catch (error) {
    return null;
  }

  return null;
}

/**
 * Get the nodejs binaries executable or use the system nodejs executable.
 */
export function getDotNetCommand(): string {
  const command = getGlobalSetting<string>(dotNetBinaryPathSettingKey);
  return command;
}

export async function setDotNetCommand(context: IActionContext): Promise<void> {
  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const dotNetBinariesPath = path.join(binariesLocation, dotnetDependencyName);
  const binariesExist = fs.existsSync(dotNetBinariesPath);
  let command = ext.dotNetCliPath;
  if (binariesExist) {
    // Explicit executable for tasks.json
    command =
      process.platform == Platform.windows
        ? path.join(dotNetBinariesPath, `${ext.dotNetCliPath}.exe`)
        : path.join(dotNetBinariesPath, `${ext.dotNetCliPath}`);
    const newPath = `${dotNetBinariesPath}${path.delimiter}\${env:PATH}`;
    fs.chmodSync(dotNetBinariesPath, 0o777);

    try {
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceFolder = await getWorkspaceFolder(context);
        const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

        // Check if LogicAppProject to prevent updating LogicAppsUX settings.
        if (projectPath) {
          const pathEnv = {
            PATH: newPath,
          };

          // Required for dotnet cli in VSCode Terminal
          switch (process.platform) {
            case Platform.windows: {
              await updateWorkspaceSetting('integrated.env.windows', pathEnv, projectPath, 'terminal');
              break;
            }

            case Platform.linux: {
              await updateWorkspaceSetting('integrated.env.linux', pathEnv, projectPath, 'terminal');
              break;
            }

            case Platform.mac: {
              await updateWorkspaceSetting('integrated.env.osx', pathEnv, projectPath, 'terminal');
              break;
            }
          }
          // Required for CoreClr
          await updateWorkspaceSetting('dotNetCliPaths', [dotNetBinariesPath], projectPath, 'omnisharp');
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  await updateGlobalSetting<string>(dotNetBinaryPathSettingKey, command);
}
