/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectLanguageSetting, funcVersionSetting, projectTemplateKeySetting } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { NoWorkspaceError } from '../../utils/errors';
import { tryGetLocalFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { detectProjectPackageType } from '../../utils/project';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { getParentWorkspaceFolder } from '../../utils/workspace';
import { InitDotnetProjectStep } from './initDotnetProjectStep';
import { type IActionContext, AzureWizard, UserCancelledError } from '@microsoft/vscode-azext-utils';
import {
  latestGAVersion,
  ProjectLanguage,
  ProjectPackageType,
  type FuncVersion,
  type IProjectWizardContext,
} from '@microsoft/vscode-extension-logic-apps';
import { window, workspace, type WorkspaceFolder } from 'vscode';
import { InitProjectStep } from './initProjectStep';

export async function initProjectForVSCode(context: IActionContext, fsPath?: string, language?: ProjectLanguage): Promise<void> {
  let workspaceFolder: WorkspaceFolder | undefined;
  let workspaceFolderPath: string;

  if (fsPath === undefined) {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
      throw new NoWorkspaceError();
    }
    const placeHolder: string = localize('selectFunctionAppFolderNew', 'Select the folder to initialize for use with VS Code');
    workspaceFolder = await window.showWorkspaceFolderPick({ placeHolder });
    if (!workspaceFolder) {
      throw new UserCancelledError();
    }
    workspaceFolderPath = workspaceFolder.uri.fsPath;
  } else {
    workspaceFolder = getParentWorkspaceFolder(fsPath);
    workspaceFolderPath = workspaceFolder ? workspaceFolder.uri.fsPath : fsPath;
  }

  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolderPath);
  if (!projectPath) {
    throw new Error(localize('projectNotFound', 'No Logic Apps project found in the selected folder.'));
  }

  const projectPackageType = await detectProjectPackageType(projectPath);
  language =
    language ||
    getGlobalSetting(projectLanguageSetting) ||
    (projectPackageType === ProjectPackageType.Nuget ? ProjectLanguage.CSharp : ProjectLanguage.JavaScript);
  const version: FuncVersion = getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);

  const wizardContext: IProjectWizardContext = Object.assign(context, {
    projectPath,
    workspacePath: workspaceFolderPath,
    language,
    version,
    workspaceFolder,
    projectTemplateKey,
    projectPackageType,
  });

  const executeSteps = projectPackageType === ProjectPackageType.Nuget ? [new InitDotnetProjectStep()] : [new InitProjectStep()];

  const wizard: AzureWizard<IProjectWizardContext> = new AzureWizard(wizardContext, { executeSteps });
  await wizard.execute();

  ext.outputChannel.appendLog(localize('finishedInitializing', 'Finished initializing for use with VS Code.'));
}
