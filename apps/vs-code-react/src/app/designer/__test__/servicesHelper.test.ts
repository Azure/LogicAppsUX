import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all service constructors and dependencies
vi.mock('@microsoft/logic-apps-shared', () => ({
  StandardConnectionService: vi.fn().mockImplementation(() => ({})),
  StandardOperationManifestService: vi.fn().mockImplementation(() => ({})),
  StandardSearchService: vi.fn().mockImplementation(() => ({})),
  BaseGatewayService: vi.fn().mockImplementation(() => ({})),
  StandardRunService: vi.fn().mockImplementation(() => ({})),
  StandardArtifactService: vi.fn().mockImplementation(() => ({})),
  BaseApiManagementService: vi.fn().mockImplementation(() => ({})),
  BaseFunctionService: vi.fn().mockImplementation(() => ({})),
  BaseAppServiceService: vi.fn().mockImplementation(() => ({ getOperationSchema: vi.fn(), getOperations: vi.fn() })),
  BaseTenantService: vi.fn().mockImplementation(() => ({})),
  BaseCognitiveServiceService: vi.fn().mockImplementation(() => ({})),
  BaseRoleService: vi.fn().mockImplementation(() => ({})),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
  clone: vi.fn((obj: any) => JSON.parse(JSON.stringify(obj))),
  isEmptyString: vi.fn((s: string) => !s || s.trim() === ''),
  resolveConnectionsReferences: vi.fn((data: string) => JSON.parse(data)),
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    addConnection: 'addConnection',
    showContent: 'showContent',
    createFileSystemConnection: 'createFileSystemConnection',
    openRelativeLink: 'openRelativeLink',
  },
  HttpClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@microsoft/logic-apps-designer', () => ({
  getReactQueryClient: vi.fn(() => ({ fetchQuery: vi.fn() })),
}));

vi.mock('../services/oAuth', () => ({
  BaseOAuthService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../customEditorService', () => ({
  CustomEditorService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../services/Logger', () => ({
  LoggerService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../services/customConnectionParameterEditorService', () => ({
  CustomConnectionParameterEditorService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../services/connector', () => ({
  StandardVSCodeConnectorService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../services/workflowService', () => ({
  fetchAgentUrl: vi.fn().mockResolvedValue({ agentUrl: '', chatUrl: '', hostName: '' }),
}));

vi.mock('../constants', () => ({
  clientSupportedOperations: [],
}));

vi.mock('../../../../package.json', () => ({
  default: { version: '1.0.0' },
}));

import { getDesignerServices } from '../servicesHelper';

describe('servicesHelper', () => {
  const mockVscode = {
    postMessage: vi.fn(),
  };

  const mockQueryClient = {} as any;
  const mockSendMsg = vi.fn();
  const mockSetRunId = vi.fn();
  const mockCreateFSConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all required services', () => {
    const services = getDesignerServices(
      'http://localhost:7071',
      'http://localhost:7071/runtime',
      false,
      '2018-11-01',
      { subscriptionId: 'sub-123', resourceGroup: 'rg', location: 'eastus' } as any,
      true,
      {},
      null,
      mockCreateFSConnection,
      mockVscode as any,
      'http://redirect',
      '1.0.0',
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    expect(services).toBeDefined();
    expect(services.connectionService).toBeDefined();
    expect(services.workflowService).toBeDefined();
    expect(services.hostService).toBeDefined();
    expect(services.runService).toBeDefined();
    expect(services.searchService).toBeDefined();
    expect(services.oAuthService).toBeDefined();
    expect(services.editorService).toBeDefined();
    expect(services.loggerService).toBeDefined();
  });

  it('should return services with panel metadata', () => {
    const panelMetadata = {
      panelId: 'test-panel',
      accessToken: 'test-token',
      workflowDetails: { workflow1: {} },
      workflowName: 'testWorkflow',
      localSettings: { key: 'value' },
      standardApp: { stateful: true },
      azureDetails: { tenantId: 'tenant-123', clientId: 'client-123' },
      schemaArtifacts: [],
      mapArtifacts: {},
    } as any;

    const services = getDesignerServices(
      'http://localhost:7071',
      'http://localhost:7071/runtime',
      false,
      '2018-11-01',
      { subscriptionId: 'sub-123', resourceGroup: 'rg', location: 'eastus' } as any,
      true,
      {},
      panelMetadata,
      mockCreateFSConnection,
      mockVscode as any,
      'http://redirect',
      '1.0.0',
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    expect(services).toBeDefined();
    expect(services.workflowService).toBeDefined();
  });

  it('should wire up hostService.openRun to setRunId', () => {
    const services = getDesignerServices(
      'http://localhost:7071',
      '',
      false,
      '2018-11-01',
      { subscriptionId: 'sub-123' } as any,
      true,
      {},
      null,
      mockCreateFSConnection,
      mockVscode as any,
      '',
      '1.0.0',
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    services.hostService.openRun?.('run-123');
    expect(mockSetRunId).toHaveBeenCalledWith('run-123');
  });
});
