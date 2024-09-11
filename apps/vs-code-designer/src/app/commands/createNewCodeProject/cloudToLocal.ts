// Used createNewCodeProject.ts as a template to create this file
// This file is used to take a zipped Logic App from the desktop and unzip to the local workspace
// Reorganized file with constants at the top, grouped functions, and a main cloudToLocalInternal to call everything
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
import { extractConnectionDetails, changeAuthTypeToRaw, updateConnectionKeys, parameterizeConnections } from './cloudToLocalHelper';
import type { ICreateFunctionOptions, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import { window } from 'vscode';
import * as path from 'path';
import AdmZip = require('adm-zip');
import * as fs from 'fs';
import { SetLogicAppType } from './CodeProjectBase/setLogicAppType';

// Constants
const openFolder = true;

// Function to create an AdmZip instance
function createAdmZipInstance(zipFilePath: string) {
  return new AdmZip(zipFilePath);
}

// Function to get zip entries
function getZipEntries(zipFilePath: string) {
  const zip = createAdmZipInstance(zipFilePath);
  return zip.getEntries();
}

function cleanLocalSettings(localSettingsPath: string) {
  const localSettingsContent = fs.readFileSync(localSettingsPath, 'utf8');
  const localSettings = JSON.parse(localSettingsContent);

  if (localSettings.Values) {
    Object.keys(localSettings.Values).forEach((key) => {
      if (
        key === 'WEBSITE_SITE_NAME' ||
        key === 'WEBSITE_AUTH_ENABLED' ||
        key === 'WEBSITE_SLOT_NAME' ||
        key === 'ScmType' ||
        key === 'FUNCTIONS_RUNTIME_SCALE_MONITORING_ENABLED'
      ) {
        delete localSettings.Values[key];
      } else if (key === 'AzureWebJobsStorage') {
        localSettings.Values[key] = 'UseDevelopmentStorage=true';
      }
    });

    fs.writeFileSync(localSettingsPath, JSON.stringify(localSettings, null, 2));
  }
}

// Main function to orchestrate the cloud to local process
export async function cloudToLocalInternal(
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
    title: localize('cloudToLocal', 'Import zip into new Workspace'),
    promptSteps: [
      new FolderListStep(),
      new setWorkspaceName(),
      new SetLogicAppType(), // is it only supporting one type?
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
  const zipFileInstance = new ZipFileStep();
  const connectionsData = await zipFileInstance.getConnectionsJsonContent(wizardContext as IFunctionWizardContext);
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

  if (localSettingsEntry) {
    const zipSettingsContent = localSettingsEntry.getData().toString('utf8');
    zipSettings = JSON.parse(zipSettingsContent);
  }

  if (fs.existsSync(localSettingsPath)) {
    const localSettingsContent = fs.readFileSync(localSettingsPath, 'utf8');
    localSettings = JSON.parse(localSettingsContent);
  }

  if (parametersEntry) {
    const parametersContent = parametersEntry.getData().toString('utf8');
    zipParameters = JSON.parse(parametersContent);
  }

  if (fs.existsSync(parametersPath)) {
    const localParametersContent = fs.readFileSync(parametersPath, 'utf8');
    localParameters = JSON.parse(localParametersContent);
  }

  async function fetchConnections() {
    const instance = new ZipFileStep();
    try {
      const connectionsData = await instance.getConnectionsJsonContent(wizardContext as IFunctionWizardContext);
      const connectionDetails = extractConnectionDetails(connectionsData);
      return connectionDetails;
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  }

  async function mergeSettings(): Promise<Record<string, any>> {
    try {
      const connectionsValues = await fetchConnections();
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
      console.error('Error writing file:', error);
    }
  }

  extend(localParameters, zipParameters);
  extend(localSettings, zipSettings);

  const [convertedConnections, convertedParameters] = await changeAuthTypeToRaw(
    connectionsData,
    localParameters,
    parameterizeConnectionsSetting
  );
  const mergedSettings = await mergeSettings();

  fs.writeFileSync(connectionspath, JSON.stringify(convertedConnections, null, 2), 'utf-8');
  fs.writeFileSync(parametersPath, JSON.stringify(convertedParameters, null, 2), 'utf-8');
  fs.writeFileSync(localSettingsPath, JSON.stringify(mergedSettings, null, 2));
  cleanLocalSettings(localSettingsPath);

  if (parameterizeConnectionsSetting === null || parameterizeConnectionsSetting) {
    await parameterizeConnections(wizardContext as IFunctionWizardContext, mergedSettings);
  }

  updateConnectionKeys(wizardContext as IFunctionWizardContext);

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
