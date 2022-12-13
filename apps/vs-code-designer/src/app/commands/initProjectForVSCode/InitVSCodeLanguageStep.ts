/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { DotnetInitVSCodeStep } from './DotnetInitVSCodeStep';
import { WorkflowInitVSCodeStep } from './WorkflowInitVSCodeStep';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { AzureWizardExecuteStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension';
import type { QuickPickItem, QuickPickOptions } from 'vscode';

export class InitVSCodeLanguageStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const previewDescription: string = localize('previewDescription', '(Preview)');
    // Display all languages, even if we don't have full support for them
    const languagePicks: QuickPickItem[] = [
      { label: ProjectLanguage.CSharp },
      { label: ProjectLanguage.CSharpScript },
      { label: ProjectLanguage.FSharp },
      { label: ProjectLanguage.FSharpScript },
      { label: ProjectLanguage.Java },
      { label: ProjectLanguage.JavaScript },
      { label: ProjectLanguage.PowerShell, description: previewDescription },
      { label: ProjectLanguage.TypeScript },
    ];

    const options: QuickPickOptions = { placeHolder: localize('selectLanguage', "Select your project's language") };
    // eslint-disable-next-line no-param-reassign
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
  switch (context.workflowProjectType) {
    case WorkflowProjectType.Bundle:
      executeSteps.push(new WorkflowInitVSCodeStep());
      break;
    case WorkflowProjectType.Nuget:
      executeSteps.push(new DotnetInitVSCodeStep());
      break;
  }
}
