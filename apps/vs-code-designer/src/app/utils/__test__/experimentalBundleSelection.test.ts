import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as path from 'path';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { getExperimentalBundleRuntime, resetCachedBundleVersion } from '../bundleFeed';
import { defaultExtensionBundlePathValue } from '../../../constants';

const state = vi.hoisted(() => ({
  enabled: true,
  pin: '',
  localPin: undefined as string | undefined,
  folders: ['1.170.91', '1.197.13', '1.197.0.13'],
  subscriptions: [] as Array<{ dispose(): void }>,
  resolve: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('../experimentalBundleRuntime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../experimentalBundleRuntime')>()),
  ExperimentalBundleSource: class {
    resolve = state.resolve;
    dispose = state.dispose;
  },
}));
vi.mock('../binaries', () => ({ downloadAndExtractDependency: vi.fn() }));
vi.mock('../feed', () => ({ getJsonFeed: vi.fn() }));
vi.mock('../integrity', () => ({ fetchExpectedMd5: vi.fn(), isMissingPackageError: vi.fn() }));
vi.mock('../appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn(async () => ({ Values: { AzureFunctionsJobHost_extensionBundle_version: state.localPin } })),
}));
vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: (key: string) => {
    if (key === 'useExperimentalExtensionBundle') {
      return state.enabled;
    }
    return key === 'experimentalExtensionBundleVersion' ? state.pin : undefined;
  },
}));
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(async () => true),
  readdirSync: vi.fn(() => state.folders),
  statSync: vi.fn(() => ({ isDirectory: () => true })),
}));
vi.mock('../../../extensionVariables', () => ({
  ext: {
    context: { subscriptions: state.subscriptions },
    outputChannel: { appendLog: vi.fn() },
    latestBundleVersion: '1.170.91',
  },
}));

const context = { telemetry: { properties: {}, measurements: {} } } as IActionContext;

beforeEach(() => {
  vi.clearAllMocks();
  resetCachedBundleVersion();
  state.enabled = true;
  state.pin = '';
  state.localPin = undefined;
  state.folders = ['1.170.91', '1.197.13', '1.197.0.13'];
  vi.stubEnv('AzureFunctionsJobHost_extensionBundle_version', undefined);
  state.resolve.mockImplementation(async (directory: string) => ({
    directory,
    folderVersion: path.basename(directory),
    manifestVersion: '1.197.0.13',
    env: {},
  }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  for (const subscription of state.subscriptions.splice(0)) {
    subscription.dispose();
  }
});

describe('experimental launch selection', () => {
  it('does not inspect settings/cache or start a source for nonexperimental launches', async () => {
    state.enabled = false;
    expect(await getExperimentalBundleRuntime(context, 'synthetic-project')).toBeUndefined();
    expect(state.resolve).not.toHaveBeenCalled();
    expect(state.subscriptions).toHaveLength(0);
  });

  it.each(['', '   '])('selects latest local for blank version %j independently of public/latest global state', async (pin) => {
    state.pin = pin;
    const binding = await getExperimentalBundleRuntime(context, 'synthetic-project');
    expect(binding?.folderVersion).toBe('1.197.13');
    expect(state.resolve).toHaveBeenCalledWith(path.join(defaultExtensionBundlePathValue, '1.197.13'));
    expect(state.subscriptions).toHaveLength(1);
  });

  it.each(['1.170.91', '1.197.0.13', ' 1.197.0.13 '])('honors explicit version %j even if a higher folder exists', async (pin) => {
    state.pin = pin;
    const binding = await getExperimentalBundleRuntime(context, 'synthetic-project');
    expect(binding?.folderVersion).toBe(pin.trim());
  });

  it('uses the actual project local pin rather than the first workspace or global version', async () => {
    state.pin = '1.197.13';
    state.localPin = '1.170.91';
    await getExperimentalBundleRuntime(context, 'synthetic-project');
    expect(state.resolve).toHaveBeenCalledWith(path.join(defaultExtensionBundlePathValue, '1.170.91'));
  });

  it('uses the inherited pin ahead of the experimental setting when the project has no pin', async () => {
    state.pin = '1.197.13';
    vi.stubEnv('AzureFunctionsJobHost_extensionBundle_version', ' 1.197.0.13 ');
    await getExperimentalBundleRuntime(context, 'synthetic-project');
    expect(state.resolve).toHaveBeenCalledWith(path.join(defaultExtensionBundlePathValue, '1.197.0.13'));
  });

  it.each(['../escape', 'invalid', '0.0.0'])('rejects invalid pin %j before starting a metadata source', async (pin) => {
    state.pin = pin;
    await expect(getExperimentalBundleRuntime(context, 'synthetic-project')).rejects.toThrow('No experimental');
    expect(state.resolve).not.toHaveBeenCalled();
  });

  it('fails with actionable guidance rather than selecting public when no local bundle exists', async () => {
    state.folders = [];
    await expect(getExperimentalBundleRuntime(context, 'synthetic-project')).rejects.toThrow('Install a complete local bundle');
    expect(state.resolve).not.toHaveBeenCalled();
  });

  it('propagates selected-cache validation errors without substituting another folder', async () => {
    state.pin = '1.197.0.13';
    state.resolve.mockRejectedValue(new Error('selected bundle missing or invalid'));
    await expect(getExperimentalBundleRuntime(context, 'synthetic-project')).rejects.toThrow('selected bundle missing or invalid');
    expect(state.resolve).toHaveBeenCalledTimes(1);
  });
});
