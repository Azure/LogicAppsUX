/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { WorkflowKindStep } from '../../createWorkflow/createCodelessWorkflow/createCodelessWorkflowSteps/workflowKindStep';
import { ProjectCreateStep } from './projectCreateStep';
import { WorkflowCodeTypeStep } from '../../createWorkflow/createWorkflowSteps/workflowCodeTypeStep';
import { addInitVSCodeSteps } from '../../initProjectForVSCode/initProjectLanguageStep';
import { FunctionAppFilesStep } from '../createCustomCodeProjectSteps/functionAppFilesStep';
import { FunctionAppNameStep } from '../createCustomCodeProjectSteps/functionAppNameStep';
import { FunctionAppNamespaceStep } from '../createCustomCodeProjectSteps/functionAppNamespaceStep';
import { CustomCodeProjectCreateStep } from '../createCustomCodeProjectSteps/customCodeProjectCreateStep';
import type { AzureWizardExecuteStep, IActionContext, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep, nonNullProp } from '@microsoft/vscode-azext-utils';
import { type IProjectWizardContext, ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';

// TODO(aeldridge): Move subwizard steps here into a separate "SetupProjectStep" or subwizard of LogicAppTemplateStep
export class ProjectTypeStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  private readonly templateId?: string;
  private readonly functionSettings?: { [key: string]: string | undefined };
  private readonly skipWorkflowStateTypeStep: boolean;

  /**
   * Initializes the ProjectTypeStep object with optional templateId and functionSettings parameters.
   * @param templateId - The ID of the template for the code project.
   * @param functionSettings - The settings for the functions in the code project.
   * @param isImportedProject - A boolean indicating whether the project is imported (cloud to local).
   */
  private constructor(
    templateId: string | undefined,
    functionSettings: { [key: string]: string | undefined } | undefined,
    isImportedProject: boolean
  ) {
    super();
    this.templateId = templateId;
    this.functionSettings = functionSettings;
    // TODO(aeldridge): Remove this (should use context)
    this.skipWorkflowStateTypeStep = isImportedProject;
  }

  public static async create(
    _context: IActionContext,
    templateId: string | undefined,
    functionSettings: { [key: string]: string | undefined } | undefined,
    isImportedProject: boolean
  ): Promise<ProjectTypeStep> {
    return new ProjectTypeStep(templateId, functionSettings, isImportedProject);
  }

  /**
   * Checks if this step should prompt the user
   * @param context - Project wizard context containing user selections and settings
   * @returns True if user should be prompted, otherwise false
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Prompts the user for project information and sets up directories
   * @param context - Project wizard context containing user selections and settings
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set default project type and language
    // TODO(aeldridge): Add support for non-bundle-based project creation here
    context.workflowProjectType = WorkflowProjectType.Bundle;
    context.language = ProjectLanguage.JavaScript;
    await this.setPaths(context);
  }

  /**
   * Gets the sub-wizard based on the context provided
   * @param context - Project wizard context containing user selections and settings
   * @returns Wizard options including prompt and execute steps
   */
  public async getSubWizard(context: IProjectWizardContext): Promise<IWizardOptions<IProjectWizardContext>> {
    const promptSteps: AzureWizardPromptStep<IProjectWizardContext>[] = [];
    const executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[] = [];

    if (context.isWorkspaceWithFunctions) {
      await this.setupCustomCodeLogicApp(context, executeSteps, promptSteps);
    } else {
      await this.setupLogicApp(context, executeSteps, promptSteps);
    }
    return { promptSteps, executeSteps };
  }

  /**
   * Sets the paths required for the project
   * @param context - Project wizard context
   * @param isWorkspaceWithFunctions - Flag to check if it's a workspace with functions
   */
  private async setPaths(context: IProjectWizardContext): Promise<void> {
    await fs.ensureDir(context.workspacePath);

    const logicAppFolderPath = path.join(context.workspacePath, context.logicAppName);
    await fs.ensureDir(logicAppFolderPath);
    context.logicAppFolderPath = logicAppFolderPath;

    context.projectPath = logicAppFolderPath;
  }

  /**
   * Configures steps for custom code Logic App
   * @param context - Project wizard context
   * @param executeSteps - List of steps to execute
   * @param promptSteps - List of steps to prompt
   */
  private async setupCustomCodeLogicApp(
    context: IProjectWizardContext,
    executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[],
    promptSteps: AzureWizardPromptStep<IProjectWizardContext>[]
  ): Promise<void> {
    promptSteps.push(new FunctionAppNameStep(), new FunctionAppNamespaceStep(), new FunctionAppFilesStep());

    if (context.shouldCreateLogicAppProject) {
      context.projectPath = nonNullProp(context, 'logicAppFolderPath');
      executeSteps.push(new CustomCodeProjectCreateStep());
      await addInitVSCodeSteps(context, executeSteps, true);

      if (ext.codefulEnabled) {
        promptSteps.push(new WorkflowCodeTypeStep());
      } else {
        context.isCodeless = true; // default to codeless workflow, disabling codeful option
      }

      promptSteps.push(
        await WorkflowKindStep.create(context, {
          isProjectWizard: true,
          templateId: this.templateId,
          triggerSettings: this.functionSettings,
        })
      );
    }
  }

  /**
   * Configures steps for regular Logic App
   * @param context - Project wizard context
   * @param executeSteps - List of steps to execute
   * @param promptSteps - List of steps to prompt
   */
  private async setupLogicApp(
    context: IProjectWizardContext,
    executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[],
    promptSteps: AzureWizardPromptStep<IProjectWizardContext>[]
  ): Promise<void> {
    executeSteps.push(new ProjectCreateStep());
    await addInitVSCodeSteps(context, executeSteps, false);

    if (!this.skipWorkflowStateTypeStep) {
      if (ext.codefulEnabled) {
        promptSteps.push(new WorkflowCodeTypeStep());
      } else {
        context.isCodeless = true; // default to codeless workflow, disabling codeful option
      }

      promptSteps.push(
        await WorkflowKindStep.create(context, {
          isProjectWizard: true,
          templateId: this.templateId,
          triggerSettings: this.functionSettings,
        })
      );
    }
  }
}
