/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getContainingWorkspace } from '../../../utils/workspace';
import { AzureWizardExecuteStep, callWithTelemetryAndErrorHandling, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, IWorkflowTemplate } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import { Uri, window, workspace } from 'vscode';
import type { Progress } from 'vscode';

interface ICachedWorkflow {
  projectPath: string;
  newFilePath: string;
  isHttpTrigger: boolean;
}

const cacheKey = 'azLAPostWorkflowCreate';

export function runPostWorkflowCreateStepsFromCache(): void {
  const cachedFunc: ICachedWorkflow | undefined = ext.context.globalState.get(cacheKey);
  if (cachedFunc) {
    try {
      runPostWorkflowCreateSteps(cachedFunc);
    } finally {
      ext.context.globalState.update(cacheKey, undefined);
    }
  }
}

export abstract class WorkflowCreateStepBase<T extends IFunctionWizardContext> extends AzureWizardExecuteStep<T> {
  public priority = 220;

  public abstract executeCore(context: T): Promise<string>;

  public async execute(context: T, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
    const template: IWorkflowTemplate = nonNullProp(context, 'functionTemplate');

    context.telemetry.properties.projectLanguage = context.language;
    context.telemetry.properties.projectRuntime = context.version;
    context.telemetry.properties.templateId = template.id;

    progress.report({ message: localize('creatingFunction', 'Creating new {0}...', template.name) });

    const newFilePath = await this.executeCore(context);

    const cachedFunc: ICachedWorkflow = { projectPath: context.projectPath, newFilePath, isHttpTrigger: template.isHttpTrigger };

    if (context.openBehavior) {
      // OpenFolderStep sometimes restarts the extension host, so we will cache this to run on the next extension activation
      ext.context.globalState.update(cacheKey, cachedFunc);
      // Delete cached information if the extension host was not restarted after 5 seconds
      setTimeout(() => {
        ext.context.globalState.update(cacheKey, undefined);
      }, 5 * 1000);
    }

    runPostWorkflowCreateSteps(cachedFunc);
  }

  public shouldExecute(context: T): boolean {
    return !!context.functionTemplate;
  }
}

function runPostWorkflowCreateSteps(workflow: ICachedWorkflow): void {
  callWithTelemetryAndErrorHandling('postWorkflowCreate', async (context: IActionContext) => {
    context.telemetry.suppressIfSuccessful = true;

    if (getContainingWorkspace(workflow.projectPath)) {
      if (await fse.pathExists(workflow.newFilePath)) {
        window.showTextDocument(await workspace.openTextDocument(Uri.file(workflow.newFilePath)));
      }
    }
  });
}
