/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from "../../constants";
import * as fse from "fs-extra";
import * as path from "path";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";

export async function isCodelessLogicApp(fsPath: string): Promise<boolean> {
  try {
    const subpaths = await fse.readdir(fsPath);
    const validCodelessWorkflowChecks = await Promise.all(
      subpaths.map((subpath) => isValidCodelessWorkflowFolder(path.join(fsPath, subpath, workflowFileName)))
    );
    return validCodelessWorkflowChecks.some(Boolean);
  } catch (error) {
    ext.outputChannel.appendLog(localize('isCodelessLogicAppError', 'Error checking if path "{0}" is a codeless Logic App: "{1}".', fsPath, error instanceof Error ? error.message : String(error)));
    return false;
  }
}

/**
 * Validates that a `workflow.json` file exists and declares a `Microsoft.Logic`
 * workflow-definition `$schema` — the codeless Logic Apps workflow signal.
 */
async function isValidCodelessWorkflowFolder(workflowJsonPath: string): Promise<boolean> {
  if (!(await fse.pathExists(workflowJsonPath))) {
    return false;
  }
  try {
    const workflowJsonData = await fse.readFile(workflowJsonPath, 'utf-8');
    const schema = JSON.parse(workflowJsonData)?.definition?.$schema;
    return typeof schema === 'string' && schema.includes('Microsoft.Logic') && schema.includes('workflowdefinition.json');
  } catch {
    return false;
  }
}
