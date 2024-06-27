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
import * as path from 'path';
import * as util from 'util';
import AdmZip = require('adm-zip');
import * as fs from 'fs';
const openFolder = true;

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
  let localSettings = {};

  // Check if a local local.settings.json file exists
  if (fs.existsSync(localSettingsPath)) {
    // If it does, read its contents
    const localSettingsContent = fs.readFileSync(localSettingsPath, 'utf8');
    localSettings = JSON.parse(localSettingsContent);
  }

  function deepMergeObjects(target: any, source: any): any {
    // Iterate over all properties in the source object
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && key in target) {
        // If the value is an object and the key exists in the target, recurse
        Object.assign(source[key], deepMergeObjects(target[key], source[key]));
      }
    }
    // Perform the merge
    Object.assign(target || {}, source);
    return target;
  }

  localSettings = deepMergeObjects(zipSettings, localSettings);

  // Write the merged contents back to the local local.settings.json file
  try {
    fs.writeFileSync(localSettingsPath, JSON.stringify(localSettings, null, 2));
    console.log(`Successfully wrote to ${localSettingsPath}`);
  } catch (error) {
    console.error('Error writing file:', error);
  }

  const fsExists = util.promisify(fs.exists);
  const fsReadFile = util.promisify(fs.readFile);

  async function waitForFile(filePath: string, timeout = 30000, interval = 1000): Promise<void> {
    const startTime = Date.now();

    return new Promise<void>((resolve, reject) => {
      const checkFile = async () => {
        if (await fsExists(filePath)) {
          const content = await fsReadFile(filePath, 'utf8');
          if (content.length > 0) {
            resolve();
          } else {
            // File exists but is empty, continue waiting
            setTimeout(checkFile, interval);
          }
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`File ${filePath} not found or empty within ${timeout} ms`));
        } else {
          // File does not exist, continue waiting
          setTimeout(checkFile, interval);
        }
      };

      checkFile();
    });
  }
  const parametersFilePath = '.../parameters.json';
  waitForFile(parametersFilePath)
    .then(() => {
      console.log('parameters.json is ready');
    })
    .catch((error) => {
      console.error(error);
    });

  const fsWriteFile = util.promisify(fs.writeFile);
  async function modifyFunctionSettings(filePath: string): Promise<void> {
    try {
      // Step 1: Read the parameters.json file
      const fileContent = await fsReadFile(filePath, 'utf8');

      // Step 2: Replace 'ManagedServiceIdentity' with 'Raw/Key' in the file content
      const modifiedContent = fileContent.replace(/ManagedServiceIdentity/g, 'KeyAuth');

      // Step 3: Write the modified content back to the file
      await fsWriteFile(filePath, modifiedContent);

      console.log('Modified functionSettings successfully.');
    } catch (error) {
      console.error('Failed to modify function settings:', error);
    }
  }
  modifyFunctionSettings(parametersFilePath)
    .then(() => console.log('Function settings modified successfully.'))
    .catch(console.error);

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
