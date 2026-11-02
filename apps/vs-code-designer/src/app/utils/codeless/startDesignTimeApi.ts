/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  defaultVersionRange,
  designTimeDirectoryName,
  designerStartApi,
  extensionBundleId,
  hostFileName,
  designerApiLoadTimeout,
  type hostFileContent,
} from '../../../constants';
import { ext, type FuncInstance } from '../../../extensionVariables';

// Cache validation results to avoid expensive process checks (3-4 seconds on Windows)
// This balances safety (detecting wrong func process) with performance
// Key: projectPath, Value: { timestamp, isValid }
const processValidationCache = new Map<string, { timestamp: number; isValid: boolean }>();
const VALIDATION_CACHE_TTL = 60000; // Cache for 60 seconds - revalidate every minute to catch process changes
import { localize } from '../../../localize';
import { updateFuncIgnore } from '../codeless/common';
import { writeFormattedJson } from '../fs';
import { getFunctionsCommand } from '../funcCoreTools/funcVersion';
import { getWorkspaceLogicAppRoots } from '../workspace';
import { ensureProjectFiles } from '../../projectConsistency/projectFilesConsistency';
import { delay } from '../delay';
import { type IActionContext, type IAzExtOutputChannel, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import { Platform } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Uri, workspace } from 'vscode';
import { findChildProcess } from '../../commands/pickFuncProcess';
import find_process from 'find-process';
import { getChildProcesses } from '../findChildProcess/findChildProcess';
import {
  ensureExtensionBundleHealthy,
  isExtensionBundleDownloadInFlight,
  isInsideBundleDownloadScope,
  waitForExtensionBundleReady,
} from '../bundleFeed';
import { releaseReservedPort, reserveFreePort } from '../portReservation';
import { warnIfJdbcJavaRuntimeMissing } from '../java/jdbcConnector';
import {
  emitDesignTimeDiagnostic,
  startDesignTimeDiagnostic,
  finishDesignTimeDiagnostic,
  observeSpawnIdentity,
} from './designTimeDiagnostics';

const maxValidationRestarts = 3;

// Only the exact ChildProcess returned by our detached Linux spawn can authorize
// a group kill. A PID copied into FuncInstance (including childFuncPid) cannot.
const ownedLinuxProcessGroups = new WeakMap<cp.ChildProcess, number>();
const linuxProcessExitWaitMs = 5000;

// Called only inside admitted diagnostic callbacks. Strings are hashed by the
// real serializer; no command arguments, environment or output enter receipts.
function designTimeState(projectPath: string, instance = ext.designTimeInstances.get(projectPath)): Record<string, unknown> {
  return {
    project: projectPath,
    mapCount: ext.designTimeInstances.size,
    startupPromisePresent: Boolean(instance?.startupPromise),
    processPresent: Boolean(instance?.process),
    pid: instance?.process?.pid,
    childFuncPid: instance?.childFuncPid === undefined ? undefined : Number(instance.childFuncPid),
  };
}

function isFailingHealthCheckLogLine(line: string): boolean {
  const normalizedLine = line.toLowerCase();
  return (
    (normalizedLine.includes('health check') || normalizedLine.includes('healthcheck')) &&
    /(fail|unhealthy|timeout|timed out|did not respond|error)/i.test(line)
  );
}

function normalizeHealthCheckLogLine(line: string): string {
  return line
    .replace(/\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}(?:\.\d+)?z/gi, '<timestamp>')
    .replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?/g, '<timestamp>')
    .replace(/\[\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\]/g, '[<timestamp>]')
    .replace(/\[[0-9a-f-]{16,}\]/gi, '[<id>]')
    .replace(/\bid=[0-9a-f-]{16,}/gi, 'id=<id>')
    .replace(/\bduration=\d+(?:\.\d+)?ms/gi, 'duration=<duration>')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createDesignTimeHostOutputAppender(outputChannel: IAzExtOutputChannel): { append: (data: string) => void; flush: () => void } {
  const seenFailingHealthChecks = new Set<string>();
  const suppressedFailingHealthChecks = new Set<string>();
  let bufferedData = '';

  const appendLine = (line: string): void => {
    if (!isFailingHealthCheckLogLine(line)) {
      outputChannel.append(line);
      return;
    }

    const normalizedLine = normalizeHealthCheckLogLine(line);
    if (!seenFailingHealthChecks.has(normalizedLine)) {
      seenFailingHealthChecks.add(normalizedLine);
      outputChannel.append(line);
      return;
    }

    if (!suppressedFailingHealthChecks.has(normalizedLine)) {
      suppressedFailingHealthChecks.add(normalizedLine);
      outputChannel.append('[Azure Logic Apps] Repeated failing health-check output suppressed.\n');
    }
  };

  const append = (data: string): void => {
    bufferedData += data;
    const completeLinePattern = /.*(?:\r\n|\n|\r)/g;
    let match: RegExpExecArray | null;
    let lastCompleteLineIndex = 0;

    while ((match = completeLinePattern.exec(bufferedData))) {
      appendLine(match[0]);
      lastCompleteLineIndex = completeLinePattern.lastIndex;
    }

    bufferedData = bufferedData.slice(lastCompleteLineIndex);
    if (bufferedData.length > 8192) {
      outputChannel.append(bufferedData);
      bufferedData = '';
    }
  };

  const flush = (): void => {
    if (!bufferedData) {
      return;
    }

    appendLine(bufferedData);
    bufferedData = '';
  };

  return { append, flush };
}

function normalizeTrackedChildProcessId(parentProcessId: number, childFuncPid?: string): string | undefined {
  return childFuncPid && childFuncPid !== parentProcessId.toString() ? childFuncPid : undefined;
}

async function isTrackedUnixFuncProcessRunning(...trackedProcessIds: Array<number | string | undefined>): Promise<boolean> {
  for (const trackedProcessId of trackedProcessIds) {
    if (!trackedProcessId) {
      continue;
    }

    try {
      const processList = await find_process('pid', trackedProcessId);
      if (processList.length > 0 && /(func|dotnet)(\.exe)?$/i.test(processList[0].name ?? '')) {
        return true;
      }
    } catch {
      // Ignore lookup failures and continue checking tracked pids.
    }
  }

  return false;
}

function killTrackedUnixProcesses(process: cp.ChildProcess, childFuncPid?: string, projectPath = ''): void {
  const trackedProcessIds = new Set<string>();
  if (childFuncPid) {
    trackedProcessIds.add(childFuncPid);
  }
  if (process.pid) {
    trackedProcessIds.add(process.pid.toString());
  }

  for (const trackedProcessId of trackedProcessIds) {
    const receipt = startDesignTimeDiagnostic('design-time-kill', () => ({
      ...designTimeState(projectPath),
      targetPid: Number(trackedProcessId),
    }));
    try {
      const kill = cp.spawn('kill', ['-9', trackedProcessId]);
      finishDesignTimeDiagnostic(receipt, () => ({ targetPid: Number(trackedProcessId), pid: kill.pid, settled: false }));
    } catch (error) {
      finishDesignTimeDiagnostic(receipt, () => ({ targetPid: Number(trackedProcessId) }), { error });
      throw error;
    }
  }
}

async function killOwnedLinuxProcessGroup(child: cp.ChildProcess, projectPath: string): Promise<void> {
  const groupId = ownedLinuxProcessGroups.get(child);
  if (groupId === undefined || child.pid !== groupId) {
    return;
  }

  const receipt = startDesignTimeDiagnostic('design-time-kill', () => ({
    ...designTimeState(projectPath),
    targetPid: -groupId,
  }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onExit: (() => void) | undefined;
  try {
    // Once the leader has exited, its numeric PID can eventually be reused.
    // A remembered group number alone must never authorize killing that new
    // group. Leave any unproven survivor to the retained native owner.
    if (child.exitCode !== null || child.signalCode !== null) {
      ownedLinuxProcessGroups.delete(child);
      throw new Error('Cannot verify a live Linux design-time process-group leader.');
    }
    // Subscribe before signaling: exit may arrive immediately after SIGKILL.
    // Wait for exit, not close (descendants may have inherited the stdio pipes).
    const exited = new Promise<void>((resolve) => {
      onExit = resolve;
      child.once('exit', onExit);
    });
    try {
      process.kill(-groupId, 'SIGKILL');
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ESRCH') {
        throw error;
      }
      // The owned group is already absent; do not fall back to a discovered PID.
      ownedLinuxProcessGroups.delete(child);
      finishDesignTimeDiagnostic(receipt, () => ({ targetPid: -groupId, settled: true }));
      return;
    }
    ownedLinuxProcessGroups.delete(child);
    await Promise.race([
      exited,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('Timed out waiting for the Linux design-time process to exit after SIGKILL.')),
          linuxProcessExitWaitMs
        );
      }),
    ]);
    finishDesignTimeDiagnostic(receipt, () => ({ targetPid: -groupId, settled: true }));
  } catch (error) {
    finishDesignTimeDiagnostic(receipt, () => ({ targetPid: -groupId, settled: false }), { error });
    throw error;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    if (onExit) {
      child.removeListener('exit', onExit);
    }
  }
}

function getDesignTimeInstance(projectPath: string): FuncInstance {
  let designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst) {
    designTimeInst = {};
    ext.designTimeInstances.set(projectPath, designTimeInst);
    emitDesignTimeDiagnostic('design-time-map-set', () => designTimeState(projectPath));
  }

  return designTimeInst;
}

function stopTrackedDesignTimeProcess(projectPath: string): Promise<void> | undefined {
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst?.process) {
    emitDesignTimeDiagnostic('design-time-tracked-stop', () => ({ ...designTimeState(projectPath), skipped: true }));
    return;
  }

  const { process, childFuncPid } = designTimeInst;
  emitDesignTimeDiagnostic('design-time-tracked-stop', () => ({ ...designTimeState(projectPath), skipped: false }));
  designTimeInst.process = undefined;
  designTimeInst.childFuncPid = undefined;

  if (os.platform() === Platform.windows) {
    if (childFuncPid) {
      execUnawaitedTaskkill(childFuncPid, projectPath);
    }
    execUnawaitedTaskkill(process.pid, projectPath);
  } else if (os.platform() === 'linux') {
    return killOwnedLinuxProcessGroup(process, projectPath);
  } else {
    killTrackedUnixProcesses(process, childFuncPid, projectPath);
  }
}

/**
 * Starts the design-time API for the given project path.
 * @param context - The action context for telemetry.
 * @param projectPath - The Logic App project path.
 * @param currRetry - Current retry depth from process-validation restarts. Defaults to 0.
 */
export async function startDesignTimeApi(context: IActionContext, projectPath: string, currRetry = 0): Promise<void> {
  emitDesignTimeDiagnostic('design-time-start-request', () => ({ ...designTimeState(projectPath), retry: currRetry }));
  context.telemetry.properties.projectPath = projectPath;
  const designTimeInst = getDesignTimeInstance(projectPath);

  if (designTimeInst.startupPromise) {
    emitDesignTimeDiagnostic('design-time-start-request', () => ({ ...designTimeState(projectPath), reused: true }));
    context.telemetry.properties.skippingAlreadyInProgress = 'true';
    context.errorHandling.suppressDisplay = true;
    await designTimeInst.startupPromise;
    return;
  }

  designTimeInst.startupPromise = startDesignTimeApiInternal(context, designTimeInst, projectPath, currRetry);
  emitDesignTimeDiagnostic('design-time-start-request', () => ({ ...designTimeState(projectPath), reused: false }));
  await designTimeInst.startupPromise;
}

async function startDesignTimeApiInternal(
  context: IActionContext,
  designTimeInst: FuncInstance,
  projectPath: string,
  currRetry: number
): Promise<void> {
  const receipt = startDesignTimeDiagnostic('design-time-startup', () => ({ ...designTimeState(projectPath), retry: currRetry }));
  let diagnosticFailure: { error: unknown } | undefined;
  try {
    context.telemetry.properties.didStartDesignTime = 'false';

    designTimeInst.startupError = undefined;
    designTimeInst.isStarting = true;

    if (!designTimeInst.port) {
      designTimeInst.port = await reserveFreePort();
    }

    const url = `http://localhost:${designTimeInst.port}${designerStartApi}`;
    if (await isDesignTimeUp(url)) {
      designTimeInst.isStarting = false;
      context.telemetry.properties.isDesignTimeUp = 'true';
      await validateRunningFuncProcess(projectPath, currRetry);
      return;
    }

    try {
      ext.outputChannel.appendLog(localize('startingDesignTimeApi', 'Starting Design Time Api for project: {0}', projectPath));

      await ensureProjectFiles(context, projectPath);

      warnIfJdbcJavaRuntimeMissing(context, projectPath).catch(() => undefined);

      const designTimeDirectory = path.join(projectPath, designTimeDirectoryName);
      const portArgs = `--port ${designTimeInst.port}`;
      ext.outputChannel.appendLog(
        localize(
          'startingDesignTimeApiDetails',
          'Launching design-time host for project "{0}" from "{1}" on port {2}.',
          projectPath,
          designTimeDirectory,
          designTimeInst.port
        )
      );

      // If activation triggered a bundle (re)download (newer version, corruption
      // detected, sidecar missing/drifted), wait for it to finish before spawning
      // func.exe. Launching while the extension bundle is being re-extracted can
      // lock the bundle folder on Windows and leave the design-time host pointing
      // at a half-extracted bundle.
      //
      // When this call originates from inside `downloadExtensionBundle` itself
      // (the post-install restart hook), `isInsideBundleDownloadScope()` is true
      // and there is nothing to wait for — the bundle is on disk by then.
      // Suppress the misleading "Waiting…" log in that case.
      if (isExtensionBundleDownloadInFlight() && !isInsideBundleDownloadScope()) {
        ext.outputChannel.appendLog(
          localize(
            'waitingForBundleReady',
            'Waiting for Logic Apps extension bundle download to complete before starting design-time host for project "{0}"…',
            projectPath
          )
        );
        await waitForExtensionBundleReady();
      }
      // Refuse to spawn func.exe if the most recent bundle install attempt
      // failed. Without a healthy bundle, func reports "No job functions
      // found" and unhealthy storage forever — surfacing a clear, actionable
      // error here is strictly better than letting the host start broken.
      await ensureExtensionBundleHealthy(context);

      startDesignTimeProcess(ext.outputChannel, designTimeDirectory, getFunctionsCommand(), 'host', 'start', portArgs);
      await waitForDesignTimeStartUp(context, projectPath, url, true);
      context.telemetry.properties.isDesignTimeUp = 'true';

      ext.pinnedBundleVersion.set(projectPath, false);
      const hostfilepath: Uri = Uri.file(path.join(designTimeDirectory, hostFileName));
      const data = JSON.parse(fs.readFileSync(hostfilepath.fsPath, 'utf-8'));
      if (data.extensionBundle) {
        const versionWithoutSpaces = data.extensionBundle.version.replace(/\s+/g, '');
        const rangeWithoutSpaces = defaultVersionRange.replace(/\s+/g, '');
        if (data.extensionBundle.id === extensionBundleId && versionWithoutSpaces === rangeWithoutSpaces) {
          ext.currentBundleVersion.set(projectPath, ext.latestBundleVersion);
        } else if (data.extensionBundle.id === extensionBundleId && versionWithoutSpaces !== rangeWithoutSpaces) {
          ext.currentBundleVersion.set(projectPath, extractPinnedVersion(data.extensionBundle.version) ?? data.extensionBundle.version);
          ext.pinnedBundleVersion.set(projectPath, true);
        }
      }
      designTimeInst.startupError = undefined;
      context.telemetry.properties.didStartDesignTime = 'true';
      updateFuncIgnore(projectPath, [`${designTimeDirectoryName}/`]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      designTimeInst.startupError = errorMessage;
      if (os.platform() === 'linux') {
        // Cleanup failure is secondary to the original startup failure. The
        // cleanup operation records its own failure receipt.
        await stopTrackedDesignTimeProcess(projectPath)?.catch(() => undefined);
      } else {
        stopTrackedDesignTimeProcess(projectPath);
      }
      throw error;
    } finally {
      designTimeInst.isStarting = false;
    }
  } catch (error) {
    diagnosticFailure = { error };
    throw error;
  } finally {
    const currentInst = ext.designTimeInstances.get(projectPath);
    if (currentInst) {
      currentInst.startupPromise = undefined;
    }
    finishDesignTimeDiagnostic(receipt, () => ({ ...designTimeState(projectPath), settled: true }), diagnosticFailure);
  }
}

function extractPinnedVersion(input: string): string | null {
  // Regular expression to match the format "[1.24.58]"
  const regex = /^\[(\d{1}\.\d{1,2}\.\d{1,2})\]$/;
  const match = input.match(regex);

  if (match) {
    // Extracted time part is in the first capturing group
    return match[1];
  }
  return null;
}

async function validateRunningFuncProcess(projectPath: string, currRetry: number): Promise<void> {
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst) {
    return;
  }

  const cached = processValidationCache.get(projectPath);
  const now = Date.now();
  if (cached && now - cached.timestamp < VALIDATION_CACHE_TTL) {
    return;
  }

  const correctFuncProcess = await checkFuncProcessId(projectPath);

  if (correctFuncProcess) {
    processValidationCache.set(projectPath, { timestamp: now, isValid: true });
    return;
  }

  if (currRetry >= maxValidationRestarts) {
    ext.outputChannel.appendLog(
      localize(
        'invalidChildFuncPidSkipRestart',
        'Unable to validate the func child process PID for project at "{0}" after {1} restart attempt(s). Keeping the current design-time host running.',
        projectPath,
        currRetry
      )
    );
    return;
  }

  ext.outputChannel.appendLog(
    localize(
      'invalidChildFuncPid',
      'Invalid func child process PID set for project at "{0}". Restarting workflow design-time API.',
      projectPath
    )
  );
  processValidationCache.delete(projectPath);
  await stopDesignTimeApi(projectPath);
  await callWithTelemetryAndErrorHandling('validateRunningFuncProcess.startDesignTimeApi', async (actionContext: IActionContext) => {
    await startDesignTimeApi(actionContext, projectPath, currRetry + 1);
  });
}

async function checkFuncProcessId(projectPath: string): Promise<boolean> {
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  const processId = designTimeInst?.process?.pid;
  if (!designTimeInst?.process || !processId) {
    return false;
  }

  if (os.platform() === Platform.windows) {
    let { childFuncPid } = designTimeInst;
    let retries = 0;
    while (!childFuncPid && retries < 2) {
      await delay(500);
      const refreshedDesignTimeInst = ext.designTimeInstances.get(projectPath);
      if (!refreshedDesignTimeInst?.process) {
        return false;
      }
      childFuncPid = refreshedDesignTimeInst.childFuncPid;
      retries++;
    }

    if (!childFuncPid) {
      const children = await getChildProcesses(processId);
      const funcChildProcess = [...children].reverse().find((p) => /func(\.exe)?$/i.test(p.name || ''));
      if (funcChildProcess) {
        designTimeInst.childFuncPid = funcChildProcess.processId.toString();
        emitDesignTimeDiagnostic('design-time-child-pid-set', () => designTimeState(projectPath));
        return true;
      }
      return false;
    }

    const children = await getChildProcesses(processId);
    return children.some((p) => p.processId.toString() === childFuncPid && /func(\.exe)?$/i.test(p.name || ''));
  }

  designTimeInst.childFuncPid = normalizeTrackedChildProcessId(processId, designTimeInst.childFuncPid);
  emitDesignTimeDiagnostic('design-time-child-pid-set', () => designTimeState(projectPath));
  if (await isTrackedUnixFuncProcessRunning(designTimeInst.childFuncPid, processId)) {
    return true;
  }

  let retries = 0;
  while (retries < 3) {
    await delay(1000);
    const refreshedDesignTimeInst = ext.designTimeInstances.get(projectPath);
    const refreshedProcessId = refreshedDesignTimeInst?.process?.pid;
    if (!refreshedDesignTimeInst?.process || !refreshedProcessId) {
      return false;
    }

    refreshedDesignTimeInst.childFuncPid = normalizeTrackedChildProcessId(refreshedProcessId, refreshedDesignTimeInst.childFuncPid);
    emitDesignTimeDiagnostic('design-time-child-pid-set', () => designTimeState(projectPath));
    if (!refreshedDesignTimeInst.childFuncPid) {
      const foundChildProcessId = await findChildProcess(refreshedProcessId);
      refreshedDesignTimeInst.childFuncPid = normalizeTrackedChildProcessId(refreshedProcessId, foundChildProcessId);
      emitDesignTimeDiagnostic('design-time-child-pid-set', () => ({
        ...designTimeState(projectPath),
        targetPid: Number(foundChildProcessId),
      }));
    }

    if (await isTrackedUnixFuncProcessRunning(refreshedDesignTimeInst.childFuncPid, refreshedProcessId)) {
      return true;
    }

    retries++;
  }

  return false;
}

export async function getOrCreateDesignTimeDirectory(designTimeDirectory: string, projectRoot: string): Promise<Uri | undefined> {
  const directory: string = designTimeDirectory + path.sep;
  if (projectRoot.includes(designTimeDirectoryName)) {
    return Uri.file(projectRoot);
  }

  const designTimeDirectoryUri: Uri = Uri.file(path.join(projectRoot, directory));
  if (!fs.existsSync(designTimeDirectoryUri.fsPath)) {
    await workspace.fs.createDirectory(designTimeDirectoryUri);
  }
  return designTimeDirectoryUri;
}

export async function waitForDesignTimeStartUp(
  context: IActionContext,
  projectPath: string,
  url: string,
  setDesignTimeInst = false
): Promise<void> {
  const initialTime = Date.now();
  let isDesignTimeStarted = false;
  while (Date.now() - initialTime < designerApiLoadTimeout) {
    if (await isDesignTimeUp(url)) {
      isDesignTimeStarted = true;
      break;
    }
    await delay(1000);
  }
  if (isDesignTimeStarted) {
    if (!ext.designTimeInstances.has(projectPath)) {
      return Promise.reject(
        new Error(localize('missingDesignTimeInstance', 'Design-time startup state was lost for project "{0}".', projectPath))
      );
    }
    if (setDesignTimeInst) {
      const designTimeInst = ext.designTimeInstances.get(projectPath);
      const processId = designTimeInst?.process?.pid;
      if (!designTimeInst?.process || !processId) {
        return Promise.reject(
          new Error(localize('missingDesignTimeProcess', 'Design-time process was not found for project "{0}".', projectPath))
        );
      }
      const foundChildProcessId = await findChildProcess(processId);
      designTimeInst.childFuncPid = normalizeTrackedChildProcessId(processId, foundChildProcessId);
      emitDesignTimeDiagnostic('design-time-child-pid-set', () => ({
        ...designTimeState(projectPath),
        targetPid: Number(foundChildProcessId),
      }));
      designTimeInst.isStarting = false;
    }
    context.telemetry.measurements.waitForDesignTimeStartupDuration = (Date.now() - initialTime) / 1000;
    return Promise.resolve();
  }
  ext.outputChannel.appendLog(
    localize(
      'designTimeStartupTimeout',
      'Timed out waiting for design-time startup for project "{0}" at "{1}" after {2} ms.',
      projectPath,
      url,
      designerApiLoadTimeout
    )
  );
  return Promise.reject(
    new Error(localize('designTimeStartupTimeoutError', 'Timed out waiting for design-time startup for project "{0}".', projectPath))
  );
}

export async function isDesignTimeUp(url: string): Promise<boolean> {
  try {
    await axios.get(url);
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

export function startDesignTimeProcess(
  outputChannel: IAzExtOutputChannel | undefined,
  workingDirectory: string | undefined,
  command: string,
  ...args: string[]
): void {
  let cmdOutput = '';
  let cmdOutputIncludingStderr = '';
  const formattedArgs: string = args.join(' ');

  const options: cp.SpawnOptions = {
    cwd: workingDirectory || os.tmpdir(),
    shell: true,
  };
  if (os.platform() === 'linux') {
    // setsid gives this launch its own session/process group, never VS Code's.
    options.detached = true;
  }

  const receipt = startDesignTimeDiagnostic('design-time-spawn', () => ({
    ...designTimeState(workingDirectory ? path.dirname(workingDirectory) : ''),
    workingDirectory: options.cwd,
    command,
    argvCount: args.length,
    shell: true,
  }));
  let designChildProcess: cp.ChildProcess;
  try {
    designChildProcess = cp.spawn(command, args, options);
    observeSpawnIdentity(designChildProcess, workingDirectory ? path.dirname(workingDirectory) : '', workingDirectory || os.tmpdir());
    const pid = designChildProcess.pid;
    if (options.detached && pid !== undefined && Number.isSafeInteger(pid) && pid > 1 && pid !== process.pid) {
      ownedLinuxProcessGroups.set(designChildProcess, pid);
    }
    finishDesignTimeDiagnostic(receipt, () => ({
      ...designTimeState(workingDirectory ? path.dirname(workingDirectory) : ''),
      pid: designChildProcess.pid,
    }));
  } catch (error) {
    finishDesignTimeDiagnostic(receipt, () => ({}), { error });
    throw error;
  }

  if (outputChannel) {
    outputChannel.appendLog(
      localize('runningCommand', 'Running command: "{0} {1}" with pid: "{2}"...', command, formattedArgs, designChildProcess.pid)
    );
  }

  const projectPath = workingDirectory ? path.dirname(workingDirectory) : '';
  const appendStdout = outputChannel ? createDesignTimeHostOutputAppender(outputChannel) : undefined;
  const appendStderr = outputChannel ? createDesignTimeHostOutputAppender(outputChannel) : undefined;
  const stdout = designChildProcess.stdout;
  stdout?.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutput = cmdOutput.concat(data);
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    const languageWorkerText = 'Failed to start a new language worker for runtime: node';
    if (appendStdout) {
      appendStdout.append(data);
    }
    if (data.toLowerCase().includes(languageWorkerText.toLowerCase())) {
      ext.outputChannel.appendLog(
        'Language worker issue found when launching func most likely due to a conflicting port. Restarting design-time process.'
      );

      // TODO(aeldridge): Double check if this is correct error handling for failed language worker start.
      stopDesignTimeApi(projectPath)
        .catch((error) => {
          ext.outputChannel.appendLog(`Failed to stop design-time process before restart. Error: ${error}`);
        })
        .finally(() => {
          callWithTelemetryAndErrorHandling(
            'designTimeError.languageWorkerFailed.startDesignTimeApi',
            async (actionContext: IActionContext) => {
              await startDesignTimeApi(actionContext, projectPath);
            }
          );
        });
    }
  });
  stdout?.on('end', () => appendStdout?.flush());
  stdout?.on('close', () => appendStdout?.flush());

  const stderr = designChildProcess.stderr;
  stderr?.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    const portUnavailableText = 'is unavailable. Close the process using that port, or specify another port using';
    if (appendStderr) {
      appendStderr.append(data);
    }
    if (data.toLowerCase().includes(portUnavailableText.toLowerCase())) {
      ext.outputChannel.appendLog('Conflicting port found when launching func. Restarting design-time process.');

      stopDesignTimeApi(projectPath)
        .catch((error) => {
          ext.outputChannel.appendLog(`Failed to stop design-time process before restart. Error: ${error}`);
        })
        .finally(() => {
          callWithTelemetryAndErrorHandling('designTimeError.portUnavailable.startDesignTimeApi', async (actionContext: IActionContext) => {
            await startDesignTimeApi(actionContext, projectPath);
          });
        });
    }
  });
  stderr?.on('end', () => appendStderr?.flush());
  stderr?.on('close', () => appendStderr?.flush());

  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (designTimeInst) {
    designTimeInst.process = designChildProcess;
  }
  emitDesignTimeDiagnostic('design-time-process-map-set', () => ({ ...designTimeState(projectPath), skipped: !designTimeInst }));
}

export async function stopAllDesignTimeApis(): Promise<void> {
  const receipt = startDesignTimeDiagnostic('design-time-stop-all', () => ({
    mapCount: ext.designTimeInstances.size,
    roots: [...ext.designTimeInstances.keys()].slice(0, 12).map((projectPath) => designTimeState(projectPath)),
  }));
  const results = await Promise.allSettled([...ext.designTimeInstances.keys()].map((projectPath) => stopDesignTimeApi(projectPath)));
  finishDesignTimeDiagnostic(receipt, () => ({
    mapCount: ext.designTimeInstances.size,
    fulfilledCount: results.filter((result) => result.status === 'fulfilled').length,
    rejectedCount: results.filter((result) => result.status === 'rejected').length,
  }));
}

export async function stopDesignTimeApi(projectPath: string): Promise<void> {
  ext.outputChannel.appendLog(`Stopping Design Time Api for project: ${projectPath}`);
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst) {
    emitDesignTimeDiagnostic('design-time-stop', () => ({ ...designTimeState(projectPath), skipped: true }));
    return;
  }

  const { process: proc, childFuncPid } = designTimeInst;
  emitDesignTimeDiagnostic('design-time-stop', () => ({ ...designTimeState(projectPath), skipped: !proc }));
  ext.designTimeInstances.delete(projectPath);
  emitDesignTimeDiagnostic('design-time-map-delete', () => designTimeState(projectPath, designTimeInst));
  releaseReservedPort(designTimeInst.port);
  if (proc === null || proc === undefined) {
    return;
  }

  if (os.platform() === Platform.windows) {
    const killPromises: Promise<void>[] = [];
    if (childFuncPid) {
      killPromises.push(execTaskkill(childFuncPid, projectPath));
    }
    killPromises.push(execTaskkill(proc.pid, projectPath));
    await Promise.allSettled(killPromises);
  } else if (os.platform() === 'linux') {
    await killOwnedLinuxProcessGroup(proc, projectPath);
  } else {
    killTrackedUnixProcesses(proc, childFuncPid, projectPath);
  }
}

/**
 * Runs taskkill and waits for it to complete so file locks are released
 * before subsequent build steps.
 */
function execTaskkill(pid: number | string | undefined, projectPath: string): Promise<void> {
  const receipt = startDesignTimeDiagnostic('design-time-taskkill', () => ({
    ...designTimeState(projectPath),
    targetPid: pid === undefined ? undefined : Number(pid),
    skipped: pid === undefined,
  }));
  if (pid === undefined) {
    finishDesignTimeDiagnostic(receipt, () => ({ skipped: true }));
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    try {
      const kill = cp.exec(`taskkill /pid ${pid} /t /f`, (error) => {
        finishDesignTimeDiagnostic(receipt, () => ({ targetPid: Number(pid), settled: true }), error ? { error } : undefined);
        resolve();
      });
      emitDesignTimeDiagnostic('design-time-taskkill', () => ({ targetPid: Number(pid), pid: kill.pid, settled: false }));
    } catch (error) {
      finishDesignTimeDiagnostic(receipt, () => ({ targetPid: Number(pid) }), { error });
      throw error;
    }
  });
}

// Startup-failure cleanup is deliberately fire-and-forget, just as before.
// The end receipt means exec returned, not that taskkill completed.
function execUnawaitedTaskkill(pid: number | string | undefined, projectPath: string): void {
  const receipt = startDesignTimeDiagnostic('design-time-taskkill', () => ({
    ...designTimeState(projectPath),
    targetPid: pid === undefined ? undefined : Number(pid),
    settled: false,
  }));
  try {
    const kill = cp.exec(`taskkill /pid ${pid} /t /f`);
    finishDesignTimeDiagnostic(receipt, () => ({ targetPid: pid === undefined ? undefined : Number(pid), pid: kill.pid, settled: false }));
  } catch (error) {
    finishDesignTimeDiagnostic(receipt, () => ({ targetPid: pid === undefined ? undefined : Number(pid) }), { error });
    throw error;
  }
}

export function scheduleStartAllDesignTimeApis(): void {
  ext.outputChannel.appendLog(
    localize('scheduleAllDesignTimeApis', 'Scheduling background design-time startup for the current workspace.')
  );
  startAllDesignTimeApis().catch((error) => {
    ext.outputChannel.appendLog(
      localize(
        'scheduleAllDesignTimeApisFailed',
        'Background design-time startup encountered an error. Error: {0}',
        error instanceof Error ? error.message : String(error)
      )
    );
  });
}

/**
 * Starts the design-time API for all Logic Apps in the workspace.
 * @returns {Promise<void>} A promise that resolves when each design-time API is in the starting state.
 */
export async function startAllDesignTimeApis(): Promise<void> {
  const projectPaths = await getWorkspaceLogicAppRoots();
  if (projectPaths.length === 0) {
    ext.outputChannel.appendLog(
      localize('noLogicAppsFound', 'No Logic App projects found in the current workspace, skipping design-time startup.')
    );
    return;
  }

  ext.outputChannel.appendLog(
    localize(
      'startingAllDesignTimeApis',
      'Starting design-time processes for {0} Logic App project(s) in the current workspace.',
      projectPaths.length
    )
  );

  await Promise.all(
    projectPaths.map(async (projectPath) => {
      await callWithTelemetryAndErrorHandling('startAllDesignTimeApis.startDesignTimeApi', async (actionContext: IActionContext) => {
        await startDesignTimeApi(actionContext, projectPath);
      });
    })
  );
}

/**
 * Creates a JSON file in the specified directory with the given file name and content.
 * If the file already exists, it will not be overwritten.
 * @param {Uri} directory - The directory where the file will be created.
 * @param {string} fileName - The name of the file to be created.
 * @param {hostFileContent | ILocalSettingsJson}fileContent - The content of the file to be created.
 * @returns A Promise that resolves when the file is created successfully.
 */
export async function createJsonFile(
  directory: Uri,
  fileName: string,
  fileContent: typeof hostFileContent | ILocalSettingsJson
): Promise<void> {
  const filePath: Uri = Uri.file(path.join(directory.fsPath, fileName));

  // Create file
  if (!fs.existsSync(filePath.fsPath)) {
    await writeFormattedJson(filePath.fsPath, fileContent);
  }
}
