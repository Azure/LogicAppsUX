/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager, funcDependencyName } from '../../../constants';
import { localize } from '../../../localize';
import { executeOnFunctions } from '../../functionsExtension/executeOnFunctionsExt';
import { binariesExist, getLatestFunctionCoreToolsVersion, useBinariesDependencies } from '../../utils/binaries';
import { startAllDesignTimeApis, stopAllDesignTimeApis } from '../../utils/codeless/startDesignTimeApi';
import { getFunctionsCommand, getLocalFuncCoreToolsVersion, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getBrewPackageName } from '../../utils/funcCoreTools/getBrewPackageName';
import { getFuncPackageManagers } from '../../utils/funcCoreTools/getFuncPackageManagers';
import { getNpmDistTag } from '../../utils/funcCoreTools/getNpmDistTag';
import { sendRequestWithExtTimeout } from '../../utils/requestUtils';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { installFuncCoreToolsBinaries } from './installFuncCoreTools';
import { uninstallFuncCoreTools } from './uninstallFuncCoreTools';
import { updateFuncCoreTools } from './updateFuncCoreTools';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { callWithTelemetryAndErrorHandling, DialogResponses, parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import * as semver from 'semver';
import type { MessageItem } from 'vscode';

export async function validateFuncCoreToolsIsLatest(majorVersion?: string): Promise<void> {
  if (useBinariesDependencies()) {
    await validateFuncCoreToolsIsLatestBinaries(majorVersion);
  } else {
    await validateFuncCoreToolsIsLatestSystem();
  }
}

export async function validateFuncCoreToolsIsLatestBinaries(majorVersion?: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';

    const binaries = binariesExist(funcDependencyName);
    context.telemetry.properties.binariesExist = `${binaries}`;

    const localVersion: string | null = binaries ? await getLocalFuncCoreToolsVersion() : null;
    context.telemetry.properties.localVersion = localVersion ?? 'null';

    const newestVersion: string | undefined = binaries ? await getLatestFunctionCoreToolsVersion(context, majorVersion) : undefined;
    const isOutdated = binaries && localVersion && newestVersion && semver.gt(newestVersion, localVersion);

    const shouldInstall = !binaries || localVersion === null || isOutdated;

    if (shouldInstall) {
      if (isOutdated) {
        context.telemetry.properties.outOfDateFunc = 'true';
        stopAllDesignTimeApis();
      }

      await installFuncCoreToolsBinaries(context, majorVersion);
      await startAllDesignTimeApis();
    }

    context.telemetry.properties.binaryCommand = getFunctionsCommand();
  });
}

export async function validateFuncCoreToolsIsLatestSystem(): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';

    const showMultiCoreToolsWarningKey = 'showMultiCoreToolsWarning';
    const showMultiCoreToolsWarning = !!getWorkspaceSetting<boolean>(showMultiCoreToolsWarningKey);

    if (showMultiCoreToolsWarning) {
      const packageManagers: PackageManager[] = await getFuncPackageManagers(true /* isFuncInstalled */);
      let packageManager: PackageManager;

      if (packageManagers.length === 0) {
        return;
      }
      if (packageManagers.length === 1) {
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
        stopAllDesignTimeApis();
        await updateFuncCoreTools(context, packageManager, versionFromSetting);
        await startAllDesignTimeApis();
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
