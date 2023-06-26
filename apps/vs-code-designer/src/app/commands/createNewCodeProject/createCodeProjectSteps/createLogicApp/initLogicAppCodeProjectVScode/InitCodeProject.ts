/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  func,
  projectLanguageSetting,
  funcVersionSetting,
  tasksVersion,
  tasksFileName,
  launchVersion,
  settingsFileName,
  preDeployTaskSetting,
  launchFileName,
  extensionsFileName,
  extensionCommand,
  functionsExtensionId,
} from '../../../../../../constants';
import { ext } from '../../../../../../extensionVariables';
import { localize } from '../../../../../../localize';
import { isSubpath, confirmEditJsonFile, confirmOverwriteFile } from '../../../../../utils/fs';
import {
  getDebugConfigs,
  getLaunchVersion,
  isDebugConfigEqual,
  updateDebugConfigs,
  updateLaunchVersion,
} from '../../../../../utils/vsCodeConfig/launch';
import { updateWorkspaceSetting } from '../../../../../utils/vsCodeConfig/settings';
import {
  getTasksVersion,
  updateTasksVersion,
  updateTasks,
  getTasks,
  updateInputs,
  getInputs,
} from '../../../../../utils/vsCodeConfig/tasks';
import { isMultiRootWorkspace } from '../../../../../utils/workspace';
import { AzureWizardExecuteStep, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  ISettingToAdd,
  IProjectWizardContext,
  ProjectLanguage,
  ITask,
  ITaskInputs,
  ITasksJson,
  ILaunchJson,
  IExtensionsJson,
} from '@microsoft/vscode-extension';
import { WorkflowProjectType, FuncVersion } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { TaskDefinition, DebugConfiguration, WorkspaceFolder } from 'vscode';

export abstract class InitCodeProject extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 20;
  protected preDeployTask?: string;
  protected settings: ISettingToAdd[] = [];

  protected abstract executeCore(context: IProjectWizardContext): Promise<void>;
  protected abstract getTasks(): TaskDefinition[];
  protected getTaskInputs?(): ITaskInputs[];
  protected getWorkspaceSettings?(): ISettingToAdd[];

  protected getDebugConfiguration(version: FuncVersion): DebugConfiguration {
    return {
      name: localize('attachToNetFunc', 'Attach to logic app'),
      type: version === FuncVersion.v1 ? 'clr' : 'coreclr',
      request: 'attach',
      processId: `\${command:${extensionCommand.pickProcess}}`,
    };
  }

  protected getRecommendedExtensions?(language: ProjectLanguage): string[];

  public async execute(context: IProjectWizardContext): Promise<void> {
    await this.executeCore(context);

    const version: FuncVersion = nonNullProp(context, 'version');
    context.telemetry.properties.projectRuntime = version;

    const language: ProjectLanguage = nonNullProp(context, 'language');
    context.telemetry.properties.projectLanguage = language;

    context.telemetry.properties.isProjectInSubDir = String(isSubpath(context.workspacePath, context.projectPath));
    // Define the Logic App folder path using the context property of the wizard
    const logicAppFolderPath = context.logicAppFolderPath;

    // Create the necessary files and folders for Visual Studio Code under the logic app folder path.
    await fse.ensureDir(logicAppFolderPath);
    const vscodePath: string = path.join(logicAppFolderPath, '.vscode');
    await fse.ensureDir(vscodePath);

    // Write the necessary Visual Studio Code configuration files.
    await this.writeTasksJson(context, vscodePath);
    await this.writeLaunchJson(context, context.workspaceFolder, vscodePath, version);
    await this.writeSettingsJson(context, vscodePath, language, version);
    await this.writeExtensionsJson(context, vscodePath, language);

    // Remove '.vscode' from gitignore if applicable
    const gitignorePath: string = path.join(context.projectPath, '.gitignore');
    if (await fse.pathExists(gitignorePath)) {
      let gitignoreContents: string = (await fse.readFile(gitignorePath)).toString();
      gitignoreContents = gitignoreContents.replace(/^\.vscode(\/|\\)?\s*$/gm, '');
      await fse.writeFile(gitignorePath, gitignoreContents);
    }
  }

  public shouldExecute(_context: IProjectWizardContext): boolean {
    return true;
  }

  /**
   * Overwrites the tasks.json file with the specified content.
   * @param context The project wizard context.
   **/
  public async overwriteTasksJson(context: IProjectWizardContext): Promise<void> {
    const tasksJsonPath: string = path.join(context.projectPath, '.vscode', 'Tasks.json');
    const tasksJsonContent = `{
    "version": "2.0.0",
    "tasks": [
      {
        "label": "generateDebugSymbols",
        "command": "dotnet",
        "args": [
          "\${input:getDebugSymbolDll}"
        ],
        "type": "process",
        "problemMatcher": "$msCompile"
      },
      {
        "type": "func",
        "command": "host start",
        "problemMatcher": "$func-watch",
        "isBackground": true,
        "label": "func: host start",
        "group": {
          "kind": "build",
          "isDefault": true
        }
      }
    ],
    "inputs": [
      {
        "id": "getDebugSymbolDll",
        "type": "command",
        "command": "azureLogicAppsStandard.getDebugSymbolDll"
      }
    ]
  }`;

    if (await confirmOverwriteFile(context, tasksJsonPath)) {
      await fse.writeFile(tasksJsonPath, tasksJsonContent);
    }
  }

  protected addSubDir(context: IProjectWizardContext, fsPath: string): string {
    const subDir: string = path.relative(context.workspacePath, context.projectPath);
    // always use posix for debug config
    return path.posix.join(subDir, fsPath);
  }

  private async writeTasksJson(context: IProjectWizardContext, vscodePath: string): Promise<void> {
    const newTasks: TaskDefinition[] = this.getTasks();
    const versionMismatchError: Error = new Error(
      localize('versionMismatchError', 'The version in your {0} must be "{1}" to work with Azure Functions.', tasksFileName, tasksVersion)
    );

    // Use the Visual Studio Code API to update config, if the folder is open and isn't a multi-root workspace (https://github.com/Microsoft/vscode-azurefunctions/issues/1235).
    // The Visual Studio Code API is better for several reasons:
    // - The Visual Studio Code API handles comments in JSON files.
    // - The Visual Studio Code API sends the 'onDidChangeConfiguration' event.
    if (context.workspaceFolder && !isMultiRootWorkspace()) {
      const currentVersion: string | undefined = getTasksVersion(context.workspaceFolder);
      if (!currentVersion) {
        updateTasksVersion(context.workspaceFolder, tasksVersion);
      } else if (currentVersion !== tasksVersion) {
        throw versionMismatchError;
      }
      updateTasks(context.workspaceFolder, this.insertNewTasks(getTasks(context.workspaceFolder), newTasks));
      if (this.getTaskInputs) {
        updateInputs(context.workspaceFolder, this.insertNewTaskInputs(context, getInputs(context.workspaceFolder), this.getTaskInputs()));
      }
    } else {
      // otherwise manually edit json
      const tasksJsonPath: string = path.join(vscodePath, tasksFileName);
      await confirmEditJsonFile(context, tasksJsonPath, (data: ITasksJson): ITasksJson => {
        if (!data.version) {
          data.version = tasksVersion;
        } else if (data.version !== tasksVersion) {
          throw versionMismatchError;
        }
        data.tasks = this.insertNewTasks(data.tasks, newTasks);
        if (this.getTaskInputs) {
          data.inputs = this.insertNewTaskInputs(context, data.inputs, this.getTaskInputs());
        }
        return data;
      });
    }
  }

  private insertNewTasks(existingTasks: ITask[] | undefined, newTasks: ITask[]): ITask[] {
    // tslint:disable-next-line: strict-boolean-expressions
    existingTasks = existingTasks || [];
    // Remove tasks that match the ones we're about to add
    existingTasks = existingTasks.filter(
      (t1) =>
        !newTasks.find((t2) => {
          if (t1.type === t2.type) {
            switch (t1.type) {
              case func:
                return t1.command === t2.command;
              case 'shell':
              case 'process':
                return t1.label === t2.label && t1.identifier === t2.identifier;
              default:
                // Not worth throwing an error for unrecognized task type
                // Worst case the user has an extra task in their tasks.json
                return false;
            }
          } else {
            return false;
          }
        })
    );
    existingTasks.push(...newTasks);
    return existingTasks;
  }

  private insertNewTaskInputs(context: IProjectWizardContext, existingInputs: ITaskInputs[] = [], newInputs: ITaskInputs[]): ITaskInputs[] {
    if (context.workflowProjectType == WorkflowProjectType.Bundle) {
      // Remove inputs that match the ones we're about to add
      existingInputs = existingInputs.filter(
        (t1) =>
          !newInputs.find((t2) => {
            if (t1.type === t2.type) {
              switch (t1.type) {
                case 'command':
                  return t1.command === t2.command;
                default:
                  return false;
              }
            }
            return false;
          })
      );
      existingInputs.push(...newInputs);
    }
    return existingInputs;
  }

  private async writeLaunchJson(
    context: IActionContext,
    folder: WorkspaceFolder | undefined,
    vscodePath: string,
    version: FuncVersion
  ): Promise<void> {
    if (this.getDebugConfiguration) {
      const newDebugConfig: DebugConfiguration = this.getDebugConfiguration(version);
      const versionMismatchError: Error = new Error(
        localize(
          'versionMismatchError',
          'The version in your {0} must be "{1}" to work with Azure Functions.',
          launchFileName,
          launchVersion
        )
      );

      // Use the Visual Studio Code API to update config, if the folder is open and isn't a multi-root workspace (https://github.com/Microsoft/vscode-azurefunctions/issues/1235).
      // The Visual Studio Code API is better for several reasons:
      // - The API handles comments in JSON files.
      // - The API sends the 'onDidChangeConfiguration' event.
      if (folder && !isMultiRootWorkspace()) {
        const currentVersion: string | undefined = getLaunchVersion(folder);
        if (!currentVersion) {
          updateLaunchVersion(folder, launchVersion);
        } else if (currentVersion !== launchVersion) {
          throw versionMismatchError;
        }
        updateDebugConfigs(folder, this.insertLaunchConfig(getDebugConfigs(folder), newDebugConfig));
      } else {
        // otherwise manually edit json
        const launchJsonPath: string = path.join(vscodePath, launchFileName);
        await confirmEditJsonFile(context, launchJsonPath, (data: ILaunchJson): ILaunchJson => {
          if (!data.version) {
            data.version = launchVersion;
          } else if (data.version !== launchVersion) {
            throw versionMismatchError;
          }
          data.configurations = this.insertLaunchConfig(data.configurations, newDebugConfig);
          return data;
        });
      }
    }
  }

  private insertLaunchConfig(existingConfigs: DebugConfiguration[] | undefined, newConfig: DebugConfiguration): DebugConfiguration[] {
    // tslint:disable-next-line: strict-boolean-expressions
    existingConfigs = existingConfigs || [];
    // Remove configs that match the one we're about to add
    existingConfigs = existingConfigs.filter((l1) => !isDebugConfigEqual(l1, newConfig));
    existingConfigs.push(newConfig);
    return existingConfigs;
  }

  private async writeSettingsJson(
    context: IProjectWizardContext,
    vscodePath: string,
    language: string,
    version: FuncVersion
  ): Promise<void> {
    const settings: ISettingToAdd[] = this.settings.concat(
      { key: projectLanguageSetting, value: language },
      { key: funcVersionSetting, value: version },
      // We want the terminal to open after F5, not the debug console because HTTP triggers are printed in the terminal.
      { prefix: 'debug', key: 'internalConsoleOptions', value: 'neverOpen' }
    );

    if (this.preDeployTask) {
      settings.push({ key: preDeployTaskSetting, value: this.preDeployTask });
    }

    if (this.getWorkspaceSettings) {
      const settingsToAdd = this.getWorkspaceSettings();
      settings.push(...settingsToAdd);
    }

    if (context.workspaceFolder) {
      // Use Visual Studio Code API to update config if folder is open
      for (const setting of settings) {
        await updateWorkspaceSetting(setting.key, setting.value, context.workspacePath, setting.prefix);
      }
    } else {
      // otherwise manually edit json
      const settingsJsonPath: string = path.join(vscodePath, settingsFileName);
      await confirmEditJsonFile(context, settingsJsonPath, (data: Record<string, any>): Record<string, any> => {
        for (const setting of settings) {
          const key = `${setting.prefix || ext.prefix}.${setting.key}`;
          data[key] = setting.value;
        }
        return data;
      });
    }
  }

  private async writeExtensionsJson(context: IActionContext, vscodePath: string, language: ProjectLanguage): Promise<void> {
    const extensionsJsonPath: string = path.join(vscodePath, extensionsFileName);
    await confirmEditJsonFile(context, extensionsJsonPath, (data: IExtensionsJson): Record<string, any> => {
      const recommendations: string[] = [functionsExtensionId];
      if (this.getRecommendedExtensions) {
        recommendations.push(...this.getRecommendedExtensions(language));
      }

      if (data.recommendations) {
        recommendations.push(...data.recommendations);
      }

      // de-dupe array
      data.recommendations = recommendations.filter((rec: string, index: number) => recommendations.indexOf(rec) === index);
      return data;
    });
  }
}
