import DataMapperExt from './DataMapperExt';
import {
  backendRuntimeBaseUrl,
  backendRuntimeTimeout,
  hostFileContent,
  hostFileName,
  settingsFileContent,
  settingsFileName,
  workflowMgmtApi,
} from './extensionConfig';
import * as cp from 'child_process';
import { promises as fs, existsSync as fileExists } from 'fs';
import fetch from 'node-fetch';
import * as os from 'os';
import * as path from 'path';
import { ProgressLocation, Uri, window } from 'vscode';

// NOTE: LA Standard ext does this in workflowFolder/workflow-designtime
// For now at least, DM is just going to do everything in workflowFolder

export async function startBackendRuntime(projectPath: string): Promise<void> {
  // Note: Must append operationGroups as it's a valid endpoint to ping
  const url = `${backendRuntimeBaseUrl}${workflowMgmtApi}operationGroups`;

  window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    progress.report({ message: 'Starting backend runtime, this may take a few seconds...' });

    if (await isBackendRuntimeUp(url)) {
      DataMapperExt.log('Backend runtime is already running');
      return;
    }

    try {
      if (projectPath) {
        await createJsonFile(projectPath, hostFileName, hostFileContent);
        await createJsonFile(projectPath, settingsFileName, settingsFileContent);

        startBackendRuntimeProcess(projectPath, 'func', 'host', 'start');

        await waitForBackendRuntimeStartUp(url, new Date().getTime());
      } else {
        throw new Error("Workflow folder doesn't exist");
      }
    } catch (ex) {
      DataMapperExt.log(`Backend runtime failed to start: ${ex}`);
      window.showErrorMessage('Backend runtime could not be started');
    }
  });
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

    await fs.writeFile(filePath.fsPath, JSON.stringify({ ...fileJson, ...fileContent }, null, 2), 'utf-8');
  }
}

async function waitForBackendRuntimeStartUp(url: string, initialTime: number): Promise<void> {
  while (!(await isBackendRuntimeUp(url)) && new Date().getTime() - initialTime < backendRuntimeTimeout) {
    await delay(2000);
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
    DataMapperExt.log(`Failed to reach backend runtime: ${ex}`);
    return Promise.resolve(false);
  }
}

function startBackendRuntimeProcess(workingDirectory: string | undefined, command: string, ...args: string[]): void {
  const formattedArgs: string = args.join(' ');
  const options: cp.SpawnOptions = {
    cwd: workingDirectory || os.tmpdir(),
    shell: true,
  };
  DataMapperExt.backendRuntimeChildProcess = cp.spawn(command, args, options);

  DataMapperExt.log(`Running command: "${command} ${formattedArgs}"...`);

  DataMapperExt.backendRuntimeChildProcess.stdout.on('data', (data: string | Buffer) => {
    DataMapperExt.outputChannel.append(data.toString());
  });

  DataMapperExt.backendRuntimeChildProcess.stderr.on('data', (data: string | Buffer) => {
    DataMapperExt.outputChannel.append(data.toString());
  });
}

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
