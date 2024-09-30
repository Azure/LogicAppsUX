/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { managementApiPrefix, workflowFileName } from '../../../../constants';
import { localize } from '../../../../localize';
import { getWorkflowsInLocalProject } from '../../../utils/codeless/common';
import { getTestsDirectory, validateUnitTestName } from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder, isMultiRootWorkspace } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import type { IAzureQuickPickItem, IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import axios from 'axios';
import { ext } from '../../../../extensionVariables';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared/src/utils/src';

/**
 * Creates a unit test for a Logic App workflow (codeful only).
 * @param {IAzureConnectorsContext} context - The context object for Azure Connectors.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {string | undefined} runId - The ID of the run, if available.
 * @returns {Promise<void>} - A Promise that resolves when the unit test is created.
 */
export async function createUnitTest(context: IAzureConnectorsContext, node: vscode.Uri | undefined, runId?: string): Promise<void> {
  let workflowNode: vscode.Uri;
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

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

    // Generate codeful unit test
    await generateCodefulUnitTest(context, projectPath, workflowName, unitTestName, runId);
  } else {
    vscode.window.showInformationMessage(localize('expectedWorkspace', 'In order to create unit tests, you must have a workspace open.'));
  }
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
async function generateCodefulUnitTest(
  context: IAzureConnectorsContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  runId?: string
): Promise<void> {
  try {
    // Ensure runId is available
    if (!runId) {
      throw new Error(localize('runIdMissing', 'Run ID is required to generate a codeful unit test.'));
    }
    // Check if the workflow runtime port is set
    if (isNullOrUndefined(ext.workflowRuntimePort)) {
      throw new Error(
        localize('workflowRuntimeNotRunning', 'The workflow runtime is not running. Please start the workflow runtime and try again.')
      );
    }

    const baseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    const apiUrl = `${baseUrl}/workflows/${encodeURIComponent(workflowName)}/runs/${encodeURIComponent(runId)}/generateUnitTest`;

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

    // Path to the logic app folder under Tests
    const logicAppFolderPath = path.join(testsDirectory, logicAppName);

    // Ensure the logic app folder exists
    await fs.ensureDir(logicAppFolderPath);

    // Path to the workflow folder under the logic app folder
    const workflowFolderPath = path.join(logicAppFolderPath, workflowName);

    // Ensure the workflow folder exists
    await fs.ensureDir(workflowFolderPath);

    // Path to the unit test folder (e.g., Test1Folder)
    const unitTestFolderPath = path.join(workflowFolderPath, unitTestName);

    // Ensure the unit test folder exists
    await fs.ensureDir(unitTestFolderPath);

    // Path to the .csproj file at the logic app folder level
    const csprojFilePath = path.join(logicAppFolderPath, `${logicAppName}.csproj`);

    // Unzip the response into the unit test folder (Mock.json)
    ext.outputChannel.appendLog(localize('unzippingFiles', 'Unzipping Mock.json into: {0}', unitTestFolderPath));

    await unzipLogicAppArtifacts(zipBuffer, unitTestFolderPath);

    ext.outputChannel.appendLog(localize('filesUnzipped', 'Files successfully unzipped.'));

    // Create the .cs file under the unit test folder
    await createCsFile(unitTestFolderPath, unitTestName, workflowName);

    // Generate the .csproj file if it doesn't exist
    if (!(await fs.pathExists(csprojFilePath))) {
      ext.outputChannel.appendLog(localize('creatingCsproj', 'Creating .csproj file at: {0}', csprojFilePath));
      await createCsprojFile(csprojFilePath, logicAppName);
    }

    vscode.window.showInformationMessage(
      localize('info.generateCodefulUnitTest', 'Generated unit test "{0}" in "{1}"', unitTestName, unitTestFolderPath)
    );
  } catch (error) {
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
    vscode.window.showErrorMessage(localize('error.generateCodefulUnitTest', 'Failed to generate codeful unit test: {0}', errorMessage));
  }
}

/**
 * Creates a .csproj file in the specified logic app folder using a template.
 * @param {string} csprojFilePath - The path where the .csproj file will be created.
 * @param {string} logicAppName - The name of the Logic App, used to customize the .csproj file.
 * @returns {Promise<void>} - A promise that resolves when the .csproj file has been created.
 */
async function createCsprojFile(csprojFilePath: string, logicAppName: string): Promise<void> {
  // Define the path to the template
  const templateFolderName = 'UnitTestTemplates';
  const csprojTemplateFileName = 'TestProjectFile.csproj';
  const templatePath = path.join(__dirname, 'assets', templateFolderName, csprojTemplateFileName);

  // Read the template content
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  // Replace placeholders with actual values
  const csprojContent = templateContent.replace(/<%= logicAppName %>/g, logicAppName);

  // Write the .csproj file
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
  const csTemplateFileName = 'TestClassFile.cs';
  const templatePath = path.join(__dirname, 'assets', templateFolderName, csTemplateFileName);

  // Read the template content
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  // Replace placeholders with actual values
  const csContent = templateContent.replace(/<%= unitTestName %>/g, unitTestName).replace(/<%= workflowName %>/g, workflowName);

  // Path to the .cs file
  const csFilePath = path.join(unitTestFolderPath, `${unitTestName}.cs`);

  // Write the .cs file
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
