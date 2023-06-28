/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nodeJsMajorVersion } from '../../../constants';
import { executeCommand } from '../funcCoreTools/cpUtils';
import * as semver from 'semver';

/**
 * Checks if the system has node installed.
 * @returns {Promise<boolean>} Returns true if the system has node installed, otherwise returns false.
 */
export async function hasNode(): Promise<boolean> {
  try {
    await executeCommand(undefined, undefined, 'node', '--version');
    return true;
  } catch (error) {
    // No node
  }
  return false;
}

/**
 * Checks if node version is compatible.
 * @returns {Promise<boolean>} Returns true if node version is compatible.
 */
export async function isCompatibleNodeVersion(): Promise<boolean> {
  const version = await executeCommand(undefined, undefined, 'node', '--version');
  return semver.major(semver.valid(semver.coerce(version))) == nodeJsMajorVersion;
}

/**
 * Get current node version.
 * @returns {Promise<string>} Returns current node version.
 */
export async function getNodeVersion(): Promise<string> {
  const version = await executeCommand(undefined, undefined, 'node', '--version');
  return semver.valid(semver.coerce(version));
}
