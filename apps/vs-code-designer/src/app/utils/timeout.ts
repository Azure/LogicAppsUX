/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

/**
 * A wrapper async timeout function for dependency installation. Uses Promise.race.
 * @param callback The callback function to execute with a timeout.
 * @param dependencyName The name of the dependency.
 * @param timeoutMs The timeout in ms.
 * @param helpLink Help Link for users to manually install the dependency.
 * @returns A promise that resolves if the async function completes within the timeout, otherwise it handles the timeout scenario.
 */
export async function runWithTimeout(
  callback: (...params: any[]) => Promise<void>,
  dependencyName: string,
  timeoutMs: number,
  helpLink?: string
): Promise<void> {
  let timedOut = false;

  try {
    await Promise.race([
      callback(),
      new Promise<void>((_, reject) => {
        setTimeout(() => {
          timedOut = true;
          reject(new Error('timeout'));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (!timedOut) {
      throw error;
    }

    ext.outputChannel.appendLog(`Timeout: ${callback.name}`);
    const result = await vscode.window.showWarningMessage(
      localize('asyncTimeout', `${dependencyName} timed out after ${timeoutMs} ms. Retry ${dependencyName}?`),
      DialogResponses.yes,
      DialogResponses.no
    );

    if (result === DialogResponses.yes) {
      ext.outputChannel.appendLog(`Retrying: ${callback.name}`);
      return await runWithTimeout(callback, dependencyName, timeoutMs, helpLink);
    }

    vscode.window.showErrorMessage(
      localize(
        'timeoutError',
        `${dependencyName} timed out after ${
          timeoutMs / 1000
        } seconds. Please click [here](${helpLink}) to manually install the dependency.`
      )
    );
  }
}
