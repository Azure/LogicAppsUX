import { designTimeDirectoryName, designerStartApi, hostFileContent, hostFileName, localSettingsFileName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getOrCreateDesignTimeDirectory, isDesignTimeUp } from '../../utils/codeless/startDesignTimeApi';
import { getFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { backendRuntimeBaseUrl, dataMapLoadTimeout, settingsFileContent } from './extensionConfig';
import { delay } from '@azure/ms-rest-js';
import { extend } from '@microsoft/utils-logic-apps';
import * as cp from 'child_process';
import { promises as fs, existsSync as fileExists } from 'fs';
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
  const designTimeDirectory: Uri | undefined = await getOrCreateDesignTimeDirectory(designTimeDirectoryName, projectPath);

  if (!ext.designTimePort) {
    ext.designTimePort = await portfinder.getPortPromise();
  }

  // Note: Must append operationGroups as it's a valid endpoint to ping
  const url = `${backendRuntimeBaseUrl}${ext.designTimePort}${designerStartApi}`;

  await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    progress.report({ message: 'Starting backend runtime, this may take a few seconds...' });

    if (await isDesignTimeUp(url)) {
      ext.log(localize('RuntimeAlreadyRunning', 'Backend runtime is already running'));
      return;
    }

    const modifiedSettingsFileContent = { ...settingsFileContent };
    modifiedSettingsFileContent.Values.ProjectDirectoryPath = projectPath;

    try {
      if (designTimeDirectory) {
        await createJsonFile(designTimeDirectory.fsPath, hostFileName, hostFileContent);
        await createJsonFile(designTimeDirectory.fsPath, localSettingsFileName, modifiedSettingsFileContent);

        startBackendRuntimeProcess(designTimeDirectory.fsPath, getFunctionsCommand(), 'host', 'start', '--port', `${ext.designTimePort}`);

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
  while (!(await isDesignTimeUp(url)) && new Date().getTime() - initialTime < dataMapLoadTimeout) {
    await delay(1000); // Re-poll every X ms
  }

  if (await isDesignTimeUp(url)) {
    return Promise.resolve();
  } else {
    return Promise.reject();
  }
}

function startBackendRuntimeProcess(workingDirectory: string | undefined, command: string, ...args: string[]): void {
  const formattedArgs: string = args.join(' ');
  let cmdOutput = '';
  let cmdOutputIncludingStderr = '';
  const options: cp.SpawnOptions = {
    cwd: workingDirectory || os.tmpdir(),
    shell: true,
  };

  ext.designChildProcess = cp.spawn(command, args, options);
  ext.log(localize('runningCommand', 'Running command: "{0} {1}" with pid: "{2}"...', command, formattedArgs, ext.designChildProcess.pid));

  ext.designChildProcess.stdout.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutput = cmdOutput.concat(data);
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    ext.outputChannel.append(data.toString());
  });

  ext.designChildProcess.stderr.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    ext.outputChannel.append(data.toString());
  });
}
