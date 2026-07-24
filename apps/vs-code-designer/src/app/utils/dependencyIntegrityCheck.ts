/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { dependencyIntegrityCheckIntervalMs, lastDependencyIntegrityCheckKeyPrefix } from '../../constants';

/**
 * Builds the per-dependency globalState key that records the last full integrity verification time.
 * @param {string} dependencyName - The dependency name (e.g. NodeJs, FuncCoreTools).
 * @returns {string} The globalState key.
 */
function integrityCheckKey(dependencyName: string): string {
  return `${lastDependencyIntegrityCheckKeyPrefix}.${dependencyName}`;
}

/**
 * Determines whether the expensive full per-file on-disk integrity verification should run for a
 * dependency on this activation.
 *
 * The full check stats every file listed in the dependency's integrity manifest (Func Core Tools alone
 * lists ~8.8k files); on a cold file cache that stat storm can block startup for ~15s+. To keep startup
 * fast we only run it at most once per {@link dependencyIntegrityCheckIntervalMs}; on throttled launches
 * a cheap sampled sentinel check runs instead. A missing/never-recorded timestamp always returns true so
 * the very first activation (and installs predating this throttle) establish a trusted baseline.
 * @param {string} dependencyName - The dependency name (e.g. NodeJs, FuncCoreTools).
 * @param {number} now - Current time in epoch ms. Defaults to Date.now(). Injectable for tests.
 * @returns {boolean} True if the full per-file verification should run.
 */
export function shouldRunDeepDependencyIntegrityCheck(dependencyName: string, now: number = Date.now()): boolean {
  const lastCheck = ext.context?.globalState.get<number>(integrityCheckKey(dependencyName));
  if (typeof lastCheck !== 'number' || Number.isNaN(lastCheck)) {
    return true;
  }
  return now - lastCheck >= dependencyIntegrityCheckIntervalMs;
}

/**
 * Records that a full per-file on-disk integrity verification just completed for a dependency, resetting
 * its throttle window.
 * @param {string} dependencyName - The dependency name (e.g. NodeJs, FuncCoreTools).
 * @param {number} now - Current time in epoch ms. Defaults to Date.now(). Injectable for tests.
 */
export async function recordDependencyIntegrityCheck(dependencyName: string, now: number = Date.now()): Promise<void> {
  await ext.context?.globalState.update(integrityCheckKey(dependencyName), now);
}
