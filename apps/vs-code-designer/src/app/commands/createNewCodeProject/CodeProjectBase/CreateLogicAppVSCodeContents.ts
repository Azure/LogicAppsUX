import { latestGAVersion, ProjectLanguage, ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { ILaunchJson, ISettingToAdd, IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import {
  assetsFolderName,
  deploySubpathSetting,
  dotnetExtensionId,
  dotnetPublishTaskLabel,
  extensionCommand,
  extensionsFileName,
  func,
  funcDependencyName,
  funcVersionSetting,
  funcWatchProblemMatcher,
  hostStartCommand,
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
import { binariesExist } from '../../../utils/binaries';

async function writeSettingsJson(context: IWebviewProjectContext, additionalSettings: ISettingToAdd[], vscodePath: string): Promise<void> {
  const { targetFramework, logicAppType } = context;

  const settings: ISettingToAdd[] = additionalSettings.concat(
    { key: projectLanguageSetting, value: logicAppType === ProjectType.agentCodeful ? ProjectLanguage.CSharp : ProjectLanguage.JavaScript },
    { key: funcVersionSetting, value: latestGAVersion },
    // We want the terminal to open after F5, not the debug console because HTTP triggers are printed in the terminal.
    { prefix: 'debug', key: 'internalConsoleOptions', value: 'neverOpen' },
    { prefix: 'azureFunctions', key: 'suppressProject', value: true }
  );

  const settingsJsonPath: string = path.join(vscodePath, settingsFileName);

  if (logicAppType === ProjectType.agentCodeful) {
    const deploySubPathValue = path.posix.join('bin', 'Release', targetFramework ?? TargetFramework.NetFx, 'publish');
    settings.push(
      { prefix: 'azureFunctions', key: 'deploySubpath', value: deploySubPathValue },
      { prefix: 'azureFunctions', key: 'preDeployTask', value: 'publish' },
      { prefix: 'azureFunctions', key: 'projectSubpath', value: deploySubPathValue }
    );
  }
  await confirmEditJsonFile(context, settingsJsonPath, (data: Record<string, any>): Record<string, any> => {
    for (const setting of settings) {
      const key = `${setting.prefix || ext.prefix}.${setting.key}`;
      data[key] = setting.value;
    }
    return data;
  });
}

export async function writeExtensionsJson(webviewProjectContext: IWebviewProjectContext, vscodePath: string): Promise<void> {
  const { logicAppType } = webviewProjectContext;
  const extensionsJsonPath: string = path.join(vscodePath, extensionsFileName);
  const extensionsJsonFile = 'ExtensionsJsonFile';
  const templatePath = path.join(__dirname, assetsFolderName, workspaceTemplatesFolderName, extensionsJsonFile);

  // Read the template file
  const templateContent = await fse.readFile(templatePath, 'utf8');
  const extensionsData = JSON.parse(templateContent);

  if (logicAppType !== ProjectType.logicApp) {
    extensionsData.recommendations = [...(extensionsData.recommendations || []), ...[dotnetExtensionId]];
  }

  await fse.writeJson(extensionsJsonPath, extensionsData, { spaces: 2 });
}

const getAgentCodedulTasks = (targetFramework: string) => {
  const commonArgs: string[] = ['/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'];
  const releaseArgs: string[] = ['--configuration', 'Release'];
  const funcBinariesExist = binariesExist(funcDependencyName);
  const debugSubpath = path.posix.join('bin', 'Debug', targetFramework);
  const binariesOptions = funcBinariesExist
    ? {
        options: {
          cwd: debugSubpath,
          env: {
            PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\NodeJs;${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\DotNetSDK;$env:PATH',
          },
        },
      }
    : {};
  return [
    {
      label: 'clean',
      command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
      args: ['clean', ...commonArgs],
      type: 'process',
      problemMatcher: '$msCompile',
    },
    {
      label: 'build',
      command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
      args: ['build', ...commonArgs],
      type: 'process',
      dependsOn: 'clean',
      group: {
        kind: 'build',
        isDefault: true,
      },
      problemMatcher: '$msCompile',
    },
    {
      label: 'clean release',
      command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
      args: ['clean', ...releaseArgs, ...commonArgs],
      type: 'process',
      problemMatcher: '$msCompile',
    },
    {
      label: dotnetPublishTaskLabel,
      command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
      args: ['publish', ...releaseArgs, ...commonArgs],
      type: 'process',
      dependsOn: 'clean release',
      problemMatcher: '$msCompile',
    },
    {
      label: 'func: host start',
      type: funcBinariesExist ? 'shell' : func,
      dependsOn: 'build',
      ...binariesOptions,
      command: funcBinariesExist ? '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}' : hostStartCommand,
      args: funcBinariesExist ? ['host', 'start'] : undefined,
      isBackground: true,
      problemMatcher: funcWatchProblemMatcher,
    },
  ];
};

async function writeTasksJson(context: IWebviewProjectContext, vscodePath: string) {
  const { targetFramework, logicAppType } = context;
  const tasksJsonPath: string = path.join(vscodePath, tasksFileName);
  const tasksJsonFile = 'TasksJsonFile';
  const templatePath = path.join(__dirname, assetsFolderName, workspaceTemplatesFolderName, tasksJsonFile);

  // Read the template file
  const templateContent = await fse.readFile(templatePath, 'utf8');
  const tasksData = JSON.parse(templateContent);

  if (logicAppType === ProjectType.agentCodeful && targetFramework) {
    // Get the agent codeful-specific tasks
    const agentCodefulTasks = getAgentCodedulTasks(targetFramework);

    // Replace tasks with agent codeful tasks
    tasksData.tasks = agentCodefulTasks;

    // Write the modified tasks.json file
    await fse.writeJson(tasksJsonPath, tasksData, { spaces: 2 });
  } else {
    // For non-agentCodeful projects, just copy the template
    await fse.copyFile(templatePath, tasksJsonPath);
  }
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

export async function createLogicAppVsCodeContents(webviewProjectContext: IWebviewProjectContext, logicAppFolderPath: string) {
  const { logicAppType, logicAppName, targetFramework } = webviewProjectContext;
  const vscodePath: string = path.join(logicAppFolderPath, vscodeFolderName);
  await fse.ensureDir(vscodePath);

  const additionalSettings: ISettingToAdd[] = [];

  if (logicAppType === ProjectType.logicApp) {
    additionalSettings.push({ key: deploySubpathSetting, value: '.' });
  }

  await writeSettingsJson(webviewProjectContext, additionalSettings, vscodePath);
  await writeExtensionsJson(webviewProjectContext, vscodePath);
  await writeTasksJson(webviewProjectContext, vscodePath);
  await writeLaunchJson(webviewProjectContext, vscodePath, logicAppName, targetFramework as TargetFramework);
}
