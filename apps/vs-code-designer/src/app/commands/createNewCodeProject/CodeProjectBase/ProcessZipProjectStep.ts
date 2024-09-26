import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, ILocalSettingsJson, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { parameterizeConnectionsInProjectLoadSetting } from '../../../../constants';
import path from 'path';
import {
  changeAuthTypeToRaw,
  cleanLocalSettings,
  extractConnectionSettings,
  parameterizeConnectionsDuringImport,
  updateConnectionKeys,
} from '../cloudToLocalHelper';
import { getGlobalSetting } from '../../../utils/vsCodeConfig/settings';
import { writeFormattedJson } from '../../../utils/fs';
import { getConnectionsJson } from '../../../utils/codeless/connection';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import AdmZip from 'adm-zip';
import { extend } from '@microsoft/logic-apps-shared';

export class ProcessZipProjectStep extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 200;

  /**
   * Executes the step to open the folder in Visual Studio Code.
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves to void.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    const newLogicAppFolderPath = context.projectPath;
    const localSettingsPath = path.join(newLogicAppFolderPath, 'local.settings.json');
    const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

    let appSettings: ILocalSettingsJson = {};
    let zipSettings: ILocalSettingsJson = {};
    let connectionsData: any = {};

    try {
      const connectionsString = await getConnectionsJson(newLogicAppFolderPath);
      appSettings = await getLocalSettingsJson(context, localSettingsPath, false);
      const zipEntries = this.getZipEntries(context.zipFilePath);
      const zipSettingsBuffer = zipEntries.find((entry) => entry.entryName === 'local.settings.json');
      if (zipSettingsBuffer) {
        zipSettings = JSON.parse(zipSettingsBuffer.getData().toString('utf8'));
        await writeFormattedJson(localSettingsPath, extend(appSettings, zipSettings));
      }

      if (connectionsString) {
        connectionsData = JSON.parse(connectionsString);
      }

      if (Object.keys(connectionsData).length > 0 && connectionsData.managedApiConnections) {
        await writeFormattedJson(localSettingsPath, extend(appSettings, await extractConnectionSettings(context)));

        if (parameterizeConnectionsSetting) {
          await parameterizeConnectionsDuringImport(context as IFunctionWizardContext, appSettings.Values);
        }

        await changeAuthTypeToRaw(context, parameterizeConnectionsSetting);
        await updateConnectionKeys(context);
        await cleanLocalSettings(context);
      }
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
    return context.zipFilePath !== undefined;
  }

  private getZipEntries(zipFilePath: string) {
    const zip = new AdmZip(zipFilePath);
    return zip.getEntries();
  }
}
