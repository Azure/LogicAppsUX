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
  promptForUnitTestName,
  selectWorkflowNode,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder, isMultiRootWorkspace } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import axios from 'axios';
import { ext } from '../../../../extensionVariables';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import { FileManagement } from '../../generateDeploymentScripts/iacGestureHelperFunctions';

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

    // Determine workflow node
    const workflowNode = node ? (getWorkflowNode(node) as vscode.Uri) : await selectWorkflowNode(context, projectPath);

    // Check if in a multi-root workspace
    if (!isMultiRootWorkspace()) {
      const message = localize('expectedWorkspace', 'A workspace must be open to create unit tests.');
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
  try {
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

    const response = await axios.post(apiUrl, unitTestGenerationInput, {
      headers: {
        Accept: 'application/zip',
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    });

    ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));

    // Process API response
    const zipBuffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'];
    if (contentType !== 'application/zip') {
      throw new Error(localize('invalidResponseType', 'Expected a zip file but received {0}', contentType));
    }

    // Get path for unit test folder project
    const paths = getUnitTestPaths(projectPath, workflowName, unitTestName);
    await fs.ensureDir(paths.unitTestFolderPath!);

    ext.outputChannel.appendLog(localize('unzippingFiles', 'Unzipping Mock.json into: {0}', paths.unitTestFolderPath!));
    await unzipLogicAppArtifacts(zipBuffer, paths.unitTestFolderPath!);
    ext.outputChannel.appendLog(localize('filesUnzipped', 'Files successfully unzipped.'));
    context.telemetry.properties.processStage = 'Files unzipped';

    await createCsFile(paths.unitTestFolderPath!, unitTestName, workflowName, paths.logicAppName);
    await ensureCsprojAndNugetFiles(projectPath, workflowName);

    // Check if testsDirectory is already part of the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const isTestsDirectoryInWorkspace = workspaceFolders.some((folder) => folder.uri.fsPath === paths.unitTestFolderPath!);

    if (!isTestsDirectoryInWorkspace) {
      // Add testsDirectory to workspace if not already included
      ext.outputChannel.appendLog(localize('addingTestsDirectory', 'Adding tests directory to workspace: {0}', paths.unitTestFolderPath!));
      FileManagement.addFolderToWorkspace(paths.unitTestFolderPath!);
    }
    context.telemetry.properties.unitTestGenerationStatus = 'Success';
  } catch (error) {
    handleError(context, error, 'generateCodefulUnitTest');
  }
}
