import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'path';
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';
import { openOverview } from '../openOverview';

const mocks = vi.hoisted(() => {
  class MockUri {
    public fsPath: string;

    public constructor(fsPath: string) {
      this.fsPath = fsPath;
    }

    public static file(fsPath: string): MockUri {
      return new MockUri(fsPath);
    }

    public toString(): string {
      return this.fsPath;
    }
  }

  class MockRemoteWorkflowTreeItem {}

  return {
    MockRemoteWorkflowTreeItem,
    MockUri,
    cacheWebviewPanel: vi.fn(),
    createWebviewPanel: vi.fn(),
    delay: vi.fn().mockResolvedValue(undefined),
    getAuthorizationToken: vi.fn().mockResolvedValue('local-token'),
    getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('remote-token'),
    getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({
      enabled: true,
      accessToken: 'azure-token',
      clientId: 'client-id',
      tenantId: 'tenant-id',
      subscriptionId: 'subscription-id',
      resourceGroupName: 'resource-group',
    }),
    getCallbackUrl: vi.fn(),
    getCodefulWorkflowMetadata: vi.fn().mockResolvedValue({ workflowName: 'workflow-a', triggerName: 'lspManual' }),
    getConnectionsJson: vi.fn().mockResolvedValue('{}'),
    getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: { WORKFLOW_CODEFUL_ENABLED: 'true' } }),
    getLogicAppProjectRoot: vi.fn().mockResolvedValue('D:\\project'),
    getRequestTriggerName: vi.fn(),
    getRunTriggerName: vi.fn().mockReturnValue('manual'),
    getStandardAppData: vi.fn((workflowName: string, workflowContent: any) => ({
      name: workflowName,
      kind: workflowContent?.kind ?? 'Stateful',
      operationOptions: workflowContent?.operationOptions,
      statelessRunMode: workflowContent?.statelessRunMode,
    })),
    getTriggerName: vi.fn().mockReturnValue('manual'),
    getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
    getWorkflowManagementBaseURI: vi.fn().mockReturnValue('https://management.azure.com/runtime'),
    getWorkflowNode: vi.fn((node: any) => node),
    isRuntimeUp: vi.fn().mockResolvedValue(true),
    launchProjectDebugger: vi.fn(),
    localize: vi.fn((_key: string, defaultMessage: string, ...args: string[]) =>
      defaultMessage.replace(/{(\d+)}/g, (_match, index) => args[Number(index)] ?? '')
    ),
    openMonitoringView: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    removeWebviewPanelFromCache: vi.fn(),
    sendRequest: vi.fn(),
    tryGetWebviewPanel: vi.fn(),
  };
});

vi.mock('vscode', () => ({
  Uri: mocks.MockUri,
  ViewColumn: {
    Active: -1,
  },
  window: {
    createWebviewPanel: mocks.createWebviewPanel,
  },
  workspace: {
    name: 'test-workspace',
  },
}));

vi.mock('fs', () => ({
  readFileSync: mocks.readFileSync,
  readdirSync: mocks.readdirSync,
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRequestTriggerName: mocks.getRequestTriggerName,
  getRunTriggerName: mocks.getRunTriggerName,
  getTriggerName: mocks.getTriggerName,
  HTTP_METHODS: {
    GET: 'GET',
    POST: 'POST',
  },
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
}));

vi.mock('../../../../localize', () => ({
  localize: mocks.localize,
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    context: {
      extensionPath: 'D:\\extension',
      subscriptions: [],
    },
    extensionVersion: '1.0.0',
    outputChannel: {
      appendLog: vi.fn(),
    },
    webViewKey: {
      overview: 'overview',
    },
  },
}));

vi.mock('../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem', () => ({
  RemoteWorkflowTreeItem: mocks.MockRemoteWorkflowTreeItem,
}));

vi.mock('../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: mocks.getLocalSettingsJson,
}));

vi.mock('../../../utils/codeless/common', () => ({
  cacheWebviewPanel: mocks.cacheWebviewPanel,
  getAzureConnectorDetailsForLocalProject: mocks.getAzureConnectorDetailsForLocalProject,
  getStandardAppData: mocks.getStandardAppData,
  getWorkflowManagementBaseURI: mocks.getWorkflowManagementBaseURI,
  removeWebviewPanelFromCache: mocks.removeWebviewPanelFromCache,
  tryGetWebviewPanel: mocks.tryGetWebviewPanel,
}));

vi.mock('../../../utils/codeless/connection', () => ({
  getConnectionsJson: mocks.getConnectionsJson,
  getLogicAppProjectRoot: mocks.getLogicAppProjectRoot,
}));

vi.mock('../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationToken: mocks.getAuthorizationToken,
  getAuthorizationTokenFromNode: mocks.getAuthorizationTokenFromNode,
}));

vi.mock('../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: mocks.getWebViewHTML,
}));

vi.mock('../../../utils/requestUtils', () => ({
  sendRequest: mocks.sendRequest,
}));

vi.mock('../../../utils/workspace', () => ({
  getWorkflowNode: mocks.getWorkflowNode,
}));

vi.mock('../monitoringView/openMonitoringView', () => ({
  openMonitoringView: mocks.openMonitoringView,
}));

vi.mock('../../../utils/vsCodeConfig/launch', () => ({
  launchProjectDebugger: mocks.launchProjectDebugger,
}));

vi.mock('../../../utils/startRuntimeApi', () => ({
  isRuntimeUp: mocks.isRuntimeUp,
}));

vi.mock('../../../utils/delay', () => ({
  delay: mocks.delay,
}));

vi.mock('../../../languageServer/languageServer', () => ({
  getCodefulWorkflowMetadata: mocks.getCodefulWorkflowMetadata,
}));

const context = { telemetry: { properties: {}, measurements: {} } } as any;
const workflowFilePath = path.join('D:\\project', 'workflow-a', 'workflow.json');
const codefulFilePath = path.join('D:\\project', 'Workflows.cs');

interface MockPanel {
  active: boolean;
  iconPath?: unknown;
  onDidDispose: ReturnType<typeof vi.fn>;
  reveal: ReturnType<typeof vi.fn>;
  webview: {
    html: string;
    onDidReceiveMessage: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
  };
}

let panel: MockPanel;
let messageHandler: ((message: any) => Promise<void>) | undefined;
let disposeHandler: (() => void) | undefined;

function createPanel(): MockPanel {
  messageHandler = undefined;
  disposeHandler = undefined;
  return {
    active: true,
    reveal: vi.fn(),
    webview: {
      html: '',
      onDidReceiveMessage: vi.fn((handler: (message: any) => Promise<void>) => {
        messageHandler = handler;
      }),
      postMessage: vi.fn().mockResolvedValue(true),
    },
    onDidDispose: vi.fn((handler: () => void) => {
      disposeHandler = handler;
    }),
  };
}

async function sendInitializeMessage(): Promise<any> {
  expect(messageHandler).toBeDefined();
  await messageHandler?.({ command: ExtensionCommand.initialize });
  return panel.webview.postMessage.mock.calls.find(([message]) => message.command === ExtensionCommand.initialize_frame)?.[0].data;
}

function disposePanel(): void {
  disposeHandler?.();
}

function mockWorkflowJson(definition: any, kind = 'Stateful'): void {
  mocks.readFileSync.mockReturnValue(JSON.stringify({ definition, kind }));
}

describe('openOverview', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    panel = createPanel();
    mocks.createWebviewPanel.mockReturnValue(panel);
    mocks.getAuthorizationToken.mockResolvedValue('local-token');
    mocks.getAuthorizationTokenFromNode.mockResolvedValue('remote-token');
    mocks.getAzureConnectorDetailsForLocalProject.mockResolvedValue({
      enabled: true,
      accessToken: 'azure-token',
      clientId: 'client-id',
      tenantId: 'tenant-id',
      subscriptionId: 'subscription-id',
      resourceGroupName: 'resource-group',
    });
    mocks.getCodefulWorkflowMetadata.mockResolvedValue({ workflowName: 'workflow-a', triggerName: 'lspManual' });
    mocks.getConnectionsJson.mockResolvedValue('{}');
    mocks.tryGetWebviewPanel.mockReturnValue(undefined);
    mocks.getLocalSettingsJson.mockResolvedValue({ Values: { WORKFLOW_CODEFUL_ENABLED: 'true' } });
    mocks.getLogicAppProjectRoot.mockResolvedValue('D:\\project');
    mocks.getRequestTriggerName.mockReturnValue('manual');
    mocks.getRunTriggerName.mockReturnValue('manual');
    mocks.getTriggerName.mockReturnValue('manual');
    mocks.isRuntimeUp.mockResolvedValue(true);
    mocks.readdirSync.mockReturnValue([]);
    (ext as any).workflowRuntimePort = 7071;
  });

  it('initializes a centralized codeful overview with discovered workflows and LSP fallback trigger metadata', async () => {
    const codefulContent = `
      WorkflowBuilderFactory.CreateStatefulWorkflow("workflow-a", builder => {});
      WorkflowBuilderFactory.CreateStatefulWorkflow("workflow-b", builder => {});
      var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
    `;
    mocks.readFileSync.mockReturnValue(codefulContent);
    mocks.sendRequest.mockImplementation(async (_context: any, request: { url: string; method: string }) => {
      if (request.url.endsWith('/workflows?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: [] });
      }

      if (request.url.includes('/triggers?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: [] });
      }

      if (request.url.includes('/listCallbackUrl?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: `callback:${request.url}`, method: 'POST' });
      }

      throw new Error(`Unexpected request ${request.url}`);
    });

    await openOverview(context, vscode.Uri.file(codefulFilePath));

    const initializePayload = await sendInitializeMessage();

    expect(initializePayload.project).toBe('overview');
    expect(initializePayload.isCodeful).toBe(true);
    expect(initializePayload.workflowPropertiesList).toHaveLength(2);
    expect(initializePayload.workflowPropertiesList.map((workflow: any) => workflow.name)).toEqual(['workflow-a', 'workflow-b']);
    expect(initializePayload.workflowPropertiesList[0].triggerName).toBe('lspManual');
    expect(initializePayload.workflowPropertiesList[0].callbackInfo.value).toContain(
      '/workflows/workflow-a/triggers/lspManual/listCallbackUrl'
    );
    expect(mocks.getCodefulWorkflowMetadata).toHaveBeenCalledWith(codefulFilePath);
    expect(mocks.sendRequest).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/listCallbackUrl?api-version=2019-10-01-edge-preview'),
      })
    );

    disposePanel();
  });

  it('uses trigger details to resolve callback URLs when runtime workflow metadata omits trigger type', async () => {
    const codefulContent = 'WorkflowFactory.CreateStatefulWorkflow("workflow-a", workflow);';
    mocks.readFileSync.mockReturnValue(codefulContent);
    mocks.sendRequest.mockImplementation(async (_context: any, request: { url: string; method: string }) => {
      if (request.url.endsWith('/workflows?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({
          value: [
            {
              name: 'workflow-a',
              kind: 'Stateful',
            },
          ],
        });
      }

      if (request.url.endsWith('/workflows/workflow-a/triggers?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({
          value: [
            {
              name: 'manual',
              properties: {
                type: 'Request',
                kind: 'Http',
              },
            },
          ],
        });
      }

      if (request.url.includes('/listCallbackUrl?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: `callback:${request.url}`, method: 'POST' });
      }

      throw new Error(`Unexpected request ${request.url}`);
    });

    await openOverview(context, vscode.Uri.file(codefulFilePath));
    const initializePayload = await sendInitializeMessage();

    expect(initializePayload.workflowPropertiesList).toHaveLength(1);
    expect(initializePayload.workflowPropertiesList[0].triggerName).toBe('manual');
    expect(initializePayload.workflowPropertiesList[0].callbackInfo.value).toContain(
      '/workflows/workflow-a/triggers/manual/listCallbackUrl'
    );
    expect(initializePayload.workflowPropertiesList[0].callbackInfo.value).not.toContain('/triggers/manual/run');

    disposePanel();
  });

  it('posts callback URL updates with workflow names for a centralized codeful overview when the runtime base URL appears', async () => {
    vi.useFakeTimers();
    (ext as any).workflowRuntimePort = undefined;
    const codefulContent = `
      WorkflowBuilderFactory.CreateStatefulWorkflow("workflow-a", builder => {});
      WorkflowBuilderFactory.CreateStatefulWorkflow("workflow-b", builder => {});
      var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("manual");
    `;
    mocks.readFileSync.mockReturnValue(codefulContent);
    mocks.sendRequest.mockImplementation(async (_context: any, request: { url: string }) => {
      if (request.url.includes('/listCallbackUrl?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: `callback:${request.url}`, method: 'POST' });
      }

      throw new Error(`Unexpected request ${request.url}`);
    });

    await openOverview(context, vscode.Uri.file(codefulFilePath));
    const initializePayload = await sendInitializeMessage();

    expect(initializePayload.baseUrl).toBeUndefined();
    expect(initializePayload.workflowPropertiesList[0].callbackInfo).toBeUndefined();

    (ext as any).workflowRuntimePort = 7071;
    await vi.advanceTimersByTimeAsync(5000);

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_runtime_base_url,
      data: {
        baseUrl: 'http://localhost:7071/runtime/webhooks/workflow/api/management',
      },
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_callback_info,
      data: {
        workflowName: 'workflow-a',
        callbackInfo: expect.objectContaining({
          value: expect.stringContaining('/workflows/workflow-a/triggers/manual/listCallbackUrl'),
        }),
      },
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_callback_info,
      data: {
        workflowName: 'workflow-b',
        callbackInfo: expect.objectContaining({
          value: expect.stringContaining('/workflows/workflow-b/triggers/manual/listCallbackUrl'),
        }),
      },
    });

    disposePanel();
    vi.useRealTimers();
  });

  it('refreshes source-fallback codeful workflows from runtime metadata when the runtime base URL appears', async () => {
    vi.useFakeTimers();
    (ext as any).workflowRuntimePort = undefined;
    const codefulContent = 'WorkflowFactory.CreateStatefulWorkflow("source-workflow", workflow);';
    mocks.readFileSync.mockReturnValue(codefulContent);
    mocks.sendRequest.mockImplementation(async (_context: any, request: { url: string }) => {
      if (request.url.endsWith('/workflows?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({
          value: [
            {
              name: 'runtime-workflow',
              kind: 'Stateful',
              triggers: {
                manual: {
                  type: 'Request',
                  kind: 'Http',
                },
              },
            },
          ],
        });
      }

      if (request.url.includes('/listCallbackUrl?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: `callback:${request.url}`, method: 'POST' });
      }

      throw new Error(`Unexpected request ${request.url}`);
    });

    await openOverview(context, vscode.Uri.file(codefulFilePath));
    const initializePayload = await sendInitializeMessage();

    expect(initializePayload.workflowPropertiesList.map((workflow: any) => workflow.name)).toEqual(['source-workflow']);

    (ext as any).workflowRuntimePort = 7071;
    await vi.advanceTimersByTimeAsync(5000);

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_workflow_properties,
      data: {
        workflowProperties: expect.objectContaining({
          name: 'runtime-workflow',
          triggerName: 'manual',
          callbackInfo: expect.objectContaining({
            value: expect.stringContaining('/workflows/runtime-workflow/triggers/manual/listCallbackUrl'),
          }),
        }),
        workflowPropertiesList: [
          expect.objectContaining({
            name: 'runtime-workflow',
            triggerName: 'manual',
          }),
        ],
        kind: 'Stateful',
      },
    });

    disposePanel();
    vi.useRealTimers();
  });

  it('uses callback URLs for request-triggered codeless local workflows', async () => {
    mockWorkflowJson({
      triggers: {
        manual: {
          type: 'Request',
          kind: 'Http',
        },
      },
      actions: {},
    });
    mocks.sendRequest.mockResolvedValue(JSON.stringify({ value: 'https://callback.local/manual', method: 'POST' }));

    await openOverview(context, vscode.Uri.file(workflowFilePath));

    const initializePayload = await sendInitializeMessage();

    expect(initializePayload.workflowProperties.callbackInfo).toEqual({
      value: 'https://callback.local/manual',
      method: 'POST',
    });
    expect(mocks.sendRequest).toHaveBeenCalledWith(context, {
      method: 'POST',
      url: 'http://localhost:7071/runtime/webhooks/workflow/api/management/workflows/workflow-a/triggers/manual/listCallbackUrl?api-version=2019-10-01-edge-preview',
    });

    disposePanel();
  });

  it('uses the management run endpoint for codeless local workflows without request triggers', async () => {
    mocks.getRequestTriggerName.mockReturnValue(undefined);
    mocks.getRunTriggerName.mockReturnValue('recurrence');
    mocks.getTriggerName.mockReturnValue('recurrence');
    mockWorkflowJson({
      triggers: {
        recurrence: {
          type: 'Recurrence',
        },
      },
      actions: {},
    });

    await openOverview(context, vscode.Uri.file(workflowFilePath));

    const initializePayload = await sendInitializeMessage();

    expect(initializePayload.workflowProperties.callbackInfo).toEqual({
      value:
        'http://localhost:7071/runtime/webhooks/workflow/api/management/workflows/workflow-a/triggers/recurrence/run?api-version=2019-10-01-edge-preview',
      method: 'POST',
    });
    expect(mocks.sendRequest).not.toHaveBeenCalled();

    disposePanel();
  });

  it('initializes remote overview payloads with remote callback and Azure metadata', async () => {
    const remoteNode = Object.assign(new mocks.MockRemoteWorkflowTreeItem(), {
      id: 'remote-app',
      name: 'remote-workflow',
      workflowFileContent: {
        definition: {
          triggers: {
            manual: {
              type: 'Request',
              kind: 'Http',
            },
          },
          actions: {},
        },
        kind: 'Stateful',
      },
      getCallbackUrl: mocks.getCallbackUrl.mockResolvedValue({ value: 'https://callback.remote/manual', method: 'POST' }),
      subscription: {
        subscriptionId: 'remote-subscription',
      },
      parent: {
        parent: {
          site: {
            location: 'West US',
            resourceGroup: 'remote-rg',
          },
        },
        subscription: {
          environment: {
            resourceManagerEndpointUrl: 'https://management.azure.com',
          },
          tenantId: 'remote-tenant',
        },
      },
    });

    await openOverview(context, remoteNode as any);

    const initializePayload = await sendInitializeMessage();

    expect(initializePayload.isLocal).toBe(false);
    expect(initializePayload.corsNotice).toBe('To view runs, set "*" to allowed origins in the CORS setting.');
    expect(initializePayload.workflowProperties.callbackInfo).toEqual({
      value: 'https://callback.remote/manual',
      method: 'POST',
    });
    expect(initializePayload.azureDetails).toEqual(
      expect.objectContaining({
        enabled: true,
        accessToken: 'remote-token',
        subscriptionId: 'remote-subscription',
        location: 'westus',
        resourceGroupName: 'remote-rg',
        tenantId: 'remote-tenant',
      })
    );

    await messageHandler?.({
      command: ExtensionCommand.loadRun,
      item: { id: 'workflows/remote-workflow/runs/run-1' },
    });
    expect(mocks.openMonitoringView).toHaveBeenCalledWith(context, remoteNode, 'workflows/remote-workflow/runs/run-1', undefined);

    disposePanel();
  });
});
