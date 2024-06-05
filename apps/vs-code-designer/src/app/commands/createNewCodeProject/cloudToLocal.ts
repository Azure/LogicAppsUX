// Used createNewCodeProject.ts as a template to create this file
// This file is used to take a zipped Logic App from the desktop and unzip to the local workspace
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
import { ZipFileStep } from '../createNewProject/createProjectSteps/ZipFileStep';
import { OpenFolderStepCodeProject } from './CodeProjectBase/OpenFolderStepCodeProject';
import { SetLogicAppName } from './CodeProjectBase/SetLogicAppNameStep';
import { setWorkspaceName } from './CodeProjectBase/SetWorkspaceName';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion, OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { ICreateFunctionOptions, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import { window } from 'vscode';

const openFolder = true;

export async function cloudToLocalInternal(
  context: IActionContext,
  options: ICreateFunctionOptions = {
    language: 'JavaScript',
    version: '~4',
    templateId: 'templateId',
    functionName: 'functionName',
    functionSettings: { setting1: 'value1', setting2: 'value2' },
    suppressOpenFolder: !openFolder,
  }
): Promise<void> {
  addLocalFuncTelemetry(context);
  showPreviewWarning(extensionCommand.cloudToLocal); //Show warning if command is set to preview

  const language: ProjectLanguage | string = (options.language as ProjectLanguage) || getGlobalSetting(projectLanguageSetting);
  const version: string = options.version || getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);
  const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options, {
    language,
    version: tryParseFuncVersion(version),
    projectTemplateKey,
  });

  //If suppressOpenFolder is true, set the open behavior to don't open. Otherwise, get the open behavior from the workspace settings.
  if (options.suppressOpenFolder) {
    wizardContext.openBehavior = OpenBehavior.dontOpen;
  } else if (!wizardContext.openBehavior) {
    wizardContext.openBehavior = getWorkspaceSetting(projectOpenBehaviorSetting);
    context.telemetry.properties.openBehaviorFromSetting = String(!!wizardContext.openBehavior);
  }

  // Create a new Azure wizard with the appropriate steps for Cloud to Local
  const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
    title: localize('cloudToLocal', 'Import zip into new Workspace'),
    promptSteps: [
      new FolderListStep(),
      new setWorkspaceName(),
      new SetLogicAppName(),
      new ZipFileStep(),
      new NewCodeProjectTypeStep(options.templateId, options.functionSettings, true),
      new OpenBehaviorStep(),
    ],
    executeSteps: [new OpenFolderStepCodeProject()],
    hideStepCount: true,
  });

  await wizard.prompt();
  await wizard.execute();

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
