import { describe, it, expect } from 'vitest';
import { ProjectType, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { getLocalSettingsSchema } from '../localSettings';
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  azureStorageTypeSetting,
  azureWebJobsFeatureFlagsKey,
  azureWebJobsSecretStorageTypeKey,
  azureWebJobsStorageKey,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  logicAppKind,
  multiLanguageWorkerSetting,
  workerRuntimeKey,
  workflowCodefulEnabledKey,
} from '../../../../constants';

describe('utils/appSettings', () => {
  // getLocalSettingsSchema is the single source of truth for both local.settings.json files this
  // extension generates: the project-root (runtime) file (isDesignTime=false) and the
  // workflow-designtime/ folder file (isDesignTime=true). It is shared by fresh project creation
  // (CreateLogicAppWorkspace.createLocalConfigurationFiles), the design-time API startup, and
  // regeneration of source-controlled clones (validateProjectArtifacts), so these characterization
  // tests lock the exact content and key order per (isDesignTime x ProjectType) so those paths
  // cannot drift apart.
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

    it('Should run the design time host in-process .NET 8 (dotnet worker runtime + inproc flag)', () => {
      const settings = getLocalSettingsSchema(true, projectPath);
      expect(settings['Values']).toHaveProperty(workerRuntimeKey, WorkerRuntime.Dotnet);
      expect(settings['Values']).toHaveProperty(functionsInprocNet8Enabled, functionsInprocNet8EnabledTrue);
    });

    it('Should have the AzureWebJobsStorage when is not design time localsettings and have ProjectDirectoryPath property when sent', () => {
      const settings = getLocalSettingsSchema(false, projectPath);
      expect(settings['Values']).toHaveProperty(azureWebJobsStorageKey, localEmulatorConnectionString);
      expect(settings['Values']).toHaveProperty(ProjectDirectoryPathKey, projectPath);
    });

    // Characterization tests: lock the exact content of every local.settings.json this
    // extension generates, for every logic-app content axis. The content varies by
    // (isDesignTime x ProjectType).
    //
    // Expected values are expressed via the shared constants (the same named keys/values the rest of
    // the codebase uses) rather than magic strings. The assertions still reconstruct the full
    // expected object explicitly and deep-equal it, so a structural regression (a setting added,
    // dropped, or moved to the wrong branch) is caught.
    describe('expected root content by logic app type', () => {
      const baseRootValues = {
        [azureWebJobsStorageKey]: localEmulatorConnectionString,
        [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
        [workerRuntimeKey]: WorkerRuntime.Dotnet,
        [appKindSetting]: logicAppKind,
        [ProjectDirectoryPathKey]: projectPath,
      };

      it('logicApp: 5 base keys, no feature or codeful flags', () => {
        expect(getLocalSettingsSchema(false, projectPath, ProjectType.logicApp)).toEqual({
          IsEncrypted: false,
          Values: { ...baseRootValues },
        });
      });

      it('customCode: adds the multi-language worker feature flag', () => {
        expect(getLocalSettingsSchema(false, projectPath, ProjectType.customCode)).toEqual({
          IsEncrypted: false,
          Values: {
            ...baseRootValues,
            [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
          },
        });
      });

      it('rulesEngine: adds the multi-language worker feature flag', () => {
        expect(getLocalSettingsSchema(false, projectPath, ProjectType.rulesEngine)).toEqual({
          IsEncrypted: false,
          Values: {
            ...baseRootValues,
            [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
          },
        });
      });

      it('codeful: adds the feature flag and WORKFLOW_CODEFUL_ENABLED (and no extension bundle id)', () => {
        const settings = getLocalSettingsSchema(false, projectPath, ProjectType.codeful);
        expect(settings).toEqual({
          IsEncrypted: false,
          Values: {
            ...baseRootValues,
            [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
            [workflowCodefulEnabledKey]: 'true',
          },
        });
        expect(settings.Values).not.toHaveProperty('AzureFunctionsJobHost__extensionBundle__id');
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

    describe('expected design-time content by logic app type', () => {
      it('design-time local.settings.json (codeless / Standard in-process .NET 8)', () => {
        expect(getLocalSettingsSchema(true, projectPath, ProjectType.logicApp)).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Dotnet,
            [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
          },
        });
      });

      it('design-time local.settings.json (codeful / .NET8) adds WORKFLOW_CODEFUL_ENABLED but no feature flag', () => {
        expect(getLocalSettingsSchema(true, projectPath, ProjectType.codeful)).toEqual({
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

      it('design-time local.settings.json (Node-worker fallback) uses the Node runtime without the in-process .NET 8 flag', () => {
        expect(getLocalSettingsSchema(true, projectPath, ProjectType.logicApp, true)).toEqual({
          IsEncrypted: false,
          Values: {
            [appKindSetting]: logicAppKind,
            [ProjectDirectoryPathKey]: projectPath,
            [workerRuntimeKey]: WorkerRuntime.Node,
            [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
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
        const keys = Object.keys(getLocalSettingsSchema(false, projectPath, ProjectType.logicApp).Values);
        expect(keys).toEqual([
          azureWebJobsStorageKey,
          functionsInprocNet8Enabled,
          workerRuntimeKey,
          appKindSetting,
          ProjectDirectoryPathKey,
        ]);
      });

      it('orders keys deterministically for codeful (base keys, then feature flag, then codeful flag)', () => {
        const keys = Object.keys(getLocalSettingsSchema(false, projectPath, ProjectType.codeful).Values);
        expect(keys).toEqual([
          azureWebJobsStorageKey,
          functionsInprocNet8Enabled,
          workerRuntimeKey,
          appKindSetting,
          ProjectDirectoryPathKey,
          azureWebJobsFeatureFlagsKey,
          workflowCodefulEnabledKey,
        ]);
      });
    });
  });
});
