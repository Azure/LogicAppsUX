/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { updateGlobalSetting } from '../utils/vsCodeConfig/settings';

/**
 * Switches to Data Mapper version 2.
 * @param {IActionContext} context - The action context.
 * @returns {Promise<void>} - A promise that resolves when the setting is updated.
 */
export async function switchToDataMapperV2(): Promise<void> {
  try {
    await updateGlobalSetting('dataMapperVersion', 2);

    const message = localize('dataMapperVersionUpdated', 'Data Mapper version has been set to version 2.');
    ext.outputChannel.appendLog(message);
  } catch (error) {
    const errorMessage = localize('failedToUpdateDataMapperVersion', 'Failed to update Data Mapper version: {0}', error.message ?? error);

    ext.outputChannel.appendLog(errorMessage);

    throw new Error(errorMessage);
  }
}
