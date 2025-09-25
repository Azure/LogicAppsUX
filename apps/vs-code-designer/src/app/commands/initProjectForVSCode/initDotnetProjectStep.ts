/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnetPublishTaskLabel, dotnetExtensionId, funcWatchProblemMatcher } from '../../../constants';
import { localize } from '../../../localize';
import { getProjFiles, getTargetFramework, getDotnetDebugSubpath, tryGetFuncVersion } from '../../utils/dotnet/dotnet';
import type { ProjectFile } from '../../utils/dotnet/dotnet';
import { tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { InitProjectStepBase } from './initProjectStepBase';
import { nonNullProp } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import type { TaskDefinition } from 'vscode';

export class InitDotnetProjectStep extends InitProjectStepBase {
  protected preDeployTask: string = dotnetPublishTaskLabel;
  private debugSubpath: string;

  protected getRecommendedExtensions(language: ProjectLanguage): string[] {
    const recs: string[] = [dotnetExtensionId];
    if (language === ProjectLanguage.FSharp) {
      recs.push('ionide.ionide-fsharp');
    }
    return recs;
  }

  /**
   * Detects the version based on the targetFramework from the proj file
   * Also performs a few validations and sets a few properties based on that targetFramework
   */
  protected async executeCore(context: IProjectWizardContext): Promise<void> {
    const projectPath: string = context.projectPath;
    const language: ProjectLanguage = nonNullProp(context, 'language');

    let projFile: ProjectFile;
    const projFiles = await getProjFiles(context, language, projectPath);
    const fileExt: string = language === ProjectLanguage.FSharp ? 'fsproj' : 'csproj';

    if (projFiles.length === 1) {
      projFile = projFiles[0];
    } else if (projFiles.length === 0) {
      context.errorHandling.suppressReportIssue = true;
      throw new Error(localize('projNotFound', 'Failed to find {0} file in folder "{1}".', fileExt, path.basename(projectPath)));
    } else {
      context.errorHandling.suppressReportIssue = true;
      throw new Error(
        localize(
          'projNotFound',
          'Expected to find a single {0} file in folder "{1}", but found multiple instead: {2}.',
          fileExt,
          path.basename(projectPath),
          projFiles.join(', ')
        )
      );
    }

    const versionInProjFile: string | undefined = await tryGetFuncVersion(projFile);
    context.telemetry.properties.versionInProjFile = versionInProjFile;

    // The version from the proj file takes precedence over whatever was set in `context` before this
    context.version = tryParseFuncVersion(versionInProjFile) || context.version;
    const targetFramework: string = await getTargetFramework(projFile);
    await this.setDeploySubpath(context, path.posix.join('bin', 'Release', targetFramework, 'publish'));
    this.debugSubpath = getDotnetDebugSubpath(targetFramework);
  }

  protected getTasks(): TaskDefinition[] {
    const commonArgs: string[] = ['/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'];
    const releaseArgs: string[] = ['--configuration', 'Release'];
    return [
      {
        label: 'clean',
        command: 'dotnet',
        args: ['clean', ...commonArgs],
        type: 'process',
        problemMatcher: '$msCompile',
      },
      {
        label: 'build',
        command: 'dotnet',
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
        command: 'dotnet',
        args: ['clean', ...releaseArgs, ...commonArgs],
        type: 'process',
        problemMatcher: '$msCompile',
      },
      {
        label: dotnetPublishTaskLabel,
        command: 'dotnet',
        args: ['publish', ...releaseArgs, ...commonArgs],
        type: 'process',
        dependsOn: 'clean release',
        problemMatcher: '$msCompile',
      },
      {
        label: 'func: host start',
        type: 'shell',
        dependsOn: 'build',
        command: 'func',
        args: ['host', 'start'],
        isBackground: true,
        problemMatcher: funcWatchProblemMatcher,
      },
    ];
  }
}
