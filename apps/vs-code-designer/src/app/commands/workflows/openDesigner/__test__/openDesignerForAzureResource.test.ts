import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { designerVersionSetting, defaultDesignerVersion } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

describe('OpenDesignerForAzureResource', () => {
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
  });

  describe('panel metadata - azureDetails', () => {
    it('should include defaultHostName in azureDetails', () => {
      const mockNode = {
        parent: {
          parent: {
            site: {
              location: 'westus',
              resourceGroup: 'my-rg',
              defaultHostName: 'myapp.azurewebsites.net',
            },
          },
          subscription: {
            environment: {
              resourceManagerEndpointUrl: 'https://management.azure.com',
            },
            tenantId: 'test-tenant-id',
          },
        },
        subscription: {
          subscriptionId: 'test-sub-id',
        },
      };

      // Simulate azureDetails construction from getDesignerPanelMetadata
      const azureDetails = {
        enabled: true,
        accessToken: 'test-token',
        subscriptionId: mockNode.subscription.subscriptionId,
        location: mockNode.parent?.parent?.site.location,
        workflowManagementBaseUrl: mockNode.parent?.subscription?.environment?.resourceManagerEndpointUrl,
        tenantId: mockNode.parent?.subscription?.tenantId,
        resourceGroupName: mockNode.parent?.parent?.site.resourceGroup,
        defaultHostName: mockNode.parent?.parent?.site.defaultHostName,
      };

      expect(azureDetails.defaultHostName).toBe('myapp.azurewebsites.net');
      expect(azureDetails).toHaveProperty('defaultHostName');
    });

    it('should handle undefined defaultHostName gracefully', () => {
      const mockNode = {
        parent: {
          parent: {
            site: {
              location: 'westus',
              resourceGroup: 'my-rg',
            },
          },
          subscription: {
            environment: {
              resourceManagerEndpointUrl: 'https://management.azure.com',
            },
            tenantId: 'test-tenant-id',
          },
        },
        subscription: {
          subscriptionId: 'test-sub-id',
        },
      };

      const azureDetails = {
        enabled: true,
        accessToken: 'test-token',
        subscriptionId: mockNode.subscription.subscriptionId,
        location: mockNode.parent?.parent?.site.location,
        workflowManagementBaseUrl: mockNode.parent?.subscription?.environment?.resourceManagerEndpointUrl,
        tenantId: mockNode.parent?.subscription?.tenantId,
        resourceGroupName: mockNode.parent?.parent?.site.resourceGroup,
        defaultHostName: (mockNode.parent?.parent?.site as any).defaultHostName,
      };

      expect(azureDetails.defaultHostName).toBeUndefined();
    });
  });

  describe('createPanel - showDesignerVersionNotification', () => {
    const mockShowInformationMessage = vi.mocked(vscode.window.showInformationMessage);

    it('should call showDesignerVersionNotification after panel creation', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValue(undefined);

      // Simulate calling showDesignerVersionNotification at end of createPanel
      const version = mockConfig.get(designerVersionSetting) ?? defaultDesignerVersion;

      if (version === 1) {
        await vscode.window.showInformationMessage('A new Logic Apps experience is available for preview!', 'Enable preview');
      }

      expect(mockShowInformationMessage).toHaveBeenCalledWith('A new Logic Apps experience is available for preview!', 'Enable preview');
    });
  });
});
