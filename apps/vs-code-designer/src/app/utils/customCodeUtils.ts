import * as fse from 'fs-extra';
import * as path from 'path';
import { parseString } from 'xml2js';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import type { WorkspaceFolder } from 'vscode';
import { isLogicAppProject } from './verifyIsProject';
import { ext } from '../../extensionVariables';
import { getWorkspaceRoot } from './workspace';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';

export interface CustomCodeFunctionsProjectMetadata {
  projectPath: string;
  functionAppName: string;
  logicAppName: string;
  targetFramework: TargetFramework;
  namespace: string;
}

export async function getCustomCodeFunctionsProjects(context: IActionContext): Promise<string[]> {
  const workspaceRoot: string | undefined = await getWorkspaceRoot(context);

  if (isNullOrUndefined(workspaceRoot)) {
    return [];
  }

  const subpaths: string[] = await fse.readdir(workspaceRoot);
  const customCodeProjectPaths: string[] = [];
  await Promise.all(
    subpaths.map(async (s) => {
      const currPath = path.join(workspaceRoot, s);
      if (await isCustomCodeFunctionsProject(currPath)) {
        customCodeProjectPaths.push(currPath);
      }
    })
  );

  return customCodeProjectPaths;
}

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

/**
 * Gets the metadata of a custom code functions project.
 * @param {string} folderPath - The folder path of the custom code functions project.
 * @returns {Promise<CustomCodeFunctionsProjectMetadata | undefined>} Returns the metadata of the custom code functions project if found, otherwise undefined.
 */
export async function getCustomCodeFunctionsProjectMetadata(folderPath: string): Promise<CustomCodeFunctionsProjectMetadata | undefined> {
  if (isNullOrUndefined(folderPath) || !(await fse.pathExists(folderPath)) || !fse.statSync(folderPath).isDirectory()) {
    return undefined;
  }

  const files = await fse.readdir(folderPath);
  const csFile = files.find((file) => file.endsWith('.cs'));
  if (!csFile) {
    return undefined;
  }

  const csFileContent = await fse.readFile(path.join(folderPath, csFile), 'utf-8');
  const namespaceRegex = /namespace\s+([a-zA-Z0-9_.]+)/;
  const matches = csFileContent.match(namespaceRegex);
  if (!matches || matches.length < 2) {
    ext.outputChannel.appendLog(`Could not find a valid namespace in the file ${csFile}.`);
    return undefined;
  }
  const namespace = matches[1];

  const csprojFile = files.find((file) => file.endsWith('.csproj'));
  if (!csprojFile) {
    return undefined;
  }

  const csprojContentStr = await fse.readFile(path.join(folderPath, csprojFile), 'utf-8');
  return new Promise((resolve, _) => {
    parseString(csprojContentStr, (err, result) => {
      if (err) {
        ext.outputChannel.appendLog(`Error parsing csproj file: ${err}`);
        resolve(undefined);
      }

      if (isCustomCodeNet8Csproj(csprojContentStr)) {
        resolve({
          projectPath: folderPath,
          functionAppName: path.basename(path.normalize(folderPath)),
          logicAppName: path.win32.basename(path.win32.normalize(result.Project.PropertyGroup[0].LogicAppFolderToPublish[0])),
          targetFramework: TargetFramework.Net8,
          namespace: namespace,
        });
      }

      if (isCustomCodeNetFxCsproj(csprojContentStr)) {
        resolve({
          projectPath: folderPath,
          functionAppName: path.basename(path.normalize(folderPath)),
          logicAppName: path.win32.basename(path.win32.normalize(result.Project.PropertyGroup[0].LogicAppFolder[0])),
          targetFramework: TargetFramework.NetFx,
          namespace: namespace,
        });
      }

      ext.outputChannel.appendLog(
        `The csproj file in ${folderPath} does not match the expected format for a .Net 8 or .Net Framework custom code functions project.`
      );
      resolve(undefined);
    });
  });
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
 * TODO - this assumes that all custom code functions projects are in the workspace root folder.
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

/**
 * Searches for custom code functions projects corresponding to the target logic app.
 * @param {string} targetFolder - The folder of the logic app project to search for custom code functions projects.
 * @returns {Promise<string[] | undefined>} - The path to the custom code functions projects if found, otherwise returns undefined.
 */
export async function tryGetLogicAppCustomCodeFunctionsProjects(targetFolder: string): Promise<string[] | undefined> {
  if (isNullOrUndefined(targetFolder)) {
    return undefined;
  }

  if (!(await isLogicAppProject(targetFolder))) {
    return undefined;
  }

  const logicAppName = path.basename(path.normalize(targetFolder));
  const parentFolder = path.dirname(targetFolder);
  const subpaths: string[] = await fse.readdir(parentFolder);
  const customCodeProjectPaths: string[] = [];
  await Promise.all(
    subpaths.map(async (s) => {
      if (s === logicAppName) {
        return;
      }
      const currPath = path.join(parentFolder, s);
      if (await isCustomCodeFunctionsProjectForLogicApp(currPath, logicAppName)) {
        customCodeProjectPaths.push(currPath);
      }
    })
  );

  return customCodeProjectPaths;
}

async function isCustomCodeFunctionsProjectForLogicApp(folderPath: string, logicAppName: string): Promise<boolean> {
  if (!(await isCustomCodeFunctionsProject(folderPath))) {
    return false;
  }

  const csprojFile = (await fse.readdir(folderPath)).find((file) => file.endsWith('.csproj'));
  const csprojContent = await fse.readFile(path.join(folderPath, csprojFile), 'utf-8');
  if (isCustomCodeNet8Csproj(csprojContent)) {
    return csprojContent.includes(`<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\${logicAppName}</LogicAppFolderToPublish>`);
  }
  if (isCustomCodeNetFxCsproj(csprojContent)) {
    return csprojContent.includes(`<LogicAppFolder>${logicAppName}</LogicAppFolder>`);
  }

  ext.outputChannel.appendLog(`The csproj file in ${folderPath} does not match the expected format for a custom code functions project.`);
  return false;
}
