import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ext } from '../../../../../../extensionVariables';
import { openUrl } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { workspace } from 'vscode';

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(() => Promise.resolve(JSON.stringify({ definition: {} }))),
  },
  readFileSync: vi.fn(() => JSON.stringify({ definition: {} })),
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  getStandardAppData: vi.fn(() => ({ definition: {}, kind: 'Stateful' })),
  getWorkflowManagementBaseURI: vi.fn(() => 'https://management.azure.com/test'),
  getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({ enabled: false }),
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
  getTriggerName: vi.fn(() => 'manual'),
  getRunTriggerName: vi.fn(() => 'manual'),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
}));

vi.mock('../../../../../utils/codeless/connection', () => ({
  getConnectionsFromFile: vi.fn().mockResolvedValue('{}'),
  getCustomCodeFromFiles: vi.fn().mockResolvedValue({}),
  getLogicAppProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  getParametersFromFile: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({ Values: {} }),
}));

vi.mock('../../../../../utils/requestUtils', () => ({
  sendRequest: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/artifacts', () => ({
  getArtifactsInLocalProject: vi.fn().mockResolvedValue({ maps: {}, schemas: [] }),
}));

vi.mock('../../../../../utils/bundleFeed', () => ({
  getBundleVersionNumber: vi.fn().mockResolvedValue('1.0.0'),
}));

vi.mock('../../../unitTest/createUnitTestFromRun', () => ({
  createUnitTestFromRun: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

import { promises } from 'fs';
import LocalMonitoringPanel from '../localMonitoringPanel';
import { getBundleVersionNumber } from '../../../../../utils/bundleFeed';
import { getLocalSettingsJson } from '../../../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../../../utils/codeless/artifacts';
import { getWebViewHTML } from '../../../../../utils/codeless/getWebViewHTML';
import { getAzureConnectorDetailsForLocalProject } from '../../../../../utils/codeless/common';
import {
  getConnectionsFromFile,
  getCustomCodeFromFiles,
  getLogicAppProjectRoot,
  getParametersFromFile,
} from '../../../../../utils/codeless/connection';
import { createUnitTestFromRun } from '../../../unitTest/createUnitTestFromRun';
import { sendRequest } from '../../../../../utils/requestUtils';

describe('LocalMonitoringPanel', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;
  const mockRunId = 'workflows/test-workflow/runs/run-123';
  const mockWorkflowFilePath = '/test/project/test-workflow/workflow.json';

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).context = { extensionPath: '/extension', subscriptions: [] };
    (ext as any).telemetryReporter = { sendTelemetryEvent: vi.fn() };
    (ext as any).extensionVersion = '1.0.0';
    (ext as any).workflowRuntimePort = 8080;
    vi.mocked(getLogicAppProjectRoot).mockResolvedValue('/test/project');
    vi.mocked(getConnectionsFromFile).mockResolvedValue('{}');
    vi.mocked(getParametersFromFile).mockResolvedValue({});
    vi.mocked(getCustomCodeFromFiles).mockResolvedValue({});
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(getAzureConnectorDetailsForLocalProject).mockResolvedValue({ accessToken: 'token', enabled: false } as any);
    vi.mocked(getArtifactsInLocalProject).mockResolvedValue({ maps: {}, schemas: [] } as any);
    vi.mocked(getBundleVersionNumber).mockResolvedValue('1.0.0');
    vi.mocked(getWebViewHTML).mockResolvedValue('<html></html>');
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 1) } as any);
  });

  describe('constructor', () => {
    it('should construct with correct parameters', () => {
      const instance = new LocalMonitoringPanel(mockContext, mockRunId, mockWorkflowFilePath);
      expect(instance).toBeDefined();
    });

    it('should set isLocal to true', () => {
      const instance = new LocalMonitoringPanel(mockContext, mockRunId, mockWorkflowFilePath);
      expect(instance).toBeDefined();
    });
  });

  describe('create', () => {
    it('should reveal existing panel if one exists', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const mockReveal = vi.fn();
      vi.mocked(tryGetWebviewPanel).mockReturnValue({ active: false, reveal: mockReveal } as any);

      const instance = new LocalMonitoringPanel(mockContext, mockRunId, mockWorkflowFilePath);
      await instance.create();

      expect(mockReveal).toHaveBeenCalled();
    });

    it('creates a monitoring panel and caches it', async () => {
      const instance = new LocalMonitoringPanel(mockContext, mockRunId, mockWorkflowFilePath);

      await instance.create();

      expect(mockContext.telemetry.properties.extensionBundleVersion).toBe('1.0.0');
      expect((instance as any).panel.webview.html).toBe('<html></html>');
    });
  });

  describe('metadata', () => {
    it('builds monitoring metadata using the project path for bundle resolution', async () => {
      const instance = new LocalMonitoringPanel(mockContext, mockRunId, mockWorkflowFilePath);

      const metadata = await (instance as any).getDesignerPanelMetadata();

      expect(getBundleVersionNumber).toHaveBeenCalledWith('/test/project');
      expect(metadata.workflowName).toBe('test-workflow');
      expect(metadata.extensionBundleVersion).toBe('1.0.0');
      expect(metadata.workflowDetails).toEqual({});
    });
  });

  describe('webview messages', () => {
    function createMessageHarness() {
      const instance = new LocalMonitoringPanel(mockContext, mockRunId, mockWorkflowFilePath);
      (instance as any).panel = { webview: { postMessage: vi.fn() } };
      (instance as any).panelMetadata = {};
      (instance as any).connectionData = {};
      (instance as any).workflowDetails = {};
      (instance as any).apiHubServiceDetails = {};
      (instance as any).baseUrl = 'http://localhost:7071/admin';
      (instance as any).oauthRedirectUrl = 'vscode://auth';
      (instance as any).openContent = vi.fn();
      return instance;
    }

    it('handles monitoring webview commands', async () => {
      const instance = createMessageHarness();

      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.initialize });
      await (instance as any).handleWebviewMsg({
        command: ExtensionCommand.showContent,
        header: 'Header',
        id: 'content-id',
        title: 'Title',
        content: 'Content',
      });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.resubmitRun });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.logTelemetry, data: { area: 'monitoringArea' } });
      await (instance as any).handleWebviewMsg({
        command: ExtensionCommand.createUnitTestFromRun,
        runId: 'run-123',
        definition: {},
      });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.fileABug });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.getDesignerVersion });
      await (instance as any).handleWebviewMsg({ command: 'unknown' });

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: ExtensionCommand.initialize_frame })
      );
      expect((instance as any).openContent).toHaveBeenCalledWith('Header', 'content-id', 'Title', 'Content');
      expect(sendRequest).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/workflows/test-workflow/triggers/manual/histories/run-123/resubmit'),
        })
      );
      expect(ext.telemetryReporter.sendTelemetryEvent).toHaveBeenCalledWith('monitoringArea', { area: 'monitoringArea' });
      expect(createUnitTestFromRun).toHaveBeenCalledWith(expect.objectContaining({ fsPath: mockWorkflowFilePath }), 'run-123', {});
      expect(openUrl).toHaveBeenCalledWith('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: ExtensionCommand.getDesignerVersion })
      );
    });

    it('shows an error when resubmitting a run fails', async () => {
      const instance = createMessageHarness();
      vi.mocked(promises.readFile).mockRejectedValueOnce(new Error('read failed'));

      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.resubmitRun });

      const vscode = await import('vscode');
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Workflow run resubmit failed: read failed', 'OK');
    });
  });
});
