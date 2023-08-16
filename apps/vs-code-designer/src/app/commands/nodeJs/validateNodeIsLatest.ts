/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nodeJsDependencyName } from '../../../constants';
import { localize } from '../../../localize';
import { binariesExist, getNewestNodeJsVersion } from '../../utils/binaries';
import { getLocalNodeJsVersion } from '../../utils/nodeJs/nodeJsVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { installNodeJs } from './installNodeJs';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as semver from 'semver';
import type { MessageItem } from 'vscode';

export async function validateNodeJsIsLatest(): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateDotNetIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';

    const showNodeJsWarningKey = 'showNodeJsWarning';
    const showNodeJsWarning = !!getWorkspaceSetting<boolean>(showNodeJsWarningKey);
    const binaries = binariesExist(nodeJsDependencyName);

    if (!binaries) {
      installNodeJs(context);
    }

    if (showNodeJsWarning) {
      const localVersion: string | null = await getLocalNodeJsVersion();
      context.telemetry.properties.localVersion = localVersion;
      const newestVersion: string | undefined = await getNewestNodeJsVersion(context);
      if (semver.major(newestVersion) === semver.major(localVersion) && semver.gt(newestVersion, localVersion)) {
        context.telemetry.properties.outOfDateDotNet = 'true';
        const message: string = localize(
          'outdatedNodeJsRuntime',
          'Update your Node JS ({0}) to the latest ({1}) for the best experience.',
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
            await openUrl('https://nodejs.org/en/download');
          } else if (result === update) {
            await installNodeJs(context);
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showNodeJsWarningKey, false);
          }
        } while (result === DialogResponses.learnMore);
      }
    }
  });
}
