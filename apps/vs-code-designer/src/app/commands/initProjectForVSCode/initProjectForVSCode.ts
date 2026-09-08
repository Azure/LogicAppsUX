/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectLanguageSetting, funcVersionSetting, projectTemplateKeySetting } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { tryGetLocalFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { detectProjectPackageType } from '../../utils/project';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { getParentWorkspaceFolder, selectLogicAppRoot } from '../../utils/workspace';
import { InitDotnetProjectStep } from './initDotnetProjectStep';
import { type IActionContext, AzureWizard } from '@microsoft/vscode-azext-utils';
import {
  latestGAVersion,
  ProjectLanguage,
  ProjectPackageType,
  type FuncVersion,
  type IProjectWizardContext,
} from '@microsoft/vscode-extension-logic-apps';
import { InitProjectStep } from './initProjectStep';

export async function initProjectForVSCode(context: IActionContext, projectPath?: string, language?: ProjectLanguage): Promise<void> {
  const resolvedProjectPath = projectPath ?? await selectLogicAppRoot(context);
  if (!resolvedProjectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root.'));
  }

  const workspaceFolder = await getParentWorkspaceFolder(resolvedProjectPath);
  if (!workspaceFolder) {
    throw new Error(localize('WorkspaceFolderError', 'Unable to determine workspace folder for the logic app project.'));
  }

  const projectPackageType = await detectProjectPackageType(resolvedProjectPath);
  language =
    language ||
    getGlobalSetting(projectLanguageSetting) ||
    (projectPackageType === ProjectPackageType.Nuget ? ProjectLanguage.CSharp : ProjectLanguage.JavaScript);
  const version: FuncVersion = getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);

  const wizardContext: IProjectWizardContext = Object.assign(context, {
    projectPath: resolvedProjectPath,
    workspacePath: workspaceFolder.uri.fsPath,
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
