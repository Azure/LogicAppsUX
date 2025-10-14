/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { callWithTelemetryAndErrorHandling, type IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { runWithDurationTelemetry } from './telemetry';
import { activateAzurite } from './azurite/activateAzurite';
import { verifyLocalConnectionKeys } from './appSettings/connectionKeys';
import { autoStartAzuriteSetting, designerApiLoadTimeout, designerStartApi, Platform, verifyConnectionKeysSetting } from '../../constants';
import { getContainingWorkspace } from './workspace';
import { preDebugValidate } from '../debug/validatePreDebug';
import { ext } from '../../extensionVariables';
import * as vscode from 'vscode';
import * as portfinder from 'portfinder';
import * as os from 'os';
import * as cp from 'child_process';
import find_process from 'find-process';
import axios from 'axios';
import { localize } from '../../localize';
import { delay } from './delay';
import { findChildProcess } from '../commands/pickFuncProcess';
import { getFunctionsCommand } from './funcCoreTools/funcVersion';
import { getChildProcessesWithScript } from './findChildProcess/findChildProcess';

export async function startRuntimeApi(projectPath: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.startRuntimeProcess', async (context: IActionContext) => {
    await callWithTelemetryAndErrorHandling(autoStartAzuriteSetting, async (actionContext: IActionContext) => {
      await runWithDurationTelemetry(actionContext, autoStartAzuriteSetting, async () => {
        await activateAzurite(context, projectPath);
      });
    });

    await callWithTelemetryAndErrorHandling(verifyConnectionKeysSetting, async (actionContext: IActionContext) => {
      await runWithDurationTelemetry(actionContext, verifyConnectionKeysSetting, async () => {
        await verifyLocalConnectionKeys(context, projectPath);
      });
    });

    const shouldContinue: boolean = await preDebugValidate(context, projectPath);
    if (!shouldContinue) {
      throw new UserCancelledError('preDebugValidate');
    }

    const workspaceFolder = getContainingWorkspace(projectPath);
    if (!workspaceFolder) {
      throw new Error(localize('noWorkspace', 'Unable to find the workspace containing the project path "{0}".', projectPath));
    }

    let isNewRuntimeProcess = false;
    if (!ext.runtimeInstances.has(projectPath)) {
      ext.runtimeInstances.set(projectPath, {
        port: await portfinder.getPortPromise(),
        isStarting: true,
      });
      isNewRuntimeProcess = true;
    }

    const runtimeInst = ext.runtimeInstances.get(projectPath);
    if (runtimeInst.isStarting && !isNewRuntimeProcess) {
      await waitForRuntimeStartUp(context, projectPath, runtimeInst.port);
      context.telemetry.properties.isRuntimeUp = 'true';
      await validateRunningFuncProcess(projectPath);
      return;
    }

    if (!isNewRuntimeProcess && (await isRuntimeUp(runtimeInst.port))) {
      context.telemetry.properties.isRuntimeUp = 'true';
      await validateRunningFuncProcess(projectPath);
      return;
    }

    try {
      ext.outputChannel.appendLog(localize('startingRuntime', 'Starting Runtime API for project: {0}', projectPath));
      startRuntimeProcess(projectPath, getFunctionsCommand(), 'host', 'start', `--port ${runtimeInst.port}`);
      await waitForRuntimeStartUp(context, projectPath, runtimeInst.port, true);
      context.telemetry.properties.isRuntimeUp = 'true';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      const viewOutput: vscode.MessageItem = { title: localize('viewOutput', 'View output') };
      const message = localize('DesignTimeError', "Can't start the background design-time process.") + errorMessage;
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.errorMessage = errorMessage;

      vscode.window.showErrorMessage(message, viewOutput).then(async (result) => {
        if (result === viewOutput) {
          ext.outputChannel.show();
        }
      });
    }
  });
}

async function waitForRuntimeStartUp(context: IActionContext, projectPath: string, port: number, setRuntimeInst = false): Promise<void> {
  const initialTime = Date.now();
  let isRuntimeStarted = false;
  while (Date.now() - initialTime < designerApiLoadTimeout) {
    if (await isRuntimeUp(port)) {
      isRuntimeStarted = true;
      break;
    }
    await delay(1000);
  }
  if (isRuntimeStarted) {
    if (!ext.runtimeInstances.has(projectPath)) {
      return Promise.reject();
    }
    if (setRuntimeInst) {
      const runtimeInst = ext.runtimeInstances.get(projectPath);
      runtimeInst.childFuncPid = await findChildProcess(runtimeInst.process.pid);
      runtimeInst.isStarting = false;
    }
    context.telemetry.measurements.waitForDesignTimeStartupDuration = (Date.now() - initialTime) / 1000;
    return Promise.resolve();
  }
  return Promise.reject();
}

async function isRuntimeUp(port: number): Promise<boolean> {
  try {
    const url = `http://localhost:${port}${designerStartApi}`;
    await axios.get(url);
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

async function validateRunningFuncProcess(projectPath: string): Promise<void> {
  const correctFuncProcess = await checkFuncProcessId(projectPath);
  if (!correctFuncProcess) {
    ext.outputChannel.appendLog(
      localize(
        'invalidChildFuncPid',
        'Invalid func child process PID set for project at "{0}". Restarting workflow runtime API.',
        projectPath
      )
    );
    stopRuntimeApi(projectPath);
    await startRuntimeApi(projectPath);
  }
}

async function checkFuncProcessId(projectPath: string): Promise<boolean> {
  let correctId = false;
  let { process, childFuncPid } = ext.runtimeInstances.get(projectPath);
  let retries = 0;
  while (!childFuncPid && retries < 3) {
    await delay(1000);
    ({ process, childFuncPid } = ext.runtimeInstances.get(projectPath));
    retries++;
  }
  if (!childFuncPid) {
    return false;
  }

  if (os.platform() === Platform.windows) {
    const children = await getChildProcessesWithScript(process.pid);
    correctId = children.some((p) => p.processId.toString() === childFuncPid && p.name === 'func.exe');
  } else {
    await find_process('pid', process.pid).then((list) => {
      if (list.length > 0) {
        if (list[0].name === 'func' || list[0].name.includes('func')) {
          correctId = true;
        }
      }
    });
  }
  return correctId;
}

export function stopRuntimeApi(projectPath: string): void {
  ext.outputChannel.appendLog(`Stopping Runtime API for project: ${projectPath}`);
  const { process, childFuncPid } = ext.runtimeInstances.get(projectPath);
  ext.runtimeInstances.delete(projectPath);
  if (process === null || process === undefined) {
    return;
  }

  if (os.platform() === Platform.windows) {
    cp.exec(`taskkill /pid ${childFuncPid} /t /f`);
    cp.exec(`taskkill /pid ${process.pid} /t /f`);
  } else {
    cp.spawn('kill', ['-9'].concat(`${process.pid}`));
  }
}

export function startRuntimeProcess(projectPath: string, command: string, ...args: string[]): void {
  let cmdOutput = '';
  let cmdOutputIncludingStderr = '';
  const formattedArgs: string = args.join(' ');

  const options: cp.SpawnOptions = {
    cwd: projectPath || os.tmpdir(),
    shell: true,
  };

  const runtimeChildProcess = cp.spawn(command, args, options);

  if (ext.outputChannel) {
    ext.outputChannel.appendLog(
      localize('runningCommand', 'Running command: "{0} {1}" with pid: "{2}"...', command, formattedArgs, runtimeChildProcess.pid)
    );
  }

  runtimeChildProcess.stdout.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutput = cmdOutput.concat(data);
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    const languageWorkerText = 'Failed to start a new language worker for runtime: dotnet';
    ext.outputChannel.append(data);
    if (data.toLowerCase().includes(languageWorkerText.toLowerCase())) {
      ext.outputChannel.appendLog(
        'Language worker issue found when launching func most likely due to a conflicting port. Restarting runtime process.'
      );

      stopRuntimeApi(projectPath);
      startRuntimeApi(projectPath);
    }
  });

  runtimeChildProcess.stderr.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    const portUnavailableText = 'is unavailable. Close the process using that port, or specify another port using';
    ext.outputChannel.append(data);
    if (data.toLowerCase().includes(portUnavailableText.toLowerCase())) {
      ext.outputChannel.appendLog('Conflicting port found when launching func. Restarting runtime process.');

      stopRuntimeApi(projectPath);
      startRuntimeApi(projectPath);
    }
  });

  ext.runtimeInstances.get(projectPath).process = runtimeChildProcess;
}
