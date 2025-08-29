/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ProjectCreateStep } from '../../createProject/createProjectSteps/projectCreateStep';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';

/**
 * This class represents a step that creates a new Workflow code project.
 */
export class CustomCodeProjectCreateStep extends ProjectCreateStep {
  /**
   * Executes the step to create a new Workflow code project.
   * @param context The project wizard context.
   * @param progress The progress reporter.
   */
  public async executeCore(
    context: IProjectWizardContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    this.funcignore.push('global.json');
    this.localSettingsJson.Values['AzureWebJobsFeatureFlags'] = 'EnableMultiLanguageWorker';
    await super.executeCore(context, progress);
  }
}
