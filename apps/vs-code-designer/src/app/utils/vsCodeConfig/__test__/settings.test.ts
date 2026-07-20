import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { createSettingsDetails, removeSharedSetting } from '../settings';
import { ext } from '../../../../extensionVariables';

describe('utils/vsCodeConfig/settings', () => {
  describe('createSettingsDetails', () => {
    const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
    const mockConfig = {
      get: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockGetConfiguration.mockReturnValue(mockConfig as any);
    });

    it('should return settings for provided keys', () => {
      const settingsList = ['setting1', 'setting2', 'setting3'];
      mockConfig.get.mockReturnValueOnce(true).mockReturnValueOnce('value2').mockReturnValueOnce(42);

      const result = createSettingsDetails(settingsList);

      expect(mockGetConfiguration).toHaveBeenCalledWith(ext.prefix);
      expect(mockConfig.get).toHaveBeenCalledTimes(3);
      expect(mockConfig.get).toHaveBeenNthCalledWith(1, 'setting1');
      expect(mockConfig.get).toHaveBeenNthCalledWith(2, 'setting2');
      expect(mockConfig.get).toHaveBeenNthCalledWith(3, 'setting3');
      expect(result).toEqual({
        setting1: true,
        setting2: 'value2',
        setting3: 42,
      });
    });

    it('should default null values to false', () => {
      const settingsList = ['nullSetting', 'undefinedSetting'];
      mockConfig.get.mockReturnValueOnce(null).mockReturnValueOnce(undefined);

      const result = createSettingsDetails(settingsList);

      expect(result).toEqual({
        nullSetting: false,
        undefinedSetting: false,
      });
    });

    it('should handle mixed null/undefined and valid values', () => {
      const settingsList = ['validSetting', 'nullSetting', 'anotherValidSetting'];
      mockConfig.get.mockReturnValueOnce('validValue').mockReturnValueOnce(null).mockReturnValueOnce(true);

      const result = createSettingsDetails(settingsList);

      expect(result).toEqual({
        validSetting: 'validValue',
        nullSetting: false,
        anotherValidSetting: true,
      });
    });

    it('should handle empty settings list', () => {
      const result = createSettingsDetails([]);

      expect(mockGetConfiguration).toHaveBeenCalledWith(ext.prefix);
      expect(mockConfig.get).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should return empty object on configuration error', () => {
      mockGetConfiguration.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const result = createSettingsDetails(['setting1']);

      expect(result).toEqual({});
    });

    it('should return empty object when get method throws error', () => {
      mockConfig.get.mockImplementation(() => {
        throw new Error('Get method error');
      });

      const result = createSettingsDetails(['setting1']);

      expect(result).toEqual({});
    });

    it('should preserve falsy boolean values (not convert to false)', () => {
      const settingsList = ['falseSetting', 'zeroSetting', 'emptySetting'];
      mockConfig.get.mockReturnValueOnce(false).mockReturnValueOnce(0).mockReturnValueOnce('');

      const result = createSettingsDetails(settingsList);

      expect(result).toEqual({
        falseSetting: false,
        zeroSetting: 0,
        emptySetting: '',
      });
    });
  });

  describe('removeSharedSetting', () => {
    const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
    let update: ReturnType<typeof vi.fn>;
    let mockConfig: { update: ReturnType<typeof vi.fn>; inspect: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      vi.clearAllMocks();
      update = vi.fn().mockResolvedValue(undefined);
      mockConfig = {
        update,
        // Default: a value exists in every scope, so every scope is a removal candidate.
        inspect: vi.fn().mockReturnValue({
          globalValue: ['/global/path'],
          workspaceValue: ['/workspace/path'],
          workspaceFolderValue: ['/folder/path'],
        }),
      };
      mockGetConfiguration.mockReturnValue(mockConfig as any);
      (vscode.workspace as any).workspaceFolders = [];
    });

    it('removes the value from the workspace (.code-workspace) scope', async () => {
      await removeSharedSetting('dotNetCliPaths', 'omnisharp');

      expect(mockGetConfiguration).toHaveBeenCalledWith('omnisharp');
      expect(update).toHaveBeenCalledWith('dotNetCliPaths', undefined, vscode.ConfigurationTarget.Workspace);
      // A shared value existed and was removed, so the summary line is logged.
      const summaryLogs = vi
        .mocked(ext.outputChannel?.appendLog as any)
        .mock.calls.filter((call: any[]) => String(call[0]).includes('-> global='));
      expect(summaryLogs).toHaveLength(1);
    });

    it('removes the value from each workspace folder scope', async () => {
      const folderA = { uri: vscode.Uri.file('/ws/logicapp') };
      const folderB = { uri: vscode.Uri.file('/ws/functions') };
      (vscode.workspace as any).workspaceFolders = [folderA, folderB];

      await removeSharedSetting('azurite.location', 'azurite');

      expect(mockGetConfiguration).toHaveBeenCalledWith('azurite', folderA.uri);
      expect(mockGetConfiguration).toHaveBeenCalledWith('azurite', folderB.uri);
      expect(update).toHaveBeenCalledWith('azurite.location', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
      // workspace scope (1) + two folder scopes (2) = 3 update calls
      expect(update).toHaveBeenCalledTimes(3);
    });

    it('skips scopes that have no value (application/window-scoped settings) without logging', async () => {
      // Value only exists globally — no workspace or folder value to remove.
      mockConfig.inspect.mockReturnValue({ globalValue: { PATH: '/global/path' } });
      (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/ws/logicapp') }];

      await removeSharedSetting('integrated.env.windows', 'terminal');

      // No removal attempted because there is nothing to remove in those scopes.
      expect(update).not.toHaveBeenCalled();
      // And nothing is logged at all — no "Skipped" errors and no summary line for a no-op.
      expect(ext.outputChannel?.appendLog).not.toHaveBeenCalled();
    });

    it('does not throw when an update fails and logs the skip', async () => {
      update.mockRejectedValueOnce(new Error('window scoped setting'));

      await expect(removeSharedSetting('integrated.env.windows', 'terminal')).resolves.toBeUndefined();
      expect(ext.outputChannel?.appendLog).toHaveBeenCalled();
    });
  });
});
