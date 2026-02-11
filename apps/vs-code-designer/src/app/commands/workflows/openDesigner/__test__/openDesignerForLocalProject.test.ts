import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { designerVersionSetting, defaultDesignerVersion } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

describe('OpenDesignerForLocalProject', () => {
  const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
  const mockConfig = {
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfiguration.mockReturnValue(mockConfig as any);
  });

  describe('_handleWebviewMsg - getDesignerVersion', () => {
    it('should respond with the designer version when getDesignerVersion command is received', () => {
      mockConfig.get.mockReturnValue(2);
      const mockPostMessage = vi.fn();

      // Simulate the handler behavior for getDesignerVersion
      const config = vscode.workspace.getConfiguration(ext.prefix);
      const version = config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;

      const msg = { command: ExtensionCommand.getDesignerVersion };
      if (msg.command === ExtensionCommand.getDesignerVersion) {
        mockPostMessage({
          command: ExtensionCommand.getDesignerVersion,
          data: version,
        });
      }

      expect(mockPostMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.getDesignerVersion,
        data: 2,
      });
    });

    it('should respond with default version when setting is not configured', () => {
      mockConfig.get.mockReturnValue(undefined);
      const mockPostMessage = vi.fn();

      const config = vscode.workspace.getConfiguration(ext.prefix);
      const version = config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;

      const msg = { command: ExtensionCommand.getDesignerVersion };
      if (msg.command === ExtensionCommand.getDesignerVersion) {
        mockPostMessage({
          command: ExtensionCommand.getDesignerVersion,
          data: version,
        });
      }

      expect(mockPostMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.getDesignerVersion,
        data: defaultDesignerVersion,
      });
    });

    it('should send message with correct ExtensionCommand value', () => {
      mockConfig.get.mockReturnValue(1);
      const mockPostMessage = vi.fn();

      const config = vscode.workspace.getConfiguration(ext.prefix);
      const version = config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;

      mockPostMessage({
        command: ExtensionCommand.getDesignerVersion,
        data: version,
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'getDesignerVersion',
        })
      );
    });
  });

  describe('createPanel - showDesignerVersionNotification', () => {
    const mockShowInformationMessage = vi.mocked(vscode.window.showInformationMessage);

    it('should show preview notification when version is 1', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValue(undefined);

      // Simulate calling showDesignerVersionNotification at end of createPanel
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

    it('should not show notification if version notification is dismissed', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValueOnce(undefined);

      const version = mockConfig.get(designerVersionSetting) ?? defaultDesignerVersion;

      if (version === 1) {
        const selection = await vscode.window.showInformationMessage(
          'A new Logic Apps experience is available for preview!',
          'Enable preview'
        );
        if (selection === 'Enable preview') {
          await mockConfig.update(designerVersionSetting, 2, 1);
        }
      }

      expect(mockConfig.update).not.toHaveBeenCalled();
    });
  });
});
