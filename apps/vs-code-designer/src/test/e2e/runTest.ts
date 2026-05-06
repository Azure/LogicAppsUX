/**
 * E2E Test Runner Entry Point
 *
 * This file is the entry point for VS Code extension e2e tests.
 * It uses @vscode/test-cli for running tests in the VS Code environment.
 *
 * Usage:
 * - Run all e2e tests: pnpm run test:e2e-cli
 * - Run with specific label: pnpm run test:e2e-cli --label unitTests
 */

import type * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  console.log('Test runner activated');
}

export function deactivate(): void {
  console.log('Test runner deactivated');
}
