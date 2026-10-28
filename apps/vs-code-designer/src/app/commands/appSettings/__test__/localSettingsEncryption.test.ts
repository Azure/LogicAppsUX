import * as path from 'path';
import type { Uri } from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  getFunctionsCommand: vi.fn(() => 'C:\\tools\\func.exe'),
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
vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  getFunctionsCommand: mocks.getFunctionsCommand,
}));

import { decryptLocalSettings } from '../decryptLocalSettings';
import { encryptLocalSettings } from '../encryptLocalSettings';

describe('local settings encryption commands', () => {
  const settingsPath = path.join('C:\\workspaces', 'Logic App', 'local.settings.json');
  const uri = { fsPath: settingsPath } as Uri;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts settings with the configured Functions Core Tools command', async () => {
    await encryptLocalSettings(uri);

    expect(mocks.outputChannel.show).toHaveBeenCalledWith(true);
    expect(mocks.executeCommand).toHaveBeenCalledWith(
      mocks.outputChannel,
      path.dirname(settingsPath),
      'C:\\tools\\func.exe',
      'settings',
      'encrypt'
    );
  });

  it('decrypts settings with the configured Functions Core Tools command', async () => {
    await decryptLocalSettings(uri);

    expect(mocks.outputChannel.show).toHaveBeenCalledWith(true);
    expect(mocks.executeCommand).toHaveBeenCalledWith(
      mocks.outputChannel,
      path.dirname(settingsPath),
      'C:\\tools\\func.exe',
      'settings',
      'decrypt'
    );
  });

  it('propagates Core Tools failures', async () => {
    mocks.executeCommand.mockRejectedValueOnce(new Error('func failed'));

    await expect(encryptLocalSettings(uri)).rejects.toThrow('func failed');
  });
});
