import * as assert from 'assert';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Machine-local runtime configuration only. Never copy the creating profile,
// globalStorage, account/secret storage, terminal environment, or arbitrary keys.
export const regenerationRuntimeSettingKeys = [
  'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation',
  'azureLogicAppsStandard.autoRuntimeDependenciesPath',
  'azureLogicAppsStandard.funcCoreToolsBinaryPath',
  'azureLogicAppsStandard.dotnetBinaryPath',
  'azureLogicAppsStandard.nodeJsBinaryPath',
  'azureLogicAppsStandard.e2eStrictDependencyValidation',
  'azureLogicAppsStandard.validateDotNetSDK',
  'dotnetAcquisitionExtension.sharedExistingDotnetPath',
  'dotnetAcquisitionExtension.existingDotnetPath',
] as const;

export interface RegenerationRuntimeBinding {
  invocation: string;
  identity: Record<string, string>;
  startedUtc: string;
  runtimeAdmission: { root: string; sourceSettingsPath: string };
}

export interface RegenerationRuntimeHandoff {
  schemaVersion: 1;
  invocation: string;
  identity: Record<string, string>;
  capturedUtc: string;
  root: string;
  sourceSettingsPath: string;
  settings: Record<string, unknown>;
  allowlistedSettingsSha256: string;
  binaries: Array<{ path: string; sha256: string }>;
}

function hashFile(file: string): string {
  assert.ok(fs.statSync(file).isFile(), 'Admitted runtime binary must be an existing regular file');
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function assertRegenerationRuntimeRoot(root: string | undefined, requireInstalled = true): string {
  assert.ok(root && path.isAbsolute(root), 'Regeneration requires an explicit admitted runtime dependency root, not a home/PATH fallback');
  const physical = fs.realpathSync(root);
  assert.ok(fs.statSync(physical).isDirectory(), 'Admitted runtime root must be an existing directory');
  for (const name of requireInstalled ? ['FuncCoreTools', 'DotNetSDK', 'NodeJs'] : []) {
    assert.ok(fs.statSync(path.join(physical, name)).isDirectory(), 'Admitted managed dependency directories must already exist');
  }
  return physical;
}

export function initializeRegenerationRuntimeRoot(root: string | undefined): string {
  assert.ok(root && path.isAbsolute(root), 'Regeneration requires an explicit admitted runtime dependency root, not a home/PATH fallback');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root);
  }
  return assertRegenerationRuntimeRoot(root, false);
}

function selectedSettings(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    regenerationRuntimeSettingKeys.map((key) => {
      assert.ok(Object.hasOwn(source, key), `Creating host must explicitly configure ${key}`);
      return [key, source[key]];
    })
  );
}

export function regenerationRuntimeSettingsHash(settings: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(selectedSettings(settings)))
    .digest('hex');
}

function configuredBinaries(settings: Record<string, unknown>, root: string): string[] {
  assert.deepStrictEqual(
    Object.keys(settings).sort(),
    [...regenerationRuntimeSettingKeys].sort(),
    'Only allowlisted runtime keys may cross hosts'
  );
  assert.strictEqual(
    settings['azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation'],
    true,
    'Managed dependency flow must stay enabled; disabling it resets binary paths on activation'
  );
  assert.strictEqual(
    settings['azureLogicAppsStandard.e2eStrictDependencyValidation'],
    true,
    'Admitted strict validation must remain enabled'
  );
  assert.strictEqual(settings['azureLogicAppsStandard.validateDotNetSDK'], false);
  const configuredRoot = settings['azureLogicAppsStandard.autoRuntimeDependenciesPath'];
  assert.ok(typeof configuredRoot === 'string' && path.isAbsolute(configuredRoot), 'Creating host runtime root must be absolute');
  assert.strictEqual(fs.realpathSync(configuredRoot), root, 'Creating host configured a wrong admitted runtime root');
  const paths = [
    ['azureLogicAppsStandard.funcCoreToolsBinaryPath', 'FuncCoreTools'],
    ['azureLogicAppsStandard.dotnetBinaryPath', 'DotNetSDK'],
    ['azureLogicAppsStandard.nodeJsBinaryPath', 'NodeJs'],
  ].map(([key, directory]) => {
    const binary = settings[key];
    assert.ok(typeof binary === 'string' && path.isAbsolute(binary), 'Actual creating-host binary setting must be an absolute path');
    const relative = path.relative(path.join(root, directory), fs.realpathSync(binary));
    assert.ok(
      relative && !relative.startsWith('..') && !path.isAbsolute(relative),
      'Binary is outside its admitted managed dependency directory'
    );
    assert.ok(fs.statSync(binary).isFile(), 'Creating-host managed binary must exist');
    return binary;
  });
  const sdkPath = settings['dotnetAcquisitionExtension.sharedExistingDotnetPath'];
  assert.ok(typeof sdkPath === 'string' && path.isAbsolute(sdkPath), 'Actual creating-host .NET acquisition path must be explicit');
  paths.push(sdkPath);
  const sdkEntries = settings['dotnetAcquisitionExtension.existingDotnetPath'];
  assert.ok(Array.isArray(sdkEntries), 'Creating-host .NET acquisition entries must be an array');
  const owners = new Set([
    'ms-dotnettools.csharp',
    'ms-dotnettools.csdevkit',
    'ms-azuretools.vscode-azurefunctions',
    'ms-azuretools.vscode-azurelogicapps',
  ]);
  for (const entry of sdkEntries) {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry));
    assert.deepStrictEqual(Object.keys(entry).sort(), ['extensionId', 'path']);
    assert.ok(typeof entry.extensionId === 'string' && owners.delete(entry.extensionId), 'Unexpected or duplicate .NET acquisition owner');
    assert.ok(typeof entry.path === 'string' && path.isAbsolute(entry.path), 'Creating-host SDK path must be absolute');
    paths.push(entry.path);
  }
  assert.strictEqual(owners.size, 0, 'All admitted .NET acquisition owners must be preserved');
  return [...new Set(paths)];
}

export function captureRegenerationRuntimeSettings(
  binding: RegenerationRuntimeBinding,
  actualGlobalValue: (key: string) => unknown,
  now = Date.now()
): RegenerationRuntimeHandoff {
  const root = assertRegenerationRuntimeRoot(binding.runtimeAdmission.root);
  const sourceSettingsPath = fs.realpathSync(binding.runtimeAdmission.sourceSettingsPath);
  const disk = selectedSettings(JSON.parse(fs.readFileSync(sourceSettingsPath, 'utf8')) as Record<string, unknown>);
  const settings = Object.fromEntries(regenerationRuntimeSettingKeys.map((key) => [key, actualGlobalValue(key)]));
  assert.deepStrictEqual(settings, disk, 'Actual creating-host global configuration must match its real settings file');
  const binaries = configuredBinaries(settings, root).map((binary) => ({ path: binary, sha256: hashFile(binary) }));
  return {
    schemaVersion: 1,
    invocation: binding.invocation,
    identity: binding.identity,
    capturedUtc: new Date(now).toISOString(),
    root,
    sourceSettingsPath,
    settings,
    allowlistedSettingsSha256: regenerationRuntimeSettingsHash(settings),
    binaries,
  };
}

export function verifyRegenerationRuntimeSettings(
  handoff: RegenerationRuntimeHandoff,
  binding: RegenerationRuntimeBinding,
  now = Date.now()
): void {
  assert.ok(handoff && typeof handoff === 'object', 'Actual creating-host runtime configuration handoff is required');
  assert.strictEqual(handoff.schemaVersion, 1);
  assert.strictEqual(handoff.invocation, binding.invocation, 'Stale creating-host runtime settings invocation');
  assert.deepStrictEqual(handoff.identity, binding.identity, 'Wrong job/source/platform runtime settings');
  assert.ok(
    Date.parse(handoff.capturedUtc) >= Date.parse(binding.startedUtc) && Date.parse(handoff.capturedUtc) <= now,
    'Stale creating-host runtime settings timestamp'
  );
  const root = assertRegenerationRuntimeRoot(binding.runtimeAdmission.root);
  assert.strictEqual(handoff.root, root, 'Runtime handoff must use the same admitted root');
  assert.strictEqual(
    handoff.sourceSettingsPath,
    fs.realpathSync(binding.runtimeAdmission.sourceSettingsPath),
    'Runtime settings must come from the actual creating profile, not another settings file'
  );
  const disk = selectedSettings(JSON.parse(fs.readFileSync(handoff.sourceSettingsPath, 'utf8')) as Record<string, unknown>);
  assert.deepStrictEqual(handoff.settings, disk, 'Creating-host runtime configuration changed after the wizard');
  assert.strictEqual(
    handoff.allowlistedSettingsSha256,
    regenerationRuntimeSettingsHash(disk),
    'Stale creating-host allowlisted settings hash'
  );
  assert.deepStrictEqual(
    handoff.binaries,
    configuredBinaries(handoff.settings, root).map((binary) => ({ path: binary, sha256: hashFile(binary) })),
    'Admitted runtime binary bytes changed; no replacement install or global fallback is permitted'
  );
}

export function writeRegenerationRuntimeProfile(
  profile: string,
  handoff: RegenerationRuntimeHandoff,
  binding: RegenerationRuntimeBinding
): string {
  verifyRegenerationRuntimeSettings(handoff, binding);
  const settingsPath = path.join(profile, 'User', 'settings.json');
  assert.ok(!fs.existsSync(settingsPath), 'Runtime profile configuration must be fresh');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        ...handoff.settings,
        'telemetry.telemetryLevel': 'off',
        'update.mode': 'none',
        'azureLogicAppsStandard.autoStartDesignTime': false,
        'azureLogicAppsStandard.parameterizeConnectionsInProjectLoad': false,
        'azureLogicAppsStandard.enableManagedIdentityAuth': false,
        'azureLogicAppsStandard.enableProjectConsistencyChecks': true,
      },
      null,
      2
    ),
    { flag: 'wx' }
  );
  assertRegenerationRuntimeProfile(settingsPath, handoff);
  return settingsPath;
}

export function assertRegenerationRuntimeProfile(settingsPath: string, handoff: RegenerationRuntimeHandoff): void {
  const actual = selectedSettings(JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>);
  assert.deepStrictEqual(actual, handoff.settings, 'Regular Code changed admitted runtime configuration or substituted system binaries');
}
