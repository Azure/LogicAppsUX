/**
 * Shared dependency-validation utilities used by both:
 * - run-e2e.ts (E2E launcher, compiled by tsup)
 * - designerHelpers.ts (ExTester test helpers, compiled by tsup)
 *
 * This module avoids duplication of the executable-check logic across contexts.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';

/**
 * Runs `<funcBinaryPath> --version` and reports whether it exits successfully.
 *
 * File existence (and, on Windows, a ".exe" extension) is NOT sufficient proof that
 * Azure Functions Core Tools is usable: the pre-debug gate
 * (`validateFuncCoreToolsInstalled` → `isFuncToolsInstalled`) actually SPAWNS
 * `func --version`, and if that throws it shows the blocking "You must have the Azure
 * Functions Core Tools installed" modal that aborts F5. On hosted Windows runners a
 * provisioned-but-not-yet-runnable func (partial extract, poisoned cache, mid-reinstall)
 * passes an existence check but fails to execute. This smoke check closes that gap so the
 * E2E harness gates F5 on the SAME signal the product uses.
 *
 * @param funcBinaryPath Absolute path to the func executable.
 * @param timeoutMs Max time to allow the version probe to run (func can JIT slowly on first run).
 * @returns true when `func --version` exits 0, false otherwise.
 */
export function funcVersionRuns(funcBinaryPath: string, timeoutMs = 60_000): boolean {
  try {
    execFileSync(funcBinaryPath, ['--version'], { timeout: timeoutMs, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

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
