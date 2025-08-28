/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWorkspaceRoot, getWorkspaceFile } from '../../../utils/workspace';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs-extra';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class ExistingWorkspaceStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.workspaceFilePath = await getWorkspaceFile(context);
    //save uri variable for open project folder command
    context.workspacePath = await getWorkspaceRoot(context);
    await fs.ensureDir(context.workspacePath);
    // reset flag in case previously set when creating workspace
    context.shouldCreateLogicAppProject = false;
  }

  public shouldPrompt(): boolean {
    return true;
  }
}
