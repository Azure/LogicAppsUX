/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  defaultVersionRange,
  extensionBundleId,
  defaultExtensionBundlePathValue,
  bundleInstallCompleteFile,
  useExperimentalExtensionBundleSettingKey,
  experimentalExtensionBundleSourceUriSettingKey,
  experimentalExtensionBundleVersionSettingKey,
  legacyBundleInstallMarkerFile,
} from '../../constants';
import { getLocalSettingsJson } from './appSettings/localSettings';
import { downloadAndExtractDependency } from './binaries';
import { isMissingPackageError } from './integrity';
import { getJsonFeed } from './feed';
import { recordDependencyUpdateCheck, shouldCheckForDependencyUpdates } from '../state/dependencies';
import { getGlobalSetting } from './vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IRuntimeDependencyVersions, IBundleMetadata, IHostJsonV2 } from '@microsoft/vscode-extension-logic-apps';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { getFunctionsCommand } from './funcCoreTools/funcVersion';
import * as fse from 'fs-extra';
import { executeCommand } from './funcCoreTools/cpUtils';
import { selectLogicAppRoot } from './workspace';

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
export type ExperimentalSourceFallbackReason = 'pinNotInIndex' | 'zip404' | 'index404' | 'networkError';

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
  const projectPath = await selectLogicAppRoot(context, true);

  let localSettingsUri: string | undefined;
  if (projectPath) {
    try {
      localSettingsUri = (await getLocalSettingsJson(context, projectPath))?.Values?.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
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
 * @returns {Promise<IRuntimeDependencyVersions>} Returns bundle extension object.
 */
export async function getBundleDependencyFeed(
  context: IActionContext,
  bundleMetadata?: IBundleMetadata
): Promise<IRuntimeDependencyVersions> {
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

async function tryMigrateLegacyBundleInstallMarker(version: string): Promise<boolean> {
  if (!(await hasLegacyBundleInstallMarker(version))) {
    return false;
  }

  await writeBundleInstallMarker(version);
  return true;
}

async function hasLegacyBundleInstallMarker(version: string): Promise<boolean> {
  const markerPath = path.join(defaultExtensionBundlePathValue, version, legacyBundleInstallMarkerFile);
  try {
    return await fse.pathExists(markerPath);
  } catch {
    return false;
  }
}

async function writeBundleInstallMarker(version: string): Promise<void> {
  const markerPath = getBundleInstallMarkerPath(version);
  const temporaryMarkerPath = `${markerPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fse.outputFile(temporaryMarkerPath, '', 'utf8');
    await fse.move(temporaryMarkerPath, markerPath, { overwrite: true });
  } catch (writeError) {
    await fse.remove(temporaryMarkerPath).catch(() => undefined);
    const message = localize(
      'bundleInstallMarkerWriteFailed',
      'Failed to write extension-bundle installation marker at "{0}": {1}',
      markerPath,
      String(writeError)
    );
    ext.outputChannel?.appendLog(message);
    throw new Error(message);
  }

  try {
    await fse.remove(path.join(defaultExtensionBundlePathValue, version, legacyBundleInstallMarkerFile));
  } catch {
    ext.outputChannel?.appendLog(
      localize(
        'legacyBundleInstallMarkerRemovalFailed',
        'Failed to remove legacy extension-bundle installation marker at "{0}"',
        path.join(defaultExtensionBundlePathValue, version, legacyBundleInstallMarkerFile)
      )
    );
  }
}

function getBundleInstallMarkerPath(version: string): string {
  return path.join(defaultExtensionBundlePathValue, version, bundleInstallCompleteFile);
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
 * Downloads and extracts a bundle, then writes a non-hash completion marker.
 * Download transport integrity and archive extraction completeness are verified
 * before this function returns.
 */
async function downloadBundleAndWriteMarker(context: IActionContext, baseUrl: string, version: string): Promise<void> {
  const markerPath = getBundleInstallMarkerPath(version);
  await fse.remove(markerPath);
  const zipUrl = buildExtensionBundleZipUrl(baseUrl, version);
  await downloadAndExtractDependency(context, zipUrl, defaultExtensionBundlePathValue, extensionBundleId, version);
  await writeBundleInstallMarker(version);
}
/**
 * Same as `downloadBundleAndWriteMarker` but returns `undefined` when the
 * configured CDN doesn't have the package (HTTP 404 / network failure) so
 * callers can fall back to a different source. Genuine integrity failures
 * (corrupt bytes despite valid headers) still throw — those should not be
 * silently retried against another CDN.
 */
async function tryDownloadBundleAndWriteMarker(
  context: IActionContext,
  baseUrl: string,
  version: string
): Promise<{ ok: true } | { ok: false; reason: ExperimentalSourceFallbackReason; error: unknown }> {
  try {
    await downloadBundleAndWriteMarker(context, baseUrl, version);
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
  | 'installRequired'
  | 'experimentalPin'
  | 'experimentalLatest'
  | 'envVarPin'
  | 'envVarRepair'
  | 'experimentalPinRepair'
  | 'experimentalLocalLatestRepair'
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
    case 'installRequired':
      return localize('bundleProgressInstallRequired', 'Installing Logic Apps extension bundle {0} from {1}…', version, source);
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
    case 'envVarRepair':
      return localize(
        'bundleProgressEnvVarRepair',
        'Reinstalling pinned Logic Apps extension bundle {0} from {1} because installation is incomplete…',
        version,
        source
      );
    case 'experimentalPinRepair':
      return localize(
        'bundleProgressExperimentalPinRepair',
        'Reinstalling experimental pinned Logic Apps extension bundle {0} from {1} because installation is incomplete…',
        version,
        source
      );
    case 'experimentalLocalLatestRepair':
      return localize(
        'bundleProgressExperimentalLatestRepair',
        'Reinstalling Logic Apps extension bundle {0} (experimental local latest) from {1} because installation is incomplete…',
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
 * Wraps `downloadBundleAndWriteMarker` in a `withProgress` notification and
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
    await downloadBundleAndWriteMarker(context, baseUrl, version);
  });
  ext.outputChannel.appendLog(localize('bundleDownloadReady', 'Logic Apps extension bundle {0} is ready.', version));
}

/**
 * Progress-wrapped variant of `tryDownloadBundleAndWriteMarker` for the
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
    outcome = await tryDownloadBundleAndWriteMarker(context, baseUrl, version);
  });
  if (outcome.ok) {
    ext.outputChannel.appendLog(localize('bundleDownloadReady', 'Logic Apps extension bundle {0} is ready.', version));
  }
  return outcome;
}

/**
 * Tracks any in-flight `downloadExtensionBundle` so other parts of the
 * extension (e.g. `startDesignTimeApi` which spawns `func.exe` against the
 * extracted bundle folder) can `await waitForExtensionBundleReady()` and
 * avoid racing against an active re-extract — which on Windows can lock the
 * bundle folder, kill the design-time host, and leave the user with a half-
 * extracted bundle until the next activation.
 *
 * Activation itself fires `downloadExtensionBundle` without awaiting so the
 * UI stays responsive; this gives any code path that *does* depend on the
 * extracted bundle a way to block on completion when needed. Stays a noop
 * (resolved promise) when no download is in flight.
 */
let inFlightBundleWork: Promise<void> | undefined;

/**
 * Outcome of the most recent extension-bundle install attempt this session.
 * `'unknown'` until `downloadExtensionBundle` has finished at least once.
 * `'failed'` when extraction/install threw (e.g. EPERM from a locked dir),
 * so callers can refuse to proceed with downstream work that requires a
 * known-healthy bundle (design-time host startup, dependency validation).
 */
export type BundleInstallResult = 'unknown' | 'ok' | 'failed';
let lastBundleInstallResult: BundleInstallResult = 'unknown';
let lastBundleInstallError: Error | undefined;

/**
 * Version of the extension bundle whose completion marker was already checked
 * this session.
 */
let healthyBundleVersion: string | null = null;

/**
 * Clears the session bundle-readiness cache.
 */
export function invalidateBundleHealthCache(): void {
  healthyBundleVersion = null;
}

export function getLastBundleInstallResult(): BundleInstallResult {
  return lastBundleInstallResult;
}

export function getLastBundleInstallError(): Error | undefined {
  return lastBundleInstallError;
}

/**
 * Tracks call-stacks that are currently *inside* `downloadExtensionBundle`.
 * Anything awaited from within that scope — most importantly the post-extract
 * `startAllDesignTimeApis` call that itself awaits `waitForExtensionBundleReady`
 * — must NOT block on `inFlightBundleWork`, or we self-deadlock: the in-flight
 * promise is resolved in `downloadExtensionBundle`'s `finally`, which can only
 * run once the awaited restart finishes.
 */
const bundleDownloadScope = new AsyncLocalStorage<true>();

export function waitForExtensionBundleReady(): Promise<void> {
  // Re-entrant call from within the download's own post-extract hook —
  // returning the in-flight promise here would deadlock. The caller is by
  // definition already running because the bundle is on disk.
  if (bundleDownloadScope.getStore() === true) {
    return Promise.resolve();
  }
  return inFlightBundleWork ?? Promise.resolve();
}

export function isExtensionBundleDownloadInFlight(): boolean {
  return inFlightBundleWork !== undefined;
}

/**
 * True iff the current async call stack is *inside* a `downloadExtensionBundle`
 * invocation (set by AsyncLocalStorage). Callers that gate on bundle health
 * (e.g. the design-time-host launcher) use this to suppress the misleading
 * "Waiting for bundle…" log when the call originates from the download's own
 * post-extract hook — the bundle is on disk by then, so there's nothing to
 * wait for and the message is just noise.
 */
export function isInsideBundleDownloadScope(): boolean {
  return bundleDownloadScope.getStore() === true;
}

/**
 * Minimal non-hash readiness check for an installed extension bundle.
 */
export type BundleOnDiskHealthResult =
  | { ok: true; version: string }
  | { ok: false; reason: 'noBundle' | 'markerMissing'; version?: string };

type BundleOnDiskHealthFailure = Extract<BundleOnDiskHealthResult, { ok: false }>;

function formatBundleHealthFailure(failure: BundleOnDiskHealthFailure): string {
  return failure.reason;
}

function throwBundleHealthError(prefix: string, failure: BundleOnDiskHealthFailure): never {
  throw new Error(
    `Logic Apps extension bundle is not installed correctly. ${prefix}: ${formatBundleHealthFailure(failure)}. Run the dependency reinstall command and retry.`
  );
}

export async function assertExtensionBundleOnDiskHealthy(version?: string): Promise<BundleOnDiskHealthResult> {
  let targetVersion = version;
  if (!targetVersion) {
    const localVersions = await getExtensionBundleVersionFolders(defaultExtensionBundlePathValue);
    const latest = pickLatestVersion(localVersions);
    if (latest === '0.0.0') {
      return { ok: false, reason: 'noBundle' };
    }
    targetVersion = latest;
  }

  const bundleDir = path.join(defaultExtensionBundlePathValue, targetVersion);
  if (!(await fse.pathExists(bundleDir))) {
    return { ok: false, reason: 'noBundle', version: targetVersion };
  }
  if (!(await hasBundleInstallMarker(targetVersion))) {
    if (await tryMigrateLegacyBundleInstallMarker(targetVersion)) {
      return { ok: true, version: targetVersion };
    }
    return { ok: false, reason: 'markerMissing', version: targetVersion };
  }
  return { ok: true, version: targetVersion };
}

async function hasBundleInstallMarker(version: string): Promise<boolean> {
  try {
    return await fse.pathExists(getBundleInstallMarkerPath(version));
  } catch {
    return false;
  }
}

async function evaluateBundleFastGate(version?: string): Promise<BundleOnDiskHealthResult> {
  return assertExtensionBundleOnDiskHealthy(version);
}
/**
 * Tracks a single in-flight background bundle "is there a newer version?" feed
 * refresh so a slow/flaky link can't stack up parallel CDN lookups. Reset in
 * {@link resetCachedBundleVersion}.
 */
let backgroundBundleFeedRefreshPromise: Promise<void> | undefined;

/**
 * Test/coordination seam: resolves once any in-flight background bundle feed
 * refresh (and its background upgrade download, if triggered) has settled.
 */
export function awaitBackgroundBundleFeedRefresh(): Promise<void> {
  return backgroundBundleFeedRefreshPromise ?? Promise.resolve();
}

/**
 * Options for {@link scheduleBackgroundBundleFeedRefresh}.
 */
interface BackgroundFeedRefreshOptions {
  /** Base URL the bundle is served from (public CDN unless pinned/experimental). */
  baseUrl: string;
  /** The healthy local bundle version the fast gate just trusted. */
  localVersion: string;
  /**
   * When the effective base URL fell back from a broken experimental source to
   * the public CDN, the feed lookup must target the public index too.
   */
  useExperimentalPublicFallback: boolean;
}

/**
 * Discovers whether the CDN publishes a newer bundle version than the trusted
 * local copy — OFF the activation hot path.
 *
 * The version "feed" GET (`index.json` on the bundle CDN) used to run
 * synchronously inside the activation-time download, which
 * `ensureExtensionBundleHealthy` awaits via `waitForExtensionBundleReady()`. On
 * a slow/flaky link to `cdn.functions.azure.com` that single GET adds tens of
 * seconds to EVERY launch whose daily update-check window is due (the in-memory
 * feed cache is wiped on each process restart). Since a healthy local bundle is
 * already good enough for this session, we move that lookup here: activation
 * proceeds immediately on the local bundle, and a newer version — if any — is
 * downloaded in the background and applied on the next launch. Mirrors the
 * throttled Node/Func/.NET "latest version" lookups. Deduped to at most one
 * in-flight run and gated by the caller to the shared update-check window.
 */
function scheduleBackgroundBundleFeedRefresh(context: IActionContext, options: BackgroundFeedRefreshOptions): void {
  if (backgroundBundleFeedRefreshPromise) {
    return;
  }
  backgroundBundleFeedRefreshPromise = (async () => {
    try {
      let feedVersions: string[];
      if (options.useExperimentalPublicFallback) {
        const publicIndexUrl = `${PUBLIC_BUNDLE_BASE_URL}/ExtensionBundles/${extensionBundleId}/index.json`;
        feedVersions = await getJsonFeed(context, publicIndexUrl);
      } else {
        feedVersions = await getWorkflowBundleFeed(context);
      }
      const latestFeedBundleVersion = pickLatestVersion(feedVersions);
      if (semver.gt(latestFeedBundleVersion, options.localVersion)) {
        ext.outputChannel?.appendLog(
          `Logic Apps extension bundle ${latestFeedBundleVersion} is available (local ${options.localVersion}); downloading in the background for the next launch.`
        );
        // The bundle on disk is about to change, so the session health cache is
        // no longer authoritative for the newer version.
        healthyBundleVersion = null;
        await downloadBundleWithProgress(context, options.baseUrl, latestFeedBundleVersion, 'newerVersion');
        ext.defaultBundleVersion = latestFeedBundleVersion;
        ext.latestBundleVersion = latestFeedBundleVersion;
      }
      // Record the shared daily update-check window so the next launch skips this
      // network lookup entirely (steady-state activation makes zero bundle CDN
      // calls). The dependency validators also record this when their own update
      // check runs; a redundant write is a harmless timestamp refresh.
      await recordDependencyUpdateCheck();
    } catch (error) {
      ext.outputChannel?.appendLog(
        `Logic Apps extension bundle background version check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      backgroundBundleFeedRefreshPromise = undefined;
    }
  })();
}

/**
 * Awaits any in-flight bundle work and throws if the most recent install
 * attempt failed. Callers that must not proceed without a healthy bundle
 * (e.g. design-time host startup, runtime dependency validation) should
 * call this rather than the lower-level `waitForExtensionBundleReady`.
 *
 * Readiness is based only on a successful-install marker. Installed files are
 * not inspected or hashed after download.
 *
 * Callers without a context (legacy) still get the old await-only behavior.
 */
interface EnsureExtensionBundleHealthyOptions {
  requireInstalled?: boolean;
}

export async function ensureExtensionBundleHealthy(
  context?: IActionContext,
  options: EnsureExtensionBundleHealthyOptions = {}
): Promise<void> {
  await waitForExtensionBundleReady();
  if (lastBundleInstallResult === 'failed') {
    const cause = lastBundleInstallError?.message ?? 'unknown error';
    throw new Error(
      `Logic Apps extension bundle is not installed correctly. Last install attempt failed: ${cause}. Close other VS Code windows running Logic Apps, terminate any leftover func.exe processes, and reload this window to retry.`
    );
  }

  if (!context) {
    return;
  }

  if (healthyBundleVersion) {
    return;
  }

  const initialHealth = await evaluateBundleFastGate();
  if (initialHealth.ok) {
    healthyBundleVersion = initialHealth.version;
    return;
  }
  const initialFailure = initialHealth as Extract<BundleOnDiskHealthResult, { ok: false }>;

  // No bundle at all and no in-flight install — let the caller's normal
  // path (downloadExtensionBundle from main.ts:157) handle first-run
  // bootstrap. We don't want to race that on a fresh install.
  if (initialFailure.reason === 'noBundle' && lastBundleInstallResult === 'unknown') {
    if (!options.requireInstalled || !context) {
      return;
    }
    ext.outputChannel?.appendLog('Logic Apps extension bundle is not installed. Downloading before dependency validation can complete.');
    await downloadExtensionBundle(context);
    const postInstallHealth = await assertExtensionBundleOnDiskHealthy();
    if (postInstallHealth.ok) {
      healthyBundleVersion = postInstallHealth.version;
      return;
    }
    throwBundleHealthError('Install completed but bundle readiness failed', postInstallHealth as BundleOnDiskHealthFailure);
  }

  const versionLabel = initialFailure.version ? ` ${initialFailure.version}` : '';
  const reasonLabel = formatBundleHealthFailure(initialFailure);
  ext.outputChannel?.appendLog(`Logic Apps extension bundle${versionLabel} is incomplete: ${reasonLabel}. Reinstalling.`);

  if (context.telemetry?.properties) {
    context.telemetry.properties.bundleInstallState = initialFailure.reason;
  }

  try {
    await downloadExtensionBundle(context);
  } catch (repairError) {
    const cause = repairError instanceof Error ? repairError.message : String(repairError);
    throw new Error(
      `Logic Apps extension bundle reinstall failed: ${cause}. Close other VS Code windows running Logic Apps, terminate any leftover func.exe processes, and retry.`
    );
  }

  const postRepairHealth = await assertExtensionBundleOnDiskHealthy();
  if (postRepairHealth.ok) {
    healthyBundleVersion = postRepairHealth.version;
    return;
  }
  throwBundleHealthError('Reinstall completed but bundle readiness failed', postRepairHealth as BundleOnDiskHealthFailure);
}

/**
 * Download Microsoft.Azure.Functions.ExtensionBundle.Workflows.<version>
 * Destination: C:\Users\<USERHOME>\.azure-functions-core-tools\Functions\ExtensionBundles\<version>
 * @param {IActionContext} context - Command context.
 * @returns {Promise<bool>} A boolean indicating whether the bundle was updated.
 */
export async function downloadExtensionBundle(context: IActionContext): Promise<boolean> {
  // Any (re)download or repair changes the bundle on disk, so the session
  // health cache is no longer authoritative — force the next
  // `ensureExtensionBundleHealthy` to re-verify.
  healthyBundleVersion = null;
  // Dedupe concurrent calls: if a download is already in flight, await it
  // instead of kicking off a parallel attempt that would race for the same
  // extraction directory.
  if (inFlightBundleWork) {
    await inFlightBundleWork;
    return false;
  }
  let resolveInFlight: (() => void) | undefined;
  inFlightBundleWork = new Promise<void>((resolve) => {
    resolveInFlight = resolve;
  });
  let installSucceededAndChanged = false;
  try {
    // Mark this whole call-stack as "inside the bundle download". Any nested
    // `waitForExtensionBundleReady()` will short-circuit instead of awaiting
    // the in-flight promise we own.
    const result = await bundleDownloadScope.run(true, () => downloadExtensionBundleCore(context));
    lastBundleInstallResult = 'ok';
    lastBundleInstallError = undefined;
    installSucceededAndChanged = result;
    return result;
  } catch (error) {
    lastBundleInstallResult = 'failed';
    lastBundleInstallError = error instanceof Error ? error : new Error(String(error));
    throw error;
  } finally {
    inFlightBundleWork = undefined;
    resolveInFlight?.();
    // Defer the post-install design-time restart until AFTER both the
    // in-flight promise is cleared AND `lastBundleInstallResult` is settled.
    // Earlier this restart fired from inside `downloadAndExtractDependency`
    // — while the install was still mid-flight and not yet verified — which
    // caused the design-time launcher to log a misleading "Waiting for
    // bundle download to complete…" line and then immediately spawn
    // `func.exe` (short-circuiting via `bundleDownloadScope`). With the
    // restart hoisted out here, `startDesignTimeApi` sees a clean
    // `lastBundleInstallResult === 'ok'` and an idle `inFlightBundleWork`.
    if (installSucceededAndChanged) {
      // Dynamic import to dodge the circular dependency between this module
      // and `startDesignTimeApi.ts` (which imports `waitForExtensionBundleReady`).
      // Fire-and-forget — we don't block the caller of `downloadExtensionBundle`
      // on the restart; failures are surfaced through the output channel.
      const restartPromise = (async () => {
        try {
          const { startAllDesignTimeApis } = await import('./codeless/startDesignTimeApi');
          await startAllDesignTimeApis();
        } catch (restartError) {
          ext.outputChannel?.appendLog(
            `Post-bundle-install design-time restart failed: ${restartError instanceof Error ? restartError.message : String(restartError)}`
          );
        }
      })();
      restartPromise.catch(() => undefined);
    }
  }
}

/**
 * Parameters describing which local bundle version a caller wants to trust for
 * this session, and how the background jobs should behave for it.
 */
interface HealthyLocalFastPathParams {
  /** The specific local bundle version the caller resolved (pin or latest). */
  version: string;
  /** Telemetry source label recorded when the fast path is taken. */
  versionSource: BundleVersionSource;
  /**
   * Whether a background "is there a newer version?" feed refresh is allowed.
   * Pinned (env / experimental pin) and experimental selections must NOT auto-
   * upgrade from the public latest feed, so they pass `false`.
   */
  allowFeedRefresh: boolean;
  /** Base URL for the optional background feed refresh. */
  feedRefreshBaseUrl: string;
  /** Whether the feed refresh must target the public index (experimental fallback). */
  useExperimentalPublicFallback?: boolean;
}

/**
 * Shared ready-local-bundle path for every bundle version-selection branch.
 */
async function tryHealthyLocalBundleFastPath(context: IActionContext, params: HealthyLocalFastPathParams): Promise<boolean> {
  if (!params.version || params.version === '0.0.0') {
    return false;
  }
  const localGate = await evaluateBundleFastGate(params.version);
  if (!localGate.ok) {
    return false;
  }
  const updateCheckDue = shouldCheckForDependencyUpdates();
  context.telemetry.properties.localBundleState = 'ready';
  if (!updateCheckDue) {
    context.telemetry.properties.extensionBundleUpdateCheckThrottled = 'true';
  }
  if (params.allowFeedRefresh && updateCheckDue) {
    scheduleBackgroundBundleFeedRefresh(context, {
      baseUrl: params.feedRefreshBaseUrl,
      localVersion: params.version,
      useExperimentalPublicFallback: params.useExperimentalPublicFallback === true,
    });
  }
  ext.defaultBundleVersion = params.version;
  ext.latestBundleVersion = params.version;
  context.telemetry.properties.extensionBundleVersionSource = params.versionSource;
  context.telemetry.properties.didUpdateExtensionBundle = 'false';
  return true;
}

async function downloadExtensionBundleCore(context: IActionContext): Promise<boolean> {
  const downloadExtensionBundleStartTime = Date.now();
  try {
    let envVarVer: string | undefined = process.env.AzureFunctionsJobHost_extensionBundle_version;
    // TODO(aeldridge): Should check all projects for pinned bundles, not just the first
    const projectPath = await selectLogicAppRoot(context, true);

    if (projectPath) {
      try {
        envVarVer = (await getLocalSettingsJson(context, projectPath))?.Values?.AzureFunctionsJobHost_extensionBundle_version;
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
        // Fast path first: a pinned local bundle with a valid completion marker
        // and required runtime entry points is trusted for this session.
        // A pin must never auto-upgrade, so no feed refresh.
        if (
          await tryHealthyLocalBundleFastPath(context, {
            version: envVarVer,
            versionSource: 'envVar',
            feedRefreshBaseUrl: baseUrlInfo.baseUrl,
            allowFeedRefresh: false,
          })
        ) {
          context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
          return false;
        }
        await downloadBundleWithProgress(context, baseUrlInfo.baseUrl, envVarVer, 'envVarRepair');
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        context.telemetry.properties.didUpdateExtensionBundle = 'true';
        return true;
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
          // The experimental URI remains the source for any required reinstall.
          const configuredBaseUrl =
            baseUrlInfo.experimentalSourceUri.length > 0 ? baseUrlInfo.experimentalSourceUri : PUBLIC_BUNDLE_BASE_URL;
          // Fast path first: a ready local pin is trusted for this session.
          // Pins never auto-upgrade.
          if (
            await tryHealthyLocalBundleFastPath(context, {
              version: pin,
              versionSource: 'experimentalLocalPin',
              feedRefreshBaseUrl: configuredBaseUrl,
              allowFeedRefresh: false,
            })
          ) {
            context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
            return false;
          }
          if (baseUrlInfo.experimentalSourceUri.length > 0) {
            const repair = await tryDownloadBundleWithProgress(context, baseUrlInfo.experimentalSourceUri, pin, 'experimentalPinRepair');
            if (repair.ok === true) {
              ext.defaultBundleVersion = pin;
              ext.latestBundleVersion = pin;
              context.telemetry.properties.extensionBundleVersionSource = 'experimentalPinRepair';
              context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
              context.telemetry.properties.didUpdateExtensionBundle = 'true';
              return true;
            }
            logExperimentalFallback(context, repair.reason, `Reinstall of pin ${pin} from experimental source failed.`, repair.error);
          }
          await downloadBundleWithProgress(context, PUBLIC_BUNDLE_BASE_URL, pin, 'experimentalPinRepair');
          ext.defaultBundleVersion = pin;
          ext.latestBundleVersion = pin;
          context.telemetry.properties.extensionBundleVersionSource = 'experimentalPinRepair';
          context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
          context.telemetry.properties.didUpdateExtensionBundle = 'true';
          return true;
        }

        // Pin not on disk: try the configured experimental source URI first
        // (if any), then fall back to the public CDN for the same pin.
        if (baseUrlInfo.experimentalSourceUri.length > 0) {
          // Optionally probe the source's index first — this lets us
          // distinguish "private CDN doesn't have this pin" from "private
          // CDN is fine but the zip URL was momentarily unreachable" so the
          // telemetry reason is accurate.
          const indexProbe = await tryFetchSourceIndex(context, baseUrlInfo.experimentalSourceUri);
          if (indexProbe.ok === true && indexProbe.versions.includes(pin)) {
            const result = await tryDownloadBundleWithProgress(context, baseUrlInfo.experimentalSourceUri, pin, 'experimentalPin');
            if (result.ok === true) {
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
          } else if (indexProbe.ok === true) {
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

      // Only handle experimental local-latest specially when a real experimental
      // source URI is configured. With no pin AND no source URI there is nothing
      // genuinely experimental to honor, so fall through to the normal section-3
      // resolution below (fast readiness gate + background feed refresh, i.e.
      // public-latest auto-upgrade) — identical to a normal install.
      if (baseUrlInfo.experimentalSourceUri.length > 0 && latestLocalBundleVersion !== '0.0.0') {
        // Check readiness before trusting the cached experimental local latest.
        // Fast path first: a ready local latest is trusted for this session.
        // Experimental never consults the public *latest* feed, so no feed refresh.
        if (
          await tryHealthyLocalBundleFastPath(context, {
            version: latestLocalBundleVersion,
            versionSource: 'experimentalLocalLatest',
            feedRefreshBaseUrl: baseUrlInfo.experimentalSourceUri,
            allowFeedRefresh: false,
          })
        ) {
          context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
          return false;
        }
        const repair = await tryDownloadBundleWithProgress(
          context,
          baseUrlInfo.experimentalSourceUri,
          latestLocalBundleVersion,
          'experimentalLocalLatestRepair'
        );
        if (repair.ok === true) {
          ext.defaultBundleVersion = latestLocalBundleVersion;
          ext.latestBundleVersion = latestLocalBundleVersion;
          context.telemetry.properties.extensionBundleVersionSource = 'experimentalLocalLatestRepair';
          context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
          context.telemetry.properties.didUpdateExtensionBundle = 'true';
          return true;
        }
        logExperimentalFallback(
          context,
          repair.reason,
          `Reinstall of local latest ${latestLocalBundleVersion} from experimental source failed.`,
          repair.error
        );
        await downloadBundleWithProgress(context, PUBLIC_BUNDLE_BASE_URL, latestLocalBundleVersion, 'experimentalLocalLatestRepair');
        ext.defaultBundleVersion = latestLocalBundleVersion;
        ext.latestBundleVersion = latestLocalBundleVersion;
        context.telemetry.properties.extensionBundleVersionSource = 'experimentalLocalLatestRepair';
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        context.telemetry.properties.didUpdateExtensionBundle = 'true';
        return true;
      }

      // No pin, no local copy — try the experimental source URI for its
      // latest. If that fails (404 / network error / empty index), fall
      // through to the public-CDN default flow below.
      if (baseUrlInfo.experimentalSourceUri.length > 0) {
        const indexProbe = await tryFetchSourceIndex(context, baseUrlInfo.experimentalSourceUri);
        if (indexProbe.ok === true) {
          const experimentalLatest = pickLatestVersion(indexProbe.versions);
          if (experimentalLatest !== '0.0.0') {
            const result = await tryDownloadBundleWithProgress(
              context,
              baseUrlInfo.experimentalSourceUri,
              experimentalLatest,
              'experimentalLatest'
            );
            if (result.ok === true) {
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

    // Ready local bundles are trusted without post-install hashing or CDN checks.
    // Newer-version discovery remains a throttled background operation.
    if (latestLocalBundleVersion !== '0.0.0') {
      if (
        await tryHealthyLocalBundleFastPath(context, {
          version: latestLocalBundleVersion,
          versionSource: 'localLatest',
          allowFeedRefresh: true,
          feedRefreshBaseUrl: effectiveBaseUrl,
          useExperimentalPublicFallback: fellThroughFromExperimental,
        })
      ) {
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        return false;
      }
      // Missing completion state falls through to installation.
    }

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
      context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
      context.telemetry.properties.didUpdateExtensionBundle = 'true';
      return true;
    }

    if (latestLocalBundleVersion !== '0.0.0') {
      await downloadBundleWithProgress(context, effectiveBaseUrl, latestLocalBundleVersion, 'installRequired');
      context.telemetry.properties.extensionBundleVersionSource = 'publicFeedLatest';
      context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
      context.telemetry.properties.didUpdateExtensionBundle = 'true';
      return true;
    }

    context.telemetry.properties.extensionBundleVersionSource = 'localLatest';
    context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
    context.telemetry.properties.didUpdateExtensionBundle = 'false';
    return false;
  } catch (error) {
    const errorMessage = `Error downloading and extracting the Logic Apps Standard extension bundle: ${error instanceof Error ? error.message : String(error)}`;
    context.telemetry.properties.errorMessage = errorMessage;
    if (ext.outputChannel) {
      ext.outputChannel.appendLog(errorMessage);
    }
    // Re-throw so the outer `downloadExtensionBundle` wrapper sets
    // `lastBundleInstallResult = 'failed'`. Without this, downstream callers
    // (validateAndInstallBinaries, startDesignTimeApi) see the install as
    // ready and proceed to spawn func.exe against a missing/incomplete bundle,
    // producing the silent "No job functions found" failure mode.
    throw error instanceof Error ? error : new Error(errorMessage);
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
  // Phase 14: also reset bundle install state so tests that intentionally fail
  // an install (e.g. mockRejectedValue) don't poison subsequent tests with a
  // stale `lastBundleInstallResult === 'failed'`.
  lastBundleInstallResult = 'unknown';
  lastBundleInstallError = undefined;
  inFlightBundleWork = undefined;
  healthyBundleVersion = null;
  backgroundBundleFeedRefreshPromise = undefined;
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
  ext.outputChannel?.appendLog(`Current Logic Apps extension bundle version: ${bundleVersionNumber}`);
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
