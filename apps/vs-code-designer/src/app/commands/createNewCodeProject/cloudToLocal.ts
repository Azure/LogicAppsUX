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
import { NewCodeProjectTypeStep } from './CodeProjectBase/NewCodeProjectTypeStep';
import { SelectPackageStep } from '../createNewProject/createProjectSteps/SelectPackageStep';
import { OpenFolderStepCodeProject } from './CodeProjectBase/OpenFolderStepCodeProject';
import { SetLogicAppName } from './CodeProjectBase/SetLogicAppNameStep';
import { SetWorkspaceName } from './CodeProjectBase/SetWorkspaceName';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion, OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { ICreateFunctionOptions, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import { ProcessPackageStep } from './CodeProjectBase/ProcessPackageStep';
import { SelectFolderForNewWorkspaceStep } from '../createNewProject/createProjectSteps/SelectFolderForNewWorkspaceStep';
import { ExtractPackageStep } from './CodeProjectBase/ExtractPackageStep';

const openFolder = true;

export async function cloudToLocalCommand(
  context: IActionContext,
  options: ICreateFunctionOptions = {
    folderPath: undefined,
    language: undefined,
    version: undefined,
    templateId: undefined,
    functionName: undefined,
    functionSettings: undefined,
    suppressOpenFolder: !openFolder,
  }
): Promise<void> {
  addLocalFuncTelemetry(context);
  showPreviewWarning(extensionCommand.cloudToLocal);

  const language: ProjectLanguage | string = (options.language as ProjectLanguage) || getGlobalSetting(projectLanguageSetting);
  const version: string = options.version || getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);
  const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options, {
    language,
    version: tryParseFuncVersion(version),
    projectTemplateKey,
    projectPath: options.folderPath,
  });

  if (options.suppressOpenFolder) {
    wizardContext.openBehavior = OpenBehavior.dontOpen;
  } else if (!wizardContext.openBehavior) {
    wizardContext.openBehavior = getWorkspaceSetting(projectOpenBehaviorSetting);
    context.telemetry.properties.openBehaviorFromSetting = String(!!wizardContext.openBehavior);
  }

  const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
    title: localize('createLogicAppWorkspaceFromPackage', 'Create new logic app workspace from package'),
    promptSteps: [
      new SelectPackageStep(),
      new SelectFolderForNewWorkspaceStep(),
      new SetWorkspaceName(),
      new SetLogicAppName(),
      new NewCodeProjectTypeStep(options.templateId, options.functionSettings, true),
      new ExtractPackageStep(),
      new OpenBehaviorStep(),
    ],
    executeSteps: [new ProcessPackageStep(), new OpenFolderStepCodeProject()],
    hideStepCount: true,
  });
  try {
    await wizard.prompt();
    await wizard.execute();
  } catch (error) {
    context.telemetry.properties.error = error.message;
    console.error('Error during wizard execution:', error);
  }
}
