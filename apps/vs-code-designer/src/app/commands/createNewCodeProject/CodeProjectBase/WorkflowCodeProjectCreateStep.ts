/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ScriptProjectCreateStep } from '../createCodeProjectSteps/createLogicApp/ScriptProjectCreateStep';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';

/**
 * This class represents a step that creates a new Workflow code project.
 */
export class WorkflowCodeProjectCreateStep extends ScriptProjectCreateStep {
  private readonly projectPath: string;

  /**
   * Creates a new instance of the WorkflowCodeProjectCreateStep class.
   * @param projectPath The path of the project folder.
   */
  public constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  /**
   * Executes the step to create a new Workflow code project.
   * @param context The project wizard context.
   * @param progress The progress reporter.
   */
  public async executeCore(
    context: IProjectWizardContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    context.projectPath = this.projectPath;
    await super.executeCore(context, progress);
  }
}
