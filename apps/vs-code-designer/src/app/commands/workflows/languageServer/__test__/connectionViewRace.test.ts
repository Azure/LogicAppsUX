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
  instance._pendingConnectionWrite = undefined;
  // Override the private saveConnection so tests focus on handler orchestration
  instance.saveConnection = mockSaveConnection;
  return instance;
}

/** Helper to invoke the private _handleWebviewMsg via the prototype */
function handleMsg(instance: any, message: any): Promise<void> {
  return (OpenConnectionView.prototype as any)._handleWebviewMsg.call(instance, message);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ConnectionView – addConnection / insert_connection race condition fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddConnectionData.mockResolvedValue(undefined);
    mockSaveConnection.mockResolvedValue(undefined);
  });

  it('should store the addConnection write as _pendingConnectionWrite', async () => {
    const instance = createInstance();
    mockAddConnectionData.mockResolvedValue(undefined);

    await handleMsg(instance, {
      command: 'add-connection',
      connectionAndSetting: { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} },
    });

    // Verify addConnectionData was called
    expect(mockAddConnectionData).toHaveBeenCalledOnce();
  });

  it('should set _pendingConnectionWrite as a promise after addConnection', async () => {
    const instance = createInstance();

    // Use a deferred promise so the write stays pending
    let resolveWrite!: () => void;
    mockAddConnectionData.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveWrite = r;
        })
    );

    await handleMsg(instance, {
      command: 'add-connection',
      connectionAndSetting: { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} },
    });

    // _pendingConnectionWrite should be set (the promise is still pending)
    expect(instance._pendingConnectionWrite).toBeDefined();
    expect(instance._pendingConnectionWrite).toBeInstanceOf(Promise);

    // Cleanup
    resolveWrite();
    await instance._pendingConnectionWrite;
  });

  it('should await _pendingConnectionWrite before saveConnection in insert_connection', async () => {
    const instance = createInstance();
    const callOrder: string[] = [];

    // addConnectionData takes some time (simulates disk write)
    let resolveWrite!: () => void;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    mockAddConnectionData.mockImplementation(async () => {
      await writePromise;
      callOrder.push('addConnectionData_completed');
    });

    // saveConnection records when it's called
    mockSaveConnection.mockImplementation(async () => {
      callOrder.push('saveConnection_called');
    });

    // 1. Fire addConnection (stores the promise, does NOT await completion)
    await handleMsg(instance, {
      command: 'add-connection',
      connectionAndSetting: { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} },
    });

    // 2. Fire insert_connection concurrently – it should block until addConnectionData finishes
    const insertPromise = handleMsg(instance, {
      command: 'insert-connection',
      connection: { name: 'agent-1', id: 'test-id' },
      connectionReferences: { 'agent-1': { connection: { id: 'agent-1' } } },
    });

    // At this point addConnectionData hasn't completed yet
    expect(callOrder).not.toContain('addConnectionData_completed');
    expect(callOrder).not.toContain('saveConnection_called');

    // 3. Now resolve the write
    resolveWrite();
    await insertPromise;

    // addConnectionData must complete BEFORE saveConnection is called
    expect(callOrder.indexOf('addConnectionData_completed')).toBeLessThan(callOrder.indexOf('saveConnection_called'));
  });

  it('should clear _pendingConnectionWrite after insert_connection awaits it', async () => {
    const instance = createInstance();
    mockAddConnectionData.mockResolvedValue(undefined);

    // Fire addConnection
    await handleMsg(instance, {
      command: 'add-connection',
      connectionAndSetting: { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} },
    });

    // Fire insert_connection (which awaits and clears the pending write)
    await handleMsg(instance, {
      command: 'insert-connection',
      connection: { name: 'agent-1', id: 'test-id' },
      connectionReferences: {},
    });

    // After insert_connection completes, it should be cleared
    expect(instance._pendingConnectionWrite).toBeUndefined();
  });

  it('should proceed normally when there is no pending write', async () => {
    const instance = createInstance();

    // No addConnection fired first – _pendingConnectionWrite is undefined
    expect(instance._pendingConnectionWrite).toBeUndefined();

    await handleMsg(instance, {
      command: 'insert-connection',
      connection: { name: 'some-conn', id: 'test-id' },
      connectionReferences: { 'some-conn': { connection: { id: 'some-conn' } } },
    });

    // saveConnection should still proceed without errors
    expect(mockSaveConnection).toHaveBeenCalled();
  });

  it('should not set _pendingConnectionWrite for non-addConnection messages', async () => {
    const instance = createInstance();

    await handleMsg(instance, {
      command: 'log-telemetry',
      data: { name: 'test-event' },
    });

    expect(instance._pendingConnectionWrite).toBeUndefined();
  });

  it('should preserve ordering across multiple rapid addConnection + insert_connection pairs', async () => {
    const instance = createInstance();
    const callOrder: string[] = [];

    let resolveWrite1!: () => void;
    const writePromise1 = new Promise<void>((r) => {
      resolveWrite1 = r;
    });

    mockAddConnectionData.mockImplementationOnce(async () => {
      await writePromise1;
      callOrder.push('write1_done');
    });

    mockSaveConnection.mockImplementation(async () => {
      callOrder.push('saveConnection_called');
    });

    // Fire addConnection (slow write)
    await handleMsg(instance, {
      command: 'add-connection',
      connectionAndSetting: { connectionData: {}, connectionKey: 'agent-1', pathLocation: ['agentConnections'], settings: {} },
    });

    // Fire insert_connection — should wait for write1
    const insertP = handleMsg(instance, {
      command: 'insert-connection',
      connection: { name: 'agent-1', id: 'test-id' },
      connectionReferences: { 'agent-1': { connection: { id: 'agent-1' } } },
    });

    // Nothing completed yet
    expect(callOrder).toEqual([]);

    // Complete the write
    resolveWrite1();
    await insertP;

    // write1 must finish before saveConnection
    expect(callOrder).toEqual(['write1_done', 'saveConnection_called']);
  });
});
