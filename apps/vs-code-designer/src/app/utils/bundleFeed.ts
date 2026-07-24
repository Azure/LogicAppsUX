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
  lastBundleDeepVerificationKey,
  bundleDeepVerificationIntervalMs,
} from '../../constants';
import { getLocalSettingsJson } from './appSettings/localSettings';
import { downloadAndExtractDependency } from './binaries';
import { fetchExpectedMd5, isMissingPackageError } from './integrity';
import { getJsonFeed } from './feed';
import { shouldCheckForDependencyUpdates } from './dependencyUpdateCheck';
import { getGlobalSetting } from './vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed, IBundleMetadata, IHostJsonV2 } from '@microsoft/vscode-extension-logic-apps';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { createHash } from 'crypto';
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
/**
 * Sidecar shape persisted next to the extracted bundle:
 *  - `sourceMd5` is the MD5 of the downloaded zip (matches what the CDN publishes
 *    as `Content-MD5` on a HEAD of the zip URL), used to detect CDN-side republish.
 *  - `contentHash` is a deterministic sha256 over the extracted file tree, recomputed
 *    on every activation to detect post-download mutation (manual edits, disk bit-rot,
 *    AV restore, partial overwrite, etc.).
 *
 * The sidecar is NOT a snapshot of the bundle's state — it is a tiny *expected* value
 * that we compare against a freshly-computed `actual`. A corrupted sidecar produces a
 * false-positive mismatch (we redownload), which is harmless. Both fields are present
 * iff the bundle was downloaded by this version of the extension.
 */
interface BundleSidecar {
  version: number;
  sourceMd5: string;
  contentHash: string;
  /**
   * Fast lstat-only tree fingerprint (see {@link computeBundleTreeFingerprint}).
   * Includes each file's mtimeMs, so any re-write or metadata touch shifts it.
   * Optional: legacy sidecars written before Phase 15 omit it and auto-upgrade on
   * a background byte hash, after which the fingerprint is backfilled.
   */
  treeFingerprint?: string;
  /**
   * Fast lstat-only STRUCTURAL fingerprint: relPath + size only (NO mtime). Lets
   * the fast gate distinguish a benign metadata-only drift (mtime changed, size +
   * paths identical — e.g. the Functions host touching bundle files) from a real
   * structural change (a file added / removed / resized). A mtime-only drift can
   * be trusted without re-running the ~40s byte hash; a structural change schedules
   * a background deep verification. Optional for legacy sidecars.
   */
  structuralFingerprint?: string;
  /**
   * Epoch ms of the last successful full-byte deep verification. Persisted here
   * (on disk, next to the fingerprints) so the 24h deep-verify throttle survives
   * even when `globalState` isn't yet available during early activation. Optional.
   */
  lastDeepVerifiedMs?: number;
}

interface BundleSidecarFields {
  sourceMd5: string;
  contentHash: string;
  treeFingerprint?: string;
  structuralFingerprint?: string;
  lastDeepVerifiedMs?: number;
}

const SIDECAR_FORMAT_VERSION = 1;

function getBundleSidecarPath(version: string): string {
  return path.join(defaultExtensionBundlePathValue, version, bundleSourceMd5SidecarFile);
}

async function readBundleSidecar(version: string): Promise<BundleSidecar | undefined> {
  const sidecarPath = getBundleSidecarPath(version);
  try {
    if (!(await fse.pathExists(sidecarPath))) {
      return undefined;
    }
    const raw = (await fse.readFile(sidecarPath, 'utf8')).trim();
    if (raw.length === 0) {
      return undefined;
    }
    // Lenient: legacy bare-MD5 sidecars (no JSON braces) and JSON missing the
    // contentHash field both fall through to undefined, forcing a one-time
    // migration redownload to upgrade the format.
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).sourceMd5 === 'string' &&
      typeof (parsed as Record<string, unknown>).contentHash === 'string' &&
      typeof (parsed as Record<string, unknown>).version === 'number'
    ) {
      const obj = parsed as Record<string, unknown>;
      // treeFingerprint / structuralFingerprint / lastDeepVerifiedMs are parsed
      // leniently: a missing/wrong-typed value leaves it undefined (legacy
      // sidecar) which is still valid — it just forces a background deep byte-hash
      // verification + backfill on the next health check.
      const treeFingerprint = typeof obj.treeFingerprint === 'string' ? (obj.treeFingerprint as string) : undefined;
      const structuralFingerprint = typeof obj.structuralFingerprint === 'string' ? (obj.structuralFingerprint as string) : undefined;
      const lastDeepVerifiedMs =
        typeof obj.lastDeepVerifiedMs === 'number' && Number.isFinite(obj.lastDeepVerifiedMs)
          ? (obj.lastDeepVerifiedMs as number)
          : undefined;
      return {
        version: obj.version as number,
        sourceMd5: obj.sourceMd5 as string,
        contentHash: obj.contentHash as string,
        treeFingerprint,
        structuralFingerprint,
        lastDeepVerifiedMs,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function writeBundleSidecar(version: string, fields: BundleSidecarFields): Promise<void> {
  const sidecarPath = getBundleSidecarPath(version);
  const tempSidecarPath = `${sidecarPath}.${process.pid}.${Date.now()}.tmp`;
  const payload: BundleSidecar = {
    version: SIDECAR_FORMAT_VERSION,
    sourceMd5: fields.sourceMd5,
    contentHash: fields.contentHash,
    treeFingerprint: fields.treeFingerprint,
    structuralFingerprint: fields.structuralFingerprint,
    lastDeepVerifiedMs: fields.lastDeepVerifiedMs,
  };
  try {
    await fse.outputFile(tempSidecarPath, JSON.stringify(payload), 'utf8');
    await fse.move(tempSidecarPath, sidecarPath, { overwrite: true });
  } catch (writeError) {
    await fse.remove(tempSidecarPath).catch(() => undefined);
    const message = localize(
      'bundleSidecarWriteFailed',
      'Failed to write extension-bundle MD5 sidecar at "{0}": {1}',
      sidecarPath,
      String(writeError)
    );
    ext.outputChannel?.appendLog(message);
    throw new Error(message);
  }
}

async function hasRequiredBundleContent(bundleDir: string): Promise<boolean> {
  if (!(await fse.pathExists(bundleDir))) {
    return false;
  }

  const binDir = path.join(bundleDir, 'bin');
  const depsPath = path.join(binDir, 'function.deps.json');
  if (!(await fse.pathExists(depsPath))) {
    return false;
  }

  let parsedDeps: unknown;
  try {
    parsedDeps = JSON.parse(await fse.readFile(depsPath, 'utf8'));
  } catch {
    return false;
  }

  const requiredRuntimeFiles = new Set<string>();
  const targets = (parsedDeps as { targets?: unknown })?.targets;
  if (typeof targets === 'object' && targets !== null) {
    for (const target of Object.values(targets as Record<string, unknown>)) {
      if (typeof target !== 'object' || target === null) {
        continue;
      }
      for (const dependency of Object.values(target as Record<string, unknown>)) {
        const runtime = (dependency as { runtime?: unknown })?.runtime;
        if (typeof runtime !== 'object' || runtime === null) {
          continue;
        }
        for (const relPath of Object.keys(runtime as Record<string, unknown>)) {
          requiredRuntimeFiles.add(relPath);
        }
      }
    }
  }

  if (requiredRuntimeFiles.size === 0) {
    return false;
  }

  const normalizedBinDir = path.normalize(binDir);
  for (const relPath of requiredRuntimeFiles) {
    const candidates = [
      path.normalize(path.join(binDir, ...relPath.split('/'))),
      path.normalize(path.join(binDir, path.basename(relPath))),
    ];
    const hasRuntimeFile = await candidates.reduce(async (previous, candidate) => {
      if (await previous) {
        return true;
      }
      if (!candidate.startsWith(`${normalizedBinDir}${path.sep}`)) {
        return false;
      }
      return (await fse.pathExists(candidate)) && (await fse.stat(candidate)).isFile();
    }, Promise.resolve(false));

    if (!hasRuntimeFile) {
      return false;
    }
  }

  return true;
}

/**
 * Deterministic streaming sha256 over every regular file in `bundleDir`.
 *
 * - Sorts entries by POSIX-normalized relative path so the hash is stable across
 *   filesystems / OSes.
 * - Skips the sidecar file itself (otherwise writing the sidecar would invalidate
 *   the hash we just computed).
 * - For each entry we feed `<relPath>\0<size>\0<file-bytes>\0` so renames and
 *   truncations both shift the hash.
 *
 * Returns the base64 digest, or `undefined` if `bundleDir` doesn't exist.
 */
export async function computeBundleContentHash(bundleDir: string): Promise<string | undefined> {
  if (!(await fse.pathExists(bundleDir))) {
    return undefined;
  }
  const entries: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const items = await fse.readdir(dir);
    for (const item of items) {
      const abs = path.join(dir, item);
      const stat = await fse.lstat(abs);
      if (stat.isDirectory()) {
        await walk(abs);
      } else if (stat.isFile()) {
        const rel = path.relative(bundleDir, abs).split(path.sep).join('/');
        if (rel === bundleSourceMd5SidecarFile) {
          continue;
        }
        entries.push(rel);
      }
    }
  };
  await walk(bundleDir);
  entries.sort();

  const hash = createHash('sha256');
  for (const rel of entries) {
    const abs = path.join(bundleDir, ...rel.split('/'));
    const stat = await fse.stat(abs);
    hash.update(rel);
    hash.update('\0');
    hash.update(String(stat.size));
    hash.update('\0');
    await new Promise<void>((resolve, reject) => {
      const stream = fse.createReadStream(abs);
      stream.on('data', (chunk: Buffer | string) => {
        if (typeof chunk === 'string') {
          hash.update(chunk);
        } else {
          hash.update(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        }
      });
      stream.on('error', reject);
      stream.on('end', () => resolve());
    });
    hash.update('\0');
  }
  return hash.digest('base64');
}

/**
 * Fast, stat-only fingerprints of the extracted bundle tree — the cheap
 * front-line check that replaces the ~40s full-byte {@link computeBundleContentHash}
 * on the hot startup path.
 *
 * - Walks the tree with `lstat` only (NO byte reads), so it runs in milliseconds
 *   even for the hundreds-of-MB PowerShell runtime + .NET assemblies + workflow
 *   bundle.
 * - Sorts entries by POSIX-normalized relative path so the digests are stable
 *   across filesystems / OSes.
 * - Skips the sidecar file itself (same as `computeBundleContentHash`).
 *
 * Produces two digests from a single walk:
 * - `treeFingerprint`: `<relPath>\0<size>\0<mtimeMs>\0` per entry. A deleted subfile
 *   drops an entry, and any resize / re-write / metadata touch shifts it.
 * - `structuralFingerprint`: `<relPath>\0<size>\0` per entry (NO mtime). Only shifts
 *   when a file is added, removed, or resized — a benign mtime-only touch leaves it
 *   unchanged, letting the fast gate skip the byte hash for pure metadata drift.
 *
 * Returns `undefined` if `bundleDir` doesn't exist.
 */
export async function computeBundleFingerprints(
  bundleDir: string
): Promise<{ treeFingerprint: string; structuralFingerprint: string } | undefined> {
  if (!(await fse.pathExists(bundleDir))) {
    return undefined;
  }
  const entries: Array<{ rel: string; size: number; mtimeMs: number }> = [];
  // Fan the traversal out per directory with Promise.all instead of awaiting each
  // lstat serially. The serial version issues ~2 sequential awaits per file
  // (readdir + lstat); on the hot activation path — where the extension-host event
  // loop is saturated by other extensions, the Functions host, and the design-time
  // API starting up — those thousands of sequential continuations get starved and
  // the ~1.5k-file walk balloons from ~300ms to ~25s (the observed freeze). Fanning
  // out collapses the critical path to O(tree depth) round-trips, keeping the walk
  // sub-second even under a starved event loop / constrained threadpool. Entries are
  // sorted below before hashing, so the parallel push order is irrelevant and the
  // resulting digests are byte-identical to the serial walk.
  const walk = async (dir: string): Promise<void> => {
    const items = await fse.readdir(dir);
    await Promise.all(
      items.map(async (item) => {
        const abs = path.join(dir, item);
        const stat = await fse.lstat(abs);
        if (stat.isDirectory()) {
          await walk(abs);
        } else if (stat.isFile()) {
          const rel = path.relative(bundleDir, abs).split(path.sep).join('/');
          if (rel === bundleSourceMd5SidecarFile) {
            return;
          }
          entries.push({ rel, size: stat.size, mtimeMs: stat.mtimeMs });
        }
      })
    );
  };
  await walk(bundleDir);
  entries.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

  const treeHash = createHash('sha256');
  const structuralHash = createHash('sha256');
  for (const entry of entries) {
    treeHash.update(entry.rel);
    treeHash.update('\0');
    treeHash.update(String(entry.size));
    treeHash.update('\0');
    treeHash.update(String(entry.mtimeMs));
    treeHash.update('\0');

    structuralHash.update(entry.rel);
    structuralHash.update('\0');
    structuralHash.update(String(entry.size));
    structuralHash.update('\0');
  }
  return { treeFingerprint: treeHash.digest('base64'), structuralFingerprint: structuralHash.digest('base64') };
}

/**
 * Convenience wrapper returning only the mtime-sensitive tree fingerprint.
 * Returns the base64 digest, or `undefined` if `bundleDir` doesn't exist.
 */
export async function computeBundleTreeFingerprint(bundleDir: string): Promise<string | undefined> {
  const fingerprints = await computeBundleFingerprints(bundleDir);
  return fingerprints?.treeFingerprint;
}

/**
 * Epoch ms of the last successful full-byte deep verification, read sidecar-first
 * (survives early activation before `globalState` is populated) with a
 * `globalState` fallback. Returns `undefined` when neither source has a value.
 */
function getLastDeepVerification(sidecar?: BundleSidecar | null): number | undefined {
  if (sidecar && typeof sidecar.lastDeepVerifiedMs === 'number' && Number.isFinite(sidecar.lastDeepVerifiedMs)) {
    return sidecar.lastDeepVerifiedMs;
  }
  const fromGlobal = ext.context?.globalState?.get<number>(lastBundleDeepVerificationKey);
  return typeof fromGlobal === 'number' && Number.isFinite(fromGlobal) ? fromGlobal : undefined;
}

/**
 * True when the throttled deep (full-byte) bundle verification is due — i.e. no
 * successful deep verification has been recorded within
 * {@link bundleDeepVerificationIntervalMs}. Reads the timestamp sidecar-first
 * (robust during early activation), with a `globalState` fallback. When no
 * timestamp exists at all it is due (legacy / first run).
 */
function isDeepBundleVerificationDue(sidecar?: BundleSidecar | null): boolean {
  const last = getLastDeepVerification(sidecar);
  if (last === undefined) {
    return true;
  }
  return Date.now() - last >= bundleDeepVerificationIntervalMs;
}

/**
 * Records "now" as the last successful deep bundle verification in `globalState`
 * (a best-effort mirror of the authoritative sidecar timestamp).
 */
async function recordDeepBundleVerification(): Promise<void> {
  try {
    await ext.context?.globalState?.update(lastBundleDeepVerificationKey, Date.now());
  } catch {
    // Non-fatal: failing to persist the timestamp only means the next launch may
    // re-run the deep hash, which is safe (just slower).
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
 * Downloads the bundle zip from the resolved base URL and writes the sidecar
 * (source MD5 from the download + a fresh content-hash of the extracted tree).
 * Used both for the standard "feed wins" path and for the experimental cold-start path.
 */
async function downloadBundleAndWriteSidecar(context: IActionContext, baseUrl: string, version: string): Promise<void> {
  const zipUrl = buildExtensionBundleZipUrl(baseUrl, version);
  const result = await downloadAndExtractDependency(context, zipUrl, defaultExtensionBundlePathValue, extensionBundleId, version);
  if (!result?.actualMd5) {
    throw new Error(`Bundle ${version} was downloaded but no source MD5 was available. Refusing to install without a sidecar.`);
  }
  const bundleDir = path.join(defaultExtensionBundlePathValue, version);
  const contentHash = await computeBundleContentHash(bundleDir);
  if (!contentHash) {
    // No files were hashed — the extracted bundle directory is empty. Refuse to
    // bless this state with a sidecar, otherwise the next activation would treat
    // the partial install as "good" and never re-download.
    throw new Error(`Bundle ${version} was downloaded but the extracted directory at ${bundleDir} is empty. Refusing to write sidecar.`);
  }
  const fingerprints = await computeBundleFingerprints(bundleDir);
  const now = Date.now();
  await writeBundleSidecar(version, {
    sourceMd5: result.actualMd5,
    contentHash,
    treeFingerprint: fingerprints?.treeFingerprint,
    structuralFingerprint: fingerprints?.structuralFingerprint,
    lastDeepVerifiedMs: now,
  });
  // Fresh download already computed the full byte hash, so reset the deep-verify
  // throttle — the next 24h can safely rely on the fast fingerprint path.
  await recordDeepBundleVerification();
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
  | 'contentMismatch'
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
    case 'sidecarMissing':
      // First-run-after-upgrade case (no `.bundle-source-md5` yet) — the
      // bundle isn't necessarily corrupt, just unverifiable, so we phrase
      // the toast as "couldn't be verified" rather than "incomplete".
      return localize(
        'bundleProgressRedownloadUnverified',
        'Re-downloading Logic Apps extension bundle {0} from {1} (local copy could not be verified)…',
        version,
        source
      );
    case 'sidecarMismatch':
      return localize(
        'bundleProgressRedownload',
        'Re-downloading Logic Apps extension bundle {0} from {1} (local copy was incomplete)…',
        version,
        source
      );
    case 'contentMismatch':
      return localize(
        'bundleProgressCorruption',
        'Re-downloading Logic Apps extension bundle {0} from {1} — files on disk were modified or corrupted…',
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
    case 'envVarRepair':
      return localize(
        'bundleProgressEnvVarRepair',
        'Re-downloading pinned Logic Apps extension bundle {0} from {1} — on-disk integrity check failed…',
        version,
        source
      );
    case 'experimentalPinRepair':
      return localize(
        'bundleProgressExperimentalPinRepair',
        'Re-downloading experimental pinned Logic Apps extension bundle {0} from {1} — on-disk integrity check failed…',
        version,
        source
      );
    case 'experimentalLocalLatestRepair':
      return localize(
        'bundleProgressExperimentalLatestRepair',
        'Re-downloading Logic Apps extension bundle {0} (experimental local latest) from {1} — on-disk integrity check failed…',
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
  ext.outputChannel.appendLog(localize('bundleDownloadReady', 'Logic Apps extension bundle {0} is ready.', version));
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
    ext.outputChannel.appendLog(localize('bundleDownloadReady', 'Logic Apps extension bundle {0} is ready.', version));
  }
  return outcome;
}

/**
 * Verifies the on-disk bundle:
 *   1. Sidecar present and parseable (else `sidecarMissing` — also fires for
 *      legacy bare-MD5 sidecars to drive one-time migration).
 *   2. Recompute the extracted tree's content hash and compare to the sidecar's
 *      `contentHash` — catches post-download mutation (manual edits, bit-rot,
 *      AV restore, partial overwrite). On mismatch: `contentMismatch`.
 *   3. HEAD the public CDN for the zip's `Content-MD5` and compare to the
 *      sidecar's `sourceMd5` — catches publisher republish under same version.
 *      On mismatch: `sidecarMismatch`. HEAD failure → `headRequestFailed`
 *      (treated as passed by the caller so CDN flakes don't punish offline users).
 */
async function verifyLocalBundle(
  context: IActionContext,
  publicBaseUrl: string,
  localVersion: string,
  options: { allowSidecarBackfill?: boolean } = {}
): Promise<'passed' | 'sidecarBackfilled' | 'sidecarMissing' | 'contentMismatch' | 'sidecarMismatch' | 'headRequestFailed'> {
  const sidecar = await readBundleSidecar(localVersion);
  if (!sidecar) {
    if (options.allowSidecarBackfill !== false) {
      const backfilled = await tryBackfillBundleSidecar(context, publicBaseUrl, localVersion);
      if (backfilled) {
        return 'sidecarBackfilled';
      }
    }
    return 'sidecarMissing';
  }

  const bundleDir = path.join(defaultExtensionBundlePathValue, localVersion);
  const actualContentHash = await computeBundleContentHash(bundleDir);
  if (!actualContentHash || actualContentHash !== sidecar.contentHash) {
    if (ext.outputChannel) {
      ext.outputChannel.appendLog(
        localize(
          'bundleContentHashMismatch',
          'Logic Apps extension bundle {0} content hash mismatch (expected {1}, got {2}).',
          localVersion,
          sidecar.contentHash,
          actualContentHash ?? '<missing>'
        )
      );
    }
    return 'contentMismatch';
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
    return 'passed';
  }
  if (!sidecar.sourceMd5) {
    return 'passed';
  }
  return publishedMd5 === sidecar.sourceMd5 ? 'passed' : 'sidecarMismatch';
}

async function tryBackfillBundleSidecar(context: IActionContext, publicBaseUrl: string, localVersion: string): Promise<boolean> {
  const bundleDir = path.join(defaultExtensionBundlePathValue, localVersion);
  if (!(await hasRequiredBundleContent(bundleDir))) {
    ext.outputChannel?.appendLog(
      `Logic Apps extension bundle ${localVersion} is missing sidecar metadata, but the extracted bundle folder is incomplete. Re-downloading.`
    );
    return false;
  }

  const actualContentHash = await computeBundleContentHash(bundleDir);
  if (!actualContentHash) {
    return false;
  }

  const headUrl = buildExtensionBundleZipUrl(publicBaseUrl, localVersion);
  let publishedMd5: string | undefined;
  try {
    publishedMd5 = await fetchExpectedMd5(headUrl);
  } catch (error) {
    ext.outputChannel?.appendLog(
      localize(
        'bundleBackfillHashHeadFailed',
        'Failed to backfill extension-bundle sidecar from {0}: {1}',
        headUrl,
        error instanceof Error ? error.message : String(error)
      )
    );
    context.telemetry.properties.bundleBackfillHeadError = error instanceof Error ? error.message : String(error);
    publishedMd5 = '';
  }

  if (!publishedMd5) {
    ext.outputChannel?.appendLog(
      `Logic Apps extension bundle ${localVersion} is missing sidecar metadata, and the bundle source did not publish Content-MD5. Backfilling content hash only.`
    );
  }

  try {
    const fingerprints = await computeBundleFingerprints(bundleDir);
    await writeBundleSidecar(localVersion, {
      sourceMd5: publishedMd5 ?? '',
      contentHash: actualContentHash,
      treeFingerprint: fingerprints?.treeFingerprint,
      structuralFingerprint: fingerprints?.structuralFingerprint,
      lastDeepVerifiedMs: Date.now(),
    });
  } catch {
    return false;
  }
  // The backfill just computed the full byte hash, so reset the deep-verify throttle.
  await recordDeepBundleVerification();
  ext.outputChannel?.appendLog(`Logic Apps extension bundle ${localVersion} sidecar metadata backfilled from existing install.`);
  return true;
}

type LocalBundleVerificationResult = Awaited<ReturnType<typeof verifyLocalBundle>>;
type RepairableLocalBundleFailure = Extract<LocalBundleVerificationResult, 'sidecarMissing' | 'sidecarMismatch' | 'contentMismatch'>;

function requiresBundleRepair(hashCheck: LocalBundleVerificationResult): hashCheck is RepairableLocalBundleFailure {
  return hashCheck === 'sidecarMissing' || hashCheck === 'sidecarMismatch' || hashCheck === 'contentMismatch';
}

function notifyCorruptionIfNeeded(hashCheck: RepairableLocalBundleFailure, version: string, baseUrl: string): void {
  // sidecarMissing fires on first-run-after-upgrade for legacy bare-MD5
  // sidecars; keep that path quieter to avoid alarming users during migration.
  if (hashCheck !== 'sidecarMissing') {
    notifyCorruptionDetected(version, describeSource(baseUrl));
  }
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
 * Version of the extension bundle whose on-disk integrity has already been
 * verified this session. `ensureExtensionBundleHealthy` short-circuits the
 * expensive full-tree SHA-256 recompute while this is set. Startup dependency
 * validation verifies the bundle once; the design-time / runtime hosts launched
 * immediately after reuse that result instead of rehashing the whole bundle on
 * every launch. Invalidated on any (re)download/repair and via
 * `resetCachedBundleVersion`.
 */
let healthyBundleVersion: string | null = null;

/**
 * Clears the session bundle-health cache so the next
 * `ensureExtensionBundleHealthy` re-runs the on-disk integrity check. Invoked
 * whenever the bundle on disk may have changed (download/repair) or on reset.
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
 * Pure on-disk health check for the installed extension bundle. Reads the
 * sidecar, recomputes the content hash of the extracted tree from disk, and
 * compares them. Has NO side effects — no downloads, no writes — so it's
 * safe to call from any number of places (gate, scheduled re-check, etc.).
 *
 * Returns `{ ok: true, version }` when the latest local bundle's recomputed
 * content hash matches the sidecar's stored value. Otherwise returns
 * `{ ok: false, reason, version?, detail? }` so the caller can decide
 * whether to repair, warn, or fail.
 *
 * Why this exists: prior to Phase 14 we trusted the sidecar's `contentHash`
 * field as proof the on-disk tree was intact, but a user manually deleting
 * a subfolder (e.g. `bin/.../PowerShell`) leaves the sidecar untouched while
 * the tree is corrupt. `ensureExtensionBundleHealthy` now uses this helper
 * to proactively detect that drift and force a synchronous repair download.
 */
export type BundleOnDiskHealthResult =
  | { ok: true; version: string }
  | {
      ok: false;
      reason: 'noBundle' | 'sidecarMissing' | 'sidecarUnreadable' | 'emptyBundleDir' | 'contentMismatch';
      version?: string;
      detail?: string;
    };

type BundleOnDiskHealthFailure = Extract<BundleOnDiskHealthResult, { ok: false }>;

function formatBundleHealthFailure(failure: BundleOnDiskHealthFailure): string {
  return failure.detail ? `${failure.reason} (${failure.detail})` : failure.reason;
}

function throwBundleHealthError(prefix: string, failure: BundleOnDiskHealthFailure): never {
  throw new Error(
    `Logic Apps extension bundle is not installed correctly. ${prefix}: ${formatBundleHealthFailure(failure)}. Close other VS Code windows running Logic Apps, terminate any leftover func.exe processes, and reload this window to retry.`
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
  const sidecar = await readBundleSidecar(targetVersion);
  if (!sidecar) {
    return { ok: false, reason: 'sidecarMissing', version: targetVersion };
  }
  if (!sidecar.contentHash) {
    return { ok: false, reason: 'sidecarUnreadable', version: targetVersion, detail: 'sidecar missing contentHash field' };
  }

  // Fast path: when the sidecar carries a cheap lstat tree fingerprint, compare
  // that first. A match lets us skip the ~40s full-byte content hash entirely —
  // unless the daily deep-verify throttle says a full check is due.
  if (sidecar.treeFingerprint) {
    const actualFingerprint = await computeBundleTreeFingerprint(bundleDir);
    if (!actualFingerprint) {
      return { ok: false, reason: 'emptyBundleDir', version: targetVersion };
    }
    if (actualFingerprint === sidecar.treeFingerprint) {
      if (!isDeepBundleVerificationDue(sidecar)) {
        return { ok: true, version: targetVersion };
      }
      // Throttle due: run the full byte hash even though the fingerprint matched,
      // to catch an in-place edit that preserved size + mtime.
      const deepHash = await computeBundleContentHash(bundleDir);
      if (!deepHash) {
        return { ok: false, reason: 'emptyBundleDir', version: targetVersion };
      }
      if (deepHash !== sidecar.contentHash) {
        return {
          ok: false,
          reason: 'contentMismatch',
          version: targetVersion,
          detail: `expected ${sidecar.contentHash}, got ${deepHash}`,
        };
      }
      await recordDeepBundleVerification();
      // Persist the deep-verify timestamp (and current fingerprints) into the
      // sidecar so the 24h throttle survives even when globalState isn't yet
      // populated on the next early activation.
      await refreshBundleSidecarFingerprints(targetVersion, sidecar, bundleDir, Date.now());
      return { ok: true, version: targetVersion };
    }
    // Fingerprint mismatch → fall through to the full byte hash to decide
    // healthy-vs-repair (keeps the existing contentMismatch/repair flow).
  }

  const actualHash = await computeBundleContentHash(bundleDir);
  if (!actualHash) {
    return { ok: false, reason: 'emptyBundleDir', version: targetVersion };
  }
  if (actualHash !== sidecar.contentHash) {
    return {
      ok: false,
      reason: 'contentMismatch',
      version: targetVersion,
      detail: `expected ${sidecar.contentHash}, got ${actualHash}`,
    };
  }
  // Full byte hash passed. Record the deep verification and, when the sidecar
  // lacked a fingerprint (legacy) or it drifted (e.g. a touch that changed mtime
  // but not bytes), backfill the current fingerprints so future launches take the
  // fast path. Best-effort: a backfill write failure must not fail the health check.
  await recordDeepBundleVerification();
  await refreshBundleSidecarFingerprints(targetVersion, sidecar, bundleDir, Date.now());
  return { ok: true, version: targetVersion };
}

/**
 * Recomputes the cheap lstat fingerprints for `bundleDir` and rewrites the
 * sidecar with them plus the supplied `lastDeepVerifiedMs`, preserving the
 * existing `sourceMd5`/`contentHash`. Best-effort: any failure is swallowed —
 * the bundle is already known healthy; we just didn't upgrade the sidecar.
 */
async function refreshBundleSidecarFingerprints(
  version: string,
  sidecar: BundleSidecar,
  bundleDir: string,
  lastDeepVerifiedMs: number
): Promise<void> {
  try {
    const fingerprints = await computeBundleFingerprints(bundleDir);
    if (!fingerprints) {
      return;
    }
    const unchanged =
      fingerprints.treeFingerprint === sidecar.treeFingerprint &&
      fingerprints.structuralFingerprint === sidecar.structuralFingerprint &&
      sidecar.lastDeepVerifiedMs !== undefined;
    if (unchanged) {
      return;
    }
    await writeBundleSidecar(version, {
      sourceMd5: sidecar.sourceMd5,
      contentHash: sidecar.contentHash,
      treeFingerprint: fingerprints.treeFingerprint,
      structuralFingerprint: fingerprints.structuralFingerprint,
      lastDeepVerifiedMs,
    });
  } catch {
    // Non-fatal: the bundle is healthy; we just didn't upgrade the sidecar.
  }
}

/**
 * Result of the cheap, non-blocking fast gate used on the hot activation path.
 * On success it also reports whether a background deep (full-byte) verification
 * should be scheduled (`deepVerify`). Failures reuse {@link BundleOnDiskHealthResult}'s
 * failure shape so the caller's existing repair/bootstrap handling is unchanged.
 */
type BundleFastGateResult = { ok: true; version: string; deepVerify: boolean } | BundleOnDiskHealthFailure;

/**
 * Cheap, lstat-only bundle health gate for the hot activation path. NEVER runs
 * the ~40s full-byte hash — that is the whole point: activation must not freeze
 * on it. Decisions:
 *  - tree fingerprint match → ok; background deep verify only if the 24h throttle
 *    is due.
 *  - tree mismatch but STRUCTURAL match (benign mtime-only drift, e.g. the
 *    Functions host touched bundle files) → refresh the tree fingerprint inline
 *    (no byte hash) → ok; background deep verify only if throttle due. This is the
 *    key fix for the per-launch re-hash freeze.
 *  - legacy sidecar (no fingerprints) OR a genuine structural change → ok
 *    provisionally + schedule a background deep verify to confirm bytes / repair.
 *  - presence / sidecar failures (noBundle / sidecarMissing / sidecarUnreadable /
 *    emptyBundleDir) → returned as failures so the caller repairs synchronously.
 */
async function evaluateBundleFastGate(version?: string): Promise<BundleFastGateResult> {
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
  const sidecar = await readBundleSidecar(targetVersion);
  if (!sidecar) {
    return { ok: false, reason: 'sidecarMissing', version: targetVersion };
  }
  if (!sidecar.contentHash) {
    return { ok: false, reason: 'sidecarUnreadable', version: targetVersion, detail: 'sidecar missing contentHash field' };
  }
  const fingerprints = await computeBundleFingerprints(bundleDir);
  if (!fingerprints) {
    return { ok: false, reason: 'emptyBundleDir', version: targetVersion };
  }

  // 1) Exact fast path: the mtime-sensitive tree fingerprint matches.
  if (sidecar.treeFingerprint && fingerprints.treeFingerprint === sidecar.treeFingerprint) {
    return { ok: true, version: targetVersion, deepVerify: isDeepBundleVerificationDue(sidecar) };
  }

  // 2) Benign metadata drift: structural fingerprint (paths + sizes, no mtime)
  //    still matches, so only mtimes moved. Refresh the tree fingerprint WITHOUT a
  //    byte hash so the next launch is fast again.
  if (sidecar.structuralFingerprint && fingerprints.structuralFingerprint === sidecar.structuralFingerprint) {
    ext.outputChannel?.appendLog(
      `Logic Apps extension bundle ${targetVersion} metadata drift detected (sizes + paths unchanged); refreshing fast fingerprint without re-hashing.`
    );
    try {
      await writeBundleSidecar(targetVersion, {
        sourceMd5: sidecar.sourceMd5,
        contentHash: sidecar.contentHash,
        treeFingerprint: fingerprints.treeFingerprint,
        structuralFingerprint: fingerprints.structuralFingerprint,
        lastDeepVerifiedMs: sidecar.lastDeepVerifiedMs,
      });
    } catch {
      // Non-fatal: we still pass; the fingerprint just won't be refreshed.
    }
    return { ok: true, version: targetVersion, deepVerify: isDeepBundleVerificationDue(sidecar) };
  }

  // 3) Legacy sidecar (no fast fingerprints) OR a genuine structural change (file
  //    added / removed / resized). Presence + sidecar checks already passed, so
  //    return ok PROVISIONALLY and confirm bytes / repair off the activation path.
  ext.outputChannel?.appendLog(
    sidecar.treeFingerprint || sidecar.structuralFingerprint
      ? `Logic Apps extension bundle ${targetVersion} fast fingerprint drift; scheduling background deep verification.`
      : `Logic Apps extension bundle ${targetVersion} sidecar predates fast fingerprints; scheduling background deep verification.`
  );
  return { ok: true, version: targetVersion, deepVerify: true };
}

/**
 * Tracks a single in-flight background deep verification so we don't launch a
 * herd of full-byte hashes. Reset in {@link resetCachedBundleVersion}.
 */
let backgroundBundleDeepVerifyPromise: Promise<void> | undefined;

/**
 * Test/coordination seam: resolves once any in-flight background deep bundle
 * verification (and its repair, if triggered) has settled.
 */
export function awaitBackgroundBundleDeepVerification(): Promise<void> {
  return backgroundBundleDeepVerifyPromise ?? Promise.resolve();
}

/**
 * Options for {@link scheduleBackgroundBundleDeepVerification}.
 */
interface BackgroundDeepVerifyOptions {
  /**
   * When set, the background job also confirms the CDN hasn't republished this
   * same version with different bytes (compares the sidecar `sourceMd5` against
   * the CDN `Content-MD5`). This republish check used to run synchronously on
   * the activation hot path inside `verifyLocalBundle`; it now runs here, off
   * the hot path and with a short HEAD timeout.
   */
  republishBaseUrl?: string;
}

/**
 * Runs the authoritative full-byte bundle verification OFF the activation path.
 * The fast gate has already returned ok, so activation proceeds immediately while
 * this confirms the bytes and — on genuine corruption — kicks off an async repair
 * download. Deduped to at most one in-flight run.
 */
function scheduleBackgroundBundleDeepVerification(
  context: IActionContext,
  version: string,
  options: BackgroundDeepVerifyOptions = {}
): void {
  if (backgroundBundleDeepVerifyPromise) {
    return;
  }
  backgroundBundleDeepVerifyPromise = (async () => {
    try {
      const health = await assertExtensionBundleOnDiskHealthy(version);
      if (!health.ok) {
        const failure = health as BundleOnDiskHealthFailure;
        if (failure.reason === 'contentMismatch' || failure.reason === 'emptyBundleDir') {
          ext.outputChannel?.appendLog(
            `Logic Apps extension bundle ${version} failed background deep verification (${formatBundleHealthFailure(failure)}). Repairing in the background.`
          );
          healthyBundleVersion = null;
          await downloadExtensionBundle(context, { allowSidecarBackfill: false, forceVerify: true });
        }
        return;
      }
      // Bytes confirmed. Optionally detect a CDN republish of the same version
      // (rare) off the hot path — the byte hash can't catch it because the local
      // bytes still match the local sidecar's recorded content hash.
      if (options.republishBaseUrl) {
        await verifyBundleRepublishOffHotPath(context, options.republishBaseUrl, version);
      }
    } catch (error) {
      ext.outputChannel?.appendLog(
        `Logic Apps extension bundle background deep verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      backgroundBundleDeepVerifyPromise = undefined;
    }
  })();
}

/**
 * Confirms the CDN hasn't republished `version` with different bytes than the
 * local copy. Compares the sidecar `sourceMd5` against the CDN `Content-MD5`
 * (a cheap HEAD). On a genuine republish, forces a background re-download so the
 * next launch picks up the fresh bytes. Best-effort: a HEAD failure (offline /
 * flaky CDN) is logged and ignored — the cached bundle stays trusted. This
 * check used to run synchronously on the activation hot path inside
 * `verifyLocalBundle`; it now runs here, off the hot path and with a short
 * HEAD timeout.
 */
async function verifyBundleRepublishOffHotPath(context: IActionContext, baseUrl: string, version: string): Promise<void> {
  const sidecar = await readBundleSidecar(version);
  if (!sidecar?.sourceMd5) {
    return;
  }
  const headUrl = buildExtensionBundleZipUrl(baseUrl, version);
  let publishedMd5: string | undefined;
  try {
    publishedMd5 = await fetchExpectedMd5(headUrl);
  } catch (error) {
    ext.outputChannel?.appendLog(
      `Background extension-bundle republish check skipped for ${version}: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }
  if (publishedMd5 && publishedMd5 !== sidecar.sourceMd5) {
    ext.outputChannel?.appendLog(
      `Logic Apps extension bundle ${version} was republished on the CDN (source MD5 drift); repairing in the background.`
    );
    healthyBundleVersion = null;
    await downloadBundleWithProgress(context, baseUrl, version, 'sidecarMismatch');
  }
}

/**
 * Awaits any in-flight bundle work and throws if the most recent install
 * attempt failed. Callers that must not proceed without a healthy bundle
 * (e.g. design-time host startup, runtime dependency validation) should
 * call this rather than the lower-level `waitForExtensionBundleReady`.
 *
 * Phase 15: the hot on-disk re-check now uses a cheap lstat fast gate
 * (see `evaluateBundleFastGate`) that never blocks activation on the ~40s
 * full-byte hash. Presence / sidecar failures still trigger a synchronous
 * repair download (and, in `requireInstalled` mode, a hard failure if the
 * bundle still isn't installed). A genuine byte-level corruption is detected
 * and repaired by a background deep verification scheduled off the activation
 * path.
 *
 * Callers without a context (legacy) still get the old await-only behavior.
 */
interface EnsureExtensionBundleHealthyOptions {
  requireInstalled?: boolean;
}

interface DownloadExtensionBundleOptions {
  allowSidecarBackfill?: boolean;
  /**
   * When true, skip the cheap lstat fast gate and always run the authoritative
   * `verifyLocalBundle` (full byte hash + CDN HEAD) → repair. Used by the
   * background deep-verify repair path, which has already detected a genuine
   * byte mismatch the fast gate can't see (an in-place edit preserving size +
   * mtime) and must force a real re-download rather than short-circuit.
   */
  forceVerify?: boolean;
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
    ext.outputChannel?.appendLog(
      `Logic Apps extension bundle ${healthyBundleVersion} already verified this session; skipping on-disk integrity re-check.`
    );
    return;
  }

  const initialHealth = await evaluateBundleFastGate();
  if (initialHealth.ok) {
    healthyBundleVersion = initialHealth.version;
    ext.outputChannel?.appendLog(`Logic Apps extension bundle ${initialHealth.version} on-disk integrity check passed.`);
    if (initialHealth.deepVerify) {
      scheduleBackgroundBundleDeepVerification(context, initialHealth.version);
    }
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
    await downloadExtensionBundle(context, { allowSidecarBackfill: false });
    const postInstallHealth = await assertExtensionBundleOnDiskHealthy();
    if (postInstallHealth.ok) {
      healthyBundleVersion = postInstallHealth.version;
      return;
    }
    throwBundleHealthError('Install completed but on-disk integrity still failed', postInstallHealth as BundleOnDiskHealthFailure);
  }

  const versionLabel = initialFailure.version ? ` ${initialFailure.version}` : '';
  const reasonLabel = formatBundleHealthFailure(initialFailure);
  ext.outputChannel?.appendLog(
    `Logic Apps extension bundle${versionLabel} on-disk integrity check failed: ${reasonLabel}. Attempting repair.`
  );

  if (context.telemetry?.properties) {
    context.telemetry.properties.bundleOnDiskHealthCheck = initialFailure.reason;
  }

  try {
    await downloadExtensionBundle(context, { allowSidecarBackfill: false });
  } catch (repairError) {
    const cause = repairError instanceof Error ? repairError.message : String(repairError);
    throw new Error(
      `Logic Apps extension bundle is not installed correctly. Repair attempt failed: ${cause}. Close other VS Code windows running Logic Apps, terminate any leftover func.exe processes, and reload this window to retry.`
    );
  }

  const postRepairHealth = await assertExtensionBundleOnDiskHealthy();
  if (postRepairHealth.ok) {
    healthyBundleVersion = postRepairHealth.version;
    return;
  }
  throwBundleHealthError('Repair completed but on-disk integrity still failed', postRepairHealth as BundleOnDiskHealthFailure);
}

/**
 * Download Microsoft.Azure.Functions.ExtensionBundle.Workflows.<version>
 * Destination: C:\Users\<USERHOME>\.azure-functions-core-tools\Functions\ExtensionBundles\<version>
 * @param {IActionContext} context - Command context.
 * @returns {Promise<bool>} A boolean indicating whether the bundle was updated.
 */
export async function downloadExtensionBundle(context: IActionContext, options: DownloadExtensionBundleOptions = {}): Promise<boolean> {
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
    const result = await bundleDownloadScope.run(true, () => downloadExtensionBundleCore(context, options));
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

async function downloadExtensionBundleCore(context: IActionContext, options: DownloadExtensionBundleOptions): Promise<boolean> {
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
        // Verify the on-disk bundle for the pinned version. Without this,
        // a corrupt local copy would silently satisfy the env-var pin and
        // we'd never repair it.
        const hashCheck = await verifyLocalBundle(context, baseUrlInfo.baseUrl, envVarVer, options);
        context.telemetry.properties.localBundleHashCheck = hashCheck;
        if (requiresBundleRepair(hashCheck)) {
          notifyCorruptionIfNeeded(hashCheck, envVarVer, baseUrlInfo.baseUrl);
          await downloadBundleWithProgress(context, baseUrlInfo.baseUrl, envVarVer, 'envVarRepair');
          context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
          context.telemetry.properties.didUpdateExtensionBundle = 'true';
          return true;
        }
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
          // Verify before trusting the local pin. The experimental URI is
          // the publisher of record for hash verification here.
          const verifyBaseUrl = baseUrlInfo.experimentalSourceUri.length > 0 ? baseUrlInfo.experimentalSourceUri : PUBLIC_BUNDLE_BASE_URL;
          const hashCheck = await verifyLocalBundle(context, verifyBaseUrl, pin, options);
          context.telemetry.properties.localBundleHashCheck = hashCheck;
          if (requiresBundleRepair(hashCheck)) {
            notifyCorruptionIfNeeded(hashCheck, pin, verifyBaseUrl);
            // Prefer the experimental source for the repair if configured.
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
              logExperimentalFallback(context, repair.reason, `Repair of pin ${pin} from experimental source failed.`, repair.error);
            }
            await downloadBundleWithProgress(context, PUBLIC_BUNDLE_BASE_URL, pin, 'experimentalPinRepair');
            ext.defaultBundleVersion = pin;
            ext.latestBundleVersion = pin;
            context.telemetry.properties.extensionBundleVersionSource = 'experimentalPinRepair';
            context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
            context.telemetry.properties.didUpdateExtensionBundle = 'true';
            return true;
          }
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

      if (latestLocalBundleVersion !== '0.0.0') {
        // Verify on disk before trusting the cached experimental local latest.
        const verifyBaseUrl = baseUrlInfo.experimentalSourceUri.length > 0 ? baseUrlInfo.experimentalSourceUri : PUBLIC_BUNDLE_BASE_URL;
        const hashCheck = await verifyLocalBundle(context, verifyBaseUrl, latestLocalBundleVersion, options);
        context.telemetry.properties.localBundleHashCheck = hashCheck;
        if (requiresBundleRepair(hashCheck)) {
          notifyCorruptionIfNeeded(hashCheck, latestLocalBundleVersion, verifyBaseUrl);
          if (baseUrlInfo.experimentalSourceUri.length > 0) {
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
              `Repair of local latest ${latestLocalBundleVersion} from experimental source failed.`,
              repair.error
            );
          }
          await downloadBundleWithProgress(context, PUBLIC_BUNDLE_BASE_URL, latestLocalBundleVersion, 'experimentalLocalLatestRepair');
          ext.defaultBundleVersion = latestLocalBundleVersion;
          ext.latestBundleVersion = latestLocalBundleVersion;
          context.telemetry.properties.extensionBundleVersionSource = 'experimentalLocalLatestRepair';
          context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
          context.telemetry.properties.didUpdateExtensionBundle = 'true';
          return true;
        }
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

    // Throttle the CDN "is there a newer bundle version?" feed lookup. That GET
    // (`getWorkflowBundleFeed` -> index.json on the bundle CDN) runs on the
    // activation hot path: dependency validation blocks on this download via
    // `waitForExtensionBundleReady`, so on a slow/flaky link to the bundle CDN it
    // adds tens of seconds to EVERY launch (the in-memory feed cache is wiped on
    // each process restart). When a healthy local bundle already exists and the
    // shared daily update-check window is not due, skip the feed entirely and
    // trust the latest local bundle — its on-disk integrity is still confirmed by
    // the cheap lstat fast gate, and a genuine corruption/legacy sidecar falls
    // through to the feed-backed verify/repair path below. Newer bundle versions
    // are still picked up at most once per update-check window, mirroring the
    // Node/Func/.NET "latest version" network lookups (`shouldCheckForDependency-
    // Updates`). `forceVerify` (the background deep verify) intentionally bypasses
    // this so a due deep check still consults the feed off the activation path.
    if (!options.forceVerify && latestLocalBundleVersion !== '0.0.0' && !shouldCheckForDependencyUpdates()) {
      const throttledGate = await evaluateBundleFastGate(latestLocalBundleVersion);
      if (throttledGate.ok) {
        context.telemetry.properties.localBundleHashCheck = 'fastPathThrottled';
        context.telemetry.properties.extensionBundleUpdateCheckThrottled = 'true';
        if (throttledGate.deepVerify) {
          scheduleBackgroundBundleDeepVerification(context, latestLocalBundleVersion, {
            republishBaseUrl: effectiveBaseUrl,
          });
        }
        ext.defaultBundleVersion = latestLocalBundleVersion;
        ext.latestBundleVersion = latestLocalBundleVersion;
        context.telemetry.properties.extensionBundleVersionSource = 'localLatest';
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        context.telemetry.properties.didUpdateExtensionBundle = 'false';
        return false;
      }
      // Fast gate failed (missing / corrupt / legacy sidecar needing a byte
      // verify) → fall through to the feed-backed flow so we can repair.
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
      context.telemetry.properties.localBundleHashCheck = 'skipped';
      context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
      context.telemetry.properties.didUpdateExtensionBundle = 'true';
      return true;
    }

    // Local is at least as new as the feed — verify the on-disk bundle before
    // trusting it. This runs on the activation hot path: `ensureExtensionBundle-
    // Healthy` awaits this download via `waitForExtensionBundleReady()`, so any
    // heavy verification here freezes activation. Gate with the cheap lstat fast
    // path first; only fall back to the ~40s full-byte hash + CDN HEAD when the
    // bundle is genuinely missing/broken. A healthy bundle confirms its bytes
    // (and CDN republish) off the activation path via a throttled background
    // deep verification.
    if (latestLocalBundleVersion !== '0.0.0') {
      const fastGate = options.forceVerify ? undefined : await evaluateBundleFastGate(latestLocalBundleVersion);
      if (fastGate?.ok) {
        context.telemetry.properties.localBundleHashCheck = 'fastPath';
        if (fastGate.deepVerify) {
          scheduleBackgroundBundleDeepVerification(context, latestLocalBundleVersion, {
            republishBaseUrl: effectiveBaseUrl,
          });
        }
        ext.defaultBundleVersion = latestLocalBundleVersion;
        ext.latestBundleVersion = latestLocalBundleVersion;
        context.telemetry.properties.extensionBundleVersionSource = 'localLatest';
        context.telemetry.measurements.downloadExtensionBundleDuration = (Date.now() - downloadExtensionBundleStartTime) / 1000;
        context.telemetry.properties.didUpdateExtensionBundle = 'false';
        return false;
      }

      const hashCheck = await verifyLocalBundle(context, effectiveBaseUrl, latestLocalBundleVersion, options);
      context.telemetry.properties.localBundleHashCheck = hashCheck;
      if (requiresBundleRepair(hashCheck)) {
        // Surface a one-shot warning so the user understands *why* we're
        // suddenly downloading on what looks like a steady-state activation.
        // sidecarMissing fires on first-run-after-upgrade for legacy bare-MD5
        // sidecars; keep that path quieter (no toast) to avoid alarming users
        // during the one-time migration.
        notifyCorruptionIfNeeded(hashCheck, latestLocalBundleVersion, effectiveBaseUrl);
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
    if (ext.outputChannel) {
      ext.outputChannel.appendLog(errorMessage);
    }
    // Re-throw so the outer `downloadExtensionBundle` wrapper sets
    // `lastBundleInstallResult = 'failed'`. Without this, downstream callers
    // (validateAndInstallBinaries, startDesignTimeApi) see the install as
    // healthy and proceed to spawn func.exe against a missing/corrupt bundle,
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
  backgroundBundleDeepVerifyPromise = undefined;
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
