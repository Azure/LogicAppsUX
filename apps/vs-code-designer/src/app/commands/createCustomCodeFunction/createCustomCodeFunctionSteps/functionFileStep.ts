/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ext } from '../../../../extensionVariables';
import { window } from 'vscode';
import { localize } from '../../../../localize';
import { assetsFolderName } from '../../../../constants';

/**
 * Sets up a new function in an Azure Functions project.
 */
export class FunctionFileStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  private csTemplateFileName = {
    [TargetFramework.NetFx]: 'FunctionsFileNetFx',
    [TargetFramework.Net8]: 'FunctionsFileNet8',
  };

  /**
   * Determines whether the prompt should be displayed.
   * @returns {boolean} True if the prompt should be displayed, false otherwise.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Prompts to set up a function.
   * @param {IProjectWizardContext} context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const functionsFolderPath = path.join(context.workspacePath, context.functionAppName);
    if (!(await fs.pathExists(functionsFolderPath)) || !(await fs.stat(functionsFolderPath)).isDirectory()) {
      ext.outputChannel.appendLog(
        localize('invalidFunctionsFolderPath', `The target folder ${functionsFolderPath} is not a valid directory.`)
      );
      return;
    }

    await this.createCsFile(functionsFolderPath, context.customCodeFunctionName, context.functionAppNamespace, context.targetFramework);
  }

  /**
   * Creates the .cs file inside the functions folder for the new function.
   * @param {string} functionsFolderPath - The path to the functions folder.
   * @param {string} functionName - The name of the new function in the Azure Functions project.
   * @param {string} namespace - The namespace of the functions project.
   * @param {TargetFramework} targetFramework - The target framework.
   */
  private async createCsFile(
    functionsFolderPath: string,
    functionName: string,
    namespace: string,
    targetFramework: TargetFramework
  ): Promise<void> {
    const customCodeTemplateFolderName = 'FunctionProjectTemplate';
    const templateFile = this.csTemplateFileName[targetFramework];
    const templatePath = path.join(__dirname, assetsFolderName, customCodeTemplateFolderName, templateFile);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csFilePath = path.join(functionsFolderPath, `${functionName}.cs`);
    // Sanitize names for C# identifiers: replace hyphens with underscores
    const safeFunctionName = functionName.replace(/-/g, '_');
    const safeNamespace = namespace.replace(/-/g, '_');
    const safeCsFilePath = path.join(functionsFolderPath, `${safeFunctionName}.cs`);

    // Check both original and sanitized file names for existence
    if ((await fs.pathExists(csFilePath)) || (await fs.pathExists(safeCsFilePath))) {
      const existingPath = (await fs.pathExists(csFilePath)) ? csFilePath : safeCsFilePath;
      ext.outputChannel.appendLog(`The file ${existingPath} already exists.`);
      window.showErrorMessage(
        localize(
          'azureLogicAppsStandard.functionFileAlreadyExists',
          `The file ${existingPath} already exists in the target functions project.`
        )
      );
      return;
    }

    const csFileContent = templateContent.replace(/<%= methodName %>/g, safeFunctionName).replace(/<%= namespace %>/g, safeNamespace);
    await fs.writeFile(safeCsFilePath, csFileContent);
  }
}
