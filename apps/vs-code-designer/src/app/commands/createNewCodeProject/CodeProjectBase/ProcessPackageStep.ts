import { AzureWizardExecuteStep, callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, ILocalSettingsJson, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { parameterizeConnectionsInProjectLoadSetting } from '../../../../constants';
import path from 'path';
import {
  changeAuthTypeToRaw,
  cleanLocalSettings,
  extractConnectionSettings,
  mergeAppSettings,
  parameterizeConnectionsDuringImport,
  updateConnectionKeys,
} from '../cloudToLocalHelper';
import { getGlobalSetting } from '../../../utils/vsCodeConfig/settings';
import { writeFormattedJson } from '../../../utils/fs';
import { getConnectionsJson } from '../../../utils/codeless/connection';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import AdmZip from 'adm-zip';
import { extend, isEmptyString } from '@microsoft/logic-apps-shared';
import { Uri, window, workspace } from 'vscode';
import { localize } from '../../../../localize';
import * as fse from 'fs-extra';
import { getContainingWorkspace } from '../../../utils/workspace';
import { ext } from '../../../../extensionVariables';

interface ICachedTextDocument {
  projectPath: string;
  textDocumentPath: string;
}

const cacheKey = 'azLAPostExtractReadMe';

export function runPostExtractStepsFromCache(): void {
  const cachedDocument: ICachedTextDocument | undefined = ext.context.globalState.get(cacheKey);
  if (cachedDocument) {
    try {
      runPostExtractSteps(cachedDocument);
    } finally {
      ext.context.globalState.update(cacheKey, undefined);
    }
  }
}

export class ProcessPackageStep extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 200;

  /**
   * Executes the step to integrate the package into the new Logic App workspace
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves to void.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    const logicAppPath = path.join(context.customWorkspaceFolderPath, context.logicAppName || 'LogicApp');
    const localSettingsPath = path.join(logicAppPath, 'local.settings.json');
    const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

    let appSettings: ILocalSettingsJson = {};
    let zipSettings: ILocalSettingsJson = {};
    let connectionsData: any = {};

    try {
      const connectionsString = await getConnectionsJson(logicAppPath);

      // merge the app settings from local.settings.json and the settings from the zip file
      appSettings = await getLocalSettingsJson(context, localSettingsPath, false);
      const zipEntries = await this.getPackageEntries(context.packagePath);
      const zipSettingsBuffer = zipEntries.find((entry) => entry.entryName === 'local.settings.json');
      if (zipSettingsBuffer) {
        context.telemetry.properties.localSettingsInZip = 'Local settings found in the zip file';
        zipSettings = JSON.parse(zipSettingsBuffer.getData().toString('utf8'));
        await writeFormattedJson(localSettingsPath, mergeAppSettings(appSettings, zipSettings));
      }

      if (isEmptyString(connectionsString)) {
        context.telemetry.properties.noConnectionsInZip = 'No connections found in the zip file';
        return;
      }

      connectionsData = JSON.parse(connectionsString);
      if (Object.keys(connectionsData).length && connectionsData.managedApiConnections) {
        /** Extract details from connections and add to local.settings.json
         * independent of the parameterizeConnectionsInProject setting */
        appSettings = await getLocalSettingsJson(context, localSettingsPath, false);
        await writeFormattedJson(localSettingsPath, extend(appSettings, await extractConnectionSettings(context)));

        if (parameterizeConnectionsSetting) {
          await parameterizeConnectionsDuringImport(context as IFunctionWizardContext, appSettings.Values);
        }

        await changeAuthTypeToRaw(context, parameterizeConnectionsSetting);
        await updateConnectionKeys(context);
        await cleanLocalSettings(context);
      }

      // OpenFolder will restart the extension host so we will cache README to open on next activation
      const readMePath = path.join(logicAppPath, 'README.md');
      const postExtractCache: ICachedTextDocument = { projectPath: logicAppPath, textDocumentPath: readMePath };
      ext.context.globalState.update(cacheKey, postExtractCache);
      // Delete cached information if the extension host was not restarted after 5 seconds
      setTimeout(() => {
        ext.context.globalState.update(cacheKey, undefined);
      }, 5 * 1000);
      runPostExtractSteps(postExtractCache);
    } catch (error) {
      context.telemetry.properties.error = error.message;
    }
  }

  /**
   * Determines whether this step should be executed based on the user's input.
   * @param context The context object for the project wizard.
   * @returns A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(context: IFunctionWizardContext): boolean {
    return context.packagePath !== undefined;
  }

  private async getPackageEntries(zipFilePath: string) {
    const zip = new AdmZip(zipFilePath);
    return zip.getEntries();
  }
}

function runPostExtractSteps(cache: ICachedTextDocument): void {
  callWithTelemetryAndErrorHandling('postExtractPackage', async (context: IActionContext) => {
    context.telemetry.suppressIfSuccessful = true;

    if (getContainingWorkspace(cache.projectPath)) {
      if (await fse.pathExists(cache.textDocumentPath)) {
        window.showTextDocument(await workspace.openTextDocument(Uri.file(cache.textDocumentPath)));
      }
    }
    context.telemetry.properties.finishedImportingProject = 'Finished importing project';
    window.showInformationMessage(localize('finishedImporting', 'Finished importing project.'));
  });
}
