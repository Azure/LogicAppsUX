/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  dotnetExtensionId,
  dotnetPublishTaskLabel,
  func,
  funcWatchProblemMatcher,
  hostStartCommand,
  show64BitWarningSetting,
} from '../../../constants';
import { localize } from '../../../localize';
import { getProjFiles, getTargetFramework, getDotnetDebugSubpath, tryGetFuncVersion } from '../../utils/dotnet/dotnet';
import type { ProjectFile } from '../../utils/dotnet/dotnet';
import { tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { InitVSCodeStepBase } from './InitVSCodeStepBase';
import { DialogResponses, nonNullProp, openUrl, parseError } from '@microsoft/vscode-azext-utils';
import { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as path from 'path';
import type { MessageItem, TaskDefinition } from 'vscode';

export class DotnetInitVSCodeStep extends InitVSCodeStepBase {
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

    if (context.version === FuncVersion.v1) {
      if (getWorkspaceSetting<boolean>(show64BitWarningSetting)) {
        const message: string = localize(
          '64BitWarning',
          'In order to debug .NET Framework functions in VS Code, you must install a 64-bit version of the Azure Functions Core Tools.'
        );

        try {
          const result: MessageItem = await context.ui.showWarningMessage(
            message,
            DialogResponses.learnMore,
            DialogResponses.dontWarnAgain
          );

          if (result === DialogResponses.learnMore) {
            await openUrl('https://aka.ms/azFunc64bit');
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(show64BitWarningSetting, false);
          }
        } catch (err) {
          // swallow cancellations (aka if they clicked the 'x' button to dismiss the warning) and proceed to create project
          if (!parseError(err).isUserCancelledError) {
            throw err;
          }
        }
      }
    }

    const targetFramework: string = await getTargetFramework(projFile);
    this.setDeploySubpath(context, `bin/Release/${targetFramework}/publish`);
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
        type: func,
        dependsOn: 'build',
        options: {
          cwd: this.debugSubpath,
        },
        command: hostStartCommand,
        isBackground: true,
        problemMatcher: funcWatchProblemMatcher,
      },
    ];
  }
}
