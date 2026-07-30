import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

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
    MockUri,
    MockRemoteWorkflowTreeItem,
    cacheWebviewPanel: vi.fn(),
    createWebviewPanel: vi.fn(),
    getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('remote-token'),
    getCallbackUrl: vi.fn(),
    getStandardAppData: vi.fn((workflowName: string, workflowContent: any) => ({
      name: workflowName,
      kind: workflowContent?.kind ?? 'Stateful',
      operationOptions: workflowContent?.operationOptions,
      statelessRunMode: workflowContent?.statelessRunMode,
    })),
    getTriggerName: vi.fn().mockReturnValue('manual'),
    getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
    getWorkflowManagementBaseURI: vi.fn().mockReturnValue('https://management.azure.com/runtime'),
    openMonitoringView: vi.fn(),
    removeWebviewPanelFromCache: vi.fn(),
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

vi.mock('@microsoft/logic-apps-shared', () => ({
  getTriggerName: mocks.getTriggerName,
  HTTP_METHODS: { GET: 'GET', POST: 'POST' },
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
  },
}));

vi.mock('../../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem', () => ({
  RemoteWorkflowTreeItem: mocks.MockRemoteWorkflowTreeItem,
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  cacheWebviewPanel: mocks.cacheWebviewPanel,
  getStandardAppData: mocks.getStandardAppData,
  getWorkflowManagementBaseURI: mocks.getWorkflowManagementBaseURI,
  removeWebviewPanelFromCache: mocks.removeWebviewPanelFromCache,
  tryGetWebviewPanel: mocks.tryGetWebviewPanel,
}));

vi.mock('../../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: mocks.getAuthorizationTokenFromNode,
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: mocks.getWebViewHTML,
}));

vi.mock('../../../monitoringView/openMonitoringView', () => ({
  openMonitoringView: mocks.openMonitoringView,
}));

vi.mock('../../../overviewCallbackInfo', () => ({
  shouldUpdateOverviewCallbackInfo: mocks.shouldUpdateOverviewCallbackInfo,
}));

import RemoteOverviewPanel from '../remoteOverviewPanel';

const context = { telemetry: { properties: {}, measurements: {} } } as any;

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

function createRemoteNode() {
  return Object.assign(new mocks.MockRemoteWorkflowTreeItem(), {
    id: 'remote-app',
    name: 'remote-workflow',
    workflowFileContent: {
      definition: {
        triggers: { manual: { type: 'Request', kind: 'Http' } },
        actions: {},
      },
      kind: 'Stateful',
    },
    getCallbackUrl: mocks.getCallbackUrl.mockResolvedValue({ value: 'https://callback.remote/manual', method: 'POST' }),
    subscription: { subscriptionId: 'remote-subscription' },
    parent: {
      parent: {
        site: { location: 'West US', resourceGroup: 'remote-rg' },
      },
      subscription: {
        environment: { resourceManagerEndpointUrl: 'https://management.azure.com' },
        tenantId: 'remote-tenant',
      },
    },
  });
}

describe('RemoteOverviewPanel', () => {
  let panel: MockPanel;

  beforeEach(() => {
    vi.clearAllMocks();
    panel = createMockPanel();
    mocks.createWebviewPanel.mockReturnValue(panel);
    mocks.tryGetWebviewPanel.mockReturnValue(undefined);
    mocks.getAuthorizationTokenFromNode.mockResolvedValue('remote-token');
    mocks.getWorkflowManagementBaseURI.mockReturnValue('https://management.azure.com/runtime');
    mocks.getTriggerName.mockReturnValue('manual');
    mocks.getStandardAppData.mockImplementation((workflowName: string, workflowContent: any) => ({
      name: workflowName,
      kind: workflowContent?.kind ?? 'Stateful',
      operationOptions: workflowContent?.operationOptions,
      statelessRunMode: workflowContent?.statelessRunMode,
    }));
  });

  it('initializes remote overview with Azure metadata and CORS notice', async () => {
    const remoteNode = createRemoteNode();
    const remotePanel = new RemoteOverviewPanel(context, remoteNode as any);
    await remotePanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    const initializePayload = initCall?.[0].data;

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
  });

  it('passes remote node to openMonitoringView on loadRun', async () => {
    const remoteNode = createRemoteNode();
    const remotePanel = new RemoteOverviewPanel(context, remoteNode as any);
    await remotePanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({
      command: ExtensionCommand.loadRun,
      item: { id: 'workflows/remote-workflow/runs/run-1' },
    });

    expect(mocks.openMonitoringView).toHaveBeenCalledWith(context, remoteNode, 'workflows/remote-workflow/runs/run-1', undefined);
  });

  it('sets isCodeful to false for remote overview', async () => {
    const remoteNode = createRemoteNode();
    const remotePanel = new RemoteOverviewPanel(context, remoteNode as any);
    await remotePanel.create();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ command: ExtensionCommand.initialize });

    const initCall = panel.webview.postMessage.mock.calls.find(([msg]: any) => msg.command === ExtensionCommand.initialize_frame);
    expect(initCall?.[0].data.isCodeful).toBe(false);
  });
});
