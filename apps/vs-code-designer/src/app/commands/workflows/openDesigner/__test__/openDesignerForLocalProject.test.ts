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
  getManualWorkflowsInLocalProject: vi.fn().mockResolvedValue({}),
}));

// Mock getWebViewHTML
vi.mock('../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

// Mock connection utils
vi.mock('../../../../utils/codeless/connection', () => ({
  addConnectionData: vi.fn(),
  getConnectionsAndSettingsToUpdate: vi.fn(),
  getConnectionsFromFile: vi.fn().mockResolvedValue('{}'),
  getCustomCodeFromFiles: vi.fn().mockResolvedValue({}),
  getCustomCodeToUpdate: vi.fn().mockResolvedValue({}),
  getLogicAppProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  getParametersFromFile: vi.fn().mockResolvedValue({}),
  saveConnectionReferences: vi.fn(),
  saveCustomCodeStandard: vi.fn(),
}));

// Mock parameter utils
vi.mock('../../../../utils/codeless/parameter', () => ({
  saveWorkflowParameter: vi.fn(),
}));

// Mock appSettings
vi.mock('../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
}));

// Mock artifacts
vi.mock('../../../../utils/codeless/artifacts', () => ({
  getArtifactsInLocalProject: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
}));

// Mock startDesignTimeApi
vi.mock('../../../../utils/codeless/startDesignTimeApi', () => ({
  startDesignTimeApi: vi.fn(),
}));

// Mock requestUtils
vi.mock('../../../../utils/requestUtils', () => ({
  sendRequest: vi.fn(),
}));

// Mock dataMapper command
vi.mock('../../../dataMapper/dataMapper', () => ({
  createNewDataMapCmd: vi.fn(),
}));

// Mock createUnitTest
vi.mock('../../unitTest/codefulUnitTest/createUnitTest', () => ({
  createUnitTest: vi.fn(),
}));

// Mock bundleFeed
vi.mock('../../../../utils/bundleFeed', () => ({
  getBundleVersionNumber: vi.fn().mockResolvedValue('1.0.0'),
}));

// Mock saveUnitTestDefinition
vi.mock('../../../../utils/unitTest/codelessUnitTest', () => ({
  saveUnitTestDefinition: vi.fn(),
}));

// Mock @azure/core-rest-pipeline
vi.mock('@azure/core-rest-pipeline', () => ({
  createHttpHeaders: vi.fn().mockReturnValue({}),
}));

import OpenDesignerForLocalProject from '../openDesignerForLocalProject';

describe('OpenDesignerForLocalProject', () => {
  const mockContext = {
    telemetry: { properties: {}, measurements: {} },
  } as any;

  const mockUri = {
    fsPath: '/test/project/myWorkflow/workflow.json',
    toString: () => '/test/project/myWorkflow/workflow.json',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should construct with correct properties for regular workflow', () => {
    const designer = new OpenDesignerForLocalProject(mockContext, mockUri);
    expect(designer).toBeDefined();
  });

  it('should construct with unit test parameters', () => {
    const designer = new OpenDesignerForLocalProject(mockContext, mockUri, 'testName', { actions: {} }, 'run/id/123');
    expect(designer).toBeDefined();
  });

  it('should construct with runId extraction', () => {
    const designer = new OpenDesignerForLocalProject(mockContext, mockUri, undefined, undefined, 'workflows/myWf/runs/abc-123');
    expect(designer).toBeDefined();
  });
});
