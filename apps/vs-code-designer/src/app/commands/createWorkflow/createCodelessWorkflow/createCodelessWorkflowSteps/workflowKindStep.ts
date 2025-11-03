/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { CodelessWorkflowCreateStep } from './codelessWorkflowCreateStep';
import type { AzureWizardExecuteStep, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { nonNullProp, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type {
  IWorkflowStateTypeStepOptions,
  IWorkflowTemplate,
  IFunctionWizardContext,
  ProjectLanguage,
} from '@microsoft/vscode-extension-logic-apps';
import { TemplateCategory, TemplatePromptResult, WorkflowType } from '@microsoft/vscode-extension-logic-apps';
import { WorkflowNameStep } from '../../createWorkflowSteps/workflowNameStep';

export class WorkflowKindStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public hideStepCount = true;

  private readonly triggerSettings: { [key: string]: string | undefined };
  private readonly isProjectWizard: boolean;

  private constructor(triggerSettings: { [key: string]: string | undefined } | undefined, isProjectWizard: boolean | undefined) {
    super();
    this.triggerSettings = triggerSettings || {};
    this.isProjectWizard = !!isProjectWizard;
  }

  public static async create(_context: IFunctionWizardContext, options: IWorkflowStateTypeStepOptions): Promise<WorkflowKindStep> {
    return new WorkflowKindStep(options.triggerSettings, options.isProjectWizard);
  }

  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return !context.functionTemplate && context.isCodeless;
  }

  public async prompt(context: IFunctionWizardContext): Promise<void> {
    while (!context.functionTemplate) {
      const placeHolder: string = this.isProjectWizard
        ? localize('selectFirstWorkflowTemplate', "Select a template for your project's first workflow")
        : localize('selectWorkflowTemplate', 'Select a template for your workflow');

      const result: IWorkflowTemplate | TemplatePromptResult = (await context.ui.showQuickPick(this.getPicks(context), { placeHolder }))
        .data;

      if (result === TemplatePromptResult.skipForNow) {
        context.telemetry.properties.templateId = TemplatePromptResult.skipForNow;
        break;
      }
      context.functionTemplate = result;
    }
  }

  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {
    const template: IWorkflowTemplate | undefined = context.functionTemplate;

    // TODO(aeldridge): Why do we skip the workflow name step for codeful workflows here?
    // TODO(aeldridge): Ensure that context.isCodeless is always set before getting here (createCodelessWorkflow?)
    if (template && context.isCodeless) {
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];
      const title: string = localize('createCodeless', 'Create new {0}', template.name);

      promptSteps.push(new WorkflowNameStep());
      executeSteps.push(await CodelessWorkflowCreateStep.createStep(context));

      for (const key of Object.keys(this.triggerSettings)) {
        context[key.toLowerCase()] = this.triggerSettings[key];
      }

      return { promptSteps, executeSteps, title };
    }

    return undefined;
  }

  private getPicks(context: IFunctionWizardContext): IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[] {
    const language: ProjectLanguage = nonNullProp(context, 'language');

    const stateful: IWorkflowTemplate = {
      id: WorkflowType.stateful,
      name: localize('Stateful', 'Stateful workflow'),
      defaultFunctionName: 'Stateful',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    const stateless: IWorkflowTemplate = {
      id: WorkflowType.stateless,
      name: localize('Stateless', 'Stateless workflow'),
      defaultFunctionName: 'Stateless',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    const agentic: IWorkflowTemplate = {
      id: WorkflowType.agentic,
      name: localize('Agentic', 'Autonomous agent'),
      defaultFunctionName: 'Agentic',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    // Conversational agent
    const agent: IWorkflowTemplate = {
      id: WorkflowType.agent,
      name: localize('Agent', 'Conversational agent'),
      defaultFunctionName: 'Agent',
      language: language,
      isHttpTrigger: false,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    const picks: IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[] = [
      {
        label: stateful.name,
        data: stateful,
      },
      {
        label: stateless.name,
        data: stateless,
      },
      {
        label: agentic.name,
        data: agentic,
      },
      {
        label: agent.name,
        data: agent,
      },
    ];

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
