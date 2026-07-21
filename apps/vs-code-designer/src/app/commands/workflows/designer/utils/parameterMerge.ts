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
    }
  });
}
