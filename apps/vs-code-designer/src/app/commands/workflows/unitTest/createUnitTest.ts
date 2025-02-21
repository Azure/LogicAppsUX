/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../localize';
import { ConvertToWorkspace } from '../../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import {
  createCsFile,
  createTestExecutorFile,
  createTestSettingsConfigFile,
  ensureCsprojAndNugetFiles,
  extractAndValidateRunId,
  getUnitTestPaths,
  handleError,
  logTelemetry,
  parseErrorBeforeTelemetry,
  parseUnitTestOutputs,
  processAndWriteMockableOperations,
  promptForUnitTestName,
  selectWorkflowNode,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspaceFolder } from '../../../utils/workspace';
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
 * @param {any} unitTestDefinition - The unit test definition.
 * @returns {Promise<void>} Resolves when the unit test creation process completes.
 */
export async function createUnitTest(
  context: IAzureConnectorsContext,
  node: vscode.Uri | undefined,
  runId?: string,
  unitTestDefinition?: any
): Promise<void> {
  try {
    // Validate and extract Run ID
    const validatedRunId = await extractAndValidateRunId(runId);

    // Get workspace folder and project root
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

    if (!(await ConvertToWorkspace(context))) {
      ext.outputChannel.appendLog(
        localize('createUnitTestCancelled', 'Exiting unit test creation, a workspace is required to create unit tests.')
      );
      return;
    }

    logTelemetry(context, {
      workspaceLocated: 'true',
      projectRootLocated: 'true',
      userTriggeredCreateUnitTest: 'true',
      runIdProvided: runId ? 'true' : 'false',
      hasNodeUri: node ? 'true' : 'false',
    });

    // Determine workflow node
    const workflowNode = node ? (getWorkflowNode(node) as vscode.Uri) : await selectWorkflowNode(context, projectPath);

    // Get workflow name and prompt for unit test name
    const workflowName = path.basename(path.dirname(workflowNode.fsPath));
    const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);

    // Log telemetry and initiate unit test generation
    logTelemetry(context, {
      workflowName: workflowName,
      unitTestName: unitTestName,
      runId: validatedRunId,
    });
    await callWithTelemetryAndErrorHandling('logicApp.createUnitTest', async (telemetryContext: IActionContext) => {
      Object.assign(telemetryContext, context);
      await generateUnitTestFromRun(context, projectPath, workflowName, unitTestName, validatedRunId, unitTestDefinition, node.fsPath);
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
 * @param {any} unitTestDefinition - The unit test definition.
 * @returns {Promise<void>} Resolves when the unit test has been generated.
 */
async function generateUnitTestFromRun(
  context: IAzureConnectorsContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  runId: string,
  unitTestDefinition: any,
  workflowPath: string
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

  // Get parsed outputs
  const parsedOutputs = await parseUnitTestOutputs(unitTestDefinition);
  const operationInfo = parsedOutputs['operationInfo'];
  const outputParameters = parsedOutputs['outputParameters'];

  logTelemetry(context, {
    operationInfoExists: operationInfo ? 'true' : 'false',
    outputParametersExists: outputParameters ? 'true' : 'false',
  });

  const startTime = Date.now();
  try {
    if (!runId) {
      logTelemetry(context, { runIdMissing: 'true' });
      throw new Error(localize('runIdMissing', 'Run ID is required to generate a codeful unit test.'));
    }

    if (!ext.workflowRuntimePort) {
      logTelemetry(context, { missingRuntimePort: 'true' });
      throw new Error(localize('workflowRuntimeNotRunning', 'Workflow runtime is not running. Start the runtime and try again.'));
    }

    logTelemetry(context, { runtimePort: ext.workflowRuntimePort.toString() });
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

    logTelemetry(context, { apiCallInitiated: 'true' });

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

      logTelemetry(context, { apiCallSucceeded: 'true', processStage: 'API Call Completed' });
      ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));
    } catch (apiError) {
      const failReason = parseErrorBeforeTelemetry(apiError);
      logTelemetry(context, {
        apiCallSucceeded: 'false',
        apiCallFailReason: failReason,
      });
      ext.outputChannel.appendLog(localize('apiCallFailedLog', `API call failed: ${context.telemetry.properties.apiCallFailReason}`));
      throw apiError;
    }

    const zipBuffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'];
    if (contentType !== 'application/zip') {
      logTelemetry(context, { apiCallSucceeded: 'false' });
      throw new Error(localize('invalidResponseType', `Expected a zip file but received ${contentType}`));
    }

    const paths = getUnitTestPaths(projectPath, workflowName, unitTestName);
    await fs.ensureDir(paths.unitTestFolderPath);
    const { foundActionMocks, foundTriggerMocks } = await processAndWriteMockableOperations(
      operationInfo,
      outputParameters,
      workflowPath,
      paths.workflowFolderPath,
      workflowName,
      paths.logicAppName
    );
    // Create the testSettings.config file for the unit test
    ext.outputChannel.appendLog(localize('creatingTestSettingsConfig', 'Creating testSettings.config file for unit test...'));
    await createTestSettingsConfigFile(paths.workflowFolderPath, workflowName, paths.logicAppName);
    await createTestExecutorFile(paths.logicAppFolderPath, paths.logicAppName);

    try {
      ext.outputChannel.appendLog(localize('unzippingFiles', `Unzipping Mock.json into: ${paths.unitTestFolderPath}`));
      await unzipLogicAppArtifacts(zipBuffer, paths.unitTestFolderPath);
      logTelemetry(context, { filesUnzipped: 'true', processStage: 'Files Unzipped' });
      ext.outputChannel.appendLog(localize('filesUnzipped', 'Files successfully unzipped.'));
      context.telemetry.properties.processStage = 'Files Unzipped';
    } catch (unzipError) {
      const unzipFailReason = parseError(unzipError).message;
      logTelemetry(context, { filesUnzipped: 'false', filesUnzipFailReason: unzipFailReason });
      throw unzipError;
    }

    try {
      // Get the first actionMock in foundActionMocks
      const [actionName, actionOutputClassName] = Object.entries(foundActionMocks)[0] || [];
      // Get the first actionMock in foundActionMocks
      const [, triggerOutputClassName] = Object.entries(foundTriggerMocks)[0] || [];
      // Create actionMockClassName by replacing "Output" with "Mock" in actionOutputClassName
      const actionMockClassName = actionOutputClassName?.replace(/(.*)Output$/, '$1Mock');
      const triggerMockClassName = triggerOutputClassName.replace(/(.*)Output$/, '$1Mock');
      await createCsFile(
        paths.unitTestFolderPath!,
        unitTestName,
        workflowName,
        paths.logicAppName,
        actionName,
        actionOutputClassName,
        actionMockClassName,
        triggerOutputClassName,
        triggerMockClassName
      );
      logTelemetry(context, { csFileCreated: 'true' });
    } catch (csError) {
      const csFileFailReason = parseError(csError).message;
      logTelemetry(context, { csFileCreated: 'false', csFileFailReason });
      throw csError;
    }

    try {
      await ensureCsprojAndNugetFiles(paths.testsDirectory, paths.logicAppFolderPath, paths.logicAppName);
      logTelemetry(context, { nugetConfigFileCreated: 'true' });
    } catch (nugetError) {
      const nugetConfigFailReason = parseError(nugetError).message;
      logTelemetry(context, { nugetConfigFileCreated: 'false', nugetConfigFailReason });
      throw nugetError;
    }

    try {
      ext.outputChannel.appendLog(localize('checkingWorkspace', 'Checking if tests directory is already part of the workspace...'));
      await ensureDirectoryInWorkspace(paths.testsDirectory);
      context.telemetry.properties.testsFolderAddedToWorkspace = 'true';
      ext.outputChannel.appendLog(localize('workspaceUpdated', 'Tests directory added to workspace if not already included.'));
    } catch (workspaceError) {
      const testsFolderFailReason = parseError(workspaceError).message;
      logTelemetry(context, { testsFolderAddedToWorkspace: 'false', testsFolderFailReason });
      ext.outputChannel.appendLog(
        localize('error.addingTestsDirectory', `Error adding tests directory to workspace: ${parseError(workspaceError).message}`)
      );
      throw workspaceError;
    }

    vscode.window.showInformationMessage(
      localize('info.generateCodefulUnitTest', `Generated unit test "${unitTestName}" in "${paths.unitTestFolderPath}"`)
    );
    logTelemetry(context, { unitTestGenerationStatus: 'Success' });
    context.telemetry.measurements.generateCodefulUnitTestMs = Date.now() - startTime;
  } catch (methodError) {
    context.telemetry.properties.unitTestGenerationStatus = 'Failed';
    const errorMessage = parseErrorBeforeTelemetry(methodError);
    logTelemetry(context, { errorMessage });
    vscode.window.showErrorMessage(localize('error.generateCodefulUnitTest', `Failed to generate codeful unit test: ${errorMessage}`));
    ext.outputChannel.appendLog(localize('error.generateCodefulUnitTest', `Failed to generate codeful unit test: ${errorMessage}`));
    throw methodError;
  }
}
