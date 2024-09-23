import {
  extensionCommand,
  funcVersionSetting,
  projectLanguageSetting,
  projectOpenBehaviorSetting,
  projectTemplateKeySetting,
  parameterizeConnectionsInProjectLoadSetting,
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
import { extend } from '@microsoft/logic-apps-shared';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion, OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import { extractConnectionDetails, changeAuthTypeToRaw, updateConnectionKeys, getConnectionsJsonContent } from './cloudToLocalHelper';
import type { ICreateFunctionOptions, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import { window } from 'vscode';
import * as path from 'path';
import AdmZip = require('adm-zip');
import * as fs from 'fs';
import { SetLogicAppType } from './CodeProjectBase/setLogicAppType';
import { writeFormattedJson } from '../../utils/fs';

const openFolder = true;

function createAdmZipInstance(zipFilePath: string) {
  return new AdmZip(zipFilePath);
}

function getZipEntries(zipFilePath: string) {
  const zip = createAdmZipInstance(zipFilePath);
  return zip.getEntries();
}

async function cleanLocalSettings(localSettingsPath: string) {
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));

  if (localSettings.Values) {
    const localSettingKeys = Object.keys(localSettings.Values);
    if (localSettingKeys.includes('WEBSITE_SITE_NAME')) {
      delete localSettings.Values['WEBSITE_SITE_NAME'];
    }
    if (localSettingKeys.includes('WEBSITE_AUTH_ENABLED')) {
      delete localSettings.Values['WEBSITE_AUTH_ENABLED'];
    }
    if (localSettingKeys.includes('WEBSITE_SLOT_NAME')) {
      delete localSettings.Values['WEBSITE_SLOT_NAME'];
    }
    if (localSettingKeys.includes('ScmType')) {
      delete localSettings.Values['ScmType'];
    }
    if (localSettingKeys.includes('FUNCTIONS_RUNTIME_SCALE_MONITORING_ENABLED')) {
      delete localSettings.Values['FUNCTIONS_RUNTIME_SCALE_MONITORING_ENABLED'];
    }
    if (localSettingKeys.includes('AzureWebJobsStorage')) {
      localSettings.Values['AzureWebJobsStorage'] = 'UseDevelopmentStorage=true';
    }

    await writeFormattedJson(localSettingsPath, localSettings);
  }
}

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
    title: localize('importZipToWorkspace', 'Import zip into new workspace'),
    promptSteps: [
      new FolderListStep(),
      new setWorkspaceName(),
      new SetLogicAppType(),
      new SetLogicAppName(),
      new ZipFileStep(),
      new NewCodeProjectTypeStep(options.templateId, options.functionSettings, true),
      new OpenBehaviorStep(),
    ],
    executeSteps: [new OpenFolderStepCodeProject()],
    hideStepCount: true,
  });
  try {
    await wizard.prompt();
    await wizard.execute();
  } catch (error) {
    context.telemetry.properties.error = error.message;
    console.error('Error during wizard execution:', error);
  }
  const zipFilePath = ZipFileStep.zipFilePath;
  const zipEntries = getZipEntries(zipFilePath);
  const connectionspath = path.join(wizardContext.workspacePath, 'connections.json');
  const localSettingsEntry = zipEntries.find((entry) => entry.entryName === 'local.settings.json');
  const localSettingsPath = path.join(wizardContext.workspacePath, 'local.settings.json');
  let localSettings: { Values?: any } = {};
  let zipSettings = {};
  const parametersEntry = zipEntries.find((entry) => entry.entryName === 'parameters.json');
  const parametersPath = path.join(wizardContext.workspacePath, 'parameters.json');
  let localParameters: any = {};
  let zipParameters: any = {};
  const connectionsData = await getConnectionsJsonContent(wizardContext as IFunctionWizardContext);
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

  const localSettingsContent = fs.readFileSync(localSettingsPath, 'utf8');
  localSettings = JSON.parse(localSettingsContent);
  const localParametersContent = fs.readFileSync(parametersPath, 'utf8');
  localParameters = JSON.parse(localParametersContent);

  if (localSettingsEntry) {
    wizardContext.telemetry.properties.localSettingsFoundZip = 'true';
    const zipSettingsContent = localSettingsEntry.getData().toString('utf8');
    zipSettings = JSON.parse(zipSettingsContent);
  }

  if (parametersEntry) {
    wizardContext.telemetry.properties.parametersFoundZip = 'true';
    const parametersContent = parametersEntry.getData().toString('utf8');
    zipParameters = JSON.parse(parametersContent);
  }

  async function mergeSettings(): Promise<Record<string, any>> {
    try {
      const connectionsValues = await extractConnectionDetails(connectionsData);
      const connectionDetail = connectionsValues[0];
      const newValues = {
        ...connectionDetail,
        ...localSettings.Values,
      };
      const settings = {
        ...localSettings,
        Values: newValues,
      };

      return settings;
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error('Error writing file:', error);
    }
  }

  extend(localParameters, zipParameters);
  extend(localSettings, zipSettings);

  if (connectionsData.managedApiConnections) {
    const [convertedConnections, convertedParameters] = await changeAuthTypeToRaw(
      wizardContext as IFunctionWizardContext,
      connectionsData,
      localParameters,
      parameterizeConnectionsSetting
    );
    context.telemetry.properties.finishedConvertingAuthToRaw = 'Finished converting connection authentication to Raw';
    const mergedSettings = await mergeSettings();

    await writeFormattedJson(connectionspath, convertedConnections);
    await writeFormattedJson(parametersPath, convertedParameters);
    await writeFormattedJson(localSettingsPath, mergedSettings);
    await cleanLocalSettings(localSettingsPath);

    await updateConnectionKeys(wizardContext as IFunctionWizardContext);
  } else {
    await writeFormattedJson(parametersPath, localParameters);
    await writeFormattedJson(localSettingsPath, localSettings);
    await cleanLocalSettings(localSettingsPath);
  }

  context.telemetry.properties.finishedImportingProject = 'Finished importing project';
  window.showInformationMessage(localize('finishedImporting', 'Finished importing project.'));
}
