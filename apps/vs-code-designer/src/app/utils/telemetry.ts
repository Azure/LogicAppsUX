/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { isString } from '@microsoft/logic-apps-shared';
import { createSettingsDetails } from './vsCodeConfig/settings';

/**
 * Executes function and logs duration in telemetry.
 * @param {IActionContext} context - Command context.
 * @param {string} prefix - Key prefix to log.
 * @param {void} callback - Callback function to execute.
 * @returns {Promise<T>} Returns what callback function returns.
 */
export async function runWithDurationTelemetry<T>(context: IActionContext, prefix: string, callback: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await callback();
  } finally {
    const end = Date.now();
    const durationKey = `${prefix}Duration`;
    const countKey = `${prefix}Count`;
    const duration = (end - start) / 1000;

    context.telemetry.measurements[durationKey] = duration + (context.telemetry.measurements[durationKey] || 0);
    context.telemetry.measurements[countKey] = 1 + (context.telemetry.measurements[countKey] || 0);
  }
}

export const logSubscriptions = async (context: IActionContext) => {
  let azureSubscriptions: any[] = [];
  try {
    const isSignedIn = await ext.subscriptionProvider.isSignedIn();
    context.telemetry.properties.isSignedIn = isSignedIn.toString();
    if (isSignedIn) {
      const subscriptions = await ext.subscriptionProvider.getSubscriptions();
      azureSubscriptions = subscriptions.map((subscription) => {
        return {
          subscriptionId: subscription.subscriptionId,
          tenantId: subscription.tenantId,
          isCustomCloud: subscription.isCustomCloud,
        };
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : isString(error) ? error : 'Unknown error';
    context.telemetry.properties.logSubscriptionsError = errorMessage;
  }
  context.telemetry.properties.subscriptions = JSON.stringify(azureSubscriptions);
};

export const logExtensionSettings = async (context: IActionContext) => {
  const settingsToLog = [
    'autoRuntimeDependenciesValidationAndInstallation',
    'autoStartAzurite',
    'autoStartDesignTime',
    'parameterizeConnectionsInProjectLoad',
    'showStartDesignTimeMessage',
    'validateDotNetSDK',
    'stopFuncTaskPostDebug',
  ];
  const settingsDetails = createSettingsDetails(settingsToLog);
  context.telemetry.properties.userExtensionSettings = JSON.stringify(settingsDetails);
};
