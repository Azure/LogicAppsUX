/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DotnetVersion } from '../../../constants';
import { localize } from '../../../localize';
import { runWithDurationTelemetry } from '../telemetry';
import { findFiles } from '../workspace';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzExtFsExtra } from '@microsoft/vscode-azext-utils';
import { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension';
import * as path from 'path';

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

export const isolatedSdkName = 'Microsoft.Azure.Functions.Worker.Sdk';

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

export async function getIsIsolated(projFile: ProjectFile): Promise<boolean> {
  try {
    return (await projFile.getContents()).toLowerCase().includes(isolatedSdkName.toLowerCase());
  } catch {
    return false;
  }
}

function getProjectTemplateKey(targetFramework: string, isIsolated: boolean): string {
  // Remove any OS-specific stuff from target framework if present https://docs.microsoft.com/dotnet/standard/frameworks#net-5-os-specific-tfms
  let result = targetFramework.split('-')[0];
  if (isIsolated) {
    result += '-isolated';
  }
  return result;
}

async function getPropertyInProjFile(projFile: ProjectFile, prop: string): Promise<string> {
  const regExp = new RegExp(`<${prop}>(.*)<\\/${prop}>`);
  const matches: RegExpMatchArray | null = (await projFile.getContents()).match(regExp);
  if (!matches) {
    throw new Error(localize('failedToFindProp', 'Failed to find "{0}" in project file "{1}".', prop, projFile.name));
  } else {
    return matches[1];
  }
}

export async function getTargetFramework(projFile: ProjectFile): Promise<string> {
  return await getPropertyInProjFile(projFile, 'TargetFramework');
}

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

export function getDotnetDebugSubpath(targetFramework: string): string {
  return path.posix.join('bin', 'Debug', targetFramework);
}

export async function tryGetFuncVersion(projFile: ProjectFile): Promise<string | undefined> {
  try {
    return await getPropertyInProjFile(projFile, 'AzureFunctionsVersion');
  } catch {
    return undefined;
  }
}
