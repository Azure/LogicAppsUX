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

const openFolder = true;
const DELIMITER = '/';
const SUBSCRIPTION_INDEX = 2;
const MANAGED_API_LOCATION_INDEX = 6;
const MANAGED_CONNECTION_RESOURCE_GROUP_INDEX = 4;

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
  showPreviewWarning(extensionCommand.cloudToLocal); //Show warning if command is set to preview

  const language: ProjectLanguage | string = (options.language as ProjectLanguage) || getGlobalSetting(projectLanguageSetting);
  const version: string = options.version || getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);
  const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options, {
    language,
    version: tryParseFuncVersion(version),
    projectTemplateKey,
    projectPath: options.folderPath, // Set the projectPath property to the folderPath option
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
  try {
    await wizard.prompt();
    await wizard.execute();
  } catch (error) {
    console.error('Error during wizard execution:', error);
  }

  // Factory function to create an AdmZip instance
  function createAdmZipInstance(zipFilePath: string) {
    return new AdmZip(zipFilePath);
  }

  // Function to abstract away the direct use of the AdmZip constructor
  function getZipEntries(zipFilePath: string) {
    const zip = createAdmZipInstance(zipFilePath);
    return zip.getEntries(); // Returns all entries (files and folders) within the zip file
  }

  const zipFilePath = ZipFileStep.zipFilePath;
  const zipEntries = getZipEntries(zipFilePath);

  let zipSettings = {};

  // Check if the local.settings.json file exists in the zip and read its contents
  const localSettingsEntry = zipEntries.find((entry) => entry.entryName === 'local.settings.json');
  if (localSettingsEntry) {
    const zipSettingsContent = localSettingsEntry.getData().toString('utf8');
    zipSettings = JSON.parse(zipSettingsContent);
  }
  // Merge local.settings.json files
  const localSettingsPath = path.join(wizardContext.workspacePath, 'local.settings.json');
  let localSettings: { Values?: any } = {};

  // Check if a local local.settings.json file exists
  if (fs.existsSync(localSettingsPath)) {
    // If it does, read its contents
    const localSettingsContent = fs.readFileSync(localSettingsPath, 'utf8');
    localSettings = JSON.parse(localSettingsContent);
  }

  function deepMergeObjects(target: any, source: any): any {
    const result = { ...target }; // Create a shallow copy of the target to avoid modifying the original object
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && key in target) {
        // If the value is an object and the key exists in the target, recurse
        result[key] = deepMergeObjects(target[key], source[key]);
      } else {
        // For non-object values or keys not present in the target, directly assign to the result
        result[key] = source[key];
      }
    }
    return result;
  }

  localSettings = deepMergeObjects(zipSettings, localSettings);

  function extractConnectionDetails(connection: ConnectionReferenceModel): any {
    const details = [];
    if (connection) {
      const managedApiConnections = connection['managedApiConnections'];
      for (const connection in managedApiConnections) {
        if (Object.prototype.hasOwnProperty.call(managedApiConnections, connection)) {
          const idPath = managedApiConnections[connection]['api']['id'];
          const connectionidPath = managedApiConnections[connection]['connection']['id'];
          const apiIdParts = idPath.split(DELIMITER);
          const connectionidParts = connectionidPath.split(DELIMITER);
          if (apiIdParts) {
            const detail = {
              WORKFLOWS_SUBSCRIPTION_ID: apiIdParts[SUBSCRIPTION_INDEX], // Extract subscription ID from API ID
              WORKFLOWS_LOCATION_NAME: apiIdParts[MANAGED_API_LOCATION_INDEX], // Extract location from API ID
              WORKFLOWS_RESOURCE_GROUP_NAME: connectionidParts[MANAGED_CONNECTION_RESOURCE_GROUP_INDEX], // Extract resource group from Connection ID
            };
            details.push(detail);
          }
        }
      }
    }
    return details;
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
      const connectionsValues = await fetchConnections(); // Wait for the connection details

      // Assuming connectionsValues is an array with the connection details as its first element
      const connectionDetail = connectionsValues[0];

      // Prepare the new object to include in Values
      const newValues = {
        ...localSettings.Values, // Spread existing values
        ...connectionDetail, // Add the connection detail under "0"
      };

      const finalObject = {
        ...localSettings, // Spread other properties of localSettings
        Values: newValues, // Override Values with newValues
      };

      // Write the merged contents back to the local.settings.json file
      fs.writeFileSync(localSettingsPath, JSON.stringify(finalObject, null, 2));
      console.log(`Successfully wrote to ${localSettingsPath}`);
    } catch (error) {
      console.error('Error writing file:', error);
    }
  }
  mergeAndWriteConnections();

  // Write the merged contents back to the local local.settings.json file
  try {
    fs.writeFileSync(localSettingsPath, JSON.stringify(localSettings, null, 2));
    console.log(`Successfully writ to ${localSettingsPath}`);
  } catch (error) {
    console.error('Error writing file:', error);
  }

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
