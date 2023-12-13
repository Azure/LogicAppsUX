/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { ProjectFile } from '../dotnet/dotnet';
import { getDotnetDebugSubpath, getProjFiles, getTargetFramework } from '../dotnet/dotnet';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { DialogResponses, openUrl, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage, type ITask, type ITaskInputs } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import { workspace } from 'vscode';
import type { MessageItem, TaskDefinition, WorkspaceConfiguration, WorkspaceFolder } from 'vscode';

const tasksKey = 'tasks';
const inputsKey = 'inputs';
const versionKey = 'version';

/**
 * Gets tasks property of tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {ITask[]} Tasks configuration.
 */
export function getTasks(folder: WorkspaceFolder): ITask[] {
  return getTasksConfig(folder).get<ITask[]>(tasksKey) || [];
}

/**
 * Gets inputs property of tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {ITaskInputs[]} Inputs configuration.
 */
export function getInputs(folder: WorkspaceFolder): ITaskInputs[] {
  return getTasksConfig(folder).get<ITaskInputs[]>(inputsKey) || [];
}

/**
 * Gets version property of tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {string | undefined} Tasks.json version.
 */
export function getTasksVersion(folder: WorkspaceFolder): string | undefined {
  return getTasksConfig(folder).get<string>(versionKey);
}

/**
 * Updates tasks property in tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {ITask[]} tasks - Tasks configuration to update to.
 */
export function updateTasks(folder: WorkspaceFolder, tasks: ITask[]): void {
  getTasksConfig(folder).update(tasksKey, tasks);
}

/**
 * Updates inputs property in tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {ITaskInputs[]} inputs - Inputs configuration to update.
 */
export function updateInputs(folder: WorkspaceFolder, inputs: ITaskInputs[]): void {
  getTasksConfig(folder).update(inputsKey, inputs);
}

/**
 * Updates version property in tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {string} version - Version to update to.
 */
export function updateTasksVersion(folder: WorkspaceFolder, version: string): void {
  getTasksConfig(folder).update(versionKey, version);
}

/**
 * Gets tasks workspace configuration.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {WorkspaceConfiguration} Workspace configuration.
 */
function getTasksConfig(folder: WorkspaceFolder): WorkspaceConfiguration {
  return workspace.getConfiguration(tasksKey, folder.uri);
}

/**
 * Validates the tasks.json is compatible with binary dependency use.
 */
export async function validateTasksJson(context: IActionContext, folders: ReadonlyArray<WorkspaceFolder> | undefined): Promise<void> {
  context.telemetry.properties.lastStep = 'validateTasksJson';
  let overwrite = false;

  try {
    if (folders) {
      for (const folder of folders) {
        const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, folder);
        context.telemetry.properties.projectPath = projectPath;
        if (projectPath) {
          const tasksJsonPath: string = path.join(projectPath, '.vscode', 'tasks.json');

          if (!fse.existsSync(tasksJsonPath)) {
            throw new Error(localize('noTaskJson', `Failed to find: ${tasksJsonPath}`));
          }

          const taskJsonData = fse.readFileSync(tasksJsonPath, 'utf-8');
          const taskJson = JSON.parse(taskJsonData);
          const tasks: TaskDefinition[] = taskJson.tasks;

          if (tasks && Array.isArray(tasks)) {
            tasks.forEach((task) => {
              const command: string = task.command;
              if (!command.startsWith('${config:azureLogicAppsStandard')) {
                context.telemetry.properties.overwrite = 'true';
                overwrite = true;
              }
            });
          }
        }

        if (overwrite) {
          await overwriteTasksJson(context, projectPath);
        }
      }
    }
  } catch (error) {
    ext.outputChannel.appendLine(error.message);
    context.telemetry.properties.error = error.message;
  }
}

/**
 * Overwrites the tasks.json file with the specified content.
 * @param projectPath The project path.
 **/
async function overwriteTasksJson(context: IActionContext, projectPath: string): Promise<void> {
  if (projectPath) {
    const message =
      'The Azure Logic Apps extension must update the tasks.json file to use the required and installed binary dependencies for Node JS, .NET Framework, and Azure Functions Core Tools. This update overwrites any custom-defined tasks you might have.' +
      '\n\nSelecting "Cancel" leaves the file unchanged, but shows this message when you open this project again.' +
      '\n\nContinue with the update?';

    const tasksJsonPath: string = path.join(projectPath, '.vscode', 'tasks.json');
    let tasksJsonContent;

    const projectFiles = [
      ...(await getProjFiles(context, ProjectLanguage.CSharp, projectPath)),
      ...(await getProjFiles(context, ProjectLanguage.FSharp, projectPath)),
    ];
    if (projectFiles.length > 0) {
      context.telemetry.properties.isNugetProj = 'true';
      const commonArgs: string[] = ['/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'];
      const releaseArgs: string[] = ['--configuration', 'Release'];

      let projFile: ProjectFile;
      const projFiles = [
        ...(await getProjFiles(context, ProjectLanguage.FSharp, projectPath)),
        ...(await getProjFiles(context, ProjectLanguage.CSharp, projectPath)),
      ];

      if (projFiles.length === 1) {
        projFile = projFiles[0];
      } else if (projFiles.length === 0) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(
          localize('projNotFound', 'Failed to find {0} file in folder "{1}".', 'csproj or fsproj', path.basename(projectPath))
        );
      } else {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(
          localize(
            'projNotFound',
            'Expected to find a single {0} file in folder "{1}", but found multiple instead: {2}.',
            `csproj or fsproj`,
            path.basename(projectPath),
            projFiles.join(', ')
          )
        );
      }

      const targetFramework: string = await getTargetFramework(projFile);
      const debugSubpath = getDotnetDebugSubpath(targetFramework);
      tasksJsonContent = {
        version: '2.0.0',
        tasks: [
          {
            label: 'generateDebugSymbols',
            command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
            args: ['${input:getDebugSymbolDll}'],
            type: 'process',
            problemMatcher: '$msCompile',
          },
          {
            label: 'clean',
            command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
            args: ['clean', ...commonArgs],
            type: 'process',
            problemMatcher: '$msCompile',
          },
          {
            label: 'build',
            command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
            args: ['build', ...commonArgs],
            type: 'process',
            dependsOn: 'clean',
            group: {
              kind: 'build',
              isDefault: true,
            },
            problemMatcher: '$msCompile',
          },
          {
            label: 'clean release',
            command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
            args: [...releaseArgs, ...commonArgs],
            type: 'process',
            problemMatcher: '$msCompile',
          },
          {
            label: 'publish',
            command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
            args: ['publish', ...releaseArgs, ...commonArgs],
            type: 'process',
            dependsOn: 'clean release',
            problemMatcher: '$msCompile',
          },
          {
            label: 'func: host start',
            dependsOn: 'build',
            type: 'shell',
            command: '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}',
            args: ['host', 'start'],
            options: {
              cwd: debugSubpath,
              env: {
                PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\\\NodeJs;${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\\\DotNetSDK;$env:PATH',
              },
            },
            problemMatcher: '$func-watch',
            isBackground: true,
          },
        ],
        inputs: [
          {
            id: 'getDebugSymbolDll',
            type: 'command',
            command: 'azureLogicAppsStandard.getDebugSymbolDll',
          },
        ],
      };
    } else {
      context.telemetry.properties.isNugetProj = 'false';
      tasksJsonContent = {
        version: '2.0.0',
        tasks: [
          {
            label: 'generateDebugSymbols',
            command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
            args: ['${input:getDebugSymbolDll}'],
            type: 'process',
            problemMatcher: '$msCompile',
          },
          {
            type: 'shell',
            command: '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}',
            args: ['host', 'start'],
            options: {
              env: {
                PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\\\NodeJs;${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\\\DotNetSDK;$env:PATH',
              },
            },
            problemMatcher: '$func-watch',
            isBackground: true,
            label: 'func: host start',
            group: {
              kind: 'build',
              isDefault: true,
            },
          },
        ],
        inputs: [
          {
            id: 'getDebugSymbolDll',
            type: 'command',
            command: 'azureLogicAppsStandard.getDebugSymbolDll',
          },
        ],
      };
    }

    // Add a "Don't warn again" option?
    if (await confirmOverwriteFile(context, tasksJsonPath, message)) {
      await fse.writeFile(tasksJsonPath, JSON.stringify(tasksJsonContent, null, 2));
    }
  }
}

/**
 * Displays warning message to select if desire to overwrite file.
 * @param {IActionContext} context - Command context.
 * @param {string} fsPath - File path.
 * @param {string} message - Message.
 * @returns {Promise<boolean>} True if user wants to overwrite file.
 */
async function confirmOverwriteFile(context: IActionContext, fsPath: string, message?: string): Promise<boolean> {
  if (await fse.pathExists(fsPath)) {
    let result: MessageItem;
    do {
      result = await context.ui.showWarningMessage(
        localize('fileAlreadyExists', message),
        { modal: true },
        DialogResponses.yes,
        DialogResponses.learnMore
      );
      if (result === DialogResponses.learnMore) {
        await openUrl('https://learn.microsoft.com/en-us/azure/logic-apps/create-single-tenant-workflows-visual-studio-code');
      } else if (result === DialogResponses.yes) {
        return true;
      } else {
        return false;
      }
    } while (result === DialogResponses.learnMore);
  }
}
