/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use the real fs-extra implementation so we can verify actual local.settings.json writes on disk,
// overriding the lightweight fs-extra mock installed by the global test-setup.ts.
vi.unmock('fs-extra');

const encryptionMockState = vi.hoisted(() => ({ callCount: 0 }));
vi.mock('../../../functionsExtension/executeOnFunctionsExt', () => ({
  executeOnFunctions: vi.fn(async (_callback, _context, uri) => {
    const fse = await import('fs-extra');
    const settings = await fse.readJson(uri.fsPath);
    encryptionMockState.callCount += 1;
    settings.IsEncrypted = encryptionMockState.callCount === 1 ? false : true;
    await fse.writeJson(uri.fsPath, settings);
  }),
}));

import * as fse from 'fs-extra';
import * as path from 'path';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { addCustomCodeDotNetVersionSetting, isLocalSettingsEncrypted } from '../localSettings';

describe('localSettings - addCustomCodeDotNetVersionSetting', () => {
  let tempDir: string;
  let projectPath: string;
  let mockContext: any;

  beforeEach(async () => {
    encryptionMockState.callCount = 0;
    const tmpBase = process.env.TEMP || process.env.TMP || process.cwd();
    tempDir = await fse.mkdtemp(path.join(tmpBase, 'logic-apps-localsettings-test-'));
    projectPath = path.join(tempDir, 'TestLogicApp');
    await fse.ensureDir(projectPath);
    mockContext = { telemetry: { properties: {} }, errorHandling: {} } as any;
  });

  afterEach(async () => {
    await fse.remove(tempDir);
  });

  const writeExistingLocalSettings = async (values: Record<string, string>, isEncrypted = false) => {
    await fse.writeJson(path.join(projectPath, 'local.settings.json'), {
      IsEncrypted: isEncrypted,
      Values: values,
    });
  };

  const readLocalSettings = async () => fse.readJson(path.join(projectPath, 'local.settings.json'));

  describe('positive cases', () => {
    it('writes LOGIC_APPS_CUSTOMCODE_DOTNETVERSION="net8" for customCode + Net8', async () => {
      await writeExistingLocalSettings({ AzureWebJobsStorage: 'UseDevelopmentStorage=true' });

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, TargetFramework.Net8);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBe('net8');
    });

    it('writes LOGIC_APPS_CUSTOMCODE_DOTNETVERSION="net10.0" for customCode + Net10', async () => {
      await writeExistingLocalSettings({ AzureWebJobsStorage: 'UseDevelopmentStorage=true' });

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, TargetFramework.Net10);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBe('net10.0');
    });

    it('preserves unrelated existing app settings (merge behavior via addOrUpdateLocalAppSettings)', async () => {
      await writeExistingLocalSettings({
        AzureWebJobsStorage: 'UseDevelopmentStorage=true',
        FUNCTIONS_WORKER_RUNTIME: 'node',
        MyCustomSetting: 'someValue',
      });

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, TargetFramework.Net8);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.AzureWebJobsStorage).toBe('UseDevelopmentStorage=true');
      expect(localSettings.Values.FUNCTIONS_WORKER_RUNTIME).toBe('node');
      expect(localSettings.Values.MyCustomSetting).toBe('someValue');
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBe('net8');
    });

    it('overwrites a stale LOGIC_APPS_CUSTOMCODE_DOTNETVERSION value when the target framework changes', async () => {
      await writeExistingLocalSettings({ LOGIC_APPS_CUSTOMCODE_DOTNETVERSION: 'net8' });

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, TargetFramework.Net10);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBe('net10.0');
    });

    it('writes to the authoritative projectPath and not any derived path', async () => {
      await writeExistingLocalSettings({});

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, TargetFramework.Net8);

      // The setting must land in <projectPath>/local.settings.json exactly.
      expect(await fse.pathExists(path.join(projectPath, 'local.settings.json'))).toBe(true);
      // No local.settings.json should have been created in a sibling/derived "Functions" folder.
      expect(await fse.pathExists(path.join(tempDir, 'Functions', 'local.settings.json'))).toBe(false);
      expect(await fse.pathExists(path.join(tempDir, 'local.settings.json'))).toBe(false);
    });

    it('re-encrypts an existing encrypted local.settings.json after merging the custom-code version', async () => {
      await writeExistingLocalSettings({ ExistingSecret: 'encrypted-value' }, true);

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, TargetFramework.Net10);

      const localSettings = await readLocalSettings();
      expect(localSettings.IsEncrypted).toBe(true);
      expect(localSettings.Values.ExistingSecret).toBe('encrypted-value');
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBe('net10.0');
      expect(encryptionMockState.callCount).toBe(3);
    });
  });

  describe('negative cases (no-op, must not modify local.settings.json)', () => {
    it.each([
      ['rulesEngine', ProjectType.rulesEngine, TargetFramework.Net8],
      ['codeful', ProjectType.codeful, TargetFramework.Net8],
      ['logicApp (standard)', ProjectType.logicApp, TargetFramework.Net8],
    ])('does not add the setting for projectType=%s', async (_label, projectType, targetFramework) => {
      await writeExistingLocalSettings({ AzureWebJobsStorage: 'UseDevelopmentStorage=true' });

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, projectType, targetFramework);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBeUndefined();
      expect(localSettings.Values.AzureWebJobsStorage).toBe('UseDevelopmentStorage=true');
    });

    it('does not add the setting for customCode + NetFx (net472)', async () => {
      await writeExistingLocalSettings({});

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, TargetFramework.NetFx);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBeUndefined();
    });

    it('does not add the setting when targetFramework is undefined', async () => {
      await writeExistingLocalSettings({});

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.customCode, undefined);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBeUndefined();
    });

    it('does not add the setting when projectType is undefined', async () => {
      await writeExistingLocalSettings({});

      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, undefined, TargetFramework.Net8);

      const localSettings = await readLocalSettings();
      expect(localSettings.Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION).toBeUndefined();
    });

    it('does not create a local.settings.json file at all when it did not previously exist and inputs are a no-op', async () => {
      // No pre-existing local.settings.json for this case.
      await addCustomCodeDotNetVersionSetting(mockContext, projectPath, ProjectType.rulesEngine, TargetFramework.Net8);

      expect(await fse.pathExists(path.join(projectPath, 'local.settings.json'))).toBe(false);
    });
  });

  describe('localSettings - isLocalSettingsEncrypted', () => {
    let tempDir: string;
    let projectPath: string;
    let localSettingsPath: string;

    beforeEach(async () => {
      const tmpBase = process.env.TEMP || process.env.TMP || process.cwd();
      tempDir = await fse.mkdtemp(path.join(tmpBase, 'logic-apps-localsettings-encryption-test-'));
      projectPath = path.join(tempDir, 'TestLogicApp');
      localSettingsPath = path.join(projectPath, 'local.settings.json');
      await fse.ensureDir(projectPath);
    });

    afterEach(async () => {
      await fse.remove(tempDir);
    });

    it('returns false when local.settings.json does not exist', async () => {
      expect(await isLocalSettingsEncrypted(projectPath)).toBe(false);
    });

    it.each(['', ' \r\n\t '])('returns false when local.settings.json is empty or whitespace-only', async (content) => {
      await fse.writeFile(localSettingsPath, content);

      expect(await isLocalSettingsEncrypted(projectPath)).toBe(false);
    });

    it('returns true when IsEncrypted is true', async () => {
      await fse.writeFile(localSettingsPath, '{"IsEncrypted":true,"Values":{}}');

      expect(await isLocalSettingsEncrypted(projectPath)).toBe(true);
    });

    it.each([
      ['false', '{"IsEncrypted":false,"Values":{}}'],
      ['absent', '{"Values":{}}'],
      ['not a boolean', '{"IsEncrypted":"true","Values":{}}'],
    ])('returns false when IsEncrypted is %s', async (_description, content) => {
      await fse.writeFile(localSettingsPath, content);

      expect(await isLocalSettingsEncrypted(projectPath)).toBe(false);
    });

    it('supports JSONC comments', async () => {
      await fse.writeFile(
        localSettingsPath,
        `{
          // Encryption state is maintained by Functions Core Tools.
          "IsEncrypted": true,
          /* Settings remain opaque while encrypted. */
          "Values": {}
        }`
      );

      expect(await isLocalSettingsEncrypted(projectPath)).toBe(true);
    });

    it('supports trailing commas', async () => {
      await fse.writeFile(
        localSettingsPath,
        `{
          "IsEncrypted": true,
          "Values": {},
        }`
      );

      expect(await isLocalSettingsEncrypted(projectPath)).toBe(true);
    });

    it('supports a UTF-8 BOM', async () => {
      await fse.writeFile(localSettingsPath, '\uFEFF{"IsEncrypted":true,"Values":{}}');

      expect(await isLocalSettingsEncrypted(projectPath)).toBe(true);
    });

    it('rejects malformed non-empty JSONC', async () => {
      await fse.writeFile(localSettingsPath, '{"IsEncrypted":true');

      await expect(isLocalSettingsEncrypted(projectPath)).rejects.toThrow();
    });
  });
});
