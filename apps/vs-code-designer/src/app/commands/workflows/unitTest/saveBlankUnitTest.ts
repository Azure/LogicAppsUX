/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import {
  createCsFile,
  ensureCsprojAndNugetFiles,
  getUnitTestPaths,
  handleError,
  logError,
  logSuccess,
  logTelemetry,
  parseUnitTestOutputs,
  processUnitTestDefinition,
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
import { ext } from '../../../../extensionVariables';

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
    workflowFolderPathResolved: 'false',
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

    logTelemetry(context, {
      workspaceLocated: 'true',
      projectRootLocated: 'true',
    });

    // Get parsed outputs
    await parseUnitTestOutputs(unitTestDefinition);
    const operationInfo = unitTestDefinition['operationInfo'];
    const outputParameters = unitTestDefinition['outputParameters'];

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

    // Check if in a multi-root workspace
    if (!isMultiRootWorkspace()) {
      logTelemetry(context, {
        multiRootWorkspaceValid: 'false',
      });
      const message = localize(
        'expectedWorkspace',
        'A multi-root workspace must be open to create unit tests. Please use the "Create New Logic App Workspace" command.'
      );
      ext.outputChannel.appendLog(message);
      throw new Error(message);
    }

    logTelemetry(context, {
      multiRootWorkspaceValid: 'true',
    });

    // Prompt for unit test name
    const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);
    logTelemetry(context, {
      unitTestNamePrompted: 'true',
    });
    ext.outputChannel.appendLog(localize('unitTestNameEntered', `Unit test name entered: ${unitTestName}`));

    // Retrieve necessary paths
    const { unitTestFolderPath, logicAppName, workflowFolderPath } = getUnitTestPaths(projectPath, workflowName, unitTestName);
    // Indicate that we resolved the folder path
    logTelemetry(context, {
      workflowFolderPathResolved: workflowFolderPath ? 'true' : 'false',
    });

    // Ensure required directories exist
    await fs.ensureDir(unitTestFolderPath);
    await fs.ensureDir(workflowFolderPath);

    // Process operations and write C# classes
    //await processAndWriteMockableOperations(operationInfo, outputParameters, workflowFolderPath, logicAppName);

    await processUnitTestDefinition(unitTestDefinition, workflowFolderPath, logicAppName);

    // Log telemetry before proceeding
    logTelemetry(context, { workflowName, unitTestName });

    // Save the unit test
    await callWithTelemetryAndErrorHandling('logicApp.saveBlankUnitTest', async (telemetryContext: IActionContext) => {
      Object.assign(telemetryContext, context);
      await generateBlankCodefulUnitTest(context, projectPath, workflowName, unitTestName);
    });

    logTelemetry(context, {
      unitTestSaveStatus: 'Success',
      unitTestProcessingTimeMs: (Date.now() - startTime).toString(),
    });
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
  unitTestName: string
): Promise<void> {
  try {
    // Get required paths
    const { testsDirectory, logicAppName, logicAppFolderPath, workflowFolderPath, unitTestFolderPath } = getUnitTestPaths(
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

    // Ensure directories exist
    ext.outputChannel.appendLog(localize('ensuringDirectories', 'Ensuring required directories exist...'));
    await Promise.all([fs.ensureDir(logicAppFolderPath), fs.ensureDir(workflowFolderPath), fs.ensureDir(unitTestFolderPath!)]);

    // Create the .cs file for the unit test
    ext.outputChannel.appendLog(localize('creatingCsFile', 'Creating .cs file for unit test...'));
    await createCsFile(unitTestFolderPath!, unitTestName, workflowName, logicAppName);
    logTelemetry(context, { csFileCreated: 'true' });

    // Ensure .csproj and NuGet files exist
    ext.outputChannel.appendLog(localize('ensuringCsproj', 'Ensuring .csproj and NuGet configuration files exist...'));
    await ensureCsprojAndNugetFiles(testsDirectory, logicAppFolderPath, logicAppName);
    logTelemetry(context, { csprojValid: 'true' });
    ext.outputChannel.appendLog(localize('csprojEnsured', 'Ensured .csproj and NuGet configuration files.'));

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
