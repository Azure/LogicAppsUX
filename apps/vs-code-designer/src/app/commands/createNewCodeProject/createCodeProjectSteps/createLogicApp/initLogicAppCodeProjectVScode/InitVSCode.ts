/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../localize';
import { DotnetInitVSCodeStep } from '../../../../initProjectForVSCode/DotnetInitVSCodeStep';
import { WorkflowInitCodeProject } from './WorkflowCode';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { AzureWizardExecuteStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { ProjectLanguage } from '@microsoft/vscode-extension';
import type { QuickPickItem, QuickPickOptions } from 'vscode';

export class InitVSCodeLanguageStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const languagePicks: QuickPickItem[] = [{ label: ProjectLanguage.JavaScript }, { label: ProjectLanguage.CSharp }];

    const options: QuickPickOptions = { placeHolder: localize('selectLanguage', "Select your project's language") };
    context.language = (await context.ui.showQuickPick(languagePicks, options)).label as ProjectLanguage;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.language === undefined;
  }

  public async getSubWizard(context: IProjectWizardContext): Promise<IWizardOptions<IProjectWizardContext>> {
    const executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[] = [];
    const promptSteps: AzureWizardPromptStep<IProjectWizardContext>[] = [];
    await addInitVSCodeSteps(context, executeSteps);
    return { promptSteps, executeSteps };
  }
}

export async function addInitVSCodeSteps(
  context: IProjectWizardContext,
  executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[]
): Promise<void> {
  switch (context.language) {
    case ProjectLanguage.JavaScript:
      executeSteps.push(new WorkflowInitCodeProject());
      break;
    case ProjectLanguage.CSharp:
      executeSteps.push(new DotnetInitVSCodeStep());
      break;
  }
}
