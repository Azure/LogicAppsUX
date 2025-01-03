/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { type IProjectWizardContext, ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import { isLogicAppProject } from '../../../utils/verifyIsProject';

export class SetWorkspaceContents extends AzureWizardPromptStep<IProjectWizardContext> {
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
    await this.createWorkspaceFile(context);
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
    // Start with an empty folders array
    const workspaceFolders = [];
    const foldersToAdd = vscode.workspace.workspaceFolders;

    if (foldersToAdd && foldersToAdd.length === 1) {
      const folder = foldersToAdd[0];
      const folderPath = folder.uri.fsPath;
      if (await isLogicAppProject(folderPath)) {
        const destinationPath = path.join(context.workspacePath, folder.name);
        await fse.copy(folderPath, destinationPath);
        workspaceFolders.push({ name: folder.name, path: `./${folder.name}` });
      } else {
        const subpaths: string[] = await fse.readdir(folderPath);
        for (const subpath of subpaths) {
          const fullPath = path.join(folderPath, subpath);
          const destinationPath = path.join(context.workspacePath, subpath);
          await fse.copy(fullPath, destinationPath);
          workspaceFolders.push({ name: subpath, path: `./${subpath}` });
        }
      }
    }

    const workspaceData = {
      folders: workspaceFolders,
    };

    await fse.writeJSON(context.workspaceCustomFilePath, workspaceData, { spaces: 2 });
    context.openBehavior = OpenBehavior.openInCurrentWindow;
  }
}
