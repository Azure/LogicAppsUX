import { describe, it, expect, vi } from 'vitest';
import { getLocalSettingsSchema } from '../localSettings';
import {
  ProjectDirectoryPath,
  appKindSetting,
  azureStorageTypeSetting,
  azureWebJobsSecretStorageTypeKey,
  azureWebJobsStorageKey,
  localEmulatorConnectionString,
  workerRuntimeKey,
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
      expect(settings).not.toHaveProperty(ProjectDirectoryPath);
    });

    it('Should have the AzureWebJobsSecretStorageType when is design time localsettings and have ProjectDirectoryPath property when sent', () => {
      const settings = getLocalSettingsSchema(true, projectPath);
      expect(settings['Values']).toHaveProperty(azureWebJobsSecretStorageTypeKey, azureStorageTypeSetting);
      expect(settings['Values']).toHaveProperty(ProjectDirectoryPath, projectPath);
    });

    it('Should have the AzureWebJobsStorage when is not design time localsettings and have ProjectDirectoryPath property when sent', () => {
      const settings = getLocalSettingsSchema(false, projectPath);
      expect(settings['Values']).toHaveProperty(azureWebJobsStorageKey, localEmulatorConnectionString);
      expect(settings['Values']).toHaveProperty(ProjectDirectoryPath, projectPath);
    });
  });
});
