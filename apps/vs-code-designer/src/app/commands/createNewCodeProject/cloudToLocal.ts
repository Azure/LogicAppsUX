// Used createNewCodeProject.ts as a template to create this file
// This file is used to take a zipped Logic App from the desktop and unzip to the local workspace
// Reorganized file with constants at the top, grouped functions, and a main cloudToLocalInternal to call everything
import {
  extensionCommand,
  funcVersionSetting,
  projectLanguageSetting,
  projectOpenBehaviorSetting,
  projectTemplateKeySetting,
  parametersFileName,
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
import { extractConnectionDetails, changeAuthTypeToRaw } from './cloudToLocalHelper';
import { getParametersJson } from '../../utils/codeless/parameter';
import { writeFormattedJson } from '../../utils/fs';
import { saveConnectionReferences, getConnectionsJson, getConnectionsAndSettingsToUpdate } from '../../utils/codeless/connection';
import { parameterizeConnection } from '../../utils/codeless/parameterizer';
import type {
  ICreateFunctionOptions,
  IFunctionWizardContext,
  ProjectLanguage,
  ConnectionsData,
} from '@microsoft/vscode-extension-logic-apps';
import { window } from 'vscode';
import * as path from 'path';
import AdmZip = require('adm-zip');
import * as fs from 'fs';

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

async function getSettings(context: IActionContext, connections: any, workspacePath: any) {
  const tenantId = '';
  const workflowManagementBaseUrl = 'https://management.azure.com/';
  const settingsRecord: Record<string, string> = {};

  const connectionReferences = connections.managedApiConnections || {};
  const parameters = await getParametersJson(workspacePath);
  const connectionsJson = await getConnectionsJson(workspacePath);
  const connectionsData: ConnectionsData = connectionsJson ? JSON.parse(connectionsJson) : {};

  for (const connectionType of Object.keys(connectionsData)) {
    if (connectionType !== 'serviceProviderConnections') {
      const connectionTypeJson = connectionsData[connectionType];
      Object.keys(connectionTypeJson).forEach((connectionKey) => {
        connectionTypeJson[connectionKey] = parameterizeConnection(
          connectionTypeJson[connectionKey],
          connectionKey,
          parameters,
          settingsRecord
        );
      });
      await writeFormattedJson(path.join(workspacePath, parametersFileName), parameters);
    }
  }
  const skipProjectPath = true;
  const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
    context,
    workspacePath,
    connectionReferences,
    tenantId,
    workflowManagementBaseUrl,
    parameters,
    skipProjectPath
  );
  return connectionsAndSettingsToUpdate;
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
  let zipSettings = {};
  const localSettingsEntry = zipEntries.find((entry) => entry.entryName === 'local.settings.json');
  const localSettingsPath = path.join(wizardContext.workspacePath, 'local.settings.json');
  let localSettings: { Values?: any } = {};

  if (localSettingsEntry) {
    const zipSettingsContent = localSettingsEntry.getData().toString('utf8');
    zipSettings = JSON.parse(zipSettingsContent);
  }

  if (fs.existsSync(localSettingsPath)) {
    const localSettingsContent = fs.readFileSync(localSettingsPath, 'utf8');
    localSettings = JSON.parse(localSettingsContent);
  }

  async function fetchConnections() {
    const instance = new ZipFileStep();
    try {
      const connection = await instance.getConnectionsJsonContent(wizardContext as IFunctionWizardContext);
      const connectionDetails = extractConnectionDetails(connection);
      return connectionDetails;
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  }

  async function mergeAndWriteConnections() {
    try {
      const connectionsValues = await fetchConnections();
      const connectionDetail = connectionsValues[0];
      const newValues = {
        ...connectionDetail,
        ...localSettings.Values,
      };
      const finalObject = {
        ...localSettings,
        Values: newValues,
      };
      fs.writeFileSync(localSettingsPath, JSON.stringify(finalObject, null, 2));
    } catch (error) {
      console.error('Error writing file:', error);
    }
  }
  const skipProjectPath = true;

  extend(localSettings, zipSettings);
  await mergeAndWriteConnections();
  const instance = new ZipFileStep();
  const connection = await instance.getConnectionsJsonContent(wizardContext as IFunctionWizardContext);
  fs.writeFileSync(connectionspath, changeAuthTypeToRaw(connection), 'utf-8');
  cleanLocalSettings(localSettingsPath);
  const connectionsAndSettingsUpdated = await getSettings(context, connection, wizardContext.workspacePath);

  await saveConnectionReferences(context, wizardContext.workspacePath, connectionsAndSettingsUpdated, skipProjectPath);

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
