import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all service class constructors
vi.mock('@microsoft/logic-apps-shared', () => ({
  StandardConnectionService: vi.fn().mockImplementation((opts: any) => ({ type: 'connection', opts })),
  StandardOperationManifestService: vi.fn().mockImplementation((opts: any) => ({ type: 'operationManifest', opts })),
  StandardSearchService: vi.fn().mockImplementation((opts: any) => ({ type: 'search', opts })),
  BaseGatewayService: vi.fn().mockImplementation((opts: any) => ({ type: 'gateway', opts })),
  StandardRunService: vi.fn().mockImplementation((opts: any) => ({ type: 'run', opts, getRun: vi.fn() })),
  StandardArtifactService: vi.fn().mockImplementation((opts: any) => ({ type: 'artifact', opts })),
  BaseApiManagementService: vi
    .fn()
    .mockImplementation((opts: any) => ({ type: 'apim', opts, getOperationSchema: vi.fn(), getOperations: vi.fn() })),
  BaseFunctionService: vi.fn().mockImplementation((opts: any) => ({ type: 'function', opts })),
  BaseAppServiceService: vi.fn().mockImplementation((opts: any) => ({
    type: 'appService',
    opts,
    getOperationSchema: vi.fn(),
    getOperations: vi.fn(),
  })),
  BaseTenantService: vi.fn().mockImplementation((opts: any) => ({ type: 'tenant', opts })),
  BaseCognitiveServiceService: vi.fn().mockImplementation((opts: any) => ({ type: 'cognitive', opts })),
  BaseRoleService: vi.fn().mockImplementation((opts: any) => ({ type: 'role', opts })),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
  clone: vi.fn((obj: any) => JSON.parse(JSON.stringify(obj))),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
  InitLoggerService: vi.fn(),
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    addConnection: 'addConnection',
    showContent: 'showContent',
    openRelativeLink: 'openRelativeLink',
    createFileSystemConnection: 'createFileSystemConnection',
  },
  HttpClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
  })),
}));

vi.mock('../constants', () => ({
  clientSupportedOperations: [],
}));

vi.mock('../services/oAuth', () => ({
  BaseOAuthService: vi.fn().mockImplementation(() => ({ type: 'oauth' })),
}));

const { mockFetchAgentUrl } = vi.hoisted(() => {
  return {
    mockFetchAgentUrl: vi.fn().mockResolvedValue({ agentUrl: 'http://agent', chatUrl: 'http://chat', hostName: 'host' }),
  };
});

vi.mock('../services/workflowService', () => ({
  fetchAgentUrl: mockFetchAgentUrl,
}));

vi.mock('../customEditorService', () => ({
  CustomEditorService: vi.fn().mockImplementation(() => ({ type: 'editor' })),
}));

vi.mock('../../services/Logger', () => ({
  LoggerService: vi.fn().mockImplementation(() => ({ type: 'logger' })),
}));

vi.mock('../services/customConnectionParameterEditorService', () => ({
  CustomConnectionParameterEditorService: vi.fn().mockImplementation(() => ({ type: 'connectionParam' })),
}));

vi.mock('../services/connector', () => ({
  StandardVSCodeConnectorService: vi.fn().mockImplementation(() => ({ type: 'connector' })),
}));

vi.mock('../../../../package.json', () => ({
  default: { version: '1.0.0' },
}));

import { getDesignerServices } from '../servicesHelper';

describe('getDesignerServices', () => {
  const mockVscode = { postMessage: vi.fn() } as any;
  const mockQueryClient = {} as any;
  const mockSendMsg = vi.fn();
  const mockSetRunId = vi.fn();
  const mockCreateFSConnection = vi.fn();

  const defaultArgs = {
    baseUrl: 'http://localhost:7071',
    workflowRuntimeBaseUrl: 'http://localhost:7071/runtime',
    isWorkflowRuntimeRunning: true,
    apiVersion: '2018-11-01',
    apiHubDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: 'http://hub',
      subscriptionId: 'sub-123',
      resourceGroup: 'rg-test',
      location: 'westus',
      tenantId: 'tenant-123',
      httpClient: null as any,
    },
    isLocal: true,
    connectionData: {},
    panelMetadata: {
      accessToken: 'mock-token',
      panelId: 'panel-1',
      workflowDetails: { workflow1: {} },
      workflowName: 'testWorkflow',
      localSettings: {},
      standardApp: { stateful: true },
      azureDetails: {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        defaultHostName: 'myapp.azurewebsites.net',
      },
    } as any,
    oauthRedirectUrl: 'http://redirect',
    hostVersion: '1.0.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an object with all expected service keys', () => {
    const services = getDesignerServices(
      defaultArgs.baseUrl,
      defaultArgs.workflowRuntimeBaseUrl,
      defaultArgs.isWorkflowRuntimeRunning,
      defaultArgs.apiVersion,
      defaultArgs.apiHubDetails,
      defaultArgs.isLocal,
      defaultArgs.connectionData as any,
      defaultArgs.panelMetadata,
      mockCreateFSConnection,
      mockVscode,
      defaultArgs.oauthRedirectUrl,
      defaultArgs.hostVersion,
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    expect(services.connectionService).toBeDefined();
    expect(services.connectorService).toBeDefined();
    expect(services.operationManifestService).toBeDefined();
    expect(services.searchService).toBeDefined();
    expect(services.oAuthService).toBeDefined();
    expect(services.gatewayService).toBeDefined();
    expect(services.tenantService).toBeDefined();
    expect(services.workflowService).toBeDefined();
    expect(services.hostService).toBeDefined();
    expect(services.runService).toBeDefined();
    expect(services.roleService).toBeDefined();
    expect(services.editorService).toBeDefined();
    expect(services.apimService).toBeDefined();
    expect(services.loggerService).toBeDefined();
    expect(services.connectionParameterEditorService).toBeDefined();
    expect(services.cognitiveServiceService).toBeDefined();
    expect(services.functionService).toBeDefined();
  });

  it('should define workflowService.getAgentUrl that calls fetchAgentUrl with defaultHostName', async () => {
    const services = getDesignerServices(
      defaultArgs.baseUrl,
      defaultArgs.workflowRuntimeBaseUrl,
      defaultArgs.isWorkflowRuntimeRunning,
      defaultArgs.apiVersion,
      defaultArgs.apiHubDetails,
      defaultArgs.isLocal,
      defaultArgs.connectionData as any,
      defaultArgs.panelMetadata,
      mockCreateFSConnection,
      mockVscode,
      defaultArgs.oauthRedirectUrl,
      defaultArgs.hostVersion,
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    expect(services.workflowService.getAgentUrl).toBeDefined();
    await services.workflowService.getAgentUrl!();

    expect(mockFetchAgentUrl).toHaveBeenCalledWith(
      'testWorkflow',
      'http://localhost:7071/runtime',
      expect.anything(),
      'client-123',
      'tenant-123',
      true,
      'myapp.azurewebsites.net'
    );
  });

  it('should pass undefined defaultHostName when panelMetadata has no azureDetails', async () => {
    const panelMetadataNoAzure = {
      ...defaultArgs.panelMetadata,
      azureDetails: { tenantId: '', clientId: '' },
    };

    const services = getDesignerServices(
      defaultArgs.baseUrl,
      defaultArgs.workflowRuntimeBaseUrl,
      defaultArgs.isWorkflowRuntimeRunning,
      defaultArgs.apiVersion,
      defaultArgs.apiHubDetails,
      defaultArgs.isLocal,
      defaultArgs.connectionData as any,
      panelMetadataNoAzure as any,
      mockCreateFSConnection,
      mockVscode,
      defaultArgs.oauthRedirectUrl,
      defaultArgs.hostVersion,
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    await services.workflowService.getAgentUrl!();

    expect(mockFetchAgentUrl).toHaveBeenCalledWith(
      'testWorkflow',
      'http://localhost:7071/runtime',
      expect.anything(),
      '',
      '',
      true,
      undefined
    );
  });

  it('should use baseUrl as fallback when workflowRuntimeBaseUrl is empty', async () => {
    const services = getDesignerServices(
      defaultArgs.baseUrl,
      '',
      defaultArgs.isWorkflowRuntimeRunning,
      defaultArgs.apiVersion,
      defaultArgs.apiHubDetails,
      defaultArgs.isLocal,
      defaultArgs.connectionData as any,
      defaultArgs.panelMetadata,
      mockCreateFSConnection,
      mockVscode,
      defaultArgs.oauthRedirectUrl,
      defaultArgs.hostVersion,
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    await services.workflowService.getAgentUrl!();

    expect(mockFetchAgentUrl).toHaveBeenCalledWith(
      'testWorkflow',
      'http://localhost:7071',
      expect.anything(),
      'client-123',
      'tenant-123',
      true,
      'myapp.azurewebsites.net'
    );
  });

  it('should define workflowService with getCallbackUrl and getAppIdentity', () => {
    const services = getDesignerServices(
      defaultArgs.baseUrl,
      defaultArgs.workflowRuntimeBaseUrl,
      defaultArgs.isWorkflowRuntimeRunning,
      defaultArgs.apiVersion,
      defaultArgs.apiHubDetails,
      defaultArgs.isLocal,
      defaultArgs.connectionData as any,
      defaultArgs.panelMetadata,
      mockCreateFSConnection,
      mockVscode,
      defaultArgs.oauthRedirectUrl,
      defaultArgs.hostVersion,
      mockQueryClient,
      mockSendMsg,
      mockSetRunId
    );

    expect(services.workflowService.getCallbackUrl).toBeDefined();
    expect(services.workflowService.getAppIdentity).toBeDefined();
    expect(services.workflowService.isExplicitAuthRequiredForManagedIdentity).toBeDefined();
  });
});
