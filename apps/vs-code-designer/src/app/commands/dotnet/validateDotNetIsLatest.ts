/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { dotnetDependencyName } from '../../../constants';
import { localize } from '../../../localize';
import { binariesExist, getLatestDotNetVersion } from '../../utils/binaries';
import { getDotNetCommand, getLocalDotNetVersionFromBinaries } from '../../utils/dotnet/dotnet';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { installDotNet } from './installDotNet';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as semver from 'semver';
import type { MessageItem } from 'vscode';

export async function validateDotNetIsLatest(majorVersion?: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateDotNetIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';
    const majorVersions = ['6', '8'] ?? majorVersion.split(',');

    const showDotNetWarningKey = 'showDotNetWarning';
    const showDotNetWarning = !!getWorkspaceSetting<boolean>(showDotNetWarningKey);
    const binaries = binariesExist(dotnetDependencyName);
    context.telemetry.properties.binariesExist = `${binaries}`;

    if (!binaries) {
      for (const version of majorVersions) {
        await installDotNet(context, version);
      }
    } else if (showDotNetWarning) {
      for (const version of majorVersions) {
        const localVersion: string | null = await getLocalDotNetVersionFromBinaries(version);
        if (isNullOrUndefined(localVersion)) {
          await installDotNet(context, version);
        } else {
          context.telemetry.properties.localVersion = localVersion;
          const newestVersion: string | undefined = await getLatestDotNetVersion(context, version);
          if (semver.major(newestVersion) === semver.major(localVersion) && semver.gt(newestVersion, localVersion)) {
            context.telemetry.properties.outOfDateDotNet = 'true';
            const message: string = localize(
              'outdatedDotNetRuntime',
              'Update your local .NET SDK version ({0}) to the latest version ({1}) for the best experience.',
              localVersion,
              newestVersion
            );
            const update: MessageItem = { title: 'Update' };
            let result: MessageItem;
            do {
              result =
                newestVersion !== undefined
                  ? await context.ui.showWarningMessage(message, update, DialogResponses.learnMore, DialogResponses.dontWarnAgain)
                  : await context.ui.showWarningMessage(message, DialogResponses.learnMore, DialogResponses.dontWarnAgain);
              if (result === DialogResponses.learnMore) {
                await openUrl(`https://dotnet.microsoft.com/en-us/download/dotnet/${version}`);
              } else if (result === update) {
                await installDotNet(context, version);
              } else if (result === DialogResponses.dontWarnAgain) {
                await updateGlobalSetting(showDotNetWarningKey, false);
              }
            } while (result === DialogResponses.learnMore);
          }
        }
      }
    }
    context.telemetry.properties.binaryCommand = `${getDotNetCommand()}`;
  });
}
