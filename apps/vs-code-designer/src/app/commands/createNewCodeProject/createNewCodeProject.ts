/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  extensionCommand,
  funcVersionSetting,
  projectLanguageSetting,
  projectOpenBehaviorSetting,
  projectTemplateKeySetting,
} from '../../../constants';
import { localize } from '../../../localize';
import { addLocalFuncTelemetry, tryGetLocalFuncVersion, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { showPreviewWarning } from '../../utils/taskUtils';
import { getGlobalSetting, getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { OpenBehaviorStep } from '../createNewProject/OpenBehaviorStep';
import { FolderListStep } from '../createNewProject/createProjectSteps/FolderListStep';
import { NewCodeProjectTypeStep } from './CodeProjectBase/NewCodeProjectTypeStep';
import { OpenFolderStepCodeProject } from './CodeProjectBase/OpenFolderStepCodeProject';
import { SetLogicAppName } from './CodeProjectBase/SetLogicAppNameStep';
import { setWorkspaceName } from './CodeProjectBase/SetWorkspaceName';
import { SetLogicAppType } from './CodeProjectBase/setLogicAppType';
import { isString } from '@microsoft/logic-apps-shared';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion, OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import type {
  ICreateFunctionOptions,
  IFunctionWizardContext,
  ProjectLanguage,
  ProjectVersion,
} from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { window } from 'vscode';
import { TargetFrameworkStep } from './createCodeProjectSteps/createFunction/TargetFrameworkStep';

export async function createNewCodeProjectFromCommand(
  context: IActionContext,
  folderPath?: string | undefined,
  language?: ProjectLanguage,
  version?: ProjectVersion,
  openFolder = true,
  templateId?: string,
  functionName?: string,
  functionSettings?: { [key: string]: string | undefined }
): Promise<void> {
  await createNewCodeProjectInternal(context, {
    folderPath: isString(folderPath) ? folderPath : undefined,
    templateId,
    functionName,
    functionSettings,
    suppressOpenFolder: !openFolder,
    language,
    version,
  });
}

export async function createNewCodeProjectInternal(context: IActionContext, options: ICreateFunctionOptions): Promise<void> {
  addLocalFuncTelemetry(context);
  showPreviewWarning(extensionCommand.createNewCodeProject); //Show warning if command is set to preview

  const language: ProjectLanguage | string = (options.language as ProjectLanguage) || getGlobalSetting(projectLanguageSetting);
  const version: string = options.version || getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);
  const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options, {
    language,
    version: tryParseFuncVersion(version),
    projectTemplateKey,
  });

  if (options.folderPath) {
    new FolderListStep.setProjectPath(wizardContext, options.folderPath);
  }

  if (options.suppressOpenFolder) {
    wizardContext.openBehavior = OpenBehavior.dontOpen;
  } else if (!wizardContext.openBehavior) {
    wizardContext.openBehavior = getWorkspaceSetting(projectOpenBehaviorSetting);
    context.telemetry.properties.openBehaviorFromSetting = String(!!wizardContext.openBehavior);
  }

  const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
    title: localize('createNewCodeProject', 'Create new logic app workspace'),
    promptSteps: [
      new FolderListStep(),
      new setWorkspaceName(),
      new SetLogicAppType(),
      new TargetFrameworkStep(),
      new SetLogicAppName(),
      new NewCodeProjectTypeStep(options.templateId, options.functionSettings),
      new OpenBehaviorStep(),
    ],
    executeSteps: [new OpenFolderStepCodeProject()],
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
