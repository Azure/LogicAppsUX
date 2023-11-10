import { designerStartApi, hostFileContent, hostFileName, localSettingsFileName, workflowDesignTimeDir } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { backendRuntimeBaseUrl, dataMapLoadTimeout, settingsFileContent } from './extensionConfig';
import { extend } from '@microsoft/utils-logic-apps';
import * as cp from 'child_process';
import { promises as fs, existsSync as fileExists } from 'fs';
import fetch from 'node-fetch';
import * as os from 'os';
import * as path from 'path';
import * as portfinder from 'portfinder';
import { ProgressLocation, Uri, window } from 'vscode';

// NOTE: LA Standard ext does this in workflowFolder/workflow-designtime
// For now at least, DM is just going to do everything in workflowFolder

// NOTE (9/12/2022): It's expected that user will already have the Logic Apps
// (Standard) VS Code extension and that it will already automatically install
// Azure Functions Core Tools (so no need to repeat here)

export async function startBackendRuntime(projectPath: string): Promise<void> {
  const runtimeWorkingDir = path.join(projectPath, workflowDesignTimeDir);

  if (!ext.designTimePort) {
    ext.designTimePort = await portfinder.getPortPromise();
  }

  // Note: Must append operationGroups as it's a valid endpoint to ping
  const url = `${backendRuntimeBaseUrl}${ext.designTimePort}${designerStartApi}`;

  await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    progress.report({ message: 'Starting backend runtime, this may take a few seconds...' });

    if (await isBackendRuntimeUp(url)) {
      ext.log(localize('RuntimeAlreadyRunning', 'Backend runtime is already running'));
      return;
    }

    const modifiedSettingsFileContent = { ...settingsFileContent };
    modifiedSettingsFileContent.Values.ProjectDirectoryPath = projectPath;

    try {
      if (runtimeWorkingDir) {
        await createDesignTimeDirectory(runtimeWorkingDir);
        await createJsonFile(runtimeWorkingDir, hostFileName, hostFileContent);
        await createJsonFile(runtimeWorkingDir, localSettingsFileName, modifiedSettingsFileContent);

        startBackendRuntimeProcess(runtimeWorkingDir, getFunctionsCommand(), 'host', 'start', '--port', `${ext.designTimePort}`);

        await waitForBackendRuntimeStartUp(url, new Date().getTime());
      } else {
        throw new Error("Workflow folder doesn't exist");
      }
    } catch (error) {
      window.showErrorMessage('Backend runtime could not be started');

      const errMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      ext.log(localize('RuntimeFailedToStart', `Backend runtime failed to start: "{0}"`, errMsg));
    }
  });
}

async function createDesignTimeDirectory(path: string): Promise<void> {
  // Check if directory exists at path, and create it if it doesn't
  if (!fileExists(path)) {
    // Create directory
    await fs.mkdir(path, { recursive: true });
  }
}

async function createJsonFile(
  directoryPath: string,
  fileName: string,
  fileContent: typeof hostFileContent | typeof settingsFileContent
): Promise<void> {
  const filePath: Uri = Uri.file(path.join(directoryPath, fileName));

  // Create file
  if (!fileExists(filePath.fsPath)) {
    await fs.writeFile(filePath.fsPath, JSON.stringify(fileContent, null, 2), 'utf-8');
  }
  // Else merge new settings into existing file
  else {
    const fileJson = JSON.parse(await fs.readFile(filePath.fsPath, 'utf-8'));

    await fs.writeFile(filePath.fsPath, JSON.stringify(extend({}, fileJson, fileContent), null, 2), 'utf-8');
  }
}

async function waitForBackendRuntimeStartUp(url: string, initialTime: number): Promise<void> {
  while (!(await isBackendRuntimeUp(url)) && new Date().getTime() - initialTime < dataMapLoadTimeout) {
    await delay(1000); // Re-poll every X ms
  }

  if (await isBackendRuntimeUp(url)) {
    return Promise.resolve();
  } else {
    return Promise.reject();
  }
}

/// there might be a commond

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isBackendRuntimeUp(url: string): Promise<boolean> {
  try {
    await fetch(url);
    return Promise.resolve(true);
  } catch (ex) {
    return Promise.resolve(false);
  }
}

function startBackendRuntimeProcess(workingDirectory: string | undefined, command: string, ...args: string[]): void {
  const formattedArgs: string = args.join(' ');
  const options: cp.SpawnOptions = {
    cwd: workingDirectory || os.tmpdir(),
    shell: true,
  };

  ext.log(localize('RunningCommand', `Running command: ""{0}" "{1}""...`, command, formattedArgs));
  ext.designChildProcess = cp.spawn(command, args, options);

  ext.designChildProcess.stdout?.on('data', (data: string | Buffer) => {
    ext.outputChannel.append(data.toString());
  });

  ext.designChildProcess.stderr?.on('data', (data: string | Buffer) => {
    ext.outputChannel.append(data.toString());
  });
}

// Note: Per node, child processes may not be killed - if this is an issue in the future, a workaround is needed
// HOWEVER - killing the parent process (the VS Code instance?) kills the child process for sure
export function stopDataMapperBackend(): void {
  if (ext.designChildProcess === null || ext.designChildProcess === undefined) {
    return;
  }

  if (os.platform() === 'win32') {
    cp.exec('taskkill /pid ' + `${ext.designChildProcess.pid}` + ' /T /F');
  } else {
    ext.designChildProcess.kill();
  }
  ext.designChildProcess = undefined;
}

/// there might be a commnd code
