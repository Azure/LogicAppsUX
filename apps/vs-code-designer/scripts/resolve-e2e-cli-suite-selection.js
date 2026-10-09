#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const { SUITE_ALIASES, SUITE_REGISTRY, normalizeSuiteSelection } = require('./e2e-cli-batch');

const OS_SUITES = Object.freeze({
  linux: SUITE_ALIASES.linux,
  windows: SUITE_ALIASES.windows,
});

function main() {
  const diagnosticOnly = parseBoolean(process.env.LA_E2E_CLI_DIAGNOSTIC_ONLY);
  const runLinux = parseBoolean(process.env.LA_E2E_CLI_RUN_LINUX);
  const runWindows = parseBoolean(process.env.LA_E2E_CLI_RUN_WINDOWS);
  const executionTopology = String(process.env.LA_E2E_CLI_EXECUTION_TOPOLOGY || 'perSuite').trim();
  const linuxSelection = process.env.LA_E2E_CLI_LINUX_SUITES ?? 'linux';
  const windowsSelection = process.env.LA_E2E_CLI_WINDOWS_SUITES ?? 'windows';

  if (!['perSuite', 'cohort'].includes(executionTopology)) {
    throw new Error(`Unsupported executionTopology "${executionTopology}". Expected perSuite or cohort.`);
  }
  if (!runLinux && !runWindows) {
    throw new Error('At least one OS cohort must be selected for the VS Code E2E consumer.');
  }

  const linuxSuites = runLinux ? normalizeSuiteSelection(linuxSelection, { platform: 'linux' }).map((suite) => suite.id) : [];
  const windowsSuites = runWindows ? normalizeSuiteSelection(windowsSelection, { platform: 'win32' }).map((suite) => suite.id) : [];

  if (!diagnosticOnly) {
    assertCanonicalSelection('linux', runLinux, linuxSuites);
    assertCanonicalSelection('windows', runWindows, windowsSuites);
  }

  emit('linuxSelectedSuites', linuxSuites.join(','));
  emit('windowsSelectedSuites', windowsSuites.join(','));
  emit('trustedFullExecution', String(!diagnosticOnly));
  emit('executionTopology', executionTopology);
  emit('perSuiteTopology', String(executionTopology === 'perSuite'));
  emit('cohortTopology', String(executionTopology === 'cohort'));
  emitCohortSelection('linux', linuxSuites, executionTopology === 'cohort');
  emitCohortSelection('windows', windowsSuites, executionTopology === 'cohort');
  const windowsCohorts = partitionSuitesByAccess(windowsSuites);
  emit(
    'windowsPnpmSeedRequired',
    String(executionTopology === 'cohort' && windowsCohorts.nonAzure.length > 0 && windowsCohorts.azure.length > 0)
  );
  emitSuiteFlags('linux', linuxSuites, executionTopology === 'perSuite');
  emitSuiteFlags('windows', windowsSuites, executionTopology === 'perSuite');
  console.log(`Selected Linux suites: ${linuxSuites.join(',') || '<none>'}`);
  console.log(`Selected Windows suites: ${windowsSuites.join(',') || '<none>'}`);
}

function emitCohortSelection(os, selectedSuites, enabled) {
  const cohorts = partitionSuitesByAccess(selectedSuites);
  for (const [access, suites] of Object.entries(cohorts)) {
    emit(`${os}_${access}Suites`, suites.join(','));
    emit(`${os}_${access}Selected`, String(enabled && suites.length > 0));
  }
  emit(`${os}_nonAzureRunsContracts`, String(enabled && cohorts.nonAzure.length > 0));
  emit(`${os}_azureRunsContracts`, String(enabled && cohorts.nonAzure.length === 0 && cohorts.azure.length > 0));
}

function partitionSuitesByAccess(selectedSuites) {
  const selected = new Set(selectedSuites);
  const ordered = Object.values(SUITE_REGISTRY).filter((suite) => selected.has(suite.id));
  return {
    nonAzure: ordered.filter((suite) => suite.requiresAzure !== true).map((suite) => suite.id),
    azure: ordered.filter((suite) => suite.requiresAzure === true).map((suite) => suite.id),
  };
}

function parseBoolean(value) {
  return value === true || String(value).toLowerCase() === 'true' || value === '1';
}

function assertCanonicalSelection(os, enabled, selectedSuites) {
  if (!enabled) {
    throw new Error(`Full VS Code E2E consumer rollup requires ${os} suites to be enabled.`);
  }

  const expected = OS_SUITES[os];
  const missing = expected.filter((suite) => !selectedSuites.includes(suite));
  const unexpected = selectedSuites.filter((suite) => !expected.includes(suite));
  if (missing.length || unexpected.length) {
    throw new Error(
      `Full VS Code E2E consumer rollup requires canonical ${os} suite inventory. missing=${missing.join(',') || '<none>'} unexpected=${
        unexpected.join(',') || '<none>'
      }`
    );
  }
}

function emitSuiteFlags(os, selectedSuites, enabled) {
  const selected = new Set(selectedSuites);
  for (const suite of getPlatformSuites(os)) {
    emit(`${os}_${suite}`, String(enabled && selected.has(suite)));
  }
}

function getPlatformSuites(os) {
  const platform = os === 'windows' ? 'win32' : 'linux';
  return Object.values(SUITE_REGISTRY)
    .filter((suite) => suite.platforms.includes(platform))
    .map((suite) => suite.id);
}

function emit(name, value) {
  console.log(`##vso[task.setvariable variable=${name};isOutput=true]${value}`);
}

module.exports = {
  OS_SUITES,
  assertCanonicalSelection,
  getPlatformSuites,
  parseBoolean,
  partitionSuitesByAccess,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
