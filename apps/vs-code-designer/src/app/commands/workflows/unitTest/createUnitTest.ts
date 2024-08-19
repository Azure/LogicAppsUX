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
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import type { IAzureQuickPickItem, IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';

/**
 * Creates a unit test for a Logic App workflow.
 * @param {IAzureConnectorsContext} context - The context object for Azure Connectors.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {string | undefined} runId - The ID of the run, if available.
 * @returns A Promise that resolves when the unit test is created.
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

    //Ask user to choose between codeless and codeful scenarios
    const scenarioChoice = await context.ui.showQuickPick(
      [
        { label: 'Codeless', description: 'Create unit test using designer' },
        { label: 'Codeful', description: 'Create empty C# test project' },
      ],
      { placeHolder: 'Select unit test creation method' }
    );

    if (scenarioChoice.label === 'Codeless') {
      const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName, null, runId);
      await openDesignerObj?.createPanel();
    } else {
      //Create empty C# test project
      await createEmptyCSharpTestProject(context, projectPath, workflowName, unitTestName);
    }
  } else {
    vscode.window.showInformationMessage(localize('expectedWorkspace', 'In order to create unit tests, you must have a workspace open.'));
  }
}

/**
 * Prompts the user to select a workflow and returns the selected workflow.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns A promise that resolves to the selected workflow.
 */
const pickWorkflow = async (context: IActionContext, projectPath: string) => {
  const placeHolder: string = localize('selectLogicApp', 'Select workflow to create unit test');
  return await context.ui.showQuickPick(getWorkflowsPick(projectPath), { placeHolder });
};

/**
 * Retrieves the list of workflows in the local project.
 * @param {string} projectPath - The path to the local project.
 * @returns An array of Azure Quick Pick items representing the logic apps in the project.
 */
const getWorkflowsPick = async (projectPath: string) => {
  const listOfWorkflows = await getWorkflowsInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfWorkflows)).map((workflowName) => {
    return { label: workflowName, data: path.join(projectPath, workflowName, workflowFileName) };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};

/**
 * Creates an empty C# test project within the specified project directory.
 *
 * @param {IAzureConnectorsContext} context - The context for Azure Connectors.
 * @param {string} projectPath - The path to the project directory.
 * @param {string} workflowName - The name of the workflow for which the test project is being created.
 * @param {string} unitTestName - The name of the unit test to be created.
 * @returns {Promise<void>} - A promise that resolves when the test project has been created.
 */
export async function createEmptyCSharpTestProject(
  context: IAzureConnectorsContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string
): Promise<void> {
  try {
    // Get the tests directory
    const testsDirectoryUri = getTestsDirectory(projectPath);
    const testsDirectory = testsDirectoryUri.fsPath;

    const testProjectName = `${workflowName}.Tests`;
    const testProjectPath = path.join(testsDirectory, testProjectName);

    // Create test project directory
    await fs.ensureDir(testProjectPath);

    // Define template paths
    const templateFolderName = 'UnitTestTemplates';
    const csFileName = 'TestClassFile';
    const csprojFileName = 'TestProjectFile';

    // Copy and modify .cs file
    await createCsFile(testProjectPath, unitTestName, workflowName, templateFolderName, csFileName);

    // Copy and modify .csproj file
    await createCsprojFile(testProjectPath, testProjectName, templateFolderName, csprojFileName);

    vscode.window.showInformationMessage(
      localize('info.createCSharpTestProject', 'Created C# test project: {0} in {1}', testProjectName, testsDirectory)
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      localize(
        'error.createCSharpTestProject',
        'Failed to create C# test project: {0}',
        error instanceof Error ? error.message : String(error)
      )
    );
  }

  /**
   * Creates a .cs file in the specified test project path by using a template.
   *
   * @param {string} testProjectPath - The path to the test project directory.
   * @param {string} unitTestName - The name of the unit test to be created.
   * @param {string} workflowName - The name of the workflow for which the test project is being created.
   * @param {string} templateFolderName - The folder name where the template is located.
   * @param {string} csFileName - The name of the .cs file template.
   * @returns {Promise<void>} - A promise that resolves when the .cs file has been created.
   */
  async function createCsFile(
    testProjectPath: string,
    unitTestName: string,
    workflowName: string,
    templateFolderName: string,
    csFileName: string
  ): Promise<void> {
    const templatePath = path.join(__dirname, 'assets', templateFolderName, csFileName);

    //TODO[Sami]:Update template content per SDK contents
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csFilePath = path.join(testProjectPath, `${unitTestName}.cs`);
    const csFileContent = templateContent.replace(/<%= unitTestName %>/g, unitTestName).replace(/<%= workflowName %>/g, workflowName);
    await fs.writeFile(csFilePath, csFileContent);
  }

  /**
   * Creates a .csproj file in the specified test project path by using a template.
   *
   * @param {string} testProjectPath - The path to the test project directory.
   * @param {string} testProjectName - The name of the test project.
   * @param {string} templateFolderName - The folder name where the template is located.
   * @param {string} csprojFileName - The name of the .csproj file template.
   * @returns {Promise<void>} - A promise that resolves when the .csproj file has been created.
   */
  async function createCsprojFile(
    testProjectPath: string,
    testProjectName: string,
    templateFolderName: string,
    csprojFileName: string
  ): Promise<void> {
    const templatePath = path.join(__dirname, 'assets', templateFolderName, csprojFileName);
    //TODO [Sami]: Update template content per SDK contents
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const csprojFilePath = path.join(testProjectPath, `${testProjectName}.csproj`);
    const csprojFileContent = templateContent.replace(/<%= testProjectName %>/g, testProjectName);
    await fs.writeFile(csprojFilePath, csprojFileContent);
  }
}
