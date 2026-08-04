import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * E2E (filesystem-contract) tests for the JDBC built-in connector prerequisite self-heal (issue #8597).
 *
 * The JDBC built-in connector runs on the Functions multi-language (Java) worker, which is only enabled
 * by the `AzureWebJobsFeatureFlags=EnableMultiLanguageWorker` app setting. A plain codeless Logic App does
 * NOT get that flag by default, so a driver JAR dropped into `lib/builtinOperationSdks/JAR` is never loaded
 * and the connection fails with "JDBC client library is missing".
 *
 * The extension self-heals this on design-time startup (regenerateLocalSettings): if driver JAR(s) are
 * present, it merges `EnableMultiLanguageWorker` into local.settings.json without clobbering existing flags.
 *
 * This suite verifies that end-to-end contract against a real project on disk. The detection + merge below
 * mirror `apps/vs-code-designer/src/app/utils/java/jdbcConnector.ts` (the e2e tsconfig rootDir prevents
 * importing extension source directly, matching the replication pattern used by the sibling integration
 * suites in this folder). The extension source is additionally covered by focused Vitest unit tests.
 */

// ── Constants matching the extension source ──────────────────────────
const LIB_DIRECTORY = 'lib';
const BUILTIN_OPERATION_SDKS_FOLDER = 'builtinOperationSdks';
const JAR_FOLDER = 'JAR';
const MULTI_LANGUAGE_WORKER_SETTING = 'EnableMultiLanguageWorker';
const FEATURE_FLAGS_KEY = 'AzureWebJobsFeatureFlags';

// ── Helpers mirroring app/utils/java/jdbcConnector.ts ────────────────

/** Mirror of getJdbcDriverJarFolder. */
function getJdbcDriverJarFolder(projectPath: string): string {
  return path.join(projectPath, LIB_DIRECTORY, BUILTIN_OPERATION_SDKS_FOLDER, JAR_FOLDER);
}

/** Mirror of hasJdbcDriverJars. */
function hasJdbcDriverJars(projectPath: string): boolean {
  try {
    return fs.readdirSync(getJdbcDriverJarFolder(projectPath)).some((entry) => entry.toLowerCase().endsWith('.jar'));
  } catch {
    return false;
  }
}

/** Mirror of mergeMultiLanguageWorkerFlag. */
function mergeMultiLanguageWorkerFlag(existingValue: string | undefined): string {
  const tokens = (existingValue ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (!tokens.some((token) => token.toLowerCase() === MULTI_LANGUAGE_WORKER_SETTING.toLowerCase())) {
    tokens.push(MULTI_LANGUAGE_WORKER_SETTING);
  }
  return tokens.join(',');
}

/**
 * Mirror of the regenerateLocalSettings self-heal branch: if the project has JDBC driver JARs, ensure the
 * multi-language worker flag is present in local.settings.json (merged with any existing flags). Returns
 * whether the file was changed.
 */
function selfHealJdbcMultiLanguageWorker(projectPath: string): boolean {
  const localSettingsPath = path.join(projectPath, 'local.settings.json');
  const settings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8')) as { IsEncrypted: boolean; Values: Record<string, string> };
  settings.Values = settings.Values ?? {};

  if (!hasJdbcDriverJars(projectPath)) {
    return false;
  }

  const merged = mergeMultiLanguageWorkerFlag(settings.Values[FEATURE_FLAGS_KEY]);
  if (merged === settings.Values[FEATURE_FLAGS_KEY]) {
    return false;
  }

  settings.Values[FEATURE_FLAGS_KEY] = merged;
  fs.writeFileSync(localSettingsPath, JSON.stringify(settings, null, 2));
  return true;
}

/** Create a minimal codeless Logic App project on disk with a local.settings.json that lacks the flag. */
function createCodelessLogicApp(projectPath: string, extraValues: Record<string, string> = {}): void {
  fs.mkdirSync(getJdbcDriverJarFolder(projectPath), { recursive: true });
  fs.mkdirSync(path.join(projectPath, LIB_DIRECTORY, BUILTIN_OPERATION_SDKS_FOLDER, 'net472'), { recursive: true });
  const localSettings = {
    IsEncrypted: false,
    Values: {
      AzureWebJobsStorage: 'UseDevelopmentStorage=true',
      FUNCTIONS_INPROC_NET8_ENABLED: '1',
      FUNCTIONS_WORKER_RUNTIME: 'dotnet',
      APP_KIND: 'workflowApp',
      ProjectDirectoryPath: projectPath,
      ...extraValues,
    },
  };
  fs.writeFileSync(path.join(projectPath, 'local.settings.json'), JSON.stringify(localSettings, null, 2));
}

/** Read the parsed Values map from a project's local.settings.json. */
function readValues(projectPath: string): Record<string, string> {
  return JSON.parse(fs.readFileSync(path.join(projectPath, 'local.settings.json'), 'utf-8')).Values;
}

/** Drop a driver JAR into lib/builtinOperationSdks/JAR. */
function dropDriverJar(projectPath: string, fileName = 'ojdbc8.jar'): void {
  fs.writeFileSync(path.join(getJdbcDriverJarFolder(projectPath), fileName), 'fake-jar-bytes');
}

// ── Tests ────────────────────────────────────────────────────────────

suite('JDBC connector prerequisite self-heal (#8597)', () => {
  let tempDir: string;
  let projectPath: string;

  suiteSetup(function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting JDBC prerequisite self-heal tests');
  });

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-jdbc-'));
    projectPath = path.join(tempDir, 'LogicApp');
  });

  teardown(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('adds EnableMultiLanguageWorker when a driver JAR is present in an app that lacks the flag', () => {
    createCodelessLogicApp(projectPath);
    assert.strictEqual(readValues(projectPath)[FEATURE_FLAGS_KEY], undefined, 'precondition: flag absent');

    dropDriverJar(projectPath);
    const changed = selfHealJdbcMultiLanguageWorker(projectPath);

    assert.strictEqual(changed, true);
    assert.strictEqual(readValues(projectPath)[FEATURE_FLAGS_KEY], MULTI_LANGUAGE_WORKER_SETTING);
  });

  test('does NOT add the flag when the JAR folder is empty', () => {
    createCodelessLogicApp(projectPath);

    const changed = selfHealJdbcMultiLanguageWorker(projectPath);

    assert.strictEqual(changed, false);
    assert.strictEqual(readValues(projectPath)[FEATURE_FLAGS_KEY], undefined);
  });

  test('does NOT add the flag when the folder has only non-JAR files', () => {
    createCodelessLogicApp(projectPath);
    fs.writeFileSync(path.join(getJdbcDriverJarFolder(projectPath), 'readme.txt'), 'not a jar');

    const changed = selfHealJdbcMultiLanguageWorker(projectPath);

    assert.strictEqual(changed, false);
    assert.strictEqual(readValues(projectPath)[FEATURE_FLAGS_KEY], undefined);
  });

  test('merges the flag without clobbering an existing AzureWebJobsFeatureFlags value', () => {
    createCodelessLogicApp(projectPath, { [FEATURE_FLAGS_KEY]: 'SomeOtherFlag' });
    dropDriverJar(projectPath);

    const changed = selfHealJdbcMultiLanguageWorker(projectPath);

    assert.strictEqual(changed, true);
    assert.strictEqual(readValues(projectPath)[FEATURE_FLAGS_KEY], `SomeOtherFlag,${MULTI_LANGUAGE_WORKER_SETTING}`);
  });

  test('is idempotent when the flag is already present', () => {
    createCodelessLogicApp(projectPath, { [FEATURE_FLAGS_KEY]: MULTI_LANGUAGE_WORKER_SETTING });
    dropDriverJar(projectPath);

    const changed = selfHealJdbcMultiLanguageWorker(projectPath);

    assert.strictEqual(changed, false);
    assert.strictEqual(readValues(projectPath)[FEATURE_FLAGS_KEY], MULTI_LANGUAGE_WORKER_SETTING);
  });

  test('recognizes a driver JAR regardless of extension casing', () => {
    createCodelessLogicApp(projectPath);
    dropDriverJar(projectPath, 'DRIVER.JAR');

    const changed = selfHealJdbcMultiLanguageWorker(projectPath);

    assert.strictEqual(changed, true);
    assert.strictEqual(readValues(projectPath)[FEATURE_FLAGS_KEY], MULTI_LANGUAGE_WORKER_SETTING);
  });

  test('preserves the other baseline settings when adding the flag', () => {
    createCodelessLogicApp(projectPath);
    dropDriverJar(projectPath);

    selfHealJdbcMultiLanguageWorker(projectPath);

    const values = readValues(projectPath);
    assert.strictEqual(values.APP_KIND, 'workflowApp');
    assert.strictEqual(values.FUNCTIONS_WORKER_RUNTIME, 'dotnet');
    assert.strictEqual(values.ProjectDirectoryPath, projectPath);
    assert.strictEqual(values[FEATURE_FLAGS_KEY], MULTI_LANGUAGE_WORKER_SETTING);
  });
});
