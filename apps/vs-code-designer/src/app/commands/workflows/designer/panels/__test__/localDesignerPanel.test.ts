import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ext } from '../../../../../../extensionVariables';
import { openUrl } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { env, workspace } from 'vscode';
import axios from 'axios';
import { writeFileSync } from 'fs';

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string, ...args: string[]) =>
    defaultMsg.replace(/{(\d+)}/g, (_match, index) => args[Number(index)] ?? ''),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(() =>
    JSON.stringify({
      definition: {
        actions: {
          Liquid_Action: { type: 'Liquid', inputs: { map: {} } },
          Xml_Action: { type: 'XmlValidation', inputs: { schema: {} } },
          Xslt_Action: { type: 'Xslt', inputs: { map: {} } },
          FlatFile_Action: { type: 'FlatFileEncoding', inputs: { schema: {} } },
          If_Action: { type: 'If', else: { actions: { Nested_Liquid: { type: 'Liquid', inputs: { map: {} } } } } },
          Scope_Action: { type: 'Scope', actions: { Nested_Xml: { type: 'XmlValidation', inputs: { schema: {} } } } },
          Switch_Action: {
            type: 'Switch',
            cases: { Case1: { actions: { Nested_Xslt: { type: 'Xslt', inputs: { map: {} } } } } },
            default: { actions: { Nested_FlatFile: { type: 'FlatFileDecoding', inputs: { schema: {} } } } },
          },
        },
      },
    })
  ),
  writeFileSync: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  getStandardAppData: vi.fn(() => ({ definition: {}, kind: 'Stateful' })),
  getWorkflowManagementBaseURI: vi.fn(() => 'https://management.azure.com/test'),
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

vi.mock('../../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

import LocalDesignerPanel from '../localDesignerPanel';
import { createNewDataMapCmd } from '../../../../dataMapper/dataMapper';
import { createUnitTest } from '../../../unitTest/createUnitTest';
import { getBundleVersionNumber } from '../../../../../utils/bundleFeed';
import { getLocalSettingsJson } from '../../../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../../../utils/codeless/artifacts';
import { getWebViewHTML } from '../../../../../utils/codeless/getWebViewHTML';
import {
  addConnectionData,
  getConnectionsAndSettingsToUpdate,
  getConnectionsFromFile,
  getCustomCodeFromFiles,
  getCustomCodeToUpdate,
  getLogicAppProjectRoot,
  getParametersFromFile,
  saveConnectionReferences,
  saveCustomCodeStandard,
} from '../../../../../utils/codeless/connection';
import { getAzureConnectorDetailsForLocalProject, getManualWorkflowsInLocalProject } from '../../../../../utils/codeless/common';
import { startDesignTimeApi } from '../../../../../utils/codeless/startDesignTimeApi';
import { saveWorkflowParameter } from '../../../../../utils/codeless/parameter';

describe('LocalDesignerPanel', () => {
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
    vi.mocked(getConnectionsFromFile).mockResolvedValue('{}');
    vi.mocked(getParametersFromFile).mockResolvedValue({});
    vi.mocked(getCustomCodeFromFiles).mockResolvedValue({});
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(getAzureConnectorDetailsForLocalProject).mockResolvedValue({ accessToken: 'token', enabled: false } as any);
    vi.mocked(getManualWorkflowsInLocalProject).mockResolvedValue({} as any);
    vi.mocked(getArtifactsInLocalProject).mockResolvedValue({ maps: {}, schemas: [] } as any);
    vi.mocked(getBundleVersionNumber).mockResolvedValue('1.0.0');
    vi.mocked(getWebViewHTML).mockResolvedValue('<html></html>');
    vi.mocked(startDesignTimeApi).mockResolvedValue(undefined);
    vi.mocked(axios.get).mockResolvedValue({ data: { properties: { manifest: {} } } });
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 1) } as any);
  });

  describe('constructor', () => {
    it('should construct with correct workflow name from file path', () => {
      const instance = new LocalDesignerPanel(mockContext, mockUri);
      expect(instance).toBeDefined();
    });

    it('should set isLocal to true', () => {
      const instance = new LocalDesignerPanel(mockContext, mockUri);
      expect(instance).toBeDefined();
    });

    it('should handle run ID parameter', () => {
      const instance = new LocalDesignerPanel(mockContext, mockUri, undefined);
      expect(instance).toBeDefined();
    });
  });

  describe('create', () => {
    it('should return early if existing panel is found', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const mockPanel = { active: false, reveal: vi.fn() };
      vi.mocked(tryGetWebviewPanel).mockReturnValue(mockPanel as any);

      const instance = new LocalDesignerPanel(mockContext, mockUri);
      await instance.create();

      expect(mockPanel.reveal).toHaveBeenCalled();
    });

    it('should fail before creating a panel when design-time startup failed', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const { getLogicAppProjectRoot } = await import('../../../../../utils/codeless/connection');

      vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);
      vi.mocked(getLogicAppProjectRoot).mockResolvedValue('/test/project');
      ext.designTimeInstances.set('/test/project', {
        port: 7071,
        isStarting: false,
        startupError: 'func host failed to start',
      });

      const instance = new LocalDesignerPanel(mockContext, mockUri);

      await expect(instance.create()).rejects.toThrow(
        'Design time failed to start for project /test/project. func host failed to start'
      );
    });

    it('should fail when no design-time instance is available for the project', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      const { getLogicAppProjectRoot } = await import('../../../../../utils/codeless/connection');

      vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);
      vi.mocked(getLogicAppProjectRoot).mockResolvedValue('/test/project');

      const instance = new LocalDesignerPanel(mockContext, mockUri);

      await expect(instance.create()).rejects.toThrow('Design time is not running for project /test/project.');
    });

    it('creates a designer panel and caches it when design-time is available', async () => {
      ext.designTimeInstances.set('/test/project', { port: 7071, isStarting: false });
      const instance = new LocalDesignerPanel(mockContext, mockUri);

      await instance.create();

      expect(startDesignTimeApi).toHaveBeenCalledWith('/test/project');
      expect(mockContext.telemetry.properties.extensionBundleVersion).toBe('1.0.0');
      expect(axios.get).toHaveBeenCalledTimes(4);
      expect((instance as any).panel.webview.html).toBe('<html></html>');
    });
  });

  describe('metadata', () => {
    it('builds designer panel metadata using the project path for bundle resolution', async () => {
      const instance = new LocalDesignerPanel(mockContext, mockUri);
      const metadata = await (instance as any).getDesignerPanelMetadata({
        flatFileEncoding: { inputs: { properties: { schema: { properties: { source: true } } } } },
        liquidJsonToJson: { inputs: { properties: { map: { properties: { source: true } } } } },
        xmlValidation: { inputs: { properties: { schema: { properties: { source: true } } } } },
        xslt: { inputs: { properties: { map: { properties: { source: true } } } } },
      });

      expect(getBundleVersionNumber).toHaveBeenCalledWith('/test/project');
      expect(metadata.workflowName).toBe('myWorkflow');
      expect(metadata.extensionBundleVersion).toBe('1.0.0');
      expect(metadata.workflowContent.definition.actions.Liquid_Action.inputs.map.source).toBe('LogicApp');
      expect(metadata.workflowContent.definition.actions.Xml_Action.inputs.schema.source).toBe('LogicApp');
      expect(metadata.workflowContent.definition.actions.Xslt_Action.inputs.map.source).toBe('LogicApp');
      expect(metadata.workflowContent.definition.actions.FlatFile_Action.inputs.schema.source).toBe('LogicApp');
      expect(metadata.workflowContent.definition.actions.If_Action.else.actions.Nested_Liquid.inputs.map.source).toBe('LogicApp');
      expect(metadata.workflowContent.definition.actions.Scope_Action.actions.Nested_Xml.inputs.schema.source).toBe('LogicApp');
      expect(metadata.workflowContent.definition.actions.Switch_Action.cases.Case1.actions.Nested_Xslt.inputs.map.source).toBe('LogicApp');
      expect(metadata.workflowContent.definition.actions.Switch_Action.default.actions.Nested_FlatFile.inputs.schema.source).toBe(
        'LogicApp'
      );
    });

    it('reads localSettings after getAzureConnectorDetailsForLocalProject to avoid stale data from wizard writes', async () => {
      let azureDetailsResolved = false;

      vi.mocked(getAzureConnectorDetailsForLocalProject).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            azureDetailsResolved = true;
            resolve({ accessToken: 'token', enabled: true, subscriptionId: 'sub-1', tenantId: 'tenant-1' } as any);
          }, 50);
        });
      });
      vi.mocked(getLocalSettingsJson).mockImplementation(async () => {
        expect(azureDetailsResolved).toBe(true);
        return { Values: { WORKFLOWS_TENANT_ID: 'tenant-1', WORKFLOWS_SUBSCRIPTION_ID: 'sub-1' } } as any;
      });

      const instance = new LocalDesignerPanel(mockContext, mockUri);
      await (instance as any).getDesignerPanelMetadata({});

      expect(getLocalSettingsJson).toHaveBeenCalled();
    });
  });

  describe('webview messages', () => {
    function createMessageHarness() {
      const instance = new LocalDesignerPanel(mockContext, mockUri);
      (instance as any).panel = { webview: { postMessage: vi.fn() } };
      (instance as any).panelMetadata = {
        workflowContent: { definition: {} },
        parametersData: {},
        azureDetails: { tenantId: 'tenant', workflowManagementBaseUrl: 'https://management.azure.com' },
      };
      (instance as any).connectionData = {};
      (instance as any).workflowDetails = {};
      (instance as any).apiHubServiceDetails = {};
      (instance as any).baseUrl = 'http://localhost:7071/admin';
      (instance as any).workflowRuntimeBaseUrl = 'http://localhost:8080/admin';
      (instance as any).oauthRedirectUrl = 'vscode://auth';
      (instance as any).projectPath = '/test/project';
      (instance as any).getWorkflowRuntimeBaseUrl = () => 'http://localhost:8080/admin';
      (instance as any).saveWorkflow = vi.fn();
      (instance as any).createFileSystemConnection = vi.fn().mockResolvedValue({ connection: { id: 'connection' } });
      return instance;
    }

    it('handles initialize, save, and designer utility messages', async () => {
      const instance = createMessageHarness();

      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.initialize });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.save, definition: {} });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.createUnitTest, definition: {} });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.addConnection, connectionAndSetting: { name: 'conn' } });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.openOauthLoginPopup, url: 'https://login.example.com' });
      await (instance as any).handleWebviewMsg({
        command: ExtensionCommand.createFileSystemConnection,
        connectionName: 'filesystem',
        connectionInfo: { connectionParameters: {} },
      });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.openRelativeLink, content: '/dataMapper' });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.logTelemetry, data: { area: 'designerArea' } });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.fileABug });
      await (instance as any).handleWebviewMsg({ command: ExtensionCommand.getDesignerVersion });
      await (instance as any).handleWebviewMsg({ command: 'unknown' });

      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: ExtensionCommand.initialize_frame })
      );
      expect((instance as any).saveWorkflow).toHaveBeenCalled();
      expect(createUnitTest).toHaveBeenCalled();
      expect(addConnectionData).toHaveBeenCalledWith(expect.anything(), mockUri.fsPath, { name: 'conn' });
      expect(env.openExternal).toHaveBeenCalledWith('https://login.example.com');
      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.completeFileSystemConnection,
          data: expect.objectContaining({ connectionName: 'filesystem' }),
        })
      );
      expect(createNewDataMapCmd).toHaveBeenCalledWith(mockContext);
      expect(ext.telemetryReporter.sendTelemetryEvent).toHaveBeenCalledWith('designerArea', { area: 'designerArea' });
      expect(openUrl).toHaveBeenCalledWith('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: ExtensionCommand.getDesignerVersion })
      );

      clearInterval((instance as any).workflowRuntimeBaseUrlInterval);
    });
  });

  describe('saveWorkflow', () => {
    it('writes workflow, connection, custom code, and parameter updates', async () => {
      vi.mocked(getConnectionsAndSettingsToUpdate).mockResolvedValue({ managedApiConnections: {} } as any);
      vi.mocked(getCustomCodeToUpdate).mockResolvedValue({ codeFile: 'content' } as any);
      vi.mocked(getParametersFromFile).mockResolvedValueOnce({ preservedParameter: { value: 'existing' } } as any);
      const instance = new LocalDesignerPanel(mockContext, mockUri);
      (instance as any).panel = { webview: { postMessage: vi.fn() } };
      const workflow = { definition: { actions: {} } };
      const workflowToSave = {
        definition: { actions: { Response: { type: 'Response' } } },
        connectionReferences: { shared_connection: {} },
        customCodeData: { codeFile: 'content' },
        parameters: {
          $connections: { value: {} },
          myParameter: { defaultValue: 'default' },
        },
      };

      await (instance as any).saveWorkflow(
        mockContext,
        mockUri.fsPath,
        workflow,
        workflowToSave,
        {},
        'tenant',
        'https://management.azure.com'
      );

      expect(getConnectionsAndSettingsToUpdate).toHaveBeenCalled();
      expect(saveConnectionReferences).toHaveBeenCalledWith(mockContext, '/test/project', { managedApiConnections: {} });
      expect(getCustomCodeToUpdate).toHaveBeenCalledWith(mockContext, mockUri.fsPath, { codeFile: 'content' });
      expect(saveCustomCodeStandard).toHaveBeenCalledWith(mockUri.fsPath, { codeFile: 'content' });
      expect(saveWorkflowParameter).toHaveBeenCalledWith(
        mockContext,
        mockUri.fsPath,
        expect.objectContaining({
          myParameter: { value: 'default' },
          preservedParameter: { value: 'existing' },
        })
      );
      expect(writeFileSync).toHaveBeenCalledWith(mockUri.fsPath, expect.stringContaining('Response'));
      expect((instance as any).panel.webview.postMessage).toHaveBeenCalledWith({ command: ExtensionCommand.resetDesignerDirtyState });
    });

    it('reports and rethrows save failures', async () => {
      vi.mocked(getLogicAppProjectRoot).mockRejectedValueOnce(new Error('project lookup failed'));
      const instance = new LocalDesignerPanel(mockContext, mockUri);

      await expect((instance as any).saveWorkflow(mockContext, mockUri.fsPath, {}, { definition: {} }, {})).rejects.toThrow(
        'project lookup failed'
      );

      expect(mockContext.telemetry.properties.saveWorkflowError).toContain('project lookup failed');
    });
  });
});
