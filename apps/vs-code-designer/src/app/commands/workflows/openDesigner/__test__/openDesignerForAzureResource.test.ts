import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../../extensionVariables';

// Mock dependencies before importing the class
vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  getStandardAppData: vi.fn(() => ({ definition: {}, kind: 'Stateful' })),
  getWorkflowManagementBaseURI: vi.fn(() => 'https://management.azure.com/test'),
}));

vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
}));

vi.mock('../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

import { OpenDesignerForAzureResource } from '../openDesignerForAzureResource';

const createMockNode = (overrides: Record<string, any> = {}) => ({
  name: 'test-workflow',
  workflowFileContent: { definition: {} },
  subscription: {
    subscriptionId: 'sub-123',
    credentials: { getToken: vi.fn().mockResolvedValue('token') },
  },
  parent: {
    parent: {
      site: {
        location: 'West US',
        resourceGroup: 'test-rg',
        defaultHostName: 'myapp.azurewebsites.net',
        ...overrides,
      },
    },
    subscription: {
      environment: { resourceManagerEndpointUrl: 'https://management.azure.com' },
      tenantId: 'tenant-123',
    },
  },
  getConnectionsData: vi.fn().mockResolvedValue('{}'),
  getParametersData: vi.fn().mockResolvedValue({}),
  getAppSettings: vi.fn().mockResolvedValue({}),
  getArtifacts: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
  getChildWorkflows: vi.fn().mockResolvedValue({}),
});

describe('OpenDesignerForAzureResource', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should construct with correct workflow name from node', () => {
      const mockNode = createMockNode();
      const instance = new OpenDesignerForAzureResource(mockContext, mockNode as any);
      expect(instance).toBeDefined();
    });

    it('should set base URL from node', () => {
      const mockNode = createMockNode();
      const instance = new OpenDesignerForAzureResource(mockContext, mockNode as any);
      expect(instance).toBeDefined();
    });
  });

  describe('createPanel', () => {
    it('should reveal existing panel if one exists', async () => {
      const { tryGetWebviewPanel } = await import('../../../../utils/codeless/common');
      const mockReveal = vi.fn();
      vi.mocked(tryGetWebviewPanel).mockReturnValue({ active: false, reveal: mockReveal } as any);

      const mockNode = createMockNode();
      const instance = new OpenDesignerForAzureResource(mockContext, mockNode as any);
      await instance.createPanel();

      expect(mockReveal).toHaveBeenCalled();
    });

    it('should create new panel and call showDesignerVersionNotification', async () => {
      const { tryGetWebviewPanel, cacheWebviewPanel } = await import('../../../../utils/codeless/common');
      vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);

      const mockPostMessage = vi.fn();
      const mockPanel = {
        webview: { html: '', onDidReceiveMessage: vi.fn(), postMessage: mockPostMessage },
        onDidDispose: vi.fn(),
        iconPath: undefined,
      };
      vi.mocked(vscode.window as any).createWebviewPanel = vi.fn().mockReturnValue(mockPanel);
      ext.context = { extensionPath: '/test', subscriptions: [] } as any;

      const mockShowInfo = vi.mocked(vscode.window.showInformationMessage);
      const mockGetConfig = vi.mocked(vscode.workspace.getConfiguration);
      mockGetConfig.mockReturnValue({ get: vi.fn().mockReturnValue(1), update: vi.fn() } as any);
      mockShowInfo.mockResolvedValue(undefined);

      const mockNode = createMockNode();
      const instance = new OpenDesignerForAzureResource(mockContext, mockNode as any);
      await instance.createPanel();

      expect(cacheWebviewPanel).toHaveBeenCalled();
      // showDesignerVersionNotification was called (shows v1 message)
      expect(mockShowInfo).toHaveBeenCalledWith('A new Logic Apps experience is available for preview!', 'Enable preview');
    });
  });
});
