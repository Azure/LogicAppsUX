import { ext } from '../../extensionVariables';
import { localize } from '../../localize';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

/**
 * A wrapper async timeout function for dependency installation. Uses Promise.race.
 * @param asyncFunc The async function used to validate dependency.
 * @param dependencyName The name of the dependency.
 * @param timeoutMs The timeout in ms.
 * @param helpLink Help Link for users to manually install the dependency.
 * @param params The async function Parameters.
 * @returns
 */
export async function timeout(
  asyncFunc: (...params: any[]) => Promise<void>,
  dependencyName: string,
  timeoutMs: number,
  helpLink: string,
  ...params: any[]
): Promise<void> {
  try {
    const asyncOperation = asyncFunc(...params);

    // If timeOutErrorOperation settles firsts, asyncOperation will continue to run.
    await Promise.race([asyncOperation, timeOutErrorOperation(timeoutMs)]);
  } catch (error) {
    ext.outputChannel.appendLog(`Timeout: ${asyncFunc.name}`);
    const result = await vscode.window.showWarningMessage(
      localize('asyncTimeout', `${dependencyName} timed out after ${timeoutMs} ms. Retry ${dependencyName}?`),
      DialogResponses.yes,
      DialogResponses.no
    );

    if (result == DialogResponses.yes) {
      ext.outputChannel.appendLog(`Retrying: ${asyncFunc.name}`);
      return await timeout(asyncFunc, dependencyName, timeoutMs, helpLink, ...params);
    } else {
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
}

/**
 * Sets a timeout and throws an error if timeout.
 */
async function timeOutErrorOperation(ms: number): Promise<void> {
  return await new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error());
    }, ms);
  });
}
