/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { isString } from '@microsoft/logic-apps-shared';
import type { IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import { Platform, type ICommandResult } from '@microsoft/vscode-extension-logic-apps';
import * as cp from 'child_process';
import * as os from 'os';

export interface ExecuteCommandOptions {
  sanitizedCommandForLogging?: string;
  timeoutMs?: number;
}

type ExecuteCommandArgument = string | ExecuteCommandOptions;

export async function executeCommand(
  outputChannel: IAzExtOutputChannel | undefined,
  workingDirectory: string | undefined,
  command: string,
  ...args: ExecuteCommandArgument[]
): Promise<string> {
  const { commandArgs, options } = parseExecuteCommandArgs(args);
  return executeCommandInternal(outputChannel, workingDirectory, options, command, ...commandArgs);
}

async function executeCommandInternal(
  outputChannel: IAzExtOutputChannel | undefined,
  workingDirectory: string | undefined,
  options: ExecuteCommandOptions,
  command: string,
  ...args: string[]
): Promise<string> {
  const result: ICommandResult = await tryExecuteCommandInternal(outputChannel, workingDirectory, options, command, ...args);

  const commandForLogging = options.sanitizedCommandForLogging ?? `${command} ${result.formattedArgs}`;
  if (result.code !== 0) {
    // We want to make sure the full error message is displayed to the user, not just the error code.
    // If outputChannel is defined, then we simply call 'outputChannel.show()' and throw a generic error telling the user to check the output window
    // If outputChannel is _not_ defined, then we include the command's output in the error itself and rely on AzureActionHandler to display it properly
    if (outputChannel) {
      outputChannel.show();
      throw new Error(
        localize('commandErrorWithOutput', 'Failed to run "{0}" command. Check output window for more details.', commandForLogging)
      );
    }
    throw new Error(
      localize(
        'commandError',
        'Command "{0}" failed with exit code "{1}":{2}{3}',
        commandForLogging,
        result.code,
        os.EOL,
        result.cmdOutputIncludingStderr
      )
    );
  }
  if (outputChannel && command !== 'echo') {
    outputChannel.appendLog(localize('finishedRunningCommand', 'Finished running command: "{0}".', commandForLogging));
  }
  return result.cmdOutput;
}

export async function tryExecuteCommand(
  outputChannel: IAzExtOutputChannel | undefined,
  workingDirectory: string | undefined,
  command: string,
  ...args: ExecuteCommandArgument[]
): Promise<ICommandResult> {
  const { commandArgs, options } = parseExecuteCommandArgs(args);
  return await tryExecuteCommandInternal(outputChannel, workingDirectory, options, command, ...commandArgs);
}

function parseExecuteCommandArgs(args: ExecuteCommandArgument[]): { commandArgs: string[]; options: ExecuteCommandOptions } {
  const maybeOptions = args[args.length - 1];
  const options = isExecuteCommandOptions(maybeOptions) ? maybeOptions : {};
  const commandArgValues = isExecuteCommandOptions(maybeOptions) ? args.slice(0, -1) : args;
  const commandArgs: string[] = [];

  for (const arg of commandArgValues) {
    if (!isString(arg)) {
      throw new Error(localize('invalidCommandArgument', 'Command arguments must be strings.'));
    }
    commandArgs.push(arg);
  }

  return { commandArgs, options };
}

function isExecuteCommandOptions(arg: ExecuteCommandArgument | undefined): arg is ExecuteCommandOptions {
  return typeof arg === 'object' && arg !== null && !Array.isArray(arg);
}

/**
 * Terminates a spawned command. Because commands are spawned with `shell: true`, the tracked pid is
 * the shell, and on Windows killing it leaves the actual command running — and still holding its
 * file handles — so the whole tree has to be taken down.
 * @param {cp.ChildProcess} childProc - The spawned shell process.
 */
function killProcessTree(childProc: cp.ChildProcess): void {
  try {
    if (process.platform === Platform.windows && childProc.pid !== undefined) {
      cp.exec(`taskkill /pid ${childProc.pid} /t /f`);
    } else {
      childProc.kill('SIGKILL');
    }
  } catch {
    // Best effort only: the process may have exited between the timeout firing and the kill.
  }
}

async function tryExecuteCommandInternal(
  outputChannel: IAzExtOutputChannel | undefined,
  workingDirectory: string | undefined,
  options: ExecuteCommandOptions,
  command: string,
  ...args: string[]
): Promise<ICommandResult> {
  return await new Promise((resolve: (res: ICommandResult) => void, reject: (e: Error) => void): void => {
    let cmdOutput = '';
    let cmdOutputIncludingStderr = '';
    const formattedArgs: string = args.join(' ');
    const commandForLogging = options.sanitizedCommandForLogging ?? `${command} ${formattedArgs}`;

    workingDirectory = workingDirectory || os.tmpdir();
    const spawnOptions: cp.SpawnOptions = {
      cwd: workingDirectory,
      shell: true,
    };
    const childProc: cp.ChildProcess = cp.spawn(command, args, spawnOptions);

    let timedOut = false;
    let timer: NodeJS.Timeout | undefined;
    if (options.timeoutMs !== undefined) {
      timer = setTimeout(() => {
        timedOut = true;
        killProcessTree(childProc);
        reject(
          new Error(
            localize(
              'commandTimedOutWithOptions',
              'Command "{0}" did not complete within {1} ms and was terminated.',
              commandForLogging,
              options.timeoutMs
            )
          )
        );
      }, options.timeoutMs);
    }

    const settle = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    if (outputChannel && command !== 'echo') {
      outputChannel.appendLog(localize('runningCommandWithOptions', 'Running command: "{0}"...', commandForLogging));
    }

    childProc.stdout.on('data', (data: string | Buffer) => {
      data = data.toString();
      cmdOutput = cmdOutput.concat(data);
      cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
      if (outputChannel) {
        outputChannel.append(data);
      }
    });

    childProc.stderr.on('data', (data: string | Buffer) => {
      data = data.toString();
      cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
      if (outputChannel) {
        outputChannel.append(data);
      }
    });

    childProc.on('error', (error: Error) => {
      settle();
      if (!timedOut) {
        reject(error);
      }
    });
    childProc.on('close', (code: number) => {
      settle();
      if (timedOut) {
        return;
      }
      resolve({
        code,
        cmdOutput,
        cmdOutputIncludingStderr,
        formattedArgs,
      });
    });
  });
}

/**
 * Gets argument wrapped in quotation marks to ensure spaces and special characters (most notably $) are preserved
 * @param {string | boolean | number} arg - Argument to be wrapped.
 * @returns {string} Argument wrapped in quotation marks.
 */
export function wrapArgInQuotes(arg?: string | boolean | number): string {
  const quotationMark: string = process.platform === Platform.windows ? '"' : "'";
  arg ??= '';
  return isString(arg) ? quotationMark + arg + quotationMark : String(arg);
}
