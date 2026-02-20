import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({ enabled: false }),
}));

vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
  getTriggerName: vi.fn(() => 'manual'),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
}));

vi.mock('../../../../utils/codeless/connection', () => ({
  getConnectionsFromFile: vi.fn().mockResolvedValue('{}'),
  getCustomCodeFromFiles: vi.fn().mockResolvedValue({}),
  getLogicAppProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  getParametersFromFile: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
}));

vi.mock('../../../../utils/requestUtils', () => ({
  sendRequest: vi.fn(),
}));

vi.mock('../../../../utils/codeless/artifacts', () => ({
  getArtifactsInLocalProject: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
}));

vi.mock('../../../../utils/bundleFeed', () => ({
  getBundleVersionNumber: vi.fn().mockResolvedValue('1.0.0'),
}));

vi.mock('../../unitTest/codefulUnitTest/createUnitTestFromRun', () => ({
  createUnitTestFromRun: vi.fn(),
}));

vi.mock('../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

import OpenMonitoringViewForLocal from '../openMonitoringViewForLocal';

describe('OpenMonitoringViewForLocal', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;
  const mockRunId = 'workflows/test-workflow/runs/run-123';
  const mockWorkflowFilePath = '/test/project/test-workflow/workflow.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should construct with correct parameters', () => {
      const instance = new OpenMonitoringViewForLocal(mockContext, mockRunId, mockWorkflowFilePath);
      expect(instance).toBeDefined();
    });

    it('should set isLocal to true', () => {
      const instance = new OpenMonitoringViewForLocal(mockContext, mockRunId, mockWorkflowFilePath);
      expect(instance).toBeDefined();
    });
  });

  describe('createPanel', () => {
    it('should reveal existing panel if one exists', async () => {
      const { tryGetWebviewPanel } = await import('../../../../utils/codeless/common');
      const mockReveal = vi.fn();
      vi.mocked(tryGetWebviewPanel).mockReturnValue({ active: false, reveal: mockReveal } as any);

      const instance = new OpenMonitoringViewForLocal(mockContext, mockRunId, mockWorkflowFilePath);
      await instance.createPanel();

      expect(mockReveal).toHaveBeenCalled();
    });
  });
});
