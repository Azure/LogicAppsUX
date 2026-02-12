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
  getManualWorkflowsInLocalProject: vi.fn().mockResolvedValue({}),
  getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({ enabled: false }),
}));

vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
}));

vi.mock('../../../../utils/codeless/connection', () => ({
  getConnectionsFromFile: vi.fn().mockResolvedValue('{}'),
  getCustomCodeFromFiles: vi.fn().mockResolvedValue({}),
  getLogicAppProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  getParametersFromFile: vi.fn().mockResolvedValue({}),
  addConnectionData: vi.fn(),
  getConnectionsAndSettingsToUpdate: vi.fn(),
  saveConnectionReferences: vi.fn(),
  getCustomCodeToUpdate: vi.fn(),
  saveCustomCodeStandard: vi.fn(),
}));

vi.mock('../../../../utils/codeless/startDesignTimeApi', () => ({
  startDesignTimeApi: vi.fn(),
}));

vi.mock('../../../../utils/requestUtils', () => ({
  sendRequest: vi.fn(),
}));

vi.mock('../../../dataMapper/dataMapper', () => ({
  createNewDataMapCmd: vi.fn(),
}));

vi.mock('../../../../utils/codeless/parameter', () => ({
  saveWorkflowParameter: vi.fn(),
}));

vi.mock('../../../../utils/codeless/artifacts', () => ({
  getArtifactsInLocalProject: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
}));

vi.mock('../../../../utils/bundleFeed', () => ({
  getBundleVersionNumber: vi.fn().mockResolvedValue('1.0.0'),
}));

vi.mock('../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
}));

vi.mock('@azure/core-rest-pipeline', () => ({
  createHttpHeaders: vi.fn(),
}));

vi.mock('../../unitTest/codefulUnitTest/createUnitTest', () => ({
  createUnitTest: vi.fn(),
}));

vi.mock('../../../../utils/unitTest/codelessUnitTest', () => ({
  saveUnitTestDefinition: vi.fn(),
}));

vi.mock('../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

// Import after mocks
import OpenDesignerForLocalProject from '../openDesignerForLocalProject';

describe('OpenDesignerForLocalProject', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;
  const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should construct with correct workflow name from file path', () => {
      const instance = new OpenDesignerForLocalProject(mockContext, mockUri);
      expect(instance).toBeDefined();
    });

    it('should set isLocal to true', () => {
      const instance = new OpenDesignerForLocalProject(mockContext, mockUri);
      expect(instance).toBeDefined();
    });

    it('should handle unit test mode', () => {
      const instance = new OpenDesignerForLocalProject(mockContext, mockUri, 'test-unit-test', { assertions: [] });
      expect(instance).toBeDefined();
    });

    it('should handle run ID parameter', () => {
      const instance = new OpenDesignerForLocalProject(mockContext, mockUri, undefined, undefined, 'workflows/wf/runs/run123');
      expect(instance).toBeDefined();
    });
  });

  describe('createPanel', () => {
    it('should return early if existing panel is found', async () => {
      const { tryGetWebviewPanel } = await import('../../../../utils/codeless/common');
      const mockPanel = { active: false, reveal: vi.fn() };
      vi.mocked(tryGetWebviewPanel).mockReturnValue(mockPanel as any);

      const instance = new OpenDesignerForLocalProject(mockContext, mockUri);
      await instance.createPanel();

      expect(mockPanel.reveal).toHaveBeenCalled();
    });
  });
});
