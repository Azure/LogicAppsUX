/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import {
  createCsFile,
  createTestSettingsConfigFile,
  createTestExecutorFile,
  ensureCsproj,
  updateCsprojFile,
  getUnitTestPaths,
  handleError,
  logError,
  logSuccess,
  logTelemetry,
  parseUnitTestOutputs,
  promptForUnitTestName,
  selectWorkflowNode,
  processAndWriteMockableOperations,
  updateSolutionWithProject,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspaceFolder } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { type IActionContext, callWithTelemetryAndErrorHandling, parseError } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { ext } from '../../../../extensionVariables';
import { ConvertToWorkspace } from '../../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';

/**
 * Creates a unit test for a Logic App workflow (codeful only), with telemetry logging and error handling.
 * @param {IAzureConnectorsContext} context - The context object for Azure Connectors.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {any} unitTestDefinition - The definition of the unit test.
 * @returns {Promise<void>} - A Promise that resolves when the unit test is created.
 */
export async function saveBlankUnitTest(
  context: IAzureConnectorsContext,
  node: vscode.Uri | undefined,
  unitTestDefinition: any
): Promise<void> {
  const startTime = Date.now();

  // Initialize telemetry properties
  logTelemetry(context, {
    workspaceLocated: 'false',
    projectRootLocated: 'false',
    workflowNodeSelected: 'false',
    multiRootWorkspaceValid: 'false',
    unitTestNamePrompted: 'false',
    directoriesEnsured: 'false',
    csFileCreated: 'false',
    csprojUpdated: 'false',
    workspaceUpdated: 'false',
    unitTestDefinitionParsed: 'false',
    operationInfoExists: 'false',
    outputParametersExists: 'false',
    workflowNodePath: '',
    workflowTestFolderPathResolved: 'false',
    mockOutputsFolderPathCreated: 'false',
    mockableOperationsFound: '0',
    mockableOperationsProcessed: '0',
    mockableTriggersProcessed: '0',
    csFilesGenerated: '0',
    csFileGenerationFailures: '0',
    workspaceUpdatedStatus: 'false',
    workspaceUpdateFailureReason: '',
    unitTestSaveStatus: 'InProgress',
    unitTestSaveFailureReason: '',
  });

  try {
    // Get workspace and project root
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

    if (!(await ConvertToWorkspace(context))) {
      logTelemetry(context, {
        multiRootWorkspaceValid: 'false',
      });
      ext.outputChannel.appendLog(
        localize('createBlankUnitTestCancelled', 'Exiting blank unit test creation, a workspace is required to create blank unit tests.')
      );
      return;
    }

    logTelemetry(context, {
      multiRootWorkspaceValid: 'true',
      workspaceLocated: 'true',
      projectRootLocated: 'true',
    });

    // Get parsed outputs
    const parsedOutputs = await parseUnitTestOutputs(unitTestDefinition);
    const operationInfo = parsedOutputs['operationInfo'];
    const outputParameters = parsedOutputs['outputParameters'];

    logTelemetry(context, {
      operationInfoExists: operationInfo ? 'true' : 'false',
      outputParametersExists: outputParameters ? 'true' : 'false',
    });

    // Determine workflow node
    const workflowNode = node ? (getWorkflowNode(node) as vscode.Uri) : await selectWorkflowNode(context, projectPath);
    logTelemetry(context, {
      workflowNodeSelected: 'true',
      workflowNodePath: workflowNode ? workflowNode.fsPath : '',
    });

    const workflowName = path.basename(path.dirname(workflowNode.fsPath));

    // Prompt for unit test name
    const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);
    logTelemetry(context, {
      unitTestNamePrompted: 'true',
    });
    ext.outputChannel.appendLog(localize('unitTestNameEntered', `Unit test name entered: ${unitTestName}`));

    const { unitTestFolderPath, logicAppName, workflowTestFolderPath, logicAppTestFolderPath, testsDirectory } = getUnitTestPaths(
      projectPath,
      workflowName,
      unitTestName
    );
    // Retrieve necessary paths
    // Indicate that we resolved the folder path
    logTelemetry(context, {
      workflowTestFolderPathResolved: workflowTestFolderPath ? 'true' : 'false',
    });

    // Ensure required directories exist
    await fs.ensureDir(unitTestFolderPath);
    await fs.ensureDir(workflowTestFolderPath);
    const { foundActionMocks, foundTriggerMocks } = await processAndWriteMockableOperations(
      operationInfo,
      outputParameters,
      workflowNode.fsPath,
      workflowTestFolderPath,
      workflowName,
      logicAppName
    );

    // Log telemetry before proceeding
    logTelemetry(context, { workflowName, unitTestName });

    // Save the unit test
    await callWithTelemetryAndErrorHandling('logicApp.saveBlankUnitTest', async (telemetryContext: IActionContext) => {
      Object.assign(telemetryContext, context);
      await generateBlankCodefulUnitTest(context, projectPath, workflowName, unitTestName, foundActionMocks, foundTriggerMocks);
    });

    logTelemetry(context, {
      unitTestSaveStatus: 'Success',
      unitTestProcessingTimeMs: (Date.now() - startTime).toString(),
    });
    try {
      // Construct the path for the .csproj file using the logic app test folder
      const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);
      ext.outputChannel.appendLog(`Updating solution in tests folder: ${unitTestFolderPath}`);
      await updateSolutionWithProject(testsDirectory, csprojFilePath);
    } catch (solutionError) {
      ext.outputChannel.appendLog(`Failed to update solution: ${solutionError}`);
    }
  } catch (error) {
    // Handle errors using the helper function
    logTelemetry(context, {
      unitTestGenerationStatus: 'Failed',
      errorMessage: parseError(error).message,
    });
    handleError(context, error, 'saveBlankUnitTest');
  }
}

/**
 * Generates a codeful unit test by calling the backend API, unzipping the response, and creating the .cs file.
 * @param {IAzureConnectorsContext} context - The context for Azure Connectors.
 * @param {string} projectPath - The path to the project directory.
 * @param {string} workflowName - The name of the workflow for which the test is being created.
 * @param {string} unitTestName - The name of the unit test to be created.
 * @returns {Promise<void>} - A promise that resolves when the unit test has been generated.
 */
async function generateBlankCodefulUnitTest(
  context: IAzureConnectorsContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  foundActionMocks: Record<string, string>,
  foundTriggerMocks: Record<string, string>
): Promise<void> {
  try {
    // Get required paths
    const { testsDirectory, logicAppName, logicAppTestFolderPath, workflowTestFolderPath, unitTestFolderPath } = getUnitTestPaths(
      projectPath,
      workflowName,
      unitTestName
    );

    ext.outputChannel.appendLog(
      localize(
        'pathsResolved',
        'Resolved paths for unit test generation. Workflow Name: {0}, Unit Test Name: {1}',
        workflowName,
        unitTestName
      )
    );

    // Get cleaned versions of strings
    const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
    const cleanedWorkflowName = workflowName.replace(/-/g, '_');
    const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

    // Ensure directories exist
    ext.outputChannel.appendLog(localize('ensuringDirectories', 'Ensuring required directories exist...'));
    await Promise.all([fs.ensureDir(logicAppTestFolderPath), fs.ensureDir(workflowTestFolderPath), fs.ensureDir(unitTestFolderPath)]);

    // Create the testSettings.config file for the unit test
    ext.outputChannel.appendLog(localize('creatingTestSettingsConfig', 'Creating testSettings.config file for unit test...'));
    await createTestSettingsConfigFile(workflowTestFolderPath, workflowName, logicAppName);
    await createTestExecutorFile(logicAppTestFolderPath, cleanedLogicAppName);

    // Get the first actionMock in foundActionMocks
    const [actionName, actionOutputClassName] = Object.entries(foundActionMocks)[0] || [];
    // Get the first actionMock in foundActionMocks
    const [, triggerOutputClassName] = Object.entries(foundTriggerMocks)[0] || [];
    // Create actionMockClassName by replacing "Output" with "Mock" in actionOutputClassName
    const actionMockClassName = actionOutputClassName?.replace(/(.*)Output$/, '$1Mock');
    const triggerMockClassName = triggerOutputClassName.replace(/(.*)Output$/, '$1Mock');
    // Create the .cs file for the unit test
    ext.outputChannel.appendLog(localize('creatingCsFile', 'Creating .cs file for unit test...'));
    await createCsFile(
      unitTestFolderPath,
      unitTestName,
      cleanedUnitTestName,
      workflowName,
      cleanedWorkflowName,
      logicAppName,
      cleanedLogicAppName,
      actionName,
      actionOutputClassName,
      actionMockClassName,
      triggerOutputClassName,
      triggerMockClassName,
      true
    );
    logTelemetry(context, { csFileCreated: 'true' });

    // Ensure .csproj file exists
    ext.outputChannel.appendLog(localize('ensuringCsproj', 'Ensuring .csproj file exists...'));
    await ensureCsproj(testsDirectory, logicAppTestFolderPath, logicAppName);
    logTelemetry(context, { csprojValid: 'true' });
    ext.outputChannel.appendLog(localize('csprojEnsured', 'Ensured .csproj file.'));

    // Update .csproj file with content include for the workflow
    const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);
    const isCsprojUpdated = await updateCsprojFile(csprojFilePath, workflowName);
    logTelemetry(context, { csprojUpdated: isCsprojUpdated ? 'true' : 'false' });

    // Add testsDirectory to workspace if not already included
    ext.outputChannel.appendLog(localize('checkingWorkspace', 'Checking if tests directory is already part of the workspace...'));
    try {
      await ensureDirectoryInWorkspace(testsDirectory);
      ext.outputChannel.appendLog(localize('workspaceUpdated', 'Tests directory added to workspace if not already included.'));
      logTelemetry(context, {
        workspaceUpdatedStatus: 'true',
      });
    } catch (workspaceError) {
      const reason = parseError(workspaceError).message;
      logTelemetry(context, {
        workspaceUpdated: 'false',
        workspaceUpdatedStatus: 'false',
        workspaceUpdateFailureReason: reason,
      });
      throw workspaceError;
    }
    vscode.window.showInformationMessage(
      localize('info.generateCodefulUnitTest', 'Generated unit test "{0}" in "{1}"', unitTestName, unitTestFolderPath)
    );
    // Log success and notify the user
    const successMessage = localize('info.generateCodefulUnitTest', 'Generated unit test "{0}" in "{1}"', unitTestName, unitTestFolderPath);
    logSuccess(context, 'unitTestGenerationStatus', successMessage);
    vscode.window.showInformationMessage(successMessage);
  } catch (error: any) {
    // Log the error using helper functions
    logError(context, error, 'generateBlankCodefulUnitTest');
  }
}
