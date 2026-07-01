/**
 * Shared dependency-validation utilities used by both:
 * - run-e2e.ts (E2E launcher, compiled by tsup)
 * - designerHelpers.ts (ExTester test helpers, compiled by tsup)
 *
 * This module avoids duplication of the executable-check logic across contexts.
 */

import * as fs from 'fs';

/**
 * Returns the appropriate fs.access mode for checking runtime binary executability.
 *
 * On Windows, there is no execute-permission concept at the filesystem level;
 * executability is determined by file extension (.exe, .cmd, etc.).
 * Node.js docs: "On Windows, fs.access() does not fully support X_OK,
 * which is treated as F_OK." So we use F_OK explicitly to be honest that
 * we are only verifying the file exists (which, combined with .exe extension,
 * means it is executable).
 *
 * On Unix (Linux/macOS), X_OK checks the actual execute permission bit.
 */
export function runtimeExecutableAccessMode(): number {
  return process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK;
}

/**
 * Checks whether a file exists and is executable on the current platform.
 */
export function isExecutableFile(filePath: string): boolean {
  try {
    fs.accessSync(filePath, runtimeExecutableAccessMode());
    return true;
  } catch {
    return false;
  }
}
