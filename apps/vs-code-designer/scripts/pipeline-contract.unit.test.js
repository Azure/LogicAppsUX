/* global __dirname, console, process, require, structuredClone */
const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

testAzureToolsWrapperContract();
testRootNpmrcSourceGuardAllowsGeneratedRuntimeFile();
testLocalAzureToolsWrapperContractIfAvailable();
testConsumerAdmissionContract();
testAzureCliIdentityScriptBehavior();
testPipelineSafetyGuards();
testDiagnosticsStagingScriptHandlesControllerLayout();

console.log('[pipeline-contract.unit] all tests passed');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function parseYaml(relativePath) {
  const { parse } = require(path.join(repoRoot, 'apps', 'vs-code-designer', 'node_modules', 'yaml'));
  return parse(read(relativePath));
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
  assert.match(readme, /test-only, nonproduction execution path/);
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
  assert.match(readme, /any validationJob upload allowlist required by the deployed 1ES template/);
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
  const runSuitesTemplate = read('.config/templates/vscode-e2e-cli-run-suites.yml');
  const legacyConsumerEntry = read('.azure-pipelines/vscode-e2e-cli.1es.yml');
  const legacyRunStage = read('.azure-pipelines/templates/vscode-e2e-stage.yml');
  const legacyRunCli = read('.azure-pipelines/templates/vscode-e2e-cli-run.yml');
  const legacyStagedRunCli = read('.azure-pipelines/templates/vscode-e2e-run-cli.yml');
  const cliBuildArtifactsTemplate = read('.azure-pipelines/templates/vscode-e2e-cli-build-artifacts.yml');
  const readme = read('.config/README.md');
  const e2eReadme = read('apps/vs-code-designer/src/test/e2e/README.md');
  const consumer = parseYaml('.config/vscode-e2e-cli.1es.yml');
  const runSuites = parseYaml('.config/templates/vscode-e2e-cli-run-suites.yml');
  const runE2eCli = read('apps/vs-code-designer/scripts/run-e2e-cli.js');

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
  assertConsumerJobsAreValidationJobs(consumer, runSuites);
  assertValidationJobGuardRejectsMutations(consumer, runSuites);
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
  assert.match(runSuitesTemplate, /LA_E2E_CLI_ADMISSION_CONTEXT_PATH/);
  assert.match(runSuitesTemplate, /resolvedVSCodeBuild = '\$\(ResolvedVSCodeVersion\)'/);
  assert.match(runSuitesTemplate, /ResolvedVSCodeVersion must be supplied by the shared consumer context job/);
  assert.doesNotMatch(runSuitesTemplate, /Resolve stable VS Code version once/);
  assert.doesNotMatch(runSuitesTemplate, /az account get-access-token/);
  assert.doesNotMatch(runSuitesTemplate, /Copy-Item \(Join-Path \$batchRootParent '\*'\)/);
  assert.doesNotMatch(runSuitesTemplate, /SilentlyContinue/);
  assert.match(runSuitesTemplate, /batch-reports/);
  assert.match(runSuitesTemplate, /\$controllerRoots = Get-ChildItem -Path \$batchRootParent -Directory \| Where-Object/);
  assert.match(runSuitesTemplate, /la-e2e-cli-batch-\*/);
  assert.match(runSuitesTemplate, /\$suiteRoots = \$controllerRoots \| ForEach-Object/);
  assert.match(runSuitesTemplate, /Get-ChildItem -Path \$_.FullName -Directory \| Where-Object/);
  assert.match(runSuitesTemplate, /suite-terminal-result\.json/);
  assert.match(runSuitesTemplate, /suite-cleanup-ledger\.json/);
  assert.match(runSuitesTemplate, /ReparsePoint/);
  assert.match(runSuitesTemplate, /Refusing to stage suite reports with link\/reparse entries/);
  assert.match(runSuitesTemplate, /Redact-DiagnosticText/);
  assert.match(runSuitesTemplate, /Copy-SanitizedReportDirectory/);
  assert.match(runSuitesTemplate, /\$relative -eq 'suite-cleanup-ledger\.json'/);
  assert.doesNotMatch(runSuitesTemplate, /\.vscode-test\/screenshots\/cli/);
  assert.doesNotMatch(runSuitesTemplate, /\.vscode-test\/generated-workspaces/);
  assert.match(runSuitesTemplate, /Publish batch suite JUnit results/);
  assert.match(runSuitesTemplate, /failTaskOnMissingResultsFile: true/);
  assert.doesNotMatch(runSuitesTemplate, /JUnit placeholders/);
  assert.match(runE2eCli, /writeBatchJUnitResults\(resultsDir, aggregate\)/);
  assert.match(runE2eCli, /\$\{sanitizeEnvSegment\(suite\.id\)\}\.junit\.xml/);
  assert.match(runE2eCli, /e2e-cli-batch-result\.junit\.xml/);
  assert.match(runSuitesTemplate, /LA_E2E_CLI_BATCH_TRUSTED_FULL_EXECUTION/);
  assert.match(runSuitesTemplate, /useGlobalConfig: false/);
  assert.match(runSuitesTemplate, /visibleAzLogin: false/);
  assert.match(runSuitesTemplate, /az account show --query id --output tsv/);
  assert.match(runSuitesTemplate, /az account show --query tenantId --output tsv/);
  assert.match(runSuitesTemplate, /AzureCLI service connection did not provide WIF tenant metadata/);
  assert.match(runSuitesTemplate, /AzureCLI service connection did not provide subscription and tenant identity/);
  assert.match(runSuitesTemplate, /AzureCLI service connection identity was malformed/);
  assert.match(runSuitesTemplate, /AzureCLI account tenant does not match the service connection tenant/);
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
  assert.match(consumerEntry, /At least one OS cohort must be selected for the VS Code E2E consumer/);
  assert.match(
    consumerEntry,
    /resolvedVSCodeVersion: \$\[ dependencies\.resolve_consumer_context\.outputs\['resolveStableVSCode\.resolvedVSCodeBuild'\] \]/
  );
  assert.match(consumerEntry, /trustedFullExecution: \$\{\{ not\(parameters\.diagnosticOnly\) \}\}/);
  assert.match(consumerEntry, /expectedProducerDefinitionId: \$\(System\.DefinitionId\)/);
  assert.match(consumerEntry, /expectedProducerRunId: \$\(Build\.BuildId\)/);
  assert.match(consumerEntry, /verify_both_os_full_rollup/);
  assert.match(consumerEntry, /report_diagnostic_selected_rerun/);
  assert.match(consumerEntry, /protected checks must bind verify_both_os_full_rollup/);
  assert.match(consumerEntry, /Diagnostic selected rerun failed selected cohort/);
  assert.match(consumerEntry, /requires both Linux and Windows prepared suite cohorts/);
  assert.doesNotMatch(consumerEntry, /\$\{\{ dependencies\.linux_prepared_suites\.result \}\}/);
  assert.doesNotMatch(consumerEntry, /\$\{\{ dependencies\.windows_prepared_suites\.result \}\}/);
  assert.match(consumerEntry, /linuxPreparedSuitesResult[\s\S]*\$\[ dependencies\.linux_prepared_suites\.result \]/);
  assert.match(consumerEntry, /windowsPreparedSuitesResult[\s\S]*\$\[ dependencies\.windows_prepared_suites\.result \]/);
  assert.match(consumerEntry, /\$linuxResult = '\$\(linuxPreparedSuitesResult\)'/);
  assert.match(consumerEntry, /\$windowsResult = '\$\(windowsPreparedSuitesResult\)'/);
  assert.match(consumerEntry, /vscode-e2e-cli-test-results-linux-prepared-suites/);
  assert.match(consumerEntry, /vscode-e2e-cli-test-results-windows-prepared-suites/);
  assert.match(consumerEntry, /admissionContext/);
  assert.match(consumerEntry, /producerDefinitionId/);
  assert.match(consumerEntry, /sourceSHA/);
  assert.match(consumerEntry, /artifactSHA256/);
  assert.match(consumerEntry, /resolvedVSCodeBuild/);
}

function assertConsumerPublicParametersAreMinimal(consumer) {
  assert.deepStrictEqual(
    consumer.parameters.map((parameter) => parameter.name),
    ['diagnosticOnly', 'runLinux', 'runWindows', 'linuxSuites', 'windowsSuites'],
    'consumer Run pipeline surface must expose only genuine OS/suite selectors'
  );
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
  assert.strictEqual(buildJob.templateContext?.type, 'validationJob');
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

  const templateInvocations = flattenAzureList(consumer.extends.parameters.stages[0].jobs).filter((entry) => entry.template);
  assert.strictEqual(templateInvocations.length, 2);
  for (const invocation of templateInvocations) {
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
    assert.strictEqual(invocation.parameters.nodeVersion, '22.x');
    assert.strictEqual(invocation.parameters.dotnetVersion, '8.0.x');
    assert.strictEqual(invocation.parameters.testARMServiceConnection, 'LogicAppsVSCode-E2E-SignIn');
    assert.strictEqual(invocation.parameters.azureTenantId, undefined);
    assert.strictEqual(invocation.parameters.azureSubscriptionId, undefined);
    assert.strictEqual(invocation.parameters.azureResourceGroupName, 'LogicAppsVSCode-E2E-Fixtures');
    assert.strictEqual(invocation.parameters.azureLocationName, 'westus');
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
    /consumer Run pipeline surface must expose only genuine OS\/suite selectors/
  );
  assert.throws(
    () =>
      assertConsumerPublicParametersAreMinimal(
        mutate((copy) => {
          copy.parameters.unshift({ name: 'variableGroups', type: 'object', default: [] });
        })
      ),
    /consumer Run pipeline surface must expose only genuine OS\/suite selectors/
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

function assertConsumerJobsAreValidationJobs(consumer, runSuites) {
  const stages = consumer.extends.parameters.stages;
  assert.strictEqual(stages.length, 1);
  const jobs = flattenAzureList(stages[0].jobs).filter((entry) => entry.job || entry.template);
  const directJobs = jobs.filter((entry) => entry.job);
  const templateJobs = jobs.filter((entry) => entry.template);

  assert.deepStrictEqual(
    directJobs.map((entry) => entry.job).sort(),
    ['build_current_run_e2e_artifact', 'report_diagnostic_selected_rerun', 'resolve_consumer_context', 'verify_both_os_full_rollup'].sort()
  );
  for (const job of directJobs) {
    assert.strictEqual(job.templateContext?.type, 'validationJob', `${job.job} must be a validationJob`);
  }

  assert.strictEqual(templateJobs.length, 2);
  for (const invocation of templateJobs) {
    assert.strictEqual(invocation.template, '/.config/templates/vscode-e2e-cli-run-suites.yml@self');
  }

  assert.strictEqual(runSuites.jobs.length, 1);
  const suiteJob = runSuites.jobs[0];
  assert.strictEqual(suiteJob.templateContext?.type, 'validationJob');
  assert.strictEqual(suiteJob.templateContext.outputs.length, 4, 'validationJob consumer must preserve diagnostic artifact outputs');
  assert.deepStrictEqual(
    suiteJob.templateContext.outputs.map((output) => output.output),
    ['pipelineArtifact', 'pipelineArtifact', 'pipelineArtifact', 'pipelineArtifact']
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

function assertValidationJobGuardRejectsMutations(consumer, runSuites) {
  const mutate = (value, mutator) => {
    const clone = structuredClone(value);
    mutator(clone);
    return clone;
  };
  const expectRejection = (description, mutatedConsumer, mutatedRunSuites, pattern) => {
    assert.throws(
      () => assertConsumerJobsAreValidationJobs(mutatedConsumer ?? consumer, mutatedRunSuites ?? runSuites),
      pattern,
      description
    );
  };

  expectRejection(
    'shared context job must not lose validationJob type',
    mutate(consumer, (copy) => {
      const job = getConsumerDirectJob(copy, 'resolve_consumer_context');
      delete job.templateContext.type;
    }),
    null,
    /resolve_consumer_context must be a validationJob/
  );
  expectRejection(
    'current-run artifact build job must remain validationJob type',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'build_current_run_e2e_artifact').templateContext.type = 'buildJob';
    }),
    null,
    /build_current_run_e2e_artifact must be a validationJob/
  );
  expectRejection(
    'full-rollup coordinator must reject wrong job type',
    mutate(consumer, (copy) => {
      getConsumerDirectJob(copy, 'verify_both_os_full_rollup').templateContext.type = 'buildJob';
    }),
    null,
    /verify_both_os_full_rollup must be a validationJob/
  );
  expectRejection(
    'suite template job must not lose validationJob type',
    null,
    mutate(runSuites, (copy) => {
      copy.jobs[0].templateContext.type = 'deploymentJob';
    }),
    /Expected values to be strictly equal/
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
    /validationJob consumer must preserve diagnostic artifact outputs/
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
    ...findYamlKeyPaths(runSuites, 'networkIsolationPolicy', ['.config/templates/vscode-e2e-cli-run-suites.yml']),
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

  const runSuites = parseYaml('.config/templates/vscode-e2e-cli-run-suites.yml');
  const legacyRunCli = parseYaml('.azure-pipelines/templates/vscode-e2e-run-cli.yml');
  const legacyStandaloneRunCli = parseYaml('.azure-pipelines/templates/vscode-e2e-cli-run.yml');
  const scripts = [
    {
      name: 'current-linux',
      shell: 'bash',
      invokesRunner: true,
      script: getAzureCliInlineScript(runSuites, { scriptType: 'bash', displayName: /Run isolated @vscode\/test-cli suites/ }),
    },
    {
      name: 'current-windows',
      shell: 'pwsh',
      invokesRunner: true,
      script: getAzureCliInlineScript(runSuites, { scriptType: 'pscore', displayName: /Run isolated @vscode\/test-cli suites/ }),
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

function testDiagnosticsStagingScriptHandlesControllerLayout() {
  const runSuitesTemplate = read('.config/templates/vscode-e2e-cli-run-suites.yml');
  const script = extractStageDiagnosticsScript(runSuitesTemplate);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-contract-staging-'));
  try {
    const sourcesDirectory = path.join(tempRoot, 'sources');
    const agentTempDirectory = path.join(tempRoot, 'agent-temp');
    const artifactStagingDirectory = path.join(tempRoot, 'artifact-staging');
    const artifactName = 'linux-prepared-suites';
    const resultRoot = path.join(sourcesDirectory, 'apps', 'vs-code-designer', '.vscode-test', 'results');
    fs.mkdirSync(resultRoot, { recursive: true });
    fs.writeFileSync(path.join(resultRoot, 'e2e-cli-batch-result.json'), '{"aggregateOutcome":"success"}\n');
    fs.writeFileSync(path.join(resultRoot, 'e2e-cli-batch-result.junit.xml'), '<testsuites />\n');
    fs.writeFileSync(path.join(resultRoot, 'unitTests.junit.xml'), '<testsuite />\n');
    fs.writeFileSync(
      path.join(resultRoot, `${artifactName}.log`),
      'Authorization: Bearer raw-token\nGET https://example.test/callback?sig=secret-sas\n'
    );

    const reportsRoot = path.join(
      agentTempDirectory,
      `vscode-e2e-cli-batch-${artifactName}`,
      'la-e2e-cli-batch-controller',
      '01-unitTests-owned',
      'reports'
    );
    fs.mkdirSync(path.join(reportsRoot, 'vscode-logs'), { recursive: true });
    fs.mkdirSync(path.join(reportsRoot, 'screenshots'), { recursive: true });
    fs.mkdirSync(path.join(reportsRoot, 'generated-workspaces'), { recursive: true });
    fs.writeFileSync(path.join(reportsRoot, 'suite-result.json'), '{"id":"unitTests"}\n');
    fs.writeFileSync(path.join(reportsRoot, 'suite-terminal-result.json'), '{"complete":true}\n');
    fs.writeFileSync(path.join(reportsRoot, 'suite-cleanup-ledger.json'), '{"privateProcessIds":[1234]}\n');
    fs.writeFileSync(path.join(reportsRoot, 'vscode-logs', 'profile.log'), 'already redacted log\n');
    fs.writeFileSync(path.join(reportsRoot, 'screenshots', 'shot.txt'), 'screenshot placeholder\n');
    fs.writeFileSync(path.join(reportsRoot, 'generated-workspaces', 'index.md'), '# redacted workspace\n');

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
          .replaceAll('${{ parameters.artifactName }}', artifactName),
      ],
      { stdio: 'pipe' }
    );

    const diagnosticsRoot = path.join(artifactStagingDirectory, 'vscode-e2e-cli', artifactName);
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', 'e2e-cli-batch-result.json')));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'results', 'unitTests.junit.xml')));
    assert.ok(!fs.existsSync(path.join(diagnosticsRoot, 'results', `${artifactName}.log`)), 'raw tee log must not be copied to results');

    const sanitizedLog = fs.readFileSync(path.join(diagnosticsRoot, 'log', `${artifactName}.log`), 'utf-8');
    assert.doesNotMatch(sanitizedLog, /raw-token|secret-sas/);
    assert.match(sanitizedLog, /<redacted>/);

    const stagedSuiteReports = path.join(diagnosticsRoot, 'log', 'batch-reports', '01-unitTests-owned');
    assert.ok(fs.existsSync(path.join(stagedSuiteReports, 'suite-result.json')));
    assert.ok(fs.existsSync(path.join(stagedSuiteReports, 'suite-terminal-result.json')));
    assert.ok(fs.existsSync(path.join(stagedSuiteReports, 'vscode-logs', 'profile.log')));
    assert.ok(!fs.existsSync(path.join(stagedSuiteReports, 'suite-cleanup-ledger.json')), 'cleanup ledger must remain private');
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'screenshots', '01-unitTests-owned')));
    assert.ok(fs.existsSync(path.join(diagnosticsRoot, 'generated-workspaces', '01-unitTests-owned')));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function extractStageDiagnosticsScript(templateText) {
  const displayName = '        displayName: Stage isolated suite diagnostics';
  const displayNameIndex = templateText.indexOf(displayName);
  assert.notStrictEqual(displayNameIndex, -1, 'Stage isolated suite diagnostics step should be present');
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
