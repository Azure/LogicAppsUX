import { addInitVSCodeSteps } from '../../initProjectForVSCode/InitVSCodeLanguageStep';
import { CodeProjectWorkflowStateTypeStep } from './CodeProjectWorkflowStateTypeStep';
import { WorkflowCodeProjectCreateStep } from './WorkflowCodeProjectCreateStep';
import type { AzureWizardExecuteStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that allows the user to select a project type for their new project.
 */
export class NewCodeProjectTypeStep extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;
  private readonly templateId?: string;
  private readonly functionSettings?: { [key: string]: string | undefined };

  /**
   * Creates a new instance of the NewCodeProjectTypeStep class.
   * @param templateId The ID of the project template to use.
   * @param functionSettings The settings for the Azure Functions project.
   */
  public constructor(templateId: string | undefined, functionSettings: { [key: string]: string | undefined } | undefined) {
    super();
    this.templateId = templateId;
    this.functionSettings = functionSettings;
  }

  /**
   * Prompts the user to select a project type and creates the Function and LogicApp folders in the project directory.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set the default project type and language
    context.workflowProjectType = WorkflowProjectType.Bundle;
    context.language = ProjectLanguage.JavaScript;

    // Create Function and LogicApp folders
    const projectPath = path.join(context.projectPath, context.projectName);
    const functionFolderPath = path.join(projectPath, 'Function');
    const logicAppFolderPath = path.join(projectPath, 'LogicApp');
    await fs.ensureDir(functionFolderPath);
    await fs.ensureDir(logicAppFolderPath);
  }

  /**
   * Determines whether the user should be prompted to select a project type.
   * @param context The project wizard context.
   * @returns True if the user has not yet selected a project type, false otherwise.
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.workflowProjectType === undefined;
  }

  /**
   * Creates a sub-wizard that will be used to create the project.
   * @param context The project wizard context.
   * @returns An object containing the prompt and execute steps for the sub-wizard.
   */
  public async getSubWizard(context: IProjectWizardContext): Promise<IWizardOptions<IProjectWizardContext>> {
    const executeSteps: AzureWizardExecuteStep<IProjectWizardContext>[] = [];

    const promptSteps: AzureWizardPromptStep<IProjectWizardContext>[] = [];
    const projectType: WorkflowProjectType = nonNullProp(context, 'workflowProjectType');

    // If the project type is Bundle, create the project files and folders under the LogicApp folder
    if (projectType === WorkflowProjectType.Bundle) {
      const workflowProjectPath = path.join(context.projectPath, context.projectName, 'LogicApp');
      executeSteps.push(new WorkflowCodeProjectCreateStep(workflowProjectPath));
    }

    // Add any necessary steps to initialize the project for VS Code
    await addInitVSCodeSteps(context, executeSteps);

    // Create the sub-wizard options object
    const wizardOptions: IWizardOptions<IProjectWizardContext> = { promptSteps, executeSteps };

    // Add any necessary prompt steps to the sub-wizard
    promptSteps.push(
      await CodeProjectWorkflowStateTypeStep.create(context, {
        isProjectWizard: true,
        templateId: this.templateId,
        triggerSettings: this.functionSettings,
      })
    );

    return wizardOptions;
  }
}
