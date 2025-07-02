import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as vscode from 'vscode';

describe('Extension Test Suite', () => {
  beforeAll(() => {
    console.log('Starting VS Code extension tests');
  });

  afterAll(() => {
    console.log('All tests done!');
  });

  it('Sample test', () => {
    expect([1, 2, 3].indexOf(5)).toBe(-1);
    expect([1, 2, 3].indexOf(1)).toBe(0);
  });

  it('Extension is loaded', () => {
    // Check if our extension is loaded
    const extension = vscode.extensions.getExtension('microsoft.vscode-designer');
    expect(extension).toBeTruthy();
  });
});
