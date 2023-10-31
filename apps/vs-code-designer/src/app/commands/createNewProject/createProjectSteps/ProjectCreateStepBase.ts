/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { gitInit, isGitInstalled, isInsideRepo } from '../../../utils/git';
import { AzureWizardExecuteStep, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { Progress } from 'vscode';

export abstract class ProjectCreateStepBase extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 10;

  public abstract executeCore(
    context: IProjectWizardContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void>;

  public async execute(
    context: IProjectWizardContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    context.telemetry.properties.projectLanguage = context.language;
    context.telemetry.properties.projectRuntime = context.version;
    context.telemetry.properties.openBehavior = context.openBehavior;

    progress.report({ message: localize('creating', 'Creating new project...') });
    await fse.ensureDir(context.projectPath);

    await this.executeCore(context, progress);

    if ((await isGitInstalled(context.workspacePath)) && !(await isInsideRepo(context.workspacePath))) {
      //Init git repo inside mutli root workspace custom logic app project
      if (!context.isCustomCodeLogicApp && context.isCustomCodeLogicApp !== null) {
        const parentDirectory = path.dirname(context.workspacePath);
        await gitInit(parentDirectory);
      } else {
        await gitInit(context.workspacePath);
      }
    }

    // OpenFolderStep sometimes restarts the extension host. Adding a second event here to see if we're losing any telemetry
    await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.createNewProjectStarted', (startedContext: IActionContext) => {
      Object.assign(startedContext, context);
    });
  }

  public shouldExecute(_context: IProjectWizardContext): boolean {
    return true;
  }
}
