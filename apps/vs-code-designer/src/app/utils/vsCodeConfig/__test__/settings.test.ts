import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { createSettingsDetails } from '../settings';
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
});
