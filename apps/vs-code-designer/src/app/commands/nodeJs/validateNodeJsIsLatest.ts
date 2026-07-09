/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nodeJsDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { binariesExist, getLatestNodeJsVersion, verifyDependencyIntegrity } from '../../utils/binaries';
import { getLocalNodeJsVersion, getNodeJsCommand, setNodeJsCommand } from '../../utils/nodeJs/nodeJsVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { installNodeJs } from './installNodeJs';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as semver from 'semver';
import { ProgressLocation, window, type MessageItem } from 'vscode';

export async function validateNodeJsIsLatest(majorVersion?: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateNodeJsIsLatest', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';
    const showNodeJsWarningKey = 'showNodeJsWarning';
    const showNodeJsWarning = !!getWorkspaceSetting<boolean>(showNodeJsWarningKey);
    await setNodeJsCommand();
    const binaries = await binariesExist(nodeJsDependencyName);
    context.telemetry.properties.binariesExist = `${binaries}`;
    // Deep-verify the installed files against the on-disk integrity manifest so a corrupt/incomplete
    // install (e.g. a removed file) forces a wipe + reinstall instead of silently failing at runtime.
    const integrityValid = binaries ? verifyDependencyIntegrity(context, nodeJsDependencyName) : false;
    context.telemetry.properties.integrityValid = `${integrityValid}`;

    if (!binaries || !integrityValid) {
      await installNodeJs(context, majorVersion);
      context.telemetry.properties.binaryCommand = `${getNodeJsCommand()}`;
    } else if (showNodeJsWarning) {
      context.telemetry.properties.binaryCommand = `${getNodeJsCommand()}`;
      const localVersion: string | null = await getLocalNodeJsVersion(context);
      context.telemetry.properties.localVersion = localVersion;
      logNodeJsVersionState(localVersion, majorVersion);

      if (localVersion === null) {
        context.telemetry.properties.nodeJsWarningDecision = 'localMissing';
        await installNodeJs(context, majorVersion);
        logNodeJsWarningDecision(context);
      } else {
        const newestVersion = await getNewestNodeJsWarningVersion(context, localVersion, majorVersion);
        context.telemetry.properties.newestVersion = newestVersion;

        if (shouldShowOutdatedNodeJsWarning(localVersion, newestVersion, majorVersion)) {
          context.telemetry.properties.nodeJsWarningDecision = 'shown';
          context.telemetry.properties.outOfDateNodeJs = 'true';
          showOutdatedNodeJsWarning(context, localVersion, newestVersion, majorVersion, showNodeJsWarningKey);
        }
        logNodeJsWarningDecision(context);
      }
    } else {
      context.telemetry.properties.nodeJsWarningDecision = showNodeJsWarning ? 'binariesMissing' : 'disabled';
      logNodeJsWarningDecision(context);
    }
  });
}

function logNodeJsVersionState(localVersion: string | null, dependencyFeedVersion: string | undefined): void {
  ext.outputChannel.appendLog(localize('nodeJsLocalVersionLog', 'NodeJs local version: {0}', localVersion ?? 'unknown'));
  ext.outputChannel.appendLog(
    localize('nodeJsDependencyFeedVersionLog', 'NodeJs dependency feed version: {0}', dependencyFeedVersion ?? 'unknown')
  );
}

function logNodeJsWarningDecision(context: IActionContext): void {
  ext.outputChannel.appendLog(
    localize(
      'nodeJsResolvedNewestVersionLog',
      'NodeJs resolved newest version: {0}',
      context.telemetry.properties.newestVersion ?? 'unknown'
    )
  );
  ext.outputChannel.appendLog(
    localize(
      'nodeJsLatestVersionSourceLog',
      'NodeJs latest version source: {0}',
      context.telemetry.properties.latestVersionSource ?? 'unknown'
    )
  );
  ext.outputChannel.appendLog(
    localize('nodeJsWarningDecisionLog', 'NodeJs warning decision: {0}', context.telemetry.properties.nodeJsWarningDecision ?? 'unknown')
  );
}

async function getNewestNodeJsWarningVersion(
  context: IActionContext,
  localVersion: string,
  targetVersion: string | undefined
): Promise<string> {
  const normalizedTargetVersion = getNormalizedVersion(targetVersion);
  context.telemetry.properties.targetVersion = normalizedTargetVersion;

  if (normalizedTargetVersion && semver.gt(normalizedTargetVersion, localVersion)) {
    context.telemetry.properties.latestVersionSource = 'dependencyFeed';
    return normalizedTargetVersion;
  }

  const newestVersion: string = await getLatestNodeJsVersion(context, targetVersion);
  if (!semver.gt(newestVersion, localVersion)) {
    context.telemetry.properties.nodeJsWarningDecision =
      context.telemetry.properties.latestNodeJSVersion === 'fallback' ||
      context.telemetry.properties.latestNodeJSVersion === 'fallback-no-match'
        ? 'latestLookupFallback'
        : 'notNewer';
  } else if (!doesNewestVersionMatchTarget(localVersion, newestVersion, targetVersion)) {
    context.telemetry.properties.nodeJsWarningDecision = 'targetMismatch';
  }

  return newestVersion;
}

function doesNewestVersionMatchTarget(localVersion: string, newestVersion: string, targetVersion: string | undefined): boolean {
  const localMajorVersion = getMajorVersion(localVersion);
  const newestMajorVersion = getMajorVersion(newestVersion);
  const targetMajorVersion = targetVersion ? getMajorVersion(targetVersion) : undefined;

  if (localMajorVersion === undefined || newestMajorVersion === undefined) {
    return false;
  }

  if (targetMajorVersion === undefined) {
    return newestMajorVersion === localMajorVersion;
  }

  return newestMajorVersion === targetMajorVersion && targetMajorVersion >= localMajorVersion;
}

function getNormalizedVersion(version: string | undefined): string | undefined {
  if (!version) {
    return undefined;
  }

  return semver.valid(semver.coerce(version)) ?? undefined;
}

function showOutdatedNodeJsWarning(
  context: IActionContext,
  localVersion: string,
  newestVersion: string,
  majorVersion: string | undefined,
  showNodeJsWarningKey: string
): void {
  const message: string = localize(
    'outdatedNodeJsRuntime',
    'Update your local Node JS version ({0}) to the latest version ({1}) for the best experience.',
    localVersion,
    newestVersion
  );
  const update: MessageItem = { title: 'Update' };

  window
    .showWarningMessage(message, update, DialogResponses.learnMore, DialogResponses.dontWarnAgain)
    .then(async (result: MessageItem | undefined) => {
      if (result === DialogResponses.learnMore) {
        await openUrl('https://nodejs.org/en/download');
      } else if (result === update) {
        await updateNodeJsFromWarning(context, majorVersion);
      } else if (result === DialogResponses.dontWarnAgain) {
        await updateGlobalSetting(showNodeJsWarningKey, false);
      }
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.telemetry.properties.outdatedNodeJsWarningError = errorMessage;
      ext.outputChannel.appendLog(localize('outdatedNodeJsWarningError', 'Error handling outdated Node JS warning: "{0}".', errorMessage));
      window.showErrorMessage(localize('outdatedNodeJsUpdateError', 'Failed to update Node JS runtime dependency: "{0}".', errorMessage));
    });
}

async function updateNodeJsFromWarning(context: IActionContext, majorVersion: string | undefined): Promise<void> {
  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: localize('updatingNodeJsRuntime', 'Updating Node JS runtime dependency'),
    },
    async () => {
      await installNodeJs(context, majorVersion);
      await setNodeJsCommand();
    }
  );
  await window.showInformationMessage(localize('updatedNodeJsRuntime', 'Node JS runtime dependency update completed.'));
}

function shouldShowOutdatedNodeJsWarning(localVersion: string, newestVersion: string, targetVersion: string | undefined): boolean {
  if (!semver.gt(newestVersion, localVersion)) {
    return false;
  }

  const localMajorVersion = getMajorVersion(localVersion);
  const newestMajorVersion = getMajorVersion(newestVersion);
  const targetMajorVersion = targetVersion ? getMajorVersion(targetVersion) : undefined;

  if (localMajorVersion === undefined || newestMajorVersion === undefined) {
    return false;
  }

  if (targetMajorVersion === undefined) {
    return newestMajorVersion === localMajorVersion;
  }

  return newestMajorVersion === targetMajorVersion && targetMajorVersion >= localMajorVersion;
}

function getMajorVersion(version: string): number | undefined {
  const coercedVersion = semver.coerce(version);
  return coercedVersion ? semver.major(coercedVersion) : undefined;
}
