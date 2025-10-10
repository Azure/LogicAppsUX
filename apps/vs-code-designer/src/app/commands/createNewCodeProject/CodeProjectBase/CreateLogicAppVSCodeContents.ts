import { latestGAVersion, ProjectLanguage, ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { IExtensionsJson, ILaunchJson, ISettingToAdd, IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import {
  deploySubpathSetting,
  extensionCommand,
  extensionsFileName,
  funcVersionSetting,
  launchFileName,
  launchVersion,
  logicAppsStandardExtensionId,
  preDeployTaskSetting,
  projectLanguageSetting,
  settingsFileName,
  tasksFileName,
  vscodeFolderName,
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
  theseSettings: ISettingToAdd[],
  vscodePath: string
): Promise<void> {
  const settings: ISettingToAdd[] = theseSettings.concat(
    { key: projectLanguageSetting, value: ProjectLanguage.JavaScript },
    { key: funcVersionSetting, value: latestGAVersion },
    // We want the terminal to open after F5, not the debug console because HTTP triggers are printed in the terminal.
    { prefix: 'debug', key: 'internalConsoleOptions', value: 'neverOpen' },
    { prefix: 'azureFunctions', key: 'suppressProject', value: true }
  );

  if (this.preDeployTask) {
    settings.push({ key: preDeployTaskSetting, value: this.preDeployTask });
  }

  // if (context.workspaceFolder) {
  //   // Use Visual Studio Code API to update config if folder is open
  //   for (const setting of settings) {
  //     await updateWorkspaceSetting(setting.key, setting.value, context.workspacePath, setting.prefix);
  //   }
  // } else {
  // otherwise manually edit json
  const settingsJsonPath: string = path.join(vscodePath, settingsFileName);
  await confirmEditJsonFile(context, settingsJsonPath, (data: Record<string, any>): Record<string, any> => {
    for (const setting of settings) {
      const key = `${setting.prefix || ext.prefix}.${setting.key}`;
      data[key] = setting.value;
    }
    return data;
  });
  // }
}

export async function writeExtensionsJson(context: IActionContext, vscodePath: string): Promise<void> {
  const extensionsJsonPath: string = path.join(vscodePath, extensionsFileName);
  await confirmEditJsonFile(context, extensionsJsonPath, (data: IExtensionsJson): Record<string, any> => {
    const recommendations: string[] = [logicAppsStandardExtensionId];
    // de-dupe array
    data.recommendations = recommendations.filter((rec: string, index: number) => recommendations.indexOf(rec) === index);
    return data;
  });
}

export async function writeTasksJson(context: IActionContext, vscodePath: string): Promise<void> {
  const tasksJsonPath: string = path.join(vscodePath, tasksFileName);
  const tasksJsonContent = `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "generateDebugSymbols",
      "command": "\${config:azureLogicAppsStandard.dotnetBinaryPath}",
      "args": [
        "\${input:getDebugSymbolDll}"
      ],
      "type": "process",
      "problemMatcher": "$msCompile"
    },
    {
      "type": "shell",
      "command": "\${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}",
      "args": [
        "host",
        "start"
      ],
      "options": {
        "env": {
          "PATH": "\${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\\\NodeJs;\${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\\\DotNetSDK;$env:PATH"
        }
      },
      "problemMatcher": "$func-watch",
      "isBackground": true,
      "label": "func: host start",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ],
  "inputs": [
    {
      "id": "getDebugSymbolDll",
      "type": "command",
      "command": "azureLogicAppsStandard.getDebugSymbolDll"
    }
  ]
}`;

  // if (await confirmOverwriteFile(context, tasksJsonPath)) {
  await fse.writeFile(tasksJsonPath, tasksJsonContent);
  // }
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

  const theseSettings: ISettingToAdd[] = [];

  if (myWebviewProjectContext.logicAppType === ProjectType.logicApp) {
    theseSettings.push({ key: deploySubpathSetting, value: '.' });
  }

  await writeSettingsJson(myWebviewProjectContext, theseSettings, vscodePath);
  await writeExtensionsJson(myWebviewProjectContext, vscodePath);
  await writeTasksJson(myWebviewProjectContext, vscodePath);
  await writeLaunchJson(
    myWebviewProjectContext,
    vscodePath,
    myWebviewProjectContext.logicAppName,
    myWebviewProjectContext.targetFramework as TargetFramework
  );
}
