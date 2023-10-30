import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as vscode from 'vscode';

export class SetLogicAppName extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const logicAppName = await vscode.window.showInputBox({
      prompt: 'Enter a name for your Logic App project',
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return 'Project name cannot be empty';
        }
        return undefined;
      },
    });

    if (logicAppName) {
      context.logicAppName = logicAppName;
    } else {
      throw new Error('Logic App project name is required.');
    }
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.isCustomCodeLogicApp && context.isCustomCodeLogicApp !== null;
  }
}
