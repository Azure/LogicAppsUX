/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FunctionConfigFile } from './FunctionConfigFile';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class InvokeFunctionProjectSetup extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  private csFileName = {
    [TargetFramework.NetFx]: 'FunctionsFileNetFx',
    [TargetFramework.Net8]: 'FunctionsFileNet8',
    [ProjectType.rulesEngine]: 'RulesFunctionsFile',
  };

  private templateFileName = {
    [TargetFramework.NetFx]: 'FunctionsProjNetFx',
    [TargetFramework.Net8]: 'FunctionsProjNet8',
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
    // Set the methodName and namespaceName properties from the context wizard
    const methodName = context.methodName;
    const namespace = context.namespaceName;
    const targetFramework = context.targetFramework;
    const logicAppName = context.logicAppName || 'LogicApp';

    // Define the functions folder path using the context property of the wizard
    const functionFolderPath = path.join(context.workspacePath, context.methodName);
    await fs.ensureDir(functionFolderPath);
    context.functionFolderPath = functionFolderPath;

    // Define the type of project in the workspace
    const projectType = context.projectType;

    // Create the .cs file inside the functions folder
    await this.createCsFile(functionFolderPath, methodName, namespace, projectType, targetFramework);

    // Create the .cs files inside the functions folders for rule code projects
    await this.createRulesFiles(functionFolderPath, projectType);

    // Create the .csproj file inside the functions folder
    await this.createCsprojFile(functionFolderPath, methodName, logicAppName, projectType, targetFramework);

    // Generate the Visual Studio Code configuration files in the specified folder.
    const createConfigFiles = new FunctionConfigFile();
    await createConfigFiles.prompt(context);
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
      projectType === ProjectType.rulesEngine ? this.csFileName[ProjectType.rulesEngine] : this.csFileName[targetFramework];
    const templatePath = path.join(__dirname, 'assets', this.templateFolderName[projectType], templateFile);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csFilePath = path.join(functionFolderPath, `${methodName}.cs`);
    const csFileContent = templateContent.replace(/<%= methodName %>/g, methodName).replace(/<%= namespace %>/g, namespace);
    await fs.writeFile(csFilePath, csFileContent);
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
      projectType === ProjectType.rulesEngine ? this.templateFileName[ProjectType.rulesEngine] : this.templateFileName[targetFramework];
    const templatePath = path.join(__dirname, 'assets', this.templateFolderName[projectType], templateFile);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csprojFilePath = path.join(functionFolderPath, `${methodName}.csproj`);
    const csprojFileContent = templateContent.replace(
      /<LogicAppFolder>LogicApp<\/LogicAppFolder>/g,
      `<LogicAppFolder>${logicAppName}</LogicAppFolder>`
    );
    await fs.writeFile(csprojFilePath, csprojFileContent);
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
}
