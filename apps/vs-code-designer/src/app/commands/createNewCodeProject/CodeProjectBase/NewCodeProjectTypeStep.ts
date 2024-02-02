/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WorkflowStateTypeStep } from '../../createCodeless/createCodelessSteps/WorkflowStateTypeStep';
import { WorkflowProjectCreateStep } from '../../createNewProject/createProjectSteps/WorkflowProjectCreateStep';
import { addInitVSCodeSteps } from '../../initProjectForVSCode/InitVSCodeLanguageStep';
import { InvokeFunctionProjectSetup } from '../createCodeProjectSteps/createFunction/InvokeFunctionProjectSetup';
import { setMethodName } from '../createCodeProjectSteps/createFunction/setMethodName';
import { setNamespace } from '../createCodeProjectSteps/createFunction/setNamepSpace';
import { CodeProjectWorkflowStateTypeStep } from '../createCodeProjectSteps/createLogicApp/CodeProjectWorkflowStateTypeStep';
import { addInitVSCustomCodeSteps } from '../createCodeProjectSteps/createLogicApp/initLogicAppCodeProjectVScode/InitVSCode';
import { WorkflowCodeProjectCreateStep } from './WorkflowCodeProjectCreateStep';
import type { AzureWizardExecuteStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension';
import * as fs from 'fs-extra';
import * as path from 'path';

export class NewCodeProjectTypeStep extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;
  private readonly templateId?: string;
  private readonly functionSettings?: { [key: string]: string | undefined };

  /**
   * The constructor initializes the NewCodeProjectTypeStep object with optional templateId and functionSettings parameters.
   * @param templateId - The ID of the template for the code project.
   * @param functionSettings - The settings for the functions in the code project.
   */
  public constructor(templateId: string | undefined, functionSettings: { [key: string]: string | undefined } | undefined) {
    super();
    this.templateId = templateId;
    this.functionSettings = functionSettings;
  }

  /**
   * Prompts the user for project information and sets up directories
   * @param context - Project wizard context containing user selections and settings
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set default project type and language
    context.workflowProjectType = WorkflowProjectType.Bundle;
    context.language = ProjectLanguage.JavaScript;

    // Create directories based on user choices
    const { workspacePath, isCustomCodeLogicApp } = context;
    await this.createDirectories(context, workspacePath, isCustomCodeLogicApp);
  }

  /**
   * Checks if this step should prompt the user
   * @param context - Project wizard context containing user selections and settings
   * @returns True if user should be prompted, otherwise false
   */
  public shouldPrompt(_context: IProjectWizardContext): boolean {
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

    if (context.isCustomCodeLogicApp) {
      await this.setupCustomCodeLogicApp(context, executeSteps, promptSteps);
    } else {
      await this.setupRegularLogicApp(context, executeSteps, promptSteps);
    }

    return { promptSteps, executeSteps };
  }

  /**
   * Creates required directories for the project
   * @param context - Project wizard context
   * @param workspacePath - Root path of the workspace
   * @param isCustomCodeLogicApp - Flag to check if it's a custom code Logic App
   */
  private async createDirectories(context: IProjectWizardContext, workspacePath: string, isCustomCodeLogicApp: boolean): Promise<void> {
    await fs.ensureDir(workspacePath);
    context.customWorkspaceFolderPath = workspacePath;

    let logicAppFolderName = 'LogicApp';
    if (!isCustomCodeLogicApp && context.isCustomCodeLogicApp !== null && context.logicAppName) {
      logicAppFolderName = context.logicAppName;
    }

    const logicAppFolderPath = path.join(workspacePath, logicAppFolderName);
    await fs.ensureDir(logicAppFolderPath);
    context.logicAppFolderPath = logicAppFolderPath;

    context.projectPath = logicAppFolderPath;
    context.workspacePath = logicAppFolderPath;

    if (isCustomCodeLogicApp) {
      await this.setupCustomDirectories(context, workspacePath);
    }
    await this.createWorkspaceFile(context);
  }
  /**
   * Setup directories and configs for custom code logic app
   * @param context - Project wizard context
   * @param workspacePath - Root path of the workspace
   */
  private async setupCustomDirectories(context: IProjectWizardContext, workspacePath: string): Promise<void> {
    const functionFolderPath = path.join(workspacePath, 'Function');
    await fs.ensureDir(functionFolderPath);
    context.functionFolderPath = functionFolderPath;
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
    const projectPath = nonNullProp(context, 'logicAppFolderPath');
    executeSteps.push(new WorkflowCodeProjectCreateStep(projectPath));
    await addInitVSCustomCodeSteps(context, executeSteps);

    promptSteps.push(
      new setMethodName(),
      new setNamespace(),
      new InvokeFunctionProjectSetup(),
      await CodeProjectWorkflowStateTypeStep.create(context, {
        isProjectWizard: true,
        templateId: this.templateId,
        triggerSettings: this.functionSettings,
      })
    );
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
    await addInitVSCodeSteps(context, executeSteps);

    promptSteps.push(
      await WorkflowStateTypeStep.create(context, {
        isProjectWizard: true,
        templateId: this.templateId,
        triggerSettings: this.functionSettings,
      })
    );
  }

  /**
   * Creates a .code-workspace file to group project directories in VS Code
   * @param context - Project wizard context
   */
  private async createWorkspaceFile(context: IProjectWizardContext): Promise<void> {
    // Start with an empty folders array
    const workspaceFolders = [];

    // Add Functions folder first if it's a custom code code Logic App
    if (context.isCustomCodeLogicApp) {
      workspaceFolders.push({ name: 'Functions', path: './Function' });
    }

    // Use context.logicAppName for the folder name; default to 'LogicApp' if not available
    const logicAppName = context.logicAppName || 'LogicApp';
    workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });

    const workspaceData = {
      folders: workspaceFolders,
    };

    const workspaceFilePath = path.join(context.customWorkspaceFolderPath, `${context.workspaceName}.code-workspace`);
    context.customWorkspaceFolderPath = workspaceFilePath;

    await fs.writeJSON(workspaceFilePath, workspaceData, { spaces: 2 });
  }
}
