/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { isString } from '@microsoft/logic-apps-shared';
import { createSettingsDetails } from './vsCodeConfig/settings';

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
  // NOTE: pretty-print (indent 1) is deliberate and load-bearing, not cosmetic.
  // vscode-azext-utils masks every telemetry property with regexes built on \S+ / \S*.
  // Compact JSON.stringify emits zero whitespace, so the whole payload is a single
  // \S+ token and masking backtracks quadratically: ~650 subscriptions (~85KB) burned
  // ~15s of synchronous CPU on the extension host, tripping VS Code's unresponsive
  // detector and stalling every other extension. Indenting breaks the payload into
  // short whitespace-delimited runs, making masking linear (~6ms) with identical data.
  context.telemetry.properties.subscriptions = JSON.stringify(azureSubscriptions, null, 1);
};

export const logExtensionSettings = (context: IActionContext) => {
  const settingsToLog = [
    'autoRuntimeDependenciesValidationAndInstallation',
    'autoStartAzurite',
    'autoStartDesignTime',
    'parameterizeConnectionsInProjectLoad',
    'showStartDesignTimeMessage',
    'validateDotNetSDK',
    'stopFuncTaskPostDebug',
  ];
  try {
    const settingsDetails = createSettingsDetails(settingsToLog);
    context.telemetry.properties.userExtensionSettings = JSON.stringify(settingsDetails);
  } catch (error) {
    context.telemetry.properties.userExtensionSettings = JSON.stringify({});
    context.telemetry.properties.userExtensionSettingsError = error instanceof Error ? error.message : String(error);
  }
};
