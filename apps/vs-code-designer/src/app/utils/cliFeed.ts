/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { getJsonFeed } from './feed';
import { tryGetMajorVersion } from './funcCoreTools/funcVersion';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, ICliFeed, IRelease } from '@microsoft/vscode-extension-logic-apps';

/**
 * Gets latest template version.
 * @param {string} context - Command context.
 * @param {FuncVersion} version - Functions core tools version.
 * @returns {Promise<string>} Template version.
 */
export async function getLatestVersion(context: IActionContext, version: FuncVersion): Promise<string> {
  const cliFeed: ICliFeed = await getCliFeed(context);

  const majorVersion: string = tryGetMajorVersion(version);
  const tag: string = `v${majorVersion}`;
  const releaseData = cliFeed.tags[tag];

  if (!releaseData) {
    throw new Error(localize('unsupportedVersion', 'Azure Functions v{0} does not support this operation.', majorVersion));
  }
  return releaseData.release;
}

/**
 * Gets functions releases feed
 * @param {string} context - Command context.
 * @returns {Promise<ICliFeed>} Releases feed.
 */
export async function getRelease(context: IActionContext, templateVersion: string): Promise<IRelease> {
  const cliFeed: ICliFeed = await getCliFeed(context);
  return cliFeed.releases[templateVersion];
}

/**
 * Gets functions releases feed
 * @param {string} context - Command context.
 * @returns {Promise<ICliFeed>} Releases feed.
 */
async function getCliFeed(context: IActionContext): Promise<ICliFeed> {
  const funcCliFeedV4Url = 'https://aka.ms/V00v5v';
  return getJsonFeed(context, funcCliFeedV4Url);
}
