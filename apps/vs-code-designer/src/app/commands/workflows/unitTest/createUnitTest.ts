/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../localize';
import {
  createCsFile,
  ensureCsprojAndNugetFiles,
  extractAndValidateRunId,
  getUnitTestPaths,
  handleError,
  logTelemetry,
  parseErrorBeforeTelemetry,
  promptForUnitTestName,
  selectWorkflowNode,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspaceFolder, isMultiRootWorkspace } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { type IActionContext, callWithTelemetryAndErrorHandling, parseError } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import axios from 'axios';
import { ext } from '../../../../extensionVariables';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';

/**
 * Handles the creation of a unit test for a Logic App workflow.
 * Validates input, manages workflow node selection, and triggers unit test generation.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {vscode.Uri | undefined} node - Optional URI of the workflow node.
 * @param {string | undefined} runId - Optional run ID.
 * @returns {Promise<void>} Resolves when the unit test creation process completes.
 */
export async function createUnitTest(context: IAzureConnectorsContext, node: vscode.Uri | undefined, runId?: string): Promise<void> {
  try {
    // Validate and extract Run ID
    const validatedRunId = await extractAndValidateRunId(runId);

    // Get workspace folder and project root
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

    context.telemetry.properties.userTriggeredCreateUnitTest = 'true';
    context.telemetry.properties.runIdProvided = runId ? 'true' : 'false';
    context.telemetry.properties.hasNodeUri = node ? 'true' : 'false';

    // Determine workflow node
    const workflowNode = node ? (getWorkflowNode(node) as vscode.Uri) : await selectWorkflowNode(context, projectPath);

    // Check if in a multi-root workspace
    if (!isMultiRootWorkspace()) {
      const message = localize(
        'expectedWorkspace',
        'A multi-root workspace must be open to create unit tests. Please navigate to the Logic Apps extension in Visual Studio Code and use the "Create New Logic App Workspace" command to initialize and open a valid workspace.'
      );
      ext.outputChannel.appendLog(message);
      throw new Error(message);
    }

    // Get workflow name and prompt for unit test name
    const workflowName = path.basename(path.dirname(workflowNode.fsPath));
    const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);

    // Log telemetry and initiate unit test generation
    logTelemetry(context, { workflowName, unitTestName, runId: validatedRunId });

    // Check if we're logging same thing as above
    // // Set telemetry properties for unit test creation
    // context.telemetry.properties.workflowName = workflowName;
    // context.telemetry.properties.unitTestName = unitTestName;
    // context.telemetry.properties.runId = validatedRunId;

    await callWithTelemetryAndErrorHandling('logicApp.createUnitTest', async (telemetryContext: IActionContext) => {
      Object.assign(telemetryContext, context);
      await generateUnitTestFromRun(context, projectPath, workflowName, unitTestName, validatedRunId);
    });
  } catch (error) {
    handleError(context, error, 'createUnitTest');
  }
}

/**
 * Generates a codeful unit test by calling the backend API, processing the response, and creating necessary files.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {string} projectPath - Path to the project directory.
 * @param {string} workflowName - Name of the workflow.
 * @param {string} unitTestName - Name of the unit test.
 * @param {string} runId - Run ID.
 * @returns {Promise<void>} Resolves when the unit test has been generated.
 */
async function generateUnitTestFromRun(
  context: IAzureConnectorsContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  runId: string
): Promise<void> {
  // Initialize booleans to "false", update to "true" upon success.
  context.telemetry.properties.apiCallInitiated = 'false';
  context.telemetry.properties.apiCallSucceeded = 'false';
  context.telemetry.properties.filesUnzipped = 'false';
  context.telemetry.properties.csFileCreated = 'false';
  context.telemetry.properties.csprojFileCreated = 'false';
  context.telemetry.properties.nugetConfigFileCreated = 'false';
  context.telemetry.properties.testsFolderAddedToWorkspace = 'false';

  const startTime = Date.now();
  try {
    if (!runId) {
      context.telemetry.properties.runIdMissing = 'true';
      throw new Error(localize('runIdMissing', 'Run ID is required to generate a codeful unit test.'));
    }

    // Validate runtime port and construct API URL
    if (!ext.workflowRuntimePort) {
      context.telemetry.properties.missingRuntimePort = 'true';
      throw new Error(localize('workflowRuntimeNotRunning', 'Workflow runtime is not running. Start the runtime and try again.'));
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

    // Log API details and initiate call
    ext.outputChannel.appendLog(localize('initiatingApiCall', 'Initiating Unit Test Generation API call...'));
    context.telemetry.properties.processStage = 'API Call Initiated';

    context.telemetry.properties.apiCallInitiated = 'true';

    ext.outputChannel.appendLog(
      localize(
        'operationalContext',
        `Operational context: Workflow Name: ${workflowName}, Run ID: ${runId}, Unit Test Name: ${unitTestName}`
      )
    );

    ext.outputChannel.appendLog(localize('initiatingApiCall', 'Initiating Unit Test Generation API call...'));

    let response: any;

    // Make the API call within a try/catch to differentiate any request error
    try {
      response = await axios.post(apiUrl, unitTestGenerationInput, {
        headers: {
          Accept: 'application/zip',
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      });
      context.telemetry.properties.apiCallSucceeded = 'true';
      ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));
      context.telemetry.properties.processStage = 'API Call Completed';
    } catch (apiError: any) {
      context.telemetry.properties.apiCallSucceeded = 'false';
      const parsedApiError = parseErrorBeforeTelemetry(apiError);
      context.telemetry.properties.apiCallFailReason = parsedApiError;
      ext.outputChannel.appendLog(localize('apiCallFailedLog', `API call failed: ${parsedApiError}`));
      throw apiError;
    }

    ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));
    context.telemetry.properties.processStage = 'API Call Completed';

    // Process API response and verify content type
    const zipBuffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'];
    if (contentType !== 'application/zip') {
      context.telemetry.properties.apiCallSucceeded = 'false';
      const contentTypeError = localize('invalidResponseType', 'Expected a zip file but received {0}', contentType);
      context.telemetry.properties.apiCallFailReason = contentTypeError;
      throw new Error(contentTypeError);
    }

    const paths = getUnitTestPaths(projectPath, workflowName, unitTestName);
    await fs.ensureDir(paths.unitTestFolderPath!);

    // Unzip artifacts
    try {
      ext.outputChannel.appendLog(localize('unzippingFiles', 'Unzipping Mock.json into: {0}', paths.unitTestFolderPath!));
      await unzipLogicAppArtifacts(zipBuffer, paths.unitTestFolderPath!);
      context.telemetry.properties.filesUnzipped = 'true';
      ext.outputChannel.appendLog(localize('filesUnzipped', 'Files successfully unzipped.'));
      context.telemetry.properties.processStage = 'Files Unzipped';
    } catch (unzipError) {
      context.telemetry.properties.filesUnzipped = 'false';
      context.telemetry.properties.filesUnzipFailReason = parseError(unzipError).message;
      throw unzipError;
    }

    // Create the .cs test file
    try {
      await createCsFile(paths.unitTestFolderPath!, unitTestName, workflowName, paths.logicAppName);
      context.telemetry.properties.csFileCreated = 'true';
    } catch (csError) {
      context.telemetry.properties.csFileCreated = 'false';
      context.telemetry.properties.csFileFailReason = parseError(csError).message;
      throw csError;
    }

    // create nuget file
    try {
      await ensureCsprojAndNugetFiles(paths.testsDirectory, paths.logicAppFolderPath, paths.logicAppName);
      context.telemetry.properties.nugetConfigFileCreated = 'true';
    } catch (nugetError) {
      context.telemetry.properties.nugetConfigFileCreated = 'false';
      context.telemetry.properties.nugetConfigFailReason = parseError(nugetError).message;
      throw nugetError;
    }

    try {
      // Add testsDirectory to workspace if not already included
      ext.outputChannel.appendLog(localize('checkingWorkspace', 'Checking if tests directory is already part of the workspace...'));

      await ensureDirectoryInWorkspace(paths.testsDirectory);

      context.telemetry.properties.testsFolderAddedToWorkspace = 'true';
      ext.outputChannel.appendLog(localize('workspaceUpdated', 'Tests directory added to workspace if not already included.'));
    } catch (workspaceError) {
      context.telemetry.properties.testsFolderAddedToWorkspace = 'false';
      context.telemetry.properties.testsFolderFailReason = parseError(workspaceError).message;

      ext.outputChannel.appendLog(
        localize('error.addingTestsDirectory', 'Error adding tests directory to workspace: {0}', parseError(workspaceError).message)
      );

      throw workspaceError;
    }

    // Show a success message to the user
    vscode.window.showInformationMessage(
      localize('info.generateCodefulUnitTest', 'Generated unit test "{0}" in "{1}"', unitTestName, paths.unitTestFolderPath)
    );

    // Mark success
    context.telemetry.properties.unitTestGenerationStatus = 'Success';
    context.telemetry.measurements.generateCodefulUnitTestMs = Date.now() - startTime;
  } catch (methodError: any) {
    // Overall catch
    context.telemetry.properties.unitTestGenerationStatus = 'Failed';

    // Show the underlying error in the console
    const errorMessage1 = parseError(methodError).message;
    console.log(errorMessage1);

    // Parse the error for final telemetry
    const errorMessage = parseErrorBeforeTelemetry(methodError);
    context.telemetry.properties.errorMessage = errorMessage;

    const errorDisplayMessage = localize('error.generateCodefulUnitTest', 'Failed to generate codeful unit test: {0}', errorMessage);
    vscode.window.showErrorMessage(errorDisplayMessage);
    ext.outputChannel.appendLog(errorDisplayMessage);

    throw methodError; // rethrow after logging
  }
}
