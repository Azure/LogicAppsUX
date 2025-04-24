/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { ProjectType, type IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { logicAppNameValidation } from '../../../../constants';
import { getLogicAppWithoutCustomCode } from '../../../utils/workspace';
import { isString } from '@microsoft/logic-apps-shared';

export class LogicAppNameStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    if (context.projectType === ProjectType.logicApp || context.shouldCreateLogicAppProject) {
      // For new workspaces or new logic app projects, prompt for a new logic app name
      context.shouldCreateLogicAppProject = true;
      context.logicAppName = await this.getLogicAppName(context);
    } else {
      // For custom code and rules engine projects, allow users to select from existing logic apps or create new logic app
      const logicAppFolder = await getLogicAppWithoutCustomCode(context);
      if (logicAppFolder === undefined) {
        // This selection indicates that a new logic app should be created
        context.shouldCreateLogicAppProject = true;
        context.logicAppName = await this.getLogicAppName(context);
      } else {
        // This selection indicates that the custom code/rules engine should be created for an existing logic app project
        context.shouldCreateLogicAppProject = false;
        context.logicAppName = isString(logicAppFolder) ? path.basename(logicAppFolder) : logicAppFolder.name;
      }
    }

    ext.outputChannel.appendLog(localize('logicAppNameSet', `Logic App project name set to ${context.logicAppName}`));
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.projectType !== undefined;
  }

  private async getLogicAppName(context: IProjectWizardContext): Promise<string | undefined> {
    return await context.ui.showInputBox({
      placeHolder: localize('logicAppNamePlaceHolder', 'Logic App name'),
      prompt: localize('logicAppNamePrompt', 'Enter a name for your Logic App project'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateLogicAppName(input, context),
    });
  }

  private async validateLogicAppName(name: string | undefined, context: IProjectWizardContext): Promise<string | undefined> {
    if (!name || name.length === 0) {
      return localize('logicAppNameEmpty', 'Logic app name cannot be empty');
    }

    if (fse.existsSync(context.workspaceCustomFilePath)) {
      const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(context.workspaceCustomFilePath));
      const workspaceFileJson = JSON.parse(workspaceFileContent.toString());

      if (workspaceFileJson.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name)) {
        return localize('logicAppNameExists', 'A project with this name already exists in the workspace');
      }
    }

    if (!logicAppNameValidation.test(name)) {
      return localize(
        'logicAppNameInvalidMessage',
        'Logic app name must start with a letter and can only contain letters, digits, "_" and "-".'
      );
    }

    return undefined;
  }
}
