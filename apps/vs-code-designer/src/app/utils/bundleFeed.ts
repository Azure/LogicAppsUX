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
import { fetchExpectedMd5, isMissingPackageError } from './integrity';
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

/**
 * Why the extension fell back from the configured experimental source URI to
 * the public CDN. Recorded only when a fallback actually fired.
 */
export type ExperimentalSourceFallbackReason = 'pinNotInIndex' | 'zip404' | 'index404' | 'networkError' | 'integrityFailure';

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
 * Same as `downloadBundleAndWriteSidecar` but returns `undefined` when the
 * configured CDN doesn't have the package (HTTP 404 / network failure) so
 * callers can fall back to a different source. Genuine integrity failures
 * (corrupt bytes despite valid headers) still throw — those should not be
 * silently retried against another CDN.
 */
async function tryDownloadBundleAndWriteSidecar(
  context: IActionContext,
  baseUrl: string,
  version: string
): Promise<{ ok: true } | { ok: false; reason: ExperimentalSourceFallbackReason; error: unknown }> {
  try {
    await downloadBundleAndWriteSidecar(context, baseUrl, version);
    return { ok: true };
  } catch (error) {
    if (isMissingPackageError(error)) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const reason: ExperimentalSourceFallbackReason = typeof status === 'number' && status === 404 ? 'zip404' : 'networkError';
      return { ok: false, reason, error };
    }
    throw error;
  }
}

/**
 * Fetches the index.json for the given (experimental) base URL. Returns the
 * version array on success, `undefined` on 404 / network error so the caller
 * can fall back. Other errors (e.g. malformed JSON) propagate.
 */
async function tryFetchSourceIndex(
  context: IActionContext,
  baseUrl: string
): Promise<{ ok: true; versions: string[] } | { ok: false; reason: ExperimentalSourceFallbackReason; error: unknown }> {
  const url = `${baseUrl}/ExtensionBundles/${extensionBundleId}/index.json`;
  try {
    const versions: string[] = await getJsonFeed(context, url);
    return { ok: true, versions };
  } catch (error) {
    if (isMissingPackageError(error)) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const reason: ExperimentalSourceFallbackReason = typeof status === 'number' && status === 404 ? 'index404' : 'networkError';
      return { ok: false, reason, error };
    }
    throw error;
  }
}

function logExperimentalFallback(context: IActionContext, reason: ExperimentalSourceFallbackReason, detail: string, error?: unknown): void {
  context.telemetry.properties.experimentalSourceFallback = reason;
  context.telemetry.properties.experimentalSourceFallbackTarget = 'public';
  if (ext.outputChannel) {
    const message = error instanceof Error ? `${detail} (${error.message})` : detail;
    ext.outputChannel.appendLog(
      localize(
        'experimentalSourceFallback',
        'Experimental extension-bundle source could not deliver ({0}); falling back to public CDN. {1}',
        reason,
        message
      )
    );
  }
}

/**
 * Why we're about to (re)download a bundle — drives the user-facing
 * notification copy so the user understands *why* something is being
 * downloaded, not just *that* it is.
 */
type DownloadReason =
  | 'newerVersion'
  | 'sidecarMissing'
  | 'sidecarMismatch'
  | 'experimentalPin'
  | 'experimentalLatest'
  | 'envVarPin'
  | 'fallbackPublic';

function describeSource(baseUrl: string): string {
  if (baseUrl.startsWith(PUBLIC_BUNDLE_BASE_URL)) {
    return localize('bundleSourcePublic', 'public Azure CDN');
  }
  return baseUrl;
}

function buildProgressTitle(version: string, reason: DownloadReason, baseUrl: string): string {
  const source = describeSource(baseUrl);
  switch (reason) {
    case 'sidecarMissing':
    case 'sidecarMismatch':
      return localize(
        'bundleProgressRedownload',
        'Re-downloading Logic Apps extension bundle {0} from {1} (local copy was incomplete)…',
        version,
        source
      );
    case 'newerVersion':
      return localize('bundleProgressNewer', 'Downloading newer Logic Apps extension bundle {0} from {1}…', version, source);
    case 'experimentalPin':
      return localize('bundleProgressPin', 'Downloading pinned Logic Apps extension bundle {0} from {1}…', version, source);
    case 'experimentalLatest':
      return localize(
        'bundleProgressExperimental',
        'Downloading Logic Apps extension bundle {0} from experimental source {1}…',
        version,
        source
      );
    case 'envVarPin':
      return localize(
        'bundleProgressEnvVar',
        'Downloading Logic Apps extension bundle {0} pinned by host.json/env from {1}…',
        version,
        source
      );
    case 'fallbackPublic':
      return localize(
        'bundleProgressFallback',
        'Experimental source could not deliver Logic Apps extension bundle {0}; downloading from public Azure CDN…',
        version
      );
    default:
      return localize('bundleProgressGeneric', 'Downloading Logic Apps extension bundle {0}…', version);
  }
}

/**
 * Surfaces a one-time warning toast when we detect that the local copy of
 * the bundle is corrupt / incomplete. We always follow it with the actual
 * download (which the user also sees via the progress notification), so
 * the warning is informational only — no buttons.
 */
function notifyCorruptionDetected(version: string, source: string): void {
  vscode.window.showWarningMessage(
    localize(
      'bundleCorruptionDetected',
      'Logic Apps extension bundle {0} on disk is incomplete or its checksum no longer matches {1}. Re-downloading.',
      version,
      source
    )
  );
}

/**
 * Wraps `downloadBundleAndWriteSidecar` in a `withProgress` notification and
 * shows a success toast so the user can see what's happening rather than
 * silently waiting on activation.
 *
 * Tests stub `vscode.window.withProgress` to immediately invoke its task, so
 * this stays unit-testable.
 */
async function downloadBundleWithProgress(
  context: IActionContext,
  baseUrl: string,
  version: string,
  reason: DownloadReason
): Promise<void> {
  const title = buildProgressTitle(version, reason, baseUrl);
  if (ext.outputChannel) {
    ext.outputChannel.appendLog(title);
  }
  await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title, cancellable: false }, async () => {
    await downloadBundleAndWriteSidecar(context, baseUrl, version);
  });
  vscode.window.showInformationMessage(localize('bundleDownloadReady', 'Logic Apps extension bundle {0} is ready.', version));
}

/**
 * Progress-wrapped variant of `tryDownloadBundleAndWriteSidecar` for the
 * experimental → public fallback chain. Behaves identically to the bare
 * helper but surfaces a progress notification during the attempt.
 */
async function tryDownloadBundleWithProgress(
  context: IActionContext,
  baseUrl: string,
  version: string,
  reason: DownloadReason
): Promise<{ ok: true } | { ok: false; reason: ExperimentalSourceFallbackReason; error: unknown }> {
  const title = buildProgressTitle(version, reason, baseUrl);
  if (ext.outputChannel) {
    ext.outputChannel.appendLog(title);
  }
  let outcome: { ok: true } | { ok: false; reason: ExperimentalSourceFallbackReason; error: unknown } = { ok: true };
  await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title, cancellable: false }, async () => {
    outcome = await tryDownloadBundleAndWriteSidecar(context, baseUrl, version);
  });
  if (outcome.ok) {
    vscode.window.showInformationMessage(localize('bundleDownloadReady', 'Logic Apps extension bundle {0} is ready.', version));
  }
  return outcome;
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

    // 1. Pinned via env / local.settings.json.
    //    Use a *membership* test against the full set of local versions, not
    //    equality with `latestLocalBundleVersion`. The runtime is happy with
    //    any matching cached version, so re-downloading just because a newer
    //    version also happens to be on disk is wasteful — and it's the
    //    "later version present locally wouldn't be used" complaint.
    if (envVarVer) {
      context.telemetry.properties.extensionBundleVersionSource = 'envVar';
      if (semver.valid(envVarVer) && localVersions.some((v) => v === envVarVer)) {
        ext.defaultBundleVersion = envVarVer;
        ext.latestBundleVersion = envVarVer;
        context.telemetry.properties.didUpdateExtensionBundle = 'false';
        return false;
      }
      await downloadBundleWithProgress(context, baseUrlInfo.baseUrl, envVarVer, 'envVarPin');
      context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
      context.telemetry.properties.didUpdateExtensionBundle = 'true';
      return true;
    }

    // 2. Experimental toggle on. Never consults the public CDN's *latest*
    //    feed for version selection — but if the configured private source
    //    cannot deliver the package AND we have no usable local copy, we
    //    fall back to downloading from the public CDN as a last resort so
    //    the dev isn't left with a non-running environment.
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

        // Pin not on disk: try the configured experimental source URI first
        // (if any), then fall back to the public CDN for the same pin.
        if (baseUrlInfo.experimentalSourceUri.length > 0) {
          // Optionally probe the source's index first — this lets us
          // distinguish "private CDN doesn't have this pin" from "private
          // CDN is fine but the zip URL was momentarily unreachable" so the
          // telemetry reason is accurate.
          const indexProbe = await tryFetchSourceIndex(context, baseUrlInfo.experimentalSourceUri);
          if (indexProbe.ok && indexProbe.versions.includes(pin)) {
            const result = await tryDownloadBundleWithProgress(context, baseUrlInfo.experimentalSourceUri, pin, 'experimentalPin');
            if (result.ok) {
              ext.defaultBundleVersion = pin;
              ext.latestBundleVersion = pin;
              context.telemetry.properties.extensionBundleVersionSource = 'experimentalFirstDownload';
              context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
              context.telemetry.properties.didUpdateExtensionBundle = 'true';
              return true;
            }
            logExperimentalFallback(
              context,
              result.reason,
              `Pin ${pin} listed in experimental index but its zip could not be downloaded.`,
              result.error
            );
          } else if (indexProbe.ok) {
            logExperimentalFallback(context, 'pinNotInIndex', `Pin ${pin} is not present in the experimental source index.`);
          } else {
            logExperimentalFallback(context, indexProbe.reason, 'Could not read the experimental source index.', indexProbe.error);
          }
        }

        // Fallback: download the pin from the public CDN.
        await downloadBundleWithProgress(context, PUBLIC_BUNDLE_BASE_URL, pin, 'fallbackPublic');
        ext.defaultBundleVersion = pin;
        ext.latestBundleVersion = pin;
        context.telemetry.properties.extensionBundleVersionSource = 'experimentalFirstDownload';
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        context.telemetry.properties.didUpdateExtensionBundle = 'true';
        return true;
      }

      if (latestLocalBundleVersion !== '0.0.0') {
        ext.defaultBundleVersion = latestLocalBundleVersion;
        ext.latestBundleVersion = latestLocalBundleVersion;
        context.telemetry.properties.extensionBundleVersionSource = 'experimentalLocalLatest';
        context.telemetry.properties.didUpdateExtensionBundle = 'false';
        return false;
      }

      // No pin, no local copy — try the experimental source URI for its
      // latest. If that fails (404 / network error / empty index), fall
      // through to the public-CDN default flow below.
      if (baseUrlInfo.experimentalSourceUri.length > 0) {
        const indexProbe = await tryFetchSourceIndex(context, baseUrlInfo.experimentalSourceUri);
        if (indexProbe.ok) {
          const experimentalLatest = pickLatestVersion(indexProbe.versions);
          if (experimentalLatest !== '0.0.0') {
            const result = await tryDownloadBundleWithProgress(
              context,
              baseUrlInfo.experimentalSourceUri,
              experimentalLatest,
              'experimentalLatest'
            );
            if (result.ok) {
              ext.defaultBundleVersion = experimentalLatest;
              ext.latestBundleVersion = experimentalLatest;
              context.telemetry.properties.extensionBundleVersionSource = 'experimentalFirstDownload';
              context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
              context.telemetry.properties.didUpdateExtensionBundle = 'true';
              return true;
            }
            logExperimentalFallback(
              context,
              result.reason,
              `Latest ${experimentalLatest} from experimental source failed to download.`,
              result.error
            );
          } else {
            logExperimentalFallback(context, 'index404', 'Experimental source index returned no versions.');
          }
        } else {
          logExperimentalFallback(context, indexProbe.reason, 'Could not read the experimental source index.', indexProbe.error);
        }
      }
      // Toggle is on but no pin, no local, and the experimental URI either
      // wasn't set or couldn't deliver — fall through to public-feed flow
      // so the dev isn't dead-in-the-water.
      context.telemetry.properties.experimentalFellThroughToPublic = 'true';
    }

    // 3. Default flow: use latest local if intact; otherwise re-download from CDN.
    //    If we got here via the experimental fall-through, force the public CDN —
    //    using the (broken) experimental baseUrl would defeat the whole point of
    //    the fallback.
    const fellThroughFromExperimental = baseUrlInfo.isExperimental;
    const effectiveBaseUrl = fellThroughFromExperimental ? PUBLIC_BUNDLE_BASE_URL : baseUrlInfo.baseUrl;

    let latestFeedBundleVersion = '0.0.0';
    let feedVersions: string[];
    if (fellThroughFromExperimental) {
      const publicIndexUrl = `${PUBLIC_BUNDLE_BASE_URL}/ExtensionBundles/${extensionBundleId}/index.json`;
      feedVersions = await getJsonFeed(context, publicIndexUrl);
    } else {
      feedVersions = await getWorkflowBundleFeed(context);
    }
    latestFeedBundleVersion = pickLatestVersion(feedVersions);

    context.telemetry.properties.latestBundleVersion = semver.gt(latestFeedBundleVersion, latestLocalBundleVersion)
      ? latestFeedBundleVersion
      : latestLocalBundleVersion;

    ext.defaultBundleVersion = context.telemetry.properties.latestBundleVersion;
    ext.latestBundleVersion = context.telemetry.properties.latestBundleVersion;

    if (semver.gt(latestFeedBundleVersion, latestLocalBundleVersion)) {
      await downloadBundleWithProgress(context, effectiveBaseUrl, latestFeedBundleVersion, 'newerVersion');
      context.telemetry.properties.extensionBundleVersionSource = 'publicFeedLatest';
      context.telemetry.properties.localBundleHashCheck = 'skipped';
      context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
      context.telemetry.properties.didUpdateExtensionBundle = 'true';
      return true;
    }

    // Local is at least as new as the feed — verify the on-disk bundle's source MD5
    // and re-download if it's missing or has drifted (e.g. CDN republished the same version).
    if (latestLocalBundleVersion !== '0.0.0') {
      const hashCheck = await verifyLocalBundleHash(context, effectiveBaseUrl, latestLocalBundleVersion);
      context.telemetry.properties.localBundleHashCheck = hashCheck;
      if (hashCheck === 'sidecarMissing' || hashCheck === 'sidecarMismatch') {
        // Surface a one-shot warning so the user understands *why* we're
        // suddenly downloading on what looks like a steady-state activation.
        notifyCorruptionDetected(latestLocalBundleVersion, describeSource(effectiveBaseUrl));
        await downloadBundleWithProgress(context, effectiveBaseUrl, latestLocalBundleVersion, hashCheck);
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
