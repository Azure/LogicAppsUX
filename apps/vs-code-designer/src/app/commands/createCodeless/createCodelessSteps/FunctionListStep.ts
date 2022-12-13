/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { templateFilterSetting } from '../../../../constants';
import { localize } from '../../../../localize';
import { getWorkspaceSetting, updateWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import type {
  AzureWizardExecuteStep,
  IActionContext,
  IAzureQuickPickItem,
  IAzureQuickPickOptions,
  IWizardOptions,
} from '@microsoft/vscode-azext-utils';
import { nonNullProp, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IFunctionTemplate, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension';
import { OpenBehavior, TemplateCategory, TemplateFilter, TemplatePromptResult } from '@microsoft/vscode-extension';

export class FunctionListStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public hideStepCount = true;

  private readonly triggerSettings: { [key: string]: string | undefined };
  private readonly isProjectWizard: boolean;

  private constructor(triggerSettings: { [key: string]: string | undefined } | undefined, isProjectWizard: boolean | undefined) {
    super();
    this.triggerSettings = triggerSettings || {};
    this.isProjectWizard = !!isProjectWizard;
  }

  public static async create(_context: IFunctionWizardContext, options: IFunctionListStepOptions): Promise<FunctionListStep> {
    return new FunctionListStep(options.triggerSettings, options.isProjectWizard);
  }

  public async getSubWizard(context: IFunctionWizardContext): Promise<IWizardOptions<IFunctionWizardContext> | undefined> {
    const template: IFunctionTemplate | undefined = context.functionTemplate;
    if (template) {
      const promptSteps: AzureWizardPromptStep<IFunctionWizardContext>[] = [];
      const executeSteps: AzureWizardExecuteStep<IFunctionWizardContext>[] = [];

      //promptSteps.push(new ScriptFunctionNameStep());
      //executeSteps.push(await CodelessFunctionCreateStep.createStep(context));

      for (const key of Object.keys(this.triggerSettings)) {
        // eslint-disable-next-line no-param-reassign
        context[key.toLowerCase()] = this.triggerSettings[key];
      }

      const title: string = localize('createCodeless', 'Create new {0}', template.name);
      return { promptSteps, executeSteps, title };
    } else {
      return undefined;
    }
  }

  public async prompt(context: IFunctionWizardContext): Promise<void> {
    let templateFilter: TemplateFilter =
      getWorkspaceSetting<TemplateFilter>(templateFilterSetting, context.projectPath) || TemplateFilter.Verified;

    while (!context.functionTemplate) {
      const placeHolder: string = this.isProjectWizard
        ? localize('selectFirstFuncTemplate', "Select a template for your project's first workflow")
        : localize('selectFuncTemplate', 'Select a template for your workflow');
      const result: IFunctionTemplate | TemplatePromptResult = (
        await context.ui.showQuickPick(this.getPicks(context, templateFilter), { placeHolder })
      ).data;
      if (result === TemplatePromptResult.skipForNow) {
        // eslint-disable-next-line no-param-reassign
        context.telemetry.properties.templateId = TemplatePromptResult.skipForNow;
        break;
      } else if (result === TemplatePromptResult.changeFilter) {
        templateFilter = await promptForTemplateFilter(context);
        // can only update setting if it's open in a workspace
        if (!this.isProjectWizard || context.openBehavior === OpenBehavior.alreadyOpen) {
          await updateWorkspaceSetting(templateFilterSetting, templateFilter, context.projectPath);
        }
      } else {
        // eslint-disable-next-line no-param-reassign
        context.functionTemplate = result;
      }
    }
    // eslint-disable-next-line no-param-reassign
    context.telemetry.properties.templateFilter = templateFilter;
  }

  public shouldPrompt(context: IFunctionWizardContext): boolean {
    return !context.functionTemplate;
  }

  private async getPicks(
    context: IFunctionWizardContext,
    _templateFilter: TemplateFilter
  ): Promise<IAzureQuickPickItem<IFunctionTemplate | TemplatePromptResult>[]> {
    const language: ProjectLanguage = nonNullProp(context, 'language');
    const picks: IAzureQuickPickItem<IFunctionTemplate | TemplatePromptResult>[] = [];

    const stateful: IFunctionTemplate = {
      id: 'Stateful-Codeless',
      name: localize('Stateful', 'Stateful Workflow'),
      defaultFunctionName: 'Stateful',
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

    const stateless: IFunctionTemplate = {
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

interface IFunctionListStepOptions {
  isProjectWizard: boolean;
  templateId: string | undefined;
  triggerSettings: { [key: string]: string | undefined } | undefined;
}

async function promptForTemplateFilter(context: IActionContext): Promise<TemplateFilter> {
  const picks: IAzureQuickPickItem<TemplateFilter>[] = [
    {
      label: TemplateFilter.Verified,
      description: localize('verifiedDescription', '(Subset of "Core" that has been verified in VS Code)'),
      data: TemplateFilter.Verified,
    },
    { label: TemplateFilter.Core, data: TemplateFilter.Core },
    { label: TemplateFilter.All, data: TemplateFilter.All },
  ];

  const options: IAzureQuickPickOptions = { suppressPersistence: true, placeHolder: localize('selectFilter', 'Select a template filter') };
  return (await context.ui.showQuickPick(picks, options)).data;
}
