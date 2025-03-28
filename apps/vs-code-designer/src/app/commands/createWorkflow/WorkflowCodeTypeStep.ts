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
import { TemplateCategory, TemplatePromptResult } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../localize';
import { ScriptWorkflowNameStep } from '../createCodeless/createCodelessSteps/ScriptSteps/ScriptWorkflowNameStep';

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
    while (!context.functionTemplate) {
      const placeHolder: string = this.isProjectWizard
        ? localize('selectFirstFuncTemplate', "Select a template for your project's first workflow")
        : localize('selectFuncTemplate', 'Select a template for your workflow');

      const result: IWorkflowTemplate | TemplatePromptResult = (await context.ui.showQuickPick(this.getPicks(context), { placeHolder }))
        .data;

      if (result === TemplatePromptResult.skipForNow) {
        context.telemetry.properties.templateId = TemplatePromptResult.skipForNow;
        break;
      }

      context.isCodeless = result.id === workflowCodeType.codeless;
    }
  }

  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {
    const template: IWorkflowTemplate | undefined = context.functionTemplate;

    if (context.isCodeless) {
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];
      const title: string = localize('createCodeless', 'Create new {0}', template.name);

      promptSteps.push(new ScriptWorkflowNameStep());
      //executeSteps.push(await CodelessWorkflowCreateStep.createStep(context));

      for (const key of Object.keys(this.triggerSettings)) {
        context[key.toLowerCase()] = this.triggerSettings[key];
      }

      return { promptSteps, executeSteps, title };
    }
    return undefined;
  }

  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return !context.functionTemplate;
  }

  private async getPicks(context: IFunctionWizardContext): Promise<IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[]> {
    const language: ProjectLanguage = nonNullProp(context, 'language');
    const picks: IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[] = [];

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

    if (this.isProjectWizard) {
      picks.push({
        label: localize('skipForNow', '$(clock) Skip for now'),
        data: TemplatePromptResult.skipForNow,
        suppressPersistence: true,
      });
    }
    return picks;
  }
}
