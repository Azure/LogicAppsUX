import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ext } from '../../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { workspace } from 'vscode';

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  getStandardAppData: vi.fn(() => ({ definition: {}, kind: 'Stateful' })),
  getWorkflowManagementBaseURI: vi.fn(() => 'https://management.azure.com/test'),
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
  getRunTriggerName: vi.fn(() => 'manual'),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
}));

vi.mock('../../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../../../../../utils/requestUtils', () => ({
  sendAzureRequest: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  openUrl: vi.fn(),
  openReadOnlyJson: vi.fn(),
}));

import { RemoteDesignerV2Panel } from '../remoteDesignerV2Panel';
import { openReadOnlyJson, openUrl } from '@microsoft/vscode-azext-utils';
import { sendAzureRequest } from '../../../../../utils/requestUtils';

const createMockNode = () => ({
  name: 'test-workflow',
  workflowFileContent: { definition: { triggers: { manual: { type: 'Request' } } } },
  subscription: {
    subscriptionId: 'sub-123',
    credentials: { getToken: vi.fn().mockResolvedValue('token') },
  },
  parent: {
    parent: {
      site: {
        location: 'West US',
        resourceGroup: 'test-rg',
        defaultHostName: 'myapp.azurewebsites.net',
      },
    },
    subscription: {
      environment: { resourceManagerEndpointUrl: 'https://management.azure.com' },
      tenantId: 'tenant-123',
    },
  },
  getConnectionsData: vi.fn().mockResolvedValue('{}'),
  getParametersData: vi.fn().mockResolvedValue({}),
  getAppSettings: vi.fn().mockResolvedValue({}),
  getArtifacts: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
  getChildWorkflows: vi.fn().mockResolvedValue({}),
});

describe('RemoteDesignerV2Panel', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).context = {
      extensionPath: '/extension',
      subscriptions: [],
      globalState: { get: vi.fn().mockReturnValue(undefined), update: vi.fn().mockResolvedValue(undefined) },
    };
    (ext as any).telemetryReporter = { sendTelemetryEvent: vi.fn() };
    (ext as any).extensionVersion = '1.0.0';
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
  });

  describe('constructor', () => {
    it('sets readOnly to true for remote panels', () => {
      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any);
      expect((instance as any).readOnly).toBe(true);
    });

    it('uses designerAzureV2 panel group key', () => {
      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any);
      expect((instance as any).panelGroupKey).toBe(ext.webViewKey.designerAzureV2);
    });

    it('sets isMonitoringView to true when runId is provided', () => {
      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any, 'workflows/wf/runs/run-1');
      expect((instance as any).isMonitoringView).toBe(true);
      expect((instance as any).runId).toBe('run-1');
    });

    it('sets isMonitoringView to false when no runId', () => {
      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any);
      expect((instance as any).isMonitoringView).toBe(false);
    });
  });

  describe('create', () => {
    it('reveals existing panel and sends selectRun when runId is provided', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const mockPanel = { active: false, reveal: vi.fn(), webview: { postMessage: vi.fn() } };
      vi.mocked(tryGetWebviewPanel).mockReturnValue(mockPanel as any);

      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any, 'workflows/wf/runs/run-1');
      await instance.create();

      expect(mockPanel.reveal).toHaveBeenCalled();
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.selectRun,
        runId: 'run-1',
      });
    });

    it('reveals existing panel without selectRun when no runId', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const mockPanel = { active: false, reveal: vi.fn(), webview: { postMessage: vi.fn() } };
      vi.mocked(tryGetWebviewPanel).mockReturnValue(mockPanel as any);

      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any);
      await instance.create();

      expect(mockPanel.reveal).toHaveBeenCalled();
      expect(mockPanel.webview.postMessage).not.toHaveBeenCalled();
    });

    it('creates a new panel when no existing panel is cached', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);

      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any);
      await instance.create();

      expect((instance as any).panel).toBeDefined();
    });
  });

  describe('message handling', () => {
    function createMessageHarness(runId?: string) {
      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any, runId);
      (instance as any).panel = { webview: { postMessage: vi.fn() } };
      (instance as any).panelMetadata = { workflowName: 'test-workflow' };
      (instance as any).connectionData = {};
      (instance as any).apiHubServiceDetails = {};
      (instance as any).baseUrl = 'https://management.azure.com/test';
      return instance;
    }

    it('responds to getDesignerVersion with hardcoded 2', async () => {
      const instance = createMessageHarness();
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.getDesignerVersion });

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.getDesignerVersion,
        data: 2,
      });
    });

    it('handles showContent for monitoring', async () => {
      const instance = createMessageHarness();
      await (instance as any).handleWebviewMsg({
        command: ExtensionCommand.showContent,
        header: 1,
        id: 'action-id',
        title: 'HTTP',
        content: '{"statusCode":200}',
      });

      expect(openReadOnlyJson).toHaveBeenCalledWith({ label: 'Outputs-HTTP', fullId: 'action-id' }, { statusCode: 200 });
    });

    it('handles resubmitRun using runId from message payload', async () => {
      const instance = createMessageHarness();
      await (instance as any).handleWebviewMsg({
        command: ExtensionCommand.resubmitRun,
        runId: 'msg-run-id',
      });

      expect(sendAzureRequest).toHaveBeenCalledWith(expect.stringContaining('msg-run-id/resubmit'), mockContext, 'POST', expect.anything());
    });

    it('sends initialize_frame with readOnly true and runId', async () => {
      const instance = createMessageHarness('workflows/wf/runs/my-run');
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.initialize });

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.initialize_frame,
          data: expect.objectContaining({
            readOnly: true,
            isMonitoringView: true,
            runId: 'my-run',
          }),
        })
      );
    });

    it('handles logTelemetry', async () => {
      const instance = createMessageHarness();
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.logTelemetry, data: { area: 'test' } });
      expect(ext.telemetryReporter.sendTelemetryEvent).toHaveBeenCalledWith('test', { area: 'test' });
    });

    it('handles fileABug', async () => {
      const instance = createMessageHarness();
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.fileABug });
      expect(openUrl).toHaveBeenCalledWith('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
    });
  });

  describe('selectRun', () => {
    it('sends selectRun message to webview with extracted run name', () => {
      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any);
      (instance as any).panel = { webview: { postMessage: vi.fn() } };

      instance.selectRun('workflows/myWorkflow/runs/08585CU01');

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.selectRun,
        runId: '08585CU01',
      });
    });

    it('handles bare run name without path', () => {
      const node = createMockNode();
      const instance = new RemoteDesignerV2Panel(mockContext, node as any);
      (instance as any).panel = { webview: { postMessage: vi.fn() } };

      instance.selectRun('08585CU01');

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.selectRun,
        runId: '08585CU01',
      });
    });
  });
});
