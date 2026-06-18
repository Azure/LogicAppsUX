/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  defaultVersionRange,
  extensionBundleId,
  localSettingsFileName,
  defaultExtensionBundlePathValue,
  bundleSourceMd5SidecarFile,
  useExperimentalExtensionBundleSettingKey,
  experimentalExtensionBundleSourceUriSettingKey,
  experimentalExtensionBundleVersionSettingKey,
} from '../../constants';
import { getLocalSettingsJson } from './appSettings/localSettings';
import { downloadAndExtractDependency } from './binaries';
import { fetchExpectedMd5 } from './integrity';
import { getJsonFeed } from './feed';
import { getGlobalSetting } from './vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed, IBundleMetadata, IHostJsonV2 } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { getFunctionsCommand } from './funcCoreTools/funcVersion';
import * as fse from 'fs-extra';
import { executeCommand } from './funcCoreTools/cpUtils';

const PUBLIC_BUNDLE_BASE_URL = 'https://cdn.functions.azure.com/public';

export type BundleBaseUrlSource = 'localSettings' | 'envVar' | 'experimentalSetting' | 'default';
export type BundleVersionSource =
  | 'envVar'
  | 'experimentalLocalPin'
  | 'experimentalFirstDownload'
  | 'experimentalLocalLatest'
  | 'publicFeedLatest'
  | 'localLatest';

interface ExtensionBundleBaseUrlResult {
  baseUrl: string;
  source: BundleBaseUrlSource;
  isExperimental: boolean;
  experimentalSourceUri: string;
  experimentalPinnedVersion: string;
}

/**
 * Resolves the base URL used for fetching the extension bundle index, dependency feed,
 * and zip — plus the experimental settings that may alter version-selection behavior.
 *
 * Precedence (highest → lowest):
 *   1. Workspace `local.settings.json` value `FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI`.
 *   2. `process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI`.
 *   3. VS Code experimental setting `experimentalExtensionBundleSourceUri` (only when
 *      `useExperimentalExtensionBundle` is `true` and the URI is non-empty).
 *   4. Default public CDN.
 */
export async function getExtensionBundleBaseUrl(context: IActionContext): Promise<ExtensionBundleBaseUrlResult> {
  const projectPath: string | undefined = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
  let localSettingsUri: string | undefined;
  if (projectPath) {
    try {
      localSettingsUri = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName)))?.Values
        ?.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
    } catch {
      // Missing/invalid local.settings.json is fine; fall through to other sources.
    }
  }

  const envVarUri: string | undefined = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  const isExperimental = getGlobalSetting<boolean>(useExperimentalExtensionBundleSettingKey) === true;
  const experimentalSourceUri = (getGlobalSetting<string>(experimentalExtensionBundleSourceUriSettingKey) ?? '').trim();
  const experimentalPinnedVersion = (getGlobalSetting<string>(experimentalExtensionBundleVersionSettingKey) ?? '').trim();

  let baseUrl: string;
  let source: BundleBaseUrlSource;
  if (localSettingsUri && localSettingsUri.length > 0) {
    baseUrl = localSettingsUri;
    source = 'localSettings';
  } else if (envVarUri && envVarUri.length > 0) {
    baseUrl = envVarUri;
    source = 'envVar';
  } else if (isExperimental && experimentalSourceUri.length > 0) {
    baseUrl = experimentalSourceUri;
    source = 'experimentalSetting';
  } else {
    baseUrl = PUBLIC_BUNDLE_BASE_URL;
    source = 'default';
  }

  context.telemetry.properties.extensionBundleBaseUrlSource = source;
  context.telemetry.properties.useExperimentalExtensionBundle = String(isExperimental);

  return { baseUrl, source, isExperimental, experimentalSourceUri, experimentalPinnedVersion };
}

/**
 * Gets Workflow bundle extension feed.
 * @param {IActionContext} context - Command context.
 * @returns {Promise<string[]>} Returns array of available bundle versions.
 */
async function getWorkflowBundleFeed(context: IActionContext): Promise<string[]> {
  const { baseUrl } = await getExtensionBundleBaseUrl(context);
  const url = `${baseUrl}/ExtensionBundles/${extensionBundleId}/index.json`;
  return getJsonFeed(context, url);
}

/**
 * Gets extension bundle dependency feed.
 * @param {IActionContext} context - Command context.
 * @param {IBundleMetadata | undefined} bundleMetadata - Bundle meta data.
 * @returns {Promise<IBundleDependencyFeed>} Returns bundle extension object.
 */
async function getBundleDependencyFeed(
  context: IActionContext,
  bundleMetadata: IBundleMetadata | undefined
): Promise<IBundleDependencyFeed> {
  const bundleId: string = (bundleMetadata && bundleMetadata?.id) || extensionBundleId;
  const { baseUrl } = await getExtensionBundleBaseUrl(context);
  const url = `${baseUrl}/ExtensionBundles/${bundleId}/dependency.json`;
  return getJsonFeed(context, url);
}

/**
 * Gets latest bundle extension version range.
 * @returns {string} Returns latest version range.
 */
export function getLatestVersionRange(): string {
  return defaultVersionRange;
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
 * @param {IHostJsonV2} hostJson - Host.json configuration.
 */
export function addDefaultBundle(hostJson: IHostJsonV2): void {
  hostJson.extensionBundle = {
    id: extensionBundleId,
    version: defaultVersionRange,
  };
}

/**
 * Builds the URL to the bundle's zip on the configured base URL.
 */
function buildExtensionBundleZipUrl(baseUrl: string, extensionVersion: string): string {
  return `${baseUrl}/ExtensionBundles/${extensionBundleId}/${extensionVersion}/${extensionBundleId}.${extensionVersion}_any-any.zip`;
}

/**
 * Returns the absolute path of the on-disk MD5 sidecar for a given bundle version.
 * The sidecar is written by `downloadExtensionBundle` after a successful download
 * so subsequent startups can confirm the bundle still matches the publisher's
 * `Content-MD5` header without re-downloading.
 */
function getBundleSidecarPath(version: string): string {
  return path.join(defaultExtensionBundlePathValue, version, bundleSourceMd5SidecarFile);
}

async function readBundleSidecar(version: string): Promise<string | undefined> {
  const sidecarPath = getBundleSidecarPath(version);
  try {
    if (!(await fse.pathExists(sidecarPath))) {
      return undefined;
    }
    const value = (await fse.readFile(sidecarPath, 'utf8')).trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

async function writeBundleSidecar(version: string, md5: string): Promise<void> {
  const sidecarPath = getBundleSidecarPath(version);
  try {
    await fse.outputFile(sidecarPath, md5, 'utf8');
  } catch (writeError) {
    if (ext.outputChannel) {
      ext.outputChannel.appendLog(
        localize('bundleSidecarWriteFailed', 'Failed to write extension-bundle MD5 sidecar at "{0}": {1}', sidecarPath, String(writeError))
      );
    }
  }
}

/**
 * Gets the Extension Bundle Versions iterating through the default extension bundle path directory.
 * @param {string} directoryPath - extension bundle path directory.
 * @returns {string[]} Returns the list of versions.
 */
async function getExtensionBundleVersionFolders(directoryPath: string): Promise<string[]> {
  if (!(await fse.pathExists(directoryPath))) {
    return [];
  }
  const directoryContents = fse.readdirSync(directoryPath);

  // Filter only the folders with valid version names.
  const folders = directoryContents.filter((item) => {
    const itemPath = path.join(directoryPath, item);
    return fse.statSync(itemPath).isDirectory() && semver.valid(item);
  });

  return folders;
}

function pickLatestVersion(versions: string[]): string {
  let latest = '0.0.0';
  for (const v of versions) {
    if (semver.valid(v) && semver.gt(v, latest)) {
      latest = v;
    }
  }
  return latest;
}

/**
 * Downloads the bundle zip from the resolved base URL and writes the sidecar.
 * Used both for the standard "feed wins" path and for the experimental cold-start path.
 */
async function downloadBundleAndWriteSidecar(context: IActionContext, baseUrl: string, version: string): Promise<void> {
  const zipUrl = buildExtensionBundleZipUrl(baseUrl, version);
  const result = await downloadAndExtractDependency(context, zipUrl, defaultExtensionBundlePathValue, extensionBundleId, version);
  if (result?.actualMd5) {
    await writeBundleSidecar(version, result.actualMd5);
  }
}

/**
 * Verifies the on-disk bundle's source MD5 against what the public CDN currently
 * reports via HEAD. Used only when the experimental toggle is OFF.
 */
async function verifyLocalBundleHash(
  context: IActionContext,
  publicBaseUrl: string,
  localVersion: string
): Promise<'passed' | 'sidecarMissing' | 'sidecarMismatch' | 'headRequestFailed'> {
  const sidecarValue = await readBundleSidecar(localVersion);
  if (!sidecarValue) {
    return 'sidecarMissing';
  }

  const headUrl = buildExtensionBundleZipUrl(publicBaseUrl, localVersion);
  let publishedMd5: string | undefined;
  try {
    publishedMd5 = await fetchExpectedMd5(headUrl);
  } catch (error) {
    if (ext.outputChannel) {
      ext.outputChannel.appendLog(
        localize(
          'bundleHashHeadFailed',
          'Failed to verify extension-bundle MD5 against {0}: {1}',
          headUrl,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
    context.telemetry.properties.bundleHashHeadError = error instanceof Error ? error.message : String(error);
    return 'headRequestFailed';
  }

  if (!publishedMd5) {
    // Server didn't return a Content-MD5 — can't verify either way; treat as passed
    // so we don't pointlessly re-download just because the CDN dropped the header.
    return 'passed';
  }
  return publishedMd5 === sidecarValue ? 'passed' : 'sidecarMismatch';
}

/**
 * Download Microsoft.Azure.Functions.ExtensionBundle.Workflows.<version>
 * Destination: C:\Users\<USERHOME>\.azure-functions-core-tools\Functions\ExtensionBundles\<version>
 * @param {IActionContext} context - Command context.
 * @returns {Promise<bool>} A boolean indicating whether the bundle was updated.
 */
export async function downloadExtensionBundle(context: IActionContext): Promise<boolean> {
  const downloadExtensionBundleStartTime = Date.now();
  try {
    let envVarVer: string | undefined = process.env.AzureFunctionsJobHost_extensionBundle_version;
    const projectPath: string | undefined = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
    if (projectPath) {
      try {
        envVarVer = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName)))?.Values
          ?.AzureFunctionsJobHost_extensionBundle_version;
      } catch {
        // ignore
      }
    }

    const localVersions = await getExtensionBundleVersionFolders(defaultExtensionBundlePathValue);
    const latestLocalBundleVersion = pickLatestVersion(localVersions);
    const baseUrlInfo = await getExtensionBundleBaseUrl(context);

    context.telemetry.properties.envVariableExtensionBundleVersion = envVarVer;

    // 1. Pinned via env / local.settings.json — existing behavior.
    if (envVarVer) {
      context.telemetry.properties.extensionBundleVersionSource = 'envVar';
      if (latestLocalBundleVersion !== '0.0.0' && semver.valid(envVarVer) && semver.eq(envVarVer, latestLocalBundleVersion)) {
        return false;
      }
      await downloadBundleAndWriteSidecar(context, baseUrlInfo.baseUrl, envVarVer);
      context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
      context.telemetry.properties.didUpdateExtensionBundle = 'true';
      return true;
    }

    // 2. Experimental toggle on — never call the public feed.
    if (baseUrlInfo.isExperimental) {
      const pin = baseUrlInfo.experimentalPinnedVersion;

      if (pin && pin.length > 0) {
        const pinIsLocal = localVersions.some((v) => v === pin);
        if (pinIsLocal) {
          ext.defaultBundleVersion = pin;
          ext.latestBundleVersion = pin;
          context.telemetry.properties.extensionBundleVersionSource = 'experimentalLocalPin';
          context.telemetry.properties.didUpdateExtensionBundle = 'false';
          return false;
        }
        if (baseUrlInfo.experimentalSourceUri.length > 0) {
          await downloadBundleAndWriteSidecar(context, baseUrlInfo.experimentalSourceUri, pin);
          ext.defaultBundleVersion = pin;
          ext.latestBundleVersion = pin;
          context.telemetry.properties.extensionBundleVersionSource = 'experimentalFirstDownload';
          context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
          context.telemetry.properties.didUpdateExtensionBundle = 'true';
          return true;
        }
        // Pin set, not on disk, no source URI — fall through to "no pin" path below.
      }

      if (latestLocalBundleVersion !== '0.0.0') {
        ext.defaultBundleVersion = latestLocalBundleVersion;
        ext.latestBundleVersion = latestLocalBundleVersion;
        context.telemetry.properties.extensionBundleVersionSource = 'experimentalLocalLatest';
        context.telemetry.properties.didUpdateExtensionBundle = 'false';
        return false;
      }

      if (baseUrlInfo.experimentalSourceUri.length > 0) {
        // Cold start with no pin: ask the experimental source for its index and grab its latest.
        const experimentalIndexUrl = `${baseUrlInfo.experimentalSourceUri}/ExtensionBundles/${extensionBundleId}/index.json`;
        const experimentalFeed: string[] = await getJsonFeed(context, experimentalIndexUrl);
        const experimentalLatest = pickLatestVersion(experimentalFeed);
        if (experimentalLatest === '0.0.0') {
          throw new Error(
            localize(
              'experimentalBundleEmpty',
              'Experimental extension-bundle source "{0}" returned no versions.',
              baseUrlInfo.experimentalSourceUri
            )
          );
        }
        await downloadBundleAndWriteSidecar(context, baseUrlInfo.experimentalSourceUri, experimentalLatest);
        ext.defaultBundleVersion = experimentalLatest;
        ext.latestBundleVersion = experimentalLatest;
        context.telemetry.properties.extensionBundleVersionSource = 'experimentalFirstDownload';
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        context.telemetry.properties.didUpdateExtensionBundle = 'true';
        return true;
      }
      // Toggle is on but no pin, no local, no experimental URI — fall through to public-feed flow
      // so the dev isn't dead-in-the-water just because they enabled the toggle without configuring
      // anything else.
      context.telemetry.properties.experimentalFellThroughToPublic = 'true';
    }

    // 3. Default flow: use latest local if intact; otherwise re-download from CDN.
    let latestFeedBundleVersion = '0.0.0';
    const feedVersions: string[] = await getWorkflowBundleFeed(context);
    latestFeedBundleVersion = pickLatestVersion(feedVersions);

    context.telemetry.properties.latestBundleVersion = semver.gt(latestFeedBundleVersion, latestLocalBundleVersion)
      ? latestFeedBundleVersion
      : latestLocalBundleVersion;

    ext.defaultBundleVersion = context.telemetry.properties.latestBundleVersion;
    ext.latestBundleVersion = context.telemetry.properties.latestBundleVersion;

    if (semver.gt(latestFeedBundleVersion, latestLocalBundleVersion)) {
      await downloadBundleAndWriteSidecar(context, baseUrlInfo.baseUrl, latestFeedBundleVersion);
      context.telemetry.properties.extensionBundleVersionSource = 'publicFeedLatest';
      context.telemetry.properties.localBundleHashCheck = 'skipped';
      context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
      context.telemetry.properties.didUpdateExtensionBundle = 'true';
      return true;
    }

    // Local is at least as new as the feed — verify the on-disk bundle's source MD5
    // and re-download if it's missing or has drifted (e.g. CDN republished the same version).
    if (latestLocalBundleVersion !== '0.0.0') {
      const hashCheck = await verifyLocalBundleHash(context, baseUrlInfo.baseUrl, latestLocalBundleVersion);
      context.telemetry.properties.localBundleHashCheck = hashCheck;
      if (hashCheck === 'sidecarMissing' || hashCheck === 'sidecarMismatch') {
        await downloadBundleAndWriteSidecar(context, baseUrlInfo.baseUrl, latestLocalBundleVersion);
        context.telemetry.properties.extensionBundleVersionSource = 'publicFeedLatest';
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        context.telemetry.properties.didUpdateExtensionBundle = 'true';
        return true;
      }
    } else {
      context.telemetry.properties.localBundleHashCheck = 'skipped';
    }

    context.telemetry.properties.extensionBundleVersionSource = 'localLatest';
    context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
    context.telemetry.properties.didUpdateExtensionBundle = 'false';
    return false;
  } catch (error) {
    const errorMessage = `Error downloading and extracting the Logic Apps Standard extension bundle: ${error instanceof Error ? error.message : String(error)}`;
    context.telemetry.properties.errorMessage = errorMessage;
    return false;
  }
}

/**
 * Retrieves the latest version number of a bundle from the specified folder.
 * @param {string} bundleFolder - The path to the folder containing the bundle.
 * @returns The latest version number of the bundle.
 * @throws An error if the bundle folder is empty.
 */
export const getLatestBundleVersion = async (bundleFolder: string) => {
  let bundleVersionNumber = '0.0.0';

  const bundleFolders = await fse.readdir(bundleFolder);
  if (bundleFolders.length === 0) {
    throw new Error(localize('bundleMissingError', 'Extension bundle could not be found.'));
  }

  for (const file of bundleFolders) {
    const filePath: string = path.join(bundleFolder, file);
    if (await (await fse.stat(filePath)).isDirectory()) {
      bundleVersionNumber = getMaxVersion(bundleVersionNumber, file);
    }
  }

  return bundleVersionNumber;
};

/**
 * Compares and gets biggest extension bundle version.
 * @param version1 - Extension bundle version.
 * @param version2 - Extension bundle version.
 * @returns {string} Biggest extension bundle version.
 */
function getMaxVersion(version1, version2): string {
  let maxVersion = '';
  let arr1 = version1.split('.');
  let arr2 = version2.split('.');

  arr1 = arr1.map(Number);
  arr2 = arr2.map(Number);

  const arr1Size = arr1.length;
  const arr2Size = arr2.length;

  if (arr1Size > arr2Size) {
    for (let i = arr2Size; i < arr1Size; i++) {
      arr2.push(0);
    }
  } else {
    for (let i = arr1Size; i < arr2Size; i++) {
      arr1.push(0);
    }
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] > arr2[i]) {
      maxVersion = version1;
      break;
    }
    if (arr2[i] > arr1[i]) {
      maxVersion = version2;
      break;
    }
  }
  return maxVersion;
}

let cachedBundleVersion: string | null = null;

export function resetCachedBundleVersion(): void {
  cachedBundleVersion = null;
}

/**
 * Retrieves the highest version number of the extension bundle available in the bundle folder.
 *
 * This function locates the extension bundle folder, enumerates its subdirectories,
 * and determines the maximum version number present among them. If no bundle is found,
 * it throws an error.
 *
 * @returns {Promise<string>} A promise that resolves to the highest bundle version number as a string (e.g., "1.2.3").
 * @throws {Error} If the extension bundle folder is missing or contains no subdirectories.
 */
export async function getBundleVersionNumber(workingDirectory?: string): Promise<string> {
  // Return cached version if available (saves ~450ms on subsequent calls)
  if (cachedBundleVersion) {
    return cachedBundleVersion;
  }

  const bundleFolderRoot = await getExtensionBundleFolder(workingDirectory);
  const bundleFolder = path.join(bundleFolderRoot, extensionBundleId);
  let bundleVersionNumber = '0.0.0';

  const bundleFolders = await fse.readdir(bundleFolder);
  if (bundleFolders.length === 0) {
    throw new Error(localize('bundleMissingError', 'Extension bundle could not be found.'));
  }

  for (const file of bundleFolders) {
    const filePath: string = path.join(bundleFolder, file);
    if (await (await fse.stat(filePath)).isDirectory()) {
      bundleVersionNumber = getMaxVersion(bundleVersionNumber, file);
    }
  }

  // Cache the result
  cachedBundleVersion = bundleVersionNumber;
  return bundleVersionNumber;
}

/**
 * Gets extension bundle folder path.
 * @param workingDirectory Optional directory to run `func GetExtensionBundlePath` in. When omitted,
 *   falls back to the first VS Code workspace folder. Callers that already know the Logic App
 *   project root should pass it in to avoid resolving against an unrelated folder (for example,
 *   a custom-code subproject that was sorted first by the workspace).
 * @returns {string} Extension bundle folder path.
 */
export async function getExtensionBundleFolder(workingDirectory?: string): Promise<string> {
  let command: string;
  try {
    command = getFunctionsCommand();
  } catch (commandError) {
    const dependenciesNotReadyError = new Error(
      localize('dependenciesNotReady', 'Logic Apps Standard runtime dependencies are still installing. Please wait a moment and try again.')
    );
    if (ext.outputChannel) {
      ext.outputChannel.appendLog(dependenciesNotReadyError.message);
      ext.outputChannel.appendLog(JSON.stringify(commandError));
      ext.telemetryReporter?.sendTelemetryEvent('bundleDependenciesNotReady', { value: dependenciesNotReadyError.message });
    }
    throw dependenciesNotReadyError;
  }

  const outputChannel = ext.outputChannel;
  const resolvedWorkingDirectory = workingDirectory ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  let extensionBundlePath = '';
  try {
    const result = await executeCommand(outputChannel, resolvedWorkingDirectory, command, 'GetExtensionBundlePath');

    // Split by newlines and find the line that contains the actual path
    const lines = result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // The path line should contain "ExtensionBundles" and look like a valid path
    const pathLine = lines.find(
      (line) => line.includes('ExtensionBundles') && (line.match(/^[A-Z]:\\/i) || line.startsWith('/')) // Windows or Unix path
    );

    if (!pathLine) {
      const pathError = new Error('Could not find extension bundle path in command output.');
      ext.telemetryReporter.sendTelemetryEvent('BundlePathNotFound', { value: pathError.message });
      throw pathError;
    }

    const bundlePathMatch = pathLine.match(/^(.+?[\\/]ExtensionBundles[/\\])/i);
    if (bundlePathMatch) {
      extensionBundlePath = bundlePathMatch[1];
    } else {
      const splitIndex = pathLine.lastIndexOf('Microsoft.Azure.Functions.ExtensionBundle');
      if (splitIndex !== -1) {
        extensionBundlePath = pathLine.substring(0, splitIndex);
      } else {
        const parseError = new Error('Could not parse extension bundle path from output.');
        ext.telemetryReporter.sendTelemetryEvent('bundlePathParseError', { value: parseError.message });
        throw parseError;
      }
    }
  } catch (error) {
    const bundleCommandError = new Error('Could not find path to extension bundle.');
    if (outputChannel) {
      outputChannel.appendLog(bundleCommandError.message);
      outputChannel.appendLog(JSON.stringify(error));
      ext.telemetryReporter.sendTelemetryEvent('bundleCommandError', { value: bundleCommandError.message });
    }
    throw new Error(bundleCommandError.message);
  }

  if (outputChannel) {
    outputChannel.appendLog(localize('extensionBundlePath', 'Extension bundle path: "{0}"...', extensionBundlePath));
  }
  return extensionBundlePath;
}
