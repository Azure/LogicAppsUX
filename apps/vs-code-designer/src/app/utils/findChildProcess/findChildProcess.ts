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
    const command = `powershell.exe -NoProfile -NoLogo -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" ${escapedArgs}`;

    ext.outputChannel.appendLog(`Executing PowerShell script: ${command}`);

    const child = cp.exec(
      command,
      {
        timeout: 8000, // Slightly increased for reliability
        encoding: 'utf8',
        maxBuffer: 512 * 1024, // 512KB is sufficient for process lists
        windowsHide: true, // Don't show console window
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

        ext.outputChannel.appendLog(`PowerShell script output: ${stdout.trim()}`);
        resolve(stdout.trim());
      }
    );

    // Backup timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
        reject(new Error('PowerShell script execution timed out'));
      }
    }, 10000);
  });
}

export async function getChildProcessesWithScript(parentProcessId: number): Promise<ProcessInfo[]> {
  try {
    const scriptPath = path.join(__dirname, 'assets', 'scripts', 'get-child-processes.ps1');
    ext.outputChannel.appendLog(`Getting child processes for PID ${parentProcessId}`);
    const output = await runPowerShellScript(scriptPath, parentProcessId.toString());

    if (!output || output === '[]') {
      ext.outputChannel.appendLog(`No child processes found for PID ${parentProcessId}`);
      return [];
    }

    const rawData = JSON.parse(output);
    const dataArray = Array.isArray(rawData) ? rawData : [rawData];

    const result = dataArray.map((item: any) => ({
      processId: item.ProcessId,
      name: item.Name,
      parentProcessId: item.ParentProcessId,
    }));

    ext.outputChannel.appendLog(
      `Found ${result.length} child processes for PID ${parentProcessId}: ${JSON.stringify(result.map((p) => ({ pid: p.processId, name: p.name })))}`
    );

    return result;
  } catch (error) {
    ext.outputChannel.appendLog(`Failed to get child processes for PID ${parentProcessId}: ${error.message}`);
    throw new Error(`Failed to execute Powershell script to get the func child process: ${error.message}`);
  }
}
