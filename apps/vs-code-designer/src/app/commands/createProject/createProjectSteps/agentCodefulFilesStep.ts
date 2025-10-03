/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assetsFolderName } from '../../../../constants';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class AgentCodefulFilesStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;
  private templateFile = 'AgentFunctionsFile';
  private projectFile = 'AgentFunctionsProj';
  private templatesFolder = 'AgentCodefulProjectTemplate';

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
    // Set the functionAppName and namespaceName properties from the context wizard
    const logicAppName = context.logicAppName || 'LogicApp';

    // Define the functions folder path using the context property of the wizard
    await fs.ensureDir(context.projectPath);

    // Create the .cs file inside the functions folder
    await this.createCsFile(context.projectPath);

    // Create the .csproj file inside the functions folder
    await this.createCsprojFile(context.projectPath, logicAppName);
  }

  /**
   * Creates the .cs file inside the functions folder.
   * @param functionFolderPath - The path to the functions folder.
   * @param methodName - The name of the method.
   * @param namespace - The name of the namespace.
   * @param projectType - The workspace projet type.
   * @param targetFramework - The target framework.
   */
  private async createCsFile(functionFolderPath: string): Promise<void> {
    const templatePath = path.join(__dirname, assetsFolderName, this.templatesFolder, this.templateFile);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csFilePath = path.join(functionFolderPath, 'Program.cs');
    await fs.writeFile(csFilePath, templateContent);
  }

  /**
   * Creates a .csproj file for a specific Azure Function.
   * @param functionFolderPath - The path to the folder where the .csproj file will be created.
   * @param methodName - The name of the Azure Function.
   * @param projectType - The workspace projet type.
   * @param targetFramework - The target framework.
   */
  private async createCsprojFile(functionFolderPath: string, logicAppName: string): Promise<void> {
    const templatePath = path.join(__dirname, assetsFolderName, this.templatesFolder, this.projectFile);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csprojFilePath = path.join(functionFolderPath, `${logicAppName}.csproj`);

    await fs.writeFile(csprojFilePath, templateContent);
  }
}
