/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Platform-keyed `options` block for the `func: host start` task.
 *
 * Historically the extension emitted a single Windows-only PATH literal
 * (`<deps>\NodeJs;<deps>\DotNetSDK;$env:PATH`) into the task's
 * `options.env.PATH`. On non-Windows platforms this:
 *  - used `;` as a separator (POSIX uses `:`),
 *  - used `\` as a path separator (POSIX uses `/`),
 *  - and left `$env:PATH` un-expanded (that is PowerShell syntax, not the
 *    VS Code task-system variable `${env:PATH}`).
 *
 * The net effect on Linux/macOS was that the inherited PATH was clobbered
 * with garbage, so child processes spawned by the Functions runtime could
 * not find `node`. The Functions in-proc8 runtime's
 * `InlineCodeDependencyGenerator` then failed with
 * `"The 'node' process needed for inline code dependency generation could
 * not be found on PATH"`.
 *
 * This helper emits the documented VS Code task-system platform-keyed
 * variants (`windows` / `linux` / `osx`) so each OS gets the right
 * separators and the right substitution syntax. The base `options.env`
 * acts as a fallback (`${env:PATH}` is the cross-platform VS Code task
 * variable expanded by VS Code itself).
 *
 * Reference: https://code.visualstudio.com/docs/editor/tasks#_operating-system-specific-properties
 */
interface FuncHostTaskOptionsBlock {
  cwd?: string;
  env: Record<string, string>;
}

export interface FuncHostTaskOptions {
  options: FuncHostTaskOptionsBlock;
  windows: { options: FuncHostTaskOptionsBlock };
  linux: { options: FuncHostTaskOptionsBlock };
  osx: { options: FuncHostTaskOptionsBlock };
}

const DEPS_VAR = '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}';
// VS Code task-system variable for the inherited PATH; expanded by VS Code
// before the task is spawned. Distinct from PowerShell's `$env:PATH`.
const INHERITED_PATH = '${env:PATH}';

const WINDOWS_PATH = `${DEPS_VAR}\\NodeJs;${DEPS_VAR}\\DotNetSDK;${INHERITED_PATH}`;
const POSIX_PATH = `${DEPS_VAR}/NodeJs:${DEPS_VAR}/DotNetSDK:${INHERITED_PATH}`;

/**
 * Returns the platform-keyed `options` / `windows` / `linux` / `osx`
 * blocks that should be spread onto a `func: host start` task.
 *
 * @param extras Optional extra fields merged into the base `options`
 *               block (e.g. `cwd` for codeful / dotnet projects).
 */
export function getFuncHostTaskEnv(extras?: { cwd?: string }): FuncHostTaskOptions {
  const createOptions = (path: string): FuncHostTaskOptionsBlock => ({
    ...(extras?.cwd ? { cwd: extras.cwd } : {}),
    env: { PATH: path },
  });

  return {
    options: createOptions(INHERITED_PATH),
    windows: { options: createOptions(WINDOWS_PATH) },
    linux: { options: createOptions(POSIX_PATH) },
    osx: { options: createOptions(POSIX_PATH) },
  };
}
