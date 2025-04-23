/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExistingWorkspaceStep } from '../createNewProject/createProjectSteps/ExistingWorkspaceStep';
import { isString } from '@microsoft/logic-apps-shared';
import { type IFunctionWizardContext, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { convertToWorkspace } from '../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { type IActionContext, AzureWizard, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../localize';
import { type Uri, window } from 'vscode';
import { FunctionNameStep } from './createCustomCodeFunctionSteps/FunctionNameStep';
import { FunctionFilesStep } from './createCustomCodeFunctionSteps/FunctionFilesStep';
import { getCustomCodeFunctionsProjectMetadata, isCustomCodeFunctionsProject } from '../../utils/customCodeUtils';

/**
 * Creates a new function in a custom code functions project.
 * @param context - The action context.
 * @param folderPath - The path to the functions app folder.
 * @returns
 */
export async function createCustomCodeFunctionFromCommand(context: IActionContext, folderPath?: Uri | string | undefined): Promise<void> {
  if (await convertToWorkspace(context)) {
    addLocalFuncTelemetry(context);

    const options = {
      folderPath: isString(folderPath) ? folderPath : folderPath !== undefined ? folderPath.fsPath : undefined,
    };

    // Init wizard context
    const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options);
    wizardContext.projectType = ProjectType.customCode;
    wizardContext.functionFolderPath = options.folderPath;
    wizardContext.isWorkspaceWithFunctions = true;

    // Check if the folder is a valid custom code functions project
    context.telemetry.properties.lastStep = 'isCustomCodeFunctionsProject';
    if (!options.folderPath || !(await isCustomCodeFunctionsProject(options.folderPath))) {
      const errorMessage = `The target folder ${options.folderPath} is not a valid custom code functions project.`;
      window.showErrorMessage(localize('azureLogicAppsStandard.invalidCustomCodeFunctionsProject', errorMessage));
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.error = errorMessage;
      return;
    }

    // Get the functions project metadata and verify that properties are valid
    context.telemetry.properties.lastStep = 'getCustomCodeFunctionsProjectMetadata';
    const functionsProjectMetadata = await getCustomCodeFunctionsProjectMetadata(options.folderPath);
    wizardContext.functionAppName = functionsProjectMetadata?.functionAppName;
    if (!wizardContext.functionAppName) {
      const errorMessage = `Could not resolve the function app name for the target folder ${options.folderPath}.`;
      window.showErrorMessage(localize('azureLogicAppsStandard.invalidFunctionAppName', errorMessage));
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.error = errorMessage;
      return;
    }
    wizardContext.logicAppName = functionsProjectMetadata?.logicAppName;
    if (!wizardContext.logicAppName) {
      const errorMessage = `Could not find a valid logic app reference in the target folder ${options.folderPath}.`;
      window.showErrorMessage(localize('azureLogicAppsStandard.invalidLogicAppReference', errorMessage));
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.error = errorMessage;
      return;
    }
    wizardContext.targetFramework = functionsProjectMetadata?.targetFramework;
    if (!wizardContext.targetFramework) {
      const errorMessage = `Could not find a valid target framework in the target folder ${options.folderPath}.`;
      window.showErrorMessage(localize('azureLogicAppsStandard.invalidTargetFramework', errorMessage));
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.error = errorMessage;
      return;
    }
    wizardContext.functionAppNamespace = functionsProjectMetadata?.namespace;
    if (!wizardContext.functionAppNamespace) {
      const errorMessage = `Could not find a valid function app namespace in the target folder ${options.folderPath}.`;
      window.showErrorMessage(localize('azureLogicAppsStandard.invalidFunctionAppNamespace', errorMessage));
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.error = errorMessage;
      return;
    }

    const title = 'createCustomCodeFunction';
    const message = 'Create new custom code function';
    const promptSteps = [new ExistingWorkspaceStep(), new FunctionNameStep(), new FunctionFilesStep()];

    const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
      title: localize(title, message),
      promptSteps,
    });

    try {
      context.telemetry.properties.lastStep = 'prompt';
      await wizard.prompt();
    } catch (err) {
      if (err instanceof UserCancelledError) {
        context.telemetry.properties.result = 'Canceled';
        return;
      }
      context.telemetry.properties.result = 'Failed';
      throw err;
    }
    context.telemetry.properties.result = 'Succeeded';
  }
}
