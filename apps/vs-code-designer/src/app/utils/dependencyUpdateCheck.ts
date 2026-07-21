/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { dependencyUpdateCheckIntervalMs, lastDependencyUpdateCheckKey } from '../../constants';

/**
 * Determines whether the runtime dependency "latest version" network lookups should run.
 *
 * This throttle gates **only** the network calls that compare an already-installed binary
 * against the newest published version (npm/GitHub). Local presence and integrity checks
 * (existence, the on-disk integrity manifest, and the local `--version` spawn) always run
 * regardless of this throttle, so a missing or corrupted binary is still reinstalled on every
 * activation. Performing the network lookups on every activation is the main contributor to
 * slow startup, so we only do it at most once per {@link dependencyUpdateCheckIntervalMs}.
 * @param {number} now - Current time in epoch ms. Defaults to Date.now(). Injectable for tests.
 * @returns {boolean} True if the network update checks should run.
 */
export function shouldCheckForDependencyUpdates(now: number = Date.now()): boolean {
  const lastCheck = ext.context?.globalState.get<number>(lastDependencyUpdateCheckKey);
  if (typeof lastCheck !== 'number' || Number.isNaN(lastCheck)) {
    return true;
  }
  return now - lastCheck >= dependencyUpdateCheckIntervalMs;
}

/**
 * Records that a full dependency update check just completed, resetting the throttle window.
 * @param {number} now - Current time in epoch ms. Defaults to Date.now(). Injectable for tests.
 */
export async function recordDependencyUpdateCheck(now: number = Date.now()): Promise<void> {
  await ext.context?.globalState.update(lastDependencyUpdateCheckKey, now);
}
