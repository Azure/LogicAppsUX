/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager } from '../../../constants';
import { localize } from '../../../localize';
import { executeOnFunctions } from '../../functionsExtension/executeOnFunctionsExt';
import { getLocalFuncCoreToolsVersion, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getBrewPackageName } from '../../utils/funcCoreTools/getBrewPackageName';
import { getFuncPackageManagers } from '../../utils/funcCoreTools/getFuncPackageManagers';
import { getNpmDistTag } from '../../utils/funcCoreTools/getNpmDistTag';
import { sendRequestWithExtTimeout } from '../../utils/requestUtils';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { uninstallFuncCoreTools } from './uninstallFuncCoreTools';
import { updateFuncCoreTools } from './updateFuncCoreTools';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl, parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension';
import * as semver from 'semver';
import type { MessageItem } from 'vscode';

export async function validateFuncCoreToolsIsLatest(): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';

    const showMultiCoreToolsWarningKey = 'showMultiCoreToolsWarning';
    const showMultiCoreToolsWarning = !!getWorkspaceSetting<boolean>(showMultiCoreToolsWarningKey);

    const showCoreToolsWarningKey = 'showCoreToolsWarning';
    const showCoreToolsWarning = !!getWorkspaceSetting<boolean>(showCoreToolsWarningKey);

    if (showCoreToolsWarning || showMultiCoreToolsWarning) {
      const packageManagers: PackageManager[] = await getFuncPackageManagers(true /* isFuncInstalled */);
      let packageManager: PackageManager;

      if (packageManagers.length === 0) {
        return;
      } else if (packageManagers.length === 1) {
        packageManager = packageManagers[0];
        context.telemetry.properties.packageManager = packageManager;
      } else {
        context.telemetry.properties.multiFunc = 'true';

        if (showMultiCoreToolsWarning) {
          const message: string = localize('multipleInstalls', 'Detected multiple installs of the func cli.');
          const selectUninstall: MessageItem = { title: localize('selectUninstall', 'Select version to uninstall') };
          const result: MessageItem = await context.ui.showWarningMessage(message, selectUninstall, DialogResponses.dontWarnAgain);

          if (result === selectUninstall) {
            await executeOnFunctions(uninstallFuncCoreTools, context, packageManagers);
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showMultiCoreToolsWarningKey, false);
          }
        }

        return;
      }

      if (showCoreToolsWarning) {
        const localVersion: string | null = await getLocalFuncCoreToolsVersion();
        if (!localVersion) {
          return;
        }
        context.telemetry.properties.localVersion = localVersion;

        const versionFromSetting: FuncVersion | undefined = tryParseFuncVersion(localVersion);
        if (versionFromSetting === undefined) {
          return;
        }

        const newestVersion: string | undefined = await getNewestFunctionRuntimeVersion(packageManager, versionFromSetting, context);
        if (!newestVersion) {
          return;
        }

        if (semver.major(newestVersion) === semver.major(localVersion) && semver.gt(newestVersion, localVersion)) {
          context.telemetry.properties.outOfDateFunc = 'true';
          const message: string = localize(
            'outdatedFunctionRuntime',
            'Update your Azure Functions Core Tools ({0}) to the latest ({1}) for the best experience.',
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
              await openUrl('https://aka.ms/azFuncOutdated');
            } else if (result === update) {
              await updateFuncCoreTools(context, packageManager, versionFromSetting);
            } else if (result === DialogResponses.dontWarnAgain) {
              await updateGlobalSetting(showCoreToolsWarningKey, false);
            }
          } while (result === DialogResponses.learnMore);
        }
      }
    }
  });
}

async function getNewestFunctionRuntimeVersion(
  packageManager: PackageManager | undefined,
  versionFromSetting: FuncVersion,
  context: IActionContext
): Promise<string | undefined> {
  try {
    if (packageManager === PackageManager.brew) {
      const packageName: string = getBrewPackageName(versionFromSetting);
      const brewRegistryUri = `https://raw.githubusercontent.com/Azure/homebrew-functions/master/Formula/${packageName}.rb`;
      const response = await sendRequestWithExtTimeout(context, { url: brewRegistryUri, method: HTTP_METHODS.GET });
      const brewInfo: string = response.bodyAsText;
      const matches: RegExpMatchArray | null = brewInfo.match(/version\s+["']([^"']+)["']/i);

      if (matches && matches.length > 1) {
        return matches[1];
      }
    } else {
      return (await getNpmDistTag(context, versionFromSetting)).value;
    }
  } catch (error) {
    context.telemetry.properties.latestRuntimeError = parseError(error).message;
  }

  return undefined;
}
