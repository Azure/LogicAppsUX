import { latestGAVersion, ProjectLanguage, ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { ILaunchJson, ISettingToAdd, IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import {
  assetsFolderName,
  deploySubpathSetting,
  extensionCommand,
  extensionsFileName,
  funcVersionSetting,
  launchFileName,
  launchVersion,
  projectLanguageSetting,
  settingsFileName,
  tasksFileName,
  vscodeFolderName,
  workspaceTemplatesFolderName,
} from '../../../../constants';
import path from 'path';
import * as fse from 'fs-extra';
import type { DebugConfiguration } from 'vscode';
import { confirmEditJsonFile } from '../../../utils/fs';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../localize';
import { ext } from '../../../../extensionVariables';
import { isDebugConfigEqual } from '../../../utils/vsCodeConfig/launch';

export async function writeSettingsJson(
  context: IWebviewProjectContext,
  additionalSettings: ISettingToAdd[],
  vscodePath: string
): Promise<void> {
  const settings: ISettingToAdd[] = additionalSettings.concat(
    { key: projectLanguageSetting, value: ProjectLanguage.JavaScript },
    { key: funcVersionSetting, value: latestGAVersion },
    // We want the terminal to open after F5, not the debug console because HTTP triggers are printed in the terminal.
    { prefix: 'debug', key: 'internalConsoleOptions', value: 'neverOpen' },
    { prefix: 'azureFunctions', key: 'suppressProject', value: true }
  );

  const settingsJsonPath: string = path.join(vscodePath, settingsFileName);
  await confirmEditJsonFile(context, settingsJsonPath, (data: Record<string, any>): Record<string, any> => {
    for (const setting of settings) {
      const key = `${setting.prefix || ext.prefix}.${setting.key}`;
      data[key] = setting.value;
    }
    return data;
  });
}

export async function writeExtensionsJson(context: IActionContext, vscodePath: string): Promise<void> {
  const extensionsJsonPath: string = path.join(vscodePath, extensionsFileName);
  const extensionsJsonFile = 'ExtensionsJsonFile';
  const templatePath = path.join(__dirname, assetsFolderName, workspaceTemplatesFolderName, extensionsJsonFile);
  await fse.copyFile(templatePath, extensionsJsonPath);
}

export async function writeTasksJson(context: IActionContext, vscodePath: string): Promise<void> {
  const tasksJsonPath: string = path.join(vscodePath, tasksFileName);
  const tasksJsonFile = 'TasksJsonFile';
  const templatePath = path.join(__dirname, assetsFolderName, workspaceTemplatesFolderName, tasksJsonFile);
  await fse.copyFile(templatePath, tasksJsonPath);
}

export function getDebugConfiguration(logicAppName: string, customCodeTargetFramework?: TargetFramework): DebugConfiguration {
  if (customCodeTargetFramework) {
    return {
      name: localize('debugLogicApp', `Run/Debug logic app with local function ${logicAppName}`),
      type: 'logicapp',
      request: 'launch',
      funcRuntime: 'coreclr',
      customCodeRuntime: customCodeTargetFramework === TargetFramework.Net8 ? 'coreclr' : 'clr',
      isCodeless: true,
    };
  }

  return {
    name: localize('attachToNetFunc', `Run/Debug logic app ${logicAppName}`),
    type: 'coreclr',
    request: 'attach',
    processId: `\${command:${extensionCommand.pickProcess}}`,
  };
}

export async function writeLaunchJson(
  context: IActionContext,
  vscodePath: string,
  logicAppName: string,
  customCodeTargetFramework?: TargetFramework
): Promise<void> {
  const newDebugConfig: DebugConfiguration = getDebugConfiguration(logicAppName, customCodeTargetFramework);

  // otherwise manually edit json
  const launchJsonPath: string = path.join(vscodePath, launchFileName);
  await confirmEditJsonFile(context, launchJsonPath, (data: ILaunchJson): ILaunchJson => {
    data.version = launchVersion;
    data.configurations = insertLaunchConfig(data.configurations, newDebugConfig);
    return data;
  });
}

export function insertLaunchConfig(existingConfigs: DebugConfiguration[] | undefined, newConfig: DebugConfiguration): DebugConfiguration[] {
  // tslint:disable-next-line: strict-boolean-expressions
  existingConfigs = existingConfigs || [];
  // Remove configs that match the one we're about to add
  existingConfigs = existingConfigs.filter((l1) => !isDebugConfigEqual(l1, newConfig));
  existingConfigs.push(newConfig);
  return existingConfigs;
}

export async function createLogicAppVsCodeContents(
  myWebviewProjectContext: IWebviewProjectContext,
  logicAppFolderPath: string
): Promise<void> {
  const vscodePath: string = path.join(logicAppFolderPath, vscodeFolderName);
  await fse.ensureDir(vscodePath);

  const additionalSettings: ISettingToAdd[] = [];

  if (myWebviewProjectContext.logicAppType === ProjectType.logicApp) {
    additionalSettings.push({ key: deploySubpathSetting, value: '.' });
  }

  await writeSettingsJson(myWebviewProjectContext, additionalSettings, vscodePath);
  await writeExtensionsJson(myWebviewProjectContext, vscodePath);
  await writeTasksJson(myWebviewProjectContext, vscodePath);
  await writeLaunchJson(
    myWebviewProjectContext,
    vscodePath,
    myWebviewProjectContext.logicAppName,
    myWebviewProjectContext.targetFramework as TargetFramework
  );
}
