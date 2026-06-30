/**
 * Shared dependency-validation utilities used by both:
 * - run-e2e.js (plain Node.js launcher, runs before VS Code sessions)
 * - designerHelpers.ts (TypeScript, compiled by tsup, runs inside ExTester/VS Code)
 *
 * This module avoids duplication of the executable-check logic across contexts.
 */

'use strict';

const fs = require('fs');

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
function runtimeExecutableAccessMode() {
  return process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK;
}

/**
 * Checks whether a file exists and is executable on the current platform.
 * @param {string} filePath - Absolute path to the binary.
 * @returns {boolean}
 */
function isExecutableFile(filePath) {
  try {
    fs.accessSync(filePath, runtimeExecutableAccessMode());
    return true;
  } catch {
    return false;
  }
}

module.exports = { runtimeExecutableAccessMode, isExecutableFile };
