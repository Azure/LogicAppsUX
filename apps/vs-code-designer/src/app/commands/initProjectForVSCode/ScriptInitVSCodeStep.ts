/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extInstallTaskName, func, funcDependencyName, funcWatchProblemMatcher, hostStartCommand } from '../../../constants';
import { binariesExist } from '../../utils/binaries';
import { getLocalFuncCoreToolsVersion } from '../../utils/funcCoreTools/funcVersion';
import { InitVSCodeStepBase } from './InitVSCodeStepBase';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import type { TaskDefinition } from 'vscode';

/**
 * Base class for all projects based on a simple script (i.e. JavaScript, C# Script, Bash, etc.) that don't require compilation
 */
export class ScriptInitVSCodeStep extends InitVSCodeStepBase {
  protected useFuncExtensionsInstall = false;

  protected getTasks(): TaskDefinition[] {
    const funcBinariesExist = binariesExist(funcDependencyName);
    const binariesOptions = funcBinariesExist
      ? {
          options: {
            env: {
              PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\NodeJs;${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\DotNetSDK;$env:PATH',
            },
          },
        }
      : {};
    return [
      {
        label: 'func: host start',
        type: funcBinariesExist ? 'shell' : func,
        command: funcBinariesExist ? '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}' : hostStartCommand,
        args: funcBinariesExist ? ['host', 'start'] : undefined,
        ...binariesOptions,
        problemMatcher: funcWatchProblemMatcher,
        dependsOn: this.useFuncExtensionsInstall ? extInstallTaskName : undefined,
        isBackground: true,
      },
    ];
  }

  protected async executeCore(context: IProjectWizardContext): Promise<void> {
    try {
      const extensionsCsprojPath: string = path.join(context.projectPath, 'extensions.csproj');

      if (await fse.pathExists(extensionsCsprojPath)) {
        this.useFuncExtensionsInstall = true;
        context.telemetry.properties.hasExtensionsCsproj = 'true';
      } else if (context.version === FuncVersion.v2) {
        // no need to check v1 or v3+
        const currentVersion: string | null = await getLocalFuncCoreToolsVersion();
        // Starting after this version, projects can use extension bundle instead of running "func extensions install"
        this.useFuncExtensionsInstall = !!currentVersion && semver.lte(currentVersion, '2.5.553');
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

    await this.setDeploySubpath(context, '.');
  }
}
