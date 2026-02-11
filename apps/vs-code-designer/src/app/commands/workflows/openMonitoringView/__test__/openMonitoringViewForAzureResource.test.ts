import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Mock requestUtils
vi.mock('../../../../utils/requestUtils', () => ({
  sendAzureRequest: vi.fn(),
}));

// Mock getAuthorizationToken
vi.mock('../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

import openMonitoringViewForAzureResource from '../openMonitoringViewForAzureResource';

const createMockNode = () => ({
  name: 'testWorkflow',
  workflowFileContent: { definition: { triggers: { manual: { type: 'Request' } } }, kind: 'stateful' },
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

describe('openMonitoringViewForAzureResource', () => {
  const mockContext = {
    telemetry: { properties: {}, measurements: {} },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should construct with correct properties', () => {
    const node = createMockNode();
    const runId = 'subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/sites/app/workflows/testWorkflow/runs/run-123';
    const view = new openMonitoringViewForAzureResource(mockContext, runId, '/test/workflow.json', node as any);
    expect(view).toBeDefined();
  });

  it('should construct with simple runId', () => {
    const node = createMockNode();
    const view = new openMonitoringViewForAzureResource(
      mockContext,
      'workflows/testWorkflow/runs/run-456',
      '/test/workflow.json',
      node as any
    );
    expect(view).toBeDefined();
  });
});
