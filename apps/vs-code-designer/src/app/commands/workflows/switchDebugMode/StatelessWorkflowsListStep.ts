/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from '../../../../constants';
import { localize } from '../../../../localize';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IDebugModeContext } from '@microsoft/vscode-extension-logic-apps';
import { lstat, pathExists, readdir, readFileSync } from 'fs-extra';
import * as path from 'path';

export class StatelessWorkflowsListStep extends AzureWizardPromptStep<IDebugModeContext> {
  public async prompt(context: IDebugModeContext): Promise<void> {
    const placeHolder: string = localize('debugMode.selectWorkflow', 'Select a stateless workflow to change debug mode.');
    const workflowPicks = await this.getStatelessWorkflows(context.projectPath);
    const workflowName = (await context.ui.showQuickPick(workflowPicks, { placeHolder })).data;

    if (workflowName) {
      const placeHolder: string = localize('debugMode.changeMode', `Update debug mode for workflow ${workflowName}.`);
      const picks: IAzureQuickPickItem<boolean>[] = [
        { label: localize('debugMode.enableDebug', 'Enable debug mode'), data: true },
        { label: localize('debugMode.disableDebug', 'Disable debug mode'), data: false },
      ];
      context.enableDebugMode = (await context.ui.showQuickPick(picks, { placeHolder })).data;
      context.workflowName = workflowName;
    }
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private async getStatelessWorkflows(projectPath: string): Promise<IAzureQuickPickItem<string>[]> {
    if (!(await pathExists(projectPath))) {
      return [];
    }

    const statelessWorkflows: string[] = [];
    const subPaths: string[] = await readdir(projectPath);
    for (const subPath of subPaths) {
      const fullPath: string = path.join(projectPath, subPath);
      const fileStats = await lstat(fullPath);

      if (fileStats.isDirectory()) {
        try {
          const workflowFilePath = path.join(fullPath, workflowFileName);

          if (await pathExists(workflowFilePath)) {
            const workflowContent = JSON.parse(readFileSync(workflowFilePath, 'utf8'));

            if (workflowContent?.kind?.toLowerCase() === 'stateless') {
              statelessWorkflows.push(subPath);
            }
          }
        } catch {
          // NOTE(psamband): If unable to read the workflow.json we skip the workflow
        }
      }
    }

    return statelessWorkflows.map((workflow) => ({
      label: workflow,
      data: workflow,
    }));
  }
}
