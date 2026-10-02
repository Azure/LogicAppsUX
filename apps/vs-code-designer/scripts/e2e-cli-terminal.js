/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const fs = require('fs');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');

function readMsnTerminal(terminalPath) {
  if (!fs.existsSync(terminalPath)) {
    throw new Error('MSN lifecycle evidence failed: missing-required-terminal');
  }
  let text;
  try {
    text = fs.readFileSync(terminalPath, 'utf8');
  } catch {
    throw new Error('MSN lifecycle evidence failed: unreadable-terminal');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('MSN lifecycle evidence failed: malformed-terminal');
  }
}

function assertSuccessfulMsnTerminal(summary, terminal) {
  const originalDirectSchema =
    terminal?.label === 'msnWeatherLifecycle' &&
    Object.hasOwn(terminal, 'label') &&
    !Object.hasOwn(terminal, 'suiteId') &&
    !Object.hasOwn(terminal, 'lifecycleFinalized');
  const expectedPhases = originalDirectSchema
    ? SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases.filter((phaseId) => phaseId.startsWith('msnWeatherLifecycle:'))
    : SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases;
  if (
    summary.label !== 'msnWeatherLifecycle' ||
    summary.outcome !== 'success' ||
    summary.passing !== 1 ||
    summary.total !== 1 ||
    summary.failing !== 0 ||
    summary.pending !== 0
  ) {
    throw new Error('MSN lifecycle evidence failed: invalid-executed-summary');
  }
  if (
    !terminal ||
    (terminal.label || terminal.suiteId) !== 'msnWeatherLifecycle' ||
    (Object.hasOwn(terminal, 'label') && terminal.label !== 'msnWeatherLifecycle') ||
    (Object.hasOwn(terminal, 'suiteId') && terminal.suiteId !== 'msnWeatherLifecycle') ||
    terminal.complete !== true ||
    (!originalDirectSchema && terminal.lifecycleFinalized !== true) ||
    terminal.cleanupVerified !== true ||
    terminal.exitCode !== 0 ||
    (terminal.signal !== null && terminal.signal !== undefined) ||
    terminal.diagnosticsError
  ) {
    throw new Error('MSN lifecycle evidence failed: incomplete-or-unclean-terminal');
  }
  const phases = terminal.phaseResults;
  if (
    !Array.isArray(phases) ||
    phases.length !== expectedPhases.length ||
    phases.some((phase) => !phase || typeof phase !== 'object') ||
    new Set(phases.map((phase) => phase.phaseId)).size !== phases.length ||
    expectedPhases.some((phaseId) => !phases.some((phase) => phase.phaseId === phaseId))
  ) {
    throw new Error('MSN lifecycle evidence failed: missing-duplicate-or-unexpected-phase');
  }
  if (
    phases.some(
      (phase) =>
        phase.complete !== true ||
        phase.cleanupVerified !== true ||
        phase.exitCode !== 0 ||
        (phase.signal !== null && phase.signal !== undefined) ||
        phase.diagnosticsError
    )
  ) {
    throw new Error('MSN lifecycle evidence failed: unsuccessful-phase');
  }
}

if (require.main === module) {
  const [summaryPath, terminalPath] = process.argv.slice(2);
  if (!summaryPath || !terminalPath || !fs.existsSync(summaryPath) || !fs.existsSync(terminalPath)) {
    throw new Error('MSN lifecycle evidence failed: missing-required-terminal');
  }
  assertSuccessfulMsnTerminal(JSON.parse(fs.readFileSync(summaryPath, 'utf8')), readMsnTerminal(terminalPath));
}

module.exports = { assertSuccessfulMsnTerminal, readMsnTerminal };
