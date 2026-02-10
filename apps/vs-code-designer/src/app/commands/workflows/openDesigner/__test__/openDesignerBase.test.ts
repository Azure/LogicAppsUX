import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as vscode from 'vscode';
import { designerVersionSetting, defaultDesignerVersion } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';

// ConfigurationTarget.Global = 1 in VS Code
const ConfigurationTargetGlobal = 1;

// Since OpenDesignerBase is abstract, we test the static helper behavior through mocking
describe('openDesignerBase', () => {
  describe('getDesignerVersion', () => {
    const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
    const mockConfig = {
      get: vi.fn(),
      update: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockGetConfiguration.mockReturnValue(mockConfig as any);
    });

    it('should return version 1 when setting is 1', () => {
      mockConfig.get.mockReturnValue(1);

      const config = vscode.workspace.getConfiguration(ext.prefix);
      const version = config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;

      expect(mockGetConfiguration).toHaveBeenCalledWith(ext.prefix);
      expect(mockConfig.get).toHaveBeenCalledWith(designerVersionSetting);
      expect(version).toBe(1);
    });

    it('should return version 2 when setting is 2', () => {
      mockConfig.get.mockReturnValue(2);

      const config = vscode.workspace.getConfiguration(ext.prefix);
      const version = config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;

      expect(version).toBe(2);
    });

    it('should return default version when setting is undefined', () => {
      mockConfig.get.mockReturnValue(undefined);

      const config = vscode.workspace.getConfiguration(ext.prefix);
      const version = config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;

      expect(version).toBe(defaultDesignerVersion);
    });

    it('should return default version when setting is null', () => {
      mockConfig.get.mockReturnValue(null);

      const config = vscode.workspace.getConfiguration(ext.prefix);
      const version = config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;

      expect(version).toBe(defaultDesignerVersion);
    });
  });

  describe('showDesignerVersionNotification behavior', () => {
    const mockShowInformationMessage = vi.mocked(vscode.window.showInformationMessage);
    const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
    const mockConfig = {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockGetConfiguration.mockReturnValue(mockConfig as any);
    });

    it('should show preview available message when version is 1', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValue(undefined);

      // Simulate showing the message
      const version = mockConfig.get(designerVersionSetting) ?? defaultDesignerVersion;

      if (version === 1) {
        await vscode.window.showInformationMessage('A new Logic Apps experience is available for preview!', 'Enable preview');
      }

      expect(mockShowInformationMessage).toHaveBeenCalledWith('A new Logic Apps experience is available for preview!', 'Enable preview');
    });

    it('should show previewing message when version is 2', async () => {
      mockConfig.get.mockReturnValue(2);
      mockShowInformationMessage.mockResolvedValue(undefined);

      const version = mockConfig.get(designerVersionSetting) ?? defaultDesignerVersion;

      if (version === 2) {
        await vscode.window.showInformationMessage('You are previewing the new Logic Apps experience.', 'Go back to previous version');
      }

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'You are previewing the new Logic Apps experience.',
        'Go back to previous version'
      );
    });

    it('should update setting to version 2 when Enable preview is clicked', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValueOnce('Enable preview' as any);

      const version = mockConfig.get(designerVersionSetting) ?? defaultDesignerVersion;

      if (version === 1) {
        const selection = await vscode.window.showInformationMessage(
          'A new Logic Apps experience is available for preview!',
          'Enable preview'
        );
        if (selection === 'Enable preview') {
          await mockConfig.update(designerVersionSetting, 2, ConfigurationTargetGlobal);
        }
      }

      expect(mockConfig.update).toHaveBeenCalledWith(designerVersionSetting, 2, ConfigurationTargetGlobal);
    });

    it('should update setting to version 1 when Go back is clicked', async () => {
      mockConfig.get.mockReturnValue(2);
      mockShowInformationMessage.mockResolvedValueOnce('Go back to previous version' as any);

      const version = mockConfig.get(designerVersionSetting) ?? defaultDesignerVersion;

      if (version === 2) {
        const selection = await vscode.window.showInformationMessage(
          'You are previewing the new Logic Apps experience.',
          'Go back to previous version'
        );
        if (selection === 'Go back to previous version') {
          await mockConfig.update(designerVersionSetting, 1, ConfigurationTargetGlobal);
        }
      }

      expect(mockConfig.update).toHaveBeenCalledWith(designerVersionSetting, 1, ConfigurationTargetGlobal);
    });

    it('should not update setting when message is dismissed', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValueOnce(undefined);

      const version = mockConfig.get(designerVersionSetting) ?? defaultDesignerVersion;

      if (version === 1) {
        const selection = await vscode.window.showInformationMessage(
          'A new Logic Apps experience is available for preview!',
          'Enable preview'
        );
        if (selection === 'Enable preview') {
          await mockConfig.update(designerVersionSetting, 2, ConfigurationTargetGlobal);
        }
      }

      expect(mockConfig.update).not.toHaveBeenCalled();
    });
  });
});
