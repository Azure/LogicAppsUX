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
    getAuthorizationToken: vi.fn().mockResolvedValue('local-token'),
    getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({
      enabled: true,
      accessToken: 'azure-token',
      tenantId: 'tenant-id',
      subscriptionId: 'subscription-id',
      resourceGroupName: 'resource-group',
    }),
    getConnectionsJson: vi.fn().mockResolvedValue('{}'),
    getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
    getLogicAppProjectRoot: vi.fn().mockResolvedValue('D:\\project'),
    getRequestTriggerName: vi.fn().mockReturnValue('manual'),
    getTriggerName: vi.fn().mockReturnValue('manual'),
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
    removeWebviewPanelFromCache: vi.fn(),
    sendRequest: vi.fn(),
    shouldUpdateOverviewCallbackInfo: vi.fn((current: any, updated: any) => {
      if (!updated) {
        return false;
      }
      return updated.value !== current?.value;
    }),
    tryGetWebviewPanel: vi.fn(),
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
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRequestTriggerName: mocks.getRequestTriggerName,
  getTriggerName: mocks.getTriggerName,
  HTTP_METHODS: { GET: 'GET', POST: 'POST' },
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
}));

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
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

vi.mock('../../../monitoringView/openMonitoringView', () => ({
  openMonitoringView: mocks.openMonitoringView,
}));

vi.mock('../../../overviewCallbackInfo', () => ({
  shouldUpdateOverviewCallbackInfo: mocks.shouldUpdateOverviewCallbackInfo,
}));

import LocalOverviewPanel from '../localOverviewPanel';

const context = { telemetry: { properties: {}, measurements: {} } } as any;
const workflowFilePath = path.join('D:\\project', 'workflow-a', 'workflow.json');

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

function mockWorkflowJson(definition: any, kind = 'Stateful'): void {
  mocks.readFileSync.mockReturnValue(JSON.stringify({ definition, kind }));
}

describe('LocalOverviewPanel', () => {
  let panel: MockPanel;

  beforeEach(() => {
    vi.clearAllMocks();
    panel = createMockPanel();
    mocks.createWebviewPanel.mockReturnValue(panel);
    mocks.tryGetWebviewPanel.mockReturnValue(undefined);
    mocks.isRuntimeUp.mockResolvedValue(true);
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
    mocks.getTriggerName.mockReturnValue('manual');
    (ext as any).workflowRuntimePort = 7071;
  });

  it('uses callback URLs for request-triggered codeless local workflows', async () => {
    mocks.getRequestTriggerName.mockReturnValue('manual');
    mockWorkflowJson({
      triggers: { manual: { type: 'Request', kind: 'Http' } },
      actions: {},
    });
    mocks.sendRequest.mockResolvedValue(JSON.stringify({ value: 'https://callback.local/manual', method: 'POST' }));

    const localPanel = new LocalOverviewPanel(context, vscode.Uri.file(workflowFilePath) as any);
    await localPanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    const initializePayload = initCall?.[0].data;

    expect(initializePayload.workflowProperties.callbackInfo).toEqual({
      value: 'https://callback.local/manual',
      method: 'POST',
    });
    expect(mocks.sendRequest).toHaveBeenCalledWith(context, {
      method: 'POST',
      url: 'http://localhost:7071/runtime/webhooks/workflow/api/management/workflows/workflow-a/triggers/manual/listCallbackUrl?api-version=2019-10-01-edge-preview',
    });
  });

  it('uses the management run endpoint for codeless local workflows without request triggers', async () => {
    mocks.getRequestTriggerName.mockReturnValue(undefined);
    mocks.getTriggerName.mockReturnValue('recurrence');
    mockWorkflowJson({
      triggers: { recurrence: { type: 'Recurrence' } },
      actions: {},
    });

    const localPanel = new LocalOverviewPanel(context, vscode.Uri.file(workflowFilePath) as any);
    await localPanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    const initializePayload = initCall?.[0].data;

    expect(initializePayload.workflowProperties.callbackInfo).toEqual({
      value:
        'http://localhost:7071/runtime/webhooks/workflow/api/management/workflows/workflow-a/triggers/recurrence/run?api-version=2019-10-01-edge-preview',
      method: 'POST',
    });
    expect(mocks.sendRequest).not.toHaveBeenCalled();
  });

  it('launches debugger when runtime is not up', async () => {
    mocks.isRuntimeUp.mockResolvedValue(false);
    mockWorkflowJson({ triggers: {}, actions: {} });

    const localPanel = new LocalOverviewPanel(context, vscode.Uri.file(workflowFilePath) as any);
    await localPanel.create();

    expect(mocks.launchProjectDebugger).toHaveBeenCalledWith(context, 'D:\\project');
  });

  it('sets isLocal to true in initialize payload', async () => {
    mockWorkflowJson({ triggers: {}, actions: {} });

    const localPanel = new LocalOverviewPanel(context, vscode.Uri.file(workflowFilePath) as any);
    await localPanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    const initializePayload = initCall?.[0].data;

    expect(initializePayload.isLocal).toBe(true);
    expect(initializePayload.isCodeful).toBe(false);
    expect(initializePayload.project).toBe('overview');
  });
});
