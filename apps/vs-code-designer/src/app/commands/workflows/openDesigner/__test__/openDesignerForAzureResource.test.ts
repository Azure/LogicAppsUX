import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// Mock localize
vi.mock('../../../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string) => defaultValue),
}));

// Mock common utils
vi.mock('../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  getStandardAppData: vi.fn().mockReturnValue({ kind: 'stateful', definition: {} }),
  getWorkflowManagementBaseURI: vi.fn().mockReturnValue('https://management.azure.com'),
}));

// Mock getWebViewHTML
vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

// Mock getAuthorizationToken
vi.mock('../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

import { OpenDesignerForAzureResource } from '../openDesignerForAzureResource';

const createMockNode = () => ({
  name: 'testWorkflow',
  workflowFileContent: { definition: {}, kind: 'stateful' },
  subscription: {
    subscriptionId: 'sub-123',
    credentials: { getToken: vi.fn().mockResolvedValue('token') },
    environment: { resourceManagerEndpointUrl: 'https://management.azure.com' },
    tenantId: 'tenant-123',
  },
  parent: {
    parent: {
      site: { location: 'East US', resourceGroup: 'rg-test', defaultHostName: 'test.azurewebsites.net' },
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
  const mockContext = {
    telemetry: { properties: {}, measurements: {} },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should construct with correct properties', () => {
    const node = createMockNode();
    const designer = new OpenDesignerForAzureResource(mockContext, node as any);
    expect(designer).toBeDefined();
  });

  it('should have createPanel method', () => {
    const node = createMockNode();
    const designer = new OpenDesignerForAzureResource(mockContext, node as any);
    expect(typeof designer.createPanel).toBe('function');
  });
});
