import { ProjectType, ProjectPackageType, type IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import {
  devContainerFileName,
  devContainerFolderName,
  extensionsFileName,
  funcDependencyName,
  launchFileName,
  settingsFileName,
  tasksFileName,
  vscodeFolderName,
} from '../../../../constants';
import path from 'path';
import * as fse from 'fs-extra';
import { getContainerTemplatePath } from '../../../utils/assets';
import { binariesExistSync } from '../../../utils/binaries';
import {
  generateTasksJson,
  generateLaunchJson,
  generateSettingsJson,
  generateExtensionsJson,
} from '../../../utils/vsCodeConfig/generators';
import { detectCustomCodeTargetFramework } from '../../../utils/customCodeUtils';

export async function createLogicAppVsCodeContents(webviewProjectContext: IWebviewProjectContext, logicAppFolderPath: string) {
  const { logicAppName } = webviewProjectContext;
  const vscodePath: string = path.join(logicAppFolderPath, vscodeFolderName);
  await fse.ensureDir(vscodePath);

  await writeSettingsJson(webviewProjectContext, vscodePath);
  await writeExtensionsJson(webviewProjectContext, vscodePath);
  await writeTasksJson(webviewProjectContext, vscodePath);
  await writeLaunchJson(webviewProjectContext, vscodePath, logicAppFolderPath, logicAppName);
}

export async function writeSettingsJson(context: IWebviewProjectContext, vscodePath: string): Promise<void> {
  const { targetFramework, logicAppType } = context;

  const projectPackageType = logicAppType === ProjectType.codeful ? ProjectPackageType.Nuget : ProjectPackageType.Bundle;
  const settingsContent = generateSettingsJson({
    projectType: logicAppType,
    projectPackageType,
    hasFuncBinaries: binariesExistSync(funcDependencyName),
    targetFramework,
  });

  const settingsJsonPath: string = path.join(vscodePath, settingsFileName);
  await fse.writeJson(settingsJsonPath, settingsContent, { spaces: 2 });
}

export async function writeExtensionsJson(webviewProjectContext: IWebviewProjectContext, vscodePath: string): Promise<void> {
  const extensionsJsonPath: string = path.join(vscodePath, extensionsFileName);
  const extensionsData = generateExtensionsJson();

  await fse.writeJson(extensionsJsonPath, extensionsData, { spaces: 2 });
}

export async function writeTasksJson(context: IWebviewProjectContext, vscodePath: string): Promise<void> {
  const { targetFramework, logicAppType } = context;
  const tasksJsonPath: string = path.join(vscodePath, tasksFileName);

  const projectPackageType = logicAppType === ProjectType.codeful ? ProjectPackageType.Nuget : ProjectPackageType.Bundle;

  const tasksJsonContent = generateTasksJson({
    projectType: logicAppType,
    projectPackageType: projectPackageType,
    hasFuncBinaries: binariesExistSync(funcDependencyName),
    targetFramework,
    isDevContainer: context.isDevContainerProject,
  });

  await fse.writeJson(tasksJsonPath, tasksJsonContent, { spaces: 2 });
}

export async function writeLaunchJson(
  context: IWebviewProjectContext,
  vscodePath: string,
  logicAppFolderPath: string,
  logicAppName: string
): Promise<void> {
  const customCodeTargetFramework =
    context.logicAppType === ProjectType.customCode || context.logicAppType === ProjectType.rulesEngine
      ? (context.targetFramework ?? (await detectCustomCodeTargetFramework(logicAppFolderPath)))
      : undefined;

  const launchContent = generateLaunchJson({
    projectType: context.logicAppType,
    projectPackageType: context.logicAppType === ProjectType.codeful ? ProjectPackageType.Nuget : ProjectPackageType.Bundle,
    hasFuncBinaries: binariesExistSync(funcDependencyName),
    customCodeTargetFramework,
    logicAppName,
  });

  const launchJsonPath: string = path.join(vscodePath, launchFileName);
  await fse.writeJson(launchJsonPath, launchContent, { spaces: 2 });
}

export async function createDevContainerContents(webviewProjectContext: IWebviewProjectContext, workspaceFolder: string): Promise<void> {
  if (webviewProjectContext.isDevContainerProject) {
    const devContainerPath: string = path.join(workspaceFolder, devContainerFolderName);
    await fse.ensureDir(devContainerPath);
    await writeDevContainerJson(devContainerPath);
  }
}

export async function writeDevContainerJson(devContainerPath: string): Promise<void> {
  const devContainerJsonPath: string = path.join(devContainerPath, devContainerFileName);
  const templatePath = getContainerTemplatePath(devContainerFileName);
  await fse.copyFile(templatePath, devContainerJsonPath);
}
