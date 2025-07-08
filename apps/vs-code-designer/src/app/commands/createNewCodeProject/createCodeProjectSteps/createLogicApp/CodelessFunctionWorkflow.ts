/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  hostFileName,
  azureWebJobsStorageKey,
  workflowFileName,
  WorkflowType,
  localEmulatorConnectionString,
  extensionBundleId,
  defaultVersionRange,
  functionsInprocNet8EnabledTrue,
  functionsInprocNet8Enabled,
} from '../../../../../constants';
import { setLocalAppSetting } from '../../../../utils/appSettings/localSettings';
import {
  addFolderToBuildPath,
  addNugetPackagesToBuildFile,
  getDotnetBuildFile,
  suppressJavaScriptBuildWarnings,
  updateFunctionsSDKVersion,
  writeBuildFileToDisk,
} from '../../../../utils/codeless/updateBuildFile';
import { getFramework } from '../../../../utils/dotnet/executeDotnetTemplateCommand';
import { writeFormattedJson } from '../../../../utils/fs';
import { WorkflowCreateStepBase } from '../../../createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { nonNullProp } from '@microsoft/vscode-azext-utils';
import { WorkflowProjectType, MismatchBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { IFunctionWizardContext, IWorkflowTemplate, IHostJsonV2, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { validateDotNetIsInstalled } from '../../../dotnet/validateDotNetInstalled';
import { getWorkflowTemplate } from '../../../../utils/codeless/templates';

// This class creates a new workflow for a codeless Azure Function project
export class CodelessFunctionWorkflow extends WorkflowCreateStepBase<IFunctionWizardContext> {
  // Private constructor to prevent direct instantiation of this class
  private constructor() {
    super();
  }

  // Static method that creates a new instance of the CodelessFunctionProjectWorkflowCreateStep class and returns it
  public static async createStep(context: IFunctionWizardContext): Promise<CodelessFunctionWorkflow> {
    // Ensure that the .NET Core SDK is installed on the user's machine
    const projectPath = nonNullProp(context, 'logicAppFolderPath');
    const isDotNetInstalled = await validateDotNetIsInstalled(context, projectPath);
    if (!isDotNetInstalled) {
      return;
    }
    return new CodelessFunctionWorkflow();
  }

  // Async method that creates a new workflow for the codeless Azure Function project
  public async executeCore(context: IFunctionWizardContext): Promise<string> {
    // Get the function template and function path from the IFunctionWizardContext object
    const template: IWorkflowTemplate = nonNullProp(context, 'functionTemplate');
    const functionPath: string = path.join(context.projectPath, nonNullProp(context, 'functionName'));

    // Determine which definition object to use based on the type of workflow template
    const codelessDefinition: StandardApp = getWorkflowTemplate(
      context.functionAppName,
      template?.id === WorkflowType.stateful,
      context.projectType
    );

    // Write the workflow definition to a JSON file
    const workflowJsonFullPath: string = path.join(functionPath, workflowFileName);
    await fse.ensureDir(functionPath);
    await writeFormattedJson(workflowJsonFullPath, codelessDefinition);

    // Create system artifacts such as the host.json file and the local emulator connection string
    await this.createSystemArtifacts(context);

    const workflowName = nonNullProp(context, 'functionName');

    // If the workflow project type is Nuget, update the .csproj file with the necessary settings
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

  // Private async method that creates the host.json file and sets the local emulator connection string
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
