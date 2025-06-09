/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { nonNullProp } from '@microsoft/vscode-azext-utils';
import { WorkflowProjectType, MismatchBehavior, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { FuncVersion, IFunctionWizardContext, IHostJsonV2, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { writeFileSync } from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { WorkflowCreateStepBase } from '../createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { getCodefulWorkflowTemplate } from '../../utils/codeless/templates';
import { writeFormattedJson } from '../../utils/fs';
import {
  hostFileName,
  extensionBundleId,
  defaultVersionRange,
  azureWebJobsStorageKey,
  localEmulatorConnectionString,
  workerRuntimeKey,
  functionsInprocNet8Enabled,
  codefulWorkflowFileName,
  appKindSetting,
  logicAppKind,
  functionsInprocNet8EnabledTrue,
  extensionCommand,
  launchFileName,
  vscodeFolderName,
} from '../../../constants';
import { removeAppKindFromLocalSettings, setLocalAppSetting } from '../../utils/appSettings/localSettings';
import { validateDotnetInstalled } from '../../utils/dotnet/executeDotnetTemplateCommand';
import { switchToDotnetProject } from '../workflows/switchToDotnetProject';
import * as vscode from 'vscode';
import { createConnectionsJson } from '../../utils/codeless/connection';
import { createEmptyParametersJson } from '../../utils/codeless/parameter';
import { getDebugConfigs, updateDebugConfigs } from '../../utils/vsCodeConfig/launch';
import { isMultiRootWorkspace } from '../../utils/workspace';

export class CodefulWorkflowCreateStep extends WorkflowCreateStepBase<IFunctionWizardContext> {
  private constructor() {
    super();
  }

  public static async createStep(_context: IActionContext): Promise<CodefulWorkflowCreateStep> {
    return new CodefulWorkflowCreateStep();
  }

  public async executeCore(context: IFunctionWizardContext): Promise<string> {
    await validateDotnetInstalled(context);
    const logicAppName = context.logicAppName || 'LogicApp';
    const functionPath: string = path.join(context.projectPath, nonNullProp(context, 'functionName'));

    const codelessDefinition: string = await getCodefulWorkflowTemplate();

    const workflowCsFullPath: string = path.join(functionPath, codefulWorkflowFileName);

    await fse.ensureDir(functionPath);
    await fse.writeFile(workflowCsFullPath, codelessDefinition);

    await createConnectionsJson(context.projectPath);
    await createEmptyParametersJson(context.projectPath);
    addNugetConfig(context.projectPath);

    await this.createSystemArtifacts(context);

    await this.updateLogicAppLaunchJson(
      context.projectPath,
      context.targetFramework,
      context.workspaceFolder,
      FuncVersion.v4,
      logicAppName
    );

    return workflowCsFullPath;
  }

  /**
   * Updates the launch.json file for the logic app corresponding to this functions app.
   * @param folderPath The functions app folder path.
   * @param targetFramework The target framework of the functions app.
   * @param funcVersion The version of the functions app.
   * @param logicAppName The name of the logic app.
   */
  private async updateLogicAppLaunchJson(
    folderPath: string,
    targetFramework: TargetFramework,
    workspaceFolder: vscode.WorkspaceFolder | undefined,
    funcVersion: FuncVersion,
    logicAppName: string
  ): Promise<void> {
    const logicAppLaunchJsonPath = path.join(folderPath, vscodeFolderName, launchFileName);
    const debugConfigs = getDebugConfigs(workspaceFolder);
    const updatedDebugConfigs = debugConfigs.some((debugConfig) => debugConfig.type === 'logicapp')
      ? debugConfigs.map((debugConfig) => {
          // Update the logic app debug configuration to use the correct runtime for custom code
          if (debugConfig.type === 'logicapp') {
            return {
              ...debugConfig,
              customCodeRuntime: 'coreclr',
              funcRuntime: 'coreclr',
            };
          }
          return debugConfig;
        })
      : [
          {
            name: logicAppName, //localize('debugLogicApp', `Run/Debug logic app with local function ${logicAppName}`),
            type: 'logicapp',
            request: 'launch',
            funcRuntime: 'coreclr',
            customCodeRuntime: 'coreclr',
          },
          ...debugConfigs.filter(
            (debugConfig) => debugConfig.request !== 'attach' || debugConfig.processId !== `\${command:${extensionCommand.pickProcess}}`
          ),
        ];

    if (isMultiRootWorkspace()) {
      let launchJsonContent: any;
      if (await fse.pathExists(logicAppLaunchJsonPath)) {
        launchJsonContent = await fse.readJson(logicAppLaunchJsonPath);
        launchJsonContent['configurations'] = updatedDebugConfigs;
      } else {
        launchJsonContent = {
          version: '0.2.0',
          configurations: updatedDebugConfigs,
        };
      }
      await fse.writeJson(logicAppLaunchJsonPath, launchJsonContent, { spaces: 2 });
    } else {
      updateDebugConfigs(workspaceFolder, updatedDebugConfigs);
    }
  }

  // this will change when we support extension bundles
  private async updateHostJson(context: IFunctionWizardContext, hostFileName: string): Promise<void> {
    const hostJsonPath: string = path.join(context.projectPath, hostFileName);
    let hostJson: IHostJsonV2 = await this.getHostJson(context, hostJsonPath);
    let hostJsonUpdated = false;

    hostJsonUpdated = true;

    if (
      // keeping for later when codeful supports extension bundles
      nonNullProp(context, 'workflowProjectType') === WorkflowProjectType.Bundle &&
      (hostJson.extensionBundle === undefined ||
        hostJson.extensionBundle.id !== extensionBundleId ||
        hostJson.extensionBundle.version !== defaultVersionRange)
    ) {
      hostJson = {
        ...hostJson,
      };
      hostJsonUpdated = true;
    }

    hostJson.extensionBundle = undefined;

    if (hostJsonUpdated) {
      await writeFormattedJson(hostJsonPath, hostJson);
    }
  }

  public async updateAppSettings(context: IFunctionWizardContext): Promise<void> {
    await setLocalAppSetting(context, context.projectPath, workerRuntimeKey, WorkerRuntime.Dotnet, MismatchBehavior.Overwrite);
    await setLocalAppSetting(
      context,
      context.projectPath,
      functionsInprocNet8Enabled,
      functionsInprocNet8EnabledTrue,
      MismatchBehavior.Overwrite
    );
    await setLocalAppSetting(context, context.projectPath, appKindSetting, logicAppKind, MismatchBehavior.Overwrite);
    await setLocalAppSetting(
      context,
      context.projectPath,
      azureWebJobsStorageKey,
      localEmulatorConnectionString,
      MismatchBehavior.Overwrite
    );
    await removeAppKindFromLocalSettings(context.projectPath, context);
  }

  public async createSystemArtifacts(context: IFunctionWizardContext): Promise<void> {
    const target = vscode.Uri.file(context.projectPath);

    await switchToDotnetProject(context, target, '8', true);

    await this.updateHostJson(context, hostFileName);

    await this.updateAppSettings(context);
  }
}

// temporarily add nuget.config until we publish codeful packages
const addNugetConfig = (projectPath: string) => {
  const getNugetConfigTemplate = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="LocalPackages" value="C:\\dev\\.packages"/>
  </packageSources>
  <packageManagement>
    <add key="format" value="0" />
    <add key="disabled" value="False" />
  </packageManagement>
</configuration>`;
  const nugetConfigPath: string = path.join(projectPath, 'nuget.config');

  writeFileSync(nugetConfigPath, getNugetConfigTemplate);
};
