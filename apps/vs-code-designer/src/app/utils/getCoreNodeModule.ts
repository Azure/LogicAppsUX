/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';

/**
 * GReturns a node module installed with VSCode, or undefined if it fails.
 * @param {string} moduleName - Module name to check.
 * @returns {T | undefined} If finds the module returns the module, otherwise returns undefined.
 */
export function getCoreNodeModule<T>(moduleName: string): T | undefined {
  try {
    return require(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`);
  } catch (err) {
    // ignore
  }

  try {
    return require(`${vscode.env.appRoot}/node_modules/${moduleName}`);
  } catch (err) {
    // ignore
  }

  return undefined;
}
