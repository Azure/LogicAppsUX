/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WorkflowStateTypeStep } from '../../createCodeless/createCodelessSteps/WorkflowStateTypeStep';
import { addInitVSCodeSteps } from '../../initProjectForVSCode/InitVSCodeLanguageStep';
import { WorkflowProjectCreateStep } from './WorkflowProjectCreateStep';
import type { AzureWizardExecuteStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';

export class NewProjectTypeStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;
  private readonly templateId?: string;
  private readonly functionSettings?: { [key: string]: string | undefined };

  public constructor(templateId: string | undefined, functionSettings: { [key: string]: string | undefined } | undefined) {
    super();
    this.templateId = templateId;
    this.functionSettings = functionSettings;
  }

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.workflowProjectType = WorkflowProjectType.Bundle;
    context.language = ProjectLanguage.JavaScript;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.workflowProjectType === undefined;
  }

  public async getSubWizard(context: IProjectWizardContext): Promise<IWizardOptions<IProjectWizardContext>> {
    const executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[] = [];

    const promptSteps: AzureWizardPromptStep<IProjectWizardContext>[] = [];
    const projectType: WorkflowProjectType = nonNullProp(context, 'workflowProjectType');

    switch (projectType) {
      case WorkflowProjectType.Bundle: {
        executeSteps.push(new WorkflowProjectCreateStep());
        break;
      }
    }

    await addInitVSCodeSteps(context, executeSteps, false);

    const wizardOptions: IWizardOptions<IProjectWizardContext> = { promptSteps, executeSteps };

    promptSteps.push(
      await WorkflowStateTypeStep.create(context, {
        isProjectWizard: true,
        templateId: this.templateId,
        triggerSettings: this.functionSettings,
      })
    );

    return wizardOptions;
  }
}
