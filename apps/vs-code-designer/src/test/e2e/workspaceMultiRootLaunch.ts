import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MultiRootBootstrapAttestation, MultiRootBootstrapContext } from './workspaceMultiRootBootstrap';
import { snapshotBootstrapBinary } from './workspaceMultiRootBootstrap';

export function controlledFuncEnvironment(directory: string, env: NodeJS.ProcessEnv, platform = process.platform): NodeJS.ProcessEnv {
  assert.ok(platform === 'win32' || platform === 'linux');
  const delimiter = platform === 'win32' ? ';' : ':';
  const paths = platform === 'win32' ? path.win32 : path.posix;
  assert.ok(
    paths.isAbsolute(directory) && !directory.includes(delimiter),
    'Admitted Func directory must be an unambiguous absolute PATH entry'
  );
  const keys = Object.keys(env).filter((key) => (platform === 'win32' ? key.toLowerCase() === 'path' : key === 'PATH'));
  const values = keys.map((key) => env[key]).filter((value): value is string => value !== undefined);
  assert.ok(new Set(values).size <= 1, 'Conflicting inherited PATH/Path values cannot admit Func');
  const inherited = (values[0] || '').split(delimiter).filter((entry) => entry && paths.isAbsolute(entry));
  const normalize = (entry: string) => (platform === 'win32' ? paths.normalize(entry).toLowerCase() : paths.normalize(entry));
  const tail = inherited.filter((entry) => normalize(entry) !== normalize(directory));
  const result = { ...env };
  for (const key of keys) {
    delete result[key];
  }
  result[platform === 'win32' ? 'Path' : 'PATH'] = [directory, ...tail].join(delimiter);
  if (platform === 'win32') {
    // cmd.exe's current-directory executable lookup must not precede the
    // attested directory; retain batch tooling but prefer native .EXE.
    for (const key of Object.keys(result).filter((key) => ['pathext', 'nodefaultcurrentdirectoryinexepath'].includes(key.toLowerCase()))) {
      delete result[key];
    }
    result.PATHEXT = '.EXE;.CMD;.BAT;.COM';
    result.NoDefaultCurrentDirectoryInExePath = '1';
  }
  return result;
}

export interface FuncRuntimeResolution {
  command: string;
  managedValidation: boolean;
  runtimeRoot: string;
  pathHead: string;
  executable: string;
  sha256: string;
}

export function observeFuncRuntime(
  configuredCommand: string,
  managedValidation: boolean,
  configuredRoot: string,
  env: NodeJS.ProcessEnv
): FuncRuntimeResolution {
  assert.equal(configuredCommand, 'func', 'Regular activation must use the actual unmanaged ensureBinaries branch, not a profile pin');
  assert.equal(managedValidation, false, 'Reopen must not run another managed dependency install');
  const platform = process.platform;
  const keys = Object.keys(env).filter((key) => (platform === 'win32' ? key.toLowerCase() === 'path' : key === 'PATH'));
  const values = keys.map((key) => env[key]).filter((value): value is string => value !== undefined);
  assert.ok(values.length > 0 && new Set(values).size === 1, 'Actual extension host PATH is absent or ambiguous');
  const pathHead = values[0].split(path.delimiter)[0];
  assert.ok(path.isAbsolute(pathHead), 'Actual Func PATH head must be absolute');
  const root = fs.realpathSync(configuredRoot);
  assert.equal(
    fs.realpathSync(pathHead),
    path.join(root, 'FuncCoreTools'),
    'Actual PATH does not lead with the job-owned admitted Func directory'
  );
  if (platform === 'win32') {
    assert.equal(env.NoDefaultCurrentDirectoryInExePath, '1', 'Current-directory Func shadowing is not disabled');
    assert.equal(env.PATHEXT?.toUpperCase(), '.EXE;.CMD;.BAT;.COM', 'Native Func must precede script executable extensions');
  }
  const executable = fs.realpathSync(path.join(pathHead, platform === 'win32' ? 'func.exe' : 'func'));
  // A second same-name wrapper in the admitted directory would make shell
  // resolution ambiguous; do not silently select one for the observer.
  const shadows = fs.readdirSync(pathHead).filter((name) => {
    const normalized = platform === 'win32' ? name.toLowerCase() : name;
    return platform === 'win32' ? /^func(?:\.com|\.cmd|\.bat)?$/.test(normalized) : normalized === 'func.exe';
  });
  assert.equal(shadows.length, 0, 'A same-name Func wrapper shadows the admitted native executable');
  return {
    command: configuredCommand,
    managedValidation,
    runtimeRoot: root,
    pathHead,
    executable,
    sha256: createHash('sha256').update(fs.readFileSync(executable)).digest('hex'),
  };
}

export function assertFuncRuntimeResolution(resolution: FuncRuntimeResolution | undefined, bootstrap: MultiRootBootstrapAttestation): void {
  assert.ok(resolution, 'Actual extension-host runtime resolution was not observed');
  assert.equal(resolution.command, 'func');
  assert.equal(resolution.managedValidation, false);
  assert.equal(resolution.runtimeRoot, bootstrap.runtimeRoot);
  assert.equal(resolution.executable, bootstrap.binary.executable, 'Actual activation resolved a different Func executable');
  assert.equal(resolution.sha256, bootstrap.binary.sha256, 'Actual activation resolved different Func bytes');
}

export function multiRootRegularLaunch(bootstrap: MultiRootBootstrapAttestation, env: NodeJS.ProcessEnv, profile: string) {
  const context: MultiRootBootstrapContext = {
    suiteId: 'workspaceMultiRoot',
    invocation: bootstrap.invocation,
    identity: bootstrap.identity,
    runtimeRoot: bootstrap.runtimeRoot,
    startedUtc: bootstrap.recordedUtc,
  };
  assert.deepEqual(
    snapshotBootstrapBinary(context, bootstrap.binary.executable),
    bootstrap.binary,
    'Attested Func changed before regular launch'
  );
  const controlledEnv = controlledFuncEnvironment(path.dirname(bootstrap.binary.executable), env);
  const settings = {
    'azureLogicAppsStandard.autoStartDesignTime': true,
    'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': false,
    'azureLogicAppsStandard.autoRuntimeDependenciesPath': bootstrap.runtimeRoot,
    // ensureBinaries() writes this exact default on normal non-devcontainer
    // activation. The launch binds its real shell lookup, not an overwritten pin.
    'azureLogicAppsStandard.funcCoreToolsBinaryPath': 'func',
    'azureLogicAppsStandard.parameterizeConnectionsInProjectLoad': false,
    'azureLogicAppsStandard.silentAuth': true,
    'azureLogicAppsStandard.autoStartAzurite': true,
    'azurite.location': path.join(profile, 'azurite'),
    'telemetry.telemetryLevel': 'off',
    'update.mode': 'none',
  };
  const resolution = observeFuncRuntime('func', false, bootstrap.runtimeRoot, controlledEnv);
  assertFuncRuntimeResolution(resolution, bootstrap);
  return { settings, env: controlledEnv };
}
