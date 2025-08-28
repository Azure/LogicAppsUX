/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowCodeType } from '../../../../constants';
import type { AzureWizardExecuteStep, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { nonNullProp, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type {
  IWorkflowStateTypeStepOptions,
  IWorkflowTemplate,
  IFunctionWizardContext,
  ProjectLanguage,
} from '@microsoft/vscode-extension-logic-apps';
import { TemplateCategory } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../../localize';
import { CodefulWorkflowCreateStep } from '../createCodefulWorkflow/createCodefulWorkflowSteps/codefulWorkflowCreateStep';
import { WorkflowNameStep } from '../createCodelessWorkflow/createCodelessWorkflowSteps/workflowNameStep';

export class WorkflowCodeTypeStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public hideStepCount = true;

  private readonly triggerSettings: { [key: string]: string | undefined };

  private constructor(triggerSettings: { [key: string]: string | undefined } | undefined) {
    super();
    this.triggerSettings = triggerSettings || {};
  }

  public static async create(_context: IFunctionWizardContext, options: IWorkflowStateTypeStepOptions): Promise<WorkflowCodeTypeStep> {
    return new WorkflowCodeTypeStep(options.triggerSettings);
  }

  public async prompt(context: IFunctionWizardContext): Promise<void> {
    const placeHolder: string = localize('selectWorkflowCodeType', 'Select codeless or codeful workflow type');
    const result: IWorkflowTemplate = (await context.ui.showQuickPick(this.getPicks(context), { placeHolder })).data;

    context.isCodeless = result.id === workflowCodeType.codeless;

    // template is set for codeful as we have all information needed to create resources
    if (!context.isCodeless) {
      context.functionTemplate = result;
    }
  }

  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {
    if (!context.isCodeless) {
      // final step for codeful workflows
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];
      const title: string = localize('createCodeless', 'Create new');

      promptSteps.push(new WorkflowNameStep());
      executeSteps.push(await CodefulWorkflowCreateStep.createStep(context));
      return { promptSteps, executeSteps, title };
    }
    return undefined; // codeless workflows move onto next step
  }

  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return context.isCodeless === undefined;
  }

  private async getPicks(context: IFunctionWizardContext): Promise<IAzureQuickPickItem<IWorkflowTemplate>[]> {
    const language: ProjectLanguage = nonNullProp(context, 'language');
    const picks: IAzureQuickPickItem<IWorkflowTemplate>[] = [];

    const codeful: IWorkflowTemplate = {
      id: workflowCodeType.codeful,
      name: localize('Codeful', 'Codeful Workflow (Preview)'),
      defaultFunctionName: 'Codeful',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    const codeless: IWorkflowTemplate = {
      id: workflowCodeType.codeless,
      name: localize('Codeless', 'Codeless Workflow'),
      defaultFunctionName: 'Codeless',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    picks.push({
      label: codeful.name,
      data: codeful,
    });

    picks.push({
      label: codeless.name,
      data: codeless,
    });

    return picks;
  }
}
