/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  funcDependencyName,
  tasksFileName,
  launchFileName,
  settingsFileName,
  extensionsFileName,
  vscodeFolderName,
  designTimeDirectoryName,
} from '../../../constants';
import { localize } from '../../../localize';
import { binariesExistSync } from '../../utils/binaries';
import { detectCustomCodeTargetFramework } from '../../utils/customCodeUtils';
import { isSubpath, writeFormattedJson } from '../../utils/fs';
import { removeFromGitIgnore } from '../../utils/git';
import { generateTasksJson, generateLaunchJson, generateSettingsJson, generateExtensionsJson } from '../../utils/vsCodeConfig/generators';
import type { VSCodeProjectConfig } from '../../utils/vsCodeConfig/generators';
import { AzureWizardExecuteStep, DialogResponses, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext, ProjectLanguage, FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import { ProjectType, ProjectPackageType } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { getOrCreateDesignTimeDirectory } from '../../utils/codeless/startDesignTimeApi';

export abstract class InitProjectStepBase extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 20;

  protected abstract executeCore(context: IProjectWizardContext): Promise<void>;

  protected getRecommendedExtensions?(language: ProjectLanguage): string[];

  public shouldExecute(): boolean {
    return true;
  }

  public async execute(context: IProjectWizardContext): Promise<void> {
    await this.executeCore(context);

    const version: FuncVersion = nonNullProp(context, 'version');
    context.telemetry.properties.projectRuntime = version;

    const language: ProjectLanguage = nonNullProp(context, 'language');
    context.telemetry.properties.projectLanguage = language;

    context.telemetry.properties.isProjectInSubDir = String(isSubpath(context.workspacePath, context.projectPath));

    const vscodePath: string = path.join(context.projectPath, vscodeFolderName);
    await fse.ensureDir(vscodePath);

    const projectType = context.projectType ?? ProjectType.logicApp;
    const projectPackageType = context.projectPackageType ?? ProjectPackageType.Bundle;
    const customCodeTargetFramework = await detectCustomCodeTargetFramework(context.projectPath);
    const logicAppName = context.logicAppName || context.workspaceFolder?.name;

    const projectConfig: VSCodeProjectConfig = {
      projectType,
      projectPackageType,
      hasFuncBinaries: binariesExistSync(funcDependencyName),
      funcVersion: version,
      language,
      logicAppName,
      customCodeTargetFramework,
      targetFramework: context.targetFramework,
    };

    await this.writeVSCodeFiles(context, vscodePath, projectConfig);
    await getOrCreateDesignTimeDirectory(designTimeDirectoryName, context.projectPath);
    await removeFromGitIgnore(context.workspacePath, /^\.vscode(\/|\\)?\s*$/gm);
  }

  private async writeVSCodeFiles(context: IProjectWizardContext, vscodePath: string, projectConfig: VSCodeProjectConfig): Promise<void> {
    const tasksJsonPath = path.join(vscodePath, tasksFileName);
    const launchJsonPath = path.join(vscodePath, launchFileName);
    const settingsJsonPath = path.join(vscodePath, settingsFileName);
    const extensionsJsonPath = path.join(vscodePath, extensionsFileName);

    const hasExistingFiles =
      (await fse.pathExists(tasksJsonPath)) ||
      (await fse.pathExists(launchJsonPath)) ||
      (await fse.pathExists(settingsJsonPath)) ||
      (await fse.pathExists(extensionsJsonPath));

    if (hasExistingFiles) {
      const message = localize(
        'overwriteVSCodeFiles',
        'The .vscode configuration files will be regenerated to match the current project settings. This will overwrite any custom modifications. Continue?'
      );
      const result = await context.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes);
      if (result !== DialogResponses.yes) {
        return;
      }
    }

    const tasksContent = generateTasksJson(projectConfig);
    const launchContent = generateLaunchJson(projectConfig);
    const settingsContent = generateSettingsJson(projectConfig);
    const extensionsContent = generateExtensionsJson();

    await writeFormattedJson(tasksJsonPath, tasksContent);
    await writeFormattedJson(launchJsonPath, launchContent);
    await writeFormattedJson(settingsJsonPath, settingsContent);
    await writeFormattedJson(extensionsJsonPath, extensionsContent);
  }
}
