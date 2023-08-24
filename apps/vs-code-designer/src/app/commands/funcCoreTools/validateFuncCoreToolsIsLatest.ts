/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcDependencyName } from '../../../constants';
import { localize } from '../../../localize';
import { binariesExist, getLatestFunctionCoreToolsVersion } from '../../utils/binaries';
import { getFunctionsCommand, getLocalFuncCoreToolsVersion } from '../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { installFuncCoreTools } from './installFuncCoreTools';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as semver from 'semver';
import type { MessageItem } from 'vscode';

export async function validateFuncCoreToolsIsLatest(majorVersion?: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';

    const showCoreToolsWarningKey = 'showCoreToolsWarning';
    const showCoreToolsWarning = !!getWorkspaceSetting<boolean>(showCoreToolsWarningKey);

    const binaries = binariesExist(funcDependencyName);
    context.telemetry.properties.binariesExist = `${binaries}`;

    if (!binaries) {
      await installFuncCoreTools(context, majorVersion);
      context.telemetry.properties.binaryCommand = `${getFunctionsCommand()}`;
    } else if (showCoreToolsWarning) {
      context.telemetry.properties.binaryCommand = `${getFunctionsCommand()}`;
      const localVersion: string | null = await getLocalFuncCoreToolsVersion();
      context.telemetry.properties.localVersion = localVersion;
      const newestVersion: string | undefined = await getLatestFunctionCoreToolsVersion(context, majorVersion);
      if (semver.major(newestVersion) === semver.major(localVersion) && semver.gt(newestVersion, localVersion)) {
        context.telemetry.properties.outOfDateFunc = 'true';
        const message: string = localize(
          'outdatedFunctionRuntime',
          'Update your local Azure Functions Core Tools version ({0}) to the latest version ({1}) for the best experience.',
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
            await openUrl('https://aka.ms/azFuncOutdated');
          } else if (result === update) {
            await installFuncCoreTools(context, majorVersion);
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showCoreToolsWarningKey, false);
          }
        } while (result === DialogResponses.learnMore);
      }
    }
  });
}
