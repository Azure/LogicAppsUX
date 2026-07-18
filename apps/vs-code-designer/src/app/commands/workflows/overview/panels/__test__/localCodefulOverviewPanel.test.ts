import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import path from 'path';

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

  return {
    MockUri,
    cacheWebviewPanel: vi.fn(),
    createWebviewPanel: vi.fn(),
    delay: vi.fn().mockResolvedValue(undefined),
    getAuthorizationToken: vi.fn().mockResolvedValue('local-token'),
    getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({
      enabled: true,
      accessToken: 'azure-token',
      tenantId: 'tenant-id',
      subscriptionId: 'subscription-id',
      resourceGroupName: 'resource-group',
    }),
    getCodefulWorkflowMetadata: vi.fn().mockResolvedValue({ workflowName: 'workflow-a', triggerName: 'lspManual' }),
    getConnectionsJson: vi.fn().mockResolvedValue('{}'),
    getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
    getLogicAppProjectRoot: vi.fn().mockResolvedValue('D:\\project'),
    getStandardAppData: vi.fn((workflowName: string, workflowContent: any) => ({
      name: workflowName,
      kind: workflowContent?.kind ?? 'Stateful',
      operationOptions: workflowContent?.operationOptions,
      statelessRunMode: workflowContent?.statelessRunMode,
    })),
    getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
    isRuntimeUp: vi.fn().mockResolvedValue(true),
    launchProjectDebugger: vi.fn(),
    openMonitoringView: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    removeWebviewPanelFromCache: vi.fn(),
    sendRequest: vi.fn(),
    shouldUpdateOverviewCallbackInfo: vi.fn(),
    tryGetWebviewPanel: vi.fn(),
    extractHttpTriggerName: vi.fn().mockReturnValue(undefined),
    hasHttpRequestTrigger: vi.fn((content: string) => content.includes('CreateHttpTrigger')),
  };
});

vi.mock('vscode', () => ({
  Uri: mocks.MockUri,
  ViewColumn: { Active: -1 },
  window: { createWebviewPanel: mocks.createWebviewPanel },
  workspace: { name: 'test-workspace' },
}));

vi.mock('fs', () => ({
  readFileSync: mocks.readFileSync,
  readdirSync: mocks.readdirSync,
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRequestTriggerName: vi.fn(),
  getTriggerName: vi.fn().mockReturnValue('manual'),
  HTTP_METHODS: { GET: 'GET', POST: 'POST' },
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
}));

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string, ...args: string[]) =>
    defaultMsg.replace(/{(\d+)}/g, (_match, index) => args[Number(index)] ?? ''),
}));

vi.mock('../../../../../../extensionVariables', () => ({
  ext: {
    context: { extensionPath: 'D:\\extension', subscriptions: [] },
    extensionVersion: '1.0.0',
    outputChannel: { appendLog: vi.fn() },
    webViewKey: { overview: 'overview' },
    workflowRuntimePort: 7071,
  },
}));

vi.mock('../../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: mocks.getLocalSettingsJson,
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  cacheWebviewPanel: mocks.cacheWebviewPanel,
  getAzureConnectorDetailsForLocalProject: mocks.getAzureConnectorDetailsForLocalProject,
  getStandardAppData: mocks.getStandardAppData,
  removeWebviewPanelFromCache: mocks.removeWebviewPanelFromCache,
  tryGetWebviewPanel: mocks.tryGetWebviewPanel,
}));

vi.mock('../../../../../utils/codeless/connection', () => ({
  getConnectionsJson: mocks.getConnectionsJson,
  getLogicAppProjectRoot: mocks.getLogicAppProjectRoot,
}));

vi.mock('../../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationToken: mocks.getAuthorizationToken,
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: mocks.getWebViewHTML,
}));

vi.mock('../../../../../utils/requestUtils', () => ({
  sendRequest: mocks.sendRequest,
}));

vi.mock('../../../../../utils/vsCodeConfig/launch', () => ({
  launchProjectDebugger: mocks.launchProjectDebugger,
}));

vi.mock('../../../../../utils/startRuntimeApi', () => ({
  isRuntimeUp: mocks.isRuntimeUp,
}));

vi.mock('../../../../../utils/delay', () => ({
  delay: mocks.delay,
}));

vi.mock('../../../../../utils/codeful', () => ({
  detectCodefulWorkflow: vi.fn(),
  extractTriggerNameFromCodeful: vi.fn(),
  extractHttpTriggerName: mocks.extractHttpTriggerName,
  hasHttpRequestTrigger: mocks.hasHttpRequestTrigger,
}));

vi.mock('../../../../../languageServer/languageServer', () => ({
  getCodefulWorkflowMetadata: mocks.getCodefulWorkflowMetadata,
}));

vi.mock('../../../monitoringView/openMonitoringView', () => ({
  openMonitoringView: mocks.openMonitoringView,
}));

vi.mock('../../../overviewCallbackInfo', () => ({
  shouldUpdateOverviewCallbackInfo: mocks.shouldUpdateOverviewCallbackInfo,
}));

import LocalCodefulOverviewPanel from '../localCodefulOverviewPanel';

const context = { telemetry: { properties: {}, measurements: {} } } as any;
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

function createMockPanel(): MockPanel {
  return {
    active: true,
    reveal: vi.fn(),
    webview: {
      html: '',
      onDidReceiveMessage: vi.fn(),
      postMessage: vi.fn().mockResolvedValue(true),
    },
    onDidDispose: vi.fn(),
  };
}

describe('LocalCodefulOverviewPanel', () => {
  let panel: MockPanel;

  beforeEach(() => {
    vi.clearAllMocks();
    panel = createMockPanel();
    mocks.createWebviewPanel.mockReturnValue(panel);
    mocks.tryGetWebviewPanel.mockReturnValue(undefined);
    mocks.isRuntimeUp.mockResolvedValue(true);
    mocks.readdirSync.mockReturnValue([]);
    mocks.getCodefulWorkflowMetadata.mockResolvedValue({ workflowName: 'workflow-a', triggerName: 'lspManual' });
    mocks.getLogicAppProjectRoot.mockResolvedValue('D:\\project');
    mocks.getLocalSettingsJson.mockResolvedValue({ Values: {} });
    mocks.getConnectionsJson.mockResolvedValue('{}');
    mocks.getAzureConnectorDetailsForLocalProject.mockResolvedValue({
      enabled: true,
      accessToken: 'azure-token',
      tenantId: 'tenant-id',
      subscriptionId: 'subscription-id',
      resourceGroupName: 'resource-group',
    });
    mocks.getAuthorizationToken.mockResolvedValue('local-token');
    mocks.getStandardAppData.mockImplementation((workflowName: string, workflowContent: any) => ({
      name: workflowName,
      kind: workflowContent?.kind ?? 'Stateful',
      operationOptions: workflowContent?.operationOptions,
      statelessRunMode: workflowContent?.statelessRunMode,
    }));
    mocks.extractHttpTriggerName.mockReturnValue(undefined);
    mocks.hasHttpRequestTrigger.mockImplementation((content: string) => content.includes('CreateHttpTrigger'));
    (ext as any).workflowRuntimePort = 7071;
  });

  it('initializes a codeful overview with discovered workflows and LSP fallback trigger metadata', async () => {
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

    const codefulPanel = new LocalCodefulOverviewPanel(context, vscode.Uri.file(codefulFilePath) as any);
    await codefulPanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    const initializePayload = initCall?.[0].data;

    expect(initializePayload.project).toBe('overview');
    expect(initializePayload.isCodeful).toBe(true);
    expect(initializePayload.workflowPropertiesList).toHaveLength(2);
    expect(initializePayload.workflowPropertiesList.map((w: any) => w.name)).toEqual(['workflow-a', 'workflow-b']);
    expect(initializePayload.workflowPropertiesList[0].triggerName).toBe('lspManual');
    expect(initializePayload.workflowPropertiesList[0].callbackInfo.value).toContain(
      '/workflows/workflow-a/triggers/lspManual/listCallbackUrl'
    );
  });

  it('posts per-workflow callback URL updates when the runtime base URL appears', async () => {
    vi.useFakeTimers();
    (ext as any).workflowRuntimePort = undefined;
    mocks.extractHttpTriggerName.mockReturnValue('manual');
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

    const codefulPanel = new LocalCodefulOverviewPanel(context, vscode.Uri.file(codefulFilePath) as any);
    await codefulPanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    expect(initCall?.[0].data.baseUrl).toBeUndefined();

    (ext as any).workflowRuntimePort = 7071;
    await vi.advanceTimersByTimeAsync(5000);

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_runtime_base_url,
      data: { baseUrl: 'http://localhost:7071/runtime/webhooks/workflow/api/management' },
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

    vi.useRealTimers();
  });

  it('refreshes source-fallback workflows from runtime metadata when runtime appears', async () => {
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
              triggers: { manual: { type: 'Request', kind: 'Http' } },
            },
          ],
        });
      }
      if (request.url.includes('/listCallbackUrl?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: `callback:${request.url}`, method: 'POST' });
      }
      throw new Error(`Unexpected request ${request.url}`);
    });

    const codefulPanel = new LocalCodefulOverviewPanel(context, vscode.Uri.file(codefulFilePath) as any);
    await codefulPanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

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

    vi.useRealTimers();
  });

  it('uses trigger details to resolve callback URLs when runtime workflow metadata omits trigger type', async () => {
    const codefulContent = 'WorkflowFactory.CreateStatefulWorkflow("workflow-a", workflow);';
    mocks.readFileSync.mockReturnValue(codefulContent);
    mocks.sendRequest.mockImplementation(async (_context: any, request: { url: string; method: string }) => {
      if (request.url.endsWith('/workflows?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({
          value: [{ name: 'workflow-a', kind: 'Stateful' }],
        });
      }
      if (request.url.endsWith('/workflows/workflow-a/triggers?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({
          value: [{ name: 'manual', properties: { type: 'Request', kind: 'Http' } }],
        });
      }
      if (request.url.includes('/listCallbackUrl?api-version=2019-10-01-edge-preview')) {
        return JSON.stringify({ value: `callback:${request.url}`, method: 'POST' });
      }
      throw new Error(`Unexpected request ${request.url}`);
    });

    const codefulPanel = new LocalCodefulOverviewPanel(context, vscode.Uri.file(codefulFilePath) as any);
    await codefulPanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    const initializePayload = initCall?.[0].data;

    expect(initializePayload.workflowPropertiesList).toHaveLength(1);
    expect(initializePayload.workflowPropertiesList[0].triggerName).toBe('manual');
    expect(initializePayload.workflowPropertiesList[0].callbackInfo.value).toContain(
      '/workflows/workflow-a/triggers/manual/listCallbackUrl'
    );
    expect(initializePayload.workflowPropertiesList[0].callbackInfo.value).not.toContain('/triggers/manual/run');
  });
});
