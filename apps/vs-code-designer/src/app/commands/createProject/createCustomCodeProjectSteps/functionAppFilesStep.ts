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
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getDebugConfigs, updateDebugConfigs } from '../../../utils/vsCodeConfig/launch';
import { getContainingWorkspace, isMultiRootWorkspace } from '../../../utils/workspace';
import { tryGetLocalFuncVersion } from '../../../utils/funcCoreTools/funcVersion';
import { getCustomCodeRuntime, getDebugConfiguration } from '../../../utils/debug';
import { createCsFile, createProgramFile, createRulesFiles, createCsprojFile } from '../../../utils/functionProjectFiles';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class FunctionAppFilesStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  /**
   * Determines whether the prompt should be displayed.
   * @returns {boolean} True if the prompt should be displayed, false otherwise.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Prompts the user to set up an Azure Function project.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const { functionAppName, functionAppNamespace: namespace, targetFramework, projectType } = context;
    const logicAppName = context.logicAppName || 'LogicApp';
    const funcVersion = context.version ?? (await tryGetLocalFuncVersion());
    const functionFolderPath = path.join(context.workspacePath, context.functionAppName);
    const assetsPath = path.join(__dirname, assetsFolderName);

    await fs.ensureDir(functionFolderPath);
    await createCsFile(assetsPath, functionFolderPath, functionAppName, namespace, projectType, targetFramework);
    await createProgramFile(assetsPath, functionFolderPath, namespace, projectType, targetFramework);

    if (projectType === ProjectType.rulesEngine) {
      await createRulesFiles(assetsPath, functionFolderPath);
    }

    await createCsprojFile(assetsPath, functionFolderPath, functionAppName, logicAppName, projectType, targetFramework);

    const isNewLogicAppProject = context.shouldCreateLogicAppProject;
    await this.createVscodeConfigFiles(functionFolderPath, targetFramework, funcVersion, logicAppName, isNewLogicAppProject);
  }

  /**
   * Creates the Visual Studio Code configuration files in the .vscode folder of the specified functions app.
   * @param functionFolderPath The path to the functions folder.
   * @param targetFramework The target framework of the functions app.
   * @param funcVersion The version of the functions app.
   * @param logicAppName The name of the logic app.
   * @param isNewLogicAppProject Indicates if the logic app project is new.
   */
  private async createVscodeConfigFiles(
    functionFolderPath: string,
    targetFramework: TargetFramework,
    funcVersion: FuncVersion,
    logicAppName: string,
    isNewLogicAppProject: boolean
  ): Promise<void> {
    await fs.ensureDir(functionFolderPath);
    const vscodePath: string = path.join(functionFolderPath, vscodeFolderName);
    await fs.ensureDir(vscodePath);

    await this.generateExtensionsJson(vscodePath);

    // Update launch config for existing logic app project (new projects will be created with the correct config)
    if (!isNewLogicAppProject) {
      await this.updateLogicAppLaunchJson(vscodePath, targetFramework, funcVersion, logicAppName);
    }

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
    const logicAppWorkspaceFolder = getContainingWorkspace(logicAppLaunchJsonPath);
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
          getDebugConfiguration(funcVersion, logicAppName, targetFramework),
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
