import {
  latestGAVersion,
  ProjectLanguage,
  ProjectType,
  TargetFramework,
  ProjectPackageType,
} from '@microsoft/vscode-extension-logic-apps';
import type { ILaunchJson, ISettingToAdd, IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import {
  deploySubpathSetting,
  dotnetExtensionId,
  devContainerFileName,
  devContainerFolderName,
  extensionCommand,
  extensionsFileName,
  funcDependencyName,
  funcVersionSetting,
  launchFileName,
  launchVersion,
  projectLanguageSetting,
  settingsFileName,
  tasksFileName,
  vscodeFolderName,
} from '../../../../constants';
import path from 'path';
import * as fse from 'fs-extra';
import type { DebugConfiguration } from 'vscode';
import { getContainerTemplatePath, getWorkspaceTemplatePath } from '../../../utils/assets';
import { confirmEditJsonFile } from '../../../utils/fs';
import { localize } from '../../../../localize';
import { ext } from '../../../../extensionVariables';
import { getCustomCodeRuntime } from '../../../utils/debug';
import { isDebugConfigEqual } from '../../../utils/vsCodeConfig/launch';
import { binariesExistSync } from '../../../utils/binaries';
import { generateTasksJson } from '../../../utils/vsCodeConfig/generators';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import {
  type CustomCodeFunctionsProjectMetadata,
  getCustomCodeFunctionsProjectMetadata,
  tryGetLogicAppCustomCodeFunctionsProjects,
} from '../../../utils/customCodeUtils';

export async function writeSettingsJson(
  context: IWebviewProjectContext,
  additionalSettings: ISettingToAdd[],
  vscodePath: string
): Promise<void> {
  const { targetFramework, logicAppType } = context;

  const settings: ISettingToAdd[] = [
    ...additionalSettings,
    { key: projectLanguageSetting, value: logicAppType === ProjectType.codeful ? ProjectLanguage.CSharp : ProjectLanguage.JavaScript },
    { key: funcVersionSetting, value: latestGAVersion },
    // We want the terminal to open after F5, not the debug console because HTTP triggers are printed in the terminal.
    { prefix: 'debug', key: 'internalConsoleOptions', value: 'neverOpen' },
    { prefix: 'azureFunctions', key: 'suppressProject', value: true },
  ];

  const settingsJsonPath: string = path.join(vscodePath, settingsFileName);

  if (logicAppType === ProjectType.codeful) {
    const deploySubPathValue = path.posix.join('bin', 'Release', targetFramework ?? TargetFramework.NetFx, 'publish');
    settings.push(
      { prefix: 'azureFunctions', key: 'deploySubpath', value: deploySubPathValue },
      { prefix: 'azureFunctions', key: 'preDeployTask', value: 'publish' },
      { prefix: 'azureFunctions', key: 'projectSubpath', value: deploySubPathValue },
      // Prevent OmniSharp from generating invalid solution files
      { prefix: 'omnisharp', key: 'enableMsBuildLoadProjectsOnDemand', value: false },
      { prefix: 'omnisharp', key: 'disableMSBuildDiagnosticWarning', value: true }
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
  const templatePath = getWorkspaceTemplatePath(extensionsJsonFile);
  const templateContent = await fse.readFile(templatePath, 'utf-8');
  const extensionsData = JSON.parse(templateContent);

  if (logicAppType !== ProjectType.logicApp) {
    extensionsData.recommendations = [...(extensionsData.recommendations || []), ...[dotnetExtensionId]];
  }

  await fse.writeJson(extensionsJsonPath, extensionsData, { spaces: 2 });
}

export async function writeTasksJson(context: IWebviewProjectContext, vscodePath: string): Promise<void> {
  const { targetFramework, logicAppType } = context;
  const tasksJsonPath: string = path.join(vscodePath, tasksFileName);

  const projectPackageType = logicAppType === ProjectType.codeful
    ? ProjectPackageType.Nuget
    : ProjectPackageType.Bundle;
  
  const tasksJsonContent = generateTasksJson({
    projectType: logicAppType,
    projectPackageType: projectPackageType,
    hasFuncBinaries: binariesExistSync(funcDependencyName),
    targetFramework,
    isDevContainer: context.isDevContainerProject,
  });

  await fse.writeJson(tasksJsonPath, tasksJsonContent, { spaces: 2 });
}

export async function writeDevContainerJson(devContainerPath: string): Promise<void> {
  const devContainerJsonPath: string = path.join(devContainerPath, devContainerFileName);
  const templatePath = getContainerTemplatePath(devContainerFileName);
  await fse.copyFile(templatePath, devContainerJsonPath);
}

export function getDebugConfiguration(
  logicAppName: string,
  customCodeTargetFramework?: TargetFramework,
  isCodeful?: boolean
): DebugConfiguration {
  // NOTE(aeldridge): Only use logicapp debug configuration for custom code and codeful projects for now. Simple attach is sufficient for codeless non-custom code.
  if (isCodeful) {
    return {
      name: localize('debugLogicApp', `Run/Debug logic app ${logicAppName}`),
      type: 'logicapp',
      request: 'launch',
      funcRuntime: 'coreclr',
      isCodeless: false,
    };
  }

  if (customCodeTargetFramework) {
    return {
      name: localize('debugLogicApp', `Run/Debug logic app with local function ${logicAppName}`),
      type: 'logicapp',
      request: 'launch',
      funcRuntime: 'coreclr',
      customCodeRuntime: getCustomCodeRuntime(customCodeTargetFramework),
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

export async function writeLaunchJson(context: IWebviewProjectContext, vscodePath: string, logicAppName: string): Promise<void> {
  const customCodeTargetFramework =
    context.logicAppType === ProjectType.customCode || context.logicAppType === ProjectType.rulesEngine
      ? (context.targetFramework ?? (await tryGetCustomCodeTargetFramework(context)))
      : undefined;
  const isCodeful = context.logicAppType === ProjectType.codeful;
  const newDebugConfig: DebugConfiguration = getDebugConfiguration(logicAppName, customCodeTargetFramework, isCodeful);

  // otherwise manually edit json
  const launchJsonPath: string = path.join(vscodePath, launchFileName);
  await confirmEditJsonFile(context, launchJsonPath, (data: ILaunchJson): ILaunchJson => {
    data.version = launchVersion;
    data.configurations = insertLaunchConfig(data.configurations, newDebugConfig);
    return data;
  });
}

async function tryGetCustomCodeTargetFramework(context: IWebviewProjectContext): Promise<TargetFramework | undefined> {
  const workspaceFolder = path.join(context.workspaceProjectPath.fsPath, context.workspaceName);
  const logicAppFolderPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  const customCodeProjectPaths = await tryGetLogicAppCustomCodeFunctionsProjects(logicAppFolderPath);
  let customCodeProjectsMetadata: CustomCodeFunctionsProjectMetadata[];
  if (customCodeProjectPaths && customCodeProjectPaths.length > 0) {
    customCodeProjectsMetadata = await Promise.all(customCodeProjectPaths.map(getCustomCodeFunctionsProjectMetadata));
  }
  // Currently only support one custom code functions project per logic app
  return customCodeProjectsMetadata ? customCodeProjectsMetadata[0].targetFramework : undefined;
}

export function insertLaunchConfig(existingConfigs: DebugConfiguration[] | undefined, newConfig: DebugConfiguration): DebugConfiguration[] {
  const configs = (existingConfigs ?? []).filter((existingConfig) => !isDebugConfigEqual(existingConfig, newConfig));
  return [...configs, newConfig];
}

export async function createLogicAppVsCodeContents(webviewProjectContext: IWebviewProjectContext, logicAppFolderPath: string) {
  const { logicAppType, logicAppName } = webviewProjectContext;
  const vscodePath: string = path.join(logicAppFolderPath, vscodeFolderName);
  await fse.ensureDir(vscodePath);

  const additionalSettings: ISettingToAdd[] = [];

  if (logicAppType === ProjectType.logicApp) {
    additionalSettings.push({ key: deploySubpathSetting, value: '.' });
  }

  await writeSettingsJson(webviewProjectContext, additionalSettings, vscodePath);
  await writeExtensionsJson(webviewProjectContext, vscodePath);
  await writeTasksJson(webviewProjectContext, vscodePath);
  await writeLaunchJson(webviewProjectContext, vscodePath, logicAppName);
}

export async function createDevContainerContents(webviewProjectContext: IWebviewProjectContext, workspaceFolder: string): Promise<void> {
  if (webviewProjectContext.isDevContainerProject) {
    const devContainerPath: string = path.join(workspaceFolder, devContainerFolderName);
    await fse.ensureDir(devContainerPath);
    await writeDevContainerJson(devContainerPath);
  }
}
