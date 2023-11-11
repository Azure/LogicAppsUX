/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcVersionSetting, projectLanguageSetting, projectOpenBehaviorSetting, projectTemplateKeySetting } from '../../../constants';
import { localize } from '../../../localize';
import { addLocalFuncTelemetry, tryGetLocalFuncVersion, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getGlobalSetting, getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { OpenBehaviorStep } from './OpenBehaviorStep';
import { OpenFolderStep } from './OpenFolderStep';
import { FolderListStep } from './createProjectSteps/FolderListStep';
import { NewProjectTypeStep } from './createProjectSteps/NewProjectTypeStep';
import { isString } from '@microsoft/logic-apps-designer';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion, OpenBehavior } from '@microsoft/vscode-extension';
import type { ICreateFunctionOptions, IFunctionWizardContext, ProjectLanguage, ProjectVersion } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import { window } from 'vscode';

export async function createNewProjectFromCommand(
  context: IActionContext,
  folderPath?: string | undefined,
  language?: ProjectLanguage,
  version?: ProjectVersion,
  openFolder = true,
  templateId?: string,
  functionName?: string,
  functionSettings?: { [key: string]: string | undefined }
): Promise<void> {
  await createNewProjectInternal(context, {
    folderPath: isString(folderPath) ? folderPath : undefined,
    templateId,
    functionName,
    functionSettings,
    suppressOpenFolder: !openFolder,
    language,
    version,
  });
}

export async function createNewProjectInternal(context: IActionContext, options: ICreateFunctionOptions): Promise<void> {
  addLocalFuncTelemetry(context);

  const language: ProjectLanguage | undefined = (options.language as ProjectLanguage) || getGlobalSetting(projectLanguageSetting);
  const version: string = options.version || getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);
  const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options, {
    language,
    version: tryParseFuncVersion(version),
    projectTemplateKey,
  });

  if (options.folderPath) {
    FolderListStep.setProjectPath(wizardContext, options.folderPath);
  }

  if (options.suppressOpenFolder) {
    wizardContext.openBehavior = OpenBehavior.dontOpen;
  } else if (!wizardContext.openBehavior) {
    wizardContext.openBehavior = getWorkspaceSetting(projectOpenBehaviorSetting);
    context.telemetry.properties.openBehaviorFromSetting = String(!!wizardContext.openBehavior);
  }

  const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
    title: localize('createNewProject', 'Create new project'),
    promptSteps: [new FolderListStep(), new NewProjectTypeStep(options.templateId, options.functionSettings), new OpenBehaviorStep()],
    executeSteps: [new OpenFolderStep()],
  });

  await wizard.prompt();
  await wizard.execute();

  await createArtifactsFolder(context as IFunctionWizardContext);
  await createLibFolder(context as IFunctionWizardContext);

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}

async function createArtifactsFolder(context: IFunctionWizardContext): Promise<void> {
  fse.mkdirSync(path.join(context.projectPath, 'Artifacts', 'Maps'), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, 'Artifacts', 'Schemas'), { recursive: true });
}

async function createLibFolder(context: IFunctionWizardContext): Promise<void> {
  fse.mkdirSync(path.join(context.projectPath, 'lib', 'builtinOperationSdks', 'JAR'), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, 'lib', 'builtinOperationSdks', 'net472'), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, 'lib', 'custom', 'net472'), { recursive: true });
}
