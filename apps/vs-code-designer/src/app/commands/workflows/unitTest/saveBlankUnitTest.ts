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
  await parseUnitTestOutputs(unitTestDefinition);
  const operationInfo = unitTestDefinition['operationInfo'];
  const outputParameters = unitTestDefinition['outputParameters'];

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

    // Retrieve unitTestFolderPath from helper
    const { unitTestFolderPath, logicAppName } = getUnitTestPaths(projectPath, workflowName, unitTestName);
    await fs.ensureDir(unitTestFolderPath!);

    // Process mockable operations and write C# classes
    await processAndWriteMockableOperations(operationInfo, outputParameters, unitTestFolderPath!, logicAppName);

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

/**
 * Parses and transforms raw output parameters from a unit test definition into a structured format.
 * @param {any} unitTestDefinition - The unit test definition object containing operation info and raw output parameters.
 * @returns {Promise<{ operationInfo: any; outputParameters: Record<string, any>; }>}
 * - A Promise that resolves to a structured object containing operation info and transformed output parameters.
 */
async function parseUnitTestOutputs(unitTestDefinition: any): Promise<{
  operationInfo: any;
  outputParameters: Record<string, any>;
}> {
  // Define the fields allowed to be included in the transformed output
  const allowedFields = ['type', 'title', 'format', 'description'];

  /**
   * Transforms raw output objects by cleaning keys and filtering fields.
   * @param {any} rawOutput - The raw output object to transform.
   * @returns {Record<string, any>}
   * - A transformed object with cleaned keys and filtered fields.
   */
  const transformRawOutputs = (rawOutput: any): Record<string, any> => {
    const transformedOutput: Record<string, any> = {};

    for (const rawKey in rawOutput) {
      if (Object.prototype.hasOwnProperty.call(rawOutput, rawKey)) {
        // Clean the key by removing unwanted prefixes and suffixes
        const cleanedKey = rawKey.replace('outputs.$.', '').replace('.$.', '.').replace('$.', '').replace('.$', '');

        const keyParts = cleanedKey.split('.');

        // Build the nested structure for the cleaned key
        keyParts.reduce((nestedObject, part, index) => {
          if (index === keyParts.length - 1) {
            if (
              Object.prototype.hasOwnProperty.call(nestedObject, part) &&
              typeof nestedObject[part] === 'object' &&
              typeof rawOutput[rawKey] === 'object'
            ) {
              // Merge fields for existing nested keys
              nestedObject[part] = {
                ...nestedObject[part],
                ...Object.keys(rawOutput[rawKey]).reduce((filteredFields, fieldKey) => {
                  if (allowedFields.includes(fieldKey)) {
                    (filteredFields as Record<string, any>)[fieldKey] = rawOutput[rawKey][fieldKey];
                  }
                  return filteredFields;
                }, {}),
              };
            } else {
              // Add filtered fields for new keys
              nestedObject[part] = Object.keys(rawOutput[rawKey]).reduce((filteredFields, fieldKey) => {
                if (allowedFields.includes(fieldKey)) {
                  (filteredFields as Record<string, any>)[fieldKey] = rawOutput[rawKey][fieldKey];
                }
                return filteredFields;
              }, {});
            }
          } else {
            // Create nested objects for intermediate keys
            nestedObject[part] = nestedObject[part] || {};
          }
          return nestedObject[part];
        }, transformedOutput);
      }
    }

    return transformedOutput;
  };

  // Initialize the structured output object
  const parsedOutputs: { operationInfo: any; outputParameters: any } = {
    operationInfo: unitTestDefinition['operationInfo'],
    outputParameters: {},
  };

  // Process each output parameter
  for (const parameterKey in unitTestDefinition['outputParameters']) {
    parsedOutputs.outputParameters[parameterKey] = {
      outputs: transformRawOutputs(unitTestDefinition['outputParameters'][parameterKey].outputs),
    };
  }

  return parsedOutputs;
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
 * Set of action types that can be mocked.
 */
const mockableActionTypes = new Set<string>(['Http', 'InvokeFunction', 'Function', 'ServiceProvider', 'ApiManagement', 'ApiConnection']);

/**
 * Set of trigger types that can be mocked.
 */
const mockableTriggerTypes = new Set<string>(['HttpWebhook', 'Request', 'Manual', 'ApiConnectionWebhook', 'ServiceProvider']);

/**
 * Determines if a given operation type (and whether it is a trigger or not) can be mocked.
 * @param type - The operation type.
 * @param isTrigger - Whether the operation is a trigger.
 * @returns True if the operation is mockable, false otherwise.
 */
function isMockable(type: string, isTrigger: boolean): boolean {
  return isTrigger ? mockableTriggerTypes.has(type) : mockableActionTypes.has(type);
}

/**
 * Transforms the output parameters object by cleaning keys and keeping only certain fields.
 * @param params - The parameters object.
 * @returns A transformed object with cleaned keys and limited fields.
 */
export function transformParameters(params: any): any {
  const allowedFields = ['type', 'title', 'format', 'description'];
  const result: any = {};

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      // STEP 1: Clean up the key.
      const cleanedKey = key
        .replace(/^outputs\.\$\./, '') // remove "outputs.$." prefix
        .replace(/^outputs\.\$$/, '') // remove "outputs.$" prefix
        .replace(/^body\.\$\./, 'body.') // replace "body.$." prefix with "body."
        .replace(/^body\.\$$/, 'body'); // replace "body.$" prefix with "body"

      // STEP 2: Split on '.' to build or traverse nested keys.
      const keys = cleanedKey.split('.');
      keys.reduce((acc, part, index) => {
        const isLastPart = index === keys.length - 1;

        if (isLastPart) {
          if (!acc[part]) {
            acc[part] = {};
          }

          // Filter the fields in params[key] to keep only those in allowedFields.
          const filteredFields = Object.keys(params[key]).reduce((filtered: any, fieldKey) => {
            if (allowedFields.includes(fieldKey)) {
              filtered[fieldKey] = params[key][fieldKey];
            }
            return filtered;
          }, {});

          // Merge these filtered fields into the existing object at acc[part].
          acc[part] = { ...acc[part], ...filteredFields };
        } else if (!acc[part]) {
          // Combine into `else if`
          // Not the last segment: ensure the path is an object so we can keep nesting.
          acc[part] = {};
        }

        return acc[part];
      }, result);
    }
  }

  return result;
}

/**
 * Filters mockable operations, transforms their output parameters,
 * and writes C# class definitions to .cs files.
 * @param operationInfo - The operation info object.
 * @param outputParameters - The output parameters object.
 * @param unitTestFolderPath - The directory where the .cs files will be saved.
 * @param logicAppName - The name of the Logic App to use as the namespace.
 */
export async function processAndWriteMockableOperations(
  operationInfo: any,
  outputParameters: any,
  unitTestFolderPath: string,
  logicAppName: string
): Promise<void> {
  for (const operationName in operationInfo) {
    const operation = operationInfo[operationName];
    const type = operation.type;

    // For triggers, check if it's one of these types:
    const isTrigger = ['HttpWebhook', 'Request', 'Manual', 'ApiConnectionWebhook'].includes(type);

    // Only proceed if this operation type is mockable
    if (isMockable(type, isTrigger)) {
      const className = toPascalCase(operationName);

      // Transform the output parameters for this operation
      const outputs = transformParameters(outputParameters[operationName]?.outputs || {});

      // Generate C# class content (assuming generateCSharpClasses returns a string)
      const classContent = generateCSharpClasses(logicAppName, className, outputs);

      // Write the .cs file
      const filePath = path.join(unitTestFolderPath, `${className}.cs`);
      await fs.writeFile(filePath, classContent, 'utf-8');

      // Log to output channel
      ext.outputChannel.appendLog(localize('csFileCreated', 'Created .cs file at: {0}', filePath));
    }
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

/**
 * Generates a C# class definition as a string.
 * @param {string} logicAppName - The name of the Logic App, used as the namespace.
 * @param {string} className - The name of the class to generate.
 * @param {any} outputs - The outputs object containing properties to include in the class.
 * @returns {string} - The generated C# class definition.
 */
function generateCSharpClasses(logicAppName: string, className: string, outputs: any): string {
  // Start building the class definition
  let classDefinition = 'using System;\nusing System.Collections.Generic;\nusing Newtonsoft.Json.Linq;\n\n';
  classDefinition += `namespace ${logicAppName} {\n`;
  classDefinition += `    public class ${className} {\n`;

  // Generate properties for the class based on the outputs
  for (const key in outputs) {
    if (Object.prototype.hasOwnProperty.call(outputs, key)) {
      const jsonType = outputs[key]?.type || 'object'; // Default to 'object' if type is not defined
      const propertyType = mapJsonTypeToCSharp(jsonType);
      const propertyName = toPascalCase(key);

      // Add the property to the class definition
      classDefinition += `        public ${propertyType} ${propertyName} { get; set; }\n`;
    }
  }

  // Close the class and namespace
  classDefinition += '    }\n';
  classDefinition += '}\n';

  return classDefinition;
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
      return 'JObject';
  }
}

/**
 * Converts a string to PascalCase.
 * @param {string} str - The input string.
 * @returns {string} - The PascalCase version of the string.
 */
function toPascalCase(str: string): string {
  return str.replace(/(^\w|_\w)/g, (match) => match.replace('_', '').toUpperCase());
}
