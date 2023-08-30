/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binariesExist } from '../../../../../../app/utils/binaries';
import { extInstallTaskName, func, funcDependencyName, funcWatchProblemMatcher, hostStartCommand } from '../../../../../../constants';
import { getLocalFuncCoreToolsVersion } from '../../../../../utils/funcCoreTools/funcVersion';
import { InitCodeProject } from './InitCodeProject';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { FuncVersion } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import type { TaskDefinition } from 'vscode';

/**
 * Base class for all projects based on a simple script (i.e. JavaScript, C# Script, Bash, etc.) that don't require compilation
 */
export class ScriptInit extends InitCodeProject {
  protected useFuncExtensionsInstall = false;

  protected getTasks(): TaskDefinition[] {
    const funcBinariesExist = binariesExist(funcDependencyName);
    return [
      {
        label: 'func: host start',
        type: funcBinariesExist ? 'shell' : func,
        command: funcBinariesExist ? '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}' : hostStartCommand,
        args: funcBinariesExist ? ['host', 'start'] : undefined,
        options: {
          env: {
            PATH: '${config:azureLogicAppsStandard.dependenciesPath}\\NodeJs;${config:azureLogicAppsStandard.dependenciesPath}\\DotNetSDK\\.dotnet;%PATH%",',
          },
        },
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
  }
}
