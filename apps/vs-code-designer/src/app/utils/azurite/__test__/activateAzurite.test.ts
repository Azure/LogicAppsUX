import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  autoStartAzuriteSetting,
  azuriteBinariesLocationSetting,
  azuriteExtensionPrefix,
  azuriteLocationSetting,
  defaultAzuritePathValue,
  showAutoStartAzuriteWarning,
} from '../../../../constants';
import { executeOnAzurite } from '../../../azuriteExtension/executeOnAzuriteExt';
import { validateEmulatorIsRunning } from '../../../debug/validatePreDebug';
import { updateWorkspaceSetting } from '../../vsCodeConfig/settings';
import { activateAzurite } from '../activateAzurite';

vi.mock('../../../azuriteExtension/executeOnAzuriteExt', () => ({
  executeOnAzurite: vi.fn(),
}));

vi.mock('../../../debug/validatePreDebug', () => ({
  validateEmulatorIsRunning: vi.fn(),
}));

vi.mock('../../delay', () => ({
  delay: vi.fn(),
}));

vi.mock('../../verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../../workspace', () => ({
  getWorkspaceFolder: vi.fn(),
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn((key: string, _projectPath?: string, prefix?: string) => {
    if (key === azuriteLocationSetting && prefix === azuriteExtensionPrefix) {
      return undefined;
    }

    if (key === azuriteBinariesLocationSetting) {
      return defaultAzuritePathValue;
    }

    if (key === showAutoStartAzuriteWarning) {
      return false;
    }

    if (key === autoStartAzuriteSetting) {
      return true;
    }

    return undefined;
  }),
  updateGlobalSetting: vi.fn(),
  updateWorkspaceSetting: vi.fn(),
}));

describe('activateAzurite', () => {
  const projectPath = 'D:\\workspace\\LogicApp';
  const context = {
    telemetry: {
      properties: {},
      measurements: {},
    },
    ui: {
      showWarningMessage: vi.fn(),
      showInputBox: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: projectPath } }];
    context.telemetry.properties = {};
  });

  it('waits for Azurite to become ready after starting it', async () => {
    vi.mocked(validateEmulatorIsRunning).mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await activateAzurite(context, projectPath);

    expect(updateWorkspaceSetting).toHaveBeenCalledWith(
      azuriteLocationSetting,
      defaultAzuritePathValue,
      projectPath,
      azuriteExtensionPrefix
    );
    expect(executeOnAzurite).toHaveBeenCalledTimes(1);
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(1, context, projectPath, false);
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(2, context, projectPath, false);
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(3, context, projectPath, false);
    expect(context.telemetry.properties.azuriteReady).toBe('true');
  });
});
