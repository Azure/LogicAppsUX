/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { workspace } from 'vscode';
import * as fse from 'fs-extra';
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  azureStorageTypeSetting,
  azureWebJobsSecretStorageTypeKey,
  azureWebJobsStorageKey,
  defaultVersionRange,
  extensionBundleId,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  logicAppKind,
  workerRuntimeKey,
  workflowCodefulEnabled,
} from '../../../../constants';
import * as localSettings from '../../appSettings/localSettings';
import { writeFormattedJson } from '../../fs';
import { isCodefulProject } from '../../codeful';
import {
  extractAppSettingReferences,
  getReferencedAppSettings,
  regenerateLocalSettings,
  validateDesignTimeDirectory,
  regenerateDesignTimeDirectory,
} from '../validateProjectArtifacts';

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
  isCodefulProject: vi.fn(() => Promise.resolve(false)),
}));

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
const mockedIsCodeful = isCodefulProject as unknown as ReturnType<typeof vi.fn>;

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
    mockedFse.readdir.mockResolvedValue([]);
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

      const changed = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      expect(mockedAddOrUpdate).toHaveBeenCalledTimes(1);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded.APP_KIND).toBe('workflowapp');
      expect(settingsAdded.FUNCTIONS_WORKER_RUNTIME).toBeDefined();
    });

    it('adds the full codeful baseline (incl. WORKFLOW_CODEFUL_ENABLED) when missing for a codeful project', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);
      mockedIsCodeful.mockResolvedValue(true);
      mockedGetLocalSettingsJson.mockResolvedValue({ IsEncrypted: false, Values: {} });

      const changed = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(true);
      const settingsAdded = mockedAddOrUpdate.mock.calls[0][2];
      expect(settingsAdded).toEqual({
        [appKindSetting]: logicAppKind,
        [ProjectDirectoryPathKey]: projectPath,
        [workerRuntimeKey]: WorkerRuntime.Dotnet,
        [azureWebJobsStorageKey]: localEmulatorConnectionString,
        [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
        [workflowCodefulEnabled]: 'true',
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
          EXISTING_SECRET: 'super-secret',
        },
      });

      const changed = await regenerateLocalSettings(context, projectPath);

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
        },
      });

      const changed = await regenerateLocalSettings(context, projectPath);

      expect(changed).toBe(false);
      expect(mockedAddOrUpdate).not.toHaveBeenCalled();
    });
  });

  describe('validateDesignTimeDirectory', () => {
    const designTimeDir = `${projectPath}/workflow-designtime`;
    const hostPath = `${designTimeDir}/host.json`;
    const settingsPath = `${designTimeDir}/local.settings.json`;

    const validHost = JSON.stringify({
      version: '2.0',
      extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows', version: '[1.*, 2.0.0)' },
    });
    const validSettings = JSON.stringify({
      Values: { APP_KIND: 'workflowapp', FUNCTIONS_WORKER_RUNTIME: 'node', ProjectDirectoryPath: projectPath },
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
  });

  describe('regenerateDesignTimeDirectory', () => {
    const designTimeDir = `${projectPath}/workflow-designtime`;

    it('regenerates host.json and local.settings.json when the directory is missing', async () => {
      mockFiles({});
      mockedFse.readdir.mockResolvedValue([]);

      const dir = await regenerateDesignTimeDirectory(context, projectPath);

      expect(norm(dir.fsPath)).toContain('workflow-designtime');
      const writtenPaths = mockedWriteFormattedJson.mock.calls.map((c) => norm(c[0] as string));
      expect(writtenPaths.some((p) => p.includes('host.json'))).toBe(true);
      expect(writtenPaths.some((p) => p.includes('local.settings.json'))).toBe(true);
      expect(mockedAddOrUpdate).toHaveBeenCalled();
    });

    it('preserves valid existing files and does not rewrite them', async () => {
      const hostPath = `${designTimeDir}/host.json`;
      const settingsPath = `${designTimeDir}/local.settings.json`;
      const validHost = JSON.stringify({
        version: '2.0',
        extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows', version: '[1.*, 2.0.0)' },
      });
      const validSettings = JSON.stringify({
        Values: { APP_KIND: 'workflowapp', FUNCTIONS_WORKER_RUNTIME: 'node', ProjectDirectoryPath: projectPath },
      });

      mockFiles({ [designTimeDir]: '', [hostPath]: validHost, [settingsPath]: validSettings });

      await regenerateDesignTimeDirectory(context, projectPath);

      expect(mockedWriteFormattedJson).not.toHaveBeenCalled();
      expect(mockedAddOrUpdate).not.toHaveBeenCalled();
    });

    // Golden / characterization tests: lock the EXACT content written for each design-time file,
    // Golden / characterization tests: lock the exact content written for each design-time file, per
    // logic app type. The expected objects are reconstructed explicitly from the shared constants
    // (rather than referencing hostFileContent / getLocalSettingsSchema directly), so a structural
    // change to the generated files is caught while the key/value strings stay in sync with the
    // named constants the codebase uses.
    describe('golden content by logic app type', () => {
      // Mirrors the host.json that startDesignTimeApi generated inline before the regeneration
      // refactor. It is the regression baseline for the design-time host.
      const goldenHostJson = {
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

        expect(writtenContentFor('host.json')).toEqual(goldenHostJson);
      });

      it('writes host.json equal to the design-time host baseline (codeful)', async () => {
        mockFiles({});
        mockedFse.readdir.mockResolvedValue([]);
        mockedIsCodeful.mockResolvedValue(true);

        await regenerateDesignTimeDirectory(context, projectPath);

        // host.json is type-independent: the codeful project produces the same host.json.
        expect(writtenContentFor('host.json')).toEqual(goldenHostJson);
      });

      it('writes design-time local.settings.json with the exact baseline and upserts Node runtime (codeless)', async () => {
        mockFiles({});
        mockedFse.readdir.mockResolvedValue([]);
        mockedIsCodeful.mockResolvedValue(false);

        await regenerateDesignTimeDirectory(context, projectPath);

        expect(writtenContentFor('local.settings.json')).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Node,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
          },
        });
        expect(mockedAddOrUpdate).toHaveBeenCalledWith(
          context,
          expect.stringContaining('workflow-designtime'),
          { [appKindSetting]: logicAppKind, [ProjectDirectoryPathKey]: projectPath, [workerRuntimeKey]: WorkerRuntime.Node },
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
            [workerRuntimeKey]: WorkerRuntime.Node,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
            [workflowCodefulEnabled]: 'true',
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
        expect(writtenContentFor('host.json')).toEqual(goldenHostJson);
        expect(writtenContentFor('local.settings.json')).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Node,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
            [workflowCodefulEnabled]: 'true',
          },
        });
      });
    });
  });
});
