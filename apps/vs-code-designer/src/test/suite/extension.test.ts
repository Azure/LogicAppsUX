import * as assert from 'assert';
import { describe, it, before, after } from 'mocha';
import * as vscode from 'vscode';

describe('Extension Test Suite', () => {
  before(() => {
    console.log('Starting VS Code extension tests');
  });

  after(() => {
    console.log('All tests done!');
  });

  it('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(0, [1, 2, 3].indexOf(1));
  });

  it('Extension is loaded', () => {
    // Check if our extension is loaded
    const extension = vscode.extensions.getExtension('microsoft.vscode-designer');
    assert.ok(extension, 'Extension should be present');
  });
});
