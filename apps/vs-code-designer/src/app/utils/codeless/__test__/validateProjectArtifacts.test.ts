/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectType, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { workspace } from 'vscode';
import * as path from 'path';
import * as fse from 'fs-extra';
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  azureStorageTypeSetting,
  azureWebJobsFeatureFlagsKey,
  azureWebJobsSecretStorageTypeKey,
  azureWebJobsStorageKey,
  defaultVersionRange,
  extensionBundleId,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  logicAppKind,
  multiLanguageWorkerSetting,
  workflowAuthenticationMethodKey,
  workerRuntimeKey,
  workflowCodefulEnabledKey,
  workflowOperationDiscoveryHostModeKey,
} from '../../../../constants';
import * as localSettings from '../../appSettings/localSettings';
import { writeFormattedJson } from '../../fs';
import { hasCodefulSdkReference } from '../../codeful';
import { isCustomCodeFunctionsProjectInRoot } from '../../customCodeUtils';
import { useNodeDesignTimeWorker } from '../../vsCodeConfig/settings';
import {
  detectLogicAppProjectType,
  extractAppSettingReferences,
  getReferencedAppSettings,
  ensureProjectRootArtifacts,
  regenerateLocalSettings,
  regenerateRootHostFile,
  validateAndRegenerateProjectArtifacts,
  validateDesignTimeDirectory,
  regenerateDesignTimeDirectory,
} from '../validateProjectArtifacts';
import { ext } from '../../../../extensionVariables';

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('../../appSettings/localSettings', async (importActual) => {
  const actual = await importActual<typeof import('../../appSettings/localSettings')>();
  return {
    ...actual,
    addOrUpdateLocalAppSettings: vi.fn(),
    getLocalSettingsJson: vi.fn(),
  };
});

vi.mock('../../fs', () => ({
  writeFormattedJson: vi.fn(),
}));

vi.mock('../../codeful', () => ({
  hasCodefulSdkReference: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('../../customCodeUtils', () => ({
  isCustomCodeFunctionsProjectInRoot: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('../../vsCodeConfig/settings', async (importActual) => {
  const actual = await importActual<typeof import('../../vsCodeConfig/settings')>();
  return {
    ...actual,
    useNodeDesignTimeWorker: vi.fn(() => false),
    isManagedIdentityAuthEnabled: vi.fn(() => true),
  };
});

const projectPath = '/workspace/LogicApp';

/** Normalize path separators so tests behave the same on Windows and POSIX. */
const norm = (p: string): string => p.replace(/\\/g, '/');

const mockedFse = fse as unknown as {
  pathExists: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  readdir: ReturnType<typeof vi.fn>;
};
const mockedAddOrUpdate = localSettings.addOrUpdateLocalAppSettings as unknown as ReturnType<typeof vi.fn>;
const mockedGetLocalSettingsJson = localSettings.getLocalSettingsJson as unknown as ReturnType<typeof vi.fn>;
const mockedWriteFormattedJson = writeFormattedJson as unknown as ReturnType<typeof vi.fn>;
const mockedIsCodeful = hasCodefulSdkReference as unknown as ReturnType<typeof vi.fn>;
const mockedIsCustomCodeInRoot = isCustomCodeFunctionsProjectInRoot as unknown as ReturnType<typeof vi.fn>;
const mockedAppendLog = ext.outputChannel.appendLog as unknown as ReturnType<typeof vi.fn>;

/** Returns every line written to the output channel via appendLog. */
function loggedLines(): string[] {
  return mockedAppendLog.mock.calls.map((c) => String(c[0]));
}

/** Returns the object written via writeFormattedJson for the file whose path ends with fileName. */
function writtenContentFor(fileName: string): unknown {
  const call = mockedWriteFormattedJson.mock.calls.find((c) => norm(c[0] as string).endsWith(fileName));
  return call?.[1];
}

const context = { telemetry: { properties: {}, measurements: {} } } as any;

/** Helper to back the fs-extra mocks with an in-memory, separator-agnostic file map. */
function mockFiles(files: Record<string, string>): void {
  const normFiles: Record<string, string> = {};
  for (const key of Object.keys(files)) {
    normFiles[norm(key)] = files[key];
  }
  const has = (p: string) => Object.prototype.hasOwnProperty.call(normFiles, norm(p));
  mockedFse.pathExists.mockImplementation((p: string) => Promise.resolve(has(p)));
  mockedFse.readFile.mockImplementation((p: string) => Promise.resolve(Buffer.from(normFiles[norm(p)] ?? '')));
}

describe('validateProjectArtifacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsCodeful.mockResolvedValue(false);
    mockedIsCustomCodeInRoot.mockResolvedValue(false);
    mockedFse.readdir.mockResolvedValue([]);
    vi.mocked(useNodeDesignTimeWorker).mockReturnValue(false);
    (workspace as any).fs = { createDirectory: vi.fn(() => Promise.resolve()) };
  });

  describe('extractAppSettingReferences', () => {
    it('returns an empty array for empty content', () => {
      expect(extractAppSettingReferences('')).toEqual([]);
      expect(extractAppSettingReferences(undefined as unknown as string)).toEqual([]);
    });

    it('extracts plain and interpolated app setting references', () => {
      const content = `{
        "a": "@appsetting('SETTING_ONE')",
        "b": "/subscriptions/@{appsetting('SETTING_TWO')}/resourceGroups"
      }`;
      expect(extractAppSettingReferences(content).sort()).toEqual(['SETTING_ONE', 'SETTING_TWO']);
    });

    it('deduplicates repeated references and supports double quotes', () => {
      const content = `@appsetting('DUP') @appsetting('DUP') @appsetting("DOUBLE")`;
      expect(extractAppSettingReferences(content).sort()).toEqual(['DOUBLE', 'DUP']);
    });
  });

  describe('getReferencedAppSettings', () => {
    it('aggregates references from connections.json, parameters.json and workflows', async () => {
      mockFiles({
        [`${projectPath}/connections.json`]: `{ "k": "@appsetting('CONN_KEY')" }`,
        [`${projectPath}/parameters.json`]: `{ "p": { "value": "@appsetting('PARAM_KEY')" } }`,
        [`${projectPath}/wf1/workflow.json`]: `{ "d": "@{appsetting('WF_KEY')}" }`,
      });
      mockedFse.readdir.mockResolvedValue(['wf1', 'connections.json']);

      const result = await getReferencedAppSettings(projectPath);
      expect(result.sort()).toEqual(['CONN_KEY', 'PARAM_KEY', 'WF_KEY']);
    });

    it('returns an empty array when no artifacts reference app settings', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      expect(await getReferencedAppSettings(projectPath)).toEqual([]);
    });
  });

  describe('regenerateLocalSettings', () => {
    it('creates local.settings.json with baseline settings and referenced placeholders when missing', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      expect(mockedAddOrUpdate).toHaveBeenCalledTimes(1);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded.APP_KIND).toBe('workflowapp');
      expect(settingsAdded.FUNCTIONS_WORKER_RUNTIME).toBeDefined();
    });

    it('adds the full codeful baseline (incl. WORKFLOW_CODEFUL_ENABLED and AzureWebJobsFeatureFlags) when missing for a codeful project', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedIsCodeful.mockResolvedValue(true);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded).toEqual({
        [appKindSetting]: logicAppKind,
        [ProjectDirectoryPathKey]: projectPath,
        [workerRuntimeKey]: WorkerRuntime.Dotnet,
        [azureWebJobsStorageKey]: localEmulatorConnectionString,
        [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
        [workflowAuthenticationMethodKey]: 'managedServiceIdentity',
        [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
        [workflowCodefulEnabledKey]: 'true',
      });
    });

    it('adds only missing referenced placeholders without overwriting existing values', async () => {
      mockFiles({
        [`${projectPath}/local.settings.json`]: '{}',
        [`${projectPath}/connections.json`]: `{ "k": "@appsetting('NEEDED_KEY')" }`,
      });
      mockedFse.readdir.mockResolvedValue(['connections.json']);
      mockedGetLocalSettingsJson.mockResolvedValue({
        IsEncrypted: false,
        Values: {
          APP_KIND: 'workflowapp',
          FUNCTIONS_WORKER_RUNTIME: 'dotnet',
          ProjectDirectoryPath: projectPath,
          AzureWebJobsStorage: 'UseDevelopmentStorage=true',
          FUNCTIONS_INPROC_NET8_ENABLED: '1',
          WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
          EXISTING_SECRET: 'super-secret',
        },
      });

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded).toEqual({ NEEDED_KEY: '' });
      expect(settingsAdded.EXISTING_SECRET).toBeUndefined();
    });

    it('does not update when the file exists and already contains everything required', async () => {
      mockFiles({ [`${projectPath}/local.settings.json`]: '{}' });
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({
        IsEncrypted: false,
        Values: {
          APP_KIND: 'workflowapp',
          FUNCTIONS_WORKER_RUNTIME: 'dotnet',
          ProjectDirectoryPath: projectPath,
          AzureWebJobsStorage: 'UseDevelopmentStorage=true',
          FUNCTIONS_INPROC_NET8_ENABLED: '1',
          WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
        },
      });

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(false);
      expect(mockedAddOrUpdate).not.toHaveBeenCalled();
    });
  });

  // Behavior by logic app type: regeneration builds the root local.settings.json from the same shared
  // source of truth as fresh project creation (getLocalSettingsSchema). The project type is inferred from
  // the project files (detectLogicAppProjectType): codeful via hasCodefulSdkReference, and customCode /
  // rulesEngine via a sibling custom-code functions (.csproj) project in the workspace root. As a
  // result every type regenerates the same content a freshly created project of that type would.
  describe('regenerateLocalSettings — behavior by logic app type', () => {
    const codelessBaseline = {
      [appKindSetting]: logicAppKind,
      [ProjectDirectoryPathKey]: projectPath,
      [workerRuntimeKey]: WorkerRuntime.Dotnet,
      [azureWebJobsStorageKey]: localEmulatorConnectionString,
      [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
      [workflowAuthenticationMethodKey]: 'managedServiceIdentity',
    };

    beforeEach(() => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });
    });

    it('logicApp (codeless): regenerates the 5-key codeless baseline, no AzureWebJobsFeatureFlags', async () => {
      mockedIsCodeful.mockResolvedValue(false);
      mockedIsCustomCodeInRoot.mockResolvedValue(false);

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded).toEqual(codelessBaseline);
      expect(settingsAdded).not.toHaveProperty(azureWebJobsFeatureFlagsKey);
      expect(settingsAdded).not.toHaveProperty(workflowCodefulEnabledKey);
    });

    it('customCode: regenerates the codeless baseline plus AzureWebJobsFeatureFlags (sibling custom-code project detected)', async () => {
      // A sibling custom-code functions project in the workspace root identifies this as a customCode
      // logic app, which gets the EnableMultiLanguageWorker flag just like fresh creation.
      mockedIsCodeful.mockResolvedValue(false);
      mockedIsCustomCodeInRoot.mockResolvedValue(true);

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded).toEqual({
        ...codelessBaseline,
        [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
      });
      expect(settingsAdded).not.toHaveProperty(workflowCodefulEnabledKey);
    });

    it('rulesEngine: regenerates the codeless baseline plus AzureWebJobsFeatureFlags (indistinguishable from customCode, same content)', async () => {
      // rulesEngine cannot be told apart from customCode at regeneration time, but both produce the same
      // root local.settings.json, so detecting the sibling custom-code project is sufficient.
      mockedIsCodeful.mockResolvedValue(false);
      mockedIsCustomCodeInRoot.mockResolvedValue(true);

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded).toEqual({
        ...codelessBaseline,
        [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
      });
      expect(settingsAdded).not.toHaveProperty(workflowCodefulEnabledKey);
    });

    it('codeful: regenerates the codeless baseline plus WORKFLOW_CODEFUL_ENABLED and AzureWebJobsFeatureFlags (matches fresh creation)', async () => {
      mockedIsCodeful.mockResolvedValue(true);

      const { changed } = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded).toEqual({
        ...codelessBaseline,
        [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
        [workflowCodefulEnabledKey]: 'true',
      });
    });
  });

  describe('detectLogicAppProjectType', () => {
    it('returns codeful when the project itself is a codeful project', async () => {
      mockedIsCodeful.mockResolvedValue(true);
      mockedIsCustomCodeInRoot.mockResolvedValue(true);

      // Codeful takes precedence even when a sibling custom-code project is also present.
      expect(await detectLogicAppProjectType(projectPath)).toBe(ProjectType.codeful);
    });

    it('returns customCode when a sibling custom-code functions project exists in the workspace root', async () => {
      mockedIsCodeful.mockResolvedValue(false);
      mockedIsCustomCodeInRoot.mockResolvedValue(true);

      expect(await detectLogicAppProjectType(projectPath)).toBe(ProjectType.customCode);
    });

    it('returns logicApp when the project is neither codeful nor has a sibling custom-code project', async () => {
      mockedIsCodeful.mockResolvedValue(false);
      mockedIsCustomCodeInRoot.mockResolvedValue(false);

      expect(await detectLogicAppProjectType(projectPath)).toBe(ProjectType.logicApp);
    });

    it('treats undefined detection results as not-detected (logicApp)', async () => {
      mockedIsCodeful.mockResolvedValue(undefined);
      mockedIsCustomCodeInRoot.mockResolvedValue(undefined);

      expect(await detectLogicAppProjectType(projectPath)).toBe(ProjectType.logicApp);
    });

    it('inspects the workspace root (the parent of the logic app folder) for custom-code siblings', async () => {
      mockedIsCodeful.mockResolvedValue(false);
      mockedIsCustomCodeInRoot.mockResolvedValue(false);

      await detectLogicAppProjectType(projectPath);

      expect(mockedIsCustomCodeInRoot).toHaveBeenCalledWith(path.dirname(projectPath));
    });
  });

  describe('validateDesignTimeDirectory', () => {
    const designTimeDir = `${projectPath}/workflow-designtime`;
    const hostPath = `${designTimeDir}/host.json`;
    const settingsPath = `${designTimeDir}/local.settings.json`;

    const validHost = JSON.stringify({
      version: '2.0',
      extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows', version: '[1.*, 2.0.0)' },
      extensions: { workflow: { settings: { [workflowOperationDiscoveryHostModeKey]: 'true' } } },
    });
    const validSettings = JSON.stringify({
      Values: {
        APP_KIND: 'workflowapp',
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
        FUNCTIONS_INPROC_NET8_ENABLED: '1',
        ProjectDirectoryPath: projectPath,
      },
    });

    it('reports invalid when the directory does not exist', async () => {
      mockFiles({});
      const result = await validateDesignTimeDirectory(projectPath);
      expect(result).toEqual({ directoryExists: false, hostFileValid: false, settingsFileValid: false, isValid: false });
    });

    it('reports valid when host.json and local.settings.json are well-formed', async () => {
      mockFiles({ [designTimeDir]: '', [hostPath]: validHost, [settingsPath]: validSettings });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.isValid).toBe(true);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(true);
    });

    it('reports invalid host when the bundle id is wrong', async () => {
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: '{"version":"2.0","extensionBundle":{"id":"Wrong"}}',
        [settingsPath]: validSettings,
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports invalid host when the extension bundle version is missing', async () => {
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: JSON.stringify({
          version: '2.0',
          extensionBundle: { id: extensionBundleId },
          extensions: { workflow: { settings: { [workflowOperationDiscoveryHostModeKey]: 'true' } } },
        }),
        [settingsPath]: validSettings,
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports invalid host when the design-time discovery host mode setting is missing', async () => {
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: JSON.stringify({
          version: '2.0',
          extensionBundle: { id: extensionBundleId, version: defaultVersionRange },
        }),
        [settingsPath]: validSettings,
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports invalid settings when a required key has an empty value', async () => {
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: validHost,
        [settingsPath]: JSON.stringify({
          Values: { APP_KIND: '', FUNCTIONS_WORKER_RUNTIME: 'node', ProjectDirectoryPath: projectPath },
        }),
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports invalid settings when a required key is missing', async () => {
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: validHost,
        [settingsPath]: JSON.stringify({ Values: { FUNCTIONS_WORKER_RUNTIME: 'node', ProjectDirectoryPath: projectPath } }),
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports invalid settings for a stale Node design-time file lacking the in-process .NET 8 flag', async () => {
      // An older extension generated a design-time file on the Node worker without
      // FUNCTIONS_INPROC_NET8_ENABLED. It must be treated as invalid so it is regenerated to the
      // in-process .NET 8 host that spawns the NetFxWorker required by the Data Mapper Test map.
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: validHost,
        [settingsPath]: JSON.stringify({
          Values: { APP_KIND: 'workflowapp', FUNCTIONS_WORKER_RUNTIME: 'node', ProjectDirectoryPath: projectPath },
        }),
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports invalid settings when all required keys are present but the worker runtime is still Node', async () => {
      // Presence of every required key is not enough: a file that carries the in-process .NET 8 flag but
      // still points FUNCTIONS_WORKER_RUNTIME at "node" would launch the host on the wrong worker. It must
      // be treated as invalid so it is regenerated to dotnet + in-process .NET 8.
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: validHost,
        [settingsPath]: JSON.stringify({
          Values: {
            APP_KIND: 'workflowapp',
            FUNCTIONS_WORKER_RUNTIME: 'node',
            FUNCTIONS_INPROC_NET8_ENABLED: '1',
            ProjectDirectoryPath: projectPath,
          },
        }),
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports invalid settings when the worker runtime is dotnet but the in-process .NET 8 flag is disabled', async () => {
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: validHost,
        [settingsPath]: JSON.stringify({
          Values: {
            APP_KIND: 'workflowapp',
            FUNCTIONS_WORKER_RUNTIME: 'dotnet',
            FUNCTIONS_INPROC_NET8_ENABLED: '0',
            ProjectDirectoryPath: projectPath,
          },
        }),
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('reports valid settings for a Node design-time file when the Node-worker fallback is enabled', async () => {
      vi.mocked(useNodeDesignTimeWorker).mockReturnValue(true);
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: validHost,
        [settingsPath]: JSON.stringify({
          Values: { APP_KIND: 'workflowapp', FUNCTIONS_WORKER_RUNTIME: 'node', ProjectDirectoryPath: projectPath },
        }),
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('reports invalid settings for a dotnet + in-process .NET 8 file when the Node-worker fallback is enabled', async () => {
      // Toggling into the fallback must invalidate the dotnet file so it is regenerated to Node.
      vi.mocked(useNodeDesignTimeWorker).mockReturnValue(true);
      mockFiles({
        [designTimeDir]: '',
        [hostPath]: validHost,
        [settingsPath]: validSettings,
      });

      const result = await validateDesignTimeDirectory(projectPath);
      expect(result.hostFileValid).toBe(true);
      expect(result.settingsFileValid).toBe(false);
      expect(result.isValid).toBe(false);
    });
  });

  describe('regenerateDesignTimeDirectory', () => {
    const designTimeDir = `${projectPath}/workflow-designtime`;

    it('regenerates host.json and local.settings.json when the directory is missing', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);

      const { uri: dir } = await regenerateDesignTimeDirectory(context, projectPath);

      expect(norm(dir.fsPath)).toContain('workflow-designtime');
      const writtenPaths = mockedWriteFormattedJson.mock.calls.map((c) => norm(c[0] as string));
      expect(writtenPaths.some((p) => p.includes('host.json'))).toBe(true);
      expect(writtenPaths.some((p) => p.includes('local.settings.json'))).toBe(true);
      expect(mockedAddOrUpdate).toHaveBeenCalled();
    });

    it('regenerates the design-time settings on the Node worker when the fallback is enabled', async () => {
      vi.mocked(useNodeDesignTimeWorker).mockReturnValue(true);
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);

      await regenerateDesignTimeDirectory(context, projectPath);

      const runtimeSettings = mockedAddOrUpdate.mock.calls[0]?.[2] as Record<string, string>;
      expect(runtimeSettings[workerRuntimeKey]).toBe(WorkerRuntime.Node);
      expect(runtimeSettings[functionsInprocNet8Enabled]).toBeUndefined();
    });

    it('preserves valid existing files and does not rewrite them', async () => {
      const hostPath = `${designTimeDir}/host.json`;
      const settingsPath = `${designTimeDir}/local.settings.json`;
      const validHost = JSON.stringify({
        version: '2.0',
        extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows', version: '[1.*, 2.0.0)' },
        extensions: { workflow: { settings: { [workflowOperationDiscoveryHostModeKey]: 'true' } } },
      });
      const validSettings = JSON.stringify({
        Values: {
          APP_KIND: 'workflowapp',
          FUNCTIONS_WORKER_RUNTIME: 'dotnet',
          FUNCTIONS_INPROC_NET8_ENABLED: '1',
          ProjectDirectoryPath: projectPath,
        },
      });

      mockFiles({ [designTimeDir]: '', [hostPath]: validHost, [settingsPath]: validSettings });

      await regenerateDesignTimeDirectory(context, projectPath);

      expect(mockedWriteFormattedJson).not.toHaveBeenCalled();
      expect(mockedAddOrUpdate).not.toHaveBeenCalled();
    });

    it('creates a nested workflow-designtime directory for a "workflow-designtime-backup" sibling (path-segment boundary)', async () => {
      // A project path whose last segment merely CONTAINS the design-time name as a substring
      // (e.g. workflow-designtime-backup) must not be treated as the design-time directory itself.
      const backupPath = `${projectPath}/workflow-designtime-backup`;
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);

      const { uri: dir } = await regenerateDesignTimeDirectory(context, backupPath);

      // The design-time directory is nested UNDER the backup folder, not the backup folder itself.
      expect(norm(dir.fsPath)).toContain('workflow-designtime-backup/workflow-designtime');
      const writtenPaths = mockedWriteFormattedJson.mock.calls.map((c) => norm(c[0] as string));
      expect(writtenPaths.some((p) => p.includes('workflow-designtime-backup/workflow-designtime/host.json'))).toBe(true);
    });

    // Characterization tests: lock the exact content written for each design-time file, per
    // logic app type. The expected objects are reconstructed explicitly from the shared constants
    // (rather than referencing hostFileContent / getLocalSettingsSchema directly), so a structural
    // change to the generated files is caught while the key/value strings stay in sync with the
    // named constants the codebase uses.
    describe('expected content by logic app type', () => {
      // Mirrors the host.json that startDesignTimeApi generated inline before the regeneration
      // refactor. It is the regression baseline for the design-time host.
      const expectedHostJson = {
        version: '2.0',
        extensionBundle: {
          id: extensionBundleId,
          version: defaultVersionRange,
        },
        extensions: {
          workflow: {
            settings: {
              'Runtime.WorkflowOperationDiscoveryHostMode': 'true',
            },
          },
        },
      };

      it('writes host.json equal to the design-time host baseline (codeless)', async () => {
        mockFiles({});
        mockedFse.readdir.mockResolvedValue([]);
        mockedIsCodeful.mockResolvedValue(false);

        await regenerateDesignTimeDirectory(context, projectPath);

        expect(writtenContentFor('host.json')).toEqual(expectedHostJson);
      });

      it('writes host.json equal to the design-time host baseline (codeful)', async () => {
        mockFiles({});
        mockedFse.readdir.mockResolvedValue([]);
        mockedIsCodeful.mockResolvedValue(true);

        await regenerateDesignTimeDirectory(context, projectPath);

        // host.json is type-independent: the codeful project produces the same host.json.
        expect(writtenContentFor('host.json')).toEqual(expectedHostJson);
      });

      it('writes design-time local.settings.json with the exact baseline and upserts dotnet in-process .NET 8 runtime (codeless)', async () => {
        mockFiles({});
        mockedFse.readdir.mockResolvedValue([]);
        mockedIsCodeful.mockResolvedValue(false);

        await regenerateDesignTimeDirectory(context, projectPath);

        expect(writtenContentFor('local.settings.json')).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
          },
        });
        expect(mockedAddOrUpdate).toHaveBeenCalledWith(
          context,
          expect.stringContaining('workflow-designtime'),
          {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
          },
          true
        );
      });

      it('writes design-time local.settings.json with WORKFLOW_CODEFUL_ENABLED for a codeful project', async () => {
        mockFiles({});
        mockedFse.readdir.mockResolvedValue([]);
        mockedIsCodeful.mockResolvedValue(true);

        await regenerateDesignTimeDirectory(context, projectPath);

        expect(writtenContentFor('local.settings.json')).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
            [workflowCodefulEnabledKey]: 'true',
          },
        });
      });

      it('regenerates an existing-but-invalid design-time directory for a codeful project', async () => {
        const designTimeDir = `${projectPath}/workflow-designtime`;
        const hostPath = `${designTimeDir}/host.json`;
        const settingsPath = `${designTimeDir}/local.settings.json`;

        // Directory exists but both files are invalid: host.json has the wrong bundle id and
        // local.settings.json is missing the required keys, so regeneration is triggered by
        // invalidation (not a missing directory).
        mockFiles({
          [designTimeDir]: '',
          [hostPath]: '{"version":"2.0","extensionBundle":{"id":"Wrong"}}',
          [settingsPath]: '{"Values":{}}',
        });
        mockedFse.readdir.mockResolvedValue([]);
        mockedIsCodeful.mockResolvedValue(true);

        await regenerateDesignTimeDirectory(context, projectPath);

        // Both artifacts are rewritten to the codeful baseline.
        expect(writtenContentFor('host.json')).toEqual(expectedHostJson);
        expect(writtenContentFor('local.settings.json')).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
            [workflowCodefulEnabledKey]: 'true',
          },
        });
      });
    });
  });

  describe('regenerateRootHostFile', () => {
    const rootHostPath = `${projectPath}/host.json`;

    // Mirrors the project-level host.json produced by the creation path
    // (CreateLogicAppWorkspace.getHostContent). Regression baseline for the root host.json.
    const expectedRootHostJson = {
      version: '2.0',
      logging: {
        applicationInsights: {
          samplingSettings: {
            isEnabled: true,
            excludedTypes: 'Request',
          },
        },
      },
      extensionBundle: {
        id: extensionBundleId,
        version: defaultVersionRange,
      },
    };

    it('regenerates host.json when it is missing', async () => {
      mockFiles({});

      const created = await regenerateRootHostFile(projectPath);

      expect(created.changed).toBe(true);
      expect(created.changedArtifacts).toEqual(['host.json']);
      expect(writtenContentFor('host.json')).toEqual(expectedRootHostJson);
    });

    it('regenerates host.json when it exists but is invalid', async () => {
      mockFiles({ [rootHostPath]: JSON.stringify({ version: '2.0', extensionBundle: { id: 'wrong.bundle.id' } }) });

      const created = await regenerateRootHostFile(projectPath);

      expect(created.changed).toBe(true);
      expect(created.changedArtifacts).toEqual(['host.json']);
      expect(writtenContentFor('host.json')).toEqual(expectedRootHostJson);
    });

    it('preserves a valid existing host.json and does not rewrite it', async () => {
      const validHost = JSON.stringify({
        version: '2.0',
        extensionBundle: { id: extensionBundleId, version: '[1.50.0]' },
      });
      mockFiles({ [rootHostPath]: validHost });

      const created = await regenerateRootHostFile(projectPath);

      expect(created.changed).toBe(false);
      expect(created.changedArtifacts).toEqual([]);
      expect(mockedWriteFormattedJson).not.toHaveBeenCalled();
    });
  });

  // The top-level orchestrator used by the design-time startup flow. These tests prove that a single
  // call accounts for EVERY required artifact together: the project-root host.json, the project-root
  // local.settings.json, and the workflow-designtime baseline (host.json + local.settings.json).
  describe('validateAndRegenerateProjectArtifacts', () => {
    const designTimeDir = `${projectPath}/workflow-designtime`;
    const rootHostPath = `${projectPath}/host.json`;
    const rootSettingsPath = `${projectPath}/local.settings.json`;
    const validHostJson = JSON.stringify({
      version: '2.0',
      extensionBundle: { id: extensionBundleId, version: '[1.*, 2.0.0)' },
    });
    const validDesignHostJson = JSON.stringify({
      version: '2.0',
      extensionBundle: { id: extensionBundleId, version: '[1.*, 2.0.0)' },
      extensions: { workflow: { settings: { [workflowOperationDiscoveryHostModeKey]: 'true' } } },
    });
    const validDesignSettings = JSON.stringify({
      Values: {
        APP_KIND: 'workflowapp',
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
        FUNCTIONS_INPROC_NET8_ENABLED: '1',
        ProjectDirectoryPath: projectPath,
      },
    });

    it('regenerates the root host.json, root local.settings.json and design-time directory when all are missing', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      const dir = await validateAndRegenerateProjectArtifacts(context, projectPath);

      const writtenPaths = mockedWriteFormattedJson.mock.calls.map((c) => norm(c[0] as string));
      // Project-root host.json (distinct from the design-time copy).
      expect(writtenPaths).toContain(rootHostPath);
      // Design-time baseline files.
      expect(writtenPaths).toContain(`${designTimeDir}/host.json`);
      expect(writtenPaths).toContain(`${designTimeDir}/local.settings.json`);
      // Root local.settings.json baseline + design-time runtime settings are upserted.
      expect(mockedAddOrUpdate).toHaveBeenCalled();
      // Returns the design-time directory to be used as the host working directory.
      expect(norm(dir.fsPath)).toContain('workflow-designtime');
    });

    it('preserves everything and writes nothing when all artifacts are already valid', async () => {
      mockFiles({
        [rootHostPath]: validHostJson,
        [rootSettingsPath]: '{}',
        [designTimeDir]: '',
        [`${designTimeDir}/host.json`]: validDesignHostJson,
        [`${designTimeDir}/local.settings.json`]: validDesignSettings,
      });
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({
        IsEncrypted: false,
        Values: {
          APP_KIND: 'workflowapp',
          FUNCTIONS_WORKER_RUNTIME: 'dotnet',
          ProjectDirectoryPath: projectPath,
          AzureWebJobsStorage: 'UseDevelopmentStorage=true',
          FUNCTIONS_INPROC_NET8_ENABLED: '1',
          WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
        },
      });

      const dir = await validateAndRegenerateProjectArtifacts(context, projectPath);

      expect(mockedWriteFormattedJson).not.toHaveBeenCalled();
      expect(mockedAddOrUpdate).not.toHaveBeenCalled();
      expect(norm(dir.fsPath)).toContain('workflow-designtime');
    });

    it('regenerates only the root host.json when it alone is missing', async () => {
      mockFiles({
        [rootSettingsPath]: '{}',
        [designTimeDir]: '',
        [`${designTimeDir}/host.json`]: validDesignHostJson,
        [`${designTimeDir}/local.settings.json`]: validDesignSettings,
      });
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({
        IsEncrypted: false,
        Values: {
          APP_KIND: 'workflowapp',
          FUNCTIONS_WORKER_RUNTIME: 'dotnet',
          ProjectDirectoryPath: projectPath,
          AzureWebJobsStorage: 'UseDevelopmentStorage=true',
          FUNCTIONS_INPROC_NET8_ENABLED: '1',
          WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
        },
      });

      await validateAndRegenerateProjectArtifacts(context, projectPath);

      const writtenPaths = mockedWriteFormattedJson.mock.calls.map((c) => norm(c[0] as string));
      expect(writtenPaths).toEqual([rootHostPath]);
      expect(mockedAddOrUpdate).not.toHaveBeenCalled();
    });
  });

  // The consolidated, multi-project-friendly logging contract: the low-level helpers stay silent so
  // the orchestrators can emit exactly ONE status line per project (valid / regenerated / failed).
  describe('consolidated status logging', () => {
    const rootHostPath = `${projectPath}/host.json`;
    const rootSettingsPath = `${projectPath}/local.settings.json`;
    const designTimeDir = `${projectPath}/workflow-designtime`;
    const validHostJson = JSON.stringify({
      version: '2.0',
      extensionBundle: { id: extensionBundleId, version: '[1.*, 2.0.0)' },
    });
    const validDesignHostJson = JSON.stringify({
      version: '2.0',
      extensionBundle: { id: extensionBundleId, version: '[1.*, 2.0.0)' },
      extensions: { workflow: { settings: { [workflowOperationDiscoveryHostModeKey]: 'true' } } },
    });
    const validDesignSettings = JSON.stringify({
      Values: {
        APP_KIND: 'workflowapp',
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
        FUNCTIONS_INPROC_NET8_ENABLED: '1',
        ProjectDirectoryPath: projectPath,
      },
    });
    const fullValidRootSettings = {
      IsEncrypted: false,
      Values: {
        APP_KIND: 'workflowapp',
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
        ProjectDirectoryPath: projectPath,
        AzureWebJobsStorage: 'UseDevelopmentStorage=true',
        FUNCTIONS_INPROC_NET8_ENABLED: '1',
        // MI auth is mocked on (isManagedIdentityAuthEnabled -> true), so a fully-valid project must
        // already carry the managed-identity auth method or regenerateLocalSettings would add it.
        [workflowAuthenticationMethodKey]: 'managedServiceIdentity',
      },
    };

    /** Backs the fs mocks with a fully-valid project so nothing needs regeneration. */
    function mockFullyValidProject(): void {
      mockFiles({
        [rootHostPath]: validHostJson,
        [rootSettingsPath]: '{}',
        [designTimeDir]: '',
        [`${designTimeDir}/host.json`]: validDesignHostJson,
        [`${designTimeDir}/local.settings.json`]: validDesignSettings,
      });
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue(fullValidRootSettings);
    }

    it('regenerateRootHostFile and regenerateLocalSettings emit no output-channel lines', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      await regenerateRootHostFile(projectPath);
      await regenerateLocalSettings(context, projectPath);

      expect(mockedAppendLog).not.toHaveBeenCalled();
    });

    it('regenerateDesignTimeDirectory emits no output-channel lines', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      await regenerateDesignTimeDirectory(context, projectPath);

      expect(mockedAppendLog).not.toHaveBeenCalled();
    });

    it('validateAndRegenerateProjectArtifacts logs exactly one "valid" line when nothing changes', async () => {
      mockFullyValidProject();

      await validateAndRegenerateProjectArtifacts(context, projectPath);

      const lines = loggedLines();
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Project "LogicApp"');
      expect(lines[0]).toContain('no regeneration needed');
    });

    it('validateAndRegenerateProjectArtifacts logs exactly one line naming what was regenerated', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      await validateAndRegenerateProjectArtifacts(context, projectPath);

      const lines = loggedLines();
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Project "LogicApp": regenerated');
      expect(lines[0]).toContain('host.json');
      expect(lines[0]).toContain('local.settings.json');
      expect(lines[0]).toContain('design-time host.json');
    });

    it('validateAndRegenerateProjectArtifacts logs a single "failed" line and rethrows on error', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });
      mockedWriteFormattedJson.mockRejectedValue(new Error('disk full'));

      await expect(validateAndRegenerateProjectArtifacts(context, projectPath)).rejects.toThrow('disk full');

      const lines = loggedLines();
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Project "LogicApp": failed to validate/regenerate artifacts');
      expect(lines[0]).toContain('disk full');
    });

    it('ensureProjectRootArtifacts logs one "valid" line and never touches the design-time directory', async () => {
      mockFullyValidProject();

      await ensureProjectRootArtifacts(context, projectPath);

      const lines = loggedLines();
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Project "LogicApp"');
      expect(lines[0]).toContain('no regeneration needed');
      // Root-only path must not write the design-time baseline files.
      const writtenPaths = mockedWriteFormattedJson.mock.calls.map((c) => norm(c[0] as string));
      expect(writtenPaths.some((p) => p.includes('workflow-designtime'))).toBe(false);
    });

    it('ensureProjectRootArtifacts logs one line naming the regenerated root artifacts', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      await ensureProjectRootArtifacts(context, projectPath);

      const lines = loggedLines();
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Project "LogicApp": regenerated');
      expect(lines[0]).toContain('host.json');
    });
  });
});
