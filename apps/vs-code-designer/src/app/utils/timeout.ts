import { ext } from '../../extensionVariables';
import { localize } from '../../localize';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export async function timeout(
  asyncFunc: (...params: any[]) => Promise<void>,
  timeoutMs: number,
  helpLink: string,
  ...params: any[]
): Promise<void> {
  try {
    ext.outputChannel.appendLog(`Running: ${asyncFunc.name}`);
    const asyncOperation = asyncFunc(...params);
    await Promise.race([asyncOperation, timeOutErrorOperation(timeoutMs)]);
  } catch (error) {
    const result = await vscode.window.showWarningMessage(
      localize('asyncTimeout', `${asyncFunc.name} timed out after ${timeoutMs} ms. Retry ${asyncFunc.name}?`),
      DialogResponses.yes,
      DialogResponses.no
    );

    if (result == DialogResponses.yes) {
      ext.outputChannel.appendLog(`Retrying: ${asyncFunc.name}`);
      return await timeout(asyncFunc, timeoutMs, helpLink, ...params);
    } else {
      vscode.window.showErrorMessage(
        localize(
          'timeoutError',
          `${asyncFunc.name} timed out after ${
            timeoutMs / 1000
          } seconds. Please click [here](${helpLink}) to access our troubleshooting documentation for step-by-step instructions.`
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
