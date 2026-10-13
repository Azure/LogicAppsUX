import { PackageManager } from '../../../../constants';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  getFuncPackageManagers: vi.fn(),
  tryGetInstalledBrewPackageName: vi.fn(),
  tryGetLocalFuncVersion: vi.fn(),
  outputChannel: {
    show: vi.fn(),
  },
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: mocks.outputChannel,
  },
}));
vi.mock('../../../utils/funcCoreTools/cpUtils', () => ({
  executeCommand: mocks.executeCommand,
}));
vi.mock('../../../utils/funcCoreTools/getBrewPackageName', () => ({
  tryGetInstalledBrewPackageName: mocks.tryGetInstalledBrewPackageName,
}));
vi.mock('../../../utils/funcCoreTools/getFuncPackageManagers', () => ({
  getFuncPackageManagers: mocks.getFuncPackageManagers,
}));
vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  tryGetLocalFuncVersion: mocks.tryGetLocalFuncVersion,
}));

import { uninstallFuncCoreTools } from '../uninstallFuncCoreTools';

describe('uninstallFuncCoreTools', () => {
  const createContext = (selectedManager = PackageManager.npm): IActionContext =>
    ({
      ui: {
        showQuickPick: vi.fn().mockResolvedValue({ data: selectedManager }),
      },
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { issueProperties: {} },
      valuesToMask: [],
    }) as unknown as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uninstalls the npm package', async () => {
    await uninstallFuncCoreTools(createContext(), [PackageManager.npm]);

    expect(mocks.executeCommand).toHaveBeenCalledWith(
      mocks.outputChannel,
      undefined,
      'npm',
      'uninstall',
      '-g',
      'azure-functions-core-tools'
    );
  });

  it('uninstalls the detected Homebrew package', async () => {
    mocks.tryGetLocalFuncVersion.mockResolvedValue('4');
    mocks.tryGetInstalledBrewPackageName.mockResolvedValue('azure-functions-core-tools@4');

    await uninstallFuncCoreTools(createContext(PackageManager.brew), [PackageManager.brew]);

    expect(mocks.tryGetInstalledBrewPackageName).toHaveBeenCalledWith('4');
    expect(mocks.executeCommand).toHaveBeenCalledWith(mocks.outputChannel, undefined, 'brew', 'uninstall', 'azure-functions-core-tools@4');
  });

  it('prompts when multiple package-manager installations are found', async () => {
    const context = createContext(PackageManager.npm);

    await uninstallFuncCoreTools(context, [PackageManager.npm, PackageManager.brew]);

    expect(context.ui.showQuickPick).toHaveBeenCalledWith(
      [
        { label: 'Uninstall npm package', data: PackageManager.npm },
        { label: 'Uninstall brew package', data: PackageManager.brew },
      ],
      {
        placeHolder: 'Multiple Functions Core Tools installations detected. Select one to uninstall.',
      }
    );
  });

  it('reports when no npm or Homebrew installation exists', async () => {
    mocks.getFuncPackageManagers.mockResolvedValue([]);

    await expect(uninstallFuncCoreTools(createContext())).rejects.toThrow(
      'Cannot uninstall Azure Functions Core Tools because it is not installed with npm or Homebrew.'
    );
  });
});
