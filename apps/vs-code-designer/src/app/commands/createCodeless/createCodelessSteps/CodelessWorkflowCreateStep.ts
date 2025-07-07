/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  hostFileName,
  azureWebJobsStorageKey,
  workflowFileName,
  localEmulatorConnectionString,
  extensionBundleId,
  defaultVersionRange,
  type WorkflowType,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
} from '../../../../constants';
import { setLocalAppSetting } from '../../../utils/appSettings/localSettings';
import { getCodelessWorkflowTemplate } from '../../../utils/codeless/templates';
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
import { WorkflowCreateStepBase } from './WorkflowCreateStepBase';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { nonNullProp } from '@microsoft/vscode-azext-utils';
import { WorkflowProjectType, MismatchBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { IFunctionWizardContext, IWorkflowTemplate, IHostJsonV2, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';

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

    const codelessDefinition: StandardApp = getCodelessWorkflowTemplate(template?.id as WorkflowType);

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
    await setLocalAppSetting(
      context,
      context.projectPath,
      functionsInprocNet8Enabled,
      functionsInprocNet8EnabledTrue,
      MismatchBehavior.Overwrite
    );
  }
}
