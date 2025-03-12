import * as fse from 'fs-extra';
import * as path from 'path';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import type { WorkspaceFolder } from 'vscode';

/**
 * Checks if the folder is a custom code functions project.
 * @param {string} folderPath - The folder path.
 * @returns {Promise<boolean>} Returns true if the folder is a custom code functions project, otherwise false.
 */
export async function isCustomCodeFunctionsProject(folderPath: string): Promise<boolean> {
  if (!fse.statSync(folderPath).isDirectory()) {
    return false;
  }
  const files = await fse.readdir(folderPath);
  const csprojFile = files.find((file) => file.endsWith('.csproj'));
  if (!csprojFile) {
    return false;
  }

  const csprojContent = await fse.readFile(path.join(folderPath, csprojFile), 'utf-8');
  return isCustomCodeNet8Csproj(csprojContent) || isCustomCodeNetFxCsproj(csprojContent);
}

function isCustomCodeNet8Csproj(csprojContent: string): boolean {
  return (
    csprojContent.includes('<TargetFramework>net8</TargetFramework>') &&
    csprojContent.includes('Microsoft.Azure.Workflows.Webjobs.Sdk') &&
    csprojContent.includes('<LogicAppFolderToPublish>')
  );
}

function isCustomCodeNetFxCsproj(csprojContent: string): boolean {
  return (
    csprojContent.includes('<TargetFramework>net472</TargetFramework>') &&
    csprojContent.includes('Microsoft.Azure.Workflows.WebJobs.Sdk') &&
    csprojContent.includes('<LogicAppFolder>')
  );
}

/**
 * Checks if the workspace root folder contains a custom code functions project.
 * @param {WorkspaceFolder | string | undefined} workspaceFolder - The workspace folder or its path.
 * @returns {Promise<boolean | undefined>} Returns true if a custom code functions project is found, otherwise false.
 */
export async function isCustomCodeFunctionsProjectInRoot(
  workspaceFolder: WorkspaceFolder | string | undefined
): Promise<boolean | undefined> {
  if (isNullOrUndefined(workspaceFolder)) {
    return undefined;
  }
  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(folderPath))) {
    return undefined;
  }

  const subpaths: string[] = await fse.readdir(folderPath);
  const customCodeProjectPaths: string[] = [];
  await Promise.all(
    subpaths.map(async (s) => {
      const currPath = path.join(folderPath, s);
      if (await isCustomCodeFunctionsProject(currPath)) {
        customCodeProjectPaths.push(currPath);
      }
    })
  );

  return customCodeProjectPaths.length > 0;
}

/**
 * Checks workspace root folder for custom code functions project.
 * @param {IActionContext} context - The action context.
 * @param {WorkspaceFolder | string | undefined} workspaceFolder - The workspace folder.
 * @returns {Promise<string | undefined>} Returns the path to the custom code functions project if found, otherwise returns undefined.
 */
export async function tryGetCustomCodeFunctionsProjects(
  workspaceFolder: WorkspaceFolder | string | undefined
): Promise<string[] | undefined> {
  if (isNullOrUndefined(workspaceFolder)) {
    return undefined;
  }
  const workspaceFolderPath: string | undefined = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(workspaceFolderPath))) {
    return undefined;
  }

  const subpaths: string[] = await fse.readdir(workspaceFolderPath);
  const customCodeProjectPaths: string[] = [];
  await Promise.all(
    subpaths.map(async (s) => {
      const currPath = path.join(workspaceFolderPath, s);
      if (await isCustomCodeFunctionsProject(currPath)) {
        customCodeProjectPaths.push(currPath);
      }
    })
  );

  return customCodeProjectPaths;
}
