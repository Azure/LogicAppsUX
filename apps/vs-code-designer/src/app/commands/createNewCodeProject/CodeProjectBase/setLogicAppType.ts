/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { ProjectType, type IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class SetLogicAppType extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const picks: IAzureQuickPickItem<ProjectType>[] = [
      { label: localize('logicApp', 'Logic app'), data: ProjectType.logicApp },
      { label: localize('logicAppCustomCode', 'Logic app with custom code project'), data: ProjectType.customCode },
      { label: localize('logicAppRulesEngine', 'Logic app with rules engine project'), data: ProjectType.rulesEngine },
    ];

    const placeHolder = localize('logicAppProjectTemplatePlaceHolder', 'Select a project template for your logic app workspace');
    context.projectType = (await context.ui.showQuickPick(picks, { placeHolder })).data;
    context.isWorkspaceWithFunctions = context.projectType !== ProjectType.logicApp;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.projectType === undefined;
  }
}
