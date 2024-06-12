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
import AdmZip = require('adm-zip');
import * as fs from 'fs';
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
  try {
    await wizard.prompt();
    await wizard.execute();
  } catch (error) {
    console.error('Error during wizard execution:', error);
  }

  console.log('Starting other code stuff');

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
    console.log('Zip Settings:', JSON.stringify(zipSettings, null, 2));
  }
  // Merge local.settings.json files
  const localSettingsPath = path.join(wizardContext.workspacePath, 'local.settings.json');
  let localSettings = {};

  // Check if a local local.settings.json file exists
  if (fs.existsSync(localSettingsPath)) {
    // If it does, read its contents
    const localSettingsContent = fs.readFileSync(localSettingsPath, 'utf8');
    localSettings = JSON.parse(localSettingsContent);
    console.log('Local Settings:', JSON.stringify(localSettings, null, 2));
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
  console.log('Merged Settings:', JSON.stringify(localSettings, null, 2));

  // Write the merged contents back to the local local.settings.json file
  try {
    fs.writeFileSync(localSettingsPath, JSON.stringify(localSettings, null, 2));
    console.log(`Successfully wrote to ${localSettingsPath}`);
  } catch (error) {
    console.error('Error writing file:', error);
  }
  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
