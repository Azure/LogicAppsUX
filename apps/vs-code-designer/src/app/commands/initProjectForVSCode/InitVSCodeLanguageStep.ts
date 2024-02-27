/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { WorkflowInitCodeProject } from '../createNewCodeProject/createCodeProjectSteps/createLogicApp/initLogicAppCodeProjectVScode/WorkflowCode';
import { DotnetInitVSCodeStep } from './DotnetInitVSCodeStep';
import { WorkflowInitVSCodeStep } from './WorkflowInitVSCodeStep';
import { isEmptyString } from '@microsoft/utils-logic-apps';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { AzureWizardExecuteStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension';
import type { QuickPickItem, QuickPickOptions } from 'vscode';

export class InitVSCodeLanguageStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const languagePicks: QuickPickItem[] = [{ label: ProjectLanguage.JavaScript }, { label: ProjectLanguage.CSharp }];

    const options: QuickPickOptions = { placeHolder: localize('selectLanguage', "Select your project's language") };
    context.language = (await context.ui.showQuickPick(languagePicks, options)).label as ProjectLanguage;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return isEmptyString(context.language);
  }

  public async getSubWizard(context: IProjectWizardContext): Promise<IWizardOptions<IProjectWizardContext>> {
    const executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[] = [];
    const promptSteps: AzureWizardPromptStep<IProjectWizardContext>[] = [];
    await addInitVSCodeSteps(context, executeSteps, false);
    return { promptSteps, executeSteps };
  }
}

export async function addInitVSCodeSteps(
  context: IProjectWizardContext,
  executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[],
  isCustomCode: boolean
): Promise<void> {
  switch (context.language) {
    case ProjectLanguage.JavaScript:
      context.workflowProjectType = WorkflowProjectType.Bundle;
      executeSteps.push(isCustomCode ? new WorkflowInitCodeProject() : new WorkflowInitVSCodeStep());
      break;
    case ProjectLanguage.CSharp:
      context.workflowProjectType = WorkflowProjectType.Nuget;
      executeSteps.push(new DotnetInitVSCodeStep());
      break;
  }
}
