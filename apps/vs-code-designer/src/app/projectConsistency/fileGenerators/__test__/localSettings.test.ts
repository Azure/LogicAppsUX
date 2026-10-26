import { beforeEach, describe, it, expect, vi } from 'vitest';
import { ProjectType, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { generateLocalSettingsJson, generateDesignTimeLocalSettingsJson } from '../localSettings';
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
  workflowAuthenticationMethodKey,
  workflowAuthenticationMethodMIValue,
  workerRuntimeKey,
  workflowCodefulEnabledKey,
} from '../../../../constants';

vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  isManagedIdentityAuthEnabled: vi.fn(() => false),
}));

import { isManagedIdentityAuthEnabled } from '../../../utils/vsCodeConfig/settings';

describe('generateLocalSettingsJson / generateDesignTimeLocalSettingsJson', () => {
  const projectPath = 'path/to/project';

  beforeEach(() => {
    vi.mocked(isManagedIdentityAuthEnabled).mockReturnValue(false);
  });

  it('Should have IsEncrypted property and Values property have basic schema', () => {
    const settings = generateDesignTimeLocalSettingsJson();
    expect(settings).toHaveProperty('IsEncrypted', false);
    expect(settings).toHaveProperty('Values');
    expect(settings['Values']).toHaveProperty(appKindSetting);
    expect(settings['Values']).toHaveProperty(workerRuntimeKey);
  });

  it('Should not have ProjectDirectoryPath when project path param is not sent', () => {
    const settings = generateDesignTimeLocalSettingsJson();
    expect(settings).not.toHaveProperty(ProjectDirectoryPathKey);
  });

  it('Should have the AzureWebJobsSecretStorageType when is design time localsettings and have ProjectDirectoryPath property when sent', () => {
    const settings = generateDesignTimeLocalSettingsJson(projectPath);
    expect(settings['Values']).toHaveProperty(azureWebJobsSecretStorageTypeKey, azureStorageTypeSetting);
    expect(settings['Values']).toHaveProperty(ProjectDirectoryPathKey, projectPath);
  });

  it('Should run the design time host in-process .NET 8 (dotnet worker runtime + inproc flag)', () => {
    const settings = generateDesignTimeLocalSettingsJson(projectPath);
    expect(settings['Values']).toHaveProperty(workerRuntimeKey, WorkerRuntime.Dotnet);
    expect(settings['Values']).toHaveProperty(functionsInprocNet8Enabled, functionsInprocNet8EnabledTrue);
  });

  it('Should have the AzureWebJobsStorage when is not design time localsettings and have ProjectDirectoryPath property when sent', () => {
    const settings = generateLocalSettingsJson(projectPath);
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
      expect(generateLocalSettingsJson(projectPath, ProjectType.logicApp)).toEqual({
        IsEncrypted: false,
        Values: { ...baseRootValues },
      });
    });

    it('logicApp with JDBC driver JARs: adds the multi-language worker feature flag', () => {
      expect(generateLocalSettingsJson(projectPath, ProjectType.logicApp, { hasJdbcDriverJars: true })).toEqual({
        IsEncrypted: false,
        Values: {
          ...baseRootValues,
          [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
        },
      });
    });

    it('customCode: adds the multi-language worker feature flag', () => {
      expect(generateLocalSettingsJson(projectPath, ProjectType.customCode)).toEqual({
        IsEncrypted: false,
        Values: {
          ...baseRootValues,
          [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
        },
      });
    });

    it('rulesEngine: adds the multi-language worker feature flag', () => {
      expect(generateLocalSettingsJson(projectPath, ProjectType.rulesEngine)).toEqual({
        IsEncrypted: false,
        Values: {
          ...baseRootValues,
          [azureWebJobsFeatureFlagsKey]: multiLanguageWorkerSetting,
        },
      });
    });

    it('codeful: adds the feature flag and WORKFLOW_CODEFUL_ENABLED (and no extension bundle id)', () => {
      const settings = generateLocalSettingsJson(projectPath, ProjectType.codeful);
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
      expect(generateLocalSettingsJson()).toEqual({
        IsEncrypted: false,
        Values: {
          [azureWebJobsStorageKey]: localEmulatorConnectionString,
          [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
          [workerRuntimeKey]: WorkerRuntime.Dotnet,
          [appKindSetting]: logicAppKind,
        },
      });
    });
  });

  describe('expected design-time content by logic app type', () => {
    it('design-time local.settings.json (codeless / Standard in-process .NET 8)', () => {
      expect(generateDesignTimeLocalSettingsJson(projectPath, ProjectType.logicApp)).toEqual({
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
      expect(generateDesignTimeLocalSettingsJson(projectPath, ProjectType.codeful)).toEqual({
        IsEncrypted: false,
        Values: {
          [appKindSetting]: logicAppKind,
          [ProjectDirectoryPathKey]: projectPath,
          [workerRuntimeKey]: WorkerRuntime.Node,
          [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
          [workflowCodefulEnabledKey]: 'true',
        },
      });
    });

    it('design-time local.settings.json (Node-worker fallback) uses the Node runtime without the in-process .NET 8 flag', () => {
      expect(generateDesignTimeLocalSettingsJson(projectPath, ProjectType.logicApp, true)).toEqual({
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

  describe('managed identity auth enabled', () => {
    beforeEach(() => {
      vi.mocked(isManagedIdentityAuthEnabled).mockReturnValue(true);
    });

    it('adds WORKFLOWS_AUTHENTICATION_METHOD to root local.settings.json', () => {
      const settings = generateLocalSettingsJson(projectPath, ProjectType.logicApp);
      expect(settings.Values).toHaveProperty(workflowAuthenticationMethodKey, workflowAuthenticationMethodMIValue);
    });

    it('adds WORKFLOWS_AUTHENTICATION_METHOD to design-time local.settings.json', () => {
      const settings = generateDesignTimeLocalSettingsJson(projectPath, ProjectType.logicApp);
      expect(settings.Values).toHaveProperty(workflowAuthenticationMethodKey, workflowAuthenticationMethodMIValue);
    });

    it('design-time codeful includes both WORKFLOW_CODEFUL_ENABLED and MI auth', () => {
      expect(generateDesignTimeLocalSettingsJson(projectPath, ProjectType.codeful)).toEqual({
        IsEncrypted: false,
        Values: {
          [appKindSetting]: logicAppKind,
          [ProjectDirectoryPathKey]: projectPath,
          [workflowAuthenticationMethodKey]: workflowAuthenticationMethodMIValue,
          [workerRuntimeKey]: WorkerRuntime.Node,
          [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
          [workflowCodefulEnabledKey]: 'true',
        },
      });
    });

    it('design-time Node-worker fallback includes MI auth', () => {
      expect(generateDesignTimeLocalSettingsJson(projectPath, ProjectType.logicApp, true)).toEqual({
        IsEncrypted: false,
        Values: {
          [appKindSetting]: logicAppKind,
          [ProjectDirectoryPathKey]: projectPath,
          [workflowAuthenticationMethodKey]: workflowAuthenticationMethodMIValue,
          [workerRuntimeKey]: WorkerRuntime.Node,
          [azureWebJobsSecretStorageTypeKey]: azureStorageTypeSetting,
        },
      });
    });
  });
});
