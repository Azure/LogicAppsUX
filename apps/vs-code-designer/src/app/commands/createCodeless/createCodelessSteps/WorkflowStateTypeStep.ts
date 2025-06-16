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
import { TemplatePromptResult } from '@microsoft/vscode-extension-logic-apps';
import { getWorkflowTemplatePickItems } from '../../../utils/codeless/templates';

export class WorkflowStateTypeStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public hideStepCount = true;

  private readonly triggerSettings: { [key: string]: string | undefined };
  private readonly isProjectWizard: boolean;

  private constructor(triggerSettings: { [key: string]: string | undefined } | undefined, isProjectWizard: boolean | undefined) {
    super();
    this.triggerSettings = triggerSettings || {};
    this.isProjectWizard = !!isProjectWizard;
  }

  public static async create(_context: IFunctionWizardContext, options: IWorkflowStateTypeStepOptions): Promise<WorkflowStateTypeStep> {
    return new WorkflowStateTypeStep(options.triggerSettings, options.isProjectWizard);
  }

  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {
    const template: IWorkflowTemplate | undefined = context.functionTemplate;

    if (template && context.isCodeless) {
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];
      const title: string = localize('createCodeless', 'Create new {0}', template.name);

      promptSteps.push(new ScriptWorkflowNameStep());
      executeSteps.push(await CodelessWorkflowCreateStep.createStep(context));

      for (const key of Object.keys(this.triggerSettings)) {
        context[key.toLowerCase()] = this.triggerSettings[key];
      }

      return { promptSteps, executeSteps, title };
    }
    return undefined;
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

  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return !context.functionTemplate && context.isCodeless;
  }

  private async getPicks(context: IFunctionWizardContext): Promise<IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[]> {
    const language: ProjectLanguage = nonNullProp(context, 'language');
    return getWorkflowTemplatePickItems(language, this.isProjectWizard);
  }
}
