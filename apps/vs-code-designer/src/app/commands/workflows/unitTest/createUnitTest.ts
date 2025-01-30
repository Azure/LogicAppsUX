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
    await callWithTelemetryAndErrorHandling('logicApp.createUnitTest', async (telemetryContext: IActionContext) => {
      Object.assign(telemetryContext, context);
      await generateUnitTestFromRun(context, projectPath, workflowName, unitTestName, validatedRunId);
    });
  } catch (error) {
    handleError(context, error, 'createUnitTest');
  }
}

/**
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
  // Initialize telemetry properties
  Object.assign(context.telemetry.properties, {
    apiCallInitiated: 'false',
    apiCallSucceeded: 'false',
    filesUnzipped: 'false',
    csFileCreated: 'false',
    csprojFileCreated: 'false',
    nugetConfigFileCreated: 'false',
    testsFolderAddedToWorkspace: 'false',
  });

  const startTime = Date.now();
  try {
    if (!runId) {
      context.telemetry.properties.runIdMissing = 'true';
      throw new Error(localize('runIdMissing', 'Run ID is required to generate a codeful unit test.'));
    }

    if (!ext.workflowRuntimePort) {
      context.telemetry.properties.missingRuntimePort = 'true';
      throw new Error(localize('workflowRuntimeNotRunning', 'Workflow runtime is not running. Start the runtime and try again.'));
    }

    context.telemetry.properties.runtimePort = ext.workflowRuntimePort.toString();
    const baseUrl = `http://localhost:${ext.workflowRuntimePort}`;
    const apiUrl = `${baseUrl}/runtime/webhooks/workflow/api/management/workflows/${encodeURIComponent(workflowName)}/runs/${encodeURIComponent(runId)}/generateUnitTest`;

    ext.outputChannel.appendLog(localize('apiUrl', `Calling API URL: ${apiUrl}`));
    ext.outputChannel.appendLog(
      localize(
        'operationalContext',
        `Operational context: Workflow Name: ${workflowName}, Run ID: ${runId}, Unit Test Name: ${unitTestName}`
      )
    );
    ext.outputChannel.appendLog(localize('initiatingApiCall', 'Initiating Unit Test Generation API call...'));

    context.telemetry.properties.apiCallInitiated = 'true';

    let response: any;
    try {
      response = await axios.post(
        apiUrl,
        { UnitTestName: unitTestName },
        {
          headers: {
            Accept: 'application/zip',
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      context.telemetry.properties.apiCallSucceeded = 'true';
      ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));
      context.telemetry.properties.processStage = 'API Call Completed';
    } catch (apiError) {
      context.telemetry.properties.apiCallSucceeded = 'false';
      context.telemetry.properties.apiCallFailReason = parseErrorBeforeTelemetry(apiError);
      ext.outputChannel.appendLog(localize('apiCallFailedLog', `API call failed: ${context.telemetry.properties.apiCallFailReason}`));
      throw apiError;
    }

    const zipBuffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'];
    if (contentType !== 'application/zip') {
      context.telemetry.properties.apiCallSucceeded = 'false';
      throw new Error(localize('invalidResponseType', `Expected a zip file but received ${contentType}`));
    }

    const paths = getUnitTestPaths(projectPath, workflowName, unitTestName);
    await fs.ensureDir(paths.unitTestFolderPath);

    try {
      ext.outputChannel.appendLog(localize('unzippingFiles', `Unzipping Mock.json into: ${paths.unitTestFolderPath}`));
      await unzipLogicAppArtifacts(zipBuffer, paths.unitTestFolderPath);
      context.telemetry.properties.filesUnzipped = 'true';
      ext.outputChannel.appendLog(localize('filesUnzipped', 'Files successfully unzipped.'));
      context.telemetry.properties.processStage = 'Files Unzipped';
    } catch (unzipError) {
      context.telemetry.properties.filesUnzipped = 'false';
      context.telemetry.properties.filesUnzipFailReason = parseError(unzipError).message;
      throw unzipError;
    }

    try {
      await createCsFile(paths.unitTestFolderPath, unitTestName, workflowName, paths.logicAppName);
      context.telemetry.properties.csFileCreated = 'true';
    } catch (csError) {
      context.telemetry.properties.csFileCreated = 'false';
      context.telemetry.properties.csFileFailReason = parseError(csError).message;
      throw csError;
    }

    try {
      await ensureCsprojAndNugetFiles(paths.testsDirectory, paths.logicAppFolderPath, paths.logicAppName);
      context.telemetry.properties.nugetConfigFileCreated = 'true';
    } catch (nugetError) {
      context.telemetry.properties.nugetConfigFileCreated = 'false';
      context.telemetry.properties.nugetConfigFailReason = parseError(nugetError).message;
      throw nugetError;
    }

    try {
      ext.outputChannel.appendLog(localize('checkingWorkspace', 'Checking if tests directory is already part of the workspace...'));
      await ensureDirectoryInWorkspace(paths.testsDirectory);
      context.telemetry.properties.testsFolderAddedToWorkspace = 'true';
      ext.outputChannel.appendLog(localize('workspaceUpdated', 'Tests directory added to workspace if not already included.'));
    } catch (workspaceError) {
      context.telemetry.properties.testsFolderAddedToWorkspace = 'false';
      context.telemetry.properties.testsFolderFailReason = parseError(workspaceError).message;
      ext.outputChannel.appendLog(
        localize('error.addingTestsDirectory', `Error adding tests directory to workspace: ${parseError(workspaceError).message}`)
      );
      throw workspaceError;
    }

    vscode.window.showInformationMessage(
      localize('info.generateCodefulUnitTest', `Generated unit test "${unitTestName}" in "${paths.unitTestFolderPath}"`)
    );
    context.telemetry.properties.unitTestGenerationStatus = 'Success';
    context.telemetry.measurements.generateCodefulUnitTestMs = Date.now() - startTime;
  } catch (methodError) {
    context.telemetry.properties.unitTestGenerationStatus = 'Failed';
    const errorMessage = parseErrorBeforeTelemetry(methodError);
    context.telemetry.properties.errorMessage = errorMessage;
    vscode.window.showErrorMessage(localize('error.generateCodefulUnitTest', `Failed to generate codeful unit test: ${errorMessage}`));
    ext.outputChannel.appendLog(localize('error.generateCodefulUnitTest', `Failed to generate codeful unit test: ${errorMessage}`));
    throw methodError;
  }
}
