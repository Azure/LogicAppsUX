/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { type IProjectWizardContext, ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import { OpenBehavior } from '@microsoft/vscode-extension-logic-apps';

export class WorkspaceSettingsStep extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  /**
   * Prompts the user for project information and sets up directories
   * @param context - Project wizard context containing user selections and settings
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set default project type and language
    context.workflowProjectType = WorkflowProjectType.Bundle;
    context.language = ProjectLanguage.JavaScript;

    // Create directories based on user choices
    const { workspacePath } = context;
    if (context.customWorkspaceFolderPath && context.workspaceCustomFilePath.endsWith('.code-workspace')) {
      await this.updateWorkspaceFile(context);
      context.openBehavior = OpenBehavior.addToWorkspace;
    } else {
      context.customWorkspaceFolderPath = workspacePath;
      await this.createWorkspaceFile(context);
    }
  }

  /**
   * Checks if this step should prompt the user
   * @param context - Project wizard context containing user selections and settings
   * @returns True if user should be prompted, otherwise false
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Creates a .code-workspace file to group project directories in VS Code
   * @param context - Project wizard context
   */
  private async createWorkspaceFile(context: IProjectWizardContext): Promise<void> {
    const workspaceFolders = [];
    const logicAppName = context.logicAppName || 'LogicApp';
    workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });
    const functionsFolder = context.functionAppName;
    if (context.isWorkspaceWithFunctions) {
      workspaceFolders.push({ name: functionsFolder, path: `./${functionsFolder}` });
    }

    const workspaceData = {
      folders: workspaceFolders,
    };

    await fs.writeJSON(context.workspaceCustomFilePath, workspaceData, { spaces: 2 });
  }

  /**
   * Updates a .code-workspace file to group project directories in VS Code
   * @param context - Project wizard context
   */
  private async updateWorkspaceFile(context: IProjectWizardContext): Promise<void> {
    const workspaceContent = await fs.readJson(context.workspaceCustomFilePath);

    const workspaceFolders = [];
    const logicAppName = context.logicAppName || 'LogicApp';
    if (context.shouldCreateLogicAppProject) {
      workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });
    }

    if (context.isWorkspaceWithFunctions) {
      const functionsFolder = context.functionAppName;
      workspaceFolders.push({ name: functionsFolder, path: `./${functionsFolder}` });
    }

    workspaceContent.folders = [...workspaceContent.folders, ...workspaceFolders];

    await fs.writeJSON(context.workspaceCustomFilePath, workspaceContent, { spaces: 2 });
  }
}
