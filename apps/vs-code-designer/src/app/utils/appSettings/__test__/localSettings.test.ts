import { describe, it, expect, vi } from 'vitest';
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { getLocalSettingsSchema } from '../localSettings';
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  azureStorageTypeSetting,
  azureWebJobsSecretStorageTypeKey,
  azureWebJobsStorageKey,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  logicAppKind,
  workerRuntimeKey,
  workflowCodefulEnabled,
} from '../../../../constants';

describe('utils/appSettings', () => {
  describe('getLocalSettingsSchema', () => {
    const projectPath = 'path/to/project';

    it('Should have IsEncrypted property and Values property have basic schema', () => {
      const settings = getLocalSettingsSchema(true);
      expect(settings).toHaveProperty('IsEncrypted', false);
      expect(settings).toHaveProperty('Values');
      expect(settings['Values']).toHaveProperty(appKindSetting);
      expect(settings['Values']).toHaveProperty(workerRuntimeKey);
    });

    it('Should not have ProjectDirectoryPath when project path param is not sent', () => {
      const settings = getLocalSettingsSchema(true);
      expect(settings).not.toHaveProperty(ProjectDirectoryPathKey);
    });

    it('Should have the AzureWebJobsSecretStorageType when is design time localsettings and have ProjectDirectoryPath property when sent', () => {
      const settings = getLocalSettingsSchema(true, projectPath);
      expect(settings['Values']).toHaveProperty(azureWebJobsSecretStorageTypeKey, azureStorageTypeSetting);
      expect(settings['Values']).toHaveProperty(ProjectDirectoryPathKey, projectPath);
    });

    it('Should have the AzureWebJobsStorage when is not design time localsettings and have ProjectDirectoryPath property when sent', () => {
      const settings = getLocalSettingsSchema(false, projectPath);
      expect(settings['Values']).toHaveProperty(azureWebJobsStorageKey, localEmulatorConnectionString);
      expect(settings['Values']).toHaveProperty(ProjectDirectoryPathKey, projectPath);
    });

    // Golden / characterization tests: lock the exact content of every local.settings.json this
    // extension generates, for every logic-app content axis. The content only varies by
    // (isDesignTime x isCodeful).
    //
    // Expected values are expressed via the shared constants (the same named keys/values the rest of
    // the codebase uses) rather than magic strings. The assertions still reconstruct the full
    // expected object explicitly and deep-equal it, so a structural regression (a setting added,
    // dropped, or moved to the wrong branch) is caught.
    describe('golden content by logic app type', () => {
      it('root local.settings.json (codeless / Standard Node)', () => {
        expect(getLocalSettingsSchema(false, projectPath, false)).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [azureWebJobsStorageKey]: localEmulatorConnectionString,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
          },
        });
      });

      it('root local.settings.json (codeful / .NET8) adds WORKFLOW_CODEFUL_ENABLED', () => {
        expect(getLocalSettingsSchema(false, projectPath, true)).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [azureWebJobsStorageKey]: localEmulatorConnectionString,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
            [workflowCodefulEnabled]: 'true',
          },
        });
      });

      it('design-time local.settings.json (codeless / Standard Node)', () => {
        expect(getLocalSettingsSchema(true, projectPath, false)).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Node,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
          },
        });
      });

      it('design-time local.settings.json (codeful / .NET8) adds WORKFLOW_CODEFUL_ENABLED', () => {
        expect(getLocalSettingsSchema(true, projectPath, true)).toEqual({
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

      it('omits ProjectDirectoryPath when no project path is supplied (root, codeless)', () => {
        expect(getLocalSettingsSchema(false)).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [azureWebJobsStorageKey]: localEmulatorConnectionString,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
          },
        });
      });
    });

    // Key ORDER regression: toEqual ignores property order, but writeFormattedJson serializes in
    // insertion order, so the on-disk key order matters. The regenerated root local.settings.json
    // must be key-for-key identical to a freshly created project (CreateLogicAppWorkspace), so these
    // pin the exact order rather than just the set of keys.
    describe('root key order matches the creation path', () => {
      it('orders keys like CreateLogicAppWorkspace (codeless)', () => {
        const keys = Object.keys(getLocalSettingsSchema(false, projectPath, false).Values);
        expect(keys).toEqual([
          azureWebJobsStorageKey,
          functionsInprocNet8Enabled,
          workerRuntimeKey,
          appKindSetting,
          ProjectDirectoryPathKey,
        ]);
      });

      it('appends WORKFLOW_CODEFUL_ENABLED last (codeful)', () => {
        const keys = Object.keys(getLocalSettingsSchema(false, projectPath, true).Values);
        expect(keys).toEqual([
          azureWebJobsStorageKey,
          functionsInprocNet8Enabled,
          workerRuntimeKey,
          appKindSetting,
          ProjectDirectoryPathKey,
          workflowCodefulEnabled,
        ]);
      });
    });
  });
});
