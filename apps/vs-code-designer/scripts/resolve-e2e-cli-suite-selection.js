#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const { SUITE_ALIASES, normalizeSuiteSelection } = require('./e2e-cli-batch');

const OS_SUITES = Object.freeze({
  linux: SUITE_ALIASES.linux,
  windows: SUITE_ALIASES.windows,
});

function main() {
  const diagnosticOnly = parseBoolean(process.env.LA_E2E_CLI_DIAGNOSTIC_ONLY);
  const runLinux = parseBoolean(process.env.LA_E2E_CLI_RUN_LINUX);
  const runWindows = parseBoolean(process.env.LA_E2E_CLI_RUN_WINDOWS);
  const linuxSelection = process.env.LA_E2E_CLI_LINUX_SUITES ?? 'linux';
  const windowsSelection = process.env.LA_E2E_CLI_WINDOWS_SUITES ?? 'windows';

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
  emitSuiteFlags('linux', linuxSuites);
  emitSuiteFlags('windows', windowsSuites);
  console.log(`Selected Linux suites: ${linuxSuites.join(',') || '<none>'}`);
  console.log(`Selected Windows suites: ${windowsSuites.join(',') || '<none>'}`);
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

function emitSuiteFlags(os, selectedSuites) {
  const selected = new Set(selectedSuites);
  for (const suite of OS_SUITES[os]) {
    emit(`${os}_${suite}`, String(selected.has(suite)));
  }
}

function emit(name, value) {
  console.log(`##vso[task.setvariable variable=${name};isOutput=true]${value}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
