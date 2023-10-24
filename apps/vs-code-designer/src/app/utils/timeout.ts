/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export async function timeout(asyncFunc: (...params: any[]) => Promise<void>, timeoutMs: number, ...params: any[]): Promise<void> {
  try {
    const asyncOperation = asyncFunc(...params);
    await Promise.race([asyncOperation, timeOutErrorOperation(timeoutMs)]);

    return await asyncOperation;
  } catch (error) {
    throw new Error(`${asyncFunc.name} timed out after ${timeoutMs} ms.`);
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
