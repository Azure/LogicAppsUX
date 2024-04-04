/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  hostFileName,
  azureWebJobsStorageKey,
  localSettingsFileName,
  workflowFileName,
  workflowType,
  localEmulatorConnectionString,
  extensionBundleId,
  defaultVersionRange,
} from '../../../../constants';
import { localize } from '../../../../localize';
import { setLocalAppSetting } from '../../../utils/appSettings/localSettings';
import {
  addFolderToBuildPath,
  addNugetPackagesToBuildFile,
  getDotnetBuildFile,
  suppressJavaScriptBuildWarnings,
  updateFunctionsSDKVersion,
  writeBuildFileToDisk,
} from '../../../utils/codeless/updateBuildFile';
import { getFramework, validateDotnetInstalled } from '../../../utils/dotnet/executeDotnetTemplateCommand';
import { writeFormattedJson } from '../../../utils/fs';
import { parseJson } from '../../../utils/parseJson';
import { WorkflowCreateStepBase } from './WorkflowCreateStepBase';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses, nonNullProp, parseError } from '@microsoft/vscode-azext-utils';
import { WorkflowProjectType, MismatchBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { IFunctionWizardContext, IWorkflowTemplate, IHostJsonV2, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';

export class CodelessWorkflowCreateStep extends WorkflowCreateStepBase<IFunctionWizardContext> {
  private constructor() {
    super();
  }

  public static async createStep(context: IActionContext): Promise<CodelessWorkflowCreateStep> {
    await validateDotnetInstalled(context);
    return new CodelessWorkflowCreateStep();
  }

  public async executeCore(context: IFunctionWizardContext): Promise<string> {
    const template: IWorkflowTemplate = nonNullProp(context, 'functionTemplate');
    const functionPath: string = path.join(context.projectPath, nonNullProp(context, 'functionName'));

    const emptyStatefulDefinition: StandardApp = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {},
        contentVersion: '1.0.0.0',
        outputs: {},
        triggers: {},
      },
      kind: 'Stateful',
    };

    const emptyStatelessDefinition: StandardApp = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {},
        contentVersion: '1.0.0.0',
        outputs: {},
        triggers: {},
      },
      kind: 'Stateless',
    };

    const codelessDefinition: StandardApp = template?.id === workflowType.stateful ? emptyStatefulDefinition : emptyStatelessDefinition;

    const workflowJsonFullPath: string = path.join(functionPath, workflowFileName);

    await fse.ensureDir(functionPath);
    await writeFormattedJson(workflowJsonFullPath, codelessDefinition);

    await this.createSystemArtifacts(context);

    const workflowName = nonNullProp(context, 'functionName');

    if (nonNullProp(context, 'workflowProjectType') === WorkflowProjectType.Nuget) {
      let xmlBuildFile: any = await getDotnetBuildFile(context, context.projectPath);
      const dotnetVersion = await getFramework(context, functionPath);

      xmlBuildFile = JSON.parse(xmlBuildFile);
      xmlBuildFile = addFolderToBuildPath(xmlBuildFile, workflowName);
      xmlBuildFile = addNugetPackagesToBuildFile(xmlBuildFile);
      xmlBuildFile = suppressJavaScriptBuildWarnings(xmlBuildFile);
      xmlBuildFile = updateFunctionsSDKVersion(xmlBuildFile, dotnetVersion);

      await writeBuildFileToDisk(context, xmlBuildFile, context.projectPath);
    }

    return workflowJsonFullPath;
  }

  private async createSystemArtifacts(context: IFunctionWizardContext): Promise<void> {
    const hostJsonPath: string = path.join(context.projectPath, hostFileName);
    let hostJson: IHostJsonV2 = await this.getHostJson(context, hostJsonPath);
    let hostJsonUpdated = false;

    if (
      nonNullProp(context, 'workflowProjectType') === WorkflowProjectType.Bundle &&
      (hostJson.extensionBundle === undefined ||
        hostJson.extensionBundle.id !== extensionBundleId ||
        hostJson.extensionBundle.version !== defaultVersionRange)
    ) {
      hostJson = {
        ...hostJson,
        extensionBundle: {
          id: extensionBundleId,
          version: defaultVersionRange,
        },
      };
      hostJsonUpdated = true;
    }

    if (hostJsonUpdated) {
      await writeFormattedJson(hostJsonPath, hostJson);
    }
    await setLocalAppSetting(
      context,
      context.projectPath,
      azureWebJobsStorageKey,
      localEmulatorConnectionString,
      MismatchBehavior.Overwrite
    );
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
      if (/[^\s]/.test(data)) {
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
