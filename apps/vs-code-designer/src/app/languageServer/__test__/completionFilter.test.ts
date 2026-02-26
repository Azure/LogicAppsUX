import { describe, it, expect } from 'vitest';
import { shouldHideCompletionItem, filterCompletionItems, filterCompletionResult } from '../completionFilter';
import type * as vscode from 'vscode';

// ---------- helpers ----------

/** Minimal CompletionItem stub with a string label. */
function itemStr(label: string): vscode.CompletionItem {
  return { label } as vscode.CompletionItem;
}

/** Minimal CompletionItem stub with a CompletionItemLabel object. */
function itemObj(label: string, description?: string): vscode.CompletionItem {
  return { label: { label, description } } as unknown as vscode.CompletionItem;
}

// ---------- shouldHideCompletionItem ----------

describe('shouldHideCompletionItem', () => {
  const hiddenNames = ['WorkflowBuiltInActions', 'WorkflowManagedActions', 'WorkflowBuiltInTriggers', 'WorkflowManagedTriggers'];

  it.each(hiddenNames)('hides %s (string label)', (name) => {
    expect(shouldHideCompletionItem(itemStr(name))).toBe(true);
  });

  it.each(hiddenNames)('hides %s (object label)', (name) => {
    expect(shouldHideCompletionItem(itemObj(name, 'Microsoft.Azure.Workflows.Sdk'))).toBe(true);
  });

  it('keeps WorkflowTriggers visible', () => {
    expect(shouldHideCompletionItem(itemStr('WorkflowTriggers'))).toBe(false);
  });

  it('keeps WorkflowActions visible', () => {
    expect(shouldHideCompletionItem(itemStr('WorkflowActions'))).toBe(false);
  });

  it('keeps unrelated items visible', () => {
    expect(shouldHideCompletionItem(itemStr('Console'))).toBe(false);
    expect(shouldHideCompletionItem(itemStr('string'))).toBe(false);
  });
});

// ---------- filterCompletionItems ----------

describe('filterCompletionItems', () => {
  it('removes only hidden items from an array', () => {
    const items = [
      itemStr('WorkflowTriggers'),
      itemStr('WorkflowBuiltInTriggers'),
      itemStr('WorkflowManagedTriggers'),
      itemStr('WorkflowActions'),
      itemStr('WorkflowBuiltInActions'),
      itemStr('WorkflowManagedActions'),
      itemStr('Console'),
    ];

    const result = filterCompletionItems(items);
    const labels = result.map((i) => (typeof i.label === 'string' ? i.label : i.label.label));

    expect(labels).toEqual(['WorkflowTriggers', 'WorkflowActions', 'Console']);
  });

  it('returns empty array when all items are hidden', () => {
    const items = [itemStr('WorkflowBuiltInTriggers'), itemStr('WorkflowManagedActions')];
    expect(filterCompletionItems(items)).toEqual([]);
  });

  it('returns same items when none should be hidden', () => {
    const items = [itemStr('var'), itemStr('int')];
    expect(filterCompletionItems(items)).toHaveLength(2);
  });
});

// ---------- filterCompletionResult ----------

describe('filterCompletionResult', () => {
  it('passes through undefined', () => {
    expect(filterCompletionResult(undefined)).toBeUndefined();
  });

  it('passes through null', () => {
    expect(filterCompletionResult(null)).toBeNull();
  });

  it('filters a plain array', () => {
    const arr = [itemStr('WorkflowBuiltInTriggers'), itemStr('Console')];
    const result = filterCompletionResult(arr);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('filters a CompletionList and preserves isIncomplete', () => {
    const list: vscode.CompletionList = {
      isIncomplete: true,
      items: [itemStr('WorkflowManagedActions'), itemStr('Console'), itemStr('WorkflowActions')],
    };

    const result = filterCompletionResult(list) as vscode.CompletionList;

    expect(result.isIncomplete).toBe(true);
    expect(result.items).toHaveLength(2);
    const labels = result.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label));
    expect(labels).toEqual(['Console', 'WorkflowActions']);
  });

  it('handles CompletionList with all items hidden', () => {
    const list: vscode.CompletionList = {
      isIncomplete: false,
      items: [itemStr('WorkflowBuiltInActions')],
    };

    const result = filterCompletionResult(list) as vscode.CompletionList;
    expect(result.items).toHaveLength(0);
    expect(result.isIncomplete).toBe(false);
  });
});
