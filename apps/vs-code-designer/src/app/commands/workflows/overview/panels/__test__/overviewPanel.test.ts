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

  return {
    MockUri,
    cacheWebviewPanel: vi.fn(),
    createWebviewPanel: vi.fn(),
    getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
    openMonitoringView: vi.fn(),
    removeWebviewPanelFromCache: vi.fn(),
    tryGetWebviewPanel: vi.fn(),
    shouldUpdateOverviewCallbackInfo: vi.fn((current: any, updated: any) => {
      if (!updated) {
        return false;
      }
      return updated.value !== current?.value;
    }),
  };
});

vi.mock('vscode', () => ({
  Uri: mocks.MockUri,
  ViewColumn: { Active: -1 },
  window: { createWebviewPanel: mocks.createWebviewPanel },
  workspace: { name: 'test-workspace' },
}));

vi.mock('../../../../../../extensionVariables', () => ({
  ext: {
    context: { extensionPath: 'D:\\extension', subscriptions: [] },
    extensionVersion: '1.0.0',
    outputChannel: { appendLog: vi.fn() },
    webViewKey: { overview: 'overview' },
  },
}));

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  cacheWebviewPanel: mocks.cacheWebviewPanel,
  removeWebviewPanelFromCache: mocks.removeWebviewPanelFromCache,
  tryGetWebviewPanel: mocks.tryGetWebviewPanel,
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

import { OverviewPanel } from '../overviewPanel';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';

class TestOverviewPanel extends OverviewPanel {
  public mockAccessToken = 'test-token';
  public mockBaseUrl: string | undefined = 'http://localhost:7071/api';
  public mockCallbackInfo: ICallbackUrlResponse | undefined;

  constructor() {
    super(
      { telemetry: { properties: {}, measurements: {} } } as any,
      'test-workflow',
      'test-panel',
      'test-panel-title',
      '2019-10-01-edge-preview',
      true
    );
  }

  protected async initializeOverviewData(): Promise<void> {
    this.baseUrl = this.mockBaseUrl;
    this.accessToken = this.mockAccessToken;
    this.workflowProps = {
      name: 'test-workflow',
      stateType: 'Stateful',
      triggerName: 'manual',
      definition: { triggers: {}, actions: {} } as any,
      kind: 'Stateful',
    };
  }

  protected getBaseUrl(): string | undefined {
    return this.mockBaseUrl;
  }

  protected async getCallbackInfo(_baseUrl: string): Promise<ICallbackUrlResponse | undefined> {
    return this.mockCallbackInfo;
  }

  protected async getAccessToken(): Promise<string> {
    return this.mockAccessToken;
  }

  protected getWorkflowNode(): vscode.Uri | undefined {
    return this.workflowFilePath ? vscode.Uri.file(this.workflowFilePath) : undefined;
  }

  public exposePanel() {
    return this.panel;
  }
}

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

describe('OverviewPanel', () => {
  let panel: MockPanel;
  let overviewPanel: TestOverviewPanel;

  beforeEach(() => {
    vi.clearAllMocks();
    panel = createMockPanel();
    mocks.createWebviewPanel.mockReturnValue(panel);
    mocks.tryGetWebviewPanel.mockReturnValue(undefined);
    overviewPanel = new TestOverviewPanel();
  });

  describe('create()', () => {
    it('should create a new panel when none exists', async () => {
      await overviewPanel.create();

      expect(mocks.createWebviewPanel).toHaveBeenCalledWith('workflowOverview', 'test-panel-title', -1, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      expect(mocks.cacheWebviewPanel).toHaveBeenCalledWith('overview', 'test-panel', panel);
    });

    it('should reveal existing panel instead of creating new one', async () => {
      const existingPanel = createMockPanel();
      existingPanel.active = false;
      mocks.tryGetWebviewPanel.mockReturnValue(existingPanel);

      await overviewPanel.create();

      expect(existingPanel.reveal).toHaveBeenCalledWith(-1);
      expect(mocks.createWebviewPanel).not.toHaveBeenCalled();
    });

    it('should not reveal an already-active existing panel', async () => {
      const existingPanel = createMockPanel();
      existingPanel.active = true;
      mocks.tryGetWebviewPanel.mockReturnValue(existingPanel);

      await overviewPanel.create();

      expect(existingPanel.reveal).not.toHaveBeenCalled();
      expect(mocks.createWebviewPanel).not.toHaveBeenCalled();
    });
  });

  describe('handleWebviewMsg()', () => {
    it('should send initialize_frame on initialize command', async () => {
      await overviewPanel.create();

      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
      await messageHandler({ command: ExtensionCommand.initialize });

      expect(panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.initialize_frame,
        data: expect.objectContaining({
          project: 'overview',
          apiVersion: '2019-10-01-edge-preview',
          baseUrl: 'http://localhost:7071/api',
          accessToken: 'test-token',
          isLocal: true,
          workflowProperties: expect.objectContaining({ name: 'test-workflow' }),
        }),
      });
    });

    it('should call openMonitoringView on loadRun command', async () => {
      overviewPanel.workflowFilePath = 'D:\\project\\workflow\\workflow.json';
      await overviewPanel.create();

      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
      await messageHandler({ command: ExtensionCommand.loadRun, item: { id: 'run-123' } });

      expect(mocks.openMonitoringView).toHaveBeenCalled();
    });
  });

  describe('intervals', () => {
    it('should update access token when it changes', async () => {
      vi.useFakeTimers();
      await overviewPanel.create();

      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
      await messageHandler({ command: ExtensionCommand.initialize });

      overviewPanel.mockAccessToken = 'new-token';
      await vi.advanceTimersByTimeAsync(5000);

      expect(panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.update_access_token,
        data: { accessToken: 'new-token' },
      });

      vi.useRealTimers();
    });

    it('should update base URL when it changes', async () => {
      vi.useFakeTimers();
      await overviewPanel.create();

      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
      await messageHandler({ command: ExtensionCommand.initialize });

      overviewPanel.mockBaseUrl = 'http://localhost:8080/api';
      await vi.advanceTimersByTimeAsync(5000);

      expect(panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.update_runtime_base_url,
        data: { baseUrl: 'http://localhost:8080/api' },
      });

      vi.useRealTimers();
    });

    it('should clear intervals on dispose', async () => {
      vi.useFakeTimers();
      await overviewPanel.create();

      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
      await messageHandler({ command: ExtensionCommand.initialize });

      const disposeHandler = panel.onDidDispose.mock.calls[0][0];
      disposeHandler();

      overviewPanel.mockAccessToken = 'should-not-be-sent';
      await vi.advanceTimersByTimeAsync(10000);

      expect(panel.webview.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.update_access_token,
          data: { accessToken: 'should-not-be-sent' },
        })
      );

      vi.useRealTimers();
    });
  });
});
