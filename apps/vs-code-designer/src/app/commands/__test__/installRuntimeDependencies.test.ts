import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PackageManager, dotnetDependencyName, funcDependencyName, nodeJsDependencyName } from '../../../constants';
import { downloadAndExtractDependency } from '../../utils/binaries';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getNpmDistTag } from '../../utils/funcCoreTools/getNpmDistTag';
import { ensureRuntimeDependenciesPath } from '../../utils/runtimeDependenciesPath';
import { promptForFuncVersion } from '../../utils/vsCodeConfig/settings';
import { installDotNet } from '../dotnet/installDotNet';
import { installFuncCoreToolsBinaries, installFuncCoreToolsSystem } from '../funcCoreTools/installFuncCoreTools';
import { installNodeJs } from '../nodeJs/installNodeJs';

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      show: vi.fn(),
      appendLog: vi.fn(),
    },
  },
}));

vi.mock('../../utils/runtimeDependenciesPath', () => ({
  ensureRuntimeDependenciesPath: vi.fn(),
}));

vi.mock('../../utils/binaries', () => ({
  downloadAndExtractDependency: vi.fn(),
  getCpuArchitecture: vi.fn(() => 'x64'),
  getDotNetBinariesReleaseUrl: vi.fn(() => 'https://dot.net/v1/dotnet-install.ps1'),
  getFunctionCoreToolsBinariesReleaseUrl: vi.fn(() => 'https://example.com/func.zip'),
  getLatestFunctionCoreToolsVersion: vi.fn(async () => '4.0.0'),
  getLatestNodeJsVersion: vi.fn(async () => '20.0.0'),
  getNodeJsBinariesReleaseUrl: vi.fn(() => 'https://example.com/node.zip'),
}));

vi.mock('../../utils/funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../utils/funcCoreTools/getBrewPackageName', () => ({
  getBrewPackageName: vi.fn(() => 'azure-functions-core-tools@4'),
}));

vi.mock('../../utils/funcCoreTools/getNpmDistTag', () => ({
  getNpmDistTag: vi.fn(),
}));

vi.mock('../../utils/vsCodeConfig/settings', () => ({
  promptForFuncVersion: vi.fn(),
}));

vi.mock('vscode-nls', () => ({
  localize: (_key: string, message: string, ...args: unknown[]) =>
    message.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

describe('runtime dependency installers', () => {
  const context = { telemetry: { properties: {} } } as any;
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    vi.mocked(ensureRuntimeDependenciesPath).mockResolvedValue('D:\\dependencies');
    vi.mocked(downloadAndExtractDependency).mockResolvedValue(undefined);
    vi.mocked(getNpmDistTag).mockResolvedValue({ tag: '4.0.0' } as any);
    vi.mocked(promptForFuncVersion).mockResolvedValue('4' as any);
  });

  it('installs .NET into the ensured runtime dependency path', async () => {
    await installDotNet(context, '8');

    expect(ensureRuntimeDependenciesPath).toHaveBeenCalled();
    expect(downloadAndExtractDependency).toHaveBeenCalledWith(
      context,
      'https://dot.net/v1/dotnet-install.ps1',
      'D:\\dependencies',
      dotnetDependencyName,
      null,
      '8'
    );
  });

  it('installs Functions Core Tools binaries into the ensured runtime dependency path', async () => {
    await installFuncCoreToolsBinaries(context, '4');

    expect(ensureRuntimeDependenciesPath).toHaveBeenCalled();
    expect(downloadAndExtractDependency).toHaveBeenCalledWith(
      context,
      'https://example.com/func.zip',
      'D:\\dependencies',
      funcDependencyName
    );
  });

  it('uses the macOS Functions Core Tools binary release when running on macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    await installFuncCoreToolsBinaries(context, '4');

    expect(downloadAndExtractDependency).toHaveBeenCalledWith(
      context,
      'https://example.com/func.zip',
      'D:\\dependencies',
      funcDependencyName
    );
  });

  it('installs Node.js into the ensured runtime dependency path', async () => {
    await installNodeJs(context, '20');

    expect(ensureRuntimeDependenciesPath).toHaveBeenCalled();
    expect(downloadAndExtractDependency).toHaveBeenCalledWith(
      context,
      'https://example.com/node.zip',
      'D:\\dependencies',
      nodeJsDependencyName
    );
  });

  it('uses the Linux Node.js binary release when running on Linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    await installNodeJs(context, '20');

    expect(downloadAndExtractDependency).toHaveBeenCalledWith(
      context,
      'https://example.com/node.zip',
      'D:\\dependencies',
      nodeJsDependencyName
    );
  });

  it('installs Functions Core Tools through npm when system installation is selected', async () => {
    await installFuncCoreToolsSystem(context, [PackageManager.npm], '4' as any);

    expect(executeCommand).toHaveBeenCalledWith(expect.anything(), undefined, 'npm', 'install', '-g', 'azure-functions-core-tools@4.0.0');
  });

  it('installs Functions Core Tools through brew when that package manager is selected', async () => {
    await installFuncCoreToolsSystem(context, [PackageManager.brew], '4' as any);

    expect(executeCommand).toHaveBeenCalledWith(expect.anything(), undefined, 'brew', 'tap', 'azure/functions');
    expect(executeCommand).toHaveBeenCalledWith(expect.anything(), undefined, 'brew', 'install', 'azure-functions-core-tools@4');
  });

  it('rejects unsupported system package managers', async () => {
    await expect(installFuncCoreToolsSystem(context, ['unknown' as PackageManager], '4' as any)).rejects.toThrow('Invalid package manager');
  });
});
