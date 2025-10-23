/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../localize';
import { convertToWorkspace } from '../../convertToWorkspace';
import {
  createTestCsFile,
  createTestExecutorFile,
  createTestSettingsConfigFile,
  ensureCsproj,
  updateCsprojFile,
  extractAndValidateRunId,
  getUnitTestPaths,
  parseErrorBeforeTelemetry,
  parseUnitTestOutputs,
  getOperationMockClassContent,
  promptForUnitTestName,
  updateTestsSln,
  validateWorkflowPath,
  selectWorkflowNode,
} from '../../../utils/unitTests/codefulUnitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspaceFolder, getWorkspacePath } from '../../../utils/workspace';
import { callWithTelemetryAndErrorHandling, type IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import axios from 'axios';
import { ext } from '../../../../extensionVariables';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import { syncCloudSettings } from '../../syncCloudSettings';
import { extensionCommand } from '../../../../constants';

/**
 * Handles the creation of a unit test for a Logic App workflow.
 * Validates input, manages workflow node selection, and triggers unit test generation.
 * @param {vscode.Uri | undefined} node - Optional URI of the workflow node.
 * @param {string | undefined} runId - Optional run ID.
 * @param {any} nodeOutputOperations - The operation info and output parameters of the workflow node.
 * @returns {Promise<void>} Resolves when the unit test creation process completes.
 */
export async function createUnitTest(node: vscode.Uri | undefined, runId?: string, nodeOutputOperations?: any): Promise<void> {
  await callWithTelemetryAndErrorHandling(extensionCommand.createUnitTest, async (context: IActionContext) => {
    try {
      // Validate and extract Run ID
      context.telemetry.properties.lastStep = 'extractAndValidateRunId';
      const validatedRunId = await extractAndValidateRunId(runId);

      context.telemetry.properties.lastStep = 'convertToWorkspace';
      if (!(await convertToWorkspace(context))) {
        ext.outputChannel.appendLog(
          localize('createUnitTestCancelled', 'Exiting unit test creation, a workspace is required to create unit tests.')
        );
        context.telemetry.properties.result = 'Canceled';
        return;
      }

      Object.assign(context.telemetry.properties, {
        workspaceLocated: 'true',
        projectRootLocated: 'true',
        userTriggeredCreateUnitTest: 'true',
        runIdProvided: runId ? 'true' : 'false',
        hasNodeUri: node ? 'true' : 'false',
      });

      // Determine workflow node
      context.telemetry.properties.lastStep = 'getWorkflowNode';
      let workflowNode = getWorkflowNode(node) as vscode.Uri;
      let projectPath: string | undefined;
      if (workflowNode) {
        context.telemetry.properties.lastStep = 'getProjectRootFromWorkflowNode';
        const workspaceFolder = getWorkspacePath(workflowNode.fsPath);
        projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
      } else {
        context.telemetry.properties.lastStep = 'getProjectRootFromWorkspaceFolder';
        const workspaceFolder = await getWorkspaceFolder(context);
        projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
        context.telemetry.properties.lastStep = 'selectWorkflowNode';
        workflowNode = await selectWorkflowNode(context, projectPath);
      }

      try {
        context.telemetry.properties.lastStep = 'validateWorkflowPath';
        validateWorkflowPath(projectPath, workflowNode.fsPath);
      } catch (error) {
        vscode.window.showErrorMessage(`Workflow validation failed: ${error.message}`);
        context.telemetry.properties.result = 'Failed';
        context.telemetry.properties.errorMessage = error.message;
        return;
      }

      // Get workflow name and prompt for unit test name
      context.telemetry.properties.lastStep = 'promptForUnitTestName';
      const workflowName = path.basename(path.dirname(workflowNode.fsPath));
      const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);
      Object.assign(context.telemetry.properties, {
        workflowName: workflowName,
        unitTestName: unitTestName,
        runId: validatedRunId,
      });

      context.telemetry.properties.lastStep = 'generateUnitTestFromRun';
      await generateUnitTestFromRun(context, projectPath, workflowName, unitTestName, validatedRunId, nodeOutputOperations, node.fsPath);
      context.telemetry.properties.result = 'Succeeded';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.errorMessage = errorMessage;
      context.telemetry.properties['createUnitTestError'] = errorMessage;
      vscode.window.showErrorMessage(localize('createUnitTestError', 'An error occurred: {0}', errorMessage));
      ext.outputChannel.appendLog(localize('createUnitTestLog', 'Error in createUnitTest: {0}', errorMessage));
    }
  });
}

/**
/**
 * Generates a codeful unit test by calling the backend API, processing the response, and creating necessary files.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - Path to the project directory.
 * @param {string} workflowName - Name of the workflow.
 * @param {string} unitTestName - Name of the unit test.
 * @param {string} runId - Run ID.
 * @param {any} nodeOutputOperations - The operation info and output parameters of the workflow node.
 * @returns {Promise<void>} Resolves when the unit test has been generated.
 */
async function generateUnitTestFromRun(
  context: IActionContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  runId: string,
  nodeOutputOperations: any,
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
  context.telemetry.properties.lastStep = 'parseUnitTestOutputs';
  const parsedOutputs = await parseUnitTestOutputs(nodeOutputOperations);
  const operationInfo = parsedOutputs['operationInfo'];
  const outputParameters = parsedOutputs['outputParameters'];
  Object.assign(context.telemetry.properties, {
    operationInfoExists: operationInfo ? 'true' : 'false',
    outputParametersExists: outputParameters ? 'true' : 'false',
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
    ext.outputChannel.appendLog(localize('initiatingApiCall', 'Fetching unit test details from run...'));
    context.telemetry.properties.apiCallInitiated = 'true';

    context.telemetry.properties.lastStep = 'postGenerateUnitTest';
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
      context.telemetry.properties.processStage = 'API Call Completed';
    } catch (apiError) {
      const failReason = parseErrorBeforeTelemetry(apiError);
      context.telemetry.properties.apiCallSucceeded = 'false';
      context.telemetry.properties.apiCallFailReason = failReason;
      ext.outputChannel.appendLog(localize('apiCallFailedLog', `API call failed: ${context.telemetry.properties.apiCallFailReason}`));
      throw apiError;
    }

    const zipBuffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'];
    if (contentType !== 'application/zip') {
      context.telemetry.properties.apiCallSucceeded = 'false';
      throw new Error(localize('invalidResponseType', `Expected a zip file but received ${contentType}`));
    }

    context.telemetry.properties.lastStep = 'getUnitTestPaths';
    const paths = getUnitTestPaths(projectPath, workflowName, unitTestName);

    context.telemetry.properties.lastStep = 'getOperationMockClassContent';
    const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
      operationInfo,
      outputParameters,
      workflowPath,
      workflowName,
      paths.logicAppName
    );
    if (!foundTriggerMocks || Object.keys(foundTriggerMocks).length === 0) {
      throw new Error(localize('noTriggersFound', 'No trigger found in the workflow. Unit tests must include a mocked trigger.'));
    }

    // Get cleaned versions of strings
    const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
    const cleanedWorkflowName = workflowName.replace(/-/g, '_');
    const cleanedLogicAppName = paths.logicAppName.replace(/-/g, '_');

    try {
      context.telemetry.properties.lastStep = 'unzipLogicAppArtifacts';
      await fse.ensureDir(paths.unitTestFolderPath);
      ext.outputChannel.appendLog(localize('unzippingFiles', `Unzipping Mock.json into: ${paths.unitTestFolderPath}`));
      await unzipLogicAppArtifacts(zipBuffer, paths.unitTestFolderPath);
      context.telemetry.properties.processStage = 'Files Unzipped';
      context.telemetry.properties.filesUnzipped = 'true';
    } catch (unzipError) {
      const unzipFailReason = parseError(unzipError).message;
      context.telemetry.properties.filesUnzipped = 'false';
      context.telemetry.properties.filesUnzipFailReason = unzipFailReason;
      throw unzipError;
    }

    try {
      // Create the testSettings.config and TestExecutor.cs files
      ext.outputChannel.appendLog(localize('ensureTestProjectFiles', 'Ensuring test project files...'));
      context.telemetry.properties.lastStep = 'createTestSettingsConfigFile';
      await createTestSettingsConfigFile(paths.workflowTestFolderPath, workflowName, paths.logicAppName);
      context.telemetry.properties.lastStep = 'createTestExecutorFile';
      await createTestExecutorFile(paths.logicAppTestFolderPath, cleanedLogicAppName);

      const [actionName, actionOutputClassName] = Object.entries(foundActionMocks)[0] || [];
      const [, triggerOutputClassName] = Object.entries(foundTriggerMocks)[0] || [];

      // Create actionMockClassName by replacing "Output" with "Mock" in actionOutputClassName
      const actionMockClassName = actionOutputClassName?.replace(/(.*)Output$/, '$1Mock');
      const triggerMockClassName = triggerOutputClassName.replace(/(.*)Output$/, '$1Mock');

      context.telemetry.properties.lastStep = 'createMockClasses';
      await fse.ensureDir(paths.mocksFolderPath);
      for (const [mockClassName, classContent] of Object.entries(mockClassContent)) {
        const mockFilePath = path.join(paths.mocksFolderPath, `${mockClassName}.cs`);
        await fse.writeFile(mockFilePath, classContent, 'utf-8');
        ext.outputChannel.appendLog(localize('csMockFileCreated', 'Created mock class file at: "{0}".', mockFilePath));
      }

      context.telemetry.properties.lastStep = 'createTestCsFile';
      await createTestCsFile(
        paths.unitTestFolderPath!,
        unitTestName,
        cleanedUnitTestName,
        workflowName,
        cleanedWorkflowName,
        paths.logicAppName,
        cleanedLogicAppName,
        actionName,
        actionOutputClassName,
        actionMockClassName,
        triggerOutputClassName,
        triggerMockClassName
      );
      context.telemetry.properties.csFileCreated = 'true';
    } catch (csError) {
      context.telemetry.properties.csFileCreated = 'false';
      context.telemetry.properties.csFileFailReason = parseError(csError).message;
      throw csError;
    }

    try {
      await ensureCsproj(paths.logicAppTestFolderPath, paths.logicAppName);
      context.telemetry.properties.nugetConfigFileCreated = 'true';
    } catch (nugetError) {
      context.telemetry.properties.nugetConfigFileCreated = 'false';
      context.telemetry.properties.nugetConfigFailReason = parseError(nugetError).message;
      throw nugetError;
    }

    context.telemetry.properties.lastStep = 'updateCsprojFile';
    const csprojFilePath = path.join(paths.logicAppTestFolderPath, `${paths.logicAppName}.csproj`);
    const isCsprojUpdated = await updateCsprojFile(csprojFilePath, workflowName);
    context.telemetry.properties.csprojUpdated = isCsprojUpdated ? 'true' : 'false';

    try {
      context.telemetry.properties.lastStep = 'ensureTestsDirectoryInWorkspace';
      ext.outputChannel.appendLog(localize('ensureTestsDirectory', 'Ensuring tests directory exists in workspace...'));
      await ensureDirectoryInWorkspace(paths.testsDirectory);
      context.telemetry.properties.testsFolderAddedToWorkspace = 'true';
    } catch (workspaceError) {
      context.telemetry.properties.testsFolderAddedToWorkspace = 'false';
      context.telemetry.properties.testsFolderFailReason = parseError(workspaceError).message;
      ext.outputChannel.appendLog(
        localize('error.addingTestsDirectory', `Error adding tests directory to workspace: ${parseError(workspaceError).message}`)
      );
      throw workspaceError;
    }

    vscode.window.showInformationMessage(
      localize('generateCodefulUnitTest', 'Successfully created unit test "{0}" at "{1}"', unitTestName, paths.unitTestFolderPath)
    );
    context.telemetry.properties.unitTestGenerationStatus = 'Success';
    context.telemetry.measurements.generateCodefulUnitTestMs = Date.now() - startTime;
    try {
      const csprojFilePath = path.join(paths.logicAppTestFolderPath, `${paths.logicAppName}.csproj`);

      context.telemetry.properties.lastStep = 'updateTestsSln';
      ext.outputChannel.appendLog(`Updating solution in tests folder: ${paths.testsDirectory}`);
      await updateTestsSln(paths.testsDirectory, csprojFilePath);
    } catch (solutionError) {
      ext.outputChannel.appendLog(`Failed to update solution: ${solutionError}`);
    }

    context.telemetry.properties.lastStep = 'syncCloudSettings';
    await syncCloudSettings(context, vscode.Uri.file(projectPath));
  } catch (methodError) {
    context.telemetry.properties.unitTestGenerationStatus = 'Failed';
    const errorMessage = parseErrorBeforeTelemetry(methodError);
    context.telemetry.properties.errorMessage = errorMessage;
    vscode.window.showErrorMessage(localize('error.generateCodefulUnitTest', `Failed to generate codeful unit test: ${errorMessage}`));
    ext.outputChannel.appendLog(localize('error.generateCodefulUnitTest', `Failed to generate codeful unit test: ${errorMessage}`));
    throw methodError;
  }
}
