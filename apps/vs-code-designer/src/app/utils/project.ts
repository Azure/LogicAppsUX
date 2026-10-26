/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fse from 'fs-extra';
import { hasCodefulSdkReference, hasCodefulWorkflowSetting } from './codeful';
import { tryGetLogicAppCustomCodeFunctionsProjects } from './customCodeUtils';
import { ProjectType, ProjectPackageType } from '@microsoft/vscode-extension-logic-apps';

/**
 * Detects the Logic App project type at the given path by inspecting
 * project files, settings, and sibling folders.
 */
export async function detectProjectType(projectPath: string): Promise<ProjectType> {
  if ((await hasCodefulWorkflowSetting(projectPath)) || (await hasCodefulSdkReference(projectPath))) {
    return ProjectType.codeful;
  }

  const customCodeProjects = await tryGetLogicAppCustomCodeFunctionsProjects(projectPath);
  if (customCodeProjects && customCodeProjects.length > 0) {
    return ProjectType.customCode;
  }

  return ProjectType.logicApp;
}

/**
 * Detects the project package type (packaging model) at the given path.
 */
export async function detectProjectPackageType(projectPath: string): Promise<ProjectPackageType> {
  if (await hasDotnetProjectFile(projectPath)) {
    return ProjectPackageType.Nuget;
  }
  return ProjectPackageType.Bundle;
}

/**
 * Checks whether the folder contains a `.csproj` or `.fsproj` file.
 */
async function hasDotnetProjectFile(folderPath: string): Promise<boolean> {
  try {
    const files = await fse.readdir(folderPath);
    return files.some((f) => (f.endsWith('.csproj') || f.endsWith('.fsproj')) && f.toLowerCase() !== 'extensions.csproj');
  } catch {
    return false;
  }
}
