/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deploySubpathSetting, showTargetFrameworkWarningSetting } from '../../../constants';
import { localize } from '../../../localize';
import { getProjFiles, getTargetFramework } from '../dotnet/dotnet';
import { getWorkspaceSetting, updateWorkspaceSetting } from './settings';
import { getTasks, updateTasks } from './tasks';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { ProjectLanguage, ITask } from '@microsoft/vscode-extension-logic-apps';
import type { WorkspaceFolder, MessageItem } from 'vscode';

interface IVerifyFrameworkResult {
  mismatchTargetFramework: string;
  update(): Promise<void>;
}

// https://docs.microsoft.com/dotnet/standard/frameworks
const targetFrameworkRegExp = /net(standard|coreapp)?[0-9.]+/i;

export async function verifyTargetFramework(
  projectLanguage: ProjectLanguage,
  folder: WorkspaceFolder,
  projectPath: string,
  context: IActionContext
): Promise<void> {
  if (getWorkspaceSetting<boolean>(showTargetFrameworkWarningSetting)) {
    const projFiles = await getProjFiles(context, projectLanguage, projectPath);
    if (projFiles.length === 1) {
      let targetFramework: string;
      try {
        targetFramework = await getTargetFramework(projFiles[0]);
      } catch {
        return;
      }

      const tasksResult: IVerifyFrameworkResult | undefined = verifyTasksFramework(folder, targetFramework);
      const settingsResult: IVerifyFrameworkResult | undefined = verifySettingsFramework(folder.uri.fsPath, targetFramework);

      const mismatchTargetFramework: string | undefined =
        (tasksResult && tasksResult.mismatchTargetFramework) || (settingsResult && settingsResult.mismatchTargetFramework);
      if (mismatchTargetFramework) {
        context.telemetry.properties.verifyConfigPrompt = 'updateTargetFramework';

        const message: string = localize(
          'mismatchTargetFramework',
          'The targetFramework "{0}" in your project file does not match the targetFramework "{1}" in your VS Code config.',
          targetFramework,
          mismatchTargetFramework
        );
        const update: MessageItem = { title: localize('updateTargetFramework', 'Update VS Code config') };

        const result: MessageItem = await context.ui.showWarningMessage(message, update, DialogResponses.dontWarnAgain);
        if (result === DialogResponses.dontWarnAgain) {
          context.telemetry.properties.verifyConfigResult = 'dontWarnAgain';
          await updateWorkspaceSetting(showTargetFrameworkWarningSetting, false, folder.uri.fsPath);
        } else if (result === update) {
          context.telemetry.properties.verifyConfigResult = 'update';
          if (tasksResult) {
            await tasksResult.update();
          }

          if (settingsResult) {
            await settingsResult.update();
          }
        }
      }
    }
  } else {
    context.telemetry.properties.verifyConfigResult = 'suppressed';
  }
}

function verifyTasksFramework(folder: WorkspaceFolder, projTargetFramework: string): IVerifyFrameworkResult | undefined {
  let mismatchTargetFramework: string | undefined;

  const tasks: ITask[] = getTasks(folder);
  for (const task of tasks) {
    if (task.options && task.options.cwd) {
      const matches: RegExpMatchArray | null = task.options.cwd.match(targetFrameworkRegExp);
      const targetFramework: string | null = matches && matches[0];
      if (targetFramework && targetFramework.toLowerCase() !== projTargetFramework.toLowerCase()) {
        mismatchTargetFramework = targetFramework;
        task.options.cwd = task.options.cwd.replace(targetFramework, projTargetFramework);
      }
    }
  }

  if (mismatchTargetFramework) {
    return {
      mismatchTargetFramework,
      update: async (): Promise<void> => {
        updateTasks(folder, tasks);
      },
    };
  }

  return undefined;
}

function verifySettingsFramework(workspacePath: string, projTargetFramework: string): IVerifyFrameworkResult | undefined {
  let deploySubPath: string | undefined = getWorkspaceSetting(deploySubpathSetting, workspacePath);
  if (deploySubPath) {
    const matches: RegExpMatchArray | null = deploySubPath.match(targetFrameworkRegExp);
    const targetFramework: string | null = matches && matches[0];
    if (targetFramework && targetFramework.toLowerCase() !== projTargetFramework.toLowerCase()) {
      deploySubPath = deploySubPath.replace(targetFramework, projTargetFramework);
      return {
        mismatchTargetFramework: targetFramework,
        update: async (): Promise<void> => {
          await updateWorkspaceSetting(deploySubpathSetting, deploySubPath, workspacePath);
        },
      };
    }
  }

  return undefined;
}
