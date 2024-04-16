/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { gitInit, isGitInstalled, isInsideRepo } from '../../../utils/git';
import { AzureWizardExecuteStep, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import type { Progress } from 'vscode';

/**
 * This abstract class represents a step in the Azure Logic Apps Standard wizard that creates a new project.
 */
export abstract class ProjectCodeCreateStepBase extends AzureWizardExecuteStep<IProjectWizardContext> {
  // Set the priority of the step
  public priority = 10;

  /**
   * Executes the core logic for the step.
   * @param context The project wizard context.
   * @param progress The progress object to report progress updates to.
   */
  public abstract executeCore(
    context: IProjectWizardContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void>;

  /**
   * Creates the project directory and executes the core logic for the step.
   * @param context The project wizard context.
   * @param progress The progress object to report progress updates to.
   */
  public async execute(
    context: IProjectWizardContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    // Set telemetry properties
    context.telemetry.properties.projectLanguage = context.language;
    context.telemetry.properties.projectRuntime = context.version;
    context.telemetry.properties.openBehavior = context.openBehavior;

    // Create the project directory
    progress.report({ message: localize('creating', 'Creating new project...') });
    await fse.ensureDir(context.projectPath);

    // Execute the core logic for the step
    await this.executeCore(context, progress);

    // Initialize a git repository if one is not already present
    if ((await isGitInstalled(context.customWorkspaceFolderPath)) && !(await isInsideRepo(context.customWorkspaceFolderPath))) {
      await gitInit(context.customWorkspaceFolderPath);
    }

    // Log telemetry for the step
    await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.createNewCodeProjectStarted', (startedContext: IActionContext) => {
      Object.assign(startedContext, context);
    });
  }

  /**
   * Determines whether the step should be executed.
   * @param context The project wizard context.
   * @returns True if the step should be executed, false otherwise.
   */
  public shouldExecute(_context: IProjectWizardContext): boolean {
    return true;
  }
}
