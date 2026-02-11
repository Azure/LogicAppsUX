import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { designerVersionSetting, defaultDesignerVersion } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';

// Mock localize
vi.mock('../../../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string) => defaultValue),
}));

// Mock common utils
vi.mock('../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
}));

// Mock getWebViewHTML
vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

// Import the actual class after mocks
import { OpenDesignerBase } from '../openDesignerBase';

// Create a concrete subclass for testing the abstract class
class TestDesigner extends OpenDesignerBase {
  constructor() {
    const mockContext = {
      telemetry: { properties: {}, measurements: {} },
    } as any;
    super(mockContext, 'testWorkflow', 'testPanel', '2018-11-01', 'testGroup', false, true, false, 'run-123');
  }

  public async createPanel(): Promise<void> {
    // No-op for testing
  }

  // Expose protected methods for testing
  public testGetDesignerVersion(): number {
    return this.getDesignerVersion();
  }

  public async testShowDesignerVersionNotification(): Promise<void> {
    return this.showDesignerVersionNotification();
  }

  public testGetPanelOptions() {
    return this.getPanelOptions();
  }

  public testGetInterpolateConnectionData(data: string) {
    return this.getInterpolateConnectionData(data);
  }

  public testGetApiHubServiceDetails(azureDetails: any, localSettings: any) {
    return this.getApiHubServiceDetails(azureDetails, localSettings);
  }

  public testNormalizeLocation(location: string) {
    return this.normalizeLocation(location);
  }

  public setPanel(panel: any) {
    this.panel = panel;
  }
}

// ConfigurationTarget.Global = 1 in VS Code
const ConfigurationTargetGlobal = 1;

describe('OpenDesignerBase', () => {
  const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
  const mockConfig = {
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const mockShowInformationMessage = vi.mocked(vscode.window.showInformationMessage);

  let designer: TestDesigner;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfiguration.mockReturnValue(mockConfig as any);
    designer = new TestDesigner();
  });

  describe('getDesignerVersion', () => {
    it('should return version 1 when setting is 1', () => {
      mockConfig.get.mockReturnValue(1);
      expect(designer.testGetDesignerVersion()).toBe(1);
      expect(mockGetConfiguration).toHaveBeenCalledWith(ext.prefix);
      expect(mockConfig.get).toHaveBeenCalledWith(designerVersionSetting);
    });

    it('should return version 2 when setting is 2', () => {
      mockConfig.get.mockReturnValue(2);
      expect(designer.testGetDesignerVersion()).toBe(2);
    });

    it('should return default version when setting is undefined', () => {
      mockConfig.get.mockReturnValue(undefined);
      expect(designer.testGetDesignerVersion()).toBe(defaultDesignerVersion);
    });

    it('should return default version when setting is null', () => {
      mockConfig.get.mockReturnValue(null);
      expect(designer.testGetDesignerVersion()).toBe(defaultDesignerVersion);
    });
  });

  describe('showDesignerVersionNotification', () => {
    it('should show preview available message when version is 1', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValue(undefined);

      await designer.testShowDesignerVersionNotification();

      expect(mockShowInformationMessage).toHaveBeenCalledWith('A new Logic Apps experience is available for preview!', 'Enable preview');
    });

    it('should update setting to version 2 when Enable preview is clicked', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValueOnce('Enable preview' as any).mockResolvedValueOnce(undefined);

      await designer.testShowDesignerVersionNotification();

      expect(mockConfig.update).toHaveBeenCalledWith(designerVersionSetting, 2, ConfigurationTargetGlobal);
    });

    it('should dispose panel when close is clicked after enabling preview', async () => {
      mockConfig.get.mockReturnValue(1);
      const mockDispose = vi.fn();
      designer.setPanel({ dispose: mockDispose });
      mockShowInformationMessage.mockResolvedValueOnce('Enable preview' as any).mockResolvedValueOnce('Close' as any);

      await designer.testShowDesignerVersionNotification();

      expect(mockDispose).toHaveBeenCalled();
    });

    it('should show previewing message when version is 2', async () => {
      mockConfig.get.mockReturnValue(2);
      mockShowInformationMessage.mockResolvedValue(undefined);

      await designer.testShowDesignerVersionNotification();

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'You are previewing the new Logic Apps experience.',
        'Go back to previous version'
      );
    });

    it('should update setting to version 1 when Go back is clicked', async () => {
      mockConfig.get.mockReturnValue(2);
      mockShowInformationMessage.mockResolvedValueOnce('Go back to previous version' as any).mockResolvedValueOnce(undefined);

      await designer.testShowDesignerVersionNotification();

      expect(mockConfig.update).toHaveBeenCalledWith(designerVersionSetting, 1, ConfigurationTargetGlobal);
    });

    it('should not update setting when message is dismissed', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValueOnce(undefined);

      await designer.testShowDesignerVersionNotification();

      expect(mockConfig.update).not.toHaveBeenCalled();
    });
  });

  describe('getPanelOptions', () => {
    it('should return panel options with scripts enabled and context retained', () => {
      const options = designer.testGetPanelOptions();
      expect(options.enableScripts).toBe(true);
      expect(options.retainContextWhenHidden).toBe(true);
    });
  });

  describe('normalizeLocation', () => {
    it('should lowercase and remove spaces', () => {
      expect(designer.testNormalizeLocation('East US')).toBe('eastus');
    });

    it('should return empty string for falsy input', () => {
      expect(designer.testNormalizeLocation('')).toBe('');
    });
  });

  describe('getInterpolateConnectionData', () => {
    it('should return falsy input as-is', () => {
      expect(designer.testGetInterpolateConnectionData('')).toBe('');
    });

    it('should handle connections data with no managed API connections', () => {
      const input = JSON.stringify({ serviceProviderConnections: {} });
      const result = designer.testGetInterpolateConnectionData(input);
      expect(JSON.parse(result)).toEqual({ serviceProviderConnections: {} });
    });
  });

  describe('getApiHubServiceDetails', () => {
    it('should return service details when API Hub is enabled', () => {
      const azureDetails = {
        enabled: true,
        subscriptionId: 'sub-123',
        location: 'eastus',
        resourceGroupName: 'rg-test',
        tenantId: 'tenant-123',
        accessToken: 'token',
      };

      const result = designer.testGetApiHubServiceDetails(azureDetails, {});
      expect(result).toBeDefined();
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.apiVersion).toBe('2018-07-01-preview');
    });

    it('should return undefined when API Hub is disabled', () => {
      const azureDetails = { enabled: false };
      const result = designer.testGetApiHubServiceDetails(azureDetails, {});
      expect(result).toBeUndefined();
    });
  });
});
