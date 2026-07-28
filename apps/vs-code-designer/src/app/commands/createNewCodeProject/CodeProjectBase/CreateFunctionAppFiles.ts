/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  dotnetExtensionId,
  functionsExtensionId,
  vscodeFolderName,
  extensionsFileName,
  settingsFileName,
  tasksFileName,
} from '../../../../constants';
import { type IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getAssetsRoot } from '../../../utils/assets';
import { createCsFile, createProgramFile, createRulesFiles, createCsprojFile } from '../../../utils/functionProjectFiles';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class CreateFunctionAppFiles {
  /**
   * Sets up an Azure Function project by creating all necessary files.
   * @param context The project wizard context.
   */
  public async setup(context: IProjectWizardContext): Promise<void> {
    const { functionAppName, functionAppNamespace: namespace, targetFramework, projectType } = context;
    const logicAppName = context.logicAppName || 'LogicApp';
    const functionFolderPath = path.join(context.workspacePath, context.functionFolderName);
    const assetsPath = getAssetsRoot();

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
