/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { func, hostStartCommand, funcWatchProblemMatcher, dotnetPublishTaskLabel } from '../../../constants';
import { localize } from '../../../localize';
import { getDotnetDebugSubpath, getProjFiles, getTargetFramework, tryGetFuncVersion } from '../../utils/dotnet/dotnet';
import { tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { InitVSCodeStepBase } from './InitVSCodeStepBase';
import { AzExtFsExtra, DialogResponses, nonNullProp, openUrl, parseError } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension';
import * as path from 'path';
import type { DebugConfiguration, MessageItem, TaskDefinition } from 'vscode';

export class ProjectFile {
  public name: string;
  public fullPath: string;
  // We likely need to check a few things in quick succession, so we'll cache the contents here
  private _cachedContents: string | undefined;
  constructor(name: string, projectPath: string) {
    this.name = name;
    this.fullPath = path.join(projectPath, name);
  }

  public async getContents(): Promise<string> {
    if (this._cachedContents === undefined) {
      this._cachedContents = await AzExtFsExtra.readFile(this.fullPath);
    }
    return this._cachedContents;
  }
}

export class DotnetInitVSCodeStep extends InitVSCodeStepBase {
  protected preDeployTask: string = dotnetPublishTaskLabel;

  private _debugSubpath: string;

  protected getDebugConfiguration(version: FuncVersion): DebugConfiguration {
    return {
      name: localize('attachToNetFunc', 'Attach to .NET Functions'),
      type: version === FuncVersion.v1 ? 'clr' : 'coreclr',
      request: 'attach',
      processId: '{command:azureLogicAppsStandard.pickProcess}',
    };
  }

  protected getRecommendedExtensions(language: ProjectLanguage): string[] {
    // The csharp extension is really a 'dotnet' extension because it provides debugging for both
    const recs: string[] = ['ms-dotnettools.csharp'];
    if (language === ProjectLanguage.FSharp) {
      recs.push('ionide.ionide-fsharp');
    }
    return recs;
  }

  /**
   * Detects the version based on the targetFramework from the proj file
   * Also performs a few validations and sets a few properties based on that targetFramework
   */
  /* eslint-disable no-param-reassign */
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
    // tslint:disable-next-line: strict-boolean-expressions
    context.version = tryParseFuncVersion(versionInProjFile) || context.version;

    if (context.version === FuncVersion.v1) {
      const settingKey = 'show64BitWarning';
      if (getWorkspaceSetting<boolean>(settingKey)) {
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
            await updateGlobalSetting(settingKey, false);
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
    this._debugSubpath = getDotnetDebugSubpath(targetFramework);
  }
  /* eslint-enable no-param-reassign */

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
          cwd: this._debugSubpath,
        },
        command: hostStartCommand,
        isBackground: true,
        problemMatcher: funcWatchProblemMatcher,
      },
    ];
  }
}
