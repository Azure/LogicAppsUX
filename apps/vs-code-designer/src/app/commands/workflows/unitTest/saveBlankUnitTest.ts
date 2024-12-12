/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workflowFileName } from '../../../../constants';
import { localize } from '../../../../localize';
import { getWorkflowsInLocalProject } from '../../../utils/codeless/common';
import { getTestsDirectory, validateUnitTestName } from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder, isMultiRootWorkspace } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { type IAzureQuickPickItem, type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import axios from 'axios';
import { ext } from '../../../../extensionVariables';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';

/**
 * Creates a unit test for a Logic App workflow (codeful only).
 * @param {IAzureConnectorsContext} context - The context object for Azure Connectors.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {string | undefined} runId - The ID of the run, if available.
 * @returns {Promise<void>} - A Promise that resolves when the unit test is created.
 */
export async function saveBlankUnitTest(
  context: IAzureConnectorsContext,
  node: vscode.Uri | undefined,
  unitTestDefinition: any
): Promise<void> {
  let workflowNode: vscode.Uri;
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  const parsedDefinition = await parseOutputsInto(unitTestDefinition);
  const operationInfo = unitTestDefinition['operationInfo'];
  const outputParameters = unitTestDefinition['outputParameters'];
  console.log(parsedDefinition);
  console.log(operationInfo);
  console.log(outputParameters);

  if (node) {
    workflowNode = getWorkflowNode(node) as vscode.Uri;
  } else {
    const workflow = await pickWorkflow(context, projectPath);
    workflowNode = vscode.Uri.file(workflow.data) as vscode.Uri;
  }

  if (isMultiRootWorkspace()) {
    const workflowName = path.basename(path.dirname(workflowNode.fsPath));
    const unitTestName = await context.ui.showInputBox({
      prompt: localize('unitTestNamePrompt', 'Provide a unit test name'),
      placeHolder: localize('unitTestNamePlaceholder', 'Unit test name'),
      validateInput: async (name: string): Promise<string | undefined> => await validateUnitTestName(projectPath, workflowName, name),
    });

    ext.outputChannel.appendLog(localize('unitTestNameEntered', `Unit test name entered: ${unitTestName}`));

    // Set telemetry properties for unit test creation
    context.telemetry.properties.workflowName = workflowName;
    context.telemetry.properties.unitTestName = unitTestName;

    await callWithTelemetryAndErrorHandling('logicApp.saveBlankUnitTest', async (telemetryContext: IActionContext) => {
      Object.assign(telemetryContext, context);
      await generateBlankCodefulUnitTest(context, projectPath, workflowName, unitTestName);
    });
  } else {
    const message = localize('expectedWorkspace', 'In order to create unit tests, you must have a workspace open.');
    vscode.window.showInformationMessage(message);
    ext.outputChannel.appendLog(message);
  }
}

async function parseOutputsInto(unitTestDefinition: any) {
  const allowedFields = ['type', 'title', 'format', 'description'];
  const transform = (obj: any) => {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const cleanedKey = key.replace('outputs.$.', '').replace('.$.', '.').replace('$.', '').replace('.$', '');
        const keys = cleanedKey.split('.');
        keys.reduce((acc, part, index) => {
          if (index === keys.length - 1) {
            if (Object.prototype.hasOwnProperty.call(acc, part) && typeof acc[part] === 'object' && typeof obj[key] === 'object') {
              acc[part] = {
                ...acc[part],
                ...Object.keys(obj[key]).reduce((filtered, k) => {
                  if (allowedFields.includes(k)) {
                    (filtered as Record<string, any>)[k] = obj[key][k];
                  }
                  return filtered;
                }, {}),
              };
            } else {
              acc[part] = {
                ...Object.keys(obj[key]).reduce((filtered, k) => {
                  if (allowedFields.includes(k)) {
                    (filtered as Record<string, any>)[k] = obj[key][k];
                  }
                  return filtered;
                }, {}),
              };
            }
          } else {
            acc[part] = acc[part] || {};
          }
          return acc[part];
        }, result);
      }
      // console.log("within transform steps");
      // console.log(result);
    }
    // console.log("finished transform");
    // console.log(result);
    return result;
  };
  const outputOperations2: { operationInfo: any; outputParameters: any } = {
    operationInfo: unitTestDefinition['operationInfo'],
    outputParameters: {},
  };

  for (const paramKey in unitTestDefinition['outputParameters']) {
    outputOperations2.outputParameters[paramKey] = {
      outputs: transform(unitTestDefinition['outputParameters'][paramKey].outputs),
    };
  }
  console.log(outputOperations2);
  return outputOperations2;
}

/**
 * Generates a codeful unit test by calling the backend API, unzipping the response, and creating the .cs file.
 * @param {IAzureConnectorsContext} context - The context for Azure Connectors.
 * @param {string} projectPath - The path to the project directory.
 * @param {string} workflowName - The name of the workflow for which the test is being created.
 * @param {string} unitTestName - The name of the unit test to be created.
 * @param {string | undefined} runId - The ID of the run.
 * @returns {Promise<void>} - A promise that resolves when the unit test has been generated.
 */
async function generateBlankCodefulUnitTest(
  context: IAzureConnectorsContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string
): Promise<void> {
  try {
    if (isNullOrUndefined(ext.workflowRuntimePort)) {
      context.telemetry.properties.missingRuntimePort = 'true';
      throw new Error(
        localize('workflowRuntimeNotRunning', 'The workflow runtime is not running. Please start the workflow runtime and try again.')
      );
    }

    context.telemetry.properties.runtimePort = ext.workflowRuntimePort?.toString();

    const baseUrl = `http://localhost:${ext.workflowRuntimePort}`;

    const apiUrl = `${baseUrl}/runtime/webhooks/workflow/api/management/workflows/${encodeURIComponent(
      workflowName
    )}/runs/${encodeURIComponent(runId)}/generateUnitTest`;

    ext.outputChannel.appendLog(localize('apiUrl', `Calling API URL: ${apiUrl}`));

    const unitTestGenerationInput = {
      UnitTestName: unitTestName,
    };

    ext.outputChannel.appendLog(
      localize(
        'operationalContext',
        `Operational context: Workflow Name: ${workflowName}, Run ID: ${runId}, Unit Test Name: ${unitTestName}`
      )
    );

    ext.outputChannel.appendLog(localize('initiatingApiCall', 'Initiating Unit Test Generation API call...'));

    context.telemetry.properties.processStage = 'API Call Initiated';

    const response = await axios.post(apiUrl, unitTestGenerationInput, {
      headers: {
        Accept: 'application/zip',
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    });

    ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));

    const zipBuffer = Buffer.from(response.data);

    const contentType = response.headers['content-type'];
    if (contentType !== 'application/zip') {
      throw new Error(localize('invalidResponseType', 'Expected a zip file but received {0}', contentType));
    }

    const testsDirectoryUri = getTestsDirectory(projectPath);
    const testsDirectory = testsDirectoryUri.fsPath;
    const logicAppName = path.basename(path.dirname(path.join(projectPath, workflowName)));
    const logicAppFolderPath = path.join(testsDirectory, logicAppName);
    await fs.ensureDir(logicAppFolderPath);
    const workflowFolderPath = path.join(logicAppFolderPath, workflowName);
    await fs.ensureDir(workflowFolderPath);
    const unitTestFolderPath = path.join(workflowFolderPath, unitTestName);
    await fs.ensureDir(unitTestFolderPath);

    const csprojFilePath = path.join(logicAppFolderPath, `${logicAppName}.csproj`);

    // Unzip the response into the unit test folder (Mock.json)
    ext.outputChannel.appendLog(localize('unzippingFiles', 'Unzipping Mock.json into: {0}', unitTestFolderPath));
    await unzipLogicAppArtifacts(zipBuffer, unitTestFolderPath);

    ext.outputChannel.appendLog(localize('filesUnzipped', 'Files successfully unzipped.'));
    context.telemetry.properties.processStage = 'Files Unzipped';
    await createCsFile(unitTestFolderPath, unitTestName, workflowName);

    // Generate the .csproj file if it doesn't exist
    if (!(await fs.pathExists(csprojFilePath))) {
      ext.outputChannel.appendLog(localize('creatingCsproj', 'Creating .csproj file at: {0}', csprojFilePath));
      await createCsprojFile(csprojFilePath, logicAppName);
    }

    vscode.window.showInformationMessage(
      localize('info.generateCodefulUnitTest', 'Generated unit test "{0}" in "{1}"', unitTestName, unitTestFolderPath)
    );

    context.telemetry.properties.unitTestGenerationStatus = 'Success';
  } catch (error) {
    context.telemetry.properties.unitTestGenerationStatus = 'Failed';

    if (error.code) {
      context.telemetry.properties.networkErrorCode = error.code;
    }

    // Handle errors and parse error response if available
    let errorMessage: string;
    // eslint-disable-next-line import/no-named-as-default-member
    if (axios.isAxiosError(error) && error.response?.data) {
      try {
        const responseData = JSON.parse(new TextDecoder().decode(error.response.data));
        const { message = '', code = '' } = responseData?.error ?? {};
        errorMessage = localize('apiError', `API Error: ${code} - ${message}`);
        ext.outputChannel.appendLog(errorMessage);
      } catch (parseError) {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
    context.telemetry.properties.error = errorMessage;
    const errorDisplayMessage = localize('error.generateCodefulUnitTest', 'Failed to generate codeful unit test: {0}', errorMessage);
    vscode.window.showErrorMessage(errorDisplayMessage);
    ext.outputChannel.appendLog(errorDisplayMessage);
  }
}

/**
 * Creates a .csproj file in the specified logic app folder using a template.
 * @param {string} csprojFilePath - The path where the .csproj file will be created.
 * @param {string} logicAppName - The name of the Logic App, used to customize the .csproj file.
 * @returns {Promise<void>} - A promise that resolves when the .csproj file has been created.
 */
async function createCsprojFile(csprojFilePath: string, logicAppName: string): Promise<void> {
  const templateFolderName = 'UnitTestTemplates';
  const csprojTemplateFileName = 'TestProjectFile';
  const templatePath = path.join(__dirname, 'assets', templateFolderName, csprojTemplateFileName);

  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const csprojContent = templateContent.replace(/<%= logicAppName %>/g, logicAppName);
  await fs.writeFile(csprojFilePath, csprojContent);

  ext.outputChannel.appendLog(localize('csprojFileCreated', 'Created .csproj file at: {0}', csprojFilePath));
}

/**
 * Creates a .cs file in the specified unit test folder using a template.
 * @param {string} unitTestFolderPath - The path to the unit test folder.
 * @param {string} unitTestName - The name of the unit test.
 * @param {string} workflowName - The name of the workflow.
 * @returns {Promise<void>} - A promise that resolves when the .cs file has been created.
 */
async function createCsFile(unitTestFolderPath: string, unitTestName: string, workflowName: string): Promise<void> {
  // Define the path to the template
  const templateFolderName = 'UnitTestTemplates';
  const csTemplateFileName = 'TestClassFile';
  const templatePath = path.join(__dirname, 'assets', templateFolderName, csTemplateFileName);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const csContent = templateContent.replace(/<%= unitTestName %>/g, unitTestName).replace(/<%= workflowName %>/g, workflowName);
  const csFilePath = path.join(unitTestFolderPath, `${unitTestName}.cs`);
  await fs.writeFile(csFilePath, csContent);

  ext.outputChannel.appendLog(localize('csFileCreated', 'Created .cs file at: {0}', csFilePath));
}

/**
 * Prompts the user to select a workflow and returns the selected workflow.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns {Promise<IAzureQuickPickItem<string>>} - A promise that resolves to the selected workflow.
 */
const pickWorkflow = async (context: IActionContext, projectPath: string): Promise<IAzureQuickPickItem<string>> => {
  const placeHolder: string = localize('selectLogicApp', 'Select workflow to create unit test');
  return await context.ui.showQuickPick(getWorkflowsPick(projectPath), {
    placeHolder,
  });
};

/**
 * Retrieves the list of workflows in the local project.
 * @param {string} projectPath - The path to the local project.
 * @returns {Promise<IAzureQuickPickItem<string>[]>} - An array of Azure Quick Pick items representing the logic apps in the project.
 */
const getWorkflowsPick = async (projectPath: string): Promise<IAzureQuickPickItem<string>[]> => {
  const listOfWorkflows = await getWorkflowsInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfWorkflows)).map((workflowName) => {
    return {
      label: workflowName,
      data: path.join(projectPath, workflowName, workflowFileName),
    };
  });
  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};
