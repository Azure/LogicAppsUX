/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { DotnetVersion, PackageManager } from '../../../constants';
import { localize } from '../../../localize';
import { getLocalDotNetSDKVersion, getNewestDotNetSDKVersion, tryParseDotNetVersion } from '../../utils/dotnet/dotNetVersion';
import { getDotNetPackageManager } from '../../utils/dotnet/getDotNetPackageManager';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { updateDotNetSDK } from './updateDotNetSDK';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as semver from 'semver';
import type { MessageItem } from 'vscode';

export async function validateDotNetSDKIsLatest(): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateDotNetIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';

    const showMultiDotNetSDKWarningKey = 'showMultiDotNetSDKWarning';
    const showMultiDotNetSDKsWarning = !!getWorkspaceSetting<boolean>(showMultiDotNetSDKWarningKey);

    const showDotNetSDKWarningKey = 'showDotNetSDKWarning';
    const showDotNetSDKWarning = !!getWorkspaceSetting<boolean>(showDotNetSDKWarningKey);

    if (showDotNetSDKWarning || showMultiDotNetSDKsWarning) {
      const packageManagers: PackageManager[] = await getDotNetPackageManager(context, true /* isDotNetSDKInstalled */);
      let packageManager: PackageManager;

      if (packageManagers.length === 0) {
        context.telemetry.properties.packageManager = 'NONE';
        return;
      } else if (packageManagers.length === 1) {
        packageManager = packageManagers[0];
        context.telemetry.properties.packageManager = packageManager;
      }

      if (showDotNetSDKWarning) {
        const localVersion: string | null = await getLocalDotNetSDKVersion();
        if (!localVersion) {
          return;
        }
        context.telemetry.properties.localVersion = localVersion;

        const versionFromSetting: DotnetVersion | undefined = tryParseDotNetVersion(localVersion);
        if (versionFromSetting === undefined) {
          return;
        }
        context.telemetry.properties.versionFromSetting = versionFromSetting;

        const newestVersion: string | undefined = await getNewestDotNetSDKVersion(packageManager, context);
        if (!newestVersion) {
          return;
        }

        if (semver.major(newestVersion) === semver.major(localVersion) && semver.gt(newestVersion, localVersion)) {
          context.telemetry.properties.outOfDateFunc = 'true';

          const message: string = localize(
            'outdatedDotNetSDK',
            'Update your .Net SDK 6 ({0}) to latest ({1}) for the best experience.',
            localVersion,
            newestVersion
          );
          const update: MessageItem = { title: 'Update' };
          let result: MessageItem;

          do {
            result =
              packageManager !== undefined
                ? await context.ui.showWarningMessage(message, update, DialogResponses.learnMore, DialogResponses.dontWarnAgain)
                : await context.ui.showWarningMessage(message, DialogResponses.learnMore, DialogResponses.dontWarnAgain);
            if (result === DialogResponses.learnMore) {
              await openUrl(
                'https://learn.microsoft.com/en-us/azure/logic-apps/create-single-tenant-workflows-visual-studio-code#prerequisites'
              );
            } else if (result === update) {
              updateDotNetSDK(context);
            } else if (result === DialogResponses.dontWarnAgain) {
              await updateGlobalSetting(showDotNetSDKWarningKey, false);
            }
          } while (result === DialogResponses.learnMore);
        }
      }
    }
  });
}
