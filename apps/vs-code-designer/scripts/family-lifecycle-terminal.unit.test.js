/* global require, structuredClone */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const { assertFamilyLifecycleTerminal } = require('./family-lifecycle-terminal');

function fixture(suiteId) {
  const phases = [...SUITE_REGISTRY[suiteId].expectedPhases];
  return {
    result: { outcome: 'success', passing: 1, failing: 0, pending: 0, total: 1 },
    terminal: {
      suiteId,
      complete: true,
      lifecycleFinalized: true,
      exitCode: 0,
      signal: null,
      cleanupVerified: true,
      diagnosticsError: '',
      phaseCompleteness: true,
      expectedPhaseIds: phases,
      observedPhaseIds: phases,
      missingPhaseIds: [],
      unexpectedPhaseIds: [],
      duplicatePhaseIds: [],
      blockedPhaseIds: [],
      phaseResults: phases.map((phaseId) => ({
        phaseId,
        complete: true,
        exitCode: 0,
        signal: null,
        cleanupVerified: true,
        diagnosticsError: '',
      })),
    },
  };
}

for (const suiteId of [
  'httpTimeoutComposeOriginal',
  'statelessVariablesLifecycle',
  'workspaceArtifactRegeneration',
  'workspaceMultiRoot',
]) {
  test(`${suiteId}: every real ordered phase and final cleanup are required`, () => {
    const { result, terminal } = fixture(suiteId);
    assertFamilyLifecycleTerminal(result, terminal, suiteId);
    for (const mutate of [
      (value) => {
        value.complete = false;
      },
      (value) => {
        value.lifecycleFinalized = false;
      },
      (value) => {
        value.cleanupVerified = false;
      },
      (value) => {
        value.exitCode = 1;
      },
      (value) => {
        value.signal = 'SIGTERM';
      },
      (value) => {
        value.diagnosticsError = 'required screenshot missing';
      },
      (value) => {
        value.phaseCompleteness = false;
      },
      (value) => {
        value.observedPhaseIds = value.observedPhaseIds.slice(1);
      },
      (value) => {
        value.observedPhaseIds = [...value.observedPhaseIds].reverse();
      },
      (value) => {
        value.observedPhaseIds = [...value.observedPhaseIds, value.observedPhaseIds[0]];
      },
      (value) => {
        value.expectedPhaseIds = ['invented-phase'];
      },
      (value) => {
        value.phaseResults.pop();
      },
      (value) => {
        value.phaseResults[0].complete = false;
      },
      (value) => {
        value.phaseResults[0].cleanupVerified = false;
      },
      (value) => {
        value.phaseResults[0].exitCode = 1;
      },
      (value) => {
        value.phaseResults[0].signal = 'SIGTERM';
      },
      (value) => {
        value.phaseResults[0].diagnosticsError = 'archive failed';
      },
      (value) => {
        value.phaseResults[0].phaseId = 'different-source-phase';
      },
      (value) => {
        value.suiteId = 'unitTests';
      },
    ]) {
      const invalid = structuredClone(terminal);
      mutate(invalid);
      assert.throws(() => assertFamilyLifecycleTerminal(result, invalid, suiteId));
    }
    for (const field of ['missingPhaseIds', 'unexpectedPhaseIds', 'duplicatePhaseIds', 'blockedPhaseIds']) {
      assert.throws(() => assertFamilyLifecycleTerminal(result, { ...terminal, [field]: ['invalid'] }, suiteId));
    }
    for (const invalid of [
      { ...result, outcome: 'failure' },
      { ...result, passing: 0, total: 0 },
      { ...result, failing: 1 },
      { ...result, pending: 1 },
      { ...result, total: 2 },
    ]) {
      assert.throws(() => assertFamilyLifecycleTerminal(invalid, terminal, suiteId));
    }
  });
}

test('supplementary evidence cannot bypass or replace the canonical gate', () => {
  const { result, terminal } = fixture('httpTimeoutComposeOriginal');
  assert.throws(() => assertFamilyLifecycleTerminal(result, terminal, 'unitTests'), /Canonical suites/);
  assert.throws(() => assertFamilyLifecycleTerminal(result, terminal, 'unregistered'), /Unknown supplementary suite/);
});

test('publication CLI rejects absent/stale terminal evidence even after a successful native summary', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'family-terminal-unit-'));
  const suiteId = 'httpTimeoutComposeOriginal';
  const { result, terminal } = fixture(suiteId);
  const nativePath = path.join(root, 'native.json');
  const terminalPath = path.join(root, 'terminal.json');
  const run = () =>
    spawnSync(process.execPath, [path.join(__dirname, 'family-lifecycle-terminal.js'), suiteId, nativePath, terminalPath], {
      encoding: 'utf8',
      timeout: 10000,
    });
  try {
    fs.writeFileSync(nativePath, JSON.stringify(result));
    assert.notEqual(run().status, 0, 'A missing terminal file cannot be replaced by native exit zero');
    fs.writeFileSync(terminalPath, JSON.stringify({ ...terminal, suiteId: 'different-family' }));
    assert.notEqual(run().status, 0, 'Another family terminal cannot be reused');
    fs.writeFileSync(terminalPath, JSON.stringify({ ...terminal, complete: false }));
    assert.notEqual(run().status, 0, 'Pending terminal evidence cannot be published as finalized');
    fs.writeFileSync(terminalPath, JSON.stringify(terminal));
    const accepted = run();
    assert.equal(accepted.status, 0, `${accepted.stdout}\n${accepted.stderr}`);
    assert.match(accepted.stdout, /ordered native phases and finalized cleanup accepted/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
