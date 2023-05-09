/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { OpenBehavior } from '@microsoft/vscode-extension';

/**
 * This class represents a step in the Azure Logic Apps Standard wizard that prompts the user for how they would like to open their project.
 */
export class OpenBehaviorStepCodeProject extends AzureWizardPromptStep<IProjectWizardContext> {
  /**
   * Prompts the user for how they would like to open their project.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Define the available options for opening the project
    const picks: IAzureQuickPickItem<OpenBehavior>[] = [
      { label: localize('OpenInCurrentWindow', 'Open in current window'), data: OpenBehavior.openInCurrentWindow },
      { label: localize('OpenInNewWindow', 'Open in new window'), data: OpenBehavior.openInNewWindow },
      { label: localize('AddToWorkspace', 'Add to workspace'), data: OpenBehavior.addToWorkspace },
    ];

    // Show a quick pick menu with the available options
    const placeHolder: string = localize('selectOpenBehavior', 'Select how you would like to open your project');
    context.openBehavior = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  /**
   * Determines whether the user should be prompted for how they would like to open their project.
   * @param context The project wizard context.
   * @returns True if the user has not yet selected an open behavior, false otherwise.
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.openBehavior && context.openBehavior !== OpenBehavior.alreadyOpen && context.openBehavior !== OpenBehavior.dontOpen;
  }
}
