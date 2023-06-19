/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowType } from '../../../../../constants';
import { localize } from '../../../../../localize';
import { ScriptWorkflowNameStep } from '../../../createCodeless/createCodelessSteps/ScriptSteps/ScriptWorkflowNameStep';
import { CodelessFunctiontWorkflow } from './CodelessFunctionWorkflow';
import type { AzureWizardExecuteStep, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { nonNullProp, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type {
  IWorkflowStateTypeStepOptions,
  IWorkflowTemplate,
  IFunctionWizardContext,
  ProjectLanguage,
} from '@microsoft/vscode-extension';
import { TemplateCategory, TemplatePromptResult } from '@microsoft/vscode-extension';

/**
 * This class represents a prompt step that allows the user to select a workflow type for their Azure Functions project.
 */
export class CodeProjectWorkflowStateTypeStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  private readonly triggerSettings: { [key: string]: string | undefined };
  private readonly isProjectWizard: boolean;

  /**
   * Creates a new instance of the odeProject class.
   * @param triggerSettings The settings for the trigger.
   * @param isProjectWizard A flag indicating whether this is a project wizard.
   */
  private constructor(triggerSettings: { [key: string]: string | undefined } | undefined, isProjectWizard: boolean | undefined) {
    super();
    this.triggerSettings = triggerSettings || {};
    this.isProjectWizard = !!isProjectWizard;
  }

  /**
   * Creates a new instance of the odeProject class with the specified options.
   * @param _context The function wizard context.
   * @param options The options for the step.
   * @returns A new instance of the odeProject class.
   */
  public static async create(
    _context: IFunctionWizardContext,
    options: IWorkflowStateTypeStepOptions
  ): Promise<CodeProjectWorkflowStateTypeStep> {
    return new CodeProjectWorkflowStateTypeStep(options.triggerSettings, options.isProjectWizard);
  }

  /**
   * Creates a sub-wizard that will be used to create the project.
   * @param context The function wizard context.
   * @returns An object containing the prompt and execute steps for the sub-wizard.
   */
  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {
    const template: IWorkflowTemplate | undefined = context.functionTemplate;

    if (template) {
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];
      const title: string = localize('createCodeless', 'Create new {0}', template.name);

      // Add a step to prompt the user for the workflow name
      promptSteps.push(new ScriptWorkflowNameStep());

      // Add a step to create the workflow
      executeSteps.push(await CodelessFunctiontWorkflow.createStep(context));

      // Set the trigger settings for the context
      for (const key of Object.keys(this.triggerSettings)) {
        context[key.toLowerCase()] = this.triggerSettings[key];
      }

      // Create the sub-wizard options object
      return { promptSteps, executeSteps, title };
    } else {
      return undefined;
    }
  }

  /**
   * Prompts the user to select a workflow type for their Azure Functions project.
   * @param context The function wizard context.
   */
  public async prompt(context: IFunctionWizardContext): Promise<void> {
    while (!context.functionTemplate) {
      const placeHolder: string = this.isProjectWizard
        ? localize('selectFirstFuncTemplate', "Select a template for your project's first workflow")
        : localize('selectFuncTemplate', 'Select a template for your workflow');

      // Show a quick pick menu with the available workflow types
      const result: IWorkflowTemplate | TemplatePromptResult = (await context.ui.showQuickPick(this.getPicks(context), { placeHolder }))
        .data;

      // If the user chooses to skip for now, set the telemetry properties and break out of the loop
      if (result === TemplatePromptResult.skipForNow) {
        context.telemetry.properties.templateId = TemplatePromptResult.skipForNow;
        break;
      } else {
        // Otherwise, set the selected workflow template in the context
        context.functionTemplate = result;
      }
    }
  }

  /**
   * Determines whether the user should be prompted to select a workflow type for their Azure Functions project.
   * @param context The function wizard context.
   * @returns True if the user has not yet selected a workflow type, false otherwise.
   */
  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return !context.functionTemplate;
  }

  /**
   * Gets the available workflow types for the user to choose from.
   * @param context The function wizard context.
   * @returns An array of quick pick items representing the available workflow types.
   */
  private async getPicks(context: IFunctionWizardContext): Promise<IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[]> {
    const language: ProjectLanguage = nonNullProp(context, 'language');
    const picks: IAzureQuickPickItem<IWorkflowTemplate | TemplatePromptResult>[] = [];

    // Define the stateful and stateless workflow templates
    const stateful: IWorkflowTemplate = {
      id: workflowType.stateful,
      name: localize('Stateful', 'Stateful Workflow'),
      defaultFunctionName: 'Stateful',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    const stateless: IWorkflowTemplate = {
      id: workflowType.stateless,
      name: localize('Stateless', 'Stateless Workflow'),
      defaultFunctionName: 'Stateless',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    };

    // Add the stateful and stateless workflow templates to the quick pick menu
    picks.push({
      label: stateful.name,
      data: stateful,
    });

    picks.push({
      label: stateless.name,
      data: stateless,
    });

    // If this is a project wizard, add an option to skip for now
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
