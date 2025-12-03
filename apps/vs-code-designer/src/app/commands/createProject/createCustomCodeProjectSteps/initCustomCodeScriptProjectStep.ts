/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extInstallTaskName, funcWatchProblemMatcher } from '../../../../constants';
import { InitCustomCodeProjectStepBase } from './initCustomCodeProjectStepBase';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { TaskDefinition } from 'vscode';

/**
 * Base class for all projects based on a simple script (i.e. JavaScript, C# Script, Bash, etc.) that don't require compilation
 */
export class InitCustomCodeScriptProjectStep extends InitCustomCodeProjectStepBase {
  protected useFuncExtensionsInstall = false;

  protected async executeCore(context: IProjectWizardContext): Promise<void> {
    try {
      const extensionsCsprojPath: string = path.join(context.projectPath, 'extensions.csproj');

      if (await fse.pathExists(extensionsCsprojPath)) {
        this.useFuncExtensionsInstall = true;
        context.telemetry.properties.hasExtensionsCsproj = 'true';
      }
    } catch {
      // use default of false
    }

    if (this.useFuncExtensionsInstall) {
      // "func extensions install" task creates C# build artifacts that should be hidden
      // See issue: https://github.com/Microsoft/vscode-azurefunctions/pull/699
      this.settings.push({ prefix: 'files', key: 'exclude', value: { obj: true, bin: true } });

      if (!this.preDeployTask) {
        this.preDeployTask = extInstallTaskName;
      }
    }
  }

  protected getTasks(): TaskDefinition[] {
    return [
      {
        label: 'func: host start',
        type: 'shell',
        command: 'func',
        args: ['host', 'start'],
        problemMatcher: funcWatchProblemMatcher,
        dependsOn: this.useFuncExtensionsInstall ? extInstallTaskName : undefined,
        isBackground: true,
      },
    ];
  }
}
