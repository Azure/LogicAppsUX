/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectLanguageSetting, funcVersionSetting, projectTemplateKeySetting } from '../../../constants';
import { localize } from '../../../localize';
import { NoWorkspaceError } from '../../utils/errors';
import { tryGetLocalFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { verifyAndPromptToCreateProject } from '../../utils/verifyIsProject';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { getContainingWorkspace } from '../../utils/workspace';
import { InitVSCodeLanguageStep } from './InitVSCodeLanguageStep';
import { type IActionContext, AzureWizard, UserCancelledError } from '@microsoft/vscode-azext-utils';
import {
  latestGAVersion,
  type ProjectLanguage,
  type FuncVersion,
  type IProjectWizardContext,
} from '@microsoft/vscode-extension-logic-apps';
import { window, workspace, type WorkspaceFolder } from 'vscode';

export async function initProjectForVSCode(context: IActionContext, fsPath?: string, language?: ProjectLanguage): Promise<void> {
  let workspaceFolder: WorkspaceFolder | undefined;
  let workspacePath: string;

  if (fsPath === undefined) {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
      throw new NoWorkspaceError();
    }
    const placeHolder: string = localize('selectFunctionAppFolderNew', 'Select the folder to initialize for use with VS Code');
    workspaceFolder = await window.showWorkspaceFolderPick({ placeHolder });
    if (!workspaceFolder) {
      throw new UserCancelledError();
    }
    workspacePath = workspaceFolder.uri.fsPath;
  } else {
    workspaceFolder = getContainingWorkspace(fsPath);
    workspacePath = workspaceFolder ? workspaceFolder.uri.fsPath : fsPath;
  }

  const projectPath: string | undefined = await verifyAndPromptToCreateProject(context, workspacePath);
  if (!projectPath) {
    return;
  }

  language = language || getGlobalSetting(projectLanguageSetting);
  const version: FuncVersion = getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);

  const wizardContext: IProjectWizardContext = Object.assign(context, {
    projectPath,
    workspacePath,
    language,
    version,
    workspaceFolder,
    projectTemplateKey,
  });
  const wizard: AzureWizard<IProjectWizardContext> = new AzureWizard(wizardContext, { promptSteps: [new InitVSCodeLanguageStep()] });
  await wizard.prompt();
  await wizard.execute();

  window.showInformationMessage(localize('finishedInitializing', 'Finished initializing for use with VS Code.'));
}
