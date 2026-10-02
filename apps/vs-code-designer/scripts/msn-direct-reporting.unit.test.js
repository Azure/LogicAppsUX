/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  _test: { getDirectExpectedPhaseIds, getDirectSuiteComplete, writeSuitePhaseResult },
} = require('./run-e2e-cli');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-msn-reporting-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: false }));
  const terminalPath = path.join(root, 'msnWeatherLifecycle.terminal-result.json');
  return { terminalPath, env: { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: terminalPath } };
}

for (const platform of ['linux', 'windows']) {
  const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `msn-direct-${platform}.json`)));
  test(`${platform}: actual successful two-phase records reconcile without inventing a bootstrap observation`, () => {
    assert.equal(original.complete, false);
    assert.deepEqual(getDirectExpectedPhaseIds(original.label), ['msnWeatherLifecycle:create', 'msnWeatherLifecycle:run']);
    assert.equal(getDirectSuiteComplete(original.label, original.phaseResults), true);
    assert.equal(original.phaseResults.length, 2);
    assert.equal(
      original.phaseResults.some((phase) => phase.phaseId.startsWith('runtimeDependencyBootstrap:')),
      false
    );
  });
  test(`${platform}: actual phase writer persists the original aggregate schema with corrected completeness`, (t) => {
    const { terminalPath, env } = fixture(t);
    for (const phase of original.phaseResults) {
      writeSuitePhaseResult(env, { ...phase, label: original.label, mochaPassingCount: 0 });
    }
    const terminal = JSON.parse(fs.readFileSync(terminalPath));
    assert.equal(terminal.complete, true);
    assert.equal(terminal.exitCode, 0);
    assert.equal(terminal.cleanupVerified, true);
    assert.deepEqual(terminal.phaseResults, original.phaseResults);
    assert.deepEqual(Object.keys(terminal).sort(), Object.keys(original).sort());
    assert.equal(terminal.mochaPassingCount, original.mochaPassingCount);
  });
  for (const [name, modify] of [
    ['missing create', (phases) => phases.slice(1)],
    ['missing run', (phases) => phases.slice(0, 1)],
    ['duplicate create', (phases) => [phases[0], phases[0]]],
    ['unexpected phase', (phases) => [{ ...phases[0], phaseId: 'msnWeatherLifecycle:other' }, phases[1]]],
    ['extra anonymous phase', (phases) => [...phases, { ...phases[0], phaseId: '' }]],
    ['invented bootstrap', (phases) => [...phases, { ...phases[0], phaseId: 'runtimeDependencyBootstrap:bootstrap' }]],
    ['incomplete run', (phases) => [phases[0], { ...phases[1], complete: false }]],
    ['failed run exit', (phases) => [phases[0], { ...phases[1], exitCode: 1 }]],
    ['missing run exit', (phases) => [phases[0], { ...phases[1], exitCode: undefined }]],
    ['run signal', (phases) => [phases[0], { ...phases[1], signal: 'SIGTERM' }]],
    ['unverified cleanup', (phases) => [phases[0], { ...phases[1], cleanupVerified: false }]],
    ['retained diagnostic error', (phases) => [phases[0], { ...phases[1], diagnosticsError: 'existing-diagnostic-error' }]],
  ]) {
    test(`${platform}: ${name} remains incomplete`, () => {
      assert.equal(getDirectSuiteComplete(original.label, modify(globalThis.structuredClone(original.phaseResults))), false);
    });
  }
  test(`${platform}: persisted failed phase is neither dropped nor made successful`, (t) => {
    const { terminalPath, env } = fixture(t);
    const phases = globalThis.structuredClone(original.phaseResults);
    phases[1] = { ...phases[1], complete: false, exitCode: 1, diagnosticsError: 'original-phase-failure' };
    for (const phase of phases) {
      writeSuitePhaseResult(env, { ...phase, label: original.label, mochaPassingCount: 0 });
    }
    const terminal = JSON.parse(fs.readFileSync(terminalPath));
    assert.equal(terminal.complete, false);
    assert.equal(terminal.exitCode, 1);
    assert.deepEqual(terminal.phaseResults, phases);
    assert.equal(terminal.diagnosticsError, 'original-phase-failure');
  });
}

test('separately recorded bootstrap recognizes its existing preparatory identity', (t) => {
  const { terminalPath, env } = fixture(t);
  const phase = {
    label: 'runtimeDependencyBootstrap',
    phaseId: 'runtimeDependencyBootstrap:bootstrap',
    exitCode: 0,
    signal: null,
    complete: true,
    cleanupVerified: true,
    diagnosticsError: '',
    mochaPassingCount: 0,
  };
  assert.deepEqual(getDirectExpectedPhaseIds(phase.label), [phase.phaseId]);
  writeSuitePhaseResult(env, phase);
  const terminal = JSON.parse(fs.readFileSync(terminalPath));
  assert.equal(terminal.complete, true);
  assert.equal(terminal.phaseResults.length, 1);
  assert.equal(terminal.phaseResults[0].phaseId, phase.phaseId);
});
