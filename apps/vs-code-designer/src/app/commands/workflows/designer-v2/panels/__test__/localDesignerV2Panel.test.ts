import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ext } from '../../../../../../extensionVariables';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { workspace, window, env } from 'vscode';
import axios from 'axios';
import path from 'path';
import { workflowAppApiVersion } from '../../../../../../constants';
import { promises as fsPromises, readFileSync, writeFileSync } from 'fs';
import { prepareCodefulRunSnapshot, type CodefulMonitoringContext } from '../../../monitoringView/codefulMonitoring';

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
}));

vi.mock('../../../../azureConnectors/azureConnectorDetails', () => ({
  getAzureConnectorDetailsForLocalProject: vi.fn().mockResolvedValue({ enabled: false }),
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@microsoft/logic-apps-shared', async (importActual) => ({
  ...(await importActual<typeof import('@microsoft/logic-apps-shared')>()),
  getRecordEntry: vi.fn((obj: any, key: string) => obj?.[key]),
  isEmptyString: vi.fn((s: any) => !s || (typeof s === 'string' && s.trim().length === 0)),
  resolveConnectionsReferences: vi.fn(() => ({})),
  HTTP_METHODS: { POST: 'POST', GET: 'GET' },
}));

vi.mock('../../../designer/utils/migration', () => ({
  getMigrationOptions: vi.fn().mockResolvedValue({ legacy: true }),
  migrateWorkflow: vi.fn(),
}));

vi.mock('../../../designer/utils/parameterMerge', () => ({
  mergeJsonParameters: vi.fn(),
}));

vi.mock('../../../designer/utils/fileSystemConnection', () => ({
  createFileSystemConnection: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationToken: vi.fn().mockResolvedValue('mock-refreshed-token'),
}));

vi.mock('../../../../../utils/codeless/connection', () => ({
  getConnectionsFromFile: vi.fn().mockResolvedValue('{}'),
  getCustomCodeFromFiles: vi.fn().mockResolvedValue({}),
  getLogicAppProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  getParametersFromFile: vi.fn().mockResolvedValue({}),
  addConnection: vi.fn(),
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
  createDataMap: vi.fn(),
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
import {
  getLogicAppProjectRoot,
  getConnectionsFromFile,
  getParametersFromFile,
  getCustomCodeFromFiles,
  getConnectionsAndSettingsToUpdate,
  saveConnectionReferences,
  saveCustomCodeStandard,
  addConnection,
  getCustomCodeToUpdate,
} from '../../../../../utils/codeless/connection';
import { getWebViewHTML } from '../../../../../utils/codeless/getWebViewHTML';
import { getBundleVersionNumber } from '../../../../../utils/bundleFeed';
import { getLocalSettingsJson } from '../../../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../../../utils/codeless/artifacts';
import { getAzureConnectorDetailsForLocalProject } from '../../../../azureConnectors/azureConnectorDetails';
import {
  getManualWorkflowsInLocalProject,
  tryGetWebviewPanel,
  cacheWebviewPanel,
  removeWebviewPanelFromCache,
} from '../../../../../utils/codeless/common';
import { getMigrationOptions, migrateWorkflow } from '../../../designer/utils/migration';
import { saveWorkflowParameter } from '../../../../../utils/codeless/parameter';
import { mergeJsonParameters } from '../../../designer/utils/parameterMerge';
import { createFileSystemConnection } from '../../../designer/utils/fileSystemConnection';
import { createDataMap } from '../../../../dataMapper/dataMapper';
import { createUnitTest } from '../../../unitTest/createUnitTest';
import { openUrl } from '@microsoft/vscode-azext-utils';
import { getAuthorizationToken } from '../../../../../utils/codeless/getAuthorizationToken';

describe('LocalDesignerV2Panel', () => {
  const mockContext = { telemetry: { properties: {}, measurements: {} } } as any;
  const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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
    vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);
    vi.mocked(getConnectionsFromFile).mockResolvedValue('{}');
    vi.mocked(getParametersFromFile).mockResolvedValue({});
    vi.mocked(getCustomCodeFromFiles).mockResolvedValue({});
    vi.mocked(getMigrationOptions).mockResolvedValue({ legacy: true });
    vi.mocked(writeFileSync).mockImplementation(() => {});
    vi.mocked(getAuthorizationToken).mockResolvedValue('mock-refreshed-token');
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        definition: { actions: {}, triggers: { manual: { type: 'Request' } } },
      })
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('keeps codeless V2 authoring editable', () => {
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

  describe('executed codeful monitoring', () => {
    const projectPath = path.resolve('offline-fixtures', 'authoring-project');
    const runtimeBaseUrl = 'http://localhost:17071/runtime/webhooks/workflow/api/management';

    function deepFreeze<T>(value: T): T {
      if (value && typeof value === 'object') {
        for (const child of Object.values(value)) {
          deepFreeze(child);
        }
        Object.freeze(value);
      }
      return value;
    }

    function monitoringContext(
      fileName = 'Program.cs',
      workflowName = 'selected-workflow',
      runId = 'historical-run',
      project = projectPath
    ): CodefulMonitoringContext {
      const sourceUri = { scheme: 'file', fsPath: path.join(project, fileName) } as any;
      const run = deepFreeze({
        name: runId,
        id: `/workflows/${workflowName}/runs/${runId}`,
        properties: {
          workflow: {
            id: `/workflows/${workflowName}/versions/retained-version`,
            name: 'retained-version',
            unknownEnvelope: null,
            properties: {
              kind: 'Stateful',
              definition: {
                actions: { Historical: { type: 'Compose', inputs: [null, false, 0, '001'] } },
                triggers: { historicalTrigger: { type: 'Request', kind: 'Http' } },
              },
              parameters: { retained: { value: null } },
              unknownProperty: { format: 'custom-format', number: 1.25 },
            },
          },
        },
      });
      return deepFreeze({
        projectPath: project,
        sourceUri,
        workflowName,
        runId,
        runtimeBaseUrl,
        ...prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateful'),
      });
    }

    function panelHarness(monitoring = monitoringContext()) {
      ext.designTimeInstances.set(monitoring.projectPath, { port: 17070, isStarting: false });
      const webviewPanel = {
        webview: { html: '', postMessage: vi.fn(), onDidReceiveMessage: vi.fn() },
        onDidDispose: vi.fn(),
        onDidChangeViewState: vi.fn(),
        dispose: vi.fn(),
      };
      vi.mocked(window.createWebviewPanel).mockReturnValue(webviewPanel as any);
      const instance = new LocalDesignerV2Panel(
        mockContext,
        monitoring.sourceUri,
        `/workflows/${monitoring.workflowName}/runs/${monitoring.runId}`,
        monitoring
      );
      return { instance: instance as any, monitoring, webviewPanel };
    }

    it.each(['Program.cs', 'Workflow.cs'])(
      'creates read-only %s monitoring from the executed snapshot without reading or parsing C#',
      async (fileName) => {
        const { instance, monitoring, webviewPanel } = panelHarness(monitoringContext(fileName));
        vi.mocked(readFileSync).mockImplementation(() => {
          throw new Error('C# is not workflow JSON');
        });
        const parse = vi.spyOn(JSON, 'parse');
        await instance.create();

        expect(instance.workflowName).toBe('selected-workflow');
        expect(instance.readOnly).toBe(true);
        expect(instance.isMonitoringView).toBe(true);
        expect(instance.runId).toBe('historical-run');
        expect(instance.projectPath).toBe(projectPath);
        expect(instance.workflowRuntimeBaseUrl).toBe(runtimeBaseUrl);
        expect(instance.baseUrl).toBe('http://localhost:17070/runtime/webhooks/workflow/api/management');
        expect(instance.panelMetadata.workflowContent).toBe(monitoring.workflowContent);
        expect(instance.panelMetadata.workflowContent.definition).toBe(monitoring.workflowSnapshot.properties.definition);
        expect(webviewPanel.webview.html).toBe('<html></html>');
        expect(readFileSync).not.toHaveBeenCalled();
        expect(fsPromises.readFile).not.toHaveBeenCalled();
        expect(parse).not.toHaveBeenCalledWith(expect.stringContaining('WorkflowBuilder'));
        expect(getLogicAppProjectRoot).not.toHaveBeenCalled();
        expect(getMigrationOptions).not.toHaveBeenCalled();
        expect(migrateWorkflow).not.toHaveBeenCalled();
        expect(writeFileSync).not.toHaveBeenCalled();
      }
    );

    it('rejects direct C# run opening without the compiled context and rejects mismatched source/run context', () => {
      const monitoring = monitoringContext();
      expect(() => new LocalDesignerV2Panel(mockContext, monitoring.sourceUri, 'historical-run')).toThrow('named workflow Overview');
      expect(() => new LocalDesignerV2Panel(mockContext, monitoring.sourceUri, 'other-run', monitoring)).toThrow('does not match');
      const otherSource = { scheme: 'file', fsPath: path.join(projectPath, 'Other.cs') } as any;
      expect(() => new LocalDesignerV2Panel(mockContext, otherSource, 'historical-run', monitoring)).toThrow('does not match');
      expect(window.createWebviewPanel).not.toHaveBeenCalled();
    });

    it('initializes the decoded run identity when Overview supplies an encoded full resource ID', async () => {
      const monitoring = monitoringContext('Program.cs', 'workflow alpha', 'run+1');
      const { webviewPanel } = panelHarness(monitoring);
      const instance = new LocalDesignerV2Panel(
        mockContext,
        monitoring.sourceUri,
        '/workflows/workflow%20alpha/runs/run%2B1',
        monitoring
      ) as any;
      await instance.create();
      await instance.handleWebviewMsg({ command: ExtensionCommand.initialize });
      expect(instance.runId).toBe('run+1');
      expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.initialize_frame,
          data: expect.objectContaining({ runId: 'run+1' }),
        })
      );
    });

    it('isolates panel cache identity by project, selected workflow and executed run', () => {
      const first = panelHarness().instance;
      const secondWorkflow = panelHarness(monitoringContext('Program.cs', 'second-workflow')).instance;
      const secondRun = panelHarness(monitoringContext('Program.cs', 'selected-workflow', 'second-run')).instance;
      const secondProject = panelHarness(
        monitoringContext('Program.cs', 'selected-workflow', 'historical-run', `${projectPath}-other`)
      ).instance;
      expect(first.panelName).toBe(JSON.stringify([workspace.name, projectPath, 'selected-workflow', 'historical-run']));
      expect(new Set([first.panelName, secondWorkflow.panelName, secondRun.panelName, secondProject.panelName]).size).toBe(4);
      expect(first.panelGroupKey).toBe(ext.webViewKey.designerLocalV2);
    });

    it('retains all authoring metadata using the existing project helpers', async () => {
      const connections = '{"managedApiConnections":{"retained":{"connectionRuntimeUrl":"mock-runtime"}}}';
      const parameters = { parameterA: { type: 'String', value: 'mock-value' } };
      const customCode = { file: { fileName: 'script.js', fileContent: 'mock-code' } };
      const workflowDetails = { sibling: { definition: { actions: {}, triggers: {} } } };
      const artifacts = { maps: { Liquid: [] }, schemas: [] };
      const localSettings = { RETAINED_SETTING: 'mock-setting' };
      const azureDetails = {
        enabled: true,
        accessToken: 'mock-token',
        tenantId: 'mock-tenant',
        subscriptionId: 'mock-subscription',
        resourceGroupName: 'mock-group',
      };
      vi.mocked(getConnectionsFromFile).mockResolvedValue(connections);
      vi.mocked(getParametersFromFile).mockResolvedValue(parameters);
      vi.mocked(getCustomCodeFromFiles).mockResolvedValue(customCode as any);
      vi.mocked(getManualWorkflowsInLocalProject).mockResolvedValue(workflowDetails as any);
      vi.mocked(getArtifactsInLocalProject).mockResolvedValue(artifacts as any);
      vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: localSettings } as any);
      vi.mocked(getAzureConnectorDetailsForLocalProject).mockResolvedValue(azureDetails as any);
      const { instance, monitoring } = panelHarness();
      const metadata = await instance.getDesignerPanelMetadata();

      expect(metadata).toEqual(
        expect.objectContaining({
          panelId: instance.panelName,
          workflowName: monitoring.workflowName,
          workflowContent: monitoring.workflowContent,
          connectionsData: connections,
          parametersData: parameters,
          customCodeData: customCode,
          workflowDetails,
          artifacts,
          localSettings,
          appSettingNames: ['RETAINED_SETTING'],
          azureDetails,
          accessToken: 'mock-token',
          extensionBundleVersion: '1.0.0',
        })
      );
      expect(metadata.workflowContent).toBe(monitoring.workflowContent);
      expect(getConnectionsFromFile).toHaveBeenCalledWith(mockContext, monitoring.sourceUri.fsPath);
      expect(getParametersFromFile).toHaveBeenCalledWith(mockContext, monitoring.sourceUri.fsPath);
      expect(getCustomCodeFromFiles).toHaveBeenCalledWith(monitoring.sourceUri.fsPath);
      expect(getManualWorkflowsInLocalProject).toHaveBeenCalledWith(projectPath, monitoring.workflowName);
      expect(getArtifactsInLocalProject).toHaveBeenCalledWith(projectPath);
      expect(getAzureConnectorDetailsForLocalProject).toHaveBeenCalledWith(mockContext, projectPath);
      expect(getLocalSettingsJson).toHaveBeenCalledWith(mockContext, projectPath);
      expect(getBundleVersionNumber).toHaveBeenCalledWith(projectPath);
      expect(readFileSync).not.toHaveBeenCalled();
    });

    it('resolves metadata and the callback before allocating a webview panel', async () => {
      const { instance } = panelHarness();
      await instance.create();
      expect(vi.mocked(getLocalSettingsJson).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(window.createWebviewPanel).mock.invocationCallOrder[0]
      );
      expect(vi.mocked(env.asExternalUri).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(window.createWebviewPanel).mock.invocationCallOrder[0]
      );
    });

    it('reuses only the exact codeful cache key and selects its executed run', async () => {
      const { instance, monitoring } = panelHarness();
      const cached = { active: false, reveal: vi.fn(), webview: { postMessage: vi.fn() } };
      vi.mocked(tryGetWebviewPanel).mockReturnValue(cached as any);
      await instance.create();
      expect(tryGetWebviewPanel).toHaveBeenCalledWith(ext.webViewKey.designerLocalV2, instance.panelName);
      expect(cached.reveal).toHaveBeenCalledOnce();
      expect(cached.webview.postMessage).toHaveBeenCalledWith({ command: ExtensionCommand.selectRun, runId: monitoring.runId });
      expect(window.createWebviewPanel).not.toHaveBeenCalled();
    });

    it('reloads only a visible panel and removes its exact cache entry and timers on disposal', async () => {
      const { instance, webviewPanel } = panelHarness();
      await instance.create();
      await instance.handleWebviewMsg({ command: ExtensionCommand.initialize });
      const onViewChange = webviewPanel.onDidChangeViewState.mock.calls[0][0];
      const reload = vi.spyOn(instance, 'reloadWebviewPanel');
      await onViewChange({ webviewPanel: { ...webviewPanel, visible: false } });
      expect(reload).not.toHaveBeenCalled();
      await onViewChange({ webviewPanel: { ...webviewPanel, visible: true } });
      expect(reload).toHaveBeenCalledOnce();
      webviewPanel.onDidDispose.mock.calls[0][0]();
      expect(removeWebviewPanelFromCache).toHaveBeenCalledWith(ext.webViewKey.designerLocalV2, instance.panelName);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not allocate or cache a panel on metadata failure', async () => {
      vi.mocked(getParametersFromFile).mockRejectedValue(new Error('authoring metadata failed'));
      const { instance } = panelHarness();
      await expect(instance.create()).rejects.toThrow('authoring metadata failed');
      expect(window.createWebviewPanel).not.toHaveBeenCalled();
      expect(cacheWebviewPanel).not.toHaveBeenCalled();
      expect(getWebViewHTML).not.toHaveBeenCalled();
    });

    it('does not allocate a panel on callback resolution failure', async () => {
      vi.mocked(env.asExternalUri).mockRejectedValueOnce(new Error('callback failed'));
      const { instance } = panelHarness();
      await expect(instance.create()).rejects.toThrow('callback failed');
      expect(window.createWebviewPanel).not.toHaveBeenCalled();
      expect(cacheWebviewPanel).not.toHaveBeenCalled();
    });

    it('disposes the allocated panel and rethrows HTML failure without caching it', async () => {
      vi.mocked(getWebViewHTML).mockRejectedValue(new Error('HTML failed'));
      const { instance, webviewPanel } = panelHarness();
      await expect(instance.create()).rejects.toThrow('HTML failed');
      expect(window.createWebviewPanel).toHaveBeenCalledOnce();
      expect(webviewPanel.dispose).toHaveBeenCalledOnce();
      expect(cacheWebviewPanel).not.toHaveBeenCalled();
    });

    it('reloads authoring metadata while keeping the frozen historical snapshot and skipping migration', async () => {
      const { instance, monitoring, webviewPanel } = panelHarness();
      await instance.create();
      vi.mocked(getParametersFromFile).mockResolvedValue({ updated: { type: 'String', value: 'mock-new' } });
      const snapshotBefore = JSON.stringify(monitoring.workflowSnapshot);
      await instance.reloadWebviewPanel(webviewPanel);
      expect(instance.panelMetadata.parametersData).toEqual({ updated: { type: 'String', value: 'mock-new' } });
      expect(instance.panelMetadata.workflowContent).toBe(monitoring.workflowContent);
      expect(JSON.stringify(monitoring.workflowSnapshot)).toBe(snapshotBefore);
      expect(getParametersFromFile).toHaveBeenCalledTimes(2);
      expect(getMigrationOptions).not.toHaveBeenCalled();
      expect(migrateWorkflow).not.toHaveBeenCalled();
      expect(readFileSync).not.toHaveBeenCalled();
      expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.update_panel_metadata,
          data: expect.objectContaining({ panelMetadata: instance.panelMetadata }),
        })
      );
    });

    it('initializes read-only monitoring and pins its runtime through subsequent interval ticks', async () => {
      const { instance, monitoring, webviewPanel } = panelHarness();
      await instance.create();
      await instance.handleWebviewMsg({ command: ExtensionCommand.initialize });
      vi.mocked(ext.getWorkflowRuntimeBaseUrl).mockReturnValue('http://localhost:19999/another-project');
      await vi.advanceTimersByTimeAsync(3000);
      expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.initialize_frame,
          data: expect.objectContaining({
            workflowRuntimeBaseUrl: runtimeBaseUrl,
            readOnly: true,
            isMonitoringView: true,
            isLocal: true,
            runId: monitoring.runId,
            panelMetadata: expect.objectContaining({ workflowContent: monitoring.workflowContent }),
          }),
        })
      );
      expect(instance.workflowRuntimeBaseUrl).toBe(runtimeBaseUrl);
      expect(
        webviewPanel.webview.postMessage.mock.calls.some(([message]: any) => message.command === ExtensionCommand.update_runtime_base_url)
      ).toBe(false);
    });

    it('blocks save messages and direct save bypasses before mutating the snapshot or C# source', async () => {
      const { instance, monitoring } = panelHarness();
      await instance.create();
      const update = { definition: { actions: {}, triggers: {} }, parameters: {}, connectionReferences: {}, customCodeData: {} };
      await expect(instance.handleWebviewMsg({ command: ExtensionCommand.save, ...update })).rejects.toThrow('read-only');
      await expect(instance.saveWorkflow(mockContext, monitoring.sourceUri.fsPath, monitoring.workflowContent, update, {})).rejects.toThrow(
        'read-only'
      );
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(saveWorkflowParameter).not.toHaveBeenCalled();
      expect(getConnectionsAndSettingsToUpdate).not.toHaveBeenCalled();
      expect(saveConnectionReferences).not.toHaveBeenCalled();
      expect(saveCustomCodeStandard).not.toHaveBeenCalled();
      expect(instance.panelMetadata.workflowContent.definition).toBe(monitoring.workflowSnapshot.properties.definition);
    });

    it.each([undefined, 'explicit-run'])(
      'resubmits using the executed snapshot trigger without reading C# (message run %s)',
      async (messageRun) => {
        const { instance, monitoring } = panelHarness();
        await instance.create();
        vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('C# must not be parsed'));
        await instance.handleWebviewMsg({ command: ExtensionCommand.resubmitRun, runId: messageRun });
        expect(sendRequest).toHaveBeenCalledExactlyOnceWith(mockContext, {
          url: `${runtimeBaseUrl}/workflows/${monitoring.workflowName}/triggers/historicalTrigger/histories/${messageRun ?? monitoring.runId}/resubmit?api-version=${workflowAppApiVersion}`,
          method: 'POST',
        });
        expect(readFileSync).not.toHaveBeenCalled();
        expect(fsPromises.readFile).not.toHaveBeenCalled();
        expect(writeFileSync).not.toHaveBeenCalled();
      }
    );

    it('continues reading and migrating codeless authoring metadata', async () => {
      ext.designTimeInstances.set('/test/project', { port: 7071, isStarting: false });
      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      await instance.create();
      expect(readFileSync).toHaveBeenCalledWith(mockUri.fsPath, 'utf8');
      expect(getMigrationOptions).toHaveBeenCalled();
      expect(migrateWorkflow).toHaveBeenCalledWith(expect.any(Object), { legacy: true });
      expect((instance as any).readOnly).toBe(false);
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

      expect(startDesignTimeApi).toHaveBeenCalledWith(expect.any(Object), '/test/project');
      expect((instance as any).panel.webview.html).toBe('<html></html>');
    });

    it('throws when design-time is not running', async () => {
      const { tryGetWebviewPanel } = await import('../../../../../utils/codeless/common');
      vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);

      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      await expect(instance.create()).rejects.toThrow('Design time is not running');
    });
  });

  describe('unavailable authoring environment', () => {
    it.each([
      [{ port: 7071, isStarting: false, startupError: 'mock startup failure' }, 'mock startup failure'],
      [{ isStarting: false }, 'Design time port not found'],
    ])('rejects unavailable design time before allocating the panel (%j)', async (designTime, message) => {
      ext.designTimeInstances.set('/test/project', designTime as any);
      const instance = new LocalDesignerV2Panel(mockContext, mockUri);
      await expect(instance.create()).rejects.toThrow(message);
      expect(window.createWebviewPanel).not.toHaveBeenCalled();
    });

    it('rejects an undetermined project before starting design time', async () => {
      vi.mocked(getLogicAppProjectRoot).mockResolvedValue(undefined);
      await expect(new LocalDesignerV2Panel(mockContext, mockUri).create()).rejects.toThrow('Unable to determine project root');
      expect(startDesignTimeApi).not.toHaveBeenCalled();
      expect(window.createWebviewPanel).not.toHaveBeenCalled();
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

    it('keeps the codeless save pipeline for definition, connections, parameters and custom code', async () => {
      const instance = createMessageHarness() as any;
      const definition = { actions: { Updated: { type: 'Compose', inputs: 'updated' } }, triggers: {} };
      const connectionReferences = { connection: { connectionName: 'mock-connection' } };
      const customCodeData = { script: 'mock-updated-code' };
      const parameters = {
        fromDefault: { type: 'String', defaultValue: 'mock-default' },
        zero: { type: 'Int', value: 0, defaultValue: 1 },
        $connections: {},
      };
      const connectionsToUpdate = { connections: {}, settings: {} };
      const codeToUpdate = { script: 'mock-updated-code' };
      vi.mocked(getConnectionsAndSettingsToUpdate).mockResolvedValue(connectionsToUpdate as any);
      vi.mocked(getCustomCodeToUpdate).mockResolvedValue(codeToUpdate as any);
      await instance.handleWebviewMsg({ command: ExtensionCommand.save, definition, connectionReferences, customCodeData, parameters });

      expect(getConnectionsAndSettingsToUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        '/test/project',
        connectionReferences,
        'tenant',
        'https://management.azure.com',
        parameters
      );
      expect(saveConnectionReferences).toHaveBeenCalledWith(expect.any(Object), '/test/project', connectionsToUpdate);
      expect(saveCustomCodeStandard).toHaveBeenCalledWith(expect.any(Object), mockUri.fsPath, codeToUpdate);
      expect(mergeJsonParameters).toHaveBeenCalledWith(expect.any(Object), mockUri.fsPath, parameters, {});
      expect(saveWorkflowParameter).toHaveBeenCalledWith(expect.any(Object), mockUri.fsPath, {
        fromDefault: { type: 'String', value: 'mock-default' },
        zero: { type: 'Int', value: 0 },
      });
      expect(writeFileSync).toHaveBeenCalledExactlyOnceWith(mockUri.fsPath, JSON.stringify({ definition }, null, 4));
      expect(instance.panel.webview.postMessage).toHaveBeenCalledWith({ command: ExtensionCommand.resetDesignerDirtyState });
    });

    it('reports a codeless save failure and rethrows without resetting dirty state', async () => {
      const instance = createMessageHarness() as any;
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('mock write failure');
      });
      await expect(
        instance.handleWebviewMsg({ command: ExtensionCommand.save, definition: { actions: {}, triggers: {} } })
      ).rejects.toThrow('mock write failure');
      expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Workflow not saved.'), 'OK');
      expect(instance.panel.webview.postMessage).not.toHaveBeenCalledWith({ command: ExtensionCommand.resetDesignerDirtyState });
    });

    it('rejects save when panel metadata is missing', async () => {
      const instance = createMessageHarness() as any;
      instance.panelMetadata = undefined;
      await instance.handleWebviewMsg({ command: ExtensionCommand.save });
      expect(window.showErrorMessage).toHaveBeenCalledWith('Failed to save workflow. Panel metadata is not available.');
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('keeps unit-test, connection and data-mapper command routing unchanged', async () => {
      const instance = createMessageHarness() as any;
      const definition = { actions: {}, triggers: {} };
      await instance.handleWebviewMsg({ command: ExtensionCommand.createUnitTest, definition });
      expect(createUnitTest).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ fsPath: mockUri.fsPath }), definition);
      const connectionAndSetting = { name: 'mock-connection' };
      await instance.handleWebviewMsg({ command: ExtensionCommand.addConnection, connectionAndSetting });
      expect(addConnection).toHaveBeenCalledWith(expect.any(Object), mockUri.fsPath, connectionAndSetting);
      await instance.handleWebviewMsg({ command: ExtensionCommand.openRelativeLink, content: '/dataMapper' });
      expect(createDataMap).toHaveBeenCalledWith(mockContext);
    });

    it('posts the existing file-system connection completion contract', async () => {
      const instance = createMessageHarness() as any;
      const connectionInfo = { name: 'mock-share' };
      const connection = { type: 'ServiceProvider', connectionName: 'mock-share' };
      vi.mocked(createFileSystemConnection).mockResolvedValue({ connection, errorMessage: undefined } as any);
      await instance.handleWebviewMsg({
        command: ExtensionCommand.createFileSystemConnection,
        connectionInfo,
        connectionName: 'mock-share',
      });
      expect(createFileSystemConnection).toHaveBeenCalledWith(connectionInfo);
      expect(instance.panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.completeFileSystemConnection,
        data: { connectionName: 'mock-share', connection, error: undefined },
      });
    });

    it('keeps mocked OAuth, telemetry and file-a-bug message routing', async () => {
      const instance = createMessageHarness() as any;
      await instance.handleWebviewMsg({ command: ExtensionCommand.openOauthLoginPopup, url: 'https://mock.invalid/oauth' });
      expect(env.openExternal).toHaveBeenCalledWith('https://mock.invalid/oauth');
      await instance.handleWebviewMsg({ command: ExtensionCommand.logTelemetry, data: { area: 'mock-area', value: 'mock-value' } });
      expect(ext.telemetryReporter.sendTelemetryEvent).toHaveBeenCalledWith('mock-area', { area: 'mock-area', value: 'mock-value' });
      await instance.handleWebviewMsg({ command: ExtensionCommand.fileABug });
      expect(openUrl).toHaveBeenCalledWith('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
    });

    it('updates codeless runtime and access token after initialization using mocked providers', async () => {
      const instance = createMessageHarness() as any;
      await instance.handleWebviewMsg({ command: ExtensionCommand.initialize });
      vi.mocked(ext.getWorkflowRuntimeBaseUrl).mockReturnValue('http://localhost:17073/mock-runtime');
      await vi.advanceTimersByTimeAsync(30000);
      expect(instance.panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.update_runtime_base_url,
        data: { baseUrl: 'http://localhost:17073/mock-runtime' },
      });
      expect(getAuthorizationToken).toHaveBeenCalledWith('tenant');
      expect(instance.panelMetadata.accessToken).toBe('mock-refreshed-token');
      expect(instance.panel.webview.postMessage).toHaveBeenCalledWith({
        command: ExtensionCommand.update_access_token,
        data: { accessToken: 'mock-refreshed-token' },
      });
    });

    it('reports missing resubmit IDs and trigger lookup failures without submitting', async () => {
      const instance = createMessageHarness() as any;
      await instance.handleWebviewMsg({ command: ExtensionCommand.resubmitRun });
      expect(window.showErrorMessage).toHaveBeenCalledWith('No run ID available for resubmit.');
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({ definition: { actions: {}, triggers: {} } }));
      await instance.handleWebviewMsg({ command: ExtensionCommand.resubmitRun, runId: 'run' });
      expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Unable to determine a trigger'), 'OK');
      expect(sendRequest).not.toHaveBeenCalled();
    });

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

      expect(createUnitTestFromRun).toHaveBeenCalledWith(expect.any(Object), expect.anything(), 'test-run-id', { actions: {} });
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
