/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export async function delay(ms: number): Promise<void> {
  return await new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error());
    }, ms);
  });
}
