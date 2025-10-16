import * as cp from 'child_process';
import * as path from 'path';
import { ext } from '../../../extensionVariables';

interface ProcessInfo {
  processId: number;
  name: string;
  parentProcessId: number;
}

async function runPowerShellScript(scriptPath: string, ...args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Escape arguments for PowerShell
    const escapedArgs = args.map((arg) => `"${arg.replace(/"/g, '`"')}"`).join(' ');
    const command = `powershell.exe -NoProfile -NoLogo -ExecutionPolicy Bypass -File "${scriptPath}" ${escapedArgs}`;

    ext.outputChannel.appendLog(`Executing PowerShell script: ${command}`);

    const child = cp.exec(
      command,
      {
        timeout: 10000,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024, // 1MB buffer
      },
      (error, stdout, stderr) => {
        if (error) {
          ext.outputChannel.appendLog(`PowerShell script error: ${error.message}`);
          if (stderr) {
            ext.outputChannel.appendLog(`PowerShell stderr: ${stderr}`);
          }
          reject(error);
          return;
        }

        resolve(stdout.trim());
      }
    );

    // Backup timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
        reject(new Error('PowerShell script execution timed out'));
      }
    }, 12000);
  });
}

export async function getChildProcessesWithScript(parentProcessId: number): Promise<ProcessInfo[]> {
  try {
    const scriptPath = path.join(__dirname, 'assets', 'scripts', 'get-child-processes.ps1');
    const output = await runPowerShellScript(scriptPath, parentProcessId.toString());

    if (!output || output === '[]') {
      return [];
    }

    const rawData = JSON.parse(output);
    const dataArray = Array.isArray(rawData) ? rawData : [rawData];

    return dataArray.map((item: any) => ({
      processId: item.ProcessId,
      name: item.Name,
      parentProcessId: item.ParentProcessId,
    }));
  } catch (error) {
    throw new Error(`Failed to execute Powershell script to get the func child process: ${error.message}`);
  }
}
