/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { type IProjectWizardContext, ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';
import { OpenBehavior } from '@microsoft/vscode-extension-logic-apps';

export class SetWorkspaceSettings extends AzureWizardPromptStep<IProjectWizardContext> {
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
    const { workspacePath, isWorkspaceWithFunctions } = context;
    if (context.customWorkspaceFolderPath && context.workspaceCustomFilePath.endsWith('.code-workspace')) {
      await this.createDirectoriesExistingWorkspace(context, workspacePath, isWorkspaceWithFunctions);
    } else {
      await this.createDirectories(context, workspacePath, isWorkspaceWithFunctions);
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
   * Creates required directories for the project
   * @param context - Project wizard context
   * @param workspacePath - Root path of the workspace
   * @param isWorkspaceWithFunctions - Flag to check if it's a workspace with functions
   */
  private async createDirectories(context: IProjectWizardContext, workspacePath: string, isWorkspaceWithFunctions: boolean): Promise<void> {
    context.customWorkspaceFolderPath = workspacePath;
    if (isWorkspaceWithFunctions) {
      await this.setupCustomDirectories(context, workspacePath);
    }
    await this.createWorkspaceFile(context);
  }

  /**
   * Creates required directories for the project
   * @param context - Project wizard context
   * @param workspacePath - Root path of the workspace
   * @param isWorkspaceWithFunctions - Flag to check if it's a workspace with functions
   */
  private async createDirectoriesExistingWorkspace(
    context: IProjectWizardContext,
    workspacePath: string,
    isWorkspaceWithFunctions: boolean
  ): Promise<void> {
    if (isWorkspaceWithFunctions) {
      await this.setupCustomDirectories(context, workspacePath);
    }
    await this.updateWorkspaceFile(context);
    context.openBehavior = OpenBehavior.addToWorkspace;
  }

  /**
   * Setup directories and configs for custom code logic app
   * @param context - Project wizard context
   * @param workspacePath - Root path of the workspace
   */
  private async setupCustomDirectories(context: IProjectWizardContext, workspacePath: string): Promise<void> {
    const functionFolderPath = path.join(workspacePath, context.functionAppName);
    await fs.ensureDir(functionFolderPath);
    context.functionFolderPath = functionFolderPath;
  }

  /**
   * Creates a .code-workspace file to group project directories in VS Code
   * @param context - Project wizard context
   */
  private async createWorkspaceFile(context: IProjectWizardContext): Promise<void> {
    // Start with an empty folders array
    const workspaceFolders = [];

    // Add Functions folder first if it's a custom code code Logic App
    const functionsFolder = context.functionAppName;
    if (context.isWorkspaceWithFunctions) {
      workspaceFolders.push({ name: functionsFolder, path: `./${functionsFolder}` });
    }

    // Use context.logicAppName for the folder name; default to 'LogicApp' if not available
    const logicAppName = context.logicAppName || 'LogicApp';
    workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });

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
    // Read existing workspace file
    const workspaceContent = await fs.readJson(context.workspaceCustomFilePath);

    // Start with an empty folders array
    const workspaceFolders = [];

    // Add Functions folder first if it's a custom code code Logic App
    const functionsFolder = context.functionAppName;
    if (context.isWorkspaceWithFunctions) {
      workspaceFolders.push({ name: functionsFolder, path: `./${functionsFolder}` });
    }

    // Use context.logicAppName for the folder name; default to 'LogicApp' if not available
    const logicAppName = context.logicAppName || 'LogicApp';
    workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });

    workspaceContent.folders = [...workspaceContent.folders, ...workspaceFolders];

    await fs.writeJSON(context.workspaceCustomFilePath, workspaceContent, { spaces: 2 });
  }
}
