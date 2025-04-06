/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowCodeType } from '../../../constants';
import type { AzureWizardExecuteStep, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { nonNullProp, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type {
  IWorkflowStateTypeStepOptions,
  IWorkflowTemplate,
  IFunctionWizardContext,
  ProjectLanguage,
} from '@microsoft/vscode-extension-logic-apps';
import { TemplateCategory } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../localize';
import { ScriptWorkflowNameStep } from '../createCodeless/createCodelessSteps/ScriptSteps/ScriptWorkflowNameStep';
import { CodefulWorkflowCreateStep } from '../createCodeful/CodefulWorkflowCreateStep';

export class WorkflowCodeTypeStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public hideStepCount = true;

  private readonly triggerSettings: { [key: string]: string | undefined };
  private readonly isProjectWizard: boolean;

  private constructor(triggerSettings: { [key: string]: string | undefined } | undefined, isProjectWizard: boolean | undefined) {
    super();
    this.triggerSettings = triggerSettings || {};
    this.isProjectWizard = !!isProjectWizard;
  }

  public static async create(_context: IFunctionWizardContext, options: IWorkflowStateTypeStepOptions): Promise<WorkflowCodeTypeStep> {
    return new WorkflowCodeTypeStep(options.triggerSettings, options.isProjectWizard);
  }

  public async prompt(context: IFunctionWizardContext): Promise<void> {

      const placeHolder: string = this.isProjectWizard
        ? localize('selectFirstFuncTemplate', "Select a template for your project's first workflow")
        : localize('selectFuncTemplate', 'Select a template for your workflow');

      const result: IWorkflowTemplate = (await context.ui.showQuickPick(this.getPicks(context), { placeHolder }))
        .data;

      context.isCodeless = result.id === workflowCodeType.codeless;
      context.functionTemplate = result;
  }

  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {

    if (!context.isCodeless) {
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];
      const title: string = localize('createCodeless', 'Create new');

      promptSteps.push(new ScriptWorkflowNameStep());
      executeSteps.push(await CodefulWorkflowCreateStep.createStep(context));
      return { promptSteps, executeSteps, title };
    }
    return undefined;
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
