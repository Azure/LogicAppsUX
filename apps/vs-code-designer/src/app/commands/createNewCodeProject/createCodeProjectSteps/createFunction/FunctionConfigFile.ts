/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  dotnetExtensionId,
  extensionsFileName,
  functionsExtensionId,
  launchFileName,
  settingsFileName,
  tasksFileName,
} from '../../../../../constants';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that generates the Visual Studio Code configuration files in the specified folder.
 */
export class FunctionConfigFile extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  /**
   * Generates the Visual Studio Code configuration files in the specified folder.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const folderPath = context.functionFolderPath;

    // Create the necessary files and folders for Visual Studio Code under the logic app folder path.
    await fs.ensureDir(folderPath);
    const vscodePath: string = path.join(folderPath, '.vscode');
    await fs.ensureDir(vscodePath);

    // Generate the extensions.json file
    await this.generateExtensionsJson(vscodePath);

    // Generate the launch.json file
    await this.generateLaunchJson(vscodePath);

    // Generate the settings.json file
    await this.generateSettingsJson(vscodePath);

    // Generate the tasks.json file
    await this.generateTasksJson(context, vscodePath);
  }

  /**
   * Determines whether the user should be prompted to generate the Visual Studio Code configuration files.
   * @param context The project wizard context.
   * @returns True if the user hasn't yet generated the Visual Studio Code configuration files. Otherwise, returns False.
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !fs.existsSync(path.join(context.functionFolderPath, '.vscode'));
  }

  /**
   * Generates the extensions.json file in the specified folder.
   * @param folderPath The path to the folder where the extensions.json file should be generated.
   */
  private async generateExtensionsJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, extensionsFileName);
    const content = {
      recommendations: [functionsExtensionId, dotnetExtensionId],
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the launch.json file in the specified folder.
   * @param folderPath The path to the folder where the launch.json file should be generated.
   */
  private async generateLaunchJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, launchFileName);
    const content = {
      version: '0.2.0',
      configurations: [
        {
          name: 'Attach to .NET Functions',
          type: 'clr',
          request: 'attach',
          processName: 'Microsoft.Azure.Workflows.Functions.CustomCodeNetFxWorker.exe',
        },
      ],
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the settings.json file in the specified folder.
   * @param folderPath The path to the folder where the settings.json file should be generated.
   */
  private async generateSettingsJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, settingsFileName);
    const content = {
      'azureFunctions.deploySubpath': 'bin/Release/net472/publish',
      'azureFunctions.projectLanguage': 'C#',
      'azureFunctions.projectRuntime': '~4',
      'debug.internalConsoleOptions': 'neverOpen',
      'azureFunctions.preDeployTask': 'publish (functions)',
      'azureFunctions.templateFilter': 'Core',
      'azureFunctions.showTargetFrameworkWarning': false,
      'azureFunctions.projectSubpath': 'bin\\Release\\net472\\publish',
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the tasks.json file in the specified folder.
   * @param folderPath The path to the folder where the tasks.json file should be generated.
   */
  private async generateTasksJson(context: IProjectWizardContext, folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, tasksFileName);
    const commonArgs: string[] = ['/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'];
    const targetFramework: TargetFramework = context.targetFramework;

    const tasks: any = [
      {
        label: 'build',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        type: 'process',
        args: ['build', '${workspaceFolder}'],
        group: {
          kind: 'build',
          isDefault: true,
        },
      },
    ];
    if (targetFramework === TargetFramework.Net8) {
      tasks.unshift({
        label: 'clean',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        args: ['clean', ...commonArgs],
        type: 'process',
        problemMatcher: '$msCompile',
      });
    }
    const content = {
      version: '2.0.0',
      tasks: tasks,
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }
}
