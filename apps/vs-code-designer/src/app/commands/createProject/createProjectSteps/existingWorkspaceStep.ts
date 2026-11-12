/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWorkspaceFilePath } from '../../../utils/workspace';
import { AzureWizardPromptStep, nonNullValue } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs-extra';
import * as path from 'path';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class ExistingWorkspaceStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public shouldPrompt(): boolean {
    return true;
  }

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const workspaceFilePath = await getWorkspaceFilePath();
    context.workspaceFilePath = nonNullValue(workspaceFilePath, 'workspaceFilePath');
    context.workspacePath = path.dirname(workspaceFilePath!);
    await fs.ensureDir(context.workspacePath);
    // reset flag in case previously set when creating workspace
    context.shouldCreateLogicAppProject = false;
  }
}
