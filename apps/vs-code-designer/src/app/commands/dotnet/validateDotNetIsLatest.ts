/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnetDependencyName } from '../../../constants';
import { localize } from '../../../localize';
import { binariesExist, getLatestDotNetVersion } from '../../utils/binaries';
import { getDotNetCommand, getLocalDotNetVersion } from '../../utils/dotnet/dotnet';
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

    const showDotNetWarningKey = 'showDotNetWarning';
    const showDotNetWarning = !!getWorkspaceSetting<boolean>(showDotNetWarningKey);
    const binaries = binariesExist(dotnetDependencyName);
    context.telemetry.properties.binariesExist = `${binaries}`;

    if (!binaries) {
      await installDotNet(context, majorVersion);
      context.telemetry.properties.binaryCommand = `${getDotNetCommand()}`;
    } else if (showDotNetWarning) {
      context.telemetry.properties.binaryCommand = `${getDotNetCommand()}`;
      const localVersion: string | null = await getLocalDotNetVersion();
      context.telemetry.properties.localVersion = localVersion;
      const newestVersion: string | undefined = await getLatestDotNetVersion(context, majorVersion);
      if (semver.major(newestVersion) === semver.major(localVersion) && semver.gt(newestVersion, localVersion)) {
        context.telemetry.properties.outOfDateDotNet = 'true';
        const message: string = localize(
          'outdatedDotNetRuntime',
          'Update your .Net SDK ({0}) to the latest ({1}) for the best experience.',
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
            await openUrl('https://dotnet.microsoft.com/en-us/download/dotnet/6.0');
          } else if (result === update) {
            await installDotNet(context, majorVersion);
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showDotNetWarningKey, false);
          }
        } while (result === DialogResponses.learnMore);
      }
    }
  });
}
