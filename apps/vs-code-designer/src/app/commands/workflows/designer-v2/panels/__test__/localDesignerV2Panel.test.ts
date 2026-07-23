import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ext } from '../../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { workspace } from 'vscode';
import axios from 'axios';

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string, ...args: string[]) =>
    defaultMsg.replace(/{(\d+)}/g, (_match, index) => args[Number(index)] ?? ''),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(() =>
    JSON.stringify({
      definition: { actions: {}, triggers: { manual: { type: 'Request' } } },
    })
  ),
  writeFileSync: vi.fn(),
  promises: { readFile: vi.fn().mockResolvedValue(JSON.stringify({ definition: { triggers: { manual: { type: 'Request' } } } })) },
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  getStandardAppData: vi.fn(() => ({ definition: {}, kind: 'Stateful' })),
  getManualWorkflowsInLocalProject: vi.fn().mockResolvedValue({}),
  getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({ enabled: false }),
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
  getRunTriggerName: vi.fn(() => 'manual'),
}));

vi.mock('../../../../../utils/codeless/connection', () => ({
  getConnectionsFromFile: vi.fn().mockResolvedValue('{}'),
  getCustomCodeFromFiles: vi.fn().mockResolvedValue({}),
  getLogicAppProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  getParametersFromFile: vi.fn().mockResolvedValue({}),
  addConnectionData: vi.fn(),
  getConnectionsAndSettingsToUpdate: vi.fn(),
  saveConnectionReferences: vi.fn(),
  getCustomCodeToUpdate: vi.fn(),
  saveCustomCodeStandard: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/startDesignTimeApi', () => ({
  startDesignTimeApi: vi.fn(),
}));

vi.mock('../../../../../utils/requestUtils', () => ({
  sendRequest: vi.fn(),
}));

vi.mock('../../../../dataMapper/dataMapper', () => ({
  createNewDataMapCmd: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/parameter', () => ({
  saveWorkflowParameter: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/artifacts', () => ({
  getArtifactsInLocalProject: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
}));

vi.mock('../../../../../utils/bundleFeed', () => ({
  getBundleVersionNumber: vi.fn().mockResolvedValue('1.0.0'),
}));

vi.mock('../../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
}));

vi.mock('@azure/core-rest-pipeline', () => ({
  createHttpHeaders: vi.fn(),
}));

vi.mock('../../../unitTest/createUnitTest', () => ({
  createUnitTest: vi.fn(),
}));

vi.mock('../../../unitTest/createUnitTestFromRun', () => ({
  createUnitTestFromRun: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  openUrl: vi.fn(),
  callWithTelemetryAndErrorHandling: vi.fn(async (_name, callback) => callback({ telemetry: { properties: {} } })),
  openReadOnlyJson: vi.fn(),
}));

import LocalDesignerV2Panel from '../localDesignerV2Panel';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';
import { createUnitTestFromRun } from '../../../unitTest/createUnitTestFromRun';
import { sendRequest } from '../../../../../utils/requestUtils';
import { startDesignTimeApi } from '../../../../../utils/codeless/startDesignTimeApi';
import { getLogicAppProjectRoot } from '../../../../../utils/codeless/connection';
import { getWebViewHTML } from '../../../../../utils/codeless/getWebViewHTML';
import { getBundleVersionNumber } from '../../../../../utils/bundleFeed';
import { getLocalSettingsJson } from '../../../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../../../utils/codeless/artifacts';
import { getAzureConnectorDetailsForLocalProject, getManualWorkflowsInLocalProject } from '../../../../../utils/codeless/common';

describe('LocalDesignerV2Panel', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;
  const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    ext.designTimeInstances.clear();
    (ext as any).context = {
      extensionPath: '/extension',
      subscriptions: [],
      globalState: { get: vi.fn().mockReturnValue(undefined), update: vi.fn().mockResolvedValue(undefined) },
    };
    (ext as any).telemetryReporter = { sendTelemetryEvent: vi.fn() };
    (ext as any).extensionVersion = '1.0.0';
    (ext as any).workflowRuntimePort = 8080;
    vi.mocked(getLogicAppProjectRoot).mockResolvedValue('/test/project');
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(getAzureConnectorDetailsForLocalProject).mockResolvedValue({ accessToken: 'token', enabled: false } as any);
    vi.mocked(getManualWorkflowsInLocalProject).mockResolvedValue({} as any);
    vi.mocked(getArtifactsInLocalProject).mockResolvedValue({ maps: {}, schemas: [] } as any);
    vi.mocked(getBundleVersionNumber).mockResolvedValue('1.0.0');
    vi.mocked(getWebViewHTML).mockResolvedValue('<html></html>');
    vi.mocked(startDesignTimeApi).mockResolvedValue(undefined);
    vi.mocked(axios.get).mockResolvedValue({ data: { properties: { manifest: {} } } });
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
  });

  describe('constructor', () => {
    it('sets readOnly to false (V2 designer is always editable)', () => {
      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      expect((instance as any).readOnly).toBe(false);
    });

    it('sets isMonitoringView to false when no runId provided', () => {
      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      expect((instance as any).isMonitoringView).toBe(false);
    });

    it('sets isMonitoringView to true when runId is provided', () => {
      const instance = new LocalDesignerV2Panel(mockContext, mockUri, 'workflows/myWorkflow/runs/08585CU01');
      expect((instance as any).isMonitoringView).toBe(true);
      expect((instance as any).runId).toBe('08585CU01');
    });

    it('uses designerLocalV2 panel group key', () => {
      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      expect((instance as any).panelGroupKey).toBe(ext.webViewKey.designerLocalV2);
    });
  });

  describe('create', () => {
    it('reveals existing panel and sends selectRun when runId is provided', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const mockPanel = { active: false, reveal: vi.fn(), webview: { postMessage: vi.fn() } };
      vi.mocked(tryGetWebviewPanel).mockReturnValue(mockPanel as any);

      const instance = new LocalDesignerV2Panel(mockContext, mockUri, 'workflows/myWorkflow/runs/08585CU01');
      await instance.create();

      expect(mockPanel.reveal).toHaveBeenCalled();
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.selectRun,
        runId: '08585CU01',
      });
    });

    it('reveals existing panel without selectRun when no runId', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const mockPanel = { active: false, reveal: vi.fn(), webview: { postMessage: vi.fn() } };
      vi.mocked(tryGetWebviewPanel).mockReturnValue(mockPanel as any);

      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      await instance.create();

      expect(mockPanel.reveal).toHaveBeenCalled();
      expect(mockPanel.webview.postMessage).not.toHaveBeenCalled();
    });

    it('creates a new panel when no existing panel is cached', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);
      ext.designTimeInstances.set('/test/project', { port: 7071, isStarting: false });

      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      await instance.create();

      expect(startDesignTimeApi).toHaveBeenCalledWith('/test/project');
      expect((instance as any).panel.webview.html).toBe('<html></html>');
    });

    it('throws when design-time is not running', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);

      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      await expect(instance.create()).rejects.toThrow('Design time is not running');
    });
  });

  describe('message handling', () => {
    function createMessageHarness(runId?: string) {
      const instance = new LocalDesignerV2Panel(mockContext, mockUri, runId);
      (instance as any).panel = { webview: { postMessage: vi.fn() } };
      (instance as any).panelMetadata = {
        workflowContent: { definition: { triggers: { manual: { type: 'Request' } } } },
        parametersData: {},
        azureDetails: { tenantId: 'tenant', workflowManagementBaseUrl: 'https://management.azure.com' },
      };
      (instance as any).connectionData = {};
      (instance as any).apiHubServiceDetails = {};
      (instance as any).baseUrl = 'http://localhost:7071/admin';
      (instance as any).workflowRuntimeBaseUrl = 'http://localhost:8080/admin';
      (instance as any).oauthRedirectUrl = 'vscode://auth';
      (instance as any).projectPath = '/test/project';
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
        header: 0,
        id: 'action-id',
        title: 'HTTP',
        content: '{"body":"hello"}',
      });

      expect(openReadOnlyJson).toHaveBeenCalledWith({ label: 'Inputs-HTTP', fullId: 'action-id' }, { body: 'hello' });
    });

    it('handles resubmitRun using runId from message payload', async () => {
      const { promises } = await import('fs');
      vi.mocked(promises.readFile).mockResolvedValue(JSON.stringify({ definition: { triggers: { manual: { type: 'Request' } } } }));

      const instance = createMessageHarness();
      await (instance as any).handleWebviewMsg({
        command: ExtensionCommand.resubmitRun,
        runId: 'msg-run-id',
      });

      expect(sendRequest).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          url: expect.stringContaining('msg-run-id/resubmit'),
          method: 'POST',
        })
      );
    });

    it('handles createUnitTestFromRun', async () => {
      const instance = createMessageHarness();
      await (instance as any).handleWebviewMsg({
        command: ExtensionCommand.createUnitTestFromRun,
        runId: 'test-run-id',
        definition: { actions: {} },
      });

      expect(createUnitTestFromRun).toHaveBeenCalledWith(expect.anything(), 'test-run-id', { actions: {} });
    });

    it('clears previous interval on repeated initialize', async () => {
      const instance = createMessageHarness();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // First initialize
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.initialize });
      const firstInterval = (instance as any).workflowRuntimeBaseUrlInterval;
      expect(firstInterval).toBeDefined();

      // Second initialize (simulating webview reload)
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.initialize });

      expect(clearIntervalSpy).toHaveBeenCalledWith(firstInterval);

      clearInterval((instance as any).workflowRuntimeBaseUrlInterval);
      clearIntervalSpy.mockRestore();
    });

    it('sends initialize_frame with isMonitoringView and runId', async () => {
      const instance = createMessageHarness('workflows/wf/runs/my-run');
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.initialize });

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.initialize_frame,
          data: expect.objectContaining({
            isMonitoringView: true,
            runId: 'my-run',
            readOnly: false,
          }),
        })
      );

      clearInterval((instance as any).workflowRuntimeBaseUrlInterval);
    });
  });
});
