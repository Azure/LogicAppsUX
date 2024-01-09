/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  defaultVersionRange,
  defaultBundleId,
  localSettingsFileName,
  defaultExtensionBundlePathValue,
  extensionBundleId,
} from '../../constants';
import { getLocalSettingsJson } from './appSettings/localSettings';
import { downloadAndExtractDependency } from './binaries';
import { getJsonFeed } from './feed';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed, IBundleFeed, IBundleMetadata, IHostJsonV2 } from '@microsoft/vscode-extension';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
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
 * Gets Workflow bundle extension feed.
 * @param {IActionContext} context - Command context.
 * @param {IBundleMetadata | undefined} bundleMetadata - Bundle meta data.
 * @returns {Promise<IBundleFeed>} Returns bundle extension object.
 */
async function getWorkflowBundleFeed(context: IActionContext): Promise<IBundleFeed> {
  const envVarUri: string | undefined = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  const baseUrl: string = envVarUri || 'https://functionscdn.azureedge.net/public';
  const url = `${baseUrl}/ExtensionBundles/${extensionBundleId}/index-v2.json`;

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
    envVarUri = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName)))?.Values
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

/**
 * Gets bundle extension zip. Microsoft.Azure.Functions.ExtensionBundle.Workflows.<version>.
 * @param {IActionContext} context - Command context.
 * @param {string} extensionVersion - Bundle Extension Version.
 * @returns {string} Returns bundle extension zip url.
 */
async function getExtensionBundleZip(context: IActionContext, extensionVersion: string): Promise<string> {
  let envVarUri: string | undefined = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  const projectPath: string | undefined = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
  if (projectPath) {
    envVarUri = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName)))?.Values
      ?.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  }
  const baseUrl: string = envVarUri || 'https://functionscdn.azureedge.net/public';
  const url = `${baseUrl}/ExtensionBundles/Microsoft.Azure.Functions.ExtensionBundle.Workflows/${extensionVersion}/Microsoft.Azure.Functions.ExtensionBundle.Workflows.${extensionVersion}_any-any.zip`;

  return url;
}

/**
 * Gets the Extension Bundle Versions iterating through the default extension bundle path directory.
 * @param {string} directoryPath - extension bundle path directory.
 * @returns {string[]} Returns the list of versions.
 */
function getExtensionBundleVersionFolders(directoryPath: string): string[] {
  const items = fs.readdirSync(directoryPath);

  // Filter only the folders
  const folders = items.filter((item) => {
    const itemPath = path.join(directoryPath, item);
    return fs.statSync(itemPath).isDirectory();
  });

  return folders;
}

/**
 * Download Microsoft.Azure.Functions.ExtensionBundle.Workflows.<version>
 * Destination: C:\Users\<USERHOME>\.azure-functions-core-tools\Functions\ExtensionBundles\<version>
 * @param {IActionContext} context - Command context.
 * @returns {Promise<string>} Returns bundle extension zip url.
 */
export async function downloadExtensionBundle(context: IActionContext): Promise<void> {
  let envVarVer: string | undefined = process.env.AzureFunctionsJobHost_extensionBundle_version;
  const projectPath: string | undefined = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
  if (projectPath) {
    envVarVer = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName)))?.Values
      ?.AzureFunctionsJobHost_extensionBundle_version;
  }

  context.telemetry.properties.envVariableExtensionBundleVersion = envVarVer;

  if (envVarVer) {
    const extensionBundleUrl = await getExtensionBundleZip(context, envVarVer);
    await downloadAndExtractDependency(extensionBundleUrl, defaultExtensionBundlePathValue, extensionBundleId, envVarVer);
    return;
  }

  // Check for latest version at directory.
  let latestLocalBundleVersion = '1.0.0';
  const localVersions = getExtensionBundleVersionFolders(defaultExtensionBundlePathValue);
  for (const localVersion of localVersions) {
    latestLocalBundleVersion = semver.gt(latestLocalBundleVersion, localVersion) ? latestLocalBundleVersion : localVersion;
  }

  // Check the latest from feed.
  let latestFeedBundleVersion = '1.0.0';
  const feed: IBundleFeed = await getWorkflowBundleFeed(context);
  for (const bundleVersion in feed.bundleVersions) {
    latestFeedBundleVersion = semver.gt(latestFeedBundleVersion, bundleVersion) ? latestFeedBundleVersion : bundleVersion;
  }

  context.telemetry.properties.latestLocalBundleVersion = latestLocalBundleVersion;
  context.telemetry.properties.latestFeedBundleVersion = latestFeedBundleVersion;

  if (semver.gt(latestFeedBundleVersion, latestLocalBundleVersion)) {
    const extensionBundleUrl = await getExtensionBundleZip(context, latestFeedBundleVersion);
    await downloadAndExtractDependency(extensionBundleUrl, defaultExtensionBundlePathValue, extensionBundleId, latestFeedBundleVersion);
  }
}
