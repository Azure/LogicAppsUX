/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getProjFiles } from '../../utils/dotnet/dotnet';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';

/**
 * Returns the project language if we can uniquely detect it for this folder, otherwise returns undefined
 */
export async function detectProjectLanguage(context: IActionContext, projectPath: string): Promise<ProjectLanguage | undefined> {
  const detectedLangs: ProjectLanguage[] = await detectScriptLanguages(projectPath);

  if (await isJavaProject(projectPath)) {
    detectedLangs.push(ProjectLanguage.Java);
  }

  if (await isCSharpProject(context, projectPath)) {
    detectedLangs.push(ProjectLanguage.CSharp);
  }

  if (await isFSharpProject(context, projectPath)) {
    detectedLangs.push(ProjectLanguage.FSharp);
  }

  return detectedLangs.length === 1 ? detectedLangs[0] : undefined;
}

async function isJavaProject(projectPath: string): Promise<boolean> {
  return await fse.pathExists(path.join(projectPath, 'pom.xml'));
}

export async function isCSharpProject(context: IActionContext, projectPath: string): Promise<boolean> {
  return (await getProjFiles(context, ProjectLanguage.CSharp, projectPath)).length === 1;
}

async function isFSharpProject(context: IActionContext, projectPath: string): Promise<boolean> {
  return (await getProjFiles(context, ProjectLanguage.FSharp, projectPath)).length === 1;
}

/**
 * Script projects will always be in the following structure: <Root project dir>/<function dir>/<function script file>
 * To detect the language, we can check for any "function script file" that matches the well-known filename for each language
 */
async function detectScriptLanguages(projectPath: string): Promise<ProjectLanguage[]> {
  const subDirs: string[] = [];
  const subpaths: string[] = await fse.readdir(projectPath);
  for (const subpath of subpaths) {
    const fullPath: string = path.join(projectPath, subpath);
    const stats: fse.Stats = await fse.lstat(fullPath);
    if (stats.isDirectory()) {
      subDirs.push(fullPath);
    }
  }

  const detectedLangs: ProjectLanguage[] = [];
  for (const language of Object.values(ProjectLanguage)) {
    const functionFileName: string | undefined = getScriptFileNameFromLanguage(language);
    if (functionFileName) {
      for (const subDir of subDirs) {
        if (await fse.pathExists(path.join(subDir, functionFileName))) {
          detectedLangs.push(language);
          break;
        }
      }
    }
  }

  return detectedLangs;
}

export function getScriptFileNameFromLanguage(language: string): string | undefined {
  switch (language) {
    case ProjectLanguage.CSharpScript:
      return 'run.csx';
    case ProjectLanguage.FSharpScript:
      return 'run.fsx';
    case ProjectLanguage.JavaScript:
      return 'index.js';
    case ProjectLanguage.PowerShell:
      return 'run.ps1';
    case ProjectLanguage.TypeScript:
      return 'index.ts';
    default:
      return undefined;
  }
}
