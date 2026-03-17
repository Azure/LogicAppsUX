/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';

/**
 * SDK type names that should be hidden from IntelliSense.
 *
 * These are the "inner" types exposed as static members on the gateway
 * classes `WorkflowTriggers` and `WorkflowActions`.  Users should access
 * them via `WorkflowTriggers.BuiltIn` / `WorkflowActions.ManagedConnectors`
 * etc., so the standalone class names just add noise to autocomplete.
 */
const HIDDEN_COMPLETION_LABELS: ReadonlySet<string> = new Set([
  'WorkflowBuiltInActions',
  'WorkflowManagedActions',
  'WorkflowBuiltInTriggers',
  'WorkflowManagedTriggers',
]);

/**
 * Extracts the plain-text label from a `CompletionItem`.
 * VS Code labels can be either a plain string or a `CompletionItemLabel` object
 * with a `.label` property.
 */
function getLabel(item: vscode.CompletionItem): string {
  if (typeof item.label === 'string') {
    return item.label;
  }
  return item.label?.label ?? '';
}

/**
 * Returns `true` when the completion item should be suppressed.
 */
export function shouldHideCompletionItem(item: vscode.CompletionItem): boolean {
  return HIDDEN_COMPLETION_LABELS.has(getLabel(item));
}

/**
 * Filters an array of completion items, removing the redundant SDK types.
 */
export function filterCompletionItems(items: vscode.CompletionItem[]): vscode.CompletionItem[] {
  return items.filter((item) => !shouldHideCompletionItem(item));
}

/**
 * Filters the result returned by the upstream completion provider.
 *
 * The result can be:
 * - `undefined | null`  – pass through unchanged
 * - `CompletionItem[]`  – filter the array directly
 * - `CompletionList`    – filter the `.items` array and preserve `.isIncomplete`
 */
export function filterCompletionResult(
  result: vscode.CompletionItem[] | vscode.CompletionList | undefined | null
): vscode.CompletionItem[] | vscode.CompletionList | undefined | null {
  if (!result) {
    return result;
  }

  // CompletionList shape (has `items` and `isIncomplete`)
  if ('items' in result && Array.isArray(result.items)) {
    const filtered = filterCompletionItems(result.items);
    // Preserve the original object shape to keep `isIncomplete` and any extra metadata
    return { ...result, items: filtered };
  }

  // Plain array shape
  if (Array.isArray(result)) {
    return filterCompletionItems(result);
  }

  return result;
}
