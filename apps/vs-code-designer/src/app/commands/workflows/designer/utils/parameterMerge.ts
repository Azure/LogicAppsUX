/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Parameter } from '@microsoft/vscode-extension-logic-apps';
import { getParametersFromFile } from '../../../../utils/codeless/connection';

/**
 * Merges parameters from the on-disk parameters.json with those from the designer,
 * preserving any parameters that exist on disk but weren't part of the designer session.
 * For parameters that exist in both, file-only properties (e.g., metadata, description)
 * are preserved while designer properties take precedence.
 */
export async function mergeJsonParameters(
  context: IActionContext,
  filePath: string,
  definitionParameters: any,
  panelParameterRecord: Record<string, Parameter>
): Promise<void> {
  const jsonParameters = await getParametersFromFile(context, filePath);

  Object.entries(jsonParameters).forEach(([key, parameter]) => {
    if (!definitionParameters[key] && !panelParameterRecord[key]) {
      definitionParameters[key] = parameter;
    } else if (definitionParameters[key]) {
      deepMergePreserveExisting(definitionParameters[key], parameter as Record<string, any>);
    }
  });
}

/**
 * Recursively merges properties from source into target, only adding
 * properties that don't already exist in target. For nested objects,
 * merges recursively so nested file-only fields are preserved.
 */
function deepMergePreserveExisting(target: Record<string, any>, source: Record<string, any>): void {
  for (const prop of Object.keys(source)) {
    if (!(prop in target)) {
      target[prop] = source[prop];
    } else if (
      typeof target[prop] === 'object' &&
      target[prop] !== null &&
      !Array.isArray(target[prop]) &&
      typeof source[prop] === 'object' &&
      source[prop] !== null &&
      !Array.isArray(source[prop])
    ) {
      deepMergePreserveExisting(target[prop], source[prop]);
    }
  }
}
