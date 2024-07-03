// Used createNewCodeProject.ts as a template to create this file
// This file is used to take a zipped Logic App from the desktop and unzip to the local workspace
// Reorganized file with constants at the top, grouped functions, and a main cloudToLocalInternal to call everything

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
import type {
  ConnectionReferenceModel,
  ICreateFunctionOptions,
  IFunctionWizardContext,
  ProjectLanguage,
} from '@microsoft/vscode-extension-logic-apps';
import { window } from 'vscode';
import * as path from 'path';
import AdmZip = require('adm-zip');
import * as fs from 'fs';

// Constants
const openFolder = true;
const DELIMITER = '/';
const SUBSCRIPTION_INDEX = 2;
const MANAGED_API_LOCATION_INDEX = 6;
const MANAGED_CONNECTION_RESOURCE_GROUP_INDEX = 4;

// Function to create an AdmZip instance
function createAdmZipInstance(zipFilePath: string) {
  return new AdmZip(zipFilePath);
}

// Function to get zip entries
function getZipEntries(zipFilePath: string) {
  const zip = createAdmZipInstance(zipFilePath);
  return zip.getEntries();
}

// Function to deep merge objects
function deepMergeObjects(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMergeObjects(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Function to extract connection details
function extractConnectionDetails(connection: ConnectionReferenceModel): any {
  const details = [];
  if (connection) {
    const managedApiConnections = connection['managedApiConnections'];
    for (const connKey in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connKey)) {
        const idPath = managedApiConnections[connKey]['api']['id'];
        const connectionidPath = managedApiConnections[connKey]['connection']['id'];
        const apiIdParts = idPath.split(DELIMITER);
        const connectionidParts = connectionidPath.split(DELIMITER);
        if (apiIdParts) {
          const detail = {
            WORKFLOWS_SUBSCRIPTION_ID: apiIdParts[SUBSCRIPTION_INDEX],
            WORKFLOWS_LOCATION_NAME: apiIdParts[MANAGED_API_LOCATION_INDEX],
            WORKFLOWS_RESOURCE_GROUP_NAME: connectionidParts[MANAGED_CONNECTION_RESOURCE_GROUP_INDEX],
          };
          details.push(detail);
        }
      }
    }
  }
  return details;
}

// Function to change authentication type to Raw
function changeAuthTypeToRaw(connections: ConnectionReferenceModel, connectionspath: string): void {
  if (connections) {
    const managedApiConnections = connections['managedApiConnections'];
    for (const connKey in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connKey)) {
        const authType = managedApiConnections[connKey]['authentication']['type'];
        if (authType === 'ManagedServiceIdentity') {
          console.log(`Changing type for ${connKey} from ${authType} to Raw`);
          managedApiConnections[connKey]['authentication']['type'] = 'Raw';
          managedApiConnections[connKey]['authentication']['scheme'] = 'Key';
          managedApiConnections[connKey]['authentication']['parameter'] = `@appsetting('${connKey}-connectionKey')`;
        }
      }
    }
    const data = JSON.stringify(connections, null, 2);
    try {
      fs.writeFileSync(connectionspath, data, 'utf8');
      console.log('Connections updated and saved to file.');
    } catch (error) {
      console.error('Failed to write connections to file:', error);
    }
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
        ...localSettings.Values,
        ...connectionDetail,
      };
      const finalObject = {
        ...localSettings,
        Values: newValues,
      };
      fs.writeFileSync(localSettingsPath, JSON.stringify(finalObject, null, 2));
      console.log(`Successfully wrote to ${localSettingsPath}`);
    } catch (error) {
      console.error('Error writing file:', error);
    }
  }

  localSettings = deepMergeObjects(zipSettings, localSettings);
  await mergeAndWriteConnections();
  const instance = new ZipFileStep();
  const connection = await instance.getConnectionsJsonContent(wizardContext as IFunctionWizardContext);
  changeAuthTypeToRaw(connection, connectionspath);

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
