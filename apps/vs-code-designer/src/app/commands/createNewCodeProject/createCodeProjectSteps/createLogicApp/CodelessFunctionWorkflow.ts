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
} from '../../../../../constants';
import { localize } from '../../../../../localize';
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
import { parseJson } from '../../../../utils/parseJson';
import { WorkflowCreateStepBase } from '../../../createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { DialogResponses, nonNullProp, parseError } from '@microsoft/vscode-azext-utils';
import { WorkflowProjectType, MismatchBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { IFunctionWizardContext, IWorkflowTemplate, IHostJsonV2, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';
import { validateDotNetIsInstalled } from '../../../dotnet/validateDotNetInstalled';

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
    // Get the function template and function name from the IFunctionWizardContext object
    const template: IWorkflowTemplate = nonNullProp(context, 'functionTemplate');
    const functionPath: string = path.join(context.projectPath, nonNullProp(context, 'functionName'));
    const methodName = context.methodName;

    // Create empty stateful and stateless definition objects
    const emptyStatefulDefinition: StandardApp = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {
          Call_a_local_function_in_this_logic_app: {
            type: 'InvokeFunction',
            inputs: {
              functionName: '' + methodName + '',
              parameters: {
                zipCode: 85396,
                temperatureScale: 'Celsius',
              },
            },
            runAfter: {},
          },
          Response: {
            type: 'Response',
            kind: 'http',
            inputs: {
              statusCode: 200,
              body: "@body('Call_a_local_function_in_this_logic_app')",
            },
            runAfter: {
              Call_a_local_function_in_this_logic_app: ['Succeeded'],
            },
          },
        },
        triggers: {
          When_a_HTTP_request_is_received: {
            type: 'Request',
            kind: 'Http',
            inputs: {},
          },
        },
        contentVersion: '1.0.0.0',
        outputs: {},
      },
      kind: 'Stateful',
    };

    const emptyStatelessDefinition: StandardApp = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {
          Call_a_local_function_in_this_logic_app: {
            type: 'InvokeFunction',
            inputs: {
              functionName: '' + methodName + '',
              parameters: {
                zipCode: 85396,
                temperatureScale: 'Celsius',
              },
            },
            runAfter: {},
          },
          Response: {
            type: 'Response',
            kind: 'http',
            inputs: {
              statusCode: 200,
              body: "@body('Call_a_local_function_in_this_logic_app')",
            },
            runAfter: {
              Call_a_local_function_in_this_logic_app: ['Succeeded'],
            },
          },
        },
        triggers: {
          When_a_HTTP_request_is_received: {
            type: 'Request',
            kind: 'Http',
            inputs: {},
          },
        },
        contentVersion: '1.0.0.0',
        outputs: {},
      },
      kind: 'Stateless',
    };

    // Determine which definition object to use based on the type of workflow template
    const codelessDefinition: StandardApp = template?.id === workflowType.stateful ? emptyStatefulDefinition : emptyStatelessDefinition;

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
  }

  // Private async method that reads and parses the host.json file
  private async getHostJson(context: IFunctionWizardContext, hostJsonPath: string, allowOverwrite = false): Promise<IHostJsonV2> {
    return this.getJsonFromFile(context, hostJsonPath, { version: '2.0' }, allowOverwrite);
  }

  // Private async method that reads and parses a JSON file
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
