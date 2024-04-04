/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { CodelessWorkflowCreateStep } from './CodelessWorkflowCreateStep';
import { ScriptWorkflowNameStep } from './ScriptSteps/ScriptWorkflowNameStep';
import type { AzureWizardExecuteStep, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { nonNullProp, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type {
  IWorkflowStateTypeStepOptions,
  IWorkflowTemplate,
  IFunctionWizardContext,
  ProjectLanguage,
} from '@microsoft/vscode-extension-logic-apps';
import { TemplateCategory, TemplatePromptResult } from '@microsoft/vscode-extension-logic-apps';

export class WorkflowListStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public hideStepCount = true;

  private readonly triggerSettings: { [key: string]: string | undefined };
  private readonly isProjectWizard: boolean;

  private constructor(triggerSettings: { [key: string]: string | undefined } | undefined, isProjectWizard: boolean | undefined) {
    super();
    this.triggerSettings = triggerSettings || {};
    this.isProjectWizard = !!isProjectWizard;
  }

  public static async create(_context: IFunctionWizardContext, options: IWorkflowStateTypeStepOptions): Promise<WorkflowListStep> {
    return new WorkflowListStep(options.triggerSettings, options.isProjectWizard);
  }

  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {
    const template: IWorkflowTemplate | undefined = context.functionTemplate;

    if (template) {
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];
      const title: string = localize('createCodeless', 'Create new {0}', template.name);

      promptSteps.push(new ScriptWorkflowNameStep());
      executeSteps.push(await CodelessWorkflowCreateStep.createStep(context));

      for (const key of Object.keys(this.triggerSettings)) {
        context[key.toLowerCase()] = this.triggerSettings[key];
      }

      return { promptSteps, executeSteps, title };
    } else {
      return undefined;
    }
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
      } else {
        context.functionTemplate = result;
      }
    }
  }

  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return !context.functionTemplate;
  }

  private async getPicks(context: IFunctionWizardContext): Promise<IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[]> {
    const language: ProjectLanguage = nonNullProp(context, 'language');
    const picks: IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[] = [];

    const stateful: IWorkflowTemplate = {
      id: 'Stateful-Codeless',
      name: localize('Stateful', 'Stateful Workflow'),
      defaultFunctionName: 'Stateful',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    const stateless: IWorkflowTemplate = {
      id: 'Stateless-Codeless',
      name: localize('Stateless', 'Stateless Workflow'),
      defaultFunctionName: 'Stateless',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    picks.push({
      label: stateful.name,
      data: stateful,
    });

    picks.push({
      label: stateless.name,
      data: stateless,
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
