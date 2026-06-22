/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  DependencyVersion,
  autoRuntimeDependenciesPathSettingKey,
  dependencyTimeoutSettingKey,
  dotnetDependencyName,
  funcPackageName,
  defaultLogicAppsFolder,
  dotNetBinaryPathSettingKey,
  DependencyDefaultPath,
  nodeJsBinaryPathSettingKey,
  funcCoreToolsBinaryPathSettingKey,
  funcDependencyName,
  extensionBundleId,
  nodeJsDependencyName,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { isNodeJsInstalled } from '../commands/nodeJs/validateNodeJsInstalled';
import { executeCommand } from './funcCoreTools/cpUtils';
import { getNpmCommand } from './nodeJs/nodeJsVersion';
import { getGlobalSetting, getWorkspaceSetting, updateGlobalSetting } from './vsCodeConfig/settings';
import { onboardBinaries, useBinariesDependencies } from './runtimeDependencies';
import { type DownloadAttemptResult, downloadFileWithVerification as downloadFileWithVerificationCore } from './integrity';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { Platform, type IGitHubReleaseInfo } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cp from 'child_process';
import * as semver from 'semver';
import * as vscode from 'vscode';

import AdmZip from 'adm-zip';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import { setFunctionsCommand } from './funcCoreTools/funcVersion';
import { startAllDesignTimeApis, stopAllDesignTimeApis } from './codeless/startDesignTimeApi';

export { useBinariesDependencies } from './runtimeDependencies';
export { DownloadIntegrityError } from './integrity';
export type { DownloadAttemptResult } from './integrity';

/**
 * Download and Extracts dependency zip.
 * @param {string} downloadUrl - download url.
 * @param {string} targetFolder - Module name to check.
 * @param {string} dependencyName - The Dedependency name.
 * @param {string} folderName - Optional Folder name. Will default to dependency name if empty.
 * @param {string} dotNetVersion - The .NET Major Version from CDN.
 */

export async function downloadAndExtractDependency(
  context: IActionContext,
  downloadUrl: string,
  targetFolder: string,
  dependencyName: string,
  folderName?: string,
  dotNetVersion?: string
): Promise<DownloadAttemptResult | undefined> {
  folderName = folderName || dependencyName;
  const tempFolderPath = path.join(os.tmpdir(), defaultLogicAppsFolder, folderName);
  targetFolder = path.join(targetFolder, folderName);
  fs.mkdirSync(targetFolder, { recursive: true });

  // Read and write permissions
  fs.chmodSync(targetFolder, 0o777);

  const dependencyFileExtension = getCompressionFileExtension(downloadUrl);
  const dependencyFilePath = path.join(tempFolderPath, `${dependencyName}${dependencyFileExtension}`);

  executeCommand(ext.outputChannel, undefined, 'echo', `Downloading dependency from: ${downloadUrl}`);
  fs.mkdirSync(tempFolderPath, { recursive: true });
  fs.chmodSync(tempFolderPath, 0o777);

  let integrityResult: DownloadAttemptResult | undefined;
  try {
    integrityResult = await downloadFileWithVerification(context, downloadUrl, dependencyFilePath, dependencyName);
  } catch (error) {
    const errorMessage = `Error downloading the ${dependencyName} file: ${error instanceof Error ? error.message : String(error)}`;
    vscode.window.showErrorMessage(errorMessage);
    context.telemetry.properties.error = errorMessage;
    // Clean up partials before bailing.
    try {
      if (fs.existsSync(tempFolderPath)) {
        fs.rmSync(tempFolderPath, { recursive: true, force: true });
      }
      if (fs.existsSync(targetFolder)) {
        fs.rmSync(targetFolder, { recursive: true, force: true });
      }
    } catch {
      // Best-effort cleanup; ignore secondary errors.
    }
    throw error;
  }

  executeCommand(ext.outputChannel, undefined, 'echo', `Successfully downloaded ${dependencyName} dependency.`);
  fs.chmodSync(dependencyFilePath, 0o777);

  try {
    // Extract to targetFolder
    if (dependencyName === dotnetDependencyName) {
      const version = dotNetVersion ?? semver.major(DependencyVersion.dotnet8);
      if (process.platform === Platform.windows) {
        await executeCommand(
          ext.outputChannel,
          undefined,
          'powershell -ExecutionPolicy Bypass -File',
          dependencyFilePath,
          '-InstallDir',
          targetFolder,
          '-Channel',
          `${version}.0`
        );
      } else {
        await executeCommand(ext.outputChannel, undefined, dependencyFilePath, '-InstallDir', targetFolder, '-Channel', `${version}.0`);
      }
    } else {
      if (dependencyName === funcDependencyName || dependencyName === extensionBundleId) {
        // Await actual process exit (not just SIGTERM) so our own func.exe
        // releases its handles on the bundle dir before we try to delete it.
        // Without this, the immediately-following rmSync can leave the dir
        // in a Windows pending-deletion state and mkdir then EPERMs.
        await stopAllDesignTimeApisAndWait();
      }
      try {
        await extractDependency(dependencyFilePath, targetFolder, dependencyName);
      } catch (firstError) {
        const lockLike = isTransientLockError(firstError) || firstError instanceof BundleExtractionError;
        if (!lockLike) {
          throw firstError;
        }
        // Likely an orphan func.exe holding the bundle directory open. Offer
        // to terminate orphan processes and retry once. If the user declines
        // or no orphans are found, propagate the original error.
        const terminated = await offerToTerminateOrphanFuncProcesses(dependencyName);
        if (!terminated) {
          throw firstError;
        }
        ext.outputChannel.appendLog(`Retrying ${dependencyName} install after terminating orphan func.exe processes.`);
        await extractDependency(dependencyFilePath, targetFolder, dependencyName);
      }
      ext.outputChannel.appendLog(localize('successInstall', 'Successfully installed {0}', dependencyName));
      if (dependencyName === funcDependencyName) {
        // Add execute permissions for func and gozip binaries
        if (process.platform !== Platform.windows) {
          fs.chmodSync(`${targetFolder}/func`, 0o755);
          fs.chmodSync(`${targetFolder}/gozip`, 0o755);
          fs.chmodSync(`${targetFolder}/in-proc8/func`, 0o755);
          fs.chmodSync(`${targetFolder}/in-proc6/func`, 0o755);
        }
        await setFunctionsCommand();
        await startAllDesignTimeApis();
      }
      // NB: when dependencyName === extensionBundleId we intentionally do NOT
      // restart design-time here. The bundle download flow defers the restart
      // until after the full install is verified (sidecar written + install
      // marked 'ok' + in-flight promise cleared) so the design-time host
      // doesn't spawn against a bundle that's still mid-install. See the
      // restart hook in `downloadExtensionBundle`'s finally block in
      // `bundleFeed.ts`.
    }
  } catch (error) {
    // Extraction (or verification) failed. Do NOT delete targetFolder: on
    // Windows the most common cause is EPERM/EBUSY from another process
    // (typically an orphan func.exe from a previous session) holding bundle
    // DLLs open. Deleting the folder is impossible while it's locked, and
    // leaving the user with NO bundle is strictly worse than leaving them
    // with the partial one they already had. The Phase 8 sidecar/content-hash
    // check will detect the bad state on the next activation and trigger
    // another re-download, which can succeed once the lock holder exits.
    const lockHint =
      isTransientLockError(error) || error instanceof BundleExtractionError
        ? ` Another process (often an orphan func.exe from a prior session) may be holding files in ${targetFolder}. Close all VS Code windows running Logic Apps, kill any leftover func.exe processes, and reload to retry.`
        : '';
    const baseMessage =
      error instanceof BundleExtractionError
        ? `Extension bundle ${dependencyName} extraction was incomplete (${error.kind}${
            error.entryName ? `: ${error.entryName}` : ''
          }) at ${targetFolder}.${lockHint}`
        : `Failed to install ${dependencyName} after download at ${targetFolder}: ${
            error instanceof Error ? error.message : String(error)
          }.${lockHint}`;
    ext.outputChannel.appendLog(baseMessage);
    vscode.window.showErrorMessage(
      localize(
        'bundleInstallFailed',
        'Logic Apps extension bundle {0} could not be installed at {1}. Another process may be holding the folder. Close other VS Code windows and any running func.exe processes, then reload this window to retry.',
        dependencyName,
        targetFolder
      )
    );
    context.telemetry.properties.extractError = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    // remove the temp folder.
    if (fs.existsSync(tempFolderPath)) {
      fs.rmSync(tempFolderPath, { recursive: true, force: true });
      executeCommand(ext.outputChannel, undefined, 'echo', `Removed ${tempFolderPath}`);
    }
  }

  return integrityResult;
}

/**
 * Streams a file from `url` to `destPath`, verifying integrity against
 * `Content-Length` and `Content-MD5` response headers when present.
 *
 * Thin wrapper that adds extension-host telemetry + log lines on top of the
 * vscode-free implementation in `./integrity`.
 */
export async function downloadFileWithVerification(
  context: IActionContext,
  url: string,
  destPath: string,
  dependencyName: string,
  maxAttempts?: number
): Promise<DownloadAttemptResult> {
  let attemptsUsed = 0;
  try {
    const result = await downloadFileWithVerificationCore(url, destPath, {
      maxAttempts,
      hooks: {
        onSuccess: (attempt, attemptResult, durationMs) => {
          attemptsUsed = attempt;
          context.telemetry.properties[`${dependencyName}DownloadAttempts`] = String(attempt);
          context.telemetry.properties[`${dependencyName}ExpectedSize`] =
            attemptResult.expectedSize === undefined ? 'unknown' : String(attemptResult.expectedSize);
          context.telemetry.properties[`${dependencyName}ActualSize`] = String(attemptResult.actualSize);
          context.telemetry.properties[`${dependencyName}Md5Match`] = attemptResult.expectedMd5 ? 'true' : 'skipped';
          context.telemetry.measurements ??= {};
          context.telemetry.measurements[`${dependencyName}DownloadDurationMs`] = durationMs;
        },
        onAttempt: (attempt, error, willRetry) => {
          attemptsUsed = attempt;
          executeCommand(
            ext.outputChannel,
            undefined,
            'echo',
            `Download attempt ${attempt} for ${dependencyName} failed: ${
              error instanceof Error ? error.message : String(error)
            }${willRetry ? ' — retrying.' : ''}`
          );
        },
      },
    });
    return result;
  } catch (error) {
    if (attemptsUsed > 0) {
      context.telemetry.properties[`${dependencyName}DownloadAttempts`] = String(attemptsUsed);
    }
    throw error;
  }
}

const getFunctionCoreToolVersionFromGithub = async (context: IActionContext, majorVersion: string): Promise<string> => {
  try {
    const response: IGitHubReleaseInfo = await readJsonFromUrl(
      'https://api.github.com/repos/Azure/azure-functions-core-tools/releases/latest'
    );
    const latestVersion = semver.valid(semver.coerce(response.tag_name));
    context.telemetry.properties.latestVersionSource = 'github';
    context.telemetry.properties.latestGithubVersion = response.tag_name;
    if (latestVersion && checkMajorVersion(latestVersion, majorVersion)) {
      return latestVersion;
    }
    throw new Error(
      localize(
        'latestVersionNotFound',
        'Latest version of Azure Functions Core Tools not found for major version {0}. Latest version is {1}.',
        majorVersion,
        latestVersion ?? 'unknown'
      )
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : isString(error) ? error : 'Unknown error';
    context.telemetry.properties.latestVersionSource = 'fallback';
    context.telemetry.properties.errorLatestFunctionCoretoolsVersion = `Error getting latest function core tools version from github: ${errorMessage}`;
    return DependencyVersion.funcCoreTools;
  }
};

export async function getLatestFunctionCoreToolsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.funcCoreTools = majorVersion;

  if (!majorVersion) {
    context.telemetry.properties.latestVersionSource = 'fallback';
    return DependencyVersion.funcCoreTools;
  }

  // Use npm to find newest func core tools version
  const hasNodeJs = await isNodeJsInstalled();
  if (hasNodeJs) {
    context.telemetry.properties.latestVersionSource = 'node';
    try {
      const npmCommand = getNpmCommand();
      const latestVersion = (await executeCommand(undefined, undefined, `${npmCommand}`, 'view', funcPackageName, 'version'))?.trim();
      if (checkMajorVersion(latestVersion, majorVersion)) {
        return latestVersion;
      }
    } catch (error) {
      context.telemetry.properties.errorLatestFunctionCoretoolsVersion = `Error executing npm command to get latest function core tools version: ${error}`;
    }
  }
  return await getFunctionCoreToolVersionFromGithub(context, majorVersion);
}

/**
 * Retrieves the latest version of .NET SDK.
 * @param {IActionContext} context - The action context.
 * @param {string} majorVersion - The major version of .NET SDK to retrieve. (optional)
 * @returns A promise that resolves to the latest version of .NET SDK.
 * @throws An error if there is an issue retrieving the latest .NET SDK version.
 */
export async function getLatestDotNetVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.dotNetMajorVersion = majorVersion;

  if (majorVersion) {
    return await readJsonFromUrl('https://api.github.com/repos/dotnet/sdk/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.latestVersionSource = 'github';
        let latestVersion: string | null = null;
        for (const releaseInfo of response) {
          const releaseVersion: string | null = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (!releaseVersion) {
            continue;
          }
          if (
            checkMajorVersion(releaseVersion, majorVersion) &&
            (isNullOrUndefined(latestVersion) || semver.gt(releaseVersion, latestVersion))
          ) {
            latestVersion = releaseVersion;
          }
        }
        return latestVersion ?? DependencyVersion.dotnet8;
      })
      .catch((error) => {
        context.telemetry.properties.latestVersionSource = 'fallback';
        context.telemetry.properties.errorNewestDotNetVersion = `Error getting latest .NET SDK version: ${error}`;
        return DependencyVersion.dotnet8;
      });
  }

  context.telemetry.properties.latestVersionSource = 'fallback';
  return DependencyVersion.dotnet8;
}

export async function getLatestNodeJsVersion(context: IActionContext, majorVersion?: string): Promise<string> {
  context.telemetry.properties.nodeMajorVersion = majorVersion;

  if (majorVersion) {
    return await readJsonFromUrl('https://api.github.com/repos/nodejs/node/releases')
      .then((response: IGitHubReleaseInfo[]) => {
        context.telemetry.properties.latestVersionSource = 'github';
        for (const releaseInfo of response) {
          const releaseVersion = semver.valid(semver.coerce(releaseInfo.tag_name));
          context.telemetry.properties.latestGithubVersion = releaseInfo.tag_name;
          if (releaseVersion && checkMajorVersion(releaseVersion, majorVersion)) {
            return releaseVersion;
          }
        }
        context.telemetry.properties.latestNodeJSVersion = 'fallback-no-match';
        context.telemetry.properties.errorLatestNodeJsVersion = 'No matching Node JS version found.';
        return DependencyVersion.nodeJs;
      })
      .catch((error) => {
        context.telemetry.properties.latestNodeJSVersion = 'fallback';
        context.telemetry.properties.errorLatestNodeJsVersion = `Error getting latest Node JS version: ${error}`;
        return DependencyVersion.nodeJs;
      });
  }

  context.telemetry.properties.latestNodeJSVersion = 'fallback';
  return DependencyVersion.nodeJs;
}

export function getNodeJsBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  if (osPlatform === 'win') {
    return `https://nodejs.org/dist/v${version}/node-v${version}-${osPlatform}-${arch}.zip`;
  }

  return `https://nodejs.org/dist/v${version}/node-v${version}-${osPlatform}-${arch}.tar.gz`;
}

export function getFunctionCoreToolsBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  return `https://github.com/Azure/azure-functions-core-tools/releases/download/${version}/Azure.Functions.Cli.${osPlatform}-${arch}.${version}.zip`;
}

export function getDotNetBinariesReleaseUrl(): string {
  return process.platform === Platform.windows ? 'https://dot.net/v1/dotnet-install.ps1' : 'https://dot.net/v1/dotnet-install.sh';
}

export function getCpuArchitecture() {
  switch (process.arch) {
    case 'x64':
    case 'arm64':
      return process.arch;

    default:
      throw new Error(localize('UnsupportedCPUArchitecture', `Unsupported CPU architecture: ${process.arch}`));
  }
}

/**
 * Checks if binaries folder directory path exists.
 * @param dependencyName The name of the dependency.
 * @returns true if expected binaries folder directory path exists
 */
export async function binariesExist(dependencyName: string): Promise<boolean> {
  if (!(await useBinariesDependencies())) {
    return false;
  }

  const binariesLocation = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  if (!binariesLocation) {
    return false;
  }
  const binariesPath = path.join(binariesLocation, dependencyName);
  const binariesExist = fs.existsSync(binariesPath);
  let expectedBinaryPath: string | undefined;
  if (binariesExist) {
    if (dependencyName === funcDependencyName) {
      expectedBinaryPath = getGlobalSetting<string>(funcCoreToolsBinaryPathSettingKey);
    } else if (dependencyName === dotnetDependencyName) {
      expectedBinaryPath = getGlobalSetting<string>(dotNetBinaryPathSettingKey);
    } else if (dependencyName === nodeJsDependencyName) {
      expectedBinaryPath = getGlobalSetting<string>(nodeJsBinaryPathSettingKey);
    }
  }

  executeCommand(ext.outputChannel, undefined, 'echo', `${dependencyName} Binaries: ${binariesPath}`);
  if (expectedBinaryPath && !fs.existsSync(expectedBinaryPath)) {
    executeCommand(ext.outputChannel, undefined, 'echo', `${dependencyName} binary is missing: ${expectedBinaryPath}`);
    return false;
  }

  return binariesExist;
}

async function readJsonFromUrl(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      return response.data;
    }
    throw new Error(`Request failed with status: ${response.status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Error reading JSON from URL ${url} : ${errorMessage}`);
    throw error;
  }
}

function getCompressionFileExtension(binariesUrl: string): string {
  if (binariesUrl.endsWith('.zip')) {
    return '.zip';
  }

  if (binariesUrl.endsWith('.tar.gz')) {
    return '.tar.gz';
  }

  if (binariesUrl.endsWith('.tar.xz')) {
    return '.tar.xz';
  }

  if (binariesUrl.endsWith('.ps1')) {
    return '.ps1';
  }

  if (binariesUrl.endsWith('.sh')) {
    return '.sh';
  }

  throw new Error(localize('UnsupportedCompressionFileExtension', `Unsupported compression file extension: ${binariesUrl}`));
}

function cleanDirectory(targetFolder: string): void {
  // Read all files/folders in targetFolder
  const entries = fs.readdirSync(targetFolder);
  for (const entry of entries) {
    const entryPath = path.join(targetFolder, entry);
    // Remove files or directories recursively
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}

/**
 * Maximum number of times to attempt extracting a dependency archive before
 * giving up and propagating the error to the caller. The retry is in place to
 * absorb transient Windows file-system errors (EBUSY/EPERM from antivirus or
 * Windows search indexer) and partial-extract verification failures.
 */
const MAX_EXTRACT_ATTEMPTS = 2;

/**
 * Delay between extract attempts.
 */
const EXTRACT_RETRY_DELAY_MS = 750;

/**
 * Discriminator for the kinds of post-extract verification failures we surface
 * to callers. Use this to distinguish "the zip extracted, but the resulting
 * tree is wrong" from a download integrity error or a generic I/O error.
 */
export type BundleExtractionFailureKind = 'missing' | 'sizeMismatch' | 'empty';

/**
 * Thrown when the on-disk extracted bundle does not match the archive's
 * central directory. Triggers a retry inside `extractDependency` and, on the
 * final attempt, propagates so the caller can drop the partial tree and
 * re-download.
 */
export class BundleExtractionError extends Error {
  public readonly kind: BundleExtractionFailureKind;
  public readonly entryName?: string;
  public readonly expectedSize?: number;
  public readonly actualSize?: number;

  constructor(kind: BundleExtractionFailureKind, entryName?: string, expectedSize?: number, actualSize?: number) {
    let message: string;
    switch (kind) {
      case 'missing':
        message = `Extracted bundle is missing expected file: ${entryName}`;
        break;
      case 'sizeMismatch':
        message = `Extracted bundle file ${entryName} is ${actualSize ?? '?'} bytes, expected ${expectedSize ?? '?'}`;
        break;
      default:
        message = 'Extracted bundle is empty (zip listed entries but none reached disk)';
        break;
    }
    super(message);
    this.name = 'BundleExtractionError';
    this.kind = kind;
    this.entryName = entryName;
    this.expectedSize = expectedSize;
    this.actualSize = actualSize;
  }
}

function isTransientLockError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === 'EBUSY' || code === 'EPERM' || code === 'EACCES';
}

/**
 * Wall-clock budget we'll wait for a Windows file lock to release before
 * giving up and failing the install. 30s is generous but reflects what we
 * actually see: a dying `func.exe` plus a Defender scan plus a pending
 * `rmSync` flush can easily eat 5–15s on a slow profile, and failing fast
 * leaves the user with a broken bundle until they reload.
 */
const LOCK_WAIT_BUDGET_MS = 30_000;

/**
 * How often to retry the locked filesystem operation. Tight at first (most
 * locks clear in <1s) — the wall-clock budget caps total wait time.
 */
const LOCK_WAIT_POLL_MS = 250;

/**
 * How often to surface "still waiting" progress to the user during a long
 * lock wait so it's clear we're not hung.
 */
const LOCK_WAIT_LOG_INTERVAL_MS = 5_000;

/**
 * After this much persistent locking, offer the orphan-`func.exe` prompt
 * once. We don't offer it immediately because most locks clear within the
 * first second on their own and surfacing a modal-ish prompt every install
 * would be noisy.
 */
const LOCK_WAIT_ORPHAN_PROMPT_AFTER_MS = 5_000;

/**
 * Max time to wait for our own design-time `func.exe` processes to fully
 * exit after `stopAllDesignTimeApis()`. Short by design — these are our
 * processes and SIGTERM/SIGKILL should land within a couple of seconds.
 */
const DESIGN_TIME_EXIT_TIMEOUT_MS = 5_000;

/**
 * Returns true when a process with the given PID is still running. Uses
 * `process.kill(pid, 0)`, a no-op signal that throws ESRCH when the process
 * is gone. Works on Windows and POSIX.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    // ESRCH = no such process. EPERM means we don't have permission to
    // signal, but the process exists → treat as alive.
    if (code === 'EPERM') {
      return true;
    }
    return false;
  }
}

/**
 * Polls until every PID in `pids` has exited, or `timeoutMs` elapses.
 * Best-effort: never throws, just returns when done. Designed for the
 * window after `stopAllDesignTimeApis()` where our own `func.exe` is
 * draining file handles.
 */
async function waitForFuncProcessExit(pids: readonly number[], timeoutMs: number): Promise<void> {
  if (pids.length === 0) {
    return;
  }
  const deadline = Date.now() + timeoutMs;
  let remaining = pids.filter((pid) => isProcessAlive(pid));
  while (remaining.length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_POLL_MS));
    remaining = remaining.filter((pid) => isProcessAlive(pid));
  }
  if (remaining.length > 0 && ext.outputChannel) {
    ext.outputChannel.appendLog(
      `Some design-time func.exe process(es) still alive after ${timeoutMs}ms wait: PID(s) ${remaining.join(', ')}. Proceeding anyway.`
    );
  }
}

/**
 * Stops all tracked design-time hosts and waits for the underlying
 * `func.exe` processes to actually exit before returning. The plain
 * `stopAllDesignTimeApis()` is fire-and-forget — control returns while
 * Windows is still flushing the file handles those processes held, which
 * leaves the bundle directory in a locked / pending-deletion state when we
 * try to extract immediately after.
 */
async function stopAllDesignTimeApisAndWait(timeoutMs: number = DESIGN_TIME_EXIT_TIMEOUT_MS): Promise<void> {
  const trackedBefore = Array.from(getTrackedFuncPids());
  stopAllDesignTimeApis();
  if (trackedBefore.length === 0) {
    return;
  }
  await waitForFuncProcessExit(trackedBefore, timeoutMs);
}

/**
 * Result classification for the inner attempt of a lock-wait helper.
 */
type LockWaitAttempt = { ok: true } | { ok: false; error: unknown; retry: boolean };

/**
 * Generic retry loop used by `removeWithLockWait` and `mkdirWithLockWait`.
 * Polls `attempt` until success or `budgetMs` elapses. Logs progress every
 * ~5s and offers the orphan-`func.exe` prompt once after ~5s of persistent
 * locking. On budget exhaustion, throws the last seen error.
 */
async function withLockWait(
  opLabel: string,
  targetPath: string,
  dependencyName: string,
  budgetMs: number,
  attempt: () => LockWaitAttempt
): Promise<void> {
  const start = Date.now();
  const deadline = start + budgetMs;
  let lastProgressLog = start;
  let orphanPromptOffered = false;
  let lastError: unknown;

  while (true) {
    const result = attempt();
    if (result.ok) {
      const waited = Date.now() - start;
      if (waited >= LOCK_WAIT_LOG_INTERVAL_MS && ext.outputChannel) {
        ext.outputChannel.appendLog(
          `${opLabel} ${targetPath} succeeded after waiting ${(waited / 1000).toFixed(1)}s for the lock to release.`
        );
      }
      return;
    }
    const failure = result as { ok: false; error: unknown; retry: boolean };
    lastError = failure.error;
    if (!failure.retry) {
      throw lastError;
    }
    const now = Date.now();
    if (now >= deadline) {
      throw lastError;
    }
    if (now - lastProgressLog >= LOCK_WAIT_LOG_INTERVAL_MS && ext.outputChannel) {
      const waited = ((now - start) / 1000).toFixed(1);
      const remaining = ((deadline - now) / 1000).toFixed(1);
      const code = (lastError as { code?: string })?.code ?? 'lock';
      ext.outputChannel.appendLog(
        `Still waiting on ${dependencyName} (${code}) to ${opLabel.toLowerCase()} ${targetPath}: ${waited}s elapsed, up to ${remaining}s remaining.`
      );
      lastProgressLog = now;
    }
    if (!orphanPromptOffered && now - start >= LOCK_WAIT_ORPHAN_PROMPT_AFTER_MS) {
      orphanPromptOffered = true;
      // Best-effort — even if the user cancels we keep waiting for the
      // budget to elapse, since some lock holders (Defender, indexer) clear
      // on their own and there's no point bailing early.
      try {
        await offerToTerminateOrphanFuncProcesses(dependencyName);
      } catch (promptErr) {
        if (ext.outputChannel) {
          ext.outputChannel.appendLog(
            `Orphan func.exe prompt failed during ${opLabel.toLowerCase()} wait: ${promptErr instanceof Error ? promptErr.message : String(promptErr)}`
          );
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_POLL_MS));
  }
}

/**
 * Removes `targetPath` recursively, retrying for up to `budgetMs` on
 * transient Windows lock errors (EPERM/EBUSY/EACCES). Returns silently
 * when the path doesn't exist.
 *
 * Why: on Windows, `fs.rmSync(force: true)` may "succeed" while silently
 * skipping locked files — leaving the directory in a pending-deletion state
 * that makes the immediately-following `mkdirSync` throw EPERM. This helper
 * keeps retrying until the path is genuinely gone (or budget exhausted).
 */
export async function removeWithLockWait(
  targetPath: string,
  dependencyName: string,
  budgetMs: number = LOCK_WAIT_BUDGET_MS
): Promise<void> {
  await withLockWait('Remove', targetPath, dependencyName, budgetMs, () => {
    if (!fs.existsSync(targetPath)) {
      return { ok: true };
    }
    try {
      fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      return { ok: false, error, retry: isTransientLockError(error) };
    }
    // Even after rmSync returns success, Windows may have left the dir in
    // place because some files are still locked. Treat lingering existence
    // as a transient lock and keep waiting.
    if (fs.existsSync(targetPath)) {
      return {
        ok: false,
        error: Object.assign(new Error(`Path ${targetPath} still exists after rmSync (locked files held by another process).`), {
          code: 'EBUSY',
        }),
        retry: true,
      };
    }
    return { ok: true };
  });
}

/**
 * Creates `targetPath` (recursive), retrying for up to `budgetMs` on
 * transient Windows lock errors. The common case this exists for: we just
 * `rmSync`'d the same path and Windows hasn't finished flushing the
 * deletion, so `mkdirSync` returns EPERM until the FS catches up.
 */
export async function mkdirWithLockWait(targetPath: string, dependencyName: string, budgetMs: number = LOCK_WAIT_BUDGET_MS): Promise<void> {
  await withLockWait('Mkdir', targetPath, dependencyName, budgetMs, () => {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, error, retry: isTransientLockError(error) };
    }
  });
}

/**
 * Enumerates all running `func.exe` processes on Windows via `tasklist`.
 * Returns an empty array on non-Windows or if `tasklist` fails.
 */
async function listFuncExePidsWindows(): Promise<number[]> {
  if (process.platform !== Platform.windows) {
    return [];
  }
  return new Promise<number[]>((resolve) => {
    cp.exec('tasklist /FI "IMAGENAME eq func.exe" /FO CSV /NH', (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      const pids: number[] = [];
      for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        // CSV: "func.exe","12345","Console","1","12,345 K"
        const fields = trimmed.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
        if (fields[0]?.toLowerCase() === 'func.exe') {
          const pid = Number.parseInt(fields[1], 10);
          if (!Number.isNaN(pid)) {
            pids.push(pid);
          }
        }
      }
      resolve(pids);
    });
  });
}

/**
 * Returns the set of `func.exe` PIDs the extension knows about — i.e. the
 * design-time hosts it spawned and tracks in `ext.designTimeInstances`.
 * Anything not in this set is an orphan from a prior session.
 */
function getTrackedFuncPids(): Set<number> {
  const known = new Set<number>();
  for (const inst of ext.designTimeInstances.values()) {
    if (!inst) {
      continue;
    }
    if (inst.childFuncPid !== undefined && inst.childFuncPid !== null) {
      const pid = Number(inst.childFuncPid);
      if (!Number.isNaN(pid)) {
        known.add(pid);
      }
    }
    const directPid = inst.process?.pid;
    if (typeof directPid === 'number') {
      known.add(directPid);
    }
  }
  return known;
}

/**
 * Detects orphan `func.exe` processes (not tracked by this extension session)
 * that are likely holding files in the bundle install directory. If any are
 * found, prompts the user to terminate them. Returns true if at least one
 * orphan was killed (caller should retry the operation).
 *
 * No-op on non-Windows since the EPERM/EBUSY scenarios reported by users are
 * Windows-specific.
 */
async function offerToTerminateOrphanFuncProcesses(dependencyName: string): Promise<boolean> {
  if (process.platform !== Platform.windows) {
    return false;
  }
  const allFuncPids = await listFuncExePidsWindows();
  if (allFuncPids.length === 0) {
    return false;
  }
  const tracked = getTrackedFuncPids();
  const orphans = allFuncPids.filter((pid) => !tracked.has(pid));
  if (orphans.length === 0) {
    return false;
  }
  ext.outputChannel.appendLog(
    `Detected ${orphans.length} orphan func.exe process(es) not managed by this VS Code session (PID${
      orphans.length > 1 ? 's' : ''
    } ${orphans.join(', ')}). These may be locking the ${dependencyName} install directory.`
  );
  const terminateLabel = localize('terminateOrphanFuncBtn', 'Terminate {0} process(es)', orphans.length);
  const choice = await vscode.window.showWarningMessage(
    localize(
      'orphanFuncDetected',
      'Logic Apps detected {0} leftover func.exe process(es) from a previous session that may be blocking the {1} update. Terminate them now to unblock the install?',
      orphans.length,
      dependencyName
    ),
    { modal: false },
    terminateLabel
  );
  if (choice !== terminateLabel) {
    ext.outputChannel.appendLog('User declined to terminate orphan func.exe processes.');
    return false;
  }
  let killed = 0;
  for (const pid of orphans) {
    try {
      process.kill(pid);
      killed++;
    } catch (killErr) {
      ext.outputChannel.appendLog(
        `Could not terminate func.exe PID ${pid}: ${killErr instanceof Error ? killErr.message : String(killErr)}`
      );
    }
  }
  ext.outputChannel.appendLog(`Terminated ${killed}/${orphans.length} orphan func.exe process(es).`);
  if (killed > 0) {
    // Give Windows a beat to release file handles before any retry.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return killed > 0;
}

/**
 * Verifies every file entry in the zip's central directory exists on disk at
 * `targetFolder` with the size the archive claims it should have. Must be
 * called before `extractContainerFolder` (which may rename a single root
 * directory away, breaking the entry-name → on-disk-path mapping).
 *
 * Throws `BundleExtractionError` on the first mismatch.
 */
export function verifyExtractedZip(zip: AdmZip, targetFolder: string): void {
  const fileEntries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (fileEntries.length === 0) {
    return;
  }
  let verified = 0;
  for (const entry of fileEntries) {
    const onDisk = path.join(targetFolder, entry.entryName);
    if (!fs.existsSync(onDisk)) {
      throw new BundleExtractionError('missing', entry.entryName);
    }
    const stat = fs.statSync(onDisk);
    if (stat.size !== entry.header.size) {
      throw new BundleExtractionError('sizeMismatch', entry.entryName, entry.header.size, stat.size);
    }
    verified++;
  }
  if (verified === 0) {
    throw new BundleExtractionError('empty');
  }
}

async function extractDependency(dependencyFilePath: string, targetFolder: string, dependencyName: string): Promise<void> {
  // Delete the existing target folder before extraction so we start from a
  // truly empty state. This is critical when replacing a corrupt bundle: the
  // old files (which may be stale, partial, or from a different version) must
  // be gone before AdmZip writes the new ones, because AdmZip's overwrite
  // mode does NOT delete files that are absent from the new zip.
  //
  // On Windows the delete + recreate pair is racy when something else (a
  // recently-stopped func.exe, Defender, the search indexer) is still
  // draining handles. Both helpers wait up to 30s for the lock to clear and
  // log progress every ~5s so the user sees we're working, not stuck.
  if (fs.existsSync(targetFolder)) {
    ext.outputChannel.appendLog(`Removing existing ${dependencyName} install at ${targetFolder} before re-extracting.`);
    await removeWithLockWait(targetFolder, dependencyName);
  }
  await mkdirWithLockWait(targetFolder, dependencyName);
  try {
    fs.chmodSync(targetFolder, 0o777);
  } catch {
    // Permission tweak is best-effort.
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_EXTRACT_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        // Clear the failed partial extract before retrying.
        cleanDirectory(targetFolder);
      }
      await executeCommand(
        ext.outputChannel,
        undefined,
        'echo',
        `Extracting ${dependencyFilePath} (attempt ${attempt}/${MAX_EXTRACT_ATTEMPTS})`
      );
      if (dependencyFilePath.endsWith('.zip')) {
        const zip = new AdmZip(dependencyFilePath);
        zip.extractAllTo(targetFolder, /* overwrite */ true, /* Permissions */ true);
        // Verify before extractContainerFolder rewrites paths.
        verifyExtractedZip(zip, targetFolder);
      } else {
        await executeCommand(ext.outputChannel, undefined, 'tar', '-xzvf', dependencyFilePath, '-C', targetFolder);
      }
      extractContainerFolder(targetFolder);
      await executeCommand(ext.outputChannel, undefined, 'echo', `Extraction ${dependencyName} successfully completed.`);
      return;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === MAX_EXTRACT_ATTEMPTS;
      const isRetryable = error instanceof BundleExtractionError || isTransientLockError(error);
      if (isLastAttempt || !isRetryable) {
        break;
      }
      const reason =
        error instanceof BundleExtractionError
          ? `verification failed (${error.kind}${error.entryName ? `: ${error.entryName}` : ''})`
          : `transient lock (${(error as { code?: string }).code ?? 'unknown'})`;
      ext.outputChannel.appendLog(
        `Extraction attempt ${attempt} for ${dependencyName} failed (${reason}); retrying in ${EXTRACT_RETRY_DELAY_MS}ms.`
      );
      await new Promise((resolve) => setTimeout(resolve, EXTRACT_RETRY_DELAY_MS));
    }
  }
  if (lastError instanceof BundleExtractionError) {
    throw lastError;
  }
  throw new Error(`Error extracting ${dependencyName}: ${lastError}`);
}

/**
 * Checks if the major version of a given version string matches the specified major version.
 * @param {string} version - The version string to check.
 * @param {string} majorVersion - The major version to compare against.
 * @returns A boolean indicating whether the major version matches.
 */
function checkMajorVersion(version: string, majorVersion: string): boolean {
  return semver.major(version) === Number(majorVersion);
}

/**
 * Cleans up by removing Container Folder:
 * path/to/folder/container/files --> /path/to/folder/files
 * @param targetFolder
 */
function extractContainerFolder(targetFolder: string) {
  const extractedContents = fs.readdirSync(targetFolder);
  if (extractedContents.length === 1 && fs.statSync(path.join(targetFolder, extractedContents[0])).isDirectory()) {
    const containerFolderPath = path.join(targetFolder, extractedContents[0]);
    const containerContents = fs.readdirSync(containerFolderPath);
    containerContents.forEach((content) => {
      const contentPath = path.join(containerFolderPath, content);
      const destinationPath = path.join(targetFolder, content);
      fs.renameSync(contentPath, destinationPath);
    });

    if (fs.readdirSync(containerFolderPath).length === 0) {
      fs.rmSync(containerFolderPath, { recursive: true });
    }
  }
}

/**
 * Gets dependency timeout setting value from workspace settings.
 * @returns {number} Timeout value in seconds.
 */
export function getDependencyTimeout(): number {
  const dependencyTimeoutValue: number | undefined = getWorkspaceSetting<number>(dependencyTimeoutSettingKey);
  const timeoutInSeconds = Number(dependencyTimeoutValue);
  if (Number.isNaN(timeoutInSeconds)) {
    throw new Error(
      localize(
        'invalidSettingValue',
        'The setting "{0}" must be a number, but instead found "{1}".',
        dependencyTimeoutValue,
        dependencyTimeoutValue
      )
    );
  }

  return timeoutInSeconds;
}

/**
 * Prompts warning message to decide the auto validation/installation of dependency binaries.
 * @param {IActionContext} context - Activation context.
 */
export async function installBinaries(context: IActionContext) {
  const useBinaries = await useBinariesDependencies();

  if (useBinaries) {
    await onboardBinaries(context);
    context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting = 'true';
  } else {
    await updateGlobalSetting(dotNetBinaryPathSettingKey, DependencyDefaultPath.dotnet);
    await updateGlobalSetting(nodeJsBinaryPathSettingKey, DependencyDefaultPath.node);
    await updateGlobalSetting(funcCoreToolsBinaryPathSettingKey, DependencyDefaultPath.funcCoreTools);
    context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting = 'false';
  }
}
