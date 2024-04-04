/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { OpenBehavior } from '@microsoft/vscode-extension-logic-apps';

export class OpenBehaviorStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const picks: IAzureQuickPickItem<OpenBehavior>[] = [
      { label: localize('OpenInCurrentWindow', 'Open in current window'), data: OpenBehavior.openInCurrentWindow },
      { label: localize('OpenInNewWindow', 'Open in new window'), data: OpenBehavior.openInNewWindow },
      { label: localize('AddToWorkspace', 'Add to workspace'), data: OpenBehavior.addToWorkspace },
    ];

    const placeHolder: string = localize('selectOpenBehavior', 'Select how you would like to open your project');
    context.openBehavior = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.openBehavior && context.openBehavior !== OpenBehavior.alreadyOpen && context.openBehavior !== OpenBehavior.dontOpen;
  }
}
