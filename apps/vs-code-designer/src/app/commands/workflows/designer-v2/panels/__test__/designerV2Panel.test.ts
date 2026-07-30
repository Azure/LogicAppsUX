import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ext } from '../../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  getStandardAppData: vi.fn(() => ({ definition: {}, kind: 'Stateful' })),
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  openReadOnlyJson: vi.fn(),
  openUrl: vi.fn(),
}));

import { DesignerV2Panel } from '../designerV2Panel';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';

// Concrete test subclass to test abstract base class behavior
class TestDesignerV2Panel extends DesignerV2Panel {
  constructor(context: any, workflowName: string, runId?: string) {
    super(context, workflowName, `test-${workflowName}`, '2019-10-01-edge-preview', 'testKey', true, runId);
  }

  public async create(): Promise<void> {
    // no-op for testing base class
  }

  // Expose protected method for testing
  public async testOpenContent(header: number, id: string, title: string, content: string): Promise<void> {
    return this.openContent(header, id, title, content);
  }
}

describe('DesignerV2Panel (base class)', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).context = {
      extensionPath: '/extension',
      subscriptions: [],
      globalState: { get: vi.fn().mockReturnValue(undefined), update: vi.fn().mockResolvedValue(undefined) },
    };
  });

  describe('constructor', () => {
    it('sets readOnly to false regardless of runId', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow', 'workflows/wf/runs/run-1');
      expect((instance as any).readOnly).toBe(false);
    });

    it('sets isMonitoringView to true when runId is provided', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow', 'workflows/wf/runs/run-1');
      expect((instance as any).isMonitoringView).toBe(true);
    });

    it('sets isMonitoringView to false when no runId', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow');
      expect((instance as any).isMonitoringView).toBe(false);
    });

    it('extracts run name from full path', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow', 'workflows/wf/runs/08585CU01');
      expect((instance as any).runId).toBe('08585CU01');
    });

    it('handles bare run name', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow', '08585CU01');
      expect((instance as any).runId).toBe('08585CU01');
    });

    it('sets empty runId when none provided', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow');
      expect((instance as any).runId).toBe('');
    });
  });

  describe('selectRun', () => {
    it('sends selectRun message to webview panel', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow');
      (instance as any).panel = { webview: { postMessage: vi.fn() } };

      instance.selectRun('workflows/wf/runs/08585CU01');

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.selectRun,
        runId: '08585CU01',
      });
    });

    it('does not throw when panel is undefined', () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow');
      (instance as any).panel = undefined;

      expect(() => instance.selectRun('run-1')).not.toThrow();
    });
  });

  describe('openContent', () => {
    it('opens inputs with correct label', async () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow');
      await instance.testOpenContent(0, 'action-1', 'HTTP', '{"url":"https://example.com"}');

      expect(openReadOnlyJson).toHaveBeenCalledWith({ label: 'Inputs-HTTP', fullId: 'action-1' }, { url: 'https://example.com' });
    });

    it('opens outputs with correct label', async () => {
      const instance = new TestDesignerV2Panel(mockContext, 'myWorkflow');
      await instance.testOpenContent(1, 'action-2', 'Response', '{"statusCode":200}');

      expect(openReadOnlyJson).toHaveBeenCalledWith({ label: 'Outputs-Response', fullId: 'action-2' }, { statusCode: 200 });
    });
  });
});
