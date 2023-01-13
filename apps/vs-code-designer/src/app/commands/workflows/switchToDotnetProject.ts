/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { connectionsFileName, funcIgnoreFileName, funcVersionSetting, hostFileName, localSettingsFileName } from '../../../constants';
import { localize } from '../../../localize';
import { initProjectForVSCode } from '../../commands/initProjectForVSCode/initProjectForVSCode';
import { DotnetTemplateProvider } from '../../templates/dotnet/DotnetTemplateProvider';
import {
  getDotnetBuildFile,
  addNugetPackagesToBuildFile,
  suppressJavaScriptBuildWarnings,
  updateFunctionsSDKVersion,
  addFolderToBuildPath,
  writeBuildFileToDisk,
  addFileToBuildPath,
} from '../../utils/codeless/updateBuildFile';
import { getProjFiles, getTemplateKeyFromProjFile } from '../../utils/dotnet/dotnet';
import { validateDotnetInstalled, getFramework, executeDotnetTemplateCommand } from '../../utils/dotnet/executeDotnetTemplateCommand';
import { wrapArgInQuotes } from '../../utils/funcCoreTools/cpUtils';
import { tryGetMajorVersion, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { getContainingWorkspace } from '../../utils/workspace';
import { DotnetInitVSCodeStep } from '../initProjectForVSCode/DotnetInitVSCodeStep';
import { DialogResponses, nonNullOrEmptyValue } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext, FuncVersion, ITemplates } from '@microsoft/vscode-extension';
import { ProjectLanguage } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

export async function switchToDotnetProject(context: IProjectWizardContext, target: vscode.Uri) {
  await validateDotnetInstalled(context);
  let version: FuncVersion | undefined = tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, target.fsPath));

  const projectFiles = await getProjFiles(context, ProjectLanguage.CSharp, target.fsPath);
  if (projectFiles.length > 0) {
    vscode.window.showInformationMessage(
      localize('moveToDotnetCompleted', 'The Logic App project is already a NuGet-based project.'),
      'OK'
    );
    return;
  }

  if (!version) {
    const message: string = localize('initFolder', 'Initialize project for use with VS Code?');
    await context.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes);
    await initProjectForVSCode(context, target.fsPath);

    version = nonNullOrEmptyValue(
      tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, target.fsPath)),
      funcVersionSetting
    ) as FuncVersion;
  }

  const dotnetTemplateProvider = new DotnetTemplateProvider(version, target.fsPath);

  // We need to get the templates first to ensure that the we can create the dotnet project
  // 1. try to get cached templates
  let templates: ITemplates | undefined = await dotnetTemplateProvider.getCachedTemplates(context);

  // 2. try to download the latest templates
  if (!templates) {
    const templateVersion: string = await dotnetTemplateProvider.getLatestTemplateVersion(context);
    templates = await dotnetTemplateProvider.getLatestTemplates(context, templateVersion);
  }

  // 3. try to get the backup templates
  if (!templates) {
    templates = await dotnetTemplateProvider.getBackupTemplates(context);
  }

  if (!templates) {
    throw new Error(localize('dotnetTemplateError', 'Dotnet templates could not be found.'));
  }

  const warning: string = localize(
    'confirmMoveToDotnet',
    'This action moves your Logic App project to a NuGet-based project. Confirm that you want to move to a NuGet-based project?'
  );

  const moveButton: vscode.MessageItem = { title: localize('move', 'Move to a NuGet-based project') };
  await context.ui.showWarningMessage(warning, { modal: true }, moveButton, DialogResponses.cancel);

  const projectName: string = path.basename(target.fsPath);
  const templateLanguage = 'CSharp';
  const majorVersion: string = tryGetMajorVersion(version);
  const identity = `Microsoft.AzureFunctions.ProjectTemplate.${templateLanguage}.${parseInt(majorVersion) < 4 ? majorVersion : 3}.x`;
  const functionsVersion: string = 'v' + majorVersion;
  const projectPath: string = target.fsPath;
  const projTemplateKey = await getTemplateKeyFromProjFile(context, projectPath, version, ProjectLanguage.CSharp);
  const dotnetVersion = await getFramework(context, projectPath);

  await deleteBundleProjectFiles(target);
  await renameBundleProjectFiles(target);

  await executeDotnetTemplateCommand(
    context,
    version,
    projTemplateKey,
    target.fsPath,
    'create',
    '--identity',
    identity,
    '--arg:name',
    wrapArgInQuotes(projectName),
    '--arg:AzureFunctionsVersion',
    functionsVersion
  );

  await copyBundleProjectFiles(target);
  await updateBuildFile(context, target, dotnetVersion);

  const workspaceFolder: vscode.WorkspaceFolder | undefined = getContainingWorkspace(target.fsPath);

  const wizardOptions = {
    projectPath,
    workspaceFolder,
    workspacePath: (workspaceFolder && workspaceFolder.uri.fsPath) || target.fsPath,
    language: ProjectLanguage.CSharp,
    version,
  };
  const wizardContext: IProjectWizardContext = Object.assign(context, wizardOptions);

  const dotnetInitVSCodeStep = new DotnetInitVSCodeStep();
  dotnetInitVSCodeStep.execute(wizardContext);

  vscode.window.showInformationMessage(
    localize('moveToDotnetCompleted', 'Completed moving your Logic App project to a NuGet-based project.'),
    'OK'
  );
}

async function updateBuildFile(context: IActionContext, target: vscode.Uri, dotnetVersion: string) {
  const projectArtifacts = await getArtifactNamesFromProject(target);
  let xmlBuildFile: any = await getDotnetBuildFile(context, target.fsPath);
  xmlBuildFile = JSON.parse(xmlBuildFile);
  xmlBuildFile = addNugetPackagesToBuildFile(xmlBuildFile);
  xmlBuildFile = suppressJavaScriptBuildWarnings(xmlBuildFile);
  xmlBuildFile = updateFunctionsSDKVersion(xmlBuildFile, dotnetVersion);

  for (const workflowName of projectArtifacts['workflows']) {
    xmlBuildFile = addFolderToBuildPath(xmlBuildFile, workflowName);
  }

  for (const artifactFolder of projectArtifacts['artifacts']) {
    xmlBuildFile = addFolderToBuildPath(xmlBuildFile, artifactFolder);
  }

  for (const connectionFile of projectArtifacts['connections']) {
    xmlBuildFile = addFileToBuildPath(xmlBuildFile, connectionFile);
  }

  await writeBuildFileToDisk(context, xmlBuildFile, target.fsPath);
}

async function deleteBundleProjectFiles(target: vscode.Uri): Promise<void> {
  const filesTobeDeleted: string[] = [hostFileName, funcIgnoreFileName];
  for (const fileName of filesTobeDeleted) {
    if (await fse.pathExists(path.join(target.fsPath, fileName))) {
      await deleteFile(path.join(target.fsPath, fileName));
    }
  }
}

async function deleteFile(file: string): Promise<void> {
  await fse.unlink(file);
}

async function renameBundleProjectFiles(target: vscode.Uri): Promise<void> {
  const filesToBeRenamed: string[] = [localSettingsFileName];
  for (const fileName of filesToBeRenamed) {
    if (await fse.pathExists(path.join(target.fsPath, fileName))) {
      await renameFile(path.join(target.fsPath, fileName), path.join(target.fsPath, fileName + '-copy'));
    }
  }
}

async function renameFile(fileName: string, newFileName: string): Promise<void> {
  await fse.rename(fileName, newFileName);
}

async function copyBundleProjectFiles(target: vscode.Uri): Promise<void> {
  const filesToBeCopied: string[] = [localSettingsFileName];
  for (const fileName of filesToBeCopied) {
    if (
      (await fse.pathExists(path.join(target.fsPath, fileName))) &&
      (await fse.pathExists(path.join(target.fsPath, fileName + '-copy')))
    ) {
      await deleteFile(path.join(target.fsPath, fileName));
      await renameFile(path.join(target.fsPath, fileName + '-copy'), path.join(target.fsPath, fileName));
    }
  }
}

async function getArtifactNamesFromProject(target: vscode.Uri): Promise<{ [key: string]: string[] }> {
  const artifactDict: { [key: string]: string[] } = {
    workflows: [],
    connections: [],
    artifacts: [],
  };
  const files = await fse.readdir(target.fsPath);
  for (const file of files) {
    if (file == connectionsFileName) {
      artifactDict['connections'].push(connectionsFileName);
      continue;
    }

    if (file == 'Artifacts') {
      artifactDict['artifacts'].push(file);
      continue;
    }
    const filePath: string = path.join(target.fsPath, file);
    if (await (await fse.stat(filePath)).isDirectory()) {
      const workflowFiles: string[] = await fse.readdir(filePath);
      if (workflowFiles.length == 1 && workflowFiles[0] == 'workflow.json') {
        artifactDict['workflows'].push(file);
      }
    }
  }
  return artifactDict;
}
