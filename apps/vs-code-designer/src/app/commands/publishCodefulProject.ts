/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import * as vscode from 'vscode';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { inspectCodefulCsprojBuildHooks, invalidateCodefulSdkCacheIfNeeded, hasCodefulWorkflowSetting } from '../utils/codeful';
import { isPathEqual, isSubpath } from '../utils/fs';

/**
 * Optional behaviors for {@link publishCodefulProject}.
 */
export interface PublishCodefulProjectOptions {
  /**
   * When true, inspect the codeful project's `.csproj` and skip the explicit
   * `publish` task if the modern template hooks `CopyToCodefulFolder` /
   * `ReplaceLanguageNetCore` to `AfterTargets="Build;Publish"`. In that case
   * the Debug `Build` step that `func: host start` chains via `dependsOn` is
   * sufficient to populate `lib/codeful/`
   */
  skipIfBuildPopulatesCodeful?: boolean;
}

/**
 * Builds a custom code functions project.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The codeful logic app project path.
 * @param {PublishCodefulProjectOptions} [options] - Optional behaviors.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function publishCodefulProject(
  context: IActionContext,
  projectPath: string,
  options?: PublishCodefulProjectOptions
): Promise<void> {
  if (isNullOrUndefined(projectPath)) {
    const errorMessage = 'No project path found to publish codeful project.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage;
    ext.outputChannel.appendLog(localize('noProjectPathPublishCodeful', errorMessage));
    return;
  }

  const isCodeful = await hasCodefulWorkflowSetting(projectPath);
  if (!isCodeful) {
    const message = `Skipping publish: Path "${projectPath}" is not a codeful project.`;
    ext.outputChannel.appendLog(message);
    return;
  }

  await invalidateCodefulSdkCacheIfNeeded(projectPath);

  if (options?.skipIfBuildPopulatesCodeful) {
    const buildHooks = await inspectCodefulCsprojBuildHooks(projectPath);
    if (buildHooks) {
      context.telemetry.properties.csprojCopyAfterTargets = buildHooks.copyAfterTargets ?? '';
      context.telemetry.properties.csprojReplaceLangAfterTargets = buildHooks.replaceLangAfterTargets ?? '';
    }
    if (buildHooks?.runsOnBuild) {
      context.telemetry.properties.publishSkipped = 'true';
      context.telemetry.properties.publishSkippedReason = 'csprojCopyToCodefulRunsOnBuild';
      ext.outputChannel.appendLog(
        localize(
          'skipPublishCodefulBuildHooks',
          'Skipping publishCodefulProject for "{0}": codeful project .csproj runs CopyToCodefulFolder/ReplaceLanguageNetCore on Build (AfterTargets="Build;Publish"). The local debug build will populate lib/codeful.',
          projectPath
        )
      );
      return;
    }
    context.telemetry.properties.publishSkipped = 'false';
  }

  try {
    context.telemetry.properties.lastStep = 'publishCodefulProject';
    await runPublishCommand(projectPath);
    context.telemetry.properties.result = 'Succeeded';
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = (error as Error).message ?? String(error);
    throw error;
  }
}

/**
 * Executes the publish task for a Logic Apps codeful project at the specified path.
 * This function locates and runs the 'publish' task associated with the given project path,
 * then monitors the task execution to determine success or failure. It logs the result
 * to the output channel and displays messages to the user accordingly.
 * @param projectPath - The file system path to the Logic Apps project to be published.
 * @returns A Promise that resolves when the publish task completes successfully,
 *          or rejects if the task is not found or exits with a non-zero code.
 * @throws {Error} If no publish task is found for the specified project path.
 * @throws {Error} If the publish task exits with a non-zero exit code.
 */
async function runPublishCommand(projectPath: string): Promise<void> {
  const tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
  const publishTask = tasks.find((task) => {
    const currTaskPath = (task.scope as vscode.WorkspaceFolder)?.uri.fsPath;
    // TODO(aeldridge): For nested projects, this will select any matching build task in the workspace folder. Need to scope tasks to individual projects.
    return task.name === 'publish' && !!currTaskPath && (isPathEqual(currTaskPath, projectPath) || isSubpath(currTaskPath, projectPath));
  });

  if (!publishTask) {
    throw new Error(`Publish task not found for project at "${projectPath}".`);
  }

  return new Promise<void>((resolve, reject) => {
    const disposable: vscode.Disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      const taskPath = (e.execution.task.scope as vscode.WorkspaceFolder)?.uri.fsPath;
      const isMatchingTask =
        !!taskPath &&
        (isPathEqual(taskPath, projectPath) || isSubpath(taskPath, projectPath)) &&
        e.execution.task.name === publishTask.name;

      if (isMatchingTask) {
        disposable.dispose();

        if (e.exitCode !== 0) {
          const errorMessage = 'Error publishing codeful project at "{0}": {1}';
          const internalErrorMessage = errorMessage.replace('{0}', projectPath).replace('{1}', e.exitCode?.toString() ?? 'unknown');
          const userErrorMessage = localize('azureLogicAppsStandard.publishCodefulProjectError', errorMessage, projectPath, e.exitCode);
          ext.outputChannel.appendLog(userErrorMessage);
          vscode.window.showWarningMessage(userErrorMessage);
          reject(new Error(internalErrorMessage));
        } else {
          ext.outputChannel.appendLog(`Codeful project published successfully at ${projectPath}.`);
          resolve();
        }
      }
    });

    vscode.tasks.executeTask(publishTask);
  });
}
