/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionBundleId, hostFileName, localSettingsFileName } from '../../constants';
import { localize } from '../../localize';
import { createNewProjectInternal } from '../commands/createNewProject/createNewProject';
import { getWorkspaceSetting, updateWorkspaceSetting } from './vsCodeConfig/settings';
import { isString } from '@microsoft/logic-apps-shared';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { ICreateFunctionOptions } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem, WorkspaceFolder } from 'vscode';

const projectSubpathKey = 'projectSubpath';

// Use 'host.json' and 'local.settings.json' as an indicator that this is a functions project
export async function isLogicAppProject(folderPath: string): Promise<boolean> {
  const hostFilePath = path.join(folderPath, hostFileName);
  const hasHostJson: boolean = await fse.pathExists(hostFilePath);
  const hasLocalSettingsJson: boolean = await fse.pathExists(path.join(folderPath, localSettingsFileName));

  if (hasHostJson) {
    const hostJsonData = fse.readFileSync(hostFilePath, 'utf-8');
    const hostJson = JSON.parse(hostJsonData);

    const hasWorkflowBundle = hostJson?.extensionBundle?.id === extensionBundleId;
    return hasHostJson && hasLocalSettingsJson && hasWorkflowBundle;
  }

  return false;
}

/**
 * Checks root folder and subFolders one level down
 * If a single logic app project is found, return that path.
 * If multiple projects are found, prompt to pick the project.
 */
export async function tryGetLogicAppProjectRoot(
  context: IActionContext,
  workspaceFolder: WorkspaceFolder | string,
  suppressPrompt = false
): Promise<string | undefined> {
  let subpath: string | undefined = getWorkspaceSetting(projectSubpathKey, workspaceFolder);
  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!subpath) {
    if (!(await fse.pathExists(folderPath))) {
      return undefined;
    }
    if (await isLogicAppProject(folderPath)) {
      return folderPath;
    }
    const subpaths: string[] = await fse.readdir(folderPath);
    const matchingSubpaths: string[] = [];
    await Promise.all(
      subpaths.map(async (s) => {
        if (await isLogicAppProject(path.join(folderPath, s))) {
          matchingSubpaths.push(s);
        }
      })
    );

    if (matchingSubpaths.length === 1) {
      subpath = matchingSubpaths[0];
    } else if (matchingSubpaths.length !== 0 && !suppressPrompt) {
      subpath = await promptForProjectSubpath(context, folderPath, matchingSubpaths);
    } else {
      return undefined;
    }
  }

  return path.join(folderPath, subpath);
}

async function promptForProjectSubpath(context: IActionContext, workspacePath: string, matchingSubpaths: string[]): Promise<string> {
  const message: string = localize(
    'detectedMultipleProject',
    'Detected multiple function projects in the same workspace folder. You must either set the default or use a multi-root workspace.'
  );
  const learnMoreLink = 'https://aka.ms/AA4nmfy';
  const setDefault: MessageItem = { title: localize('setDefault', 'Set default') };
  // No need to check result - cancel will throw a UserCancelledError
  await context.ui.showWarningMessage(message, { learnMoreLink }, setDefault);

  const picks: IAzureQuickPickItem<string>[] = matchingSubpaths.map((p) => {
    return { label: p, description: workspacePath, data: p };
  });
  const placeHolder: string = localize('selectProject', 'Select the default project subpath');
  const subpath: string = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  await updateWorkspaceSetting(projectSubpathKey, subpath, workspacePath);

  return subpath;
}

/**
 * Checks if the path is already a logic app project. If not, it will prompt to create a new project.
 * @param {IActionContext} fsPath - Command context.
 * @param {string} fsPath - Workflow file path.
 * @param {ICreateFunctionOptions} options - Options to create a new project.
 * @returns {Promise<string | undefined>} Returns project path if exists, otherwise returns undefined.
 */
export async function verifyAndPromptToCreateProject(
  context: IActionContext,
  fsPath: string,
  options?: ICreateFunctionOptions
): Promise<string | undefined> {
  options = options || {};

  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, fsPath);
  if (!projectPath) {
    if (!options.suppressCreateProjectPrompt) {
      const message: string = localize('notLogicApp', 'The selected folder is not a logic app project. Create new project?');
      // No need to check result - cancel will throw a UserCancelledError
      await context.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes);
    }

    options.folderPath = fsPath;
    await createNewProjectInternal(context, options);
    return undefined;
  }
  return projectPath;
}
