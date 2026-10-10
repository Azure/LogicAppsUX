/* global Buffer, __dirname, console, process, require, structuredClone */
const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const { createRequire } = require('module');
const os = require('os');
const path = require('path');
const { SUITE_ALIASES, SUITE_REGISTRY } = require('./e2e-cli-batch');
const { OGF_E2E_SCENARIOS, getOgfScenariosForPhase } = require('./ogf-e2e-registry');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

testAzureToolsWrapperContract();
testE2eDependencyInstallRetryContract();
testPnpmStoreCacheContract();
testConsumerNodeProvisioningContract();
testCohortTemplateContract();
testPackageLocalLintStagedRoutingContract();
testRootNpmrcSourceGuardAllowsGeneratedRuntimeFile();
testLocalAzureToolsWrapperContractIfAvailable();
testConsumerAdmissionContract();
testSelectorResolutionScriptBehavior();
testCanonicalSuiteParityContract();
testSupplementaryFamilyRoutingContract();
testFullRollupGateScriptRejectsNonExecutedResults();
testAzureCliIdentityScriptBehavior();
testPipelineSafetyGuards();
testDiagnosticsStagingScriptHandlesDirectSuiteLayout();
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({ msn: true });
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({
  msn: true,
  terminalOverride: { complete: false },
  expectedPrivateFailure: 'Published MSN lifecycle evidence failed required terminal validation',
});
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({
  msn: true,
  omitTerminal: true,
  expectedPrivateFailure: 'Published MSN lifecycle evidence failed required terminal validation',
});
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({ privatePlatform: 'linux' });
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({ privatePlatform: 'win32' });
for (const privatePlatform of ['linux', 'win32']) {
  for (const omitCancelMetadata of ['invocation.json', 'wizard-handoff.json']) {
    testDiagnosticsStagingScriptHandlesDirectSuiteLayout({
      privatePlatform,
      omitCancelMetadata,
      expectedPrivateFailure: 'Required suite diagnostics were missing',
    });
  }
}
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({
  privatePlatform: 'linux',
  admittedPlatform: 'windows',
  expectedPrivateFailure: 'execution-provenance-mismatch',
});
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({
  privatePlatform: 'win32',
  admissionVersion: '1.139.0',
  expectedPrivateFailure: 'execution-provenance-mismatch',
});
testDiagnosticsStagingScriptHandlesDirectSuiteLayout({
  privatePlatform: 'linux',
  terminalOverride: { exitCode: 1 },
  expectedPrivateFailure: 'incomplete-or-unclean-execution',
});
testPrivateTraceabilityConfigurationContract();
testDiagnosticsStagingScriptPreservesEvidenceBeforeFailing();

console.log('[pipeline-contract.unit] all tests passed');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function testCohortTemplateContract() {
  const cohort = parseYaml('.config/templates/vscode-e2e-cli-run-cohort.yml');
  assert.strictEqual(cohort.jobs.length, 1);
  const job = cohort.jobs[0];
  assert.strictEqual(job.condition, "and(not(failed()), not(canceled()), eq(variables['SelectedCohort'], 'true'))");
  assert.strictEqual(job.templateContext.outputs.length, 1);
  assert.strictEqual(job.templateContext.outputs[0].artifactName, 'vscode-e2e-cli-diagnostics-${{ parameters.artifactName }}');
  assert.strictEqual(job.steps.filter((step) => step.task === 'UseNode@1').length, 1, 'cohort must provision trusted Node exactly once');
  const setup = job.steps.find((step) => step.template === '/.azure-pipelines/templates/vscode-e2e-cli-setup.yml@self');
  assert.strictEqual(setup.parameters.provisionNode, false);
  assert.strictEqual(setup.parameters.telemetryFile, '$(TimingFile)');
  const text = read('.config/templates/vscode-e2e-cli-run-cohort.yml');
  assert.match(text, /Prepare VS Code extension dependencies once/);
  assert.match(text, /Stage and validate stable cohort evidence/);
  assert.match(text, /run-e2e-cli\.js --suites "\$\(CohortSuites\)"/);
  assert.match(text, /LA_E2E_CLI_BATCH_COHORT_ID/);
  assert.match(text, /LA_E2E_CLI_BATCH_RESULTS_DIR: \$\(BatchResultsRoot\)/);
  assert.match(text, /BatchRoot: \$\(Agent\.TempDirectory\)\/b/);
  assert.doesNotMatch(text, /BatchRoot: \$\(Agent\.TempDirectory\)\/vscode-e2e-cli-batch-/);
  const containmentHost = read('apps/vs-code-designer/scripts/e2e-cli-containment-host.cs');
  assert.match(containmentHost, /CONTAINMENT_DRAIN_ATTEMPTS = 100/);
  assert.match(containmentHost, /CONTAINMENT_DRAIN_DELAY_MS = 100/);
  const linuxContainmentHost = read('apps/vs-code-designer/scripts/e2e-cli-containment-host.c');
  assert.match(linuxContainmentHost, /CONTAINMENT_DRAIN_ATTEMPTS = 100/);
  assert.match(linuxContainmentHost, /CONTAINMENT_DRAIN_DELAY_MS = 100/);
  assert.match(text, /\$aggregate = Join-Path '\$\(BatchResultsRoot\)' 'e2e-cli-batch-result\.json'/);
  assert.match(text, /stage-e2e-cli-cohort\.js/);
  assert.match(text, /pipeline-timing\.js summary/);
  assert.doesNotMatch(text, /Cache@2[\s\S]*(node_modules|\.npmrc|credentials|profiles|workspaces)/);
}

function testPackageLocalLintStagedRoutingContract() {
  const rootPackage = JSON.parse(read('package.json'));
  const extensionPackage = JSON.parse(read('apps/vs-code-designer/package.json'));
  const rootConfig = rootPackage['lint-staged'];
  const localConfig = extensionPackage['lint-staged'];
  assert.deepStrictEqual(Object.keys(localConfig), Object.keys(rootConfig));
  const micromatch = createRequire(require.resolve('lint-staged'))('micromatch');
  const files = [
    'source.js',
    'source.ts',
    'component.tsx',
    'nested/source.js',
    'nested/source.d.ts',
    'source.d.ts',
    'source.d.test.ts',
    'package.json',
    'configuration.yml',
  ];
  const route = (config) =>
    Object.entries(config).flatMap(([pattern, commands]) =>
      micromatch(files, pattern, { matchBase: !pattern.includes('/'), dot: true }).map((file) => ({
        file,
        lintAndFormat: commands.slice(1),
      }))
    );
  assert.deepStrictEqual(route(localConfig), route(rootConfig));
  for (const pattern of Object.keys(rootConfig)) {
    assert.deepStrictEqual(localConfig[pattern].slice(1), rootConfig[pattern].slice(1));
    assert.strictEqual(rootConfig[pattern][0], 'npm run extract');
    assert.strictEqual(localConfig[pattern][0], 'npm --prefix ../.. run extract -- --ignore "**/*.d.ts"');
  }
  assert.strictEqual(path.resolve(repoRoot, 'apps', 'vs-code-designer', '..', '..'), repoRoot);
  assert.ok(rootPackage.scripts.extract.startsWith('formatjs extract '));
  const sourcePattern = '*.{js,ts,tsx}';
  assert.deepStrictEqual(micromatch(files, sourcePattern, { matchBase: true }), files.slice(0, 7));
  assert.deepStrictEqual(micromatch(files, '**/*.d.ts'), ['nested/source.d.ts', 'source.d.ts']);
  assert.deepStrictEqual(localConfig[sourcePattern].slice(1), ['eslint --cache --fix', 'biome check --write']);
}

function testFullRollupGateScriptRejectsNonExecutedResults() {
  const consumer = parseYaml('.config/vscode-e2e-cli.1es.yml');
  const runSuite = parseYaml('.config/templates/vscode-e2e-cli-run-suite.yml');
  const script = extractFullRollupGateScript(consumer);
  const admittedContext = runAdmissionContextScriptFixture(runSuite);
  assert.strictEqual(admittedContext.artifactVersion, undefined);
  assert.strictEqual(admittedContext.producerBuildNumber, '20260929.5');

  const valid = runFullRollupGateFixture(script, { scenario: 'valid', baseContext: admittedContext });
  assert.strictEqual(valid.status, 0, valid.output);

  const crlfLog = runFullRollupGateFixture(script, {
    scenario: 'crlf-log',
    baseContext: admittedContext,
    logTransform: (value) => value.replaceAll('\n', '\r\n'),
  });
  assert.strictEqual(crlfLog.status, 0, crlfLog.output);

  const ansiLog = runFullRollupGateFixture(script, {
    scenario: 'ansi-log',
    baseContext: admittedContext,
    logTransform: (value) => value.replace(/(^[ \t]*\d+ passing(?: \([^)]+\))?[ \t]*$)/gm, '\u001b[32m$1\u001b[0m'),
  });
  assert.strictEqual(ansiLog.status, 0, ansiLog.output);

  const allPending = runFullRollupGateFixture(script, {
    scenario: 'all-pending',
    baseContext: admittedContext,
    resultOverride: { total: 12, passing: 0, failing: 0, pending: 12 },
  });
  assert.notStrictEqual(allPending.status, 0);
  assert.match(allPending.output, /Suite result is not a successful executed test run/);

  const mixedUnexpectedSkip = runFullRollupGateFixture(script, {
    scenario: 'mixed-unexpected-skip',
    baseContext: admittedContext,
    resultOverride: { total: 12, passing: 11, failing: 0, pending: 1 },
  });
  assert.notStrictEqual(mixedUnexpectedSkip.status, 0);
  assert.match(mixedUnexpectedSkip.output, /Suite result is not a successful executed test run/);

  const syntheticFooterOnly = runFullRollupGateFixture(script, {
    scenario: 'synthetic-footer-only',
    baseContext: admittedContext,
    logOverride: { job: 'linux_create_workspace_core_matrix', text: '\n  6 passing (1s)\n' },
  });
  assert.notStrictEqual(syntheticFooterOnly.status, 0);
  assert.match(syntheticFooterOnly.output, /Suite log does not contain enough positive real Mocha execution evidence/);

  const zeroRealCompletions = runFullRollupGateFixture(script, {
    scenario: 'zero-real-completions',
    baseContext: admittedContext,
    logOverride: {
      job: 'linux_create_workspace_core_matrix',
      text: `${Array.from({ length: 6 }, () => '  0 passing (1s)').join('\n')}\n  6 passing (1s)\n`,
    },
  });
  assert.notStrictEqual(zeroRealCompletions.status, 0);
  assert.match(zeroRealCompletions.output, /Suite log does not contain enough positive real Mocha execution evidence/);

  const missingArtifact = runFullRollupGateFixture(script, {
    scenario: 'missing-artifact',
    baseContext: admittedContext,
    omit: { job: 'linux_unit_tests', file: 'unitTests.summary.md' },
  });
  assert.notStrictEqual(missingArtifact.status, 0);
  assert.match(missingArtifact.output, /Missing required full-rollup artifact/);

  const identityMismatch = runFullRollupGateFixture(script, {
    scenario: 'identity-mismatch',
    baseContext: admittedContext,
    contextOverride: { job: 'windows_unit_tests', field: 'artifactSHA256', value: 'different-sha' },
  });
  assert.notStrictEqual(identityMismatch.status, 0);
  assert.match(identityMismatch.output, /Suite admitted identity mismatch/);

  const missingProducerBuildNumber = runFullRollupGateFixture(script, {
    scenario: 'missing-producer-build-number',
    baseContext: admittedContext,
    contextOverride: { job: 'linux_unit_tests', field: 'producerBuildNumber', value: '' },
  });
  assert.notStrictEqual(missingProducerBuildNumber.status, 0);
  assert.match(missingProducerBuildNumber.output, /Suite admitted identity is missing 'producerBuildNumber'/);
}

function runFullRollupGateFixture(script, options = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `pipeline-contract-fullgate-${options.scenario ?? 'case'}-`));
  try {
    const pipelineWorkspace = path.join(tempRoot, 'workspace');
    fs.mkdirSync(pipelineWorkspace, { recursive: true });
    const suites = [
      {
        job: 'linux_unit_tests',
        variable: 'linuxUnitTestsResult',
        artifact: 'vscode-e2e-cli-diagnostics-linux-unit-tests',
        suite: 'unitTests',
      },
      {
        job: 'linux_create_workspace_behavior',
        variable: 'linuxCreateWorkspaceBehaviorResult',
        artifact: 'vscode-e2e-cli-diagnostics-linux-create-workspace-behavior',
        suite: 'createWorkspaceBehavior',
      },
      {
        job: 'linux_create_workspace_core_matrix',
        variable: 'linuxCreateWorkspaceCoreMatrixResult',
        artifact: 'vscode-e2e-cli-diagnostics-linux-create-workspace-core-matrix',
        suite: 'createWorkspaceCoreMatrix',
      },
      {
        job: 'linux_create_workspace_preview_matrix',
        variable: 'linuxCreateWorkspacePreviewMatrixResult',
        artifact: 'vscode-e2e-cli-diagnostics-linux-create-workspace-preview-matrix',
        suite: 'createWorkspacePreviewMatrix',
      },
      {
        job: 'linux_create_workspace_codeful',
        variable: 'linuxCreateWorkspaceCodefulResult',
        artifact: 'vscode-e2e-cli-diagnostics-linux-create-workspace-codeful',
        suite: 'createWorkspaceCodeful',
      },
      {
        job: 'linux_msn_weather_lifecycle',
        variable: 'linuxMsnWeatherLifecycleResult',
        artifact: 'vscode-e2e-cli-diagnostics-linux-msn-weather-lifecycle',
        suite: 'msnWeatherLifecycle',
      },
      {
        job: 'windows_unit_tests',
        variable: 'windowsUnitTestsResult',
        artifact: 'vscode-e2e-cli-diagnostics-windows-unit-tests',
        suite: 'unitTests',
      },
      {
        job: 'windows_create_workspace_behavior',
        variable: 'windowsCreateWorkspaceBehaviorResult',
        artifact: 'vscode-e2e-cli-diagnostics-windows-create-workspace-behavior',
        suite: 'createWorkspaceBehavior',
      },
      {
        job: 'windows_create_workspace_core_matrix',
        variable: 'windowsCreateWorkspaceCoreMatrixResult',
        artifact: 'vscode-e2e-cli-diagnostics-windows-create-workspace-core-matrix',
        suite: 'createWorkspaceCoreMatrix',
      },
      {
        job: 'windows_create_workspace_preview_matrix',
        variable: 'windowsCreateWorkspacePreviewMatrixResult',
        artifact: 'vscode-e2e-cli-diagnostics-windows-create-workspace-preview-matrix',
        suite: 'createWorkspacePreviewMatrix',
      },
      {
        job: 'windows_create_workspace_codeful',
        variable: 'windowsCreateWorkspaceCodefulResult',
        artifact: 'vscode-e2e-cli-diagnostics-windows-create-workspace-codeful',
        suite: 'createWorkspaceCodeful',
      },
      {
        job: 'windows_msn_weather_lifecycle',
        variable: 'windowsMsnWeatherLifecycleResult',
        artifact: 'vscode-e2e-cli-diagnostics-windows-msn-weather-lifecycle',
        suite: 'msnWeatherLifecycle',
      },
    ];
    const baseContext =
      options.baseContext ?? runAdmissionContextScriptFixture(parseYaml('.config/templates/vscode-e2e-cli-run-suite.yml'));

    for (const suite of suites) {
      const root = path.join(pipelineWorkspace, suite.artifact);
      const resultRoot = path.join(root, 'results');
      const logRoot = path.join(root, 'log');
      fs.mkdirSync(resultRoot, { recursive: true });
      fs.mkdirSync(logRoot, { recursive: true });
      const result = { outcome: 'success', total: 12, passing: 12, failing: 0, pending: 0, ...(options.resultOverride ?? {}) };
      const context = { ...baseContext };
      if (options.contextOverride?.job === suite.job) {
        context[options.contextOverride.field] = options.contextOverride.value;
      }
      const files = new Map([
        [`${suite.suite}.json`, `${JSON.stringify(result)}\n`],
        [`${suite.suite}.junit.xml`, '<testsuite tests="12" failures="0" skipped="0" />\n'],
        [`${suite.suite}.summary.md`, '# summary\n'],
        [`admission-context-${suite.suite}.json`, `${JSON.stringify(context)}\n`],
      ]);
      for (const [file, content] of files) {
        if (options.omit?.job === suite.job && options.omit.file === file) {
          continue;
        }
        fs.writeFileSync(path.join(resultRoot, file), content);
      }
      const logText =
        options.logOverride?.job === suite.job
          ? options.logOverride.text
          : buildRealMochaEvidenceLog({
              suiteId: suite.suite,
              phaseCount: SUITE_REGISTRY[suite.suite].expectedPhases.length,
            });
      fs.writeFileSync(path.join(logRoot, `${suite.suite}.log`), options.logTransform ? options.logTransform(logText) : logText);
    }

    let preparedScript = script.replaceAll('$(Pipeline.Workspace)', pipelineWorkspace);
    for (const suite of suites) {
      preparedScript = preparedScript.replaceAll(`$(${suite.variable})`, 'Succeeded');
    }

    function buildRealMochaEvidenceLog({ suiteId, phaseCount }) {
      const lines = [];
      for (let index = 0; index < phaseCount; index += 1) {
        lines.push(`phase ${index + 1} ${suiteId}`);
        lines.push('  12 passing (1s)');
      }
      if (['createWorkspaceCoreMatrix', 'createWorkspacePreviewMatrix', 'createWorkspaceCodeful'].includes(suiteId)) {
        lines.push(`  ${phaseCount} passing (1s)`);
      }
      return `${lines.join('\n')}\n`;
    }
    return runPowerShellScript(preparedScript);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runAdmissionContextScriptFixture(runSuite) {
  const script = extractRunSuiteStepScript(runSuite, 'Write admitted E2E artifact identity context');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-contract-admission-context-'));
  try {
    const sourcesDirectory = path.join(tempRoot, 'sources');
    const pipelineWorkspace = path.join(tempRoot, 'workspace');
    const artifactRoot = path.join(pipelineWorkspace, 'vscode-e2e-build');
    fs.mkdirSync(artifactRoot, { recursive: true });
    const manifest = {
      producer: {
        definitionId: '28771',
        runId: '15497809',
        buildNumber: '20260929.5',
        actualArtifactBuildSha: '2516c93c9892ca3b76869d1292a12c0ce8f0d971',
        checkoutRef: '2516c93c9892ca3b76869d1292a12c0ce8f0d971',
        repositoryName: 'Azure/LogicAppsUX',
        repositoryUri: 'https://github.com/Azure/LogicAppsUX',
      },
      artifact: {
        name: 'vscode-e2e-build',
        version: '',
        sha256: 'same-sha',
      },
    };
    fs.writeFileSync(path.join(artifactRoot, 'vscode-e2e-build-manifest.json'), JSON.stringify(manifest));
    const preparedScript = script
      .replaceAll('$(Build.SourcesDirectory)', sourcesDirectory)
      .replaceAll('$(Pipeline.Workspace)', pipelineWorkspace)
      .replaceAll('${{ parameters.e2eBuildArtifactName }}', 'vscode-e2e-build')
      .replaceAll('${{ parameters.suiteId }}', 'unitTests')
      .replaceAll('$(ResolvedVSCodeVersion)', '1.139.1');
    const result = runPowerShellScript(preparedScript);
    assert.strictEqual(result.status, 0, result.output);
    return JSON.parse(
      fs.readFileSync(
        path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'results', 'admission-context-unitTests.json'),
        'utf8'
      )
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function extractRunSuiteStepScript(runSuite, displayName) {
  const step = findObjectByDisplayName(runSuite, displayName);
  assert.ok(step?.pwsh, `run-suite template step must have an executable PowerShell script: ${displayName}`);
  return step.pwsh;
}

function findObjectByDisplayName(value, displayName) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findObjectByDisplayName(entry, displayName);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (value.displayName === displayName) {
    return value;
  }
  for (const entry of Object.values(value)) {
    const found = findObjectByDisplayName(entry, displayName);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findObjects(value, predicate) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => findObjects(entry, predicate));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return [...(predicate(value) ? [value] : []), ...Object.values(value).flatMap((entry) => findObjects(entry, predicate))];
}

function extractFullRollupGateScript(consumer) {
  const fullGateJob = getConsumerDirectJob(consumer, 'verify_both_os_full_rollup');
  const step = fullGateJob.steps.find((entry) => entry.displayName === 'Enforce twelve-suite both-OS full rollup gate');
  assert.ok(step?.pwsh, 'full rollup gate must have an executable PowerShell script');
  return step.pwsh;
}

function parseYaml(relativePath) {
  const { parse } = require(path.join(repoRoot, 'apps', 'vs-code-designer', 'node_modules', 'yaml'));
  return parse(read(relativePath));
}

function testE2eDependencyInstallRetryContract() {
  const setup = parseYaml('.azure-pipelines/templates/vscode-e2e-cli-setup.yml');
  assert.equal(setup.parameters.find((parameter) => parameter.name === 'pnpmStoreCacheNamespace')?.default, 'vscode-e2e-pnpm-store-v3');
  assert.doesNotMatch(JSON.stringify(setup), /pnpm config set --global fetchTimeout/);
  const installSteps = setup.steps.filter((step) => step.displayName === 'Install dependencies with pnpm');
  assert.strictEqual(installSteps.length, 1, 'E2E setup must have one unambiguous pnpm dependency install step');
  const install = installSteps[0];
  assert.strictEqual(install.script, 'pnpm install --frozen-lockfile --strict-peer-dependencies --recursive');
  assert.strictEqual(install.retryCountOnTaskFailure, 2, 'Transient feed failures get two bounded whole-install retries');
  assert.ok(install.continueOnError === undefined || install.continueOnError === false, 'Install failures must remain fatal');
  assert.strictEqual(install.timeoutInMinutes, undefined, 'The containing job remains the install retry time limit');
  assert.strictEqual(install.env?.NPM_CONFIG_USERCONFIG, '$(npmrcFile)');
  assert.strictEqual(install.env?.PNPM_CONFIG_FETCH_TIMEOUT, '300000');
  assert.strictEqual(
    install.env?.PNPM_CONFIG_PACKAGE_IMPORT_METHOD,
    'clone-or-copy',
    'Pipeline installs must isolate lifecycle-mutated node_modules files from the cached content-addressed store'
  );
  assert.strictEqual(install.env?.PNPM_CONFIG_STORE_DIR, '$(pnpmStorePath)');
  const fetchTimeoutOwners = setup.steps.filter((step) => step.env?.PNPM_CONFIG_FETCH_TIMEOUT !== undefined);
  assert.deepStrictEqual(
    fetchTimeoutOwners.map((step) => step.displayName),
    ['Install dependencies with pnpm'],
    'The process-scoped fetch timeout must apply only to the dependency install'
  );
}

function testPnpmStoreCacheContract() {
  const setup = parseYaml('.azure-pipelines/templates/vscode-e2e-cli-setup.yml');
  const cacheSteps = setup.steps.filter((step) => step.task === 'Cache@2');
  assert.strictEqual(cacheSteps.length, 1, 'E2E setup must restore one pnpm content-addressed store cache');
  const cache = cacheSteps[0];
  assert.strictEqual(cache.displayName, 'Restore pnpm content-addressed store');
  assert.strictEqual(cache.inputs.path, '$(pnpmStorePath)');
  assert.strictEqual(cache.inputs.cacheHitVar, 'pnpmStoreCacheHit');
  assert.strictEqual(cache.continueOnError, true, 'Cache service failures must fall back to authenticated install');
  for (const identity of [
    '$(Agent.OS)',
    '$(Agent.OSArchitecture)',
    '$(pnpmNodeVersion)',
    '$(pnpmVersion)',
    '$(pnpmLockfileVersion)',
    'pnpm-lock.yaml',
  ]) {
    assert.match(cache.inputs.key, new RegExp(identity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(cache.inputs.restoreKeys, /\$\(Agent\.OS\)/);
  assert.match(cache.inputs.restoreKeys, /\$\(Agent\.OSArchitecture\)/);
  assert.match(cache.inputs.restoreKeys, /\$\(pnpmNodeVersion\)/);
  assert.match(cache.inputs.restoreKeys, /\$\(pnpmVersion\)/);
  assert.match(cache.inputs.restoreKeys, /\$\(pnpmLockfileVersion\)/);
  assert.doesNotMatch(cache.inputs.restoreKeys, /pnpm-lock\.yaml/);
  assert.doesNotMatch(JSON.stringify(cache), /node_modules|\.npmrc|credentials|azure|profiles|runtime-dependencies|results/i);

  const identityStep = setup.steps.find((step) => step.displayName === 'Resolve deterministic pnpm store cache identity');
  assert.ok(identityStep?.pwsh);
  assert.match(identityStep.pwsh, /Join-Path '\$\(Pipeline\.Workspace\)' '\.pnpm-store'/);
  assert.match(identityStep.pwsh, /lockfileVersion/);
  assert.match(identityStep.pwsh, /packageManager/);

  const restoreEvidence = setup.steps.find((step) => step.displayName === 'Record pnpm store cache restore evidence');
  assert.match(restoreEvidence.pwsh, /'exact'/);
  assert.match(restoreEvidence.pwsh, /'inexact'/);
  assert.match(restoreEvidence.pwsh, /'miss'/);

  const integrity = setup.steps.find((step) => step.displayName === 'Validate cached pnpm store integrity');
  assert.match(integrity.pwsh, /pnpm-store-integrity\.js verify/);
  assert.match(integrity.pwsh, /cacheState -eq 'miss'/);
  assert.match(integrity.pwsh, /corrupt-store-cleared/);
  assert.match(integrity.pwsh, /authenticated network restore/);

  const finalEvidence = setup.steps.find((step) => step.displayName === 'Verify installed dependency store evidence');
  assert.match(finalEvidence.pwsh, /pnpm store path/);
  assert.match(finalEvidence.pwsh, /expectedResolvedStore/);
  assert.match(finalEvidence.pwsh, /"v\$pnpmMajor"/);
  assert.match(finalEvidence.pwsh, /pnpm-store-integrity\.js prune/);
  assert.match(finalEvidence.pwsh, /pnpm-store-integrity\.js write/);
  assert.match(finalEvidence.pwsh, /pnpm-store-integrity\.js verify/);
  assert.match(finalEvidence.pwsh, /pnpmStoreCacheState/);
  assert.match(finalEvidence.pwsh, /pnpmStoreFallback/);
}

function testConsumerNodeProvisioningContract() {
  const setup = parseYaml('.azure-pipelines/templates/vscode-e2e-cli-setup.yml');
  const runSuites = parseYaml('.config/templates/vscode-e2e-cli-run-suite.yml');
  const setupNodeTasks = findObjects(setup.steps, (entry) => entry.task === 'UseNode@1');
  assert.strictEqual(setupNodeTasks.length, 1, 'The shared setup template keeps one optional Node provisioning task');
  assert.ok(
    setup.parameters.some((parameter) => parameter.name === 'provisionNode' && parameter.default === true),
    'Shared setup provisions Node by default for build and standalone setup consumers'
  );

  const runSuiteNodeTasks = findObjects(runSuites.jobs, (entry) => entry.task === 'UseNode@1');
  assert.strictEqual(runSuiteNodeTasks.length, 1, 'Each suite consumer job must provision trusted Node exactly once');
  assert.strictEqual(runSuiteNodeTasks[0].displayName, 'Use trusted Node.js for E2E artifact admission');

  const setupInvocation = findObjects(
    runSuites.jobs,
    (entry) => entry.template === '/.azure-pipelines/templates/vscode-e2e-cli-setup.yml@self'
  );
  assert.strictEqual(setupInvocation.length, 1);
  assert.strictEqual(setupInvocation[0].parameters.provisionNode, false);
  assertRunSuitesProvisionsTrustedNodeBeforeVerifier(runSuites);
}

function testAzureToolsWrapperContract() {
  const buildEntry = read('.config/1esmain.yml');
  const registeredBuildEntry = read('.azure-pipelines/1esmain.yml');
  const releaseEntry = read('.config/release.yml');
  const readme = read('.config/README.md');
  const rootPackage = JSON.parse(read('package.json'));
  const workspace = read('pnpm-workspace.yaml');
  const gitignore = read('.gitignore');
  const nvmrc = read('.nvmrc').trim();
  const pipelineScript = read('scripts/vscode-ado-pipeline-script.js');
  const prepareScript = read('scripts/prepare-vscode-ado-build.js');
  const stageScript = read('scripts/stage-vscode-e2e-build-artifact.js');

  assertRootNpmrcIsNotTrackedSource();
  assert.match(gitignore, /^\/\.npmrc$/m);
  assert.strictEqual(nvmrc, '22.13.0');
  assert.strictEqual(rootPackage.packageManager, 'pnpm@11.3.0');
  assert.strictEqual(rootPackage.engines.node, '>=22.13.0');
  assert.strictEqual(rootPackage.engines.pnpm, '>=11.3.0');
  assert.strictEqual(rootPackage.scripts.lint, 'node scripts/vscode-ado-pipeline-script.js lint');
  assert.strictEqual(rootPackage.scripts.build, 'node scripts/vscode-ado-pipeline-script.js build');
  assert.strictEqual(rootPackage.scripts.package, 'node scripts/vscode-ado-pipeline-script.js package');
  assert.strictEqual(rootPackage.scripts.test, 'node scripts/vscode-ado-pipeline-script.js test');
  assert.strictEqual(rootPackage.scripts['build:all'], 'turbo run build');
  assert.ok(!rootPackage.pnpm, 'pnpm overrides must live in pnpm-workspace.yaml for pnpm 11');
  assert.match(workspace, /^autoInstallPeers: true$/m);
  assert.match(workspace, /^resolutionMode: highest$/m);
  assert.match(workspace, /^ignoreWorkspaceRootCheck: true$/m);
  assert.match(workspace, /^strictPeerDependencies: true$/m);
  assert.match(workspace, /^onlyBuiltDependencies:$/m);
  assert.match(workspace, /^allowBuilds:$/m);
  assert.match(workspace, /^\s+'@biomejs\/biome': true$/m);
  assert.match(workspace, /^\s+esbuild: true$/m);
  assert.match(workspace, /^\s+keytar: true$/m);
  assert.doesNotMatch(workspace, /set this to true or false/);
  assert.match(workspace, /overrides:/);
  assert.match(workspace, /'@azure\/core-client': 1\.10\.0/);

  assert.notStrictEqual(registeredBuildEntry, buildEntry, 'canonical producer entry must remain unchanged during the temporary trial');

  assert.match(buildEntry, /template: azdo-pipelines\/1es-mb-main\.yml@azExtTemplates/);
  assert.match(buildEntry, /ref: azext-pt\/v1/);
  assert.match(buildEntry, /packageManager: pnpm/);
  assert.match(buildEntry, /feedBaseUrl: \$\{\{ variables\.feedBaseUrl \}\}/);
  assert.match(buildEntry, /additionalSetupSteps:/);
  assert.match(buildEntry, /LA_VSCODE_ADO_PIPELINE\]true/);
  assert.match(buildEntry, /LA_VSCODE_ADO_PIPELINE: 'true'/);
  assert.doesNotMatch(buildEntry, /LA_VSCODE_ADO_PIPELINE: true/);
  assert.doesNotMatch(buildEntry, /variable=NODE_OPTIONS\]--max-old-space-size=6144/);
  assert.match(buildEntry, /variable=NPM_CONFIG_USERCONFIG/);
  assert.match(buildEntry, /\$npmrcFile = '\$\(npmrcFile\)'/);
  assert.match(buildEntry, /IsPathRooted\(\$npmrcFile\)/);
  assert.match(buildEntry, /Join-Path '\$\(Build\.SourcesDirectory\)' \$npmrcFile/);
  assert.match(buildEntry, /Resolved npmrcFile does not exist/);
  assert.match(buildEntry, /node scripts\/prepare-vscode-ado-build\.js/);
  assert.doesNotMatch(buildEntry, /azureToolsTemplatesRef/);
  assert.doesNotMatch(buildEntry, /packageManagerInstallArgs/);
  assert.doesNotMatch(buildEntry, /preSetupSteps/);
  assert.doesNotMatch(buildEntry, /lintSteps/);
  assert.doesNotMatch(buildEntry, /buildSteps/);
  assert.doesNotMatch(buildEntry, /packageSteps/);
  assert.doesNotMatch(buildEntry, /testSteps/);
  assert.doesNotMatch(buildEntry, /additionalStages/);
  assert.doesNotMatch(buildEntry, /git checkout/);
  assert.doesNotMatch(buildEntry, /publishVersion/);
  assert.doesNotMatch(buildEntry, /prepare-v2-release-signed-files/);
  assert.doesNotMatch(buildEntry, /SignExtension\.signproj/);
  assert.match(registeredBuildEntry, /template: azdo-pipelines\/1es-mb-main\.yml@azExtTemplates/);
  assert.match(registeredBuildEntry, /ref: azext-pt\/v1/);
  assert.match(registeredBuildEntry, /packageManager: pnpm/);
  assert.match(registeredBuildEntry, /variable=NODE_OPTIONS\]--max-old-space-size=6144/);
  assert.doesNotMatch(registeredBuildEntry, /MicroBuild\.1ES\.Official/);
  assert.doesNotMatch(registeredBuildEntry, /publishVersion/);
  assert.doesNotMatch(registeredBuildEntry, /enableVscodeE2E/);

  assert.match(releaseEntry, /ref: azext-pt\/v1/);
  assert.match(releaseEntry, /template: azdo-pipelines\/1es-mb-release-extension\.yml@azExtTemplates/);
  assert.match(releaseEntry, /dryRun: true/);
  assert.match(releaseEntry, /artifactName: Build Root/);
  assert.match(releaseEntry, /releaseApprovalEnvironment: \$\{\{ parameters\.releaseApprovalEnvironment \}\}/);
  assert.match(releaseEntry, /values:\s*\n\s*- VSCodeDeployLAUX/);
  assert.doesNotMatch(releaseEntry, /azureToolsTemplatesRef/);
  assert.doesNotMatch(releaseEntry, /pipelineID:/);
  assert.doesNotMatch(releaseEntry, /runID:/);
  assert.doesNotMatch(releaseEntry, /prePublishSteps/);

  assert.match(pipelineScript, /LA_VSCODE_ADO_PIPELINE === 'true'/);
  assert.match(pipelineScript, /const forwardedArgs = process\.argv\.slice\(3\)/);
  assert.match(pipelineScript, /pnpm.*run.*build:extension/s);
  assert.match(pipelineScript, /build:extension', \.\.\.forwardedArgs/);
  assert.match(pipelineScript, /test:e2e-cli:compile/);
  assert.match(pipelineScript, /pnpm.*exec.*turbo.*run.*build/s);
  assert.match(pipelineScript, /'build', \.\.\.forwardedArgs/);
  assert.match(pipelineScript, /test:e2e-cli:unit/);
  assert.match(pipelineScript, /'run', 'test:extension-unit', \.\.\.forwardedArgs/);
  assert.doesNotMatch(pipelineScript, /'--dir', 'apps\/vs-code-designer', 'run', 'test:extension-unit'/);
  assert.match(pipelineScript, /stage-vscode-e2e-build-artifact\.js/);
  assert.match(pipelineScript, /resolvePackageManagerInvocation/);
  assert.match(pipelineScript, /npm_execpath/);
  assert.doesNotMatch(pipelineScript, /__pnpm-version/);
  assert.match(prepareScript, /LA_VSCODE_ADO_PIPELINE !== 'true'/);
  assert.match(prepareScript, /AI_KEY must be set/);
  assert.ok(prepareScript.includes('/^\\$\\([^)]+\\)$/'));
  assert.match(prepareScript, /setInGitHubBuild/);
  assert.match(stageScript, /LA_VSCODE_ADO_PIPELINE !== 'true'/);
  assert.match(stageScript, /BUILD_ARTIFACTSTAGINGDIRECTORY/);
  assert.match(stageScript, /build', 'Root', 'vscode-e2e'/);
  assert.match(stageScript, /--artifact-name',\s*'vscode-e2e-build'/);
  assert.match(stageScript, /BUILD_SOURCEVERSION/);
  assert.match(stageScript, /createWorkspace\.test\.js/);
  assert.match(stageScript, /createReadStream/);
  assert.doesNotMatch(stageScript, /readFileSync\(artifactPath\)/);

  assert.match(readme, /azext-pt\/v1/);
  assert.match(readme, /Resource Groups #1447, Docker #334\/#364\/#365/);
  assert.match(readme, /MicroBuild\.1ES\.Unofficial\.yml@1esPipelines/);
  assert.match(readme, /templateContext\.type: validationJob/);
  assert.match(readme, /ordinary 1ES jobs so their outputs go through normal artifact-publication policy/);
  assert.match(readme, /Unofficial\/no-deployment routing is distinct from artifact security classification/);
  assert.match(readme, /test-only, non-release execution path/);
  assert.match(readme, /does not set an explicit `networkIsolationPolicy` override/);
  assert.match(readme, /unofficial wrapper is not an NI-disabled path/);
  assert.match(readme, /centrally required controls/);
  assert.match(readme, /actual connector connectivity/);
  assert.match(readme, /tracked root `\.npmrc` is intentionally absent/);
  assert.match(readme, /`NPM_CONFIG_USERCONFIG` to the absolute authenticated npmrc path/);
  assert.match(readme, /temporary `\.azure-pipelines\/1esmain\.yml` sets `NODE_OPTIONS=--max-old-space-size=6144`/);
  assert.match(readme, /canonical `\.config\/1esmain\.yml` remains at blob `860aa268644d0da15c3043a543b687dc2878f31f`/);
  assert.match(readme, /restore `\.azure-pipelines\/1esmain\.yml` exactly to blob `025ded92acc13c58bd952fc81bf76ad7ace14807`/);
  assert.match(readme, /Native `pnpm run build` is not a clean type-check signal yet/);
  assert.match(readme, /tsc` exited 2 with 32 errors in unchanged source\/test files outside this migration diff/);
  assert.match(readme, /duplicate `@azure\/core-client` service-client types/);
  assert.match(readme, /pre-cutover baseline blocker/);
  assert.match(readme, /artifact-publication authorization/);
  assert.doesNotMatch(readme, /validationJob upload allowlist/);
  assert.match(readme, /not a network-policy fix or unlimited-egress guarantee/);
  assert.match(readme, /dryRun: true/);
  assert.match(readme, /current `azext-pt\/v1` source notes that `jobs\.job` cannot enforce the environment binding/);
  assert.doesNotMatch(readme, /Publish a supported AzureTools revision/);
  assert.doesNotMatch(readme, /custom hook contract/);
}

function assertRootNpmrcIsNotTrackedSource(exec = execFileSync) {
  const runGit = (args) => exec('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  const trackedNpmrc = runGit(['ls-files', '--', '.npmrc']);
  if (!trackedNpmrc) {
    return;
  }

  const npmrcStatus = runGit(['status', '--porcelain=v1', '--', '.npmrc']);
  const deletedFromSource = npmrcStatus
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => line.endsWith('.npmrc') && line.slice(0, 2).includes('D'));

  assert.ok(
    deletedFromSource,
    'root .npmrc must be removed from tracked source; generated authenticated runtime .npmrc is allowed only when untracked'
  );
}

function testRootNpmrcSourceGuardAllowsGeneratedRuntimeFile() {
  const generatedRuntimeNpmrc = (command, args) => {
    assert.strictEqual(command, 'git');
    if (args[0] === 'ls-files') {
      return '';
    }
    if (args[0] === 'status') {
      return '?? .npmrc\n';
    }
    throw new Error(`Unexpected git args: ${args.join(' ')}`);
  };

  const locallyDeletedTrackedNpmrc = (command, args) => {
    assert.strictEqual(command, 'git');
    if (args[0] === 'ls-files') {
      return '.npmrc\n';
    }
    if (args[0] === 'status') {
      return ' D .npmrc\n';
    }
    throw new Error(`Unexpected git args: ${args.join(' ')}`);
  };

  const checkedInNpmrc = (command, args) => {
    assert.strictEqual(command, 'git');
    if (args[0] === 'ls-files') {
      return '.npmrc\n';
    }
    if (args[0] === 'status') {
      return '';
    }
    throw new Error(`Unexpected git args: ${args.join(' ')}`);
  };

  assert.doesNotThrow(() => assertRootNpmrcIsNotTrackedSource(generatedRuntimeNpmrc));
  assert.doesNotThrow(() => assertRootNpmrcIsNotTrackedSource(locallyDeletedTrackedNpmrc));
  assert.throws(() => assertRootNpmrcIsNotTrackedSource(checkedInNpmrc), /root \.npmrc must be removed from tracked source/);
}

function testLocalAzureToolsWrapperContractIfAvailable() {
  const azureToolsRoot = process.env.AZURETOOLS_CONTRACT_ROOT;
  if (!azureToolsRoot) {
    return;
  }

  const mainWrapper = fs.readFileSync(path.join(azureToolsRoot, 'azdo-pipelines', '1es-mb-main.yml'), 'utf8');
  const releaseWrapper = fs.readFileSync(path.join(azureToolsRoot, 'azdo-pipelines', '1es-mb-release-extension.yml'), 'utf8');
  const stageArtifacts = fs.readFileSync(path.join(azureToolsRoot, 'azdo-pipelines', 'templates', 'stage-artifacts.yml'), 'utf8');
  const setup = fs.readFileSync(path.join(azureToolsRoot, 'azdo-pipelines', 'templates', 'setup.yml'), 'utf8');
  const writeNpmrcAuth = fs.readFileSync(path.join(azureToolsRoot, 'azdo-pipelines', 'templates', 'write-npmrc-auth.yml'), 'utf8');

  assert.match(mainWrapper, /- name: jobs[\s\S]*default:\s*\n\s+- name: Root\s*\n\s+working_directory: \./);
  assert.match(mainWrapper, /- name: packageManager[\s\S]*values:[\s\S]*- npm[\s\S]*- pnpm/);
  assert.match(mainWrapper, /- name: feedBaseUrl[\s\S]*type: string/);
  assert.match(mainWrapper, /- name: additionalSetupSteps[\s\S]*type: stepList/);
  assert.match(mainWrapper, /packageManager: \$\{\{ parameters\.packageManager \}\}/);
  assert.match(mainWrapper, /feedBaseUrl: \$\{\{ parameters\.feedBaseUrl \}\}/);
  assert.doesNotMatch(mainWrapper, /preSetupSteps/);
  assert.doesNotMatch(mainWrapper, /packageManagerInstallArgs/);
  assert.doesNotMatch(mainWrapper, /lintSteps/);
  assert.doesNotMatch(mainWrapper, /buildSteps/);
  assert.doesNotMatch(mainWrapper, /packageSteps/);
  assert.doesNotMatch(mainWrapper, /testSteps/);
  assert.doesNotMatch(mainWrapper, /additionalStages/);
  assert.match(setup, /\.nvmrc file not found/);
  assert.match(setup, /\$\(packageManager\) ci/);
  assert.match(setup, /write-npmrc-auth\.yml/);
  assert.match(writeNpmrcAuth, /Using checked-in \.npmrc at repo root/);
  assert.match(writeNpmrcAuth, /elseif \(-not \[string\]::IsNullOrWhiteSpace\(\$feedBaseUrl\)\)/);
  assert.match(writeNpmrcAuth, /Set-Content -Path \$workingNpmrc/);
  assert.match(writeNpmrcAuth, /task\.setvariable variable=npmrcFile/);

  assert.match(releaseWrapper, /- name: releaseApprovalEnvironment[\s\S]*default: ""/);
  assert.match(releaseWrapper, /TODO: not working/);
  assert.doesNotMatch(releaseWrapper, /prePublishSteps/);
  assert.match(releaseWrapper, /templateContext:[\s\S]*type: releaseJob[\s\S]*isProduction: true/);
  assert.match(releaseWrapper, /artifactName: "\$\{\{ parameters\.artifactName \}\}"/);
  assert.doesNotMatch(releaseWrapper, /pipelineID/);
  assert.doesNotMatch(releaseWrapper, /runID/);
  assert.match(stageArtifacts, /TargetFolder: \$\(Build\.ArtifactStagingDirectory\)\/build\/\$\(artifact_name\)/);
  assert.doesNotMatch(stageArtifacts, /CleanTargetFolder/);
  assert.match(stageArtifacts, /\*\*\/\*\.tar\.gz/);
  assert.match(stageArtifacts, /\*\*\/\*\.extension\.manifest/);
  assert.match(stageArtifacts, /\*\*\/\*\.extension\.signature\.p7s/);
}

function testConsumerAdmissionContract() {
  const consumerEntry = read('.config/vscode-e2e-cli.1es.yml');
  const runSuitesTemplate = read('.config/templates/vscode-e2e-cli-run-suite.yml');
  const legacyConsumerEntry = read('.azure-pipelines/vscode-e2e-cli.1es.yml');
  const legacyRunStage = read('.azure-pipelines/templates/vscode-e2e-stage.yml');
  const legacyRunCli = read('.azure-pipelines/templates/vscode-e2e-cli-run.yml');
  const legacyStagedRunCli = read('.azure-pipelines/templates/vscode-e2e-run-cli.yml');
  const cliBuildArtifactsTemplate = read('.azure-pipelines/templates/vscode-e2e-cli-build-artifacts.yml');
  const selectorScript = read('apps/vs-code-designer/scripts/resolve-e2e-cli-suite-selection.js');
  const readme = read('.config/README.md');
  const e2eReadme = read('apps/vs-code-designer/src/test/e2e/README.md');
  const consumer = parseYaml('.config/vscode-e2e-cli.1es.yml');
  const runSuites = parseYaml('.config/templates/vscode-e2e-cli-run-suite.yml');
  assert.strictEqual(consumer.extends.template, 'azure-pipelines/MicroBuild.1ES.Unofficial.yml@1esPipelines');
  assert.ok(
    !consumer.parameters.some((parameter) => parameter.name === 'isOfficialBuild'),
    'consumer must not expose an official build toggle'
  );
  assertConsumerPublicParametersAreMinimal(consumer);
  assertConsumerCurrentRunArtifactContract(consumer);
  assertConsumerParameterGuardRejectsMutations(consumer);
  assert.doesNotMatch(consumerEntry, /MicroBuild\.1ES\.Official/);
  assert.doesNotMatch(consumerEntry, /isOfficialBuild/);
  assert.doesNotMatch(consumerEntry, /networkIsolationPolicy/);
  assert.doesNotMatch(runSuitesTemplate, /networkIsolationPolicy/);
  assert.doesNotMatch(consumerEntry, /type:\s*(buildJob|releaseJob|deploymentJob)/);
  assert.doesNotMatch(runSuitesTemplate, /type:\s*(buildJob|releaseJob|deploymentJob)/);
  assert.doesNotMatch(consumerEntry, /^\s*mb:/m);
  assert.doesNotMatch(runSuitesTemplate, /^\s*mb:/m);
  assert.doesNotMatch(consumerEntry, /signing:/);
  assert.doesNotMatch(runSuitesTemplate, /signing:/);
  for (const consumerText of [consumerEntry, runSuitesTemplate]) {
    assert.doesNotMatch(consumerText, /pnpm\s+run\s+build/);
    assert.doesNotMatch(consumerText, /npm\s+run\s+build/);
    assert.doesNotMatch(consumerText, /vscode:designer:pack/);
    assert.doesNotMatch(consumerText, /vsce\s+package/);
    assert.doesNotMatch(consumerText, /1es-mb-release-extension/);
  }
  assertConsumerJobRoutingContract(consumer, runSuites);
  assertConsumerJobRoutingGuardRejectsMutations(consumer, runSuites);
  assertConsumerHasNoNetworkIsolationPolicyOverride(consumer, runSuites);
  assertNetworkIsolationGuardRejectsMutations(consumer, runSuites);
  assert.match(cliBuildArtifactsTemplate, /displayName: Build extension and compile @vscode\/test-cli E2E/);
  assertCliBuildCompilesPrepHarnessBeforeArchive(parseYaml('.azure-pipelines/templates/vscode-e2e-cli-build-artifacts.yml'));
  assert.match(cliBuildArtifactsTemplate, /NODE_OPTIONS: --max-old-space-size=6144/);
  assert.match(cliBuildArtifactsTemplate, /Missing required E2E artifact payload path before archive staging/);
  assert.match(cliBuildArtifactsTemplate, /apps\/vs-code-designer\/out\/test\/e2e\/createWorkspace\.test\.js/);
  assert.match(cliBuildArtifactsTemplate, /apps\/vs-code-designer\/out\/test\/run-e2e\.js/);
  assert.match(cliBuildArtifactsTemplate, /apps\/vs-code-designer\/dist/);
  assert.match(runSuitesTemplate, /--privileged-admission/);
  assert.doesNotMatch(runSuitesTemplate, /download:[\s\S]*\n\s+path:/);
  assert.match(runSuitesTemplate, /name: e2eBuildArtifactName[\s\S]*default: vscode-e2e-build/);
  assert.match(
    runSuitesTemplate,
    /displayName: Download current-run E2E artifact[\s\S]*displayName: Verify current-run E2E artifact admission/
  );
  assertRunSuitesProvisionsTrustedNodeBeforeVerifier(runSuites);
  assert.match(runSuitesTemplate, /\$\(Pipeline\.Workspace\).*e2eBuildArtifactName/);
  assert.doesNotMatch(runSuitesTemplate, /producerPipelineAlias/);
  assert.match(runSuitesTemplate, /artifactName = \[string\]\$manifest\.artifact\.name/);
  assert.match(runSuitesTemplate, /Unexpected logical E2E artifact name/);
  assert.match(runSuitesTemplate, /Capture trusted artifact verifier before source checkout/);
  assert.doesNotMatch(runSuitesTemplate, /Verify producer build completed and trusted/);
  assert.doesNotMatch(runSuitesTemplate, /_apis\/build\/builds/);
  assertRunSuitesBindsDynamicExpectedValuesToVariables(runSuites);
  assert.match(runSuitesTemplate, /Verify exact admitted source checkout/);
  assert.match(runSuitesTemplate, /Extracted artifact is missing the compiled ExTester dependency-prep harness/);
  assert.match(runSuitesTemplate, /Write admitted E2E artifact identity context/);
  assert.match(runSuitesTemplate, /admission-context-\$\{\{ parameters\.suiteId \}\}\.json/);
  assert.match(runSuitesTemplate, /producerBuildNumber = \[string\]\$manifest\.producer\.buildNumber/);
  assert.doesNotMatch(runSuitesTemplate, /artifactVersion = \[string\]\$manifest\.artifact\.version/);
  assert.match(runSuitesTemplate, /resolvedVSCodeBuild = '\$\(ResolvedVSCodeVersion\)'/);
  assert.match(runSuitesTemplate, /ResolvedVSCodeVersion must be supplied by the shared consumer context job/);
  assert.doesNotMatch(runSuitesTemplate, /Resolve stable VS Code version once/);
  assert.doesNotMatch(runSuitesTemplate, /az account get-access-token/);
  assert.doesNotMatch(runSuitesTemplate, /Copy-Item \(Join-Path \$batchRootParent '\*'\)/);
  assert.doesNotMatch(runSuitesTemplate, /la-e2e-cli-batch/);
  assert.match(runSuitesTemplate, /\$requiredResultFiles = @\(/);
  assert.match(runSuitesTemplate, /\$\{\{ parameters\.suiteId \}\}\.terminal-result\.json/);
  assert.doesNotMatch(runSuitesTemplate, /LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH/);
  assert.doesNotMatch(runSuitesTemplate, /LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH/);
  assert.match(runSuitesTemplate, /Required suite diagnostics were missing after staging available evidence/);
  assert.match(runSuitesTemplate, /artifactName: vscode-e2e-cli-diagnostics-\$\{\{ parameters\.artifactName \}\}/);
  assert.match(
    runSuitesTemplate,
    /targetPath: \$\(Build\.ArtifactStagingDirectory\)\/vscode-e2e-cli\/\$\{\{ parameters\.artifactName \}\}/
  );
  assert.match(runSuitesTemplate, /--diagnostics-artifact-name "vscode-e2e-cli-diagnostics-\$\{\{ parameters\.artifactName \}\}"/);
  assert.doesNotMatch(runSuitesTemplate, /artifactName: vscode-e2e-cli-test-results-\$\{\{ parameters\.artifactName \}\}/);
  assert.doesNotMatch(runSuitesTemplate, /artifactName: vscode-e2e-cli-log-\$\{\{ parameters\.artifactName \}\}/);
  assert.doesNotMatch(runSuitesTemplate, /artifactName: vscode-e2e-cli-screenshots-\$\{\{ parameters\.artifactName \}\}/);
  assert.doesNotMatch(runSuitesTemplate, /artifactName: vscode-e2e-cli-generated-workspaces-\$\{\{ parameters\.artifactName \}\}/);
  assert.match(runSuitesTemplate, /Redact-DiagnosticText/);
  assert.doesNotMatch(runSuitesTemplate, /Copy-SanitizedReportDirectory/);
  assert.doesNotMatch(
    runSuitesTemplate,
    /\$\{\{ parameters\.suiteId \}\}\.cleanup-ledger\.json'[\s\S]*Copy-Item/,
    'Private per-suite process cleanup ledgers must not be published'
  );
  assert.match(runSuitesTemplate, /\.vscode-test\/screenshots\/cli\/\$\{\{ parameters\.suiteId \}\}/);
  assert.match(runSuitesTemplate, /\.vscode-test\/generated-workspaces\/\$\{\{ parameters\.suiteId \}\}/);
  assert.match(runSuitesTemplate, /Publish JUnit result/);
  assert.match(runSuitesTemplate, /failTaskOnMissingResultsFile: true/);
  assert.doesNotMatch(runSuitesTemplate, /JUnit placeholders/);
  assert.match(runSuitesTemplate, /scripts\/summarize-e2e-cli-results\.js/);
  assert.match(runSuitesTemplate, /node scripts\/run-e2e-cli\.js "\$\{cli_args\[@\]\}"/);
  assert.match(runSuitesTemplate, /short_profile_parent="\$\(mktemp -d "\/tmp\/la\$\{\{ parameters\.shortName \}\}\.XXXXXX"\)"/);
  assert.match(runSuitesTemplate, /socket_bytes="\$\(printf '%s' "\$socket_probe" \| wc -c\)"/);
  assert.match(runSuitesTemplate, /Short Linux VS Code profile socket path budget exceeded/);
  assert.match(runSuitesTemplate, /useGlobalConfig: false/);
  assert.match(runSuitesTemplate, /visibleAzLogin: false/);
  assert.match(runSuitesTemplate, /az account show --query id --output tsv/);
  assert.match(runSuitesTemplate, /az account show --query tenantId --output tsv/);
  assert.match(runSuitesTemplate, /AzureCLI service connection did not provide WIF tenant metadata/);
  assert.match(runSuitesTemplate, /AzureCLI service connection did not provide subscription and tenant identity/);
  assert.match(runSuitesTemplate, /AzureCLI service connection identity was malformed/);
  assert.match(runSuitesTemplate, /AzureCLI account tenant does not match the service connection tenant/);
  assert.strictEqual(
    runSuitesTemplate.match(/LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL: '1'/g)?.length,
    2,
    'MSN lifecycle direct runs must disable unowned port killing on both OS-specific AzureCLI paths'
  );
  assert.doesNotMatch(runSuitesTemplate, /name: azureTenantId/);
  assert.doesNotMatch(runSuitesTemplate, /name: azureSubscriptionId/);
  assert.doesNotMatch(runSuitesTemplate, /LA_E2E_CLI_AZURE_TENANT_ID: \$\{\{ parameters\.azureTenantId \}\}/);
  assert.doesNotMatch(runSuitesTemplate, /LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: \$\{\{ parameters\.azureSubscriptionId \}\}/);
  assert.match(legacyRunCli, /addSpnToEnvironment: true/);
  assert.match(legacyRunCli, /useGlobalConfig: false/);
  assert.match(legacyRunCli, /visibleAzLogin: false/);
  assert.match(legacyRunCli, /az account show --query id --output tsv/);
  assert.match(legacyRunCli, /az account show --query tenantId --output tsv/);
  assert.match(legacyRunCli, /AzureCLI service connection did not provide WIF tenant metadata/);
  assert.match(legacyRunCli, /AzureCLI service connection did not provide subscription and tenant identity/);
  assert.match(legacyRunCli, /AzureCLI service connection identity was malformed/);
  assert.match(legacyRunCli, /AzureCLI account tenant does not match the service connection tenant/);
  assert.doesNotMatch(legacyConsumerEntry, /name: azureTenantId/);
  assert.doesNotMatch(legacyConsumerEntry, /name: azureSubscriptionId/);
  assert.doesNotMatch(legacyRunStage, /name: azureTenantId/);
  assert.doesNotMatch(legacyRunStage, /name: azureSubscriptionId/);
  assert.doesNotMatch(legacyRunCli, /name: azureTenantId/);
  assert.doesNotMatch(legacyRunCli, /name: azureSubscriptionId/);
  assert.doesNotMatch(legacyRunCli, /az account show --query '\{subscription:id, tenant:tenantId\}' -o json/);
  assert.doesNotMatch(legacyRunCli, /LA_E2E_CLI_AZURE_TENANT_ID: \$\{\{ parameters\.azureTenantId \}\}/);
  assert.doesNotMatch(legacyRunCli, /LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: \$\{\{ parameters\.azureSubscriptionId \}\}/);
  assert.match(legacyStagedRunCli, /addSpnToEnvironment: true/);
  assert.match(legacyStagedRunCli, /useGlobalConfig: false/);
  assert.match(legacyStagedRunCli, /visibleAzLogin: false/);
  assert.match(legacyStagedRunCli, /az account show --query id --output tsv/);
  assert.match(legacyStagedRunCli, /az account show --query tenantId --output tsv/);
  assert.match(legacyStagedRunCli, /AzureCLI service connection did not provide WIF tenant metadata/);
  assert.match(legacyStagedRunCli, /AzureCLI service connection identity was malformed/);
  assert.doesNotMatch(legacyStagedRunCli, /name: azureTenantId/);
  assert.doesNotMatch(legacyStagedRunCli, /name: azureSubscriptionId/);
  assert.doesNotMatch(legacyStagedRunCli, /LA_E2E_CLI_AZURE_TENANT_ID: \$\{\{ parameters\.azureTenantId \}\}/);
  assert.doesNotMatch(legacyStagedRunCli, /LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: \$\{\{ parameters\.azureSubscriptionId \}\}/);
  assertNoGuidLiteralsInExplicitPipelineDocs(
    consumerEntry,
    runSuitesTemplate,
    legacyConsumerEntry,
    legacyRunStage,
    legacyRunCli,
    legacyStagedRunCli,
    readme,
    e2eReadme
  );
  assertGuidGuardRejectsMutations(consumerEntry);
  assert.match(consumerEntry, /resolve_consumer_context/);
  assert.match(consumerEntry, /resolveStableVSCode/);
  assert.match(consumerEntry, /resolvedVSCodeBuild;isOutput=true/);
  assert.match(consumerEntry, /pinnedSourceSha;isOutput=true/);
  assert.match(consumerEntry, /build_current_run_e2e_artifact/);
  assert.match(consumerEntry, /artifactName: vscode-e2e-build/);
  assert.match(consumerEntry, /targetPath: \$\(Build\.ArtifactStagingDirectory\)\/vscode-e2e/);
  assert.match(consumerEntry, /artifactStagingPath: \$\(Build\.ArtifactStagingDirectory\)\/vscode-e2e/);
  assert.doesNotMatch(consumerEntry, /resources\.pipeline\.producer/);
  assert.match(selectorScript, /At least one OS cohort must be selected for the VS Code E2E consumer/);
  assert.match(selectorScript, /normalizeSuiteSelection/);
  assert.match(selectorScript, /Full VS Code E2E consumer rollup requires canonical/);
  assert.match(consumerEntry, /Validate requested suite selectors before build/);
  assert.match(consumerEntry, /resolve-e2e-cli-suite-selection\.js/);
  assert.match(
    consumerEntry,
    /resolvedVSCodeVersion: \$\[ dependencies\.resolve_consumer_context\.outputs\['resolveStableVSCode\.resolvedVSCodeBuild'\] \]/
  );
  assert.match(consumerEntry, /expectedProducerDefinitionId: \$\(System\.DefinitionId\)/);
  assert.match(consumerEntry, /expectedProducerRunId: \$\(Build\.BuildId\)/);
  assert.match(consumerEntry, /verify_both_os_full_rollup/);
  assert.match(consumerEntry, /report_diagnostic_selected_rerun/);
  assert.match(consumerEntry, /protected checks must bind verify_both_os_full_rollup/);
  assert.match(consumerEntry, /Diagnostic selected rerun failed selected suite job/);
  assert.match(consumerEntry, /Enforce twelve-suite both-OS full rollup gate/);
  assert.match(consumerEntry, /Suite result is not a successful executed test run/);
  assert.match(consumerEntry, /Suite log does not contain enough positive real Mocha execution evidence/);
  assert.match(consumerEntry, /vscode-e2e-cli-diagnostics-linux-create-workspace-core-matrix/);
  assert.doesNotMatch(consumerEntry, /\$\{\{ dependencies\.linux_prepared_suites\.result \}\}/);
  assert.doesNotMatch(consumerEntry, /\$\{\{ dependencies\.windows_prepared_suites\.result \}\}/);
  assert.doesNotMatch(consumerEntry, /linux_prepared_suites/);
  assert.doesNotMatch(consumerEntry, /windows_prepared_suites/);
  assert.match(consumerEntry, /vscode-e2e-cli-diagnostics-linux-unit-tests/);
  assert.match(consumerEntry, /vscode-e2e-cli-diagnostics-windows-msn-weather-lifecycle/);
  assert.doesNotMatch(consumerEntry, /vscode-e2e-cli-test-results-linux-unit-tests/);
  assert.doesNotMatch(consumerEntry, /vscode-e2e-cli-log-linux-unit-tests/);
  assert.match(consumerEntry, /\$resultRoot = Join-Path \$root 'results'/);
  assert.match(consumerEntry, /\$logRoot = Join-Path \$root 'log'/);
  assert.match(consumerEntry, /admission-context-\$\(\$suite\.suite\)\.json/);
  assert.match(consumerEntry, /producerDefinitionId/);
  assert.match(consumerEntry, /sourceSHA/);
  assert.match(consumerEntry, /artifactSHA256/);
  assert.match(consumerEntry, /resolvedVSCodeBuild/);
}

function assertConsumerPublicParametersAreMinimal(consumer) {
  assert.deepStrictEqual(
    consumer.parameters.map((parameter) => parameter.name),
    ['diagnosticOnly', 'executionTopology', 'runLinux', 'runWindows', 'linuxSuites', 'windowsSuites'],
    'consumer Run pipeline surface must expose only genuine topology/OS/suite selectors'
  );
}

function testSelectorResolutionScriptBehavior() {
  const scriptPath = path.join(repoRoot, 'apps', 'vs-code-designer', 'scripts', 'resolve-e2e-cli-suite-selection.js');
  const fullResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'false',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'true',
    LA_E2E_CLI_LINUX_SUITES: 'linux',
    LA_E2E_CLI_WINDOWS_SUITES: 'windows',
  });
  assert.strictEqual(fullResult.status, 0, fullResult.output);
  assert.match(
    fullResult.output,
    /variable=linuxSelectedSuites;isOutput=true]unitTests,createWorkspaceBehavior,createWorkspaceCoreMatrix,createWorkspacePreviewMatrix,createWorkspaceCodeful,msnWeatherLifecycle/
  );
  assert.match(
    fullResult.output,
    /variable=windowsSelectedSuites;isOutput=true]unitTests,createWorkspaceBehavior,createWorkspaceCoreMatrix,createWorkspacePreviewMatrix,createWorkspaceCodeful,msnWeatherLifecycle/
  );
  assert.match(fullResult.output, /variable=linux_msnWeatherLifecycle;isOutput=true]true/);
  assert.match(fullResult.output, /variable=windows_createWorkspaceCoreMatrix;isOutput=true]true/);
  assert.match(fullResult.output, /variable=windows_createWorkspaceBehaviorSmoke;isOutput=true]false/);
  assert.match(
    fullResult.output,
    /variable=linux_nonAzureSuites;isOutput=true]unitTests,createWorkspaceBehavior,createWorkspaceCoreMatrix,createWorkspacePreviewMatrix,createWorkspaceCodeful/
  );
  assert.match(fullResult.output, /variable=linux_azureSuites;isOutput=true]msnWeatherLifecycle/);
  assert.match(fullResult.output, /variable=windows_nonAzureSelected;isOutput=true]false/);
  assert.match(fullResult.output, /variable=windows_azureSelected;isOutput=true]false/);
  assert.match(fullResult.output, /variable=linux_nonAzureRunsContracts;isOutput=true]false/);
  assert.match(fullResult.output, /variable=linux_azureRunsContracts;isOutput=true]false/);
  assert.match(fullResult.output, /variable=windowsPnpmSeedRequired;isOutput=true]false/);

  const cohortFullResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'false',
    LA_E2E_CLI_EXECUTION_TOPOLOGY: 'cohort',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'true',
    LA_E2E_CLI_LINUX_SUITES: 'linux',
    LA_E2E_CLI_WINDOWS_SUITES: 'windows',
  });
  assert.strictEqual(cohortFullResult.status, 0, cohortFullResult.output);
  assert.match(cohortFullResult.output, /variable=windows_nonAzureSelected;isOutput=true]true/);
  assert.match(cohortFullResult.output, /variable=windows_azureSelected;isOutput=true]true/);
  assert.match(cohortFullResult.output, /variable=linux_nonAzureRunsContracts;isOutput=true]true/);
  assert.match(cohortFullResult.output, /variable=linux_azureRunsContracts;isOutput=true]false/);
  assert.match(cohortFullResult.output, /variable=windowsPnpmSeedRequired;isOutput=true]true/);
  assert.match(cohortFullResult.output, /variable=linux_unitTests;isOutput=true]false/);

  const explicitCanonicalResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'false',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'true',
    LA_E2E_CLI_LINUX_SUITES:
      'unitTests,createWorkspaceBehavior,createWorkspaceCoreMatrix,createWorkspacePreviewMatrix,createWorkspaceCodeful,msnWeatherLifecycle',
    LA_E2E_CLI_WINDOWS_SUITES:
      'unitTests,createWorkspaceBehavior,createWorkspaceCoreMatrix,createWorkspacePreviewMatrix,createWorkspaceCodeful,msnWeatherLifecycle',
  });
  assert.strictEqual(explicitCanonicalResult.status, 0, explicitCanonicalResult.output);

  const diagnosticWindowsSmokeResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_RUN_LINUX: 'false',
    LA_E2E_CLI_RUN_WINDOWS: 'true',
    LA_E2E_CLI_WINDOWS_SUITES: 'createWorkspaceBehaviorSmoke',
  });
  assert.strictEqual(diagnosticWindowsSmokeResult.status, 0, diagnosticWindowsSmokeResult.output);
  assert.match(diagnosticWindowsSmokeResult.output, /variable=windows_createWorkspaceBehaviorSmoke;isOutput=true]true/);
  assert.match(diagnosticWindowsSmokeResult.output, /variable=windows_createWorkspaceBehavior;isOutput=true]false/);
  assert.match(diagnosticWindowsSmokeResult.output, /variable=windows_nonAzureSuites;isOutput=true]createWorkspaceBehaviorSmoke/);
  assert.match(diagnosticWindowsSmokeResult.output, /variable=windows_azureSuites;isOutput=true]/);
  assert.match(diagnosticWindowsSmokeResult.output, /variable=windows_nonAzureRunsContracts;isOutput=true]false/);
  assert.match(diagnosticWindowsSmokeResult.output, /variable=windowsPnpmSeedRequired;isOutput=true]false/);

  const diagnosticWindowsCohortResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_EXECUTION_TOPOLOGY: 'cohort',
    LA_E2E_CLI_RUN_LINUX: 'false',
    LA_E2E_CLI_RUN_WINDOWS: 'true',
    LA_E2E_CLI_WINDOWS_SUITES: 'createWorkspaceBehaviorSmoke',
  });
  assert.strictEqual(diagnosticWindowsCohortResult.status, 0, diagnosticWindowsCohortResult.output);
  assert.match(diagnosticWindowsCohortResult.output, /variable=windows_nonAzureSuites;isOutput=true]createWorkspaceBehaviorSmoke/);
  assert.match(diagnosticWindowsCohortResult.output, /variable=windows_nonAzureSelected;isOutput=true]true/);
  assert.match(diagnosticWindowsCohortResult.output, /variable=windows_azureSelected;isOutput=true]false/);
  assert.match(diagnosticWindowsCohortResult.output, /variable=windows_nonAzureRunsContracts;isOutput=true]true/);
  assert.match(diagnosticWindowsCohortResult.output, /variable=windowsPnpmSeedRequired;isOutput=true]false/);

  const diagnosticLinuxAzureCohortResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_EXECUTION_TOPOLOGY: 'cohort',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'false',
    LA_E2E_CLI_LINUX_SUITES: 'msnWeatherLifecycle',
  });
  assert.strictEqual(diagnosticLinuxAzureCohortResult.status, 0, diagnosticLinuxAzureCohortResult.output);
  assert.match(diagnosticLinuxAzureCohortResult.output, /variable=linux_nonAzureSelected;isOutput=true]false/);
  assert.match(diagnosticLinuxAzureCohortResult.output, /variable=linux_azureSelected;isOutput=true]true/);
  assert.match(diagnosticLinuxAzureCohortResult.output, /variable=linux_azureRunsContracts;isOutput=true]true/);

  const diagnosticPartialResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'false',
    LA_E2E_CLI_LINUX_SUITES: 'unitTests',
  });
  assert.strictEqual(diagnosticPartialResult.status, 0, diagnosticPartialResult.output);
  assert.match(diagnosticPartialResult.output, /variable=linux_unitTests;isOutput=true]true/);
  assert.match(diagnosticPartialResult.output, /variable=linux_createWorkspaceBehavior;isOutput=true]false/);
  assert.match(diagnosticPartialResult.output, /variable=windowsSelectedSuites;isOutput=true]/);

  const fullPartialResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'false',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'true',
    LA_E2E_CLI_LINUX_SUITES: 'unitTests',
    LA_E2E_CLI_WINDOWS_SUITES: 'windows',
  });
  assert.notStrictEqual(fullPartialResult.status, 0);
  assert.match(fullPartialResult.output, /Full VS Code E2E consumer rollup requires canonical linux suite inventory/);

  const duplicateResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'false',
    LA_E2E_CLI_LINUX_SUITES: 'unitTests,unitTests',
  });
  assert.notStrictEqual(duplicateResult.status, 0);
  assert.match(duplicateResult.output, /Duplicate or overlapping --suites entry "unitTests"/);

  const wrongOsResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'false',
    LA_E2E_CLI_LINUX_SUITES: 'createWorkspaceBehaviorSmoke',
  });
  assert.notStrictEqual(wrongOsResult.status, 0);
  assert.match(wrongOsResult.output, /is not available on linux/);

  const invalidTopologyResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_EXECUTION_TOPOLOGY: 'invalid',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'false',
    LA_E2E_CLI_LINUX_SUITES: 'unitTests',
  });
  assert.notStrictEqual(invalidTopologyResult.status, 0);
  assert.match(invalidTopologyResult.output, /Unsupported executionTopology/);

  const noOsResult = runSelectorScript(scriptPath, {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_RUN_LINUX: 'false',
    LA_E2E_CLI_RUN_WINDOWS: 'false',
  });
  assert.notStrictEqual(noOsResult.status, 0);
  assert.match(noOsResult.output, /At least one OS cohort must be selected/);
}

function testCanonicalSuiteParityContract() {
  assert.deepStrictEqual(SUITE_ALIASES.windows, SUITE_ALIASES.linux, 'canonical Windows and Linux suite aliases must stay equal');
  assert.ok(!SUITE_ALIASES.windows.includes('createWorkspaceBehaviorSmoke'), 'Windows smoke stays diagnostic-only, not canonical');

  const canonicalPhaseIdentity = (suiteIds) =>
    suiteIds.flatMap((suiteId) => SUITE_REGISTRY[suiteId].expectedPhases.map((phaseId) => `${suiteId}/${phaseId}`));

  assert.deepStrictEqual(
    canonicalPhaseIdentity(SUITE_ALIASES.windows),
    canonicalPhaseIdentity(SUITE_ALIASES.linux),
    'canonical Windows and Linux stable phase identities must stay equal'
  );
}

function testSupplementaryFamilyRoutingContract() {
  const consumer = parseYaml('.config/vscode-e2e-cli.1es.yml');
  const runner = read('apps/vs-code-designer/scripts/run-e2e-cli.js');
  const suiteSteps = parseYaml('.config/templates/vscode-e2e-cli-run-suite.yml').jobs[0].steps;
  const nativeBranches = suiteSteps.filter((step) => Object.keys(step).some((key) => key.includes('parameters.requiresAzureAccessToken')));
  assert.strictEqual(nativeBranches.length, 4, 'Both OS and authentication paths must retain diagnostic-only multi-root execution');
  for (const branch of nativeBranches) {
    const nativeStep = Object.values(branch)
      .flat()
      .find((step) => step.displayName === 'Run vscode-test CLI (${{ parameters.suiteId }})');
    assert.ok(nativeStep, 'Missing native execution step');
    const runtimeRoot = nativeStep.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT;
    const nativeScript = nativeStep.bash ?? nativeStep.pwsh ?? nativeStep.inputs?.inlineScript;
    assert.ok(nativeScript, 'Native execution step must expose its launch script');
    const runtimeParentCreation =
      runtimeRoot === '$(Agent.TempDirectory)/runtime-dependencies/${{ parameters.suiteId }}'
        ? 'mkdir -p "$(Agent.TempDirectory)/runtime-dependencies"'
        : 'New-Item -ItemType Directory -Force -Path "$(Agent.TempDirectory)\\runtime-dependencies"';
    assert.ok(nativeScript.includes(runtimeParentCreation), 'Native execution must create the admitted runtime parent');
    assert.ok(
      nativeScript.indexOf(runtimeParentCreation) < nativeScript.indexOf('node scripts/run-e2e-cli.js'),
      'Admitted runtime parent must exist before the direct family runner starts'
    );
    const multiRootEnvironment = nativeStep.env["${{ if eq(parameters.suiteId, 'workspaceMultiRoot') }}"];
    assert.strictEqual(multiRootEnvironment?.LA_E2E_CLI_MULTI_ROOT_ISOLATED, '1');
    assert.strictEqual(multiRootEnvironment?.LA_E2E_CLI_MULTI_ROOT_DIAGNOSTIC_ONLY, '1');
  }
  const staging = suiteSteps.find((step) => step.displayName === 'Stage vscode-test CLI results (${{ parameters.suiteId }})');
  assert.ok(
    staging?.pwsh?.includes('scripts/family-lifecycle-terminal.js'),
    'Supplementary staging must validate actual finalized evidence'
  );
  assert.match(
    staging.pwsh,
    /family-lifecycle-terminal\.js[\s\S]*if \(\$LASTEXITCODE -ne 0\)[\s\S]*throw 'Supplementary family native lifecycle/
  );
  assert.match(
    runner,
    /requiresDirectFamilyWrapper\(process\.env\)[\s\S]*runDirectFamily\('httpTimeoutLifecycle'\)[\s\S]*runHttpTimeoutLifecycle\(\)/,
    'The direct HTTP selector must delegate to registered suite containment before the wrapper child runs the scenario'
  );
  assert.ok(
    staging.pwsh.includes('workspace-regeneration-${{ parameters.shortName }}'),
    'Regeneration staging must address the direct family evidence root'
  );
  for (const evidencePattern of [
    "'terminal-result.json'",
    "'cleanup-ledger.json'",
    "'phase-results.jsonl'",
    "'code.log'",
    "'prompt-observations.jsonl'",
    "'screenshots', 'vscode-logs'",
    "'vscode-logs'",
  ]) {
    assert.ok(staging.pwsh.includes(evidencePattern), `Regeneration staging must preserve ${evidencePattern}`);
  }
  assert.ok(!staging.pwsh.includes("Name -like '*-code.log'"), 'Raw per-phase Code logs must never enter the diagnostics artifact');
  assert.ok(!staging.pwsh.includes("Name -like '*-profile.json'"), 'Raw profile descriptors must never enter the diagnostics artifact');
  assert.match(
    staging.pwsh,
    /workspaceArtifactRegeneration[\s\S]*missingRequiredFiles \+= \$regenerationEvidenceRoot/,
    'A missing regeneration evidence root must fail diagnostics staging'
  );
  const invocations = flattenAzureList(consumer.extends.parameters.stages[0].jobs).filter((entry) => entry.template);
  const diagnostic = getConsumerDirectJob(consumer, 'report_diagnostic_selected_rerun');
  const gate = getConsumerDirectJob(consumer, 'verify_both_os_full_rollup');
  for (const [suiteId, jobSuffix] of [
    ['httpTimeoutLifecycle', 'http_timeout_lifecycle'],
    ['statelessVariablesLifecycle', 'stateless_variables'],
    ['workspaceArtifactRegeneration', 'workspace_regeneration'],
    ['workspaceMultiRoot', 'workspace_multi_root'],
  ]) {
    assert.ok(SUITE_REGISTRY[suiteId], `Supplementary family ${suiteId} must have an executable registry entry`);
    assert.ok(staging.pwsh.includes(`'${suiteId}'`), `Supplementary ${suiteId} must be covered by the terminal publication guard`);
    for (const os of ['linux', 'windows']) {
      const jobName = `${os}_${jobSuffix}`;
      const job = invocations.find((entry) => entry.parameters.jobName === jobName)?.parameters;
      assert.ok(job, `Missing native ${os} lane for ${suiteId}`);
      assert.strictEqual(job.suiteId, suiteId);
      assert.strictEqual(job.cliArguments, SUITE_REGISTRY[suiteId].args.join(' '));
      if (['httpTimeoutLifecycle', 'statelessVariablesLifecycle'].includes(suiteId)) {
        assert.strictEqual(job.requiresAzureAccessToken, true, 'Affirmative connector setup requires the approved Azure fixture context');
        assert.strictEqual(job.testARMServiceConnection, 'LogicAppsVSCode-E2E-SignIn');
        assert.strictEqual(job.azureResourceGroupName, 'LogicAppsVSCode-E2E-Fixtures');
        assert.strictEqual(job.azureLocationName, 'westus');
      } else {
        assert.strictEqual(job.requiresAzureAccessToken, undefined, 'Workspace-only families must not receive live Azure credentials');
        assert.strictEqual(job.testARMServiceConnection, undefined);
        assert.strictEqual(job.azureResourceGroupName, undefined);
        assert.strictEqual(job.azureLocationName, undefined);
      }
      assert.ok(job.selected.includes(`validateSuiteSelection.${os}_${suiteId}`));
      assert.ok(diagnostic.dependsOn.includes(jobName));
      assert.ok(!gate.dependsOn.includes(jobName), 'Unvalidated families must not silently replace the established canonical gate');
      assert.ok(!SUITE_ALIASES[os].includes(suiteId));
    }
  }
  const selected = runSelectorScript(path.join(__dirname, 'resolve-e2e-cli-suite-selection.js'), {
    LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true',
    LA_E2E_CLI_RUN_LINUX: 'true',
    LA_E2E_CLI_RUN_WINDOWS: 'true',
    LA_E2E_CLI_LINUX_SUITES: 'httpTimeoutLifecycle,statelessVariablesLifecycle,workspaceArtifactRegeneration,workspaceMultiRoot',
    LA_E2E_CLI_WINDOWS_SUITES: 'httpTimeoutLifecycle,statelessVariablesLifecycle,workspaceArtifactRegeneration,workspaceMultiRoot',
  });
  assert.strictEqual(selected.status, 0, selected.output);
  for (const os of ['linux', 'windows']) {
    for (const suiteId of ['httpTimeoutLifecycle', 'statelessVariablesLifecycle', 'workspaceArtifactRegeneration', 'workspaceMultiRoot']) {
      assert.ok(selected.output.includes(`variable=${os}_${suiteId};isOutput=true]true`));
    }
  }
}

function runSelectorScript(scriptPath, env) {
  try {
    const result = execFileSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: result };
  } catch (error) {
    return {
      status: error.status ?? 1,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    };
  }
}

function assertConsumerCurrentRunArtifactContract(consumer) {
  const variables = new Map(consumer.variables.filter((variable) => variable.name).map((variable) => [variable.name, variable.value]));
  assert.strictEqual(variables.get('producerSourceSha'), undefined, 'consumer must not depend on selected producer resource metadata');
  assert.strictEqual(variables.get('producerRunId'), undefined, 'consumer must not depend on selected producer resource metadata');
  assert.ok(!consumer.resources?.pipelines, 'consumer must not require manual pipeline resource selection');

  const jobs = flattenAzureList(consumer.extends.parameters.stages[0].jobs);
  const buildJob = jobs.find((entry) => entry.job === 'build_current_run_e2e_artifact');
  assert.ok(buildJob, 'consumer must build the test-only E2E artifact in the same run');
  assert.deepStrictEqual(buildJob.dependsOn, ['resolve_consumer_context']);
  assert.strictEqual(buildJob.templateContext?.type, undefined, 'current-run artifact build job must be an ordinary output-producing job');
  assert.strictEqual(buildJob.templateContext.outputs[0].artifactName, 'vscode-e2e-build');
  assert.strictEqual(buildJob.templateContext.outputs[0].targetPath, '$(Build.ArtifactStagingDirectory)/vscode-e2e');
  const checkoutStep = buildJob.steps.find((step) => step.displayName === 'Checkout pinned source SHA for E2E artifact');
  assert.ok(checkoutStep?.pwsh?.includes('git checkout "$(pinnedSourceSha)"'));
  assert.match(checkoutStep?.pwsh ?? '', /git checkout "\$\(pinnedSourceSha\)"[\s\S]*if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(checkoutStep?.pwsh ?? '', /\$rawHead = git rev-parse HEAD[\s\S]*if \(\$LASTEXITCODE -ne 0\)/);
  const buildTemplate = buildJob.steps.find(
    (step) => step.template === '/.azure-pipelines/templates/vscode-e2e-cli-build-artifacts.yml@self'
  );
  assert.strictEqual(buildTemplate?.parameters?.artifactStagingPath, '$(Build.ArtifactStagingDirectory)/vscode-e2e');

  const templateInvocations = flattenAzureList(consumer.extends.parameters.stages[0].jobs).filter(
    (entry) => entry.template === '/.config/templates/vscode-e2e-cli-run-suite.yml@self'
  );
  assert.strictEqual(templateInvocations.length, 21);
  assert.deepStrictEqual(
    templateInvocations.map((invocation) => invocation.parameters.jobName).sort(),
    [
      'linux_create_workspace_behavior',
      'linux_create_workspace_codeful',
      'linux_create_workspace_core_matrix',
      'linux_create_workspace_preview_matrix',
      'linux_msn_weather_lifecycle',
      'linux_unit_tests',
      'linux_http_timeout_lifecycle',
      'linux_stateless_variables',
      'linux_workspace_regeneration',
      'linux_workspace_multi_root',
      'windows_create_workspace_behavior',
      'windows_create_workspace_behavior_smoke',
      'windows_create_workspace_codeful',
      'windows_create_workspace_core_matrix',
      'windows_create_workspace_preview_matrix',
      'windows_msn_weather_lifecycle',
      'windows_unit_tests',
      'windows_http_timeout_lifecycle',
      'windows_stateless_variables',
      'windows_workspace_regeneration',
      'windows_workspace_multi_root',
    ].sort()
  );
  for (const invocation of templateInvocations) {
    assert.strictEqual(invocation.template, '/.config/templates/vscode-e2e-cli-run-suite.yml@self');
    assert.deepStrictEqual(invocation.parameters.dependsOn, ['resolve_consumer_context', 'build_current_run_e2e_artifact']);
    assert.strictEqual(invocation.parameters.expectedProducerDefinitionId, '$(System.DefinitionId)');
    assert.strictEqual(invocation.parameters.expectedProducerRunId, '$(Build.BuildId)');
    assert.strictEqual(
      invocation.parameters.expectedSourceSha,
      "$[ dependencies.resolve_consumer_context.outputs['resolveStableVSCode.pinnedSourceSha'] ]"
    );
    assert.strictEqual(
      invocation.parameters.checkoutRef,
      "$[ dependencies.resolve_consumer_context.outputs['resolveStableVSCode.pinnedSourceSha'] ]"
    );
    assert.ok(invocation.parameters.selected.includes('validateSuiteSelection.'));
    assert.match(
      invocation.parameters.cliArguments,
      /^--(label|msn-weather-lifecycle|http-timeout-lifecycle|stateless-variables-lifecycle|workspace-artifact-regeneration|workspace-multi-root)/
    );
    assert.ok(invocation.parameters.shortName.length <= 2, 'suite shortName must keep Linux profile/socket paths short');
    assert.strictEqual(invocation.parameters.nodeVersion ?? '22.x', '22.x');
    assert.strictEqual(invocation.parameters.dotnetVersion ?? '8.0.x', '8.0.x');
    if (invocation.parameters.requiresAzureAccessToken === true) {
      assert.strictEqual(invocation.parameters.testARMServiceConnection, 'LogicAppsVSCode-E2E-SignIn');
      assert.strictEqual(invocation.parameters.azureResourceGroupName, 'LogicAppsVSCode-E2E-Fixtures');
      assert.strictEqual(invocation.parameters.azureLocationName, 'westus');
    } else {
      assert.strictEqual(invocation.parameters.testARMServiceConnection, undefined);
      assert.strictEqual(invocation.parameters.azureResourceGroupName, undefined);
      assert.strictEqual(invocation.parameters.azureLocationName, undefined);
    }
    assert.strictEqual(invocation.parameters.azureTenantId, undefined);
    assert.strictEqual(invocation.parameters.azureSubscriptionId, undefined);
  }
  const cohortInvocations = flattenAzureList(consumer.extends.parameters.stages[0].jobs).filter(
    (entry) => entry.template === '/.config/templates/vscode-e2e-cli-run-cohort.yml@self'
  );
  assert.deepStrictEqual(
    cohortInvocations.map((invocation) => invocation.parameters.jobName).sort(),
    ['linux_non_azure_cohort', 'linux_azure_cohort', 'windows_non_azure_cohort', 'windows_azure_cohort'].sort()
  );
  for (const invocation of cohortInvocations) {
    assert.ok(invocation.parameters.selected.includes('validateSuiteSelection.'));
    assert.ok(invocation.parameters.suites.includes('validateSuiteSelection.'));
    assert.ok(invocation.parameters.runRegisteredContracts.includes('validateSuiteSelection.'));
    assert.ok(invocation.parameters.trustedFullExecution.includes('validateSuiteSelection.trustedFullExecution'));
    assert.strictEqual(invocation.parameters.expectedProducerDefinitionId, '$(System.DefinitionId)');
    assert.strictEqual(invocation.parameters.expectedProducerRunId, '$(Build.BuildId)');
  }

  const diagnosticJob = getConsumerDirectJob(consumer, 'report_diagnostic_selected_rerun');
  assert.deepStrictEqual(diagnosticJob.dependsOn, [
    'resolve_consumer_context',
    'linux_unit_tests',
    'linux_create_workspace_behavior',
    'linux_create_workspace_core_matrix',
    'linux_create_workspace_preview_matrix',
    'linux_create_workspace_codeful',
    'linux_msn_weather_lifecycle',
    'windows_unit_tests',
    'windows_create_workspace_behavior',
    'windows_create_workspace_core_matrix',
    'windows_create_workspace_preview_matrix',
    'windows_create_workspace_codeful',
    'windows_create_workspace_behavior_smoke',
    'windows_msn_weather_lifecycle',
    'linux_http_timeout_lifecycle',
    'windows_http_timeout_lifecycle',
    'linux_stateless_variables',
    'windows_stateless_variables',
    'linux_workspace_regeneration',
    'windows_workspace_regeneration',
    'linux_workspace_multi_root',
    'windows_workspace_multi_root',
    'linux_non_azure_cohort',
    'linux_azure_cohort',
    'windows_non_azure_cohort',
    'windows_azure_cohort',
  ]);
}

function runPowerShellScript(script) {
  try {
    const output = execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (error) {
    return {
      status: error.status ?? 1,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    };
  }
}

function assertRunSuitesBindsDynamicExpectedValuesToVariables(runSuites) {
  const suiteJob = runSuites.jobs[0];
  assert.strictEqual(suiteJob.variables.ExpectedSourceSha, '${{ parameters.expectedSourceSha }}');
  assert.strictEqual(suiteJob.variables.ExpectedCheckoutRef, '${{ parameters.checkoutRef }}');
  assert.strictEqual(suiteJob.variables.ExpectedProducerRunId, '${{ parameters.expectedProducerRunId }}');
  assert.strictEqual(suiteJob.variables.ExpectedProducerDefinitionId, '${{ parameters.expectedProducerDefinitionId }}');
  assert.strictEqual(suiteJob.variables.ExpectedRepositoryName, '${{ parameters.expectedRepositoryName }}');
  assert.strictEqual(suiteJob.variables.ExpectedRepositoryUri, '${{ parameters.expectedRepositoryUri }}');

  const executionText = collectExecutionStrings(suiteJob.steps).join('\n');
  assert.doesNotMatch(executionText, /\$\{\{ parameters\.expectedSourceSha \}\}/);
  assert.doesNotMatch(executionText, /\$\{\{ parameters\.checkoutRef \}\}/);
  assert.doesNotMatch(executionText, /\$\{\{ parameters\.expectedProducerRunId \}\}/);
  assert.doesNotMatch(executionText, /\$\{\{ parameters\.expectedProducerDefinitionId \}\}/);
  assert.doesNotMatch(executionText, /\$\{\{ parameters\.expectedRepositoryName \}\}/);
  assert.doesNotMatch(executionText, /\$\{\{ parameters\.expectedRepositoryUri \}\}/);
  assert.match(executionText, /\$\(ExpectedSourceSha\)/);
  assert.match(executionText, /\$\(ExpectedCheckoutRef\)/);
  assert.match(executionText, /\$\(ExpectedProducerRunId\)/);
  assert.match(executionText, /\$\(ExpectedProducerDefinitionId\)/);
  assert.match(executionText, /\$\(ExpectedRepositoryName\)/);
  assert.match(executionText, /\$\(ExpectedRepositoryUri\)/);
}

function collectExecutionStrings(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectExecutionStrings(entry));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  const current = [];
  for (const key of ['bash', 'pwsh', 'script']) {
    if (typeof value[key] === 'string') {
      current.push(value[key]);
    }
  }
  if (value.task === 'AzureCLI@2' && typeof value.inputs?.inlineScript === 'string') {
    current.push(value.inputs.inlineScript);
  }
  return [...current, ...Object.values(value).flatMap((entry) => collectExecutionStrings(entry))];
}

function assertConsumerParameterGuardRejectsMutations(consumer) {
  const mutate = (mutator) => {
    const clone = structuredClone(consumer);
    mutator(clone);
    return clone;
  };

  assert.throws(
    () =>
      assertConsumerPublicParametersAreMinimal(
        mutate((copy) => {
          copy.parameters.push({ name: 'expectedProducerRunId', type: 'string', default: '' });
        })
      ),
    /consumer Run pipeline surface must expose only genuine topology\/OS\/suite selectors/
  );
  assert.throws(
    () =>
      assertConsumerPublicParametersAreMinimal(
        mutate((copy) => {
          copy.parameters.unshift({ name: 'variableGroups', type: 'object', default: [] });
        })
      ),
    /consumer Run pipeline surface must expose only genuine topology\/OS\/suite selectors/
  );
  assert.throws(
    () =>
      assertConsumerCurrentRunArtifactContract(
        mutate((copy) => {
          copy.resources.pipelines = [{ pipeline: 'producer', source: 'vscode-azurelogicapps' }];
        })
      ),
    /consumer must not require manual pipeline resource selection/
  );
  assert.throws(
    () =>
      assertConsumerCurrentRunArtifactContract(
        mutate((copy) => {
          const invocation = flattenAzureList(copy.extends.parameters.stages[0].jobs).find((entry) => entry.template);
          invocation.parameters.expectedProducerDefinitionId = '24067';
        })
      ),
    /Expected values to be strictly equal/
  );
}

function assertNoGuidLiteralsInExplicitPipelineDocs(...texts) {
  const guidPattern = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  for (const text of texts) {
    assert.doesNotMatch(text, guidPattern);
  }
}

function assertGuidGuardRejectsMutations(text) {
  assert.throws(
    () =>
      assertNoGuidLiteralsInExplicitPipelineDocs(`${text}\n  - name: azureTenantId\n    default: 00000000-0000-4000-8000-000000000001\n`),
    /expected to not match/
  );
  assert.throws(
    () => assertNoGuidLiteralsInExplicitPipelineDocs(`${text}\nLA_E2E_CLI_AZURE_TENANT_ID: 00000000-0000-4000-8000-000000000002\n`),
    /expected to not match/
  );
}

function assertConsumerJobRoutingContract(consumer, runSuites) {
  const stages = consumer.extends.parameters.stages;
  assert.strictEqual(stages.length, 1);
  const jobs = flattenAzureList(stages[0].jobs).filter((entry) => entry.job || entry.template);
  const directJobs = jobs.filter((entry) => entry.job);
  const templateJobs = jobs.filter((entry) => entry.template);

  assert.deepStrictEqual(
    directJobs.map((entry) => entry.job).sort(),
    [
      'build_current_run_e2e_artifact',
      'report_diagnostic_selected_rerun',
      'resolve_consumer_context',
      'seed_windows_pnpm_store',
      'verify_both_os_full_rollup',
    ].sort()
  );
  for (const job of directJobs) {
    if (job.job === 'build_current_run_e2e_artifact') {
      assert.strictEqual(job.templateContext?.type, undefined, `${job.job} must be an ordinary output-producing job`);
      assert.strictEqual(job.templateContext.outputs.length, 1, `${job.job} must preserve its current-run artifact output`);
      assert.strictEqual(job.templateContext.outputs[0].output, 'pipelineArtifact');
      assert.strictEqual(job.templateContext.outputs[0].artifactName, 'vscode-e2e-build');
      assert.strictEqual(job.templateContext.outputs[0].targetPath, '$(Build.ArtifactStagingDirectory)/vscode-e2e');
      assert.strictEqual(
        job.templateContext.outputs[0].isProduction,
        undefined,
        `${job.job} must preserve default artifact classification`
      );
      assert.strictEqual(job.templateContext.outputs[0].sbomEnabled, undefined, `${job.job} must preserve default SBOM handling`);
      continue;
    }
    assert.strictEqual(job.templateContext?.type, 'validationJob', `${job.job} must be a no-output validationJob`);
    assert.strictEqual(job.templateContext.outputs, undefined, `${job.job} must not publish artifacts from a validationJob`);
  }

  assert.strictEqual(templateJobs.length, 25);
  assert.strictEqual(
    templateJobs.filter((invocation) => invocation.template === '/.config/templates/vscode-e2e-cli-run-suite.yml@self').length,
    21
  );
  assert.strictEqual(
    templateJobs.filter((invocation) => invocation.template === '/.config/templates/vscode-e2e-cli-run-cohort.yml@self').length,
    4
  );

  assert.strictEqual(runSuites.jobs.length, 1);
  const suiteJob = runSuites.jobs[0];
  assert.strictEqual(suiteJob.templateContext?.type, undefined, 'suite jobs must be ordinary output-producing jobs');
  assert.strictEqual(suiteJob.templateContext.outputs.length, 1, 'suite jobs must preserve diagnostic artifact outputs');
  assert.deepStrictEqual(
    suiteJob.templateContext.outputs.map((output) => output.output),
    ['pipelineArtifact']
  );
  assert.strictEqual(suiteJob.templateContext.outputs[0].artifactName, 'vscode-e2e-cli-diagnostics-${{ parameters.artifactName }}');
  assert.strictEqual(
    suiteJob.templateContext.outputs[0].targetPath,
    '$(Build.ArtifactStagingDirectory)/vscode-e2e-cli/${{ parameters.artifactName }}'
  );
  assert.strictEqual(
    suiteJob.templateContext.outputs[0].isProduction,
    undefined,
    'suite diagnostic output must preserve default artifact classification'
  );
  assert.strictEqual(
    suiteJob.templateContext.outputs[0].sbomEnabled,
    undefined,
    'suite diagnostic output must preserve default SBOM handling'
  );
}

function assertRunSuitesProvisionsTrustedNodeBeforeVerifier(runSuites) {
  const steps = runSuites.jobs[0].steps;
  const checkoutIndex = steps.findIndex((step) => step.checkout === 'self');
  const nodeToolIndex = steps.findIndex((step) => step.task === 'UseNode@1' && step.inputs?.version === '${{ parameters.nodeVersion }}');
  const nodeVersionIndex = steps.findIndex(
    (step) => step.pwsh === 'node --version' && step.displayName === 'Print E2E artifact admission Node.js version'
  );
  const captureVerifierIndex = steps.findIndex((step) => step.displayName === 'Capture trusted artifact verifier before source checkout');
  const verifyArtifactIndex = steps.findIndex((step) => step.displayName === 'Verify current-run E2E artifact admission');
  const fullSetupIndex = steps.findIndex((step) => step.template === '/.azure-pipelines/templates/vscode-e2e-cli-setup.yml@self');

  assert.ok(checkoutIndex >= 0, 'suite job must start from repository checkout');
  assert.ok(nodeToolIndex > checkoutIndex, 'NodeTool must run after checkout');
  assert.ok(nodeVersionIndex > nodeToolIndex, 'node --version evidence must run after NodeTool');
  assert.ok(captureVerifierIndex > nodeVersionIndex, 'trusted verifier capture must happen after trusted Node is available');
  assert.ok(verifyArtifactIndex > captureVerifierIndex, 'artifact verification must happen after verifier capture');
  assert.ok(
    fullSetupIndex > verifyArtifactIndex,
    'full pnpm/.NET setup and restored-code execution must remain after artifact admission verification'
  );
}

function assertCliBuildCompilesPrepHarnessBeforeArchive(cliBuildArtifacts) {
  const steps = cliBuildArtifacts.steps;
  const cliBuildIndex = steps.findIndex((step) => step.displayName === 'Build extension and compile @vscode/test-cli E2E');
  const prepCompileIndex = steps.findIndex(
    (step) => step.displayName === 'Compile ExTester dependency-prep bundle' && step.script === 'npx tsup --config tsup.e2e.test.config.ts'
  );
  const archiveIndex = steps.findIndex((step) => step.displayName === 'Stage reusable @vscode/test-cli build artifact');

  assert.ok(cliBuildIndex >= 0, 'artifact builder must compile the @vscode/test-cli payload');
  assert.ok(prepCompileIndex > cliBuildIndex, 'ExTester dependency-prep bundle must compile after @vscode/test-cli build');
  assert.ok(archiveIndex > prepCompileIndex, 'archive staging must happen after the dependency-prep harness is built');
}

function assertConsumerJobRoutingGuardRejectsMutations(consumer, runSuites) {
  const mutate = (value, mutator) => {
    const clone = structuredClone(value);
    mutator(clone);
    return clone;
  };
  const expectRejection = (description, mutatedConsumer, mutatedRunSuites, pattern) => {
    assert.throws(() => assertConsumerJobRoutingContract(mutatedConsumer ?? consumer, mutatedRunSuites ?? runSuites), pattern, description);
  };

  expectRejection(
    'shared context job must not lose validationJob type',
    mutate(consumer, (copy) => {
      const job = getConsumerDirectJob(copy, 'resolve_consumer_context');
      delete job.templateContext.type;
    }),
    null,
    /resolve_consumer_context must be a no-output validationJob/
  );
  expectRejection(
    'current-run artifact build job must remain ordinary output-producing job',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'build_current_run_e2e_artifact').templateContext.type = 'validationJob';
    }),
    null,
    /build_current_run_e2e_artifact must be an ordinary output-producing job/
  );
  expectRejection(
    'current-run artifact build job must reject other explicit job types',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'build_current_run_e2e_artifact').templateContext.type = 'buildJob';
    }),
    null,
    /build_current_run_e2e_artifact must be an ordinary output-producing job/
  );
  expectRejection(
    'current-run artifact output must remain enabled',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'build_current_run_e2e_artifact').templateContext.outputs = [];
    }),
    null,
    /build_current_run_e2e_artifact must preserve its current-run artifact output/
  );
  expectRejection(
    'current-run artifact output kind must remain pipelineArtifact',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'build_current_run_e2e_artifact').templateContext.outputs[0].output = 'buildArtifacts';
    }),
    null,
    /Expected values to be strictly equal/
  );
  expectRejection(
    'current-run artifact output must preserve default artifact classification',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'build_current_run_e2e_artifact').templateContext.outputs[0].isProduction = false;
    }),
    null,
    /build_current_run_e2e_artifact must preserve default artifact classification/
  );
  expectRejection(
    'current-run artifact output must preserve default SBOM handling',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'build_current_run_e2e_artifact').templateContext.outputs[0].sbomEnabled = false;
    }),
    null,
    /build_current_run_e2e_artifact must preserve default SBOM handling/
  );
  expectRejection(
    'full-rollup coordinator must reject wrong job type',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'verify_both_os_full_rollup').templateContext.type = 'buildJob';
    }),
    null,
    /verify_both_os_full_rollup must be a no-output validationJob/
  );
  expectRejection(
    'no-output validation jobs must reject artifact outputs',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'verify_both_os_full_rollup').templateContext.outputs = [
        { output: 'pipelineArtifact', targetPath: '$(Build.ArtifactStagingDirectory)/unexpected', artifactName: 'unexpected' },
      ];
    }),
    null,
    /verify_both_os_full_rollup must not publish artifacts from a validationJob/
  );
  expectRejection(
    'suite template job must remain ordinary output-producing job',
    null,
    mutate(runSuites, (copy) => {
      copy.jobs[0].templateContext.type = 'validationJob';
    }),
    /suite jobs must be ordinary output-producing jobs/
  );
  expectRejection(
    'suite template job must reject other explicit job types',
    null,
    mutate(runSuites, (copy) => {
      copy.jobs[0].templateContext.type = 'deploymentJob';
    }),
    /suite jobs must be ordinary output-producing jobs/
  );
  expectRejection(
    'unexpected deployment job must not be ignored',
    mutate(consumer, (copy) => {
      copy.extends.parameters.stages[0].jobs.push({
        deployment: 'deploy_accidentally_added',
        templateContext: { type: 'deploymentJob' },
      });
    }),
    null,
    /Unsupported consumer job shape/
  );
  expectRejection(
    'diagnostic artifact outputs must remain enabled',
    null,
    mutate(runSuites, (copy) => {
      copy.jobs[0].templateContext.outputs = [];
    }),
    /suite jobs must preserve diagnostic artifact outputs/
  );
  expectRejection(
    'diagnostic artifact output must preserve default artifact classification',
    null,
    mutate(runSuites, (copy) => {
      copy.jobs[0].templateContext.outputs[0].isProduction = false;
    }),
    /suite diagnostic output must preserve default artifact classification/
  );
  expectRejection(
    'diagnostic artifact output must preserve default SBOM handling',
    null,
    mutate(runSuites, (copy) => {
      copy.jobs[0].templateContext.outputs[0].sbomEnabled = false;
    }),
    /suite diagnostic output must preserve default SBOM handling/
  );
  expectRejection(
    'OS suite template invocation must remain the vetted template',
    mutate(consumer, (copy) => {
      const invocation = flattenAzureList(copy.extends.parameters.stages[0].jobs).find((entry) => entry.template);
      invocation.template = '/.azure-pipelines/templates/vscode-e2e-stage.yml@self';
    }),
    null,
    /Expected values to be strictly equal/
  );
}

function assertConsumerHasNoNetworkIsolationPolicyOverride(consumer, runSuites) {
  const overridePaths = [
    ...findYamlKeyPaths(consumer, 'networkIsolationPolicy', ['.config/vscode-e2e-cli.1es.yml']),
    ...findYamlKeyPaths(runSuites, 'networkIsolationPolicy', ['.config/templates/vscode-e2e-cli-run-suite.yml']),
  ];

  assert.deepStrictEqual(
    overridePaths,
    [],
    `consumer must not set explicit networkIsolationPolicy override(s): ${overridePaths.join(', ')}`
  );
}

function assertNetworkIsolationGuardRejectsMutations(consumer, runSuites) {
  const mutate = (value, mutator) => {
    const clone = structuredClone(value);
    mutator(clone);
    return clone;
  };

  assert.throws(
    () =>
      assertConsumerHasNoNetworkIsolationPolicyOverride(
        mutate(consumer, (copy) => {
          copy.extends.parameters.settings = { networkIsolationPolicy: 'Permissive,CFSClean' };
        }),
        runSuites
      ),
    /consumer must not set explicit networkIsolationPolicy override/
  );
  assert.throws(
    () =>
      assertConsumerHasNoNetworkIsolationPolicyOverride(
        consumer,
        mutate(runSuites, (copy) => {
          copy.jobs[0].templateContext.settings = { networkIsolationPolicy: 'Permissive' };
        })
      ),
    /consumer must not set explicit networkIsolationPolicy override/
  );
}

function testAzureCliIdentityScriptBehavior() {
  if (process.env.PIPELINE_CONTRACT_RUN_SHELL_PROBES !== '1') {
    console.log('[pipeline-contract.unit] shell identity probes not run; set PIPELINE_CONTRACT_RUN_SHELL_PROBES=1 for strict execution.');
    return;
  }

  assertCommandAvailable('pwsh');
  assertCommandAvailable('bash');

  const runSuites = parseYaml('.config/templates/vscode-e2e-cli-run-suite.yml');
  const legacyRunCli = parseYaml('.azure-pipelines/templates/vscode-e2e-run-cli.yml');
  const legacyStandaloneRunCli = parseYaml('.azure-pipelines/templates/vscode-e2e-cli-run.yml');
  const scripts = [
    {
      name: 'current-linux',
      shell: 'bash',
      invokesRunner: true,
      script: getAzureCliInlineScript(runSuites, { scriptType: 'bash', displayName: /Run vscode-test CLI/ }),
    },
    {
      name: 'current-windows',
      shell: 'pwsh',
      invokesRunner: true,
      script: getAzureCliInlineScript(runSuites, { scriptType: 'pscore', displayName: /Run vscode-test CLI/ }),
    },
    {
      name: 'legacy-staged',
      shell: 'pwsh',
      invokesRunner: false,
      script: getAzureCliInlineScript(legacyRunCli, { scriptType: 'pscore', displayName: /Verify test service connection/ }),
    },
    {
      name: 'legacy-standalone',
      shell: 'bash',
      invokesRunner: false,
      script: getAzureCliInlineScript(legacyStandaloneRunCli, { scriptType: 'bash', displayName: /Mint ARM token for VS Code E2E/ }),
    },
  ].map((script) => prepareInlineScriptForUnit(script));

  try {
    for (const script of scripts) {
      const valid = runIdentityScript(script);
      assert.strictEqual(valid.status, 0, `${script.name}: ${valid.output}`);
      if (script.invokesRunner) {
        assert.ok(fs.existsSync(valid.runnerMarker), `${script.name}: valid identity must invoke runner`);
      }
    }

    const failureCases = [
      { AZ_STUB_FAIL: '1', AZ_STUB_STDOUT: '00000000-0000-4000-8000-000000000010' },
      { tenantId: '' },
      { tenantId: '00000000-0000-4000-8000-000000000011' },
      { AZ_STUB_TENANT: 'not-a-guid', tenantId: 'not-a-guid' },
      { AZ_STUB_SUBSCRIPTION: '' },
    ];
    for (const script of scripts) {
      for (const overrides of failureCases) {
        const failed = runIdentityScript(script, overrides);
        assert.notStrictEqual(failed.status, 0, `${script.name}: identity script should reject ${JSON.stringify(Object.keys(overrides))}`);
        assert.ok(!fs.existsSync(failed.runnerMarker), `${script.name}: runner must not be invoked after identity validation failure`);
      }
    }
  } finally {
    for (const script of scripts) {
      fs.rmSync(script.tempRoot, { recursive: true, force: true });
    }
  }
}

function assertCommandAvailable(command) {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`PIPELINE_CONTRACT_RUN_SHELL_PROBES=1 requires ${command} on PATH: ${error.message}`);
  }
}

function getAzureCliInlineScript(yamlObject, { scriptType, displayName }) {
  const task = findAzureCliTasks(yamlObject).find(
    (candidate) => candidate.inputs?.scriptType === scriptType && displayName.test(candidate.displayName ?? '')
  );
  assert.ok(task, `Expected AzureCLI@2 ${scriptType} task matching ${displayName}`);
  assert.ok(task.inputs?.inlineScript, `Expected inlineScript for ${task.displayName}`);
  return task.inputs.inlineScript;
}

function findAzureCliTasks(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => findAzureCliTasks(entry));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  const current = value.task === 'AzureCLI@2' ? [value] : [];
  return [...current, ...Object.values(value).flatMap((entry) => findAzureCliTasks(entry))];
}

function prepareInlineScriptForUnit({ name, shell, script, invokesRunner }) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-contract-identity-'));
  const sourcesDirectory = path.join(tempRoot, 'sources');
  const agentTempDirectory = path.join(tempRoot, 'agent-temp');
  fs.mkdirSync(path.join(sourcesDirectory, 'apps', 'vs-code-designer'), { recursive: true });
  fs.mkdirSync(agentTempDirectory, { recursive: true });
  const sourceMacroValue = shell === 'bash' ? sourcesDirectory.replace(/\\/g, '/') : sourcesDirectory;
  const agentTempMacroValue = shell === 'bash' ? agentTempDirectory.replace(/\\/g, '/') : agentTempDirectory;
  let prepared = script
    .replaceAll('${{ parameters.azureResourceGroupName }}', 'LogicAppsVSCode-E2E-Fixtures')
    .replaceAll('${{ parameters.requiresAzureAccessToken }}', 'True')
    .replaceAll('${{ parameters.artifactName }}', 'unitTests')
    .replaceAll('${{ parameters.suiteId }}', 'unitTests')
    .replaceAll('${{ parameters.shortName }}', 'ut')
    .replaceAll('${{ parameters.suites }}', 'unitTests')
    .replaceAll('$(Build.SourcesDirectory)', sourceMacroValue)
    .replaceAll('$(Agent.TempDirectory)', agentTempMacroValue);
  return { name, shell, script: prepared, tempRoot, invokesRunner };
}

function runIdentityScript(scriptInfo, overrides = {}) {
  const runnerMarker = path.join(scriptInfo.tempRoot, `runner-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  const env = {
    ...process.env,
    AZURESUBSCRIPTION_SERVICE_CONNECTION_ID: 'service-connection-id',
    servicePrincipalId: 'service-principal-id',
    tenantId: '00000000-0000-4000-8000-000000000010',
    AZ_STUB_SUBSCRIPTION: '00000000-0000-4000-8000-000000000020',
    AZ_STUB_TENANT: '00000000-0000-4000-8000-000000000010',
    AZ_STUB_TOKEN: 'stub-token',
    LA_E2E_CLI_DIRECT_ARGS: '--label unitTests',
    RUNNER_MARKER: runnerMarker,
    ...overrides,
  };
  const command =
    scriptInfo.shell === 'bash'
      ? `
az() {
  local joined="$*"
  if [[ "\${AZ_STUB_FAIL:-}" == "1" ]]; then
    if [[ -n "\${AZ_STUB_STDOUT:-}" ]]; then printf '%s\\n' "$AZ_STUB_STDOUT"; fi
    return 1
  fi
  if [[ "$joined" == *"account show"* && "$joined" == *"tenantId"* ]]; then
    printf '%s\\n' "\${AZ_STUB_TENANT:-}"
    return 0
  fi
  if [[ "$joined" == *"account show"* && "$joined" == *"--query id"* ]]; then
    printf '%s\\n' "\${AZ_STUB_SUBSCRIPTION:-}"
    return 0
  fi
  if [[ "$joined" == *"get-access-token"* ]]; then
    printf '%s\\n' "\${AZ_STUB_TOKEN:-}"
    return 0
  fi
  echo 'Unexpected az invocation' >&2
  return 1
}
node() {
  printf 'runner invoked\\n' > "$RUNNER_MARKER"
  return 0
}
xvfb-run() {
  while [[ "$#" -gt 0 && "$1" == --* ]]; do
    shift
  done
  "$@"
}
bash() {
  if [[ "$1" == scripts/run-e2e-cli-linux-secure-session.sh ]]; then
    shift
    "$@"
  else
    command bash "$@"
  fi
}
${scriptInfo.script}
`
      : `
function az {
  $joined = $args -join ' '
  if ($env:AZ_STUB_FAIL -eq '1') {
    if ($env:AZ_STUB_STDOUT) { Write-Output $env:AZ_STUB_STDOUT }
    $global:LASTEXITCODE = 1
    return
  }
  if ($joined -match 'account show' -and $joined -match 'tenantId') {
    Write-Output $env:AZ_STUB_TENANT
    $global:LASTEXITCODE = 0
    return
  }
  if ($joined -match 'account show' -and $joined -match '--query id') {
    Write-Output $env:AZ_STUB_SUBSCRIPTION
    $global:LASTEXITCODE = 0
    return
  }
  if ($joined -match 'get-access-token') {
    Write-Output $env:AZ_STUB_TOKEN
    $global:LASTEXITCODE = 0
    return
  }
  throw "Unexpected az invocation"
}
function node {
  "runner invoked" | Set-Content -Path $env:RUNNER_MARKER
  $global:LASTEXITCODE = 0
}
${scriptInfo.script}
`;
  try {
    const executable = scriptInfo.shell === 'bash' ? 'bash' : 'pwsh';
    const args = scriptInfo.shell === 'bash' ? ['-euo', 'pipefail', '-c', command] : ['-NoProfile', '-NonInteractive', '-Command', command];
    const output = execFileSync(executable, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      env,
      stdio: 'pipe',
    });
    return { status: 0, output, runnerMarker };
  } catch (error) {
    return {
      status: error.status ?? 1,
      output: `${error.stdout?.toString() ?? ''}${error.stderr?.toString() ?? ''}`,
      runnerMarker,
    };
  }
}

function findYamlKeyPaths(value, targetKey, pathParts = []) {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => findYamlKeyPaths(entry, targetKey, [...pathParts, `[${index}]`]));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = [...pathParts, key];
    const matches = key === targetKey ? [childPath.join('.')] : [];
    return [...matches, ...findYamlKeyPaths(child, targetKey, childPath)];
  });
}

function getConsumerDirectJob(consumer, jobName) {
  const job = flattenAzureList(consumer.extends.parameters.stages[0].jobs).find((entry) => entry.job === jobName);
  assert.ok(job, `Expected consumer job ${jobName}`);
  return job;
}

function flattenAzureList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenAzureList(entry));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  if (value.deployment) {
    throw new Error(`Unsupported consumer job shape: deployment ${value.deployment}`);
  }
  if (value.job || value.template) {
    return [value];
  }
  return Object.values(value).flatMap((entry) => flattenAzureList(entry));
}

function testPipelineSafetyGuards() {
  const stagedReleaseEntry = read('.config/release.yml');

  assert.match(stagedReleaseEntry, /dryRun: true/);
  assert.doesNotMatch(stagedReleaseEntry, /dryRun: \$\{\{ parameters\.dryRun \}\}/);
  assert.match(stagedReleaseEntry, /values:\s*\n\s*- VSCodeDeployLAUX/);
  assert.match(stagedReleaseEntry, /releaseApprovalEnvironment: \$\{\{ parameters\.releaseApprovalEnvironment \}\}/);
}

function testDiagnosticsStagingScriptHandlesDirectSuiteLayout(options = {}) {
  const runSuitesTemplate = read('.config/templates/vscode-e2e-cli-run-suite.yml');
  const script = extractStageDiagnosticsScript(runSuitesTemplate);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-contract-staging-'));
  try {
    const sourcesDirectory = path.join(tempRoot, 'sources');
    const agentTempDirectory = path.join(tempRoot, 'agent-temp');
    const artifactStagingDirectory = path.join(tempRoot, 'artifact-staging');
    const artifactName = 'linux-unit-tests';
    const suiteId = options.msn ? 'msnWeatherLifecycle' : options.privatePlatform ? 'createWorkspaceCoreMatrix' : 'unitTests';
    const resultRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'results');
    const ogfScenarios = options.privatePlatform
      ? getOgfScenariosForPhase('createWorkspaceCoreMatrix:standard-stateful', {
          passed: true,
          executedVariant: 'standard-stateful',
          platform: options.privatePlatform,
          vscodeVersion: '1.140.0',
          sourceVersion: 'a'.repeat(40),
          buildId: '42',
        })
      : options.msn
        ? []
        : [
            {
              scenarioId: 'ogf-launch-config-generated-name-standard-stateful',
              executedVariant: 'standard-stateful',
              assertionIdentities: ['launch-configuration-name-ends-with-created-logic-app-name'],
            },
          ];
    if (options.privatePlatform || options.msn) {
      const scriptsRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', 'scripts');
      fs.mkdirSync(scriptsRoot, { recursive: true });
      fs.mkdirSync(agentTempDirectory, { recursive: true });
      for (const file of [
        'enrich-e2e-traceability.js',
        'ogf-e2e-registry.js',
        'e2e-cli-batch.js',
        'e2e-cli-terminal.js',
        'workspace-prompt-cancel.js',
      ]) {
        fs.copyFileSync(path.join(__dirname, file), path.join(scriptsRoot, file));
      }
      const scenario = OGF_E2E_SCENARIOS[0];
      fs.writeFileSync(
        path.join(agentTempDirectory, `e2e-traceability-crosswalk-${suiteId}.json`),
        JSON.stringify({
          schemaVersion: 1,
          workspacePromptCancel: {
            scenarioId: 'workspace-prompt-cancel',
            source: {
              system: 'tracking.example.test',
              caseId: 812,
              caseRevision: 3,
              stepMappings: [{ stepId: 'synthetic', stepOrdinal: 4 }],
            },
          },
          scenarios: [
            {
              scenarioId: scenario.scenarioId,
              suiteId: scenario.suiteId,
              expectedPhase: scenario.expectedPhase,
              executedVariant: scenario.executedVariant,
              assertionIdentities: scenario.assertions,
              source: {
                system: 'tracking.example.test',
                caseId: 812,
                caseRevision: 3,
                stepMappings: [{ stepId: 'synthetic', stepOrdinal: 4 }],
              },
            },
          ],
        })
      );
    }
    fs.mkdirSync(resultRoot, { recursive: true });
    const msnJournalName = 'msnWeatherLifecycle.phases-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jsonl';
    const cleanupReportName = 'msnWeatherLifecycle.cleanup-finalization.txt';
    fs.writeFileSync(path.join(resultRoot, cleanupReportName), 'Error: EPERM cleanup Authorization: Bearer raw-cleanup-token\n');
    if (options.msn) {
      fs.writeFileSync(path.join(resultRoot, msnJournalName), '{"phaseId":"msnWeatherLifecycle:run","complete":true}\n');
    }
    fs.writeFileSync(
      path.join(resultRoot, `${suiteId}.json`),
      `${JSON.stringify({ label: suiteId, outcome: 'success', total: options.msn ? 1 : options.privatePlatform ? 6 : 12, passing: options.msn ? 1 : options.privatePlatform ? 6 : 12, failing: 0, pending: 0, ogfScenarios })}\n`
    );
    fs.writeFileSync(path.join(resultRoot, `${suiteId}.junit.xml`), '<testsuite tests="12" failures="0" />\n');
    fs.writeFileSync(path.join(resultRoot, `${suiteId}.summary.md`), '# summary\n');
    fs.writeFileSync(
      path.join(resultRoot, `${suiteId}.terminal-result.json`),
      `${JSON.stringify({
        label: suiteId,
        complete: true,
        lifecycleFinalized: options.msn ? true : undefined,
        cleanupVerified: true,
        exitCode: 0,
        ogfScenarios,
        phaseResults: SUITE_REGISTRY[suiteId].expectedPhases.map((phaseId) => ({
          phaseId,
          complete: true,
          cleanupVerified: true,
          exitCode: 0,
        })),
        ...(options.msn ? { phaseResultsPath: path.join(resultRoot, msnJournalName) } : {}),
        ...options.terminalOverride,
      })}\n`
    );
    if (options.omitTerminal) {
      fs.unlinkSync(path.join(resultRoot, `${suiteId}.terminal-result.json`));
    }
    fs.writeFileSync(path.join(resultRoot, `${suiteId}.cleanup-ledger.json`), '{"privateProcessIds":[1234]}\n');
    fs.writeFileSync(
      path.join(resultRoot, `admission-context-${suiteId}.json`),
      JSON.stringify({ sourceSHA: 'a'.repeat(40), resolvedVSCodeBuild: options.admissionVersion || '1.140.0' })
    );
    fs.writeFileSync(
      path.join(resultRoot, `${suiteId}.log`),
      'Authorization: Bearer raw-token https://example.test/callback?sig=secret-sas\n'
    );

    const vscodeLogsRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'vscode-logs', 'cli', suiteId);
    const screenshotsRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'screenshots', 'cli', suiteId);
    const workspaceSnapshotsRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'generated-workspaces', suiteId);
    fs.mkdirSync(vscodeLogsRoot, { recursive: true });
    fs.mkdirSync(workspaceSnapshotsRoot, { recursive: true });
    fs.writeFileSync(path.join(vscodeLogsRoot, 'profile.log'), 'already redacted log\n');
    const screenshotFixture = writeScreenshotSidecarFixture(screenshotsRoot);
    fs.writeFileSync(path.join(workspaceSnapshotsRoot, 'index.md'), '# redacted workspace\n');
    if (options.privatePlatform) {
      const cancelRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'workspace-cancel');
      fs.mkdirSync(path.join(cancelRoot, 'screenshots'), { recursive: true });
      fs.mkdirSync(path.join(cancelRoot, 'vscode-logs'));
      fs.writeFileSync(path.join(cancelRoot, 'code.log'), 'synthetic contract log, not real UI\n');
      fs.writeFileSync(path.join(cancelRoot, 'cancel.log'), 'synthetic contract log\n');
      for (const name of ['invocation.json', 'wizard-handoff.json']) {
        fs.writeFileSync(
          path.join(cancelRoot, name),
          JSON.stringify({
            schemaVersion: 1,
            invocation: 'unit-owned-staging-only',
            identity: { source: 'a'.repeat(40), run: '42', job: 'contract', platform: options.privatePlatform },
            launch: { executable: 'unit-owned-not-Code', sha256: 'b'.repeat(64) },
            entries: [{ fixture: 'unit-owned-staging-only' }],
          })
        );
      }
      if (options.omitCancelMetadata) {
        fs.unlinkSync(path.join(cancelRoot, options.omitCancelMetadata));
      }
      const names = ['open-folder', 'before', 'after', 'preceding-no'];
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1kAAAAASUVORK5CYII=', 'base64');
      for (const name of names) {
        fs.writeFileSync(path.join(cancelRoot, 'screenshots', `workspace-prompt-cancel-ui-${name}.png`), png);
        fs.writeFileSync(
          path.join(cancelRoot, 'screenshots', `workspace-prompt-cancel-ui-${name}.json`),
          JSON.stringify({
            schemaVersion: 1,
            checkpoint: `workspace-prompt-cancel-ui-${name}`,
            classification: 'evidence',
            verdict: 'accepted',
            target: { owner: 'workbench', opaqueTargetId: 'id-unit', opaqueFrameId: 'id-unit', generation: 1 },
            timing: { samples: 3, captureAttempts: 1 },
            geometry: { viewport: { width: 1, height: 1 } },
            events: [{ name: 'accepted', attempt: 1, generation: 1 }],
          })
        );
      }
      const screenshots = require('./workspace-prompt-cancel').assertRequiredScreenshots(cancelRoot);
      const unitBaseline = {
        files: Array.from({ length: 8 }, (_, index) => ({ name: `unit-${index}.json`, sha256: 'a'.repeat(64) })),
        entries: { app: ['workflow'], vscode: ['launch.json'], workspace: ['app'] },
      };
      fs.writeFileSync(
        path.join(cancelRoot, 'final-result.json'),
        JSON.stringify({
          schemaVersion: 1,
          scenario: 'workspace-prompt-cancel',
          invocationCount: 1,
          complete: true,
          errors: [],
          identity: { source: 'a'.repeat(40), run: '42', job: 'contract', platform: options.privatePlatform },
          code: { version: '1.140.0', sha256: 'c'.repeat(64) },
          observation: {
            realCancelMouseInput: true,
            realPrecedingNoMouseInput: true,
            noReload: true,
            samples: 7,
            initialFiles: unitBaseline.files,
            initialDirectories: unitBaseline.entries,
            postNoDirectories: unitBaseline.entries,
            before: unitBaseline,
            after: unitBaseline,
          },
          originalCodeClose: { code: 0, signal: null },
          cleanup: { verified: true },
          screenshots,
        })
      );
    }
    const processEvidenceRoot = path.join(
      sourcesDirectory,
      'apps',
      'vs-code-designer',
      '.vscode-test',
      'lifecycle',
      suiteId,
      'msn-weather-lifecycle'
    );
    const processNames = ['owned-processes-fixture.before-teardown.json', 'owned-processes-fixture.after-teardown.json'];
    fs.mkdirSync(processEvidenceRoot, { recursive: true });
    for (const name of processNames) {
      fs.writeFileSync(path.join(processEvidenceRoot, name), '{"processExitVerified":false,"filesystemCleanupVerified":false}\n');
    }
    fs.writeFileSync(path.join(processEvidenceRoot, 'unrelated.json'), '{"mustNotStage":true}\n');
    const lockObservationName = 'msn-cleanup-observations-control';
    const lockObservationDir = path.join(processEvidenceRoot, lockObservationName);
    fs.mkdirSync(lockObservationDir);
    fs.writeFileSync(path.join(lockObservationDir, 'before-task-teardown.json'), '{"originalProcessClosureVerified":false}\n');

    const stage = () =>
      execFileSync(
        'pwsh',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          script
            .replaceAll('$(Build.ArtifactStagingDirectory)', artifactStagingDirectory)
            .replaceAll('$(Build.SourcesDirectory)', sourcesDirectory)
            .replaceAll('$(Agent.TempDirectory)', agentTempDirectory)
            .replaceAll('$(Build.BuildId)', '42')
            .replaceAll(
              '${{ parameters.platform }}',
              options.admittedPlatform || (options.privatePlatform === 'win32' ? 'windows' : 'linux')
            )
            .replaceAll('${{ parameters.artifactName }}', artifactName)
            .replaceAll('${{ parameters.suiteId }}', suiteId),
        ],
        { stdio: 'pipe', env: { ...process.env, BUILD_SOURCEVERSION: 'a'.repeat(40), BUILD_BUILDID: '42', SYSTEM_JOBID: 'contract' } }
      );
    if (options.expectedPrivateFailure) {
      assert.throws(stage, new RegExp(options.expectedPrivateFailure));
      const failedDiagnosticsRoot = path.join(artifactStagingDirectory, 'vscode-e2e-cli', artifactName);
      assert.ok(fs.existsSync(path.join(failedDiagnosticsRoot, 'results', `${suiteId}.json`)));
      assert.ok(fs.existsSync(path.join(failedDiagnosticsRoot, 'log', `${suiteId}.log`)));
      assert.ok(
        !fs.existsSync(path.join(artifactStagingDirectory, 'vscode-e2e-cli', artifactName, 'private-traceability', `${suiteId}.json`))
      );
      if (options.msn) {
        const stagedCleanup = fs.readFileSync(path.join(failedDiagnosticsRoot, 'log', cleanupReportName), 'utf8');
        assert.match(stagedCleanup, /EPERM cleanup/);
        assert.doesNotMatch(stagedCleanup, /raw-cleanup-token/);
        if (!options.omitTerminal) {
          assert.strictEqual(
            fs.readFileSync(path.join(failedDiagnosticsRoot, 'log', msnJournalName), 'utf8'),
            fs.readFileSync(path.join(resultRoot, msnJournalName), 'utf8')
          );
        }
        assert.strictEqual(
          fs.readFileSync(path.join(failedDiagnosticsRoot, 'log', lockObservationName, 'before-task-teardown.json'), 'utf8'),
          fs.readFileSync(path.join(lockObservationDir, 'before-task-teardown.json'), 'utf8'),
          'Failed MSN staging must preserve read-only lock diagnostics'
        );
        for (const name of processNames) {
          assert.strictEqual(
            fs.readFileSync(path.join(failedDiagnosticsRoot, 'owned-processes', name), 'utf8'),
            fs.readFileSync(path.join(processEvidenceRoot, name), 'utf8'),
            'Failed MSN staging must preserve process observations byte-for-byte'
          );
        }
      }
      return;
    }
    stage();

    const diagnosticsRoot = path.join(artifactStagingDirectory, 'vscode-e2e-cli', artifactName);
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.json`)));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.junit.xml`)));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.summary.md`)));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.terminal-result.json`)));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `admission-context-${suiteId}.json`)));
    const stagedResult = JSON.parse(fs.readFileSync(path.join(diagnosticsRoot, 'results', `${suiteId}.json`), 'utf-8'));
    const stagedTerminal = JSON.parse(fs.readFileSync(path.join(diagnosticsRoot, 'results', `${suiteId}.terminal-result.json`), 'utf-8'));
    assert.deepStrictEqual(stagedResult.ogfScenarios, ogfScenarios);
    assert.deepStrictEqual(stagedTerminal.ogfScenarios, ogfScenarios);
    if (ogfScenarios.length > 0) {
      assert.strictEqual(stagedResult.ogfScenarios[0].source, undefined);
    }
    if (options.privatePlatform) {
      for (const name of ['invocation.json', 'wizard-handoff.json']) {
        assert.strictEqual(
          fs.readFileSync(path.join(diagnosticsRoot, 'workspace-cancel', name), 'utf8'),
          fs.readFileSync(path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'workspace-cancel', name), 'utf8'),
          'The existing original wizard/Code handoff must be staged byte-for-byte'
        );
      }
      const privateResult = JSON.parse(fs.readFileSync(path.join(diagnosticsRoot, 'private-traceability', `${suiteId}.json`), 'utf-8'));
      assert.strictEqual(privateResult.scenarios[0].source.caseId, 812);
      assert.strictEqual(privateResult.scenarios[0].provenance.platform, options.privatePlatform);
      assert.strictEqual(privateResult.scenarios[0].provenance.sourceVersion, 'a'.repeat(40));
      assert.strictEqual(privateResult.scenarios[0].provenance.buildId, '42');
      assert.doesNotMatch(JSON.stringify(stagedResult), /tracking\.example|synthetic/);
      assert.doesNotMatch(JSON.stringify(stagedTerminal), /tracking\.example|synthetic/);
    }
    assert.ok(
      !fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.cleanup-ledger.json`)),
      'private cleanup ledger must not be published'
    );

    const sanitizedLog = fs.readFileSync(path.join(diagnosticsRoot, 'log', `${suiteId}.log`), 'utf-8');
    assert.doesNotMatch(sanitizedLog, /raw-token|secret-sas/);
    assert.match(sanitizedLog, /<redacted>/);

    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'log', 'vscode-logs', 'profile.log')));
    assertScreenshotSidecarFixturePreserved(path.join(diagnosticsRoot, 'screenshots'), screenshotFixture);
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'generated-workspaces', 'index.md')));
    if (options.msn) {
      const stagedCleanup = fs.readFileSync(path.join(diagnosticsRoot, 'log', cleanupReportName), 'utf8');
      assert.match(stagedCleanup, /EPERM cleanup/);
      assert.doesNotMatch(stagedCleanup, /raw-cleanup-token/);
      assert.strictEqual(
        fs.readFileSync(path.join(diagnosticsRoot, 'log', msnJournalName), 'utf8'),
        fs.readFileSync(path.join(resultRoot, msnJournalName), 'utf8')
      );
      assert.strictEqual(
        fs.readFileSync(path.join(diagnosticsRoot, 'log', lockObservationName, 'before-task-teardown.json'), 'utf8'),
        fs.readFileSync(path.join(lockObservationDir, 'before-task-teardown.json'), 'utf8')
      );
      assert.deepStrictEqual(fs.readdirSync(path.join(diagnosticsRoot, 'owned-processes')).sort(), processNames.sort());
      for (const name of processNames) {
        assert.strictEqual(
          fs.readFileSync(path.join(diagnosticsRoot, 'owned-processes', name), 'utf8'),
          fs.readFileSync(path.join(processEvidenceRoot, name), 'utf8')
        );
      }
    } else {
      assert.ok(!fs.existsSync(path.join(diagnosticsRoot, 'log', cleanupReportName)));
      assert.ok(!fs.existsSync(path.join(diagnosticsRoot, 'log', lockObservationName)));
      assert.ok(
        !fs.existsSync(path.join(diagnosticsRoot, 'owned-processes')),
        'Other suite diagnostics must not adopt MSN process evidence'
      );
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function testPrivateTraceabilityConfigurationContract() {
  const template = read('.config/templates/vscode-e2e-cli-run-suite.yml');
  const validation = template.indexOf('displayName: Validate required private traceability configuration');
  const execution = template.indexOf('displayName: Prepare VS Code extension dependencies once');
  assert.ok(validation > 0 && validation < execution, 'required private input must be validated before GUI startup');
  assert.strictEqual(
    (template.match(/E2E_TRACEABILITY_CROSSWALK_JSON: \$\(E2E_TRACEABILITY_CROSSWALK_JSON\)/g) || []).length,
    1,
    'secret must not be passed to VS Code or suite runner steps'
  );
  assert.match(template, /private-traceability\/\$\{\{ parameters\.suiteId \}\}\.json/);
  assert.match(template, /if \(\$nativeResult\.outcome -eq 'success'\)/);
  assert.match(template, /--source-version "\$\(\$admissionContext\.sourceSHA\)"/);
  assert.match(template, /--build-id "\$\(Build\.BuildId\)"/);
  assert.match(template, /--platform '\$\{\{ parameters\.platform \}\}'/);
  assert.match(template, /--vscode-version "\$\(\$admissionContext\.resolvedVSCodeBuild\)"/);
}

function testDiagnosticsStagingScriptPreservesEvidenceBeforeFailing() {
  const runSuitesTemplate = read('.config/templates/vscode-e2e-cli-run-suite.yml');
  const script = extractStageDiagnosticsScript(runSuitesTemplate);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-contract-staging-incomplete-'));
  try {
    const sourcesDirectory = path.join(tempRoot, 'sources');
    const agentTempDirectory = path.join(tempRoot, 'agent-temp');
    const artifactStagingDirectory = path.join(tempRoot, 'artifact-staging');
    const artifactName = 'linux-unit-tests';
    const suiteId = 'unitTests';
    const resultRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'results');
    fs.mkdirSync(resultRoot, { recursive: true });
    fs.writeFileSync(path.join(resultRoot, `${suiteId}.junit.xml`), '<testsuite tests="12" failures="0" />\n');
    fs.writeFileSync(path.join(resultRoot, `${suiteId}.summary.md`), '# summary\n');
    fs.writeFileSync(path.join(resultRoot, `${suiteId}.terminal-result.json`), '{"complete":true,"cleanupVerified":true}\n');
    fs.writeFileSync(path.join(resultRoot, `admission-context-${suiteId}.json`), '{"sourceSHA":"abc"}\n');
    fs.writeFileSync(
      path.join(resultRoot, `${suiteId}.log`),
      'Authorization: Bearer raw-token https://example.test/callback?sig=secret-sas\n'
    );

    const vscodeLogsRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'vscode-logs', 'cli', suiteId);
    const screenshotsRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'screenshots', 'cli', suiteId);
    const workspaceSnapshotsRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'generated-workspaces', suiteId);
    fs.mkdirSync(vscodeLogsRoot, { recursive: true });
    fs.mkdirSync(workspaceSnapshotsRoot, { recursive: true });
    fs.writeFileSync(path.join(vscodeLogsRoot, 'profile.log'), 'already redacted log\n');
    const screenshotFixture = writeScreenshotSidecarFixture(screenshotsRoot);
    fs.writeFileSync(path.join(workspaceSnapshotsRoot, 'index.md'), '# redacted workspace\n');

    const result = runPowerShellScript(
      script
        .replaceAll('$(Build.ArtifactStagingDirectory)', artifactStagingDirectory)
        .replaceAll('$(Build.SourcesDirectory)', sourcesDirectory)
        .replaceAll('$(Agent.TempDirectory)', agentTempDirectory)
        .replaceAll('${{ parameters.artifactName }}', artifactName)
        .replaceAll('${{ parameters.suiteId }}', suiteId)
    );
    assert.notStrictEqual(result.status, 0);
    assert.match(result.output, /Required suite diagnostics were missing after staging available evidence/);

    const diagnosticsRoot = path.join(artifactStagingDirectory, 'vscode-e2e-cli', artifactName);
    assert.ok(!fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.json`)), 'missing required JSON result must stay missing');
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.junit.xml`)));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.summary.md`)));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `${suiteId}.terminal-result.json`)));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', `admission-context-${suiteId}.json`)));

    const sanitizedLog = fs.readFileSync(path.join(diagnosticsRoot, 'log', `${suiteId}.log`), 'utf-8');
    assert.doesNotMatch(sanitizedLog, /raw-token|secret-sas/);
    assert.match(sanitizedLog, /<redacted>/);
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'log', 'vscode-logs', 'profile.log')));
    assertScreenshotSidecarFixturePreserved(path.join(diagnosticsRoot, 'screenshots'), screenshotFixture);
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'generated-workspaces', 'index.md')));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function writeScreenshotSidecarFixture(screenshotsRoot) {
  const relativeDirectory = path.join('owner-switch', 'wizard');
  const directory = path.join(screenshotsRoot, relativeDirectory);
  fs.mkdirSync(directory, { recursive: true });
  const fileName = 'visible-wizard.png';
  const sidecarName = 'visible-wizard.json';
  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
  const sidecarJson = `${JSON.stringify(
    {
      schemaVersion: 1,
      expectation: 'createWorkspaceBehavior.visibleWizard',
      semanticFrameId: 'frame-visible-wizard',
      ownerFrameId: 'frame-workbench-owner',
    },
    null,
    2
  )}\n`;
  fs.writeFileSync(path.join(directory, fileName), pngBytes);
  fs.writeFileSync(path.join(directory, sidecarName), sidecarJson);
  return {
    relativeDirectory,
    fileName,
    sidecarName,
    pngBytes,
    sidecarJson,
  };
}

function assertScreenshotSidecarFixturePreserved(screenshotsRoot, fixture) {
  const pngPath = path.join(screenshotsRoot, fixture.relativeDirectory, fixture.fileName);
  const sidecarPath = path.join(screenshotsRoot, fixture.relativeDirectory, fixture.sidecarName);
  assert.deepStrictEqual(fs.readFileSync(pngPath), fixture.pngBytes);
  assert.strictEqual(fs.readFileSync(sidecarPath, 'utf-8'), fixture.sidecarJson);
}

function extractStageDiagnosticsScript(templateText) {
  const displayName = '        displayName: Stage vscode-test CLI results (${{ parameters.suiteId }})';
  const displayNameIndex = templateText.indexOf(displayName);
  assert.notStrictEqual(displayNameIndex, -1, 'Stage vscode-test CLI results step should be present');
  const beforeDisplayName = templateText.slice(0, displayNameIndex);
  const blockStart = beforeDisplayName.lastIndexOf('      - pwsh: |');
  assert.notStrictEqual(blockStart, -1, 'Stage isolated suite diagnostics script should have a pwsh block');
  return beforeDisplayName
    .slice(blockStart)
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.replace(/^ {10}/, ''))
    .join('\n');
}
