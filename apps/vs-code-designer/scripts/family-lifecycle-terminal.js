/* global console, module, process, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { SUITE_REGISTRY, SUITE_ALIASES } = require('./e2e-cli-batch');

function assertFamilyLifecycleTerminal(nativeResult, terminal, suiteId) {
  const suite = SUITE_REGISTRY[suiteId];
  assert.ok(suite, `Unknown supplementary suite: ${suiteId}`);
  assert.ok(!SUITE_ALIASES.linux.includes(suiteId), 'Canonical suites retain their existing full-rollup contract');
  assert.equal(nativeResult.outcome, 'success', 'Supplementary native execution did not succeed');
  assert.ok(Number.isInteger(nativeResult.passing) && nativeResult.passing > 0, 'Supplementary suite must execute real test bodies');
  assert.equal(nativeResult.failing, 0, 'Supplementary suite contains failing test bodies');
  assert.equal(nativeResult.pending, 0, 'Supplementary suite contains skipped test bodies');
  assert.equal(nativeResult.total, nativeResult.passing, 'Supplementary result counts are inconsistent');
  assert.equal(terminal.suiteId, suiteId, 'Supplementary terminal belongs to a different suite');
  assert.equal(terminal.complete, true, 'Supplementary lifecycle is not finalized');
  assert.equal(terminal.lifecycleFinalized, true, 'Supplementary result lacks lifecycle finalization');
  assert.equal(terminal.exitCode, 0, 'Supplementary wrapper did not exit normally');
  assert.equal(terminal.signal, null, 'Supplementary wrapper was terminated by a signal');
  assert.equal(terminal.cleanupVerified, true, 'Supplementary final cleanup is not verified');
  assert.equal(terminal.originalProcessClosureVerified, true, 'Original owned process identities have not been verified after closure');
  assert.equal(
    terminal.processClosureProof,
    'retained-original-identities',
    'Post-exit ancestry alone is not original owned-process closure proof'
  );
  assert.equal(terminal.diagnosticsError, '', 'Supplementary required diagnostics failed');
  assert.equal(terminal.phaseCompleteness, true, 'Supplementary phase completeness failed');
  assert.deepEqual(terminal.expectedPhaseIds, suite.expectedPhases, 'Supplementary phase contract differs from the registry');
  assert.deepEqual(terminal.observedPhaseIds, suite.expectedPhases, 'Supplementary phases are missing, duplicated or out of order');
  for (const field of ['missingPhaseIds', 'unexpectedPhaseIds', 'duplicatePhaseIds', 'blockedPhaseIds']) {
    assert.deepEqual(terminal[field], [], `Supplementary terminal has ${field}`);
  }
  assert.ok(Array.isArray(terminal.phaseResults), 'Supplementary terminal lacks actual phase results');
  assert.equal(terminal.phaseResults.length, suite.expectedPhases.length, 'Supplementary phase result count is incomplete');
  for (const [index, phase] of terminal.phaseResults.entries()) {
    assert.equal(phase.phaseId, suite.expectedPhases[index], 'Supplementary phase identity/order mismatch');
    assert.equal(phase.complete, true, `Supplementary phase is not complete: ${phase.phaseId}`);
    assert.equal(phase.exitCode, 0, `Supplementary phase did not exit normally: ${phase.phaseId}`);
    assert.equal(phase.signal, null, `Supplementary phase was terminated: ${phase.phaseId}`);
    assert.equal(phase.cleanupVerified, true, `Supplementary phase cleanup failed: ${phase.phaseId}`);
    assert.equal(phase.diagnosticsError, '', `Supplementary phase diagnostics failed: ${phase.phaseId}`);
  }
}

if (require.main === module) {
  const [suiteId, nativePath, terminalPath] = process.argv.slice(2);
  assert.ok(
    suiteId && nativePath && terminalPath,
    'Usage: family-lifecycle-terminal.js <suite> <native-result.json> <terminal-result.json>'
  );
  assertFamilyLifecycleTerminal(
    JSON.parse(fs.readFileSync(nativePath, 'utf8')),
    JSON.parse(fs.readFileSync(terminalPath, 'utf8')),
    suiteId
  );
  console.log(`[family-lifecycle-terminal] ${suiteId}: ordered native phases and finalized cleanup accepted`);
}

module.exports = { assertFamilyLifecycleTerminal };
