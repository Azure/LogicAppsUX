import * as assert from 'assert';
import * as vscode from 'vscode';
import * as mocha from 'mocha';
import { logicAppsStandardExtensionId } from '../../constants';

// Import Mocha test functions
const { describe, it, before, after } = mocha;

// Use standard Mocha functions
describe('Extension Test Suite', () => {
  // Use Mocha hooks
  before(() => {
    console.log('Starting VS Code extension tests');
  });

  after(() => {
    console.log('All tests done!');
  });

  it('Sample test', () => {
    assert.strictEqual([1, 2, 3].indexOf(5), -1);
    assert.strictEqual([1, 2, 3].indexOf(1), 0);
  });

  it('Extension is loaded', () => {
    // Check if our extension is loaded
    const extension = vscode.extensions.getExtension(logicAppsStandardExtensionId);
    assert.ok(extension, 'Extension should be present');
  });
});
