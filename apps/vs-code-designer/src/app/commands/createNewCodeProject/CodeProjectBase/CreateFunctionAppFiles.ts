/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  dotnetExtensionId,
  functionsExtensionId,
  vscodeFolderName,
  extensionsFileName,
  launchFileName,
  settingsFileName,
  tasksFileName,
  extensionCommand,
  assetsFolderName,
} from '../../../../constants';
import { FuncVersion, type IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getDebugConfigs, updateDebugConfigs } from '../../../utils/vsCodeConfig/launch';
import { getContainingWorkspace, isMultiRootWorkspace } from '../../../utils/workspace';
import { localize } from '../../../../localize';
import * as vscode from 'vscode';
import { getCustomCodeRuntime } from '../../../utils/debug';
import { createCsFile, createProgramFile, createRulesFiles, createCsprojFile } from '../../../utils/functionProjectFiles';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class CreateFunctionAppFiles {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  /**
   * Sets up an Azure Function project by creating all necessary files.
   * @param context The project wizard context.
   */
  public async setup(context: IProjectWizardContext): Promise<void> {
    const { functionAppName, functionAppNamespace: namespace, targetFramework, projectType } = context;
    const logicAppName = context.logicAppName || 'LogicApp';
    const functionFolderPath = path.join(context.workspacePath, context.functionFolderName);
    const assetsPath = path.join(__dirname, assetsFolderName);

    await fs.ensureDir(functionFolderPath);
    await createCsFile(assetsPath, functionFolderPath, functionAppName, namespace, projectType, targetFramework);
    await createProgramFile(assetsPath, functionFolderPath, namespace, projectType, targetFramework);

    if (projectType === ProjectType.rulesEngine) {
      await createRulesFiles(assetsPath, functionFolderPath);
    }

    await createCsprojFile(assetsPath, functionFolderPath, functionAppName, logicAppName, projectType, targetFramework);
    await this.createVscodeConfigFiles(functionFolderPath, targetFramework);
  }

  /**
   * Creates the Visual Studio Code configuration files in the .vscode folder of the specified functions app.
   * @param functionFolderPath The path to the functions folder.
   * @param targetFramework The target framework of the functions app.
   * @param funcVersion The version of the functions app.
   * @param logicAppName The name of the logic app.
   * @param isNewLogicAppProject Indicates if the logic app project is new.
   */
  private async createVscodeConfigFiles(functionFolderPath: string, targetFramework: TargetFramework): Promise<void> {
    await fs.ensureDir(functionFolderPath);
    const vscodePath: string = path.join(functionFolderPath, vscodeFolderName);
    await fs.ensureDir(vscodePath);

    await this.generateExtensionsJson(vscodePath);

    await this.generateSettingsJson(vscodePath, targetFramework);

    await this.generateTasksJson(vscodePath);
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
   * Updates the launch.json file for the logic app corresponding to this functions app.
   * @param folderPath The functions app folder path.
   * @param targetFramework The target framework of the functions app.
   * @param funcVersion The version of the functions app.
   * @param logicAppName The name of the logic app.
   */
  private async updateLogicAppLaunchJson(
    folderPath: string,
    targetFramework: TargetFramework,
    funcVersion: FuncVersion,
    logicAppName: string
  ): Promise<void> {
    const logicAppLaunchJsonPath = path.join(folderPath, '..', '..', logicAppName, vscodeFolderName, launchFileName);
    let logicAppWorkspaceFolder = getContainingWorkspace(logicAppLaunchJsonPath);
    if (logicAppWorkspaceFolder === undefined) {
      // Traverse up the directory tree to find a .code-workspace file
      let currentPath = path.dirname(logicAppLaunchJsonPath);
      let workspaceFile: string | undefined;

      while (currentPath !== path.parse(currentPath).root) {
        const files = await fs.readdir(currentPath);
        const codeWorkspaceFile = files.find((file) => file.endsWith('.code-workspace'));

        if (codeWorkspaceFile) {
          workspaceFile = path.join(currentPath, codeWorkspaceFile);
          break;
        }

        currentPath = path.dirname(currentPath);
      }

      // If no workspace file found, cannot update launch.json
      if (workspaceFile) {
        logicAppWorkspaceFolder = {
          uri: vscode.Uri.file(currentPath),
          name: path.basename(currentPath),
          index: 0,
        };
      }
    }
    const debugConfigs = getDebugConfigs(logicAppWorkspaceFolder);
    const updatedDebugConfigs = debugConfigs.some((debugConfig) => debugConfig.type === 'logicapp')
      ? debugConfigs.map((debugConfig) => {
          // Update the logic app debug configuration to use the correct runtime for custom code
          if (debugConfig.type === 'logicapp') {
            return {
              ...debugConfig,
              customCodeRuntime: getCustomCodeRuntime(targetFramework),
              isCodeless: true,
            };
          }
          return debugConfig;
        })
      : [
          {
            name: localize('debugLogicApp', `Run/Debug logic app with local function ${logicAppName}`),
            type: 'logicapp',
            request: 'launch',
            funcRuntime: funcVersion === FuncVersion.v1 ? 'clr' : 'coreclr',
            customCodeRuntime: getCustomCodeRuntime(targetFramework),
            isCodeless: true,
          },
          ...debugConfigs.filter(
            (debugConfig) => debugConfig.request !== 'attach' || debugConfig.processId !== `\${command:${extensionCommand.pickProcess}}`
          ),
        ];

    if (isMultiRootWorkspace()) {
      let launchJsonContent: any;
      if (await fs.pathExists(logicAppLaunchJsonPath)) {
        launchJsonContent = await fs.readJson(logicAppLaunchJsonPath);
        launchJsonContent['configurations'] = updatedDebugConfigs;
      } else {
        launchJsonContent = {
          version: '0.2.0',
          configurations: updatedDebugConfigs,
        };
      }
      await fs.writeJson(logicAppLaunchJsonPath, launchJsonContent, { spaces: 2 });
    } else {
      updateDebugConfigs(logicAppWorkspaceFolder, updatedDebugConfigs);
    }
  }

  /**
   * Generates the settings.json file in the specified folder.
   * @param folderPath The path to the folder where the settings.json file should be generated.
   * @param targetFramework The target framework of the functions app.
   */
  private async generateSettingsJson(folderPath: string, targetFramework: TargetFramework): Promise<void> {
    const filePath = path.join(folderPath, settingsFileName);
    const content = {
      'azureFunctions.deploySubpath': `bin/Release/${targetFramework ?? TargetFramework.NetFx}/publish`,
      'azureFunctions.projectLanguage': 'C#',
      'azureFunctions.projectRuntime': '~4',
      'debug.internalConsoleOptions': 'neverOpen',
      'azureFunctions.preDeployTask': 'publish (functions)',
      'azureFunctions.templateFilter': 'Core',
      'azureFunctions.showTargetFrameworkWarning': false,
      'azureFunctions.projectSubpath': `bin\\Release\\${targetFramework ?? TargetFramework.NetFx}\\publish`,
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the tasks.json file in the specified folder.
   * @param folderPath The path to the folder where the tasks.json file should be generated.
   */
  private async generateTasksJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, tasksFileName);
    const content = {
      version: '2.0.0',
      tasks: [
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
      ],
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }
}
