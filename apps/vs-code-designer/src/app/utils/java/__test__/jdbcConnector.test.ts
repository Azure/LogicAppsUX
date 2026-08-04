/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'path';
import * as fse from 'fs-extra';
import { window } from 'vscode';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import {
  jdbcConnectorDocsUrl,
  libDirectory,
  builtinOperationSdksFolderName,
  jarFolderName,
  multiLanguageWorkerSetting,
} from '../../../../constants';
import { tryExecuteCommand } from '../../funcCoreTools/cpUtils';
import {
  getJdbcDriverJarFolder,
  hasJdbcDriverJars,
  isJavaRuntimeInstalled,
  mergeMultiLanguageWorkerFlag,
  warnIfJdbcJavaRuntimeMissing,
} from '../jdbcConnector';

// DialogResponses is a bare vi.fn() in the global test-setup; give learnMore a stable identity so the
// warn flow can compare the toast selection against it. Avoid importActual here because the real module
// pulls in 'vscode', which is not resolvable in the Vitest (node) environment.
vi.mock('@microsoft/vscode-azext-utils', () => ({
  DialogResponses: { learnMore: { title: 'Learn more' } },
  openUrl: vi.fn(),
}));

vi.mock('../../funcCoreTools/cpUtils', () => ({
  tryExecuteCommand: vi.fn(),
}));

const mockedReaddir = fse.readdir as unknown as ReturnType<typeof vi.fn>;
const mockedTryExecute = tryExecuteCommand as unknown as ReturnType<typeof vi.fn>;
const mockedShowWarning = window.showWarningMessage as unknown as ReturnType<typeof vi.fn>;
const mockedOpenUrl = openUrl as unknown as ReturnType<typeof vi.fn>;

const projectPath = path.join('/workspace', 'LogicApp');
const jarFolder = path.join(projectPath, libDirectory, builtinOperationSdksFolderName, jarFolderName);

function newContext() {
  return { telemetry: { properties: {} as Record<string, string>, measurements: {} } } as any;
}

describe('jdbcConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getJdbcDriverJarFolder', () => {
    it('resolves lib/builtinOperationSdks/JAR under the project root', () => {
      expect(getJdbcDriverJarFolder(projectPath)).toBe(jarFolder);
    });
  });

  describe('hasJdbcDriverJars', () => {
    it('returns true when a .jar file is present', async () => {
      mockedReaddir.mockResolvedValue(['ojdbc8.jar']);
      expect(await hasJdbcDriverJars(projectPath)).toBe(true);
      expect(mockedReaddir).toHaveBeenCalledWith(jarFolder);
    });

    it('matches the .jar extension case-insensitively', async () => {
      mockedReaddir.mockResolvedValue(['DRIVER.JAR']);
      expect(await hasJdbcDriverJars(projectPath)).toBe(true);

      mockedReaddir.mockResolvedValue(['Driver.Jar']);
      expect(await hasJdbcDriverJars(projectPath)).toBe(true);
    });

    it('detects a .jar among other files', async () => {
      mockedReaddir.mockResolvedValue(['readme.txt', 'notes.md', 'postgresql-42.7.jar']);
      expect(await hasJdbcDriverJars(projectPath)).toBe(true);
    });

    it('returns false for an empty folder', async () => {
      mockedReaddir.mockResolvedValue([]);
      expect(await hasJdbcDriverJars(projectPath)).toBe(false);
    });

    it('returns false when the folder has only non-JAR files', async () => {
      mockedReaddir.mockResolvedValue(['readme.txt', 'driver.jar.txt', 'jarfile']);
      expect(await hasJdbcDriverJars(projectPath)).toBe(false);
    });

    it('returns false when the folder does not exist (readdir throws)', async () => {
      mockedReaddir.mockRejectedValue(new Error('ENOENT'));
      expect(await hasJdbcDriverJars(projectPath)).toBe(false);
    });
  });

  describe('mergeMultiLanguageWorkerFlag', () => {
    it('returns the flag when the current value is undefined or empty', () => {
      expect(mergeMultiLanguageWorkerFlag(undefined)).toBe(multiLanguageWorkerSetting);
      expect(mergeMultiLanguageWorkerFlag('')).toBe(multiLanguageWorkerSetting);
      expect(mergeMultiLanguageWorkerFlag('   ')).toBe(multiLanguageWorkerSetting);
    });

    it('is idempotent when the flag is already the only value', () => {
      expect(mergeMultiLanguageWorkerFlag(multiLanguageWorkerSetting)).toBe(multiLanguageWorkerSetting);
    });

    it('appends the flag while preserving existing flags', () => {
      expect(mergeMultiLanguageWorkerFlag('SomeOtherFlag')).toBe(`SomeOtherFlag,${multiLanguageWorkerSetting}`);
      expect(mergeMultiLanguageWorkerFlag('FlagA,FlagB')).toBe(`FlagA,FlagB,${multiLanguageWorkerSetting}`);
    });

    it('does not duplicate the flag when already present (case-insensitive)', () => {
      expect(mergeMultiLanguageWorkerFlag(`FlagA,${multiLanguageWorkerSetting}`)).toBe(`FlagA,${multiLanguageWorkerSetting}`);
      expect(mergeMultiLanguageWorkerFlag('enablemultilanguageworker')).toBe('enablemultilanguageworker');
    });

    it('normalizes surrounding whitespace and drops empty tokens', () => {
      expect(mergeMultiLanguageWorkerFlag(' FlagA , , FlagB ')).toBe(`FlagA,FlagB,${multiLanguageWorkerSetting}`);
    });
  });

  describe('isJavaRuntimeInstalled', () => {
    it('returns true when `java -version` exits 0', async () => {
      mockedTryExecute.mockResolvedValue({ code: 0, cmdOutput: '', cmdOutputIncludingStderr: '', formattedArgs: '-version' });
      expect(await isJavaRuntimeInstalled()).toBe(true);
      expect(mockedTryExecute).toHaveBeenCalledWith(undefined, undefined, 'java', '-version');
    });

    it('returns false when `java -version` exits non-zero', async () => {
      mockedTryExecute.mockResolvedValue({ code: 127, cmdOutput: '', cmdOutputIncludingStderr: '', formattedArgs: '-version' });
      expect(await isJavaRuntimeInstalled()).toBe(false);
    });

    it('returns false when the java binary cannot be spawned (throws)', async () => {
      mockedTryExecute.mockRejectedValue(new Error('spawn java ENOENT'));
      expect(await isJavaRuntimeInstalled()).toBe(false);
    });
  });

  describe('warnIfJdbcJavaRuntimeMissing', () => {
    it('is a no-op when there are no JDBC driver JARs', async () => {
      mockedReaddir.mockResolvedValue([]);
      const context = newContext();

      await warnIfJdbcJavaRuntimeMissing(context, projectPath);

      expect(mockedTryExecute).not.toHaveBeenCalled();
      expect(mockedShowWarning).not.toHaveBeenCalled();
      expect(context.telemetry.properties.jdbcJavaRuntime).toBeUndefined();
    });

    it('does not warn when JARs are present and Java is installed', async () => {
      mockedReaddir.mockResolvedValue(['ojdbc8.jar']);
      mockedTryExecute.mockResolvedValue({ code: 0, cmdOutput: '', cmdOutputIncludingStderr: '', formattedArgs: '-version' });
      const context = newContext();

      await warnIfJdbcJavaRuntimeMissing(context, projectPath);

      expect(mockedShowWarning).not.toHaveBeenCalled();
      expect(context.telemetry.properties.jdbcJavaRuntime).toBe('installed');
    });

    it('warns and opens docs when JARs are present but Java is missing and Learn more is clicked', async () => {
      mockedReaddir.mockResolvedValue(['ojdbc8.jar']);
      mockedTryExecute.mockRejectedValue(new Error('spawn java ENOENT'));
      mockedShowWarning.mockResolvedValue(DialogResponses.learnMore);
      const context = newContext();

      await warnIfJdbcJavaRuntimeMissing(context, projectPath);
      // Allow the fire-and-forget toast handler to run.
      await Promise.resolve();
      await Promise.resolve();

      expect(mockedShowWarning).toHaveBeenCalledTimes(1);
      expect(context.telemetry.properties.jdbcJavaRuntime).toBe('missing');
      expect(mockedOpenUrl).toHaveBeenCalledWith(jdbcConnectorDocsUrl);
    });

    it('warns but does not open docs when the toast is dismissed', async () => {
      mockedReaddir.mockResolvedValue(['ojdbc8.jar']);
      mockedTryExecute.mockResolvedValue({ code: 1, cmdOutput: '', cmdOutputIncludingStderr: '', formattedArgs: '-version' });
      mockedShowWarning.mockResolvedValue(undefined);
      const context = newContext();

      await warnIfJdbcJavaRuntimeMissing(context, projectPath);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockedShowWarning).toHaveBeenCalledTimes(1);
      expect(context.telemetry.properties.jdbcJavaRuntime).toBe('missing');
      expect(mockedOpenUrl).not.toHaveBeenCalled();
    });
  });
});
