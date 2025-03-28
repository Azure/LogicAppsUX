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
} from '../../../../../constants';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class FunctionAppFilesStep extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  private csTemplateFileName = {
    [TargetFramework.NetFx]: 'FunctionsFileNetFx',
    [TargetFramework.Net8]: 'FunctionsFileNet8',
    [ProjectType.rulesEngine]: 'RulesFunctionsFile',
  };

  private csprojTemplateFileName = {
    [TargetFramework.NetFx]: 'FunctionsProjNetFx',
    [TargetFramework.Net8]: 'FunctionsProjNet8New',
    [ProjectType.rulesEngine]: 'RulesFunctionsProj',
  };

  private templateFolderName = {
    [ProjectType.customCode]: 'FunctionProjectTemplate',
    [ProjectType.rulesEngine]: 'RuleSetProjectTemplate',
  };

  /**
   * Prompts the user to set up an Azure Function project.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set the functionAppName and namespaceName properties from the context wizard
    const functionAppName = context.functionAppName;
    const namespace = context.functionAppNamespace;
    const targetFramework = context.targetFramework;
    const logicAppName = context.logicAppName || 'LogicApp';

    // Define the functions folder path using the context property of the wizard
    const functionFolderPath = path.join(context.workspacePath, context.functionAppName);
    await fs.ensureDir(functionFolderPath);

    // Define the type of project in the workspace
    const projectType = context.projectType;

    // Create the .cs file inside the functions folder
    await this.createCsFile(functionFolderPath, functionAppName, namespace, projectType, targetFramework);

    // Create the .cs files inside the functions folders for rule code projects
    await this.createRulesFiles(functionFolderPath, projectType);

    // Create the .csproj file inside the functions folder
    await this.createCsprojFile(functionFolderPath, functionAppName, logicAppName, projectType, targetFramework);

    // Generate the Visual Studio Code configuration files in the specified folder.
    await this.createVscodeConfigFiles(functionFolderPath, targetFramework);
  }

  /**
   * Determines whether the prompt should be displayed.
   * @returns {boolean} True if the prompt should be displayed, false otherwise.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Creates the .cs file inside the functions folder.
   * @param functionFolderPath - The path to the functions folder.
   * @param methodName - The name of the method.
   * @param namespace - The name of the namespace.
   * @param projectType - The workspace projet type.
   * @param targetFramework - The target framework.
   */
  private async createCsFile(
    functionFolderPath: string,
    methodName: string,
    namespace: string,
    projectType: ProjectType,
    targetFramework: TargetFramework
  ): Promise<void> {
    const templateFile =
      projectType === ProjectType.rulesEngine ? this.csTemplateFileName[ProjectType.rulesEngine] : this.csTemplateFileName[targetFramework];
    const templatePath = path.join(__dirname, 'assets', this.templateFolderName[projectType], templateFile);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csFilePath = path.join(functionFolderPath, `${methodName}.cs`);
    const csFileContent = templateContent.replace(/<%= methodName %>/g, methodName).replace(/<%= namespace %>/g, namespace);
    await fs.writeFile(csFilePath, csFileContent);
  }

  /**
   * Creates the rules files for the project.
   * @param {string} functionFolderPath - The path of the function folder.
   * @param {string} projectType - The type of the project.
   * @returns A promise that resolves when the rules files are created.
   */
  private async createRulesFiles(functionFolderPath: string, projectType: ProjectType): Promise<void> {
    if (projectType === ProjectType.rulesEngine) {
      const csTemplatePath = path.join(__dirname, 'assets', 'RuleSetProjectTemplate', 'ContosoPurchase');
      const csRuleSetPath = path.join(functionFolderPath, 'ContosoPurchase.cs');
      await fs.copyFile(csTemplatePath, csRuleSetPath);
    }
  }

  /**
   * Creates a .csproj file for a specific Azure Function.
   * @param functionFolderPath - The path to the folder where the .csproj file will be created.
   * @param methodName - The name of the Azure Function.
   * @param projectType - The workspace projet type.
   * @param targetFramework - The target framework.
   */
  private async createCsprojFile(
    functionFolderPath: string,
    methodName: string,
    logicAppName: string,
    projectType: ProjectType,
    targetFramework: TargetFramework
  ): Promise<void> {
    const templateFile =
      projectType === ProjectType.rulesEngine
        ? this.csprojTemplateFileName[ProjectType.rulesEngine]
        : this.csprojTemplateFileName[targetFramework];
    const templatePath = path.join(__dirname, 'assets', this.templateFolderName[projectType], templateFile);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csprojFilePath = path.join(functionFolderPath, `${methodName}.csproj`);
    let csprojFileContent: string;
    if (targetFramework === TargetFramework.Net8 && projectType === ProjectType.customCode) {
      csprojFileContent = templateContent.replace(
        /<LogicAppFolderToPublish>\$\(MSBuildProjectDirectory\)\\..\\LogicApp<\/LogicAppFolderToPublish>/g,
        `<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\${logicAppName}</LogicAppFolderToPublish>`
      );
    } else {
      csprojFileContent = templateContent.replace(
        /<LogicAppFolder>LogicApp<\/LogicAppFolder>/g,
        `<LogicAppFolder>${logicAppName}</LogicAppFolder>`
      );
    }
    await fs.writeFile(csprojFilePath, csprojFileContent);
  }

  /**
   * Creates the Visual Studio Code configuration files in the .vscode folder of the specified functions app.
   * @param functionFolderPath The path to the functions folder.
   * @param targetFramework The target framework of the functions app.
   */
  private async createVscodeConfigFiles(functionFolderPath: string, targetFramework: TargetFramework): Promise<void> {
    await fs.ensureDir(functionFolderPath);
    const vscodePath: string = path.join(functionFolderPath, vscodeFolderName);
    await fs.ensureDir(vscodePath);

    await this.generateExtensionsJson(vscodePath);

    await this.generateLaunchJson(vscodePath, targetFramework);

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
   * Generates the launch.json file in the specified folder.
   * @param folderPath The path to the folder where the launch.json file should be generated.
   * @param targetFramework The target framework of the functions app.
   */
  private async generateLaunchJson(folderPath: string, targetFramework: TargetFramework): Promise<void> {
    const filePath = path.join(folderPath, launchFileName);
    const content =
      targetFramework === TargetFramework.Net8
        ? {
            version: '0.2.0',
            configurations: [
              {
                name: 'Debug local function',
                type: 'coreclr',
                request: 'attach',
                processId: '${command:azureLogicAppsStandard.pickCustomCodeNetHostProcess}',
              },
            ],
          }
        : {
            version: '0.2.0',
            configurations: [
              {
                name: 'Debug local function',
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
   * @param targetFramework The target framework of the functions app.
   */
  private async generateSettingsJson(folderPath: string, targetFramework: TargetFramework): Promise<void> {
    const filePath = path.join(folderPath, settingsFileName);
    const content = {
      'azureFunctions.deploySubpath': `bin/Release/${targetFramework}/publish`,
      'azureFunctions.projectLanguage': 'C#',
      'azureFunctions.projectRuntime': '~4',
      'debug.internalConsoleOptions': 'neverOpen',
      'azureFunctions.preDeployTask': 'publish (functions)',
      'azureFunctions.templateFilter': 'Core',
      'azureFunctions.showTargetFrameworkWarning': false,
      'azureFunctions.projectSubpath': `bin\\Release\\${targetFramework}\\publish`,
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
