/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { dotnetDependencyName } from '../../../constants';
import { binariesExist, getLatestDotNetVersion } from '../../utils/binaries';
import { getDotNetCommand, getLocalDotNetVersionFromBinaries } from '../../utils/dotnet/dotnet';
import { installDotNet } from './installDotNet';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as semver from 'semver';

export async function validateDotNetIsLatest(majorVersion?: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateDotNetIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';
    const majorVersions = majorVersion.split(',');

    const binaries = binariesExist(dotnetDependencyName);
    context.telemetry.properties.binariesExist = `${binaries}`;

    if (binaries) {
      for (const version of majorVersions) {
        const localVersion: string | null = await getLocalDotNetVersionFromBinaries(version);
        if (isNullOrUndefined(localVersion)) {
          await installDotNet(context, version);
        } else {
          context.telemetry.properties.localVersion = localVersion;
          const newestVersion: string | undefined = await getLatestDotNetVersion(context, version);

          if (semver.major(newestVersion) === semver.major(localVersion) && semver.gt(newestVersion, localVersion)) {
            context.telemetry.properties.outOfDateDotNet = 'true';
            await installDotNet(context, version);
          }
        }
      }
    } else {
      for (const version of majorVersions) {
        await installDotNet(context, version);
      }
    }
    context.telemetry.properties.binaryCommand = `${getDotNetCommand()}`;
  });
}
