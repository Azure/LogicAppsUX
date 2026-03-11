import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks for connection utilities (must be declared before dynamic import) ──
const mockAddConnectionData = vi.fn();
const mockGetConnectionsAndSettingsToUpdate = vi.fn();
const mockSaveConnectionReferences = vi.fn();
const mockGetConnectionsFromFile = vi.fn();
const mockGetLogicAppProjectRoot = vi.fn();
const mockGetParametersFromFile = vi.fn();
const mockSaveWorkflowParameter = vi.fn();

vi.mock('../../../../utils/codeless/connection', () => ({
  addConnectionData: mockAddConnectionData,
  getConnectionsAndSettingsToUpdate: mockGetConnectionsAndSettingsToUpdate,
  saveConnectionReferences: mockSaveConnectionReferences,
  getConnectionsFromFile: mockGetConnectionsFromFile,
  getLogicAppProjectRoot: mockGetLogicAppProjectRoot,
  getParametersFromFile: mockGetParametersFromFile,
}));

vi.mock('../../../../utils/codeless/parameter', () => ({
  saveWorkflowParameter: mockSaveWorkflowParameter,
}));

vi.mock('../../../../utils/codeless/common', () => ({
  cacheWebviewPanel: vi.fn(),
  getAzureConnectorDetailsForLocalProject: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
}));

vi.mock('../../../../utils/codeless/startDesignTimeApi', () => ({
  startDesignTimeApi: vi.fn(),
}));

vi.mock('../../../../utils/codeless/artifacts', () => ({
  getArtifactsInLocalProject: vi.fn(),
}));

vi.mock('../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
}));

vi.mock('../../../../utils/bundleFeed', () => ({
  getBundleVersionNumber: vi.fn().mockResolvedValue('1.0.0'),
}));

vi.mock('../../openDesigner/openDesignerBase', () => {
  return {
    OpenDesignerBase: class {
      panelGroupKey = 'ls';
      panelName = 'test';
      context = { telemetry: { properties: {} } };
      panel = { dispose: vi.fn() };
      sendMsgToWebview = vi.fn();
    },
  };
});

// ── Import the module under test (after all mocks are configured) ──────────
const mod = await import('../connectionView');
const OpenConnectionView = mod.default;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * mockSaveConnection is used to replace the private saveConnection method
 * on test instances, so we can test _handleWebviewMsg orchestration without
 * needing deep mocks of vscode.workspace.textDocuments etc.
 */
const mockSaveConnection = vi.fn();

/** Create a minimal instance with just enough state for _handleWebviewMsg */
function createInstance(): InstanceType<typeof OpenConnectionView> {
  const instance = Object.create(OpenConnectionView.prototype) as any;
  instance.workflowFilePath = '/test/workflow.cs';
  instance.methodName = 'TestMethod';
  instance.range = { Start: { Line: 0, Character: 0 }, End: { Line: 0, Character: 10 } };
  instance.connectorName = 'test-connector';
  instance.connectorType = 'builtin';
  instance.currentConnectionId = '';
  instance.context = { telemetry: { properties: {} } };
  instance.panel = { dispose: vi.fn() };
  instance.panelMetadata = { azureDetails: {} };
  // Override the private saveConnection so tests focus on handler orchestration
  instance.saveConnection = mockSaveConnection;
  return instance;
}

/** Helper to invoke the private _handleWebviewMsg via the prototype */
function handleMsg(instance: any, message: any): Promise<void> {
  return (OpenConnectionView.prototype as any)._handleWebviewMsg.call(instance, message);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ConnectionView – insert_connection handles local and managed connections atomically', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddConnectionData.mockResolvedValue(undefined);
    mockSaveConnection.mockResolvedValue(undefined);
  });

  describe('addConnection handler', () => {
    it('should be a no-op since messages are intercepted on the React side', async () => {
      const instance = createInstance();

      await handleMsg(instance, {
        command: 'add-connection',
        connectionAndSetting: { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} },
      });

      expect(mockAddConnectionData).not.toHaveBeenCalled();
      expect(mockSaveConnection).not.toHaveBeenCalled();
      expect(instance.panel.dispose).not.toHaveBeenCalled();
    });
  });

  describe('insert_connection handler', () => {
    it('should write local connection data via addConnectionData when connectionAndSetting is present', async () => {
      const instance = createInstance();
      const connectionAndSetting = { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} };

      await handleMsg(instance, {
        command: 'insert-connection',
        connection: { name: 'agent-1', id: 'agentConnections/agent-1' },
        connectionAndSetting,
      });

      expect(mockAddConnectionData).toHaveBeenCalledOnce();
      expect(mockSaveConnection).toHaveBeenCalled();
      expect(instance.panel.dispose).toHaveBeenCalled();
    });

    it('should write local connection data before calling saveConnection', async () => {
      const instance = createInstance();
      const callOrder: string[] = [];

      mockAddConnectionData.mockImplementation(async () => {
        callOrder.push('addConnectionData');
      });
      mockSaveConnection.mockImplementation(async () => {
        callOrder.push('saveConnection');
      });

      await handleMsg(instance, {
        command: 'insert-connection',
        connection: { name: 'sp-1', id: 'serviceProviderConnections/sp-1' },
        connectionAndSetting: { connectionData: {}, connectionKey: 'sp-1', pathLocation: ['serviceProviderConnections'], settings: {} },
      });

      expect(callOrder).toEqual(['addConnectionData', 'saveConnection']);
    });

    it('should handle managed API connections with connectionReferences and without connectionAndSetting', async () => {
      const instance = createInstance();
      const connectionReferences = { 'azureblob-1': { connection: { id: '/subscriptions/sub1/connections/azureblob-1' } } };

      await handleMsg(instance, {
        command: 'insert-connection',
        connection: { name: 'azureblob-1', id: '/subscriptions/sub1/connections/azureblob-1' },
        connectionReferences,
      });

      expect(mockAddConnectionData).not.toHaveBeenCalled();
      expect(mockSaveConnection).toHaveBeenCalledWith(
        'TestMethod',
        { name: 'azureblob-1', id: '/subscriptions/sub1/connections/azureblob-1' },
        { documentUri: '/test/workflow.cs', range: instance.range },
        connectionReferences,
        undefined,
        undefined
      );
      expect(instance.panel.dispose).toHaveBeenCalled();
    });

    it('should handle selecting an existing connection (no connectionAndSetting, no connectionReferences)', async () => {
      const instance = createInstance();

      await handleMsg(instance, {
        command: 'insert-connection',
        connection: { name: 'existing-sp', id: 'serviceProviderConnections/existing-sp' },
      });

      expect(mockAddConnectionData).not.toHaveBeenCalled();
      expect(mockSaveConnection).toHaveBeenCalled();
      expect(instance.panel.dispose).toHaveBeenCalled();
    });

    it('should dispose the panel after all operations complete', async () => {
      const instance = createInstance();
      const callOrder: string[] = [];

      mockAddConnectionData.mockImplementation(async () => {
        callOrder.push('addConnectionData');
      });
      mockSaveConnection.mockImplementation(async () => {
        callOrder.push('saveConnection');
      });
      instance.panel.dispose = vi.fn(() => {
        callOrder.push('dispose');
      });

      await handleMsg(instance, {
        command: 'insert-connection',
        connection: { name: 'agent-1', id: 'agentConnections/agent-1' },
        connectionAndSetting: { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} },
      });

      expect(callOrder).toEqual(['addConnectionData', 'saveConnection', 'dispose']);
    });
  });
});
