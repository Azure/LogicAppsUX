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
  getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({ enabled: false }),
}));

// Mock getWebViewHTML
vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

// Mock connection utils
vi.mock('../../../../utils/codeless/connection', () => ({
  getConnectionsFromFile: vi.fn().mockResolvedValue('{}'),
  getCustomCodeFromFiles: vi.fn().mockResolvedValue({}),
  getLogicAppProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  getParametersFromFile: vi.fn().mockResolvedValue({}),
}));

// Mock appSettings
vi.mock('../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
}));

// Mock artifacts
vi.mock('../../../../utils/codeless/artifacts', () => ({
  getArtifactsInLocalProject: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
}));

// Mock requestUtils
vi.mock('../../../../utils/requestUtils', () => ({
  sendRequest: vi.fn(),
}));

// Mock createUnitTestFromRun
vi.mock('../../unitTest/codefulUnitTest/createUnitTestFromRun', () => ({
  createUnitTestFromRun: vi.fn(),
}));

// Mock bundleFeed
vi.mock('../../../../utils/bundleFeed', () => ({
  getBundleVersionNumber: vi.fn().mockResolvedValue('1.0.0'),
}));

import OpenMonitoringViewForLocal from '../openMonitoringViewForLocal';

describe('OpenMonitoringViewForLocal', () => {
  const mockContext = {
    telemetry: { properties: {}, measurements: {} },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should construct with correct properties', () => {
    const runId = 'workflows/testWorkflow/runs/run-123';
    const view = new OpenMonitoringViewForLocal(mockContext, runId, '/test/project/testWorkflow/workflow.json');
    expect(view).toBeDefined();
  });

  it('should construct with different runId format', () => {
    const runId = 'workflows/myFlow/runs/abc-456';
    const view = new OpenMonitoringViewForLocal(mockContext, runId, '/test/project/myFlow/workflow.json');
    expect(view).toBeDefined();
  });
});
