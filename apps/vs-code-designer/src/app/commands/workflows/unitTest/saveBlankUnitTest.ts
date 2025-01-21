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
  promptForUnitTestName,
  selectWorkflowNode,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspaceFolder, isMultiRootWorkspace } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { ext } from '../../../../extensionVariables';
import { toPascalCase } from '@microsoft/logic-apps-shared';

/**
 * Creates a unit test for a Logic App workflow (codeful only).
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
  try {
    // Get workspace and project root
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

    // Get raw parsed outputs
    await parseUnitTestOutputs(unitTestDefinition);
    const operationInfo = unitTestDefinition['operationInfo'];
    const outputParameters = unitTestDefinition['outputParameters'];

    // Determine workflow node
    const workflowNode = node ? (getWorkflowNode(node) as vscode.Uri) : await selectWorkflowNode(context, projectPath);
    const workflowName = path.basename(path.dirname(workflowNode.fsPath));

    // Check if in a multi-root workspace
    if (!isMultiRootWorkspace()) {
      const message = localize(
        'expectedWorkspace',
        'A multi-root workspace must be open to create unit tests. Please navigate to the Logic Apps extension in Visual Studio Code and use the "Create New Logic App Workspace" command to initialize and open a valid workspace.'
      );
      ext.outputChannel.appendLog(message);
      throw new Error(message);
    }

    // Prompt for unit test name
    const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);
    ext.outputChannel.appendLog(localize('unitTestNameEntered', `Unit test name entered: ${unitTestName}`));

    // Retrieve unitTestFolderPath and logic app name from helper
    const { unitTestFolderPath, logicAppName } = getUnitTestPaths(projectPath, workflowName, unitTestName);
    await fs.ensureDir(unitTestFolderPath!);

    // Process mockable operations and write C# classes
    await processAndWriteMockableOperations(operationInfo, outputParameters, unitTestFolderPath!, logicAppName);
    logTelemetry(context, { workflowName, unitTestName });

    // Save the unit test
    await callWithTelemetryAndErrorHandling('logicApp.saveBlankUnitTest', async (telemetryContext: IActionContext) => {
      Object.assign(telemetryContext, context);
      await generateBlankCodefulUnitTest(context, projectPath, workflowName, unitTestName);
    });
  } catch (error) {
    // Handle errors using the helper function
    handleError(context, error, 'saveBlankUnitTest');
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

    // Ensure .csproj and NuGet files exist
    ext.outputChannel.appendLog(localize('ensuringCsproj', 'Ensuring .csproj and NuGet configuration files exist...'));
    await ensureCsprojAndNugetFiles(testsDirectory, logicAppFolderPath, logicAppName);
    ext.outputChannel.appendLog(localize('csprojEnsured', 'Ensured .csproj and NuGet configuration files.'));

    // Add testsDirectory to workspace if not already included
    ext.outputChannel.appendLog(localize('checkingWorkspace', 'Checking if tests directory is already part of the workspace...'));
    await ensureDirectoryInWorkspace(testsDirectory);
    ext.outputChannel.appendLog(localize('workspaceUpdated', 'Tests directory added to workspace if not already included.'));

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
      // Clean up the key.
      const cleanedKey = key
        .replace(/^outputs\.\$\./, '') // remove "outputs.$." prefix
        .replace(/^outputs\.\$$/, '') // remove "outputs.$" prefix
        .replace(/^body\.\$\./, 'body.') // replace "body.$." prefix with "body."
        .replace(/^body\.\$$/, 'body'); // replace "body.$" prefix with "body"

      // Split on '.' to build or traverse nested keys.
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

      // Replace char in namepsace var to compile c# file
      const sanitizedLogicAppName = logicAppName.replace(/-/g, '_');

      // Generate C# class content (assuming generateCSharpClasses returns a string)
      const classContent = generateCSharpClasses(sanitizedLogicAppName, className, outputs);

      // Write the .cs file
      const filePath = path.join(unitTestFolderPath, `${className}.cs`);
      await fs.writeFile(filePath, classContent, 'utf-8');

      // Log to output channel
      ext.outputChannel.appendLog(localize('csFileCreated', 'Created .cs file at: {0}', filePath));
    }
  }
}

/**
 * Generates a C# class definition as a string.
 * @param {string} logicAppName - The name of the Logic App, used as the namespace.
 * @param {string} className - The name of the class to generate.
 * @param {any} outputs - The outputs object containing properties to include in the class.
 * @returns {string} - The generated C# class definition.
 */
function generateCSharpClasses(logicAppName: string, className: string, outputs: any): string {
  let classDefinition = 'using System;\nusing System.Collections.Generic;\nusing Newtonsoft.Json.Linq;\n\n';
  const namespaceName = `${logicAppName}.Tests.Mocks`;
  classDefinition += `namespace ${namespaceName} {\n`;
  classDefinition += `    public class ${className} {\n`;

  for (const key in outputs) {
    if (Object.prototype.hasOwnProperty.call(outputs, key)) {
      const jsonType = outputs[key]?.type || 'object'; // Default to 'object' if type is not defined
      const propertyType = mapJsonTypeToCSharp(jsonType);
      const propertyName = toPascalCase(key);

      // Add the property to the class definition
      classDefinition += `        public ${propertyType} ${propertyName} { get; set; }\n`;
    }
  }

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
