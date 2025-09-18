import { funcVersionSetting, projectLanguageSetting, projectOpenBehaviorSetting, projectTemplateKeySetting } from '../../../constants';
import { localize } from '../../../localize';
import { addLocalFuncTelemetry, tryGetLocalFuncVersion, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getGlobalSetting, getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { OpenBehaviorStep } from '../createWorkspace/createWorkspaceSteps/openBehaviorStep';
import { ProjectTypeStep } from '../createProject/createProjectSteps/projectTypeStep';
import { SelectPackageStep } from './cloudToLocalSteps/selectPackageStep';
import { OpenFolderStep } from '../createWorkspace/createWorkspaceSteps/openFolderStep';
import { LogicAppNameStep } from '../createProject/createProjectSteps/logicAppNameStep';
import { WorkspaceNameStep } from '../createWorkspace/createWorkspaceSteps/workspaceNameStep';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion, OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { ICreateFunctionOptions, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import { ProcessPackageStep } from './cloudToLocalSteps/processPackageStep';
import { SelectFolderForNewWorkspaceStep } from './cloudToLocalSteps/selectFolderForNewWorkspaceStep';
import { ExtractPackageStep } from './cloudToLocalSteps/extractPackageStep';
import { WorkspaceSettingsStep } from '../createWorkspace/createWorkspaceSteps/workspaceSettingsStep';
import { DevcontainerStep } from '../createWorkspace/createWorkspaceSteps/devcontainerStep';

const openFolder = true;

export async function cloudToLocal(
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
      // TODO(aeldridge): Can we just use WorkspaceFolderStep instead?
      new SelectFolderForNewWorkspaceStep(),
      new WorkspaceNameStep(),
      new DevcontainerStep(),
      new LogicAppNameStep(),
      await ProjectTypeStep.create(context, options.templateId, options.functionSettings, true),
      new WorkspaceSettingsStep(),
      new ExtractPackageStep(),
      new OpenBehaviorStep(),
    ],
    executeSteps: [new ProcessPackageStep(), new OpenFolderStep()],
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
