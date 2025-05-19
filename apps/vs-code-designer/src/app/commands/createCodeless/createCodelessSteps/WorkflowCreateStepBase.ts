/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getContainingWorkspace } from '../../../utils/workspace';
import {
  AzureWizardExecuteStep,
  callWithTelemetryAndErrorHandling,
  DialogResponses,
  nonNullProp,
  parseError,
} from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, IHostJsonV2, IWorkflowTemplate } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import { Uri, window, workspace } from 'vscode';
import type { MessageItem, Progress } from 'vscode';
import { parseJson } from '../../../utils/parseJson';
import { localSettingsFileName } from '../../../../constants';
import { workflowCodeTypeForTelemetry } from '../../../utils/codeful/utils';

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
    callWithTelemetryAndErrorHandling('workflowCreate', async (telemetryContext: IActionContext) => {
      // telemetry
      telemetryContext.telemetry.properties.workflowCodeType = workflowCodeTypeForTelemetry(context.isCodeless);
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
    });
  }

  protected async getHostJson(context: IFunctionWizardContext, hostJsonPath: string, allowOverwrite = false): Promise<IHostJsonV2> {
    return this.getJsonFromFile(context, hostJsonPath, { version: '2.0' }, allowOverwrite);
  }

  public async getJsonFromFile<T extends object>(
    context: IFunctionWizardContext,
    filePath: string,
    defaultValue: T,
    allowOverwrite = false
  ): Promise<T> {
    const emptyStringTest = /[^\s]/;
    if (await fse.pathExists(filePath)) {
      const data: string = (await fse.readFile(filePath)).toString();
      if (emptyStringTest.test(data)) {
        try {
          return parseJson(data);
        } catch (error) {
          if (allowOverwrite) {
            const message: string = localize(
              'failedToParseWithOverwrite',
              'Failed to parse "{0}": {1}. Overwrite?',
              localSettingsFileName,
              parseError(error).message
            );
            const overwriteButton: MessageItem = { title: localize('overwrite', 'Overwrite') };
            // Overwrite is the only button and cancel automatically throws, so no need to check result
            await context.ui.showWarningMessage(message, { modal: true }, overwriteButton, DialogResponses.cancel);
          } else {
            const message: string = localize(
              'failedToParse',
              'Failed to parse "{0}": {1}.',
              localSettingsFileName,
              parseError(error).message
            );
            throw new Error(message);
          }
        }
      }
    }

    return defaultValue;
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
