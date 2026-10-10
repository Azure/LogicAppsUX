/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BATCH_SCHEMA_VERSION = 1;
const DEFAULT_SUITE_TIMEOUT_MS = 45 * 60 * 1000;
const MIN_AZURE_TOKEN_REMAINING_MS = DEFAULT_SUITE_TIMEOUT_MS + 5 * 60 * 1000;
const SUPPLEMENTARY_LIFECYCLE_SUITES = new Set([
  'httpTimeoutLifecycle',
  'statelessVariablesLifecycle',
  'workspaceArtifactRegeneration',
  'workspaceMultiRoot',
]);

const SUITE_REGISTRY = Object.freeze({
  unitTests: Object.freeze({
    id: 'unitTests',
    args: Object.freeze(['--label', 'unitTests']),
    platforms: Object.freeze(['linux', 'win32']),
    expectedPhases: Object.freeze(['unitTests']),
  }),
  createWorkspaceBehavior: Object.freeze({
    id: 'createWorkspaceBehavior',
    args: Object.freeze(['--label', 'createWorkspaceBehavior']),
    platforms: Object.freeze(['linux', 'win32']),
    expectedPhases: Object.freeze(['createWorkspaceBehavior']),
  }),
  createWorkspaceCoreMatrix: Object.freeze({
    id: 'createWorkspaceCoreMatrix',
    args: Object.freeze(['--label', 'createWorkspaceCoreMatrix']),
    platforms: Object.freeze(['linux', 'win32']),
    expectedPhases: Object.freeze([
      'createWorkspaceCoreMatrix:standard-stateful',
      'createWorkspaceCoreMatrix:standard-stateless',
      'createWorkspaceCoreMatrix:custom-code-stateful',
      'createWorkspaceCoreMatrix:custom-code-stateless',
      'createWorkspaceCoreMatrix:rules-engine-stateful',
      'createWorkspaceCoreMatrix:rules-engine-stateless',
    ]),
  }),
  createWorkspacePreviewMatrix: Object.freeze({
    id: 'createWorkspacePreviewMatrix',
    args: Object.freeze(['--label', 'createWorkspacePreviewMatrix']),
    platforms: Object.freeze(['linux', 'win32']),
    expectedPhases: Object.freeze([
      'createWorkspacePreviewMatrix:standard-autonomous-agent',
      'createWorkspacePreviewMatrix:standard-conversational-agent',
      'createWorkspacePreviewMatrix:custom-code-autonomous-agent',
      'createWorkspacePreviewMatrix:custom-code-conversational-agent',
      'createWorkspacePreviewMatrix:rules-engine-autonomous-agent',
      'createWorkspacePreviewMatrix:rules-engine-conversational-agent',
    ]),
  }),
  createWorkspaceCodeful: Object.freeze({
    id: 'createWorkspaceCodeful',
    args: Object.freeze(['--label', 'createWorkspaceCodeful']),
    platforms: Object.freeze(['linux', 'win32']),
    expectedPhases: Object.freeze(['createWorkspaceCodeful:codeful-modern-control', 'createWorkspaceCodeful:codeful-legacy-control']),
  }),
  createWorkspaceBehaviorSmoke: Object.freeze({
    id: 'createWorkspaceBehaviorSmoke',
    args: Object.freeze(['--label', 'createWorkspaceBehaviorSmoke']),
    platforms: Object.freeze(['win32']),
    expectedPhases: Object.freeze(['createWorkspaceBehaviorSmoke']),
  }),
  msnWeatherLifecycle: Object.freeze({
    id: 'msnWeatherLifecycle',
    args: Object.freeze(['--msn-weather-lifecycle']),
    platforms: Object.freeze(['linux', 'win32']),
    requiresAzure: true,
    expectedPhases: Object.freeze(['runtimeDependencyBootstrap:bootstrap', 'msnWeatherLifecycle:create', 'msnWeatherLifecycle:run']),
  }),
  httpTimeoutLifecycle: Object.freeze({
    id: 'httpTimeoutLifecycle',
    args: Object.freeze(['--http-timeout-lifecycle']),
    platforms: Object.freeze(['linux', 'win32']),
    requiresAzure: true,
    expectedPhases: Object.freeze(['runtimeDependencyBootstrap:bootstrap', 'httpTimeoutLifecycle:create', 'httpTimeoutLifecycle:reopen']),
  }),
  statelessVariablesLifecycle: Object.freeze({
    id: 'statelessVariablesLifecycle',
    args: Object.freeze(['--stateless-variables-lifecycle']),
    platforms: Object.freeze(['linux', 'win32']),
    requiresAzure: true,
    expectedPhases: Object.freeze([
      'runtimeDependencyBootstrap:bootstrap',
      'statelessVariablesLifecycle:create',
      'statelessVariablesLifecycle:prepare',
      'statelessVariablesLifecycle:reopen',
    ]),
  }),
  workspaceArtifactRegeneration: Object.freeze({
    id: 'workspaceArtifactRegeneration',
    args: Object.freeze(['--workspace-artifact-regeneration']),
    platforms: Object.freeze(['linux', 'win32']),
    expectedPhases: Object.freeze([
      'workspaceArtifactRegeneration:create',
      'workspaceArtifactRegeneration:baseline',
      'workspaceArtifactRegeneration:vscode-single',
      'workspaceArtifactRegeneration:vscode-single-reopen',
      'workspaceArtifactRegeneration:vscode-multiple',
      'workspaceArtifactRegeneration:vscode-multiple-reopen',
      'workspaceArtifactRegeneration:vscode-repeat',
      'workspaceArtifactRegeneration:vscode-repeat-reopen',
      'workspaceArtifactRegeneration:root-single',
      'workspaceArtifactRegeneration:root-single-reopen',
      'workspaceArtifactRegeneration:root-multiple',
      'workspaceArtifactRegeneration:root-multiple-reopen',
      'workspaceArtifactRegeneration:root-repeat',
      'workspaceArtifactRegeneration:root-repeat-reopen',
    ]),
  }),
  workspaceMultiRoot: Object.freeze({
    id: 'workspaceMultiRoot',
    args: Object.freeze(['--workspace-multi-root']),
    platforms: Object.freeze(['linux', 'win32']),
    expectedPhases: Object.freeze(['runtimeDependencyBootstrap:bootstrap', 'workspaceMultiRoot:create', 'workspaceMultiRoot:reopen']),
  }),
});

const SUITE_SCOPED_AZURE_ENV_KEYS = [
  'LA_E2E_CLI_AZURE_ACCESS_TOKEN',
  'LA_E2E_CLI_AZURE_CLIENT_ID',
  'LA_E2E_CLI_AZURE_TENANT_ID',
  'LA_E2E_CLI_AZURE_SUBSCRIPTION_ID',
  'LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME',
  'LA_E2E_CLI_AZURE_LOCATION_NAME',
  'LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL',
  'LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON',
  'LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT',
  'WORKFLOWS_TENANT_ID',
  'WORKFLOWS_SUBSCRIPTION_ID',
  'WORKFLOWS_RESOURCE_GROUP_NAME',
  'WORKFLOWS_LOCATION_NAME',
  'WORKFLOWS_MANAGEMENT_BASE_URI',
  'SYSTEM_ACCESSTOKEN',
  'FC_SERVICE_CONNECTION_NAME',
  'FC_SERVICE_CONNECTION_ID',
  'FC_SERVICE_CONNECTION_CLIENT_ID',
  'FC_SERVICE_CONNECTION_TENANT_ID',
  'AzCode_UseAzureFederatedCredentials',
  'AzCode_ServiceConnectionID',
  'AzCode_ServiceConnectionDomain',
  'AzCode_ServiceConnectionClientID',
];

const SUITE_ALIASES = Object.freeze({
  linux: Object.freeze([
    'unitTests',
    'createWorkspaceBehavior',
    'createWorkspaceCoreMatrix',
    'createWorkspacePreviewMatrix',
    'createWorkspaceCodeful',
    'msnWeatherLifecycle',
  ]),
  windows: Object.freeze([
    'unitTests',
    'createWorkspaceBehavior',
    'createWorkspaceCoreMatrix',
    'createWorkspacePreviewMatrix',
    'createWorkspaceCodeful',
    'msnWeatherLifecycle',
  ]),
});

const SUITE_CONTROL_ENV_PATTERNS = [
  /^LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_/,
  /^LA_E2E_CLI_SUITE_WRAPPER_CHILD$/,
  /^LA_E2E_CLI_STATELESS_VARIABLES_MODE$/,
  /^LA_E2E_CLI_(?:REQUIRE_WORKSPACE_REGENERATION|REGENERATION_DIAGNOSTICS_DIR)$/,
  /^LA_E2E_CLI_(?:INCLUDE_|WORKSPACE_LIFECYCLE_|STARTUP_RESOURCE$|CREATE_WORKSPACE_CASE$|CREATE_WORKSPACE_GROUP$|CREATE_WORKSPACE_PARENT$|DEFER_WORKSPACE_CLEANUP$|PROFILE_PHASE$|USER_DATA_SUFFIX$|USER_DATA_DIR$|VSCODE_LOG_ARTIFACT_LABEL$|CODEFUL_EVIDENCE_NOT_BEFORE$|MINIMAL_ACTIVATION$|SKIP_ACTIVATION_WORKSPACE_ENSURE$|EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT$|EMPTY_RUNTIME_DEPENDENCIES_ROOT_CONFIRMED$|AZURE_ACCESS_TOKEN$|AZURE_CLIENT_ID$|AZURE_TENANT_ID$|AZURE_SUBSCRIPTION_ID$|AZURE_RESOURCE_GROUP_NAME$|AZURE_LOCATION_NAME$|AZURE_MANAGEMENT_BASE_URL$)/,
  /^(WORKFLOWS_TENANT_ID|WORKFLOWS_SUBSCRIPTION_ID|WORKFLOWS_RESOURCE_GROUP_NAME|WORKFLOWS_LOCATION_NAME|WORKFLOWS_MANAGEMENT_BASE_URI)$/,
  /^(FC_SERVICE_CONNECTION_|AzCode_|SYSTEM_ACCESSTOKEN)/,
  /^(?:idToken|servicePrincipalKey|servicePrincipalId|tenantId|AZURE_CONFIG_DIR)$/i,
];

const CONTAINMENT_BREACH_PATTERNS = [
  /cleanup\/isolation breach/i,
  /containment breach/i,
  /source is outside wrapper-created owned roots/i,
  /rejected discovered workspace source/i,
  /Unable to remove owned workspace parent/i,
  /Unable to remove temp workspace parent/i,
  /Refusing to use the user's Azure Logic Apps dependency cache/i,
  /Expected isolated dependency root to start empty/i,
  /Process exited without a numeric exit code/i,
];

function platformKey(platform = process.platform) {
  return platform === 'win32' ? 'win32' : 'linux';
}

function parseSuitesValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap(parseSuitesValue);
  }

  return String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeSuiteSelection(value, options = {}) {
  const selectedPlatform = platformKey(options.platform);
  const requested = parseSuitesValue(value);
  if (requested.length === 0) {
    throw new Error('--suites requires at least one suite id');
  }

  const expanded = [];
  for (const token of requested) {
    if (SUITE_ALIASES[token]) {
      expanded.push(...SUITE_ALIASES[token]);
    } else {
      expanded.push(token);
    }
  }

  const seen = new Set();
  const suites = [];
  for (const id of expanded) {
    const entry = SUITE_REGISTRY[id];
    if (!entry) {
      throw new Error(`Unknown --suites entry "${id}". Known suites: ${Object.keys(SUITE_REGISTRY).join(', ')}`);
    }
    if (seen.has(id)) {
      throw new Error(`Duplicate or overlapping --suites entry "${id}"`);
    }
    seen.add(id);
    if (!entry.platforms.includes(selectedPlatform)) {
      throw new Error(`Suite "${id}" is not available on ${selectedPlatform}`);
    }
    suites.push(entry);
  }

  return suites;
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function createBatchRoot(options = {}) {
  const rootParent = options.batchRoot ? path.resolve(options.batchRoot) : os.tmpdir();
  ensureDirectory(rootParent);
  return fs.mkdtempSync(path.join(rootParent, 'b-'));
}

function createSuiteContext({ batchRoot, suite, index, total, now = Date.now() }) {
  const suiteRoot = fs.mkdtempSync(path.join(batchRoot, `${String(index + 1).padStart(2, '0')}-`));
  const tempRoot = ensureDirectory(path.join(suiteRoot, 'temp'));
  const runtimeRoot = ensureDirectory(path.join(suiteRoot, 'runtime-dependencies'));
  const userDataParent = ensureDirectory(path.join(suiteRoot, 'profiles'));
  const extensionsDir = path.join(suiteRoot, 'extensions');
  const workspaceRoot = ensureDirectory(path.join(suiteRoot, 'workspaces'));
  const reportsRoot = ensureDirectory(path.join(suiteRoot, 'reports'));
  const lifecycleRoot = ensureDirectory(path.join(suiteRoot, 'lifecycle'));
  const resultPath = path.join(reportsRoot, `${suite.id}.batch-result.json`);
  const terminalResultPath = path.join(reportsRoot, `${suite.id}.terminal-result.json`);
  const cleanupLedgerPath = path.join(reportsRoot, `${suite.id}.cleanup-ledger.json`);
  const phaseResultsPath = path.join(reportsRoot, `${suite.id}.phase-results.jsonl`);
  const logPath = path.join(reportsRoot, `${suite.id}.log`);
  const expectedPhaseIds = [...(suite.expectedPhases ?? [suite.id])];

  return {
    id: suite.id,
    index,
    total,
    startedAt: new Date(now).toISOString(),
    suiteRoot,
    tempRoot,
    runtimeRoot,
    userDataParent,
    extensionsDir,
    workspaceRoot,
    reportsRoot,
    lifecycleRoot,
    resultPath,
    terminalResultPath,
    cleanupLedgerPath,
    phaseResultsPath,
    logPath,
    expectedPhaseIds,
    args: [...suite.args],
  };
}

function shouldRemoveEnvKey(key) {
  return SUITE_CONTROL_ENV_PATTERNS.some((pattern) => pattern.test(key));
}

function buildSuiteEnvironment(baseEnv, context, extraEnv = {}) {
  const env = {};
  for (const [key, value] of Object.entries(baseEnv)) {
    if (value !== undefined && !shouldRemoveEnvKey(key)) {
      env[key] = value;
    }
  }

  return {
    ...env,
    ...extraEnv,
    ...(context.id === 'workspaceArtifactRegeneration'
      ? { LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR: path.join(context.reportsRoot, 'workspace-regeneration') }
      : {}),
    ...(context.id === 'createWorkspaceCoreMatrix'
      ? {
          LA_E2E_CLI_REQUIRE_WORKSPACE_CANCEL: '1',
          LA_E2E_CLI_CANCEL_DIAGNOSTICS_DIR: path.join(context.reportsRoot, 'workspace-cancel'),
        }
      : {}),
    ...(context.id === 'workspaceMultiRoot'
      ? {
          LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1',
          LA_E2E_CLI_MULTI_ROOT_DIAGNOSTIC_ONLY: '1',
          LA_E2E_CLI_MULTI_ROOT_DIAGNOSTICS_PARENT: path.join(context.reportsRoot, 'workspace-multi-root'),
        }
      : {}),
    LA_E2E_CLI_BATCH_MODE: '1',
    LA_E2E_CLI_BATCH_SUITE_ID: context.id,
    LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: context.runtimeRoot,
    LA_E2E_CLI_USER_DATA_PARENT: context.userDataParent,
    LA_E2E_CLI_EXTENSIONS_DIR: context.extensionsDir,
    LA_E2E_CLI_WORKSPACE_ROOT: context.workspaceRoot,
    LA_E2E_CLI_VSCODE_LOG_DIR: baseEnv.LA_E2E_CLI_VSCODE_LOG_DIR || path.join(context.reportsRoot, 'vscode-logs'),
    LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR:
      baseEnv.LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR || path.join(context.reportsRoot, 'generated-workspaces'),
    LA_E2E_CLI_SCREENSHOT_DIR: baseEnv.LA_E2E_CLI_SCREENSHOT_DIR || path.join(context.reportsRoot, 'screenshots'),
    LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT: baseEnv.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT || context.lifecycleRoot,
    LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST: path.join(context.workspaceRoot, 'created-workspaces.json'),
    LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath,
    LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath,
    LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: context.phaseResultsPath,
    LA_E2E_CLI_BATCH_EXPECTED_PHASES: JSON.stringify(context.expectedPhaseIds),
    LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL: '1',
    DOTNET_CLI_HOME: ensureDirectory(path.join(context.suiteRoot, 'dotnet-home')),
    NUGET_PACKAGES: ensureDirectory(path.join(context.suiteRoot, 'nuget', 'packages')),
    npm_config_cache: ensureDirectory(path.join(context.suiteRoot, 'npm-cache')),
    TEMP: context.tempRoot,
    TMP: context.tempRoot,
    TMPDIR: context.tempRoot,
  };
}

function prepareSuiteExtensionsDirectory({ seedDir, targetDir, expectedManifest }) {
  if (!seedDir || !fs.existsSync(seedDir)) {
    throw new Error(
      [
        '[batch] Missing prepared extensions seed for isolated suite execution.',
        'Set LA_E2E_CLI_PREPARED_EXTENSIONS_DIR or run the OS preparation step that populates .vscode-test/extensions before --suites.',
      ].join(' ')
    );
  }

  const manifest = expectedManifest ?? buildDirectoryIntegrityManifest(seedDir);
  if (manifest.files.length === 0) {
    throw new Error(`[batch] Prepared extensions seed is empty: ${seedDir}`);
  }
  if (!manifest.files.some((file) => file.relativePath === 'extensions.json')) {
    throw new Error(`[batch] Prepared extensions seed is missing extensions.json: ${seedDir}`);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(seedDir, targetDir, { recursive: true, force: true, dereference: false, verbatimSymlinks: true });
  const copiedManifest = buildDirectoryIntegrityManifest(targetDir);
  if (JSON.stringify(copiedManifest.files) !== JSON.stringify(manifest.files)) {
    throw new Error('[batch] Prepared extensions seed changed while copying; refusing to run isolated suites.');
  }
  return targetDir;
}

function classifySuiteRunResult({ exitCode, signal, error, output = '', terminalResult, cleanupLedger }) {
  if (error) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  if (signal || exitCode === null || typeof exitCode !== 'number') {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: `process exited without numeric code${signal ? ` (${signal})` : ''}`,
    };
  }
  if (!terminalResult || terminalResult.schemaVersion !== 1 || terminalResult.complete !== true) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: 'missing or incomplete structured suite terminal result',
    };
  }
  if (!cleanupLedger || cleanupLedger.schemaVersion !== 1 || cleanupLedger.verified !== true) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: 'missing or unverified cleanup ledger',
    };
  }
  if (terminalResult.cleanupVerified !== true) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: `structured suite terminal result reported cleanupVerified=${terminalResult.cleanupVerified}`,
    };
  }
  if (terminalResult.exitCode !== exitCode) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: `structured suite terminal result exitCode mismatch. observed=${exitCode} terminal=${terminalResult.exitCode}`,
    };
  }
  if ((terminalResult.signal ?? null) !== (signal ?? null)) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: `structured suite terminal result signal mismatch. observed=${signal ?? null} terminal=${terminalResult.signal ?? null}`,
    };
  }
  if (typeof terminalResult.diagnosticsError === 'string' && terminalResult.diagnosticsError.trim()) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: `structured suite terminal result reported diagnosticsError=${terminalResult.diagnosticsError}`,
    };
  }
  if (
    terminalResult.phaseCompleteness !== true ||
    cleanupLedger.phaseCleanupVerified !== true ||
    cleanupLedger.processTreeVerified !== true
  ) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: 'structured suite terminal/cleanup evidence did not verify phase completeness, phase cleanup, and process tree cleanup',
    };
  }
  if (Array.isArray(terminalResult.duplicatePhaseIds) && terminalResult.duplicatePhaseIds.length > 0) {
    return {
      category: 'containmentBreach',
      outcome: 'infrastructureFailure',
      reason: `structured suite terminal result reported duplicate phase ids: ${terminalResult.duplicatePhaseIds.join(', ')}`,
    };
  }
  const matchedBreach = CONTAINMENT_BREACH_PATTERNS.find((pattern) => pattern.test(output));
  if (matchedBreach) {
    return { category: 'containmentBreach', outcome: 'infrastructureFailure', reason: `matched containment pattern: ${matchedBreach}` };
  }
  if (exitCode === 0) {
    if (/(^|\n)\s*0 passing\b/i.test(output) || /No tests (found|encountered)/i.test(output)) {
      return { category: 'containmentBreach', outcome: 'infrastructureFailure', reason: 'test process exited 0 without running tests' };
    }
    return { category: 'success', outcome: 'success', reason: 'exit 0' };
  }

  return { category: 'ordinaryFailure', outcome: 'failed', reason: `exit ${exitCode}` };
}

function buildBatchAggregate({
  batchRoot,
  suites,
  observed,
  stoppedAfter,
  diagnosticOnly = false,
  trustedFullExecution = false,
  platform = process.platform,
  admissionContext,
  cohortId,
}) {
  const normalizedPlatform = platformKey(platform);
  const expectedSuiteIds = suites.map((suite) => suite.id);
  const observedSuiteIds = observed.map((result) => result.id);
  const missingSuiteIds = expectedSuiteIds.filter((id) => !observedSuiteIds.includes(id));
  const unexpectedSuiteIds = observedSuiteIds.filter((id) => !expectedSuiteIds.includes(id));
  const complete = missingSuiteIds.length === 0 && unexpectedSuiteIds.length === 0;
  const failedSuites = observed.filter((result) => !['success', 'blocked'].includes(result.finalOutcome)).map((result) => result.id);
  const blockedSuites = observed.filter((result) => result.finalOutcome === 'blocked').map((result) => result.id);
  const containmentBreach = observed.some((result) => result.classification === 'containmentBreach');
  const canonicalSuiteIds = normalizedPlatform === 'win32' ? SUITE_ALIASES.windows : SUITE_ALIASES.linux;
  const canonicalInventory = arraysEqual(expectedSuiteIds, canonicalSuiteIds);
  const hasAdmissionContext = admissionContext && typeof admissionContext === 'object';
  const fullRollup =
    Boolean(trustedFullExecution) &&
    !diagnosticOnly &&
    canonicalInventory &&
    complete &&
    hasAdmissionContext &&
    !containmentBreach &&
    blockedSuites.length === 0;
  const selectedRunSuccess = complete && !containmentBreach && failedSuites.length === 0 && blockedSuites.length === 0;
  const aggregateOutcome = selectedRunSuccess ? 'success' : 'failed';

  return {
    schemaVersion: BATCH_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    platform: normalizedPlatform,
    cohortId: cohortId ?? null,
    batchRoot,
    expectedSuiteIds,
    observedSuiteIds,
    missingSuiteIds,
    unexpectedSuiteIds,
    diagnosticOnly: Boolean(diagnosticOnly),
    trustedFullExecution: Boolean(trustedFullExecution),
    canonicalInventory,
    admissionContext: admissionContext ?? null,
    hasAdmissionContext,
    fullRollup,
    complete,
    selectedRunSuccess,
    containmentBreach,
    stoppedAfter: stoppedAfter ?? null,
    aggregateOutcome,
    failedSuites,
    blockedSuites,
    suites: observed,
  };
}

async function runBatchSuites({
  suites,
  batchRoot,
  runSuite,
  baseEnv = process.env,
  seedDir,
  diagnosticOnly = false,
  trustedFullExecution = false,
  platform = process.platform,
  admissionContext,
  cohortId,
  createContext = createSuiteContext,
}) {
  ensureDirectory(batchRoot);
  const observed = [];
  let stoppedAfter;
  let preparedExtensionsManifest;
  try {
    preparedExtensionsManifest = buildDirectoryIntegrityManifest(seedDir);
  } catch (error) {
    const normalizedPlatform = platformKey(platform);
    const failedSuiteId = suites[0]?.id;
    const reason = `cohort initialization failed: ${error instanceof Error ? error.message : String(error)}`;
    for (const [index, suite] of suites.entries()) {
      observed.push({
        id: suite.id,
        rerunId: `${normalizedPlatform === 'win32' ? 'windows' : 'linux'}:${suite.id}`,
        cohortId: cohortId ?? null,
        platform: normalizedPlatform,
        args: suite.args,
        suiteRoot: null,
        reportsRoot: null,
        startedAt: null,
        finishedAt: new Date().toISOString(),
        exitCode: null,
        signal: null,
        classification: index === 0 ? 'containmentBreach' : 'blocked',
        finalOutcome: index === 0 ? 'infrastructureFailure' : 'blocked',
        reason: index === 0 ? reason : `blocked because ${failedSuiteId} had a cohort initialization failure`,
        cleanupVerified: false,
      });
    }
    return buildBatchAggregate({
      batchRoot,
      suites,
      observed,
      stoppedAfter: failedSuiteId,
      diagnosticOnly,
      trustedFullExecution,
      platform,
      admissionContext,
      cohortId,
    });
  }

  for (let index = 0; index < suites.length; index++) {
    const suite = suites[index];
    let context;
    try {
      context = createContext({ batchRoot, suite, index, total: suites.length });
    } catch (error) {
      const normalizedPlatform = platformKey(platform);
      const reason = `suite context creation failed: ${error instanceof Error ? error.message : String(error)}`;
      observed.push({
        id: suite.id,
        rerunId: `${normalizedPlatform === 'win32' ? 'windows' : 'linux'}:${suite.id}`,
        cohortId: cohortId ?? null,
        platform: normalizedPlatform,
        args: suite.args,
        suiteRoot: null,
        reportsRoot: null,
        startedAt: null,
        finishedAt: new Date().toISOString(),
        exitCode: null,
        signal: null,
        classification: 'containmentBreach',
        finalOutcome: 'infrastructureFailure',
        reason,
        cleanupVerified: false,
      });
      for (const remaining of suites.slice(index + 1)) {
        observed.push({
          id: remaining.id,
          rerunId: `${normalizedPlatform === 'win32' ? 'windows' : 'linux'}:${remaining.id}`,
          cohortId: cohortId ?? null,
          platform: normalizedPlatform,
          args: remaining.args,
          suiteRoot: null,
          reportsRoot: null,
          startedAt: null,
          finishedAt: new Date().toISOString(),
          exitCode: null,
          signal: null,
          classification: 'blocked',
          finalOutcome: 'blocked',
          reason: `blocked because ${suite.id} had a suite context creation failure`,
          cleanupVerified: false,
        });
      }
      stoppedAfter = suite.id;
      break;
    }
    const timeoutMs = Number(process.env.LA_E2E_CLI_SUITE_TIMEOUT_MS) || DEFAULT_SUITE_TIMEOUT_MS;
    const startedAt = new Date().toISOString();
    let runResult = { exitCode: null, signal: null, output: '', error: undefined };
    try {
      const env = buildSuiteEnvironment(baseEnv, context, await getSuiteScopedCredentialEnv(baseEnv, suite, timeoutMs));
      prepareSuiteExtensionsDirectory({ seedDir, targetDir: context.extensionsDir, expectedManifest: preparedExtensionsManifest });
      runResult = await runSuite({
        suite,
        context,
        env,
        timeoutMs,
      });
    } catch (error) {
      runResult = {
        exitCode: null,
        signal: null,
        output: error instanceof Error ? error.message : String(error),
        error,
      };
    }
    try {
      verifySuiteRootContainment(context);
      runResult.terminalResult = readJsonIfExists(context.terminalResultPath);
      runResult.cleanupLedger = readJsonIfExists(context.cleanupLedgerPath);
    } catch (error) {
      runResult = {
        ...runResult,
        output: [runResult.output, error instanceof Error ? error.message : String(error)].filter(Boolean).join('\n'),
        error,
      };
    }
    let classification = classifySuiteRunResult(runResult);
    fs.writeFileSync(context.logPath, runResult.output ?? '');
    try {
      const { _test: resultSummary } = require('./summarize-e2e-cli-results');
      resultSummary.writeSingleResult({
        label: suite.id,
        log: context.logPath,
        outDir: context.reportsRoot,
        outcome: classification.category === 'success' ? 'success' : 'failure',
      });
      if (classification.category === 'success' && SUPPLEMENTARY_LIFECYCLE_SUITES.has(suite.id)) {
        const { assertFamilyLifecycleTerminal } = require('./family-lifecycle-terminal');
        assertFamilyLifecycleTerminal(
          JSON.parse(fs.readFileSync(path.join(context.reportsRoot, `${suite.id}.json`), 'utf8')),
          JSON.parse(fs.readFileSync(context.terminalResultPath, 'utf8')),
          suite.id
        );
      }
    } catch (error) {
      classification = {
        category: 'containmentBreach',
        outcome: 'infrastructureFailure',
        reason: `suite evidence finalization failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    const finalOutcome = classification.category === 'success' ? 'success' : classification.outcome;
    const normalizedPlatform = platformKey(platform);
    const rerunId = `${normalizedPlatform === 'win32' ? 'windows' : 'linux'}:${suite.id}`;
    const suiteResult = {
      id: suite.id,
      rerunId,
      cohortId: cohortId ?? null,
      platform: normalizedPlatform,
      args: suite.args,
      suiteRoot: context.suiteRoot,
      reportsRoot: context.reportsRoot,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: runResult.exitCode ?? null,
      signal: runResult.signal ?? null,
      classification: classification.category,
      finalOutcome,
      reason: classification.reason,
      cleanupVerified: runResult.cleanupLedger?.verified === true,
      terminalResultPath: context.terminalResultPath,
      cleanupLedgerPath: context.cleanupLedgerPath,
      evidence: {
        result: `${suite.id}.json`,
        junit: `${suite.id}.junit.xml`,
        summary: `${suite.id}.summary.md`,
        terminal: `${suite.id}.terminal-result.json`,
        log: `${suite.id}.log`,
      },
    };
    if (admissionContext) {
      fs.writeFileSync(
        path.join(context.reportsRoot, `admission-context-${suite.id}.json`),
        `${JSON.stringify({ ...admissionContext, suiteId: suite.id, rerunId, cohortId: cohortId ?? null, platform: normalizedPlatform }, null, 2)}\n`
      );
    }
    const publicResultPath = path.join(context.reportsRoot, `${suite.id}.json`);
    if (fs.existsSync(publicResultPath)) {
      const publicResult = JSON.parse(fs.readFileSync(publicResultPath, 'utf8'));
      fs.writeFileSync(
        publicResultPath,
        `${JSON.stringify(
          {
            ...publicResult,
            suiteId: suite.id,
            rerunId,
            cohortId: cohortId ?? null,
            platform: normalizedPlatform,
            classification: classification.category,
            finalOutcome,
          },
          null,
          2
        )}\n`
      );
    }
    fs.writeFileSync(context.resultPath, `${JSON.stringify(suiteResult, null, 2)}\n`);
    observed.push(suiteResult);

    if (classification.category === 'containmentBreach') {
      stoppedAfter = suite.id;
      for (const remaining of suites.slice(index + 1)) {
        observed.push({
          id: remaining.id,
          args: remaining.args,
          suiteRoot: null,
          reportsRoot: null,
          startedAt: null,
          finishedAt: new Date().toISOString(),
          exitCode: null,
          signal: null,
          classification: 'blocked',
          finalOutcome: 'blocked',
          reason: `blocked because ${suite.id} had a cleanup/isolation breach`,
        });
      }
      break;
    }
  }

  return buildBatchAggregate({
    batchRoot,
    suites,
    observed,
    stoppedAfter,
    diagnosticOnly,
    trustedFullExecution,
    platform,
    admissionContext,
    cohortId,
  });
}

async function getSuiteScopedCredentialEnv(baseEnv, suite, requiredRemainingMs = DEFAULT_SUITE_TIMEOUT_MS) {
  if (!suite.requiresAzure) {
    return {};
  }

  const scoped = {};
  for (const key of SUITE_SCOPED_AZURE_ENV_KEYS) {
    if (baseEnv[key] !== undefined) {
      scoped[key] = baseEnv[key];
    }
  }
  if (!scoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN) {
    Object.assign(scoped, await mintAzureAccessTokenForSuite(suite, baseEnv));
  }
  validateAzureAccessTokenFreshness(scoped, suite, Date.now(), requiredRemainingMs + 5 * 60 * 1000);
  return scoped;
}

async function mintAzureAccessTokenForSuite(suite, baseEnv = process.env) {
  const providerPath = baseEnv.LA_E2E_CLI_AZURE_TOKEN_PROVIDER?.trim();
  if (providerPath) {
    const provider = require(providerPath);
    const token = await provider.getAccessTokenForSuite({ suiteId: suite.id, resource: 'https://management.azure.com/.default' });
    if (!token?.accessToken) {
      throw new Error(`[batch] Injected Azure token provider returned no accessToken for suite ${suite.id}.`);
    }
    return {
      LA_E2E_CLI_AZURE_ACCESS_TOKEN: token.accessToken,
      LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON: formatTimestamp(token.expiresOnTimestamp ?? Date.parse(token.expiresOn)),
      LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT: token.mintedAt ?? new Date().toISOString(),
    };
  }

  const tenantId = baseEnv.FC_SERVICE_CONNECTION_TENANT_ID || baseEnv.AzCode_ServiceConnectionDomain;
  const clientId = baseEnv.FC_SERVICE_CONNECTION_CLIENT_ID || baseEnv.AzCode_ServiceConnectionClientID;
  const serviceConnectionId = baseEnv.FC_SERVICE_CONNECTION_ID || baseEnv.AzCode_ServiceConnectionID;
  const systemAccessToken = baseEnv.SYSTEM_ACCESSTOKEN;
  if (!tenantId || !clientId || !serviceConnectionId || !systemAccessToken) {
    throw new Error(
      `[batch] Suite ${suite.id} requires an injected LA_E2E_CLI_AZURE_TOKEN_PROVIDER or FC service connection metadata plus SYSTEM_ACCESSTOKEN; refusing to use ambient Azure CLI profile fallback.`
    );
  }
  const mintedAt = new Date().toISOString();
  const { AzurePipelinesCredential } = require('@azure/identity');
  const credential = new AzurePipelinesCredential(tenantId, clientId, serviceConnectionId, systemAccessToken);
  const token = await credential.getToken('https://management.azure.com/.default');
  if (!token?.token) {
    throw new Error(`[batch] AzurePipelinesCredential returned no access token for suite ${suite.id}.`);
  }
  return {
    LA_E2E_CLI_AZURE_ACCESS_TOKEN: token.token,
    LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON: formatTimestamp(token.expiresOnTimestamp),
    LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT: mintedAt,
  };
}

function formatTimestamp(timestamp) {
  if (!Number.isFinite(Number(timestamp))) {
    return undefined;
  }
  return new Date(Number(timestamp)).toISOString();
}

function validateAzureAccessTokenFreshness(scoped, suite, now = Date.now(), requiredRemainingMs = MIN_AZURE_TOKEN_REMAINING_MS) {
  const expiresOn = parseAzureDate(scoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON);
  const mintedAt = parseAzureDate(scoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT);
  if (!Number.isFinite(expiresOn)) {
    throw new Error(`[batch] Suite ${suite.id} requires LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON for raw token freshness validation.`);
  }
  if (!Number.isFinite(mintedAt)) {
    throw new Error(`[batch] Suite ${suite.id} requires LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT for raw token freshness validation.`);
  }
  if (mintedAt > now + 5 * 60 * 1000) {
    throw new Error(`[batch] Suite ${suite.id} Azure token mintedAt is in the future: ${scoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT}`);
  }
  if (expiresOn - now < requiredRemainingMs) {
    throw new Error(
      `[batch] Suite ${suite.id} Azure token expires too soon for bounded phase+cleanup. expiresOn=${scoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON}`
    );
  }
}

function parseAzureDate(value) {
  if (!value) {
    return Number.NaN;
  }
  const parsed = Date.parse(String(value));
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  const normalized = String(value)
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1');
  return Date.parse(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
}

function buildDirectoryIntegrityManifest(root) {
  const resolvedRoot = path.resolve(root);
  const files = [];
  const stack = [resolvedRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(resolvedRoot, fullPath).replace(/\\/g, '/');
      if (entry.isSymbolicLink()) {
        throw new Error(`[batch] Prepared extensions seed contains symlink: ${relativePath}`);
      }
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
        files.push({ relativePath, bytes: fs.statSync(fullPath).size, sha256: hash });
      } else {
        throw new Error(`[batch] Prepared extensions seed contains unsupported entry: ${relativePath}`);
      }
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { schemaVersion: 1, root: resolvedRoot, files };
}

function verifySuiteRootContainment(context) {
  const suiteRoot = path.resolve(context.suiteRoot);
  const realSuiteRoot = fs.realpathSync.native(suiteRoot);
  for (const directory of [
    context.tempRoot,
    context.runtimeRoot,
    context.userDataParent,
    context.workspaceRoot,
    context.reportsRoot,
    context.lifecycleRoot,
  ]) {
    const resolved = path.resolve(directory);
    const relative = path.relative(suiteRoot, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`[batch] cleanup/isolation breach: suite directory escaped suite root: ${resolved}`);
    }
    const realResolved = fs.realpathSync.native(resolved);
    const realRelative = path.relative(realSuiteRoot, realResolved);
    if (!realRelative || realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
      throw new Error(`[batch] cleanup/isolation breach: suite directory realpath escaped suite root: ${realResolved}`);
    }
  }
}

function cleanupSuiteTransientRoots(context) {
  const transientRoots = [
    context.tempRoot,
    context.runtimeRoot,
    context.userDataParent,
    context.workspaceRoot,
    context.extensionsDir,
    context.lifecycleRoot,
  ];
  for (const root of transientRoots) {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    if (fs.existsSync(root)) {
      throw new Error(`[batch] cleanup/isolation breach: suite transient root still exists after cleanup: ${root}`);
    }
  }
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

module.exports = {
  BATCH_SCHEMA_VERSION,
  CONTAINMENT_BREACH_PATTERNS,
  SUITE_ALIASES,
  SUITE_REGISTRY,
  buildBatchAggregate,
  cleanupSuiteTransientRoots,
  buildSuiteEnvironment,
  classifySuiteRunResult,
  createBatchRoot,
  createSuiteContext,
  normalizeSuiteSelection,
  prepareSuiteExtensionsDirectory,
  runBatchSuites,
  buildDirectoryIntegrityManifest,
  getSuiteScopedCredentialEnv,
  mintAzureAccessTokenForSuite,
  parseAzureDate,
  validateAzureAccessTokenFreshness,
};
