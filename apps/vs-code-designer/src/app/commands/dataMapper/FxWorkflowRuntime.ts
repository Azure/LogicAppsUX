import DataMapperExt from './DataMapperExt';
import {
  backendRuntimeBaseUrl,
  backendRuntimeTimeout,
  hostFileContent,
  hostFileName,
  settingsFileContent,
  settingsFileName,
  workflowDesignTimeDir,
  workflowMgmtApi,
} from './extensionConfig';
import * as cp from 'child_process';
import { promises as fs, existsSync as fileExists } from 'fs';
import merge from 'lodash.merge';
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

  if (!DataMapperExt.backendRuntimePort) {
    DataMapperExt.backendRuntimePort = await portfinder.getPortPromise();
  }

  // Note: Must append operationGroups as it's a valid endpoint to ping
  const url = `${backendRuntimeBaseUrl}${DataMapperExt.backendRuntimePort}${workflowMgmtApi}operationGroups`;

  await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    progress.report({ message: 'Starting backend runtime, this may take a few seconds...' });

    if (await isBackendRuntimeUp(url)) {
      DataMapperExt.log('Backend runtime is already running');
      return;
    }

    const modifiedSettingsFileContent = { ...settingsFileContent };
    modifiedSettingsFileContent.Values.ProjectDirectoryPath = projectPath;

    try {
      if (runtimeWorkingDir) {
        await createDesignTimeDirectory(runtimeWorkingDir);
        await createJsonFile(runtimeWorkingDir, hostFileName, hostFileContent);
        await createJsonFile(runtimeWorkingDir, settingsFileName, modifiedSettingsFileContent);

        startBackendRuntimeProcess(runtimeWorkingDir, 'func', 'host', 'start', '--port', `${DataMapperExt.backendRuntimePort}`);

        await waitForBackendRuntimeStartUp(url, new Date().getTime());
      } else {
        throw new Error("Workflow folder doesn't exist");
      }
    } catch (error) {
      window.showErrorMessage('Backend runtime could not be started');

      const errMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      DataMapperExt.log(`Backend runtime failed to start: ${errMsg}`);
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

    await fs.writeFile(filePath.fsPath, JSON.stringify(merge(fileJson, fileContent), null, 2), 'utf-8');
  }
}

async function waitForBackendRuntimeStartUp(url: string, initialTime: number): Promise<void> {
  while (!(await isBackendRuntimeUp(url)) && new Date().getTime() - initialTime < backendRuntimeTimeout) {
    await delay(1000); // Re-poll every X ms
  }

  if (await isBackendRuntimeUp(url)) {
    return Promise.resolve();
  } else {
    return Promise.reject();
  }
}

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

  DataMapperExt.log(`Running command: "${command} ${formattedArgs}"...`);
  DataMapperExt.backendRuntimeChildProcess = cp.spawn(command, args, options);

  DataMapperExt.backendRuntimeChildProcess.stdout?.on('data', (data: string | Buffer) => {
    DataMapperExt.outputChannel.append(data.toString());
  });

  DataMapperExt.backendRuntimeChildProcess.stderr?.on('data', (data: string | Buffer) => {
    DataMapperExt.outputChannel.append(data.toString());
  });
}

// Note: Per node, child processes may not be killed - if this is an issue in the future, a workaround is needed
// HOWEVER - killing the parent process (the VS Code instance?) kills the child process for sure
export function stopBackendRuntime(): void {
  if (DataMapperExt.backendRuntimeChildProcess === null || DataMapperExt.backendRuntimeChildProcess === undefined) {
    return;
  }

  if (os.platform() === 'win32') {
    cp.exec('taskkill /pid ' + `${DataMapperExt.backendRuntimeChildProcess.pid}` + ' /T /F');
  } else {
    DataMapperExt.backendRuntimeChildProcess.kill();
  }
  DataMapperExt.backendRuntimeChildProcess = undefined;
}
