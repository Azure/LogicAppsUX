/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';

/**
 * Stores a value in the global state cache under the given key.
 */
export function updateTemplateCacheValue(key: string, value: unknown): void {
  ext.context.globalState.update(key, value);
}

/**
 * Retrieves a cached value from the global state cache.
 */
export function getTemplateCacheValue<T>(key: string): T | undefined {
  return ext.context.globalState.get<T>(key);
}
