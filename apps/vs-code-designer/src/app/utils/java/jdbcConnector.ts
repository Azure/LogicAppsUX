/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  builtinOperationSdksFolderName,
  jarFolderName,
  jdbcConnectorDocsUrl,
  libDirectory,
  multiLanguageWorkerSetting,
} from '../../../constants';
import { localize } from '../../../localize';
import { tryExecuteCommand } from '../funcCoreTools/cpUtils';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { window } from 'vscode';

/**
 * The Java/.NET built-in connectors (JDBC being the primary one) load their client driver assemblies
 * from `<project>/lib/builtinOperationSdks/JAR`. Returns the absolute path of that folder.
 * @param {string} projectPath - The logic app project root.
 * @returns {string} The absolute path to the JDBC driver JAR folder.
 */
export function getJdbcDriverJarFolder(projectPath: string): string {
  return path.join(projectPath, libDirectory, builtinOperationSdksFolderName, jarFolderName);
}

/**
 * Detects whether the user has placed any JDBC driver JAR file into
 * `<project>/lib/builtinOperationSdks/JAR`. The folder is always created for a logic app project, so its
 * mere presence is not enough — we only care when it actually contains at least one `.jar` file.
 *
 * Missing/unreadable folders, empty folders, and folders that contain only non-JAR files all return
 * false. Matching is case-insensitive so `.jar`, `.JAR`, and `.Jar` are all recognized.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<boolean>} True when at least one `.jar` file exists in the JDBC driver folder.
 */
export async function hasJdbcDriverJars(projectPath: string): Promise<boolean> {
  const jarFolder = getJdbcDriverJarFolder(projectPath);
  try {
    const entries: string[] = await fse.readdir(jarFolder);
    return entries.some((entry) => entry.toLowerCase().endsWith('.jar'));
  } catch {
    // Folder does not exist or cannot be read — treat as "no JDBC drivers present".
    return false;
  }
}

/**
 * Merges {@link multiLanguageWorkerSetting} into an existing `AzureWebJobsFeatureFlags` value without
 * dropping any flags the user already configured.
 *
 * `AzureWebJobsFeatureFlags` is a comma-separated list. This normalizes whitespace, drops empty tokens,
 * and appends `EnableMultiLanguageWorker` only when it is not already present (case-insensitive), so the
 * result is idempotent.
 * @param {string | undefined} existingValue - The current comma-separated feature flags value, if any.
 * @returns {string} The feature flags value guaranteed to contain the multi-language worker flag.
 */
export function mergeMultiLanguageWorkerFlag(existingValue: string | undefined): string {
  const tokens = (existingValue ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const alreadyPresent = tokens.some((token) => token.toLowerCase() === multiLanguageWorkerSetting.toLowerCase());
  if (!alreadyPresent) {
    tokens.push(multiLanguageWorkerSetting);
  }

  return tokens.join(',');
}

/**
 * Checks whether a Java runtime (JRE/JDK) is discoverable on the machine by invoking `java -version`.
 * `java -version` writes to stderr and exits 0 when Java is installed, so success is determined by the
 * process exit code rather than the output text.
 * @returns {Promise<boolean>} True when a Java runtime is installed and on PATH.
 */
export async function isJavaRuntimeInstalled(): Promise<boolean> {
  try {
    const result = await tryExecuteCommand(undefined, undefined, 'java', '-version');
    return result.code === 0;
  } catch {
    // `java` binary not found (spawn error) — treat as not installed.
    return false;
  }
}

/**
 * Warns the user (non-blocking) when the project contains JDBC driver JARs but no Java runtime can be
 * found. The JDBC built-in connector requires a locally installed JDK; without it the multi-language
 * worker cannot start and connections fail with "JDBC client library is missing".
 *
 * The warning is a non-modal toast with a "Learn more" action linking to the connector docs, so it never
 * blocks design-time startup. When there are no JDBC JARs (the common case) this is a no-op.
 * @param {IActionContext} context - The action context (used for telemetry).
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<void>} Resolves once the prerequisite check has run (does not wait for the toast).
 */
export async function warnIfJdbcJavaRuntimeMissing(context: IActionContext, projectPath: string): Promise<void> {
  if (!(await hasJdbcDriverJars(projectPath))) {
    return;
  }

  if (await isJavaRuntimeInstalled()) {
    context.telemetry.properties.jdbcJavaRuntime = 'installed';
    return;
  }

  context.telemetry.properties.jdbcJavaRuntime = 'missing';
  const message = localize(
    'jdbcJavaRuntimeMissing',
    'This logic app uses the JDBC built-in connector, which requires a Java Development Kit (JDK) installed locally. No Java runtime was found — install a supported JDK (LTS, e.g. 17 or 21), set JAVA_HOME, and add it to your PATH.'
  );

  // Non-blocking: do not await the toast so it never delays design-time startup.
  window.showWarningMessage(message, DialogResponses.learnMore).then(
    (selection) => {
      if (selection === DialogResponses.learnMore) {
        openUrl(jdbcConnectorDocsUrl);
      }
    },
    () => undefined
  );
}
