/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultVersionRange, defaultBundleId, localSettingsFileName } from '../../constants';
import { getLocalSettingsJson } from './appSettings/localSettings';
import { getJsonFeed } from './feed';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed, IBundleFeed, IBundleMetadata, IHostJsonV2 } from '@microsoft/vscode-extension';
import { join } from 'path';
import * as vscode from 'vscode';

/**
 * Gets bundle extension feed.
 * @param {IActionContext} context - Command context.
 * @param {IBundleMetadata | undefined} bundleMetadata - Bundle meta data.
 * @returns {Promise<IBundleFeed>} Returns bundle extension object.
 */
async function getBundleFeed(context: IActionContext, bundleMetadata: IBundleMetadata | undefined): Promise<IBundleFeed> {
  const bundleId: string = (bundleMetadata && bundleMetadata.id) || defaultBundleId;

  const envVarUri: string | undefined = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  // Only use an aka.ms link for the most common case, otherwise we will dynamically construct the url
  let url: string;
  if (!envVarUri && bundleId === defaultBundleId) {
    url = 'https://aka.ms/AA66i2x';
  } else {
    const baseUrl: string = envVarUri || 'https://functionscdn.azureedge.net/public';
    url = `${baseUrl}/ExtensionBundles/${bundleId}/index-v2.json`;
  }

  return getJsonFeed(context, url);
}

/**
 * Gets extension bundle dependency feed.
 * @param {IActionContext} context - Command context.
 * @param {IBundleMetadata | undefined} bundleMetadata - Bundle meta data.
 * @returns {Promise<IBundleFeed>} Returns bundle extension object.
 */
async function getBundleDependencyFeed(
  context: IActionContext,
  bundleMetadata: IBundleMetadata | undefined
): Promise<IBundleDependencyFeed> {
  const bundleId: string = (bundleMetadata && bundleMetadata?.id) || defaultBundleId;
  const projectPath: string | undefined = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
  let envVarUri: string | undefined = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  if (projectPath) {
    envVarUri = (await getLocalSettingsJson(context, join(projectPath, localSettingsFileName)))?.Values
      ?.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  }

  const baseUrl: string = envVarUri || 'https://functionscdn.azureedge.net/public';
  const url = `${baseUrl}/ExtensionBundles/${bundleId}.Workflows/dependency.json`;
  return getJsonFeed(context, url);
}

/**
 * Gets latest bundle extension version range.
 * @param {IActionContext} context - Command context.
 * @returns {Promise<string>} Returns lates version range.
 */
export async function getLatestVersionRange(context: IActionContext): Promise<string> {
  const feed: IBundleFeed = await getBundleFeed(context, undefined);
  return feed.defaultVersionRange;
}

/**
 * Gets latest bundle extension dependencies versions.
 * @param {IActionContext} context - Command context.
 * @returns {Promise<any>} Returns dependency versions.
 */
export async function getDependenciesVersion(context: IActionContext): Promise<IBundleDependencyFeed> {
  const feed: IBundleDependencyFeed = await getBundleDependencyFeed(context, undefined);
  return feed;
}

/**
 * Add bundle extension version to host.json configuration.
 * @param {IActionContext} context - Command context.
 * @param {IHostJsonV2} hostJson - Host.json configuration.
 */
export async function addDefaultBundle(context: IActionContext, hostJson: IHostJsonV2): Promise<void> {
  let versionRange: string;
  try {
    versionRange = await getLatestVersionRange(context);
  } catch {
    versionRange = defaultVersionRange;
  }

  hostJson.extensionBundle = {
    id: defaultBundleId,
    version: versionRange,
  };
}
