/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Has extra logic to remove a BOM character if it exists
 */
export function parseJson<T extends object>(data: string): T {
  let updateData = data;
  if (updateData.charCodeAt(0) === 0xfeff) {
    updateData = updateData.slice(1);
  }
  return JSON.parse(updateData) as T;
}
