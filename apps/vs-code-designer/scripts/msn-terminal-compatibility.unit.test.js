/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { assertSuccessfulMsnTerminal } = require('./e2e-cli-terminal');
const {
  _test: { writeSuitePhaseResult },
} = require('./run-e2e-cli');

const summary = { label: 'msnWeatherLifecycle', outcome: 'success', passing: 1, total: 1, failing: 0, pending: 0 };
for (const platform of ['linux', 'windows']) {
  const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `msn-direct-${platform}.json`)));
  test(`${platform}: original incomplete published terminal stays rejected`, () => {
    assert.throws(() => assertSuccessfulMsnTerminal(summary, original), /incomplete-or-unclean-terminal/);
  });
  const corrected = { ...original, complete: true };
  test(`${platform}: corrected original direct shape is accepted without changing phase/schema/counts`, () => {
    assertSuccessfulMsnTerminal(summary, corrected);
    assert.equal(corrected.mochaPassingCount, original.mochaPassingCount);
    assert.deepEqual(corrected.phaseResults, original.phaseResults);
    assert.deepEqual(Object.keys(corrected), Object.keys(original));
  });
  for (const [name, modify] of [
    [
      'missing create',
      (value) => {
        value.phaseResults.shift();
      },
    ],
    [
      'missing run',
      (value) => {
        value.phaseResults.pop();
      },
    ],
    [
      'duplicate phase',
      (value) => {
        value.phaseResults[1] = value.phaseResults[0];
      },
    ],
    [
      'unexpected phase',
      (value) => {
        value.phaseResults[1].phaseId = 'msnWeatherLifecycle:unknown';
      },
    ],
    [
      'fabricated bootstrap',
      (value) => {
        value.phaseResults.unshift({ ...value.phaseResults[0], phaseId: 'runtimeDependencyBootstrap:bootstrap' });
      },
    ],
    [
      'failed phase',
      (value) => {
        value.phaseResults[1].complete = false;
      },
    ],
    [
      'failed phase exit',
      (value) => {
        value.phaseResults[1].exitCode = 2;
      },
    ],
    [
      'phase signal',
      (value) => {
        value.phaseResults[1].signal = 'SIGTERM';
      },
    ],
    [
      'phase cleanup failure',
      (value) => {
        value.phaseResults[1].cleanupVerified = false;
      },
    ],
    [
      'phase diagnostic error',
      (value) => {
        value.phaseResults[1].diagnosticsError = 'retained-error';
      },
    ],
    [
      'failed outer exit',
      (value) => {
        value.exitCode = 2;
      },
    ],
    [
      'outer signal',
      (value) => {
        value.signal = 'SIGTERM';
      },
    ],
    [
      'outer cleanup failure',
      (value) => {
        value.cleanupVerified = false;
      },
    ],
    [
      'outer diagnostic error',
      (value) => {
        value.diagnosticsError = 'retained-error';
      },
    ],
    [
      'unfinalized newer schema',
      (value) => {
        value.lifecycleFinalized = false;
      },
    ],
    [
      'finalized newer schema missing bootstrap',
      (value) => {
        value.lifecycleFinalized = true;
      },
    ],
    [
      'batch identity missing finalized/bootstrap',
      (value) => {
        delete value.label;
        value.suiteId = 'msnWeatherLifecycle';
      },
    ],
    [
      'ambiguous direct/batch identity',
      (value) => {
        value.suiteId = 'msnWeatherLifecycle';
      },
    ],
    [
      'present null suite identity',
      (value) => {
        value.suiteId = null;
      },
    ],
    [
      'present empty suite identity',
      (value) => {
        value.suiteId = '';
      },
    ],
    [
      'present false suite identity',
      (value) => {
        value.suiteId = false;
      },
    ],
    [
      'present undefined suite identity',
      (value) => {
        value.suiteId = undefined;
      },
    ],
    [
      'present null finalization marker',
      (value) => {
        value.lifecycleFinalized = null;
      },
    ],
    [
      'present empty finalization marker',
      (value) => {
        value.lifecycleFinalized = '';
      },
    ],
    [
      'present undefined finalization marker',
      (value) => {
        value.lifecycleFinalized = undefined;
      },
    ],
    [
      'wrong label',
      (value) => {
        value.label = 'different-suite';
      },
    ],
    [
      'present null label',
      (value) => {
        value.label = null;
      },
    ],
    [
      'present empty label',
      (value) => {
        value.label = '';
      },
    ],
    [
      'present false label',
      (value) => {
        value.label = false;
      },
    ],
    [
      'missing label',
      (value) => {
        delete value.label;
      },
    ],
  ]) {
    test(`${platform}: consumer rejects ${name}`, () => {
      const value = globalThis.structuredClone(corrected);
      modify(value);
      assert.throws(() => assertSuccessfulMsnTerminal(summary, value));
    });
  }
  test(`${platform}: actual summary and staging reject intermediate writer output while preserving body counts`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-msn-consumer-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: false }));
    const terminalPath = path.join(root, 'msnWeatherLifecycle.terminal-result.json');
    for (const phase of original.phaseResults) {
      writeSuitePhaseResult(
        { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: terminalPath },
        { ...phase, label: original.label, mochaPassingCount: 0 }
      );
    }
    const logPath = path.join(root, 'offline-consumer.log');
    fs.writeFileSync(logPath, '  1 passing (1s)\n');
    const generated = spawnSync(
      require('node:process').execPath,
      [
        path.join(__dirname, 'summarize-e2e-cli-results.js'),
        '--label',
        original.label,
        '--log',
        logPath,
        '--out-dir',
        root,
        '--outcome',
        'success',
      ],
      { encoding: 'utf8' }
    );
    assert.notEqual(generated.status, 0);
    assert.match(generated.stderr, /incomplete-or-unclean-terminal/);
    const summaryPath = path.join(root, 'msnWeatherLifecycle.json');
    const persisted = JSON.parse(fs.readFileSync(summaryPath));
    assert.equal(persisted.total, 2);
    assert.equal(persisted.failing, 1);
    assert.equal(persisted.harnessFailures[0].kind, 'lifecycle-evidence');
    assert.deepEqual(persisted.executedTestCounts, { total: 1, passing: 1, failing: 0, pending: 0 });
    const staged = spawnSync(require('node:process').execPath, [path.join(__dirname, 'e2e-cli-terminal.js'), summaryPath, terminalPath], {
      encoding: 'utf8',
    });
    assert.notEqual(staged.status, 0);
  });
}

test('newer finalized three-phase schema remains independently accepted and never downgraded', () => {
  const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'msn-direct-linux.json')));
  const terminal = {
    ...original,
    complete: true,
    lifecycleFinalized: true,
    phaseResults: [{ ...original.phaseResults[0], phaseId: 'runtimeDependencyBootstrap:bootstrap' }, ...original.phaseResults],
  };
  assertSuccessfulMsnTerminal(summary, terminal);
  const removedMarker = { ...terminal };
  delete removedMarker.lifecycleFinalized;
  assert.throws(() => assertSuccessfulMsnTerminal(summary, removedMarker), /missing-duplicate-or-unexpected-phase/);
  assert.throws(() => assertSuccessfulMsnTerminal(summary, { ...terminal, lifecycleFinalized: false }));
});
