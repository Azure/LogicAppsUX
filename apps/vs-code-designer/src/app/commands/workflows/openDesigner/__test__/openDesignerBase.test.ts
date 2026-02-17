import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { designerVersionSetting, defaultDesignerVersion } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';

// Mock dependencies before importing the class
vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
}));

vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
}));

// Import the actual class after mocks
import { OpenDesignerBase } from '../openDesignerBase';

// Concrete subclass to test the abstract class
class TestDesigner extends OpenDesignerBase {
  constructor(context?: any) {
    super(
      context ?? { telemetry: { properties: {}, measurements: {} } },
      'test-workflow',
      'test-panel',
      '2018-11-01',
      'test-key',
      false,
      true,
      false,
      ''
    );
  }

  async createPanel(): Promise<void> {}

  // Expose protected methods for testing
  public testGetDesignerVersion() {
    return this.getDesignerVersion();
  }
  public async testShowDesignerVersionNotification() {
    return this.showDesignerVersionNotification();
  }
  public testNormalizeLocation(location: string) {
    return this.normalizeLocation(location);
  }
  public testGetPanelOptions() {
    return this.getPanelOptions();
  }
  public testGetApiHubServiceDetails(azureDetails: any, localSettings: any) {
    return this.getApiHubServiceDetails(azureDetails, localSettings);
  }
  public testGetInterpolateConnectionData(data: string) {
    return this.getInterpolateConnectionData(data);
  }
  public setTestPanel(panel: any) {
    this.panel = panel;
  }
}

describe('OpenDesignerBase', () => {
  const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
  const mockShowInformationMessage = vi.mocked(vscode.window.showInformationMessage);
  const mockConfig = {
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };
  let designer: TestDesigner;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfiguration.mockReturnValue(mockConfig as any);
    designer = new TestDesigner();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(designer).toBeDefined();
    });
  });

  describe('getDesignerVersion', () => {
    it('should return version from config when set to 2', () => {
      mockConfig.get.mockReturnValue(2);
      expect(designer.testGetDesignerVersion()).toBe(2);
      expect(mockGetConfiguration).toHaveBeenCalledWith(ext.prefix);
      expect(mockConfig.get).toHaveBeenCalledWith(designerVersionSetting);
    });

    it('should return version from config when set to 1', () => {
      mockConfig.get.mockReturnValue(1);
      expect(designer.testGetDesignerVersion()).toBe(1);
    });

    it('should return default version when config is undefined', () => {
      mockConfig.get.mockReturnValue(undefined);
      expect(designer.testGetDesignerVersion()).toBe(defaultDesignerVersion);
    });

    it('should return default version when config is null', () => {
      mockConfig.get.mockReturnValue(null);
      expect(designer.testGetDesignerVersion()).toBe(defaultDesignerVersion);
    });
  });

  describe('showDesignerVersionNotification', () => {
    it('should show preview available message when version is 1', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValue(undefined);
      designer.setTestPanel({ dispose: vi.fn() });

      await designer.testShowDesignerVersionNotification();

      expect(mockShowInformationMessage).toHaveBeenCalledWith('A new Logic Apps experience is available for preview!', 'Enable preview');
    });

    it('should show previewing message when version is 2', async () => {
      mockConfig.get.mockReturnValue(2);
      mockShowInformationMessage.mockResolvedValue(undefined);
      designer.setTestPanel({ dispose: vi.fn() });

      await designer.testShowDesignerVersionNotification();

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'You are previewing the new Logic Apps experience.',
        'Go back to previous version'
      );
    });

    it('should update setting to version 2 when Enable preview is clicked', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValueOnce('Enable preview' as any).mockResolvedValueOnce(undefined);
      designer.setTestPanel({ dispose: vi.fn() });

      await designer.testShowDesignerVersionNotification();

      expect(mockConfig.update).toHaveBeenCalledWith(designerVersionSetting, 2, expect.anything());
    });

    it('should update setting to version 1 when Go back is clicked', async () => {
      mockConfig.get.mockReturnValue(2);
      mockShowInformationMessage.mockResolvedValueOnce('Go back to previous version' as any).mockResolvedValueOnce(undefined);
      designer.setTestPanel({ dispose: vi.fn() });

      await designer.testShowDesignerVersionNotification();

      expect(mockConfig.update).toHaveBeenCalledWith(designerVersionSetting, 1, expect.anything());
    });

    it('should not update setting when notification is dismissed', async () => {
      mockConfig.get.mockReturnValue(1);
      mockShowInformationMessage.mockResolvedValue(undefined);
      designer.setTestPanel({ dispose: vi.fn() });

      await designer.testShowDesignerVersionNotification();

      expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('should dispose panel when Close is clicked after enabling preview', async () => {
      mockConfig.get.mockReturnValue(1);
      const mockDispose = vi.fn();
      mockShowInformationMessage.mockResolvedValueOnce('Enable preview' as any).mockResolvedValueOnce('Close' as any);
      designer.setTestPanel({ dispose: mockDispose });

      await designer.testShowDesignerVersionNotification();

      expect(mockDispose).toHaveBeenCalled();
    });
  });

  describe('normalizeLocation', () => {
    it('should lowercase and remove spaces', () => {
      expect(designer.testNormalizeLocation('West US')).toBe('westus');
    });

    it('should handle already normalized location', () => {
      expect(designer.testNormalizeLocation('westus')).toBe('westus');
    });

    it('should return empty string for empty input', () => {
      expect(designer.testNormalizeLocation('')).toBe('');
    });
  });

  describe('getPanelOptions', () => {
    it('should return options with scripts enabled and context retained', () => {
      const options = designer.testGetPanelOptions();
      expect(options.enableScripts).toBe(true);
      expect(options.retainContextWhenHidden).toBe(true);
    });
  });

  describe('getApiHubServiceDetails', () => {
    it('should return service details when API hub is enabled', () => {
      const azureDetails = {
        enabled: true,
        subscriptionId: 'sub-123',
        location: 'westus',
        resourceGroupName: 'rg-test',
        tenantId: 'tenant-123',
        accessToken: 'token-123',
      };
      const result = designer.testGetApiHubServiceDetails(azureDetails, {});

      expect(result).toBeDefined();
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.apiVersion).toBe('2018-07-01-preview');
    });

    it('should return undefined when API hub is disabled', () => {
      const azureDetails = { enabled: false };
      const result = designer.testGetApiHubServiceDetails(azureDetails, {});
      expect(result).toBeUndefined();
    });
  });

  describe('getInterpolateConnectionData', () => {
    it('should return falsy data as-is', () => {
      expect(designer.testGetInterpolateConnectionData('')).toBe('');
    });

    it('should handle connections data with no managed API connections', () => {
      const data = JSON.stringify({ serviceProviderConnections: {} });
      const result = designer.testGetInterpolateConnectionData(data);
      expect(JSON.parse(result)).toEqual({ serviceProviderConnections: {} });
    });
  });
});
