/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FunctionConfigFile } from './FunctionConfigFile';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class InvokeFunctionProjectSetup extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  /**
   * Prompts the user to set up an Azure Function project.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set the methodName and namespaceName properties from the context wizard
    const methodName = context.methodName;
    const namespace = context.namespaceName;

    // Define the functions folder path using the context property of the wizard
    const functionFolderPath = context.functionFolderPath;

    // Define the type of project in the workspace
    const projectType = context.projectType;

    // Create the .cs file inside the functions folder
    await this.createCsFile(functionFolderPath, methodName, namespace, projectType);

    // Create the .csproj file inside the functions folder
    await this.createCsprojFile(functionFolderPath, methodName, projectType);

    // Generate the Visual Studio Code configuration files in the specified folder.
    const createConfigFiles = new FunctionConfigFile();
    await createConfigFiles.prompt(context);
  }

  /**
   * Determines whether the user should be prompted to set up an Azure Function project.
   * @param context The project wizard context.
   * @returns True if the user has not yet set up an Azure Function project, false otherwise.
   */
  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }

  /**
   * Creates the .cs file inside the functions folder.
   * @param functionFolderPath - The path to the functions folder.
   * @param methodName - The name of the method.
   * @param namespace - The name of the namespace.
   * @param projectType - The workspace projet type.
   */
  private async createCsFile(functionFolderPath: string, methodName: string, namespace: string, projectType: ProjectType): Promise<void> {
    const csFileName = {
      [ProjectType.customCode]: 'FunctionsFile',
      [ProjectType.rulesEngine]: 'RulesFunctionsFile',
    };
    const templatePath = path.join(__dirname, 'assets', 'FunctionProjectTemplate', csFileName[projectType]);
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
   */
  private async createCsprojFile(functionFolderPath: string, methodName: string, projectType: ProjectType): Promise<void> {
    const templateFileName = {
      [ProjectType.customCode]: 'FunctionsProj',
      [ProjectType.rulesEngine]: 'RulesFunctionsProj',
    };
    const templatePath = path.join(__dirname, 'assets', 'FunctionProjectTemplate', templateFileName[projectType]);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csprojFilePath = path.join(functionFolderPath, `${methodName}.csproj`);
    const csprojFileContent = templateContent.replace(/<%= methodName %>/g, methodName);
    await fs.writeFile(csprojFilePath, csprojFileContent);
  }
}
