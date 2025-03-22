/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { extensionCommand } from '../../../constants';
import { ExistingWorkspaceStep } from '../createNewProject/createProjectSteps/ExistingWorkspaceStep';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { type IFunctionWizardContext, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { convertToWorkspace } from '../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../localize';
import { type Uri, window } from 'vscode';
import { FunctionNameStep } from './createCustomCodeFunctionSteps/FunctionNameStep';
import { FunctionFilesStep } from './createCustomCodeFunctionSteps/FunctionFilesStep';
import {
  getCustomCodeFunctionsProjectMetadata,
  getCustomCodeFunctionsProjects,
  isCustomCodeFunctionsProject,
} from '../../utils/customCodeUtils';

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

    const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options);
    wizardContext.projectType = ProjectType.customCode;
    wizardContext.isWorkspaceWithFunctions = true;
    if (!options.folderPath || !(await isCustomCodeFunctionsProject(options.folderPath))) {
      window.showErrorMessage(
        localize(
          'azureLogicAppsStandard.invalidCustomCodeFunctionsProject',
          `The target folder ${options.folderPath} is not a valid custom code functions project.`
        )
      );
      return;
    }
    const functionsProjectMetadata = await getCustomCodeFunctionsProjectMetadata(options.folderPath);
    wizardContext.functionAppName = functionsProjectMetadata?.functionAppName;
    if (!wizardContext.functionAppName) {
      window.showErrorMessage(
        localize(
          'azureLogicAppsStandard.invalidFunctionAppName',
          `Could not resolve the function name for the target folder ${options.folderPath}.`
        )
      );
      return;
    }
    wizardContext.logicAppName = functionsProjectMetadata?.logicAppName;
    if (!wizardContext.logicAppName) {
      window.showErrorMessage(
        localize(
          'azureLogicAppsStandard.invalidLogicAppReference',
          `Could not find a valid logic app reference in the target folder ${options.folderPath}.`
        )
      );
      return;
    }
    wizardContext.targetFramework = functionsProjectMetadata?.targetFramework;
    if (!wizardContext.targetFramework) {
      window.showErrorMessage(
        localize(
          'azureLogicAppsStandard.invalidTargetFramework',
          `Could not find a valid target framework in the target folder ${options.folderPath}.`
        )
      );
      return;
    }
    wizardContext.functionAppNamespace = functionsProjectMetadata?.namespace;
    if (!wizardContext.functionAppNamespace) {
      window.showErrorMessage(
        localize(
          'azureLogicAppsStandard.invalidFunctionAppNamespace',
          `Could not find a valid function app namespace in the target folder ${options.folderPath}.`
        )
      );
      return;
    }

    const title = 'createCustomCodeFunction';
    const message = 'Create new custom code function';
    const promptSteps = [new ExistingWorkspaceStep(), new FunctionNameStep(), new FunctionFilesStep()];

    const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
      title: localize(title, message),
      promptSteps,
    });

    await wizard.prompt();

    vscode.commands.executeCommand(
      'setContext',
      extensionCommand.customCodeSetFunctionsFolders,
      await getCustomCodeFunctionsProjects(context)
    );
  }
}
