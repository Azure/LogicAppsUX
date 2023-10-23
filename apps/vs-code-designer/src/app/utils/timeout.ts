/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { delay } from './delay';

export async function timeout(asyncFunc: (...params: any[]) => Promise<void>, timeoutMs: number, ...params: any[]): Promise<void> {
  try {
    const asyncOperation = asyncFunc(...params);
    await Promise.race([asyncOperation, delay(timeoutMs)]);

    return await asyncOperation;
  } catch (error) {
    throw new Error(`${asyncFunc.name} timed out after ${timeoutMs} ms.`);
  }
}
