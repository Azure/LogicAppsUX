/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../../extensionVariables';

const CONNECTOR_SKIP_STATE_PREFIX = 'azureConnectors.skipped.';

/**
 * Returns whether the user previously chose "Skip for now" for this project.
 */
export function isConnectorSetupSkipped(projectPath: string): boolean {
  return ext.context.globalState.get<boolean>(`${CONNECTOR_SKIP_STATE_PREFIX}${projectPath}`) === true;
}

/**
 * Records that the user chose "Skip for now" for this project.
 */
export async function setConnectorSetupSkipped(projectPath: string): Promise<void> {
  await ext.context.globalState.update(`${CONNECTOR_SKIP_STATE_PREFIX}${projectPath}`, true);
}

/**
 * Clears the "Skip for now" flag so the user will be prompted again.
 */
export async function clearConnectorSetupSkipped(projectPath: string): Promise<void> {
  await ext.context.globalState.update(`${CONNECTOR_SKIP_STATE_PREFIX}${projectPath}`, undefined);
}
