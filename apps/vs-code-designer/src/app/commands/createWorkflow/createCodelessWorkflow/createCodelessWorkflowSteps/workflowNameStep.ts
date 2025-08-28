/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IWorkflowTemplate, IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { workflowNameValidation } from '../../../../../constants';

export class WorkflowNameStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public async prompt(context: IFunctionWizardContext): Promise<void> {
    const template: IWorkflowTemplate = nonNullProp(context, 'functionTemplate');
    const uniqueWorkflowName: string | undefined = await this.getUniqueFunctionName(context);

    context.functionName = await context.ui.showInputBox({
      placeHolder: localize('workflowNamePlaceholder', 'Workflow name'),
      prompt: localize('workflowNamePrompt', 'Provide a workflow name'),
      validateInput: async (s: string): Promise<string | undefined> => await this.validateWorkflowName(context, s),
      value: uniqueWorkflowName || template.defaultFunctionName,
    });
  }

  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return !context.functionName;
  }

  protected async getUniqueFsPath(folderPath: string, defaultValue: string, fileExtension?: string): Promise<string | undefined> {
    let count = 1;
    const maxCount = 1024;

    while (count < maxCount) {
      const fileName: string = defaultValue + count.toString();
      if (!(await fse.pathExists(path.join(folderPath, fileExtension ? fileName + fileExtension : fileName)))) {
        return fileName;
      }
      count += 1;
    }

    return undefined;
  }

  private async validateWorkflowName(context: IFunctionWizardContext, name: string | undefined): Promise<string | undefined> {
    if (!name) {
      return localize('emptyWorkflowNameError', 'The workflow name cannot be empty.');
    }
    if (!workflowNameValidation.test(name)) {
      return localize(
        'workflowNameInvalidMessage',
        'Workflow name must start with a letter and can only contain letters, digits, "_" and "-".'
      );
    }
    return await this.validateNameCore(context, name);
  }

  private async getUniqueFunctionName(context: IFunctionWizardContext): Promise<string | undefined> {
    const template: IWorkflowTemplate = nonNullProp(context, 'functionTemplate');
    return await this.getUniqueFsPath(context.projectPath, template.defaultFunctionName);
  }

  private async validateNameCore(context: IFunctionWizardContext, name: string): Promise<string | undefined> {
    if (await fse.pathExists(path.join(context.projectPath, name))) {
      return localize('existingFolderError', 'A folder with the name "{0}" already exists.', name);
    }
    return undefined;
  }
}
