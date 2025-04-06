/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses, nonNullProp, parseError } from '@microsoft/vscode-azext-utils';
import { WorkflowProjectType, MismatchBehavior, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { IFunctionWizardContext, IHostJsonV2 } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';
import { WorkflowCreateStepBase } from '../createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { getCodefulWorkflowTemplate } from '../../utils/codeless/templates';
//import { addFolderToBuildPath, addNugetPackagesToBuildFile, getDotnetBuildFile, suppressJavaScriptBuildWarnings, updateFunctionsSDKVersion, writeBuildFileToDisk } from '../../utils/codeless/updateBuildFile';
import { writeFormattedJson } from '../../utils/fs';
import { localize } from 'vscode-nls';
import { hostFileName, extensionBundleId, defaultVersionRange, azureWebJobsStorageKey, localEmulatorConnectionString, localSettingsFileName, workerRuntimeKey, functionsInprocNet8Enabled } from '../../../constants';
import { removeAppKindFromLocalSettings, setLocalAppSetting } from '../../utils/appSettings/localSettings';
import { validateDotnetInstalled } from '../../utils/dotnet/executeDotnetTemplateCommand';
import { parseJson } from '../../utils/parseJson';
import { switchToDotnetProject } from '../workflows/switchToDotnetProject';
import * as vscode from 'vscode';

export class CodefulWorkflowCreateStep extends WorkflowCreateStepBase<IFunctionWizardContext> {

  private constructor() {
    super();
  }

  public static async createStep(context: IActionContext): Promise<CodefulWorkflowCreateStep> {
    await validateDotnetInstalled(context);
    return new CodefulWorkflowCreateStep();
  }

  public async executeCore(context: IFunctionWizardContext): Promise<string> {
    const functionPath: string = path.join(context.projectPath, nonNullProp(context, 'functionName'));

    const codelessDefinition: string = await getCodefulWorkflowTemplate();

    const workflowCsFullPath: string = path.join(functionPath, 'workflow.cs');

    await fse.ensureDir(functionPath);
    await fse.writeFile(workflowCsFullPath, codelessDefinition);

    await this.createSystemArtifacts(context);

    return workflowCsFullPath;
  }

  private async createSystemArtifacts(context: IFunctionWizardContext): Promise<void> {
    const hostJsonPath: string = path.join(context.projectPath, hostFileName);
    let hostJson: IHostJsonV2 = await this.getHostJson(context, hostJsonPath);
    let hostJsonUpdated = false;

    const target = vscode.Uri.file(context.projectPath);

    await switchToDotnetProject(context, target, '8', true);

    hostJson.extensionBundle = undefined;
    hostJsonUpdated = true;

    if (
      nonNullProp(context, 'workflowProjectType') === WorkflowProjectType.Bundle &&
      (hostJson.extensionBundle === undefined ||
        hostJson.extensionBundle.id !== extensionBundleId ||
        hostJson.extensionBundle.version !== defaultVersionRange)
    ) {
      hostJson = {
        ...hostJson,
      };
      hostJson.extensionBundle = undefined;
      hostJsonUpdated = true;
    }

    if (hostJsonUpdated) {
      await writeFormattedJson(hostJsonPath, hostJson);
    }
    await setLocalAppSetting(
      context,
      context.projectPath,
      workerRuntimeKey,
      WorkerRuntime.Dotnet,
      MismatchBehavior.Overwrite
    );
    await setLocalAppSetting(
      context,
      context.projectPath,
      functionsInprocNet8Enabled,
      '1',
      MismatchBehavior.Overwrite
    );
    await setLocalAppSetting(
      context,
      context.projectPath,
      azureWebJobsStorageKey,
      localEmulatorConnectionString,
      MismatchBehavior.Overwrite
    );
    await removeAppKindFromLocalSettings(context.projectPath, context);
  }

  private async getHostJson(context: IFunctionWizardContext, hostJsonPath: string, allowOverwrite = false): Promise<IHostJsonV2> {
    return this.getJsonFromFile(context, hostJsonPath, { version: '2.0' }, allowOverwrite);
  }

  private async getJsonFromFile<T extends object>(
    context: IFunctionWizardContext,
    filePath: string,
    defaultValue: T,
    allowOverwrite = false
  ): Promise<T> {
    if (await fse.pathExists(filePath)) {
      const data: string = (await fse.readFile(filePath)).toString();
      if (emptyStringTest.test(data)) {
        try {
          return parseJson(data);
        } catch (error) {
          if (allowOverwrite) {
            const message: string = localize(
              'failedToParseWithOverwrite',
              'Failed to parse "{0}": {1}. Overwrite?',
              localSettingsFileName,
              parseError(error).message
            );
            const overwriteButton: MessageItem = { title: localize('overwrite', 'Overwrite') };
            // Overwrite is the only button and cancel automatically throws, so no need to check result
            await context.ui.showWarningMessage(message, { modal: true }, overwriteButton, DialogResponses.cancel);
          } else {
            const message: string = localize(
              'failedToParse',
              'Failed to parse "{0}": {1}.',
              localSettingsFileName,
              parseError(error).message
            );
            throw new Error(message);
          }
        }
      }
    }

    return defaultValue;
  }
}

const emptyStringTest = /[^\s]/;
