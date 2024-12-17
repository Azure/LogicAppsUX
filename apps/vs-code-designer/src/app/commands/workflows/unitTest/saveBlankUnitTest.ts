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
import { ext } from '../../../../extensionVariables';
import { FileManagement } from '../../generateDeploymentScripts/iacGestureHelperFunctions';

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

  // Determine the workflow node
  if (node) {
    workflowNode = getWorkflowNode(node) as vscode.Uri;
  } else {
    const workflow = await pickWorkflow(context, projectPath);
    workflowNode = vscode.Uri.file(workflow.data) as vscode.Uri;
  }
  const workflowName = path.basename(path.dirname(workflowNode.fsPath));

  if (isMultiRootWorkspace()) {
    const unitTestName = await context.ui.showInputBox({
      prompt: localize('unitTestNamePrompt', 'Provide a unit test name'),
      placeHolder: localize('unitTestNamePlaceholder', 'Unit test name'),
      validateInput: async (name: string): Promise<string | undefined> => await validateUnitTestName(projectPath, workflowName, name),
    });

    ext.outputChannel.appendLog(localize('unitTestNameEntered', `Unit test name entered: ${unitTestName}`));

    // Retrieve unitTestFolderPath from our helper
    const { unitTestFolderPath, logicAppName } = getUnitTestPaths(projectPath, workflowName, unitTestName);

    // Ensure directories exist
    await fs.ensureDir(unitTestFolderPath!);

    // Process mockable operations and write C# classes
    await processAndWriteMockableOperations(operationInfo, outputParameters, unitTestFolderPath!, logicAppName);

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
    }
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
    // Destructure testsDirectory in addition to other paths
    const { testsDirectory, logicAppName, logicAppFolderPath, workflowFolderPath, unitTestFolderPath } = getUnitTestPaths(
      projectPath,
      workflowName,
      unitTestName
    );

    // Ensure the required directories exist
    await fs.ensureDir(logicAppFolderPath);
    await fs.ensureDir(workflowFolderPath);
    await fs.ensureDir(unitTestFolderPath!);

    const csprojFilePath = path.join(logicAppFolderPath, `${logicAppName}.csproj`);

    await createCsFile(unitTestFolderPath!, unitTestName, workflowName);

    // Generate the .csproj file if it doesn't exist
    if (!(await fs.pathExists(csprojFilePath))) {
      ext.outputChannel.appendLog(localize('creatingCsproj', 'Creating .csproj file at: {0}', csprojFilePath));
      await createCsprojFile(csprojFilePath, logicAppName);
    }

    vscode.window.showInformationMessage(
      localize('info.generateCodefulUnitTest', 'Generated unit test "{0}" in "{1}"', unitTestName, unitTestFolderPath)
    );

    // Check if testsDirectory is already part of the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const isTestsDirectoryInWorkspace = workspaceFolders.some((folder) => folder.uri.fsPath === testsDirectory);

    if (!isTestsDirectoryInWorkspace) {
      // Add testsDirectory to workspace if not already included
      ext.outputChannel.appendLog(localize('addingTestsDirectory', 'Adding tests directory to workspace: {0}', testsDirectory));
      FileManagement.addFolderToWorkspace(testsDirectory);
    }

    context.telemetry.properties.unitTestGenerationStatus = 'Success';
  } catch (error: any) {
    context.telemetry.properties.unitTestGenerationStatus = 'Failed';

    if (error.code) {
      context.telemetry.properties.networkErrorCode = error.code;
    }
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

/**
 * Filters mockable operations, transforms their output parameters, and writes C# class definitions to .cs files.
 * @param {any} operationInfo - The operation info object.
 * @param {any} outputParameters - The output parameters object.
 * @param {string} unitTestFolderPath - The directory where the .cs files will be saved.
 * @param {string} logicAppName - The name of the Logic App to use as the namespace.
 */
async function processAndWriteMockableOperations(
  operationInfo: any,
  outputParameters: any,
  unitTestFolderPath: string,
  logicAppName: string
): Promise<void> {
  const mockableActionTypes = new Set<string>(['Http', 'InvokeFunction', 'Function', 'ServiceProvider', 'ApiManagement', 'ApiConnection']);

  const mockableTriggerTypes = new Set<string>(['HttpWebhook', 'Request', 'Manual', 'ApiConnectionWebhook', 'ServiceProvider']);

  function isMockable(type: string, isTrigger: boolean): boolean {
    return isTrigger ? mockableTriggerTypes.has(type) : mockableActionTypes.has(type);
  }

  function transformParameters(params: any): any {
    const allowedFields = ['type', 'title', 'format', 'description'];
    const result: any = {};

    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const cleanedKey = key.replace(/outputs\.\$\.|body\.\$\.?/g, '');
        const keys = cleanedKey.split('.');

        keys.reduce((acc, part, index) => {
          if (index === keys.length - 1) {
            acc[part] = Object.keys(params[key]).reduce((filtered: any, fieldKey) => {
              if (allowedFields.includes(fieldKey)) {
                filtered[fieldKey] = params[key][fieldKey];
              }
              return filtered;
            }, {});
          } else {
            acc[part] = acc[part] || {};
          }
          return acc[part];
        }, result);
      }
    }

    return result;
  }

  for (const operationName in operationInfo) {
    const operation = operationInfo[operationName];
    const type = operation.type;
    const isTrigger = ['HttpWebhook', 'Request', 'Manual', 'ApiConnectionWebhook'].includes(type);

    if (isMockable(type, isTrigger)) {
      const className = toPascalCase(operationName);
      const outputs = transformParameters(outputParameters[operationName]?.outputs || {});
      const classContent = generateCSharpClass(className, logicAppName, outputs);
      const filePath = path.join(unitTestFolderPath, `${className}.cs`);

      await fs.writeFile(filePath, classContent, 'utf-8');
      ext.outputChannel.appendLog(localize('csFileCreated', 'Created .cs file at: {0}', filePath));
    }
  }
}

/**
 * Generates a C# class definition based on the provided class name, namespace, and output fields.
 * @param {string} className - The name of the C# class.
 * @param {string} namespaceName - The namespace for the C# class.
 * @param {any} outputs - The transformed output parameters.
 * @returns {string} - The C# class definition as a string.
 */
function generateCSharpClass(className: string, namespaceName: string, outputs: any): string {
  let classDef = `namespace ${namespaceName}\n{\n    public class ${className}\n    {\n`;

  for (const field in outputs) {
    const fieldDetails = outputs[field];
    const fieldType = mapJsonTypeToCSharp(fieldDetails.type);
    const fieldName = toPascalCase(field);

    if (fieldDetails.description) {
      classDef += `        /// <summary>\n        /// ${fieldDetails.description}\n        /// </summary>\n`;
    }

    classDef += `        public ${fieldType} ${fieldName} { get; set; }\n\n`;
  }

  classDef += '    }\n}\n'; // Replaced template literal with string literal here
  return classDef;
}

/**
 * Converts a string to PascalCase.
 * @param {string} str - The input string.
 * @returns {string} - The PascalCase version of the string.
 */
function toPascalCase(str: string): string {
  return str.replace(/(^\w|_\w)/g, (match) => match.replace('_', '').toUpperCase());
}

/**
 * Maps JSON types to corresponding C# types.
 * @param {string} jsonType - The JSON type (e.g., "string", "object", "array").
 * @returns {string} - The corresponding C# type.
 */
function mapJsonTypeToCSharp(jsonType: string): string {
  switch (jsonType) {
    case 'string':
      return 'string';
    case 'integer':
      return 'int';
    case 'number':
      return 'double';
    case 'boolean':
      return 'bool';
    case 'array':
      return 'List<object>';
    case 'object':
      return 'JObject';
    case 'any':
      return 'object';
    case 'date-time':
      return 'DateTime';
    default:
      return 'object';
  }
}

/**
 * Returns standardized paths for unit test generation.
 * The structure is the same as originally used in generateBlankCodefulUnitTest.
 *
 * @param {string} projectPath - The base project path.
 * @param {string} workflowName - The workflow name.
 * @param {string | undefined} unitTestName - The unit test name, if any.
 * @returns An object containing testsDirectory, logicAppName, logicAppFolderPath, workflowFolderPath, and optionally unitTestFolderPath.
 */
function getUnitTestPaths(
  projectPath: string,
  workflowName: string,
  unitTestName?: string
): {
  testsDirectory: string;
  logicAppName: string;
  logicAppFolderPath: string;
  workflowFolderPath: string;
  unitTestFolderPath?: string;
} {
  const testsDirectoryUri = getTestsDirectory(projectPath);
  const testsDirectory = testsDirectoryUri.fsPath;

  // This logic for deriving logicAppName matches what generateBlankCodefulUnitTest currently uses
  const logicAppName = path.basename(path.dirname(path.join(projectPath, workflowName)));

  const logicAppFolderPath = path.join(testsDirectory, logicAppName);
  const workflowFolderPath = path.join(logicAppFolderPath, workflowName);

  const paths = {
    testsDirectory,
    logicAppName,
    logicAppFolderPath,
    workflowFolderPath,
  };

  if (unitTestName) {
    paths['unitTestFolderPath'] = path.join(workflowFolderPath, unitTestName);
  }

  return paths;
}
