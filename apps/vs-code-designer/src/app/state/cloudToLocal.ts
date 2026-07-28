/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';

interface ICachedTextDocument {
  projectPath: string;
  textDocumentPath: string;
}

const POST_EXTRACT_CACHE_KEY = 'azLAPostExtractReadMe';

/**
 * Caches a text document reference for post-extract steps (e.g., opening README after package extraction).
 */
export function setPostExtractCache(projectPath: string, textDocumentPath: string): void {
  const cache: ICachedTextDocument = { projectPath, textDocumentPath };
  ext.context.globalState.update(POST_EXTRACT_CACHE_KEY, cache);
}

/**
 * Retrieves the cached text document reference, if any.
 */
export function getPostExtractCache(): ICachedTextDocument | undefined {
  return ext.context.globalState.get<ICachedTextDocument>(POST_EXTRACT_CACHE_KEY);
}

/**
 * Clears the cached text document reference.
 */
export function clearPostExtractCache(): void {
  ext.context.globalState.update(POST_EXTRACT_CACHE_KEY, undefined);
}
