/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nodeJsMajorVersion, versionRegex } from '../../../constants';
import type { NodeVersion } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../funcCoreTools/cpUtils';
import * as semver from 'semver';

/**
 * Checks if the system has nvm installed.
 * @returns {Promise<boolean>} Returns true if the system has nvm installed, otherwise returns false.
 */
export async function hasNvm(): Promise<boolean> {
  try {
    await executeCommand(undefined, undefined, 'nvm', '--version');
    return true;
  } catch (error) {
    // No node
  }
  return false;
}

/**
 * Checks if the system has nvm installed.
 * @returns {Promise<string>} Returns version if the system has nvm installed, otherwise returns empty.
 */
export async function hasCompatibleNodeVersion(): Promise<string> {
  const versions: string[] = await listNodeInstallations();
  for (const version of versions) {
    if (semver.major(version) == nodeJsMajorVersion) {
      return version;
    }
  }
  return;
}

/**
 * Checks if the system has nvm installed.
 * @param {NodeVersion} version - Node version.
 */
export async function installNodeVersion(version: NodeVersion): Promise<void> {
  await executeCommand(ext.outputChannel, undefined, 'nvm', 'install', version);

  // Does not automatically use version after installation
  const installedVersion = await hasCompatibleNodeVersion();
  setCurrentNodeVersion(installedVersion);
}

/**
 * Set current node version.
 * @param {NodeVersion | string} version - Node version.
 * @returns {Promise<boolean>} Returns set current active node version.
 */
export async function setCurrentNodeVersion(version: NodeVersion | string): Promise<string> {
  await executeCommand(ext.outputChannel, undefined, 'nvm', 'use', version);
  return await executeCommand(undefined, undefined, 'nvm', 'current');
}

/**
 * Get current active node version.
 * @returns {Promise<string>} Returns current active node version.
 */
export async function getCurrentNodeVersion(): Promise<string> {
  return await executeCommand(undefined, undefined, 'nvm', 'current');
}

/**
 * List the nodeJs installations
 * @returns {Promise<string[]>} Returns list of installed node version.
 */
async function listNodeInstallations(): Promise<string[]> {
  const response: string = await executeCommand(undefined, undefined, 'nvm', 'list');
  return response.match(versionRegex);
}
