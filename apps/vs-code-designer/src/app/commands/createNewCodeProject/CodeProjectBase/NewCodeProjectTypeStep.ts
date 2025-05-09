/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WorkflowStateTypeStep } from '../../createCodeless/createCodelessSteps/WorkflowStateTypeStep';
import { WorkflowProjectCreateStep } from '../../createNewProject/createProjectSteps/WorkflowProjectCreateStep';
import { WorkflowCodeTypeStep } from '../../createWorkflow/WorkflowCodeTypeStep';
import { addInitVSCodeSteps } from '../../initProjectForVSCode/InitVSCodeLanguageStep';
import { FunctionAppFilesStep } from '../createCodeProjectSteps/createFunction/FunctionAppFilesStep';
import { FunctionAppNameStep } from '../createCodeProjectSteps/createFunction/FunctionAppNameStep';
import { FunctionAppNamespaceStep } from '../createCodeProjectSteps/createFunction/FunctionAppNamespaceStep';
import { CodeProjectWorkflowStateTypeStep } from '../createCodeProjectSteps/createLogicApp/CodeProjectWorkflowStateTypeStep';
import { WorkflowCodeProjectCreateStep } from './WorkflowCodeProjectCreateStep';
import type { AzureWizardExecuteStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep, nonNullProp } from '@microsoft/vscode-azext-utils';
import { type IProjectWizardContext, ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';

export class NewCodeProjectTypeStep extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;
  private readonly templateId?: string;
  private readonly functionSettings?: { [key: string]: string | undefined };
  private readonly skipWorkflowStateTypeStep: boolean;

  /**
   * The constructor initializes the NewCodeProjectTypeStep object with optional templateId and functionSettings parameters.
   * @param templateId - The ID of the template for the code project.
   * @param functionSettings - The settings for the functions in the code project.
   */
  public constructor(
    templateId: string | undefined,
    functionSettings: { [key: string]: string | undefined } | undefined,
    skipWorkflowStateTypeStep: boolean
  ) {
    super();
    this.templateId = templateId;
    this.functionSettings = functionSettings;
    this.skipWorkflowStateTypeStep = skipWorkflowStateTypeStep;
  }

  /**
   * Prompts the user for project information and sets up directories
   * @param context - Project wizard context containing user selections and settings
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set default project type and language
    context.workflowProjectType = WorkflowProjectType.Bundle;
    context.language = ProjectLanguage.JavaScript;
    const { workspacePath } = context;
    await this.setPaths(context, workspacePath);
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
   * Gets the sub-wizard based on the context provided
   * @param context - Project wizard context containing user selections and settings
   * @returns Wizard options including prompt and execute steps
   */
  public async getSubWizard(context: IProjectWizardContext): Promise<IWizardOptions<IProjectWizardContext>> {
    const promptSteps: AzureWizardPromptStep<IProjectWizardContext>[] = [];
    const executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[] = [];

    if (context.isWorkspaceWithFunctions) {
      await this.setupCustomLogicApp(context, executeSteps, promptSteps);
    } else {
      await this.setupRegularLogicApp(context, executeSteps, promptSteps);
    }
    return { promptSteps, executeSteps };
  }

  /**
   * Sets the paths required for the project
   * @param context - Project wizard context
   * @param workspacePath - Root path of the workspace
   * @param isWorkspaceWithFunctions - Flag to check if it's a workspace with functions
   */
  private async setPaths(context: IProjectWizardContext, workspacePath: string): Promise<void> {
    await fs.ensureDir(workspacePath);

    const logicAppFolderPath = path.join(workspacePath, context.logicAppName);
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
  private async setupCustomLogicApp(
    context: IProjectWizardContext,
    executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[],
    promptSteps: AzureWizardPromptStep<IProjectWizardContext>[]
  ): Promise<void> {
    promptSteps.push(new FunctionAppNameStep(), new FunctionAppNamespaceStep(), new FunctionAppFilesStep());

    if (context.shouldCreateLogicAppProject) {
      const projectPath = nonNullProp(context, 'logicAppFolderPath');
      executeSteps.push(new WorkflowCodeProjectCreateStep(projectPath));
      await addInitVSCodeSteps(context, executeSteps, true);

      promptSteps.push(
        await CodeProjectWorkflowStateTypeStep.create(context, {
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
  private async setupRegularLogicApp(
    context: IProjectWizardContext,
    executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[],
    promptSteps: AzureWizardPromptStep<IProjectWizardContext>[]
  ): Promise<void> {
    executeSteps.push(new WorkflowProjectCreateStep());
    await addInitVSCodeSteps(context, executeSteps, false);

    if (!this.skipWorkflowStateTypeStep) {
      promptSteps.push(
        await WorkflowCodeTypeStep.create(context, {
          isProjectWizard: true,
          templateId: this.templateId,
          triggerSettings: this.functionSettings,
        })
      );
      promptSteps.push(
        await WorkflowStateTypeStep.create(context, {
          isProjectWizard: true,
          templateId: this.templateId,
          triggerSettings: this.functionSettings,
        })
      );
    }
  }
}
