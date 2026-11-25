/* global __dirname, console, process, require */
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { joinPrivateTraceability, validateCrosswalk } = require('./enrich-e2e-traceability');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const { OGF_E2E_SCENARIOS, getOgfScenariosForPhase } = require('./ogf-e2e-registry');

const scenario = OGF_E2E_SCENARIOS[0];
const expected = { sourceVersion: 'a'.repeat(40), buildId: '42' };
const terminal = {
  complete: true,
  cleanupVerified: true,
  exitCode: 0,
  phaseResults: SUITE_REGISTRY[scenario.suiteId].expectedPhases.map((phaseId) => ({
    phaseId,
    complete: true,
    cleanupVerified: true,
    exitCode: 0,
  })),
};
const crosswalk = {
  schemaVersion: 1,
  scenarios: [
    {
      scenarioId: scenario.scenarioId,
      suiteId: scenario.suiteId,
      expectedPhase: scenario.expectedPhase,
      executedVariant: scenario.executedVariant,
      assertionIdentities: [...scenario.assertions],
      source: {
        system: 'tracking.example.test/synthetic',
        caseId: 812,
        caseRevision: 3,
        stepMappings: [{ stepId: 'synthetic-step', stepOrdinal: 4 }],
      },
    },
  ],
};

for (const platform of ['linux', 'win32']) {
  const result = fixtureResult(platform);
  const original = JSON.stringify(result);
  const admitted = { ...expected, platform, vscodeVersion: '1.140.0' };
  const actualTerminal = { ...terminal, ogfScenarios: result.ogfScenarios };
  const joined = joinPrivateTraceability(result, crosswalk, admitted, actualTerminal);
  assert.strictEqual(joined.scenarios[0].provenance.platform, platform);
  assert.strictEqual(joined.scenarios[0].provenance.sourceVersion, expected.sourceVersion);
  assert.strictEqual(joined.scenarios[0].provenance.buildId, expected.buildId);
  assert.strictEqual(joined.scenarios[0].executedVariant, scenario.executedVariant);
  assert.deepStrictEqual(joined.scenarios[0].assertionIdentities, scenario.assertions);
  assert.deepStrictEqual(joined.scenarios[0].source, crosswalk.scenarios[0].source);
  assert.strictEqual(joined.approvalStatus, 'not-assessed');
  assert.strictEqual(joined.externalResultsWritten, false);
  assert.strictEqual(JSON.stringify(result), original, 'private join must not mutate public native evidence');
  for (const invalid of [
    { ...result, outcome: 'failure' },
    { ...result, passing: 0 },
    { ...result, failing: 1 },
    { ...result, ogfScenarios: [] },
    { ...result, label: 'unitTests' },
    { ...result, ogfScenarios: [{ ...result.ogfScenarios[0], executedVariant: 'standard-stateless' }] },
    { ...result, ogfScenarios: [{ ...result.ogfScenarios[0], assertionIdentities: [] }] },
    { ...result, ogfScenarios: [{ ...result.ogfScenarios[0], source: crosswalk.scenarios[0].source }] },
    {
      ...result,
      ogfScenarios: [{ ...result.ogfScenarios[0], provenance: { ...result.ogfScenarios[0].provenance, buildId: '43' } }],
    },
  ]) {
    assert.throws(() => joinPrivateTraceability(invalid, crosswalk, admitted, actualTerminal));
  }
  for (const invalid of [
    undefined,
    { ...actualTerminal, complete: false },
    { ...actualTerminal, cleanupVerified: false },
    { ...actualTerminal, exitCode: 1 },
    { ...actualTerminal, signal: 'SIGTERM' },
    { ...actualTerminal, diagnosticsError: 'postprocessing-failed' },
    { ...actualTerminal, phaseResults: terminal.phaseResults.slice(1) },
    { ...actualTerminal, phaseResults: terminal.phaseResults.map((phase) => ({ ...phase, exitCode: 1 })) },
    { ...actualTerminal, phaseResults: terminal.phaseResults.map((phase) => ({ ...phase, diagnosticsError: 'cleanup-failed' })) },
    { ...actualTerminal, phaseResults: terminal.phaseResults.map((phase) => ({ ...phase, phaseId: 'wrong-phase' })) },
  ]) {
    assert.throws(() => joinPrivateTraceability(result, crosswalk, admitted, invalid), /incomplete-or-unclean-execution/);
  }
  for (const invalid of [
    { ...actualTerminal, ogfScenarios: [] },
    {
      ...actualTerminal,
      ogfScenarios: [{ ...result.ogfScenarios[0], provenance: { ...result.ogfScenarios[0].provenance, buildId: '43' } }],
    },
    {
      ...actualTerminal,
      ogfScenarios: [{ ...result.ogfScenarios[0], assertionIdentities: ['different-assertion'] }],
    },
  ]) {
    assert.throws(() => joinPrivateTraceability(result, crosswalk, admitted, invalid));
  }
  for (const invalid of [
    { ...admitted, platform: platform === 'linux' ? 'win32' : 'linux' },
    { ...admitted, vscodeVersion: '1.139.0' },
  ]) {
    assert.throws(() => joinPrivateTraceability(result, crosswalk, invalid, actualTerminal), /execution-provenance-mismatch/);
  }
}
for (const invalid of [
  null,
  { schemaVersion: 1, scenarios: [] },
  { schemaVersion: 1, scenarios: [...crosswalk.scenarios, ...crosswalk.scenarios] },
  { schemaVersion: 1, scenarios: [{ ...crosswalk.scenarios[0], assertionIdentities: [] }] },
  { schemaVersion: 1, scenarios: [{ ...crosswalk.scenarios[0], source: { ...crosswalk.scenarios[0].source, stepMappings: [] } }] },
]) {
  assert.throws(() => validateCrosswalk(invalid), /Private traceability requirement failed/);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-private-traceability-'));
try {
  const input = path.join(tempRoot, 'public-result.json');
  const privateMap = path.join(tempRoot, 'private-crosswalk.json');
  const output = path.join(tempRoot, 'restricted-diagnostics', 'traceability.json');
  const terminalPath = path.join(tempRoot, 'terminal-result.json');
  fs.writeFileSync(terminalPath, JSON.stringify({ ...terminal, ogfScenarios: fixtureResult('linux').ogfScenarios }));
  const cli = path.join(__dirname, 'enrich-e2e-traceability.js');
  for (const raw of ['', '$(E2E_TRACEABILITY_CROSSWALK_JSON)', 'not-json-private-canary', '{"schemaVersion":1,"scenarios":[]}']) {
    const rejected = spawnSync(process.execPath, [cli, '--prepare', privateMap], {
      env: { ...process.env, E2E_TRACEABILITY_CROSSWALK_JSON: raw },
      encoding: 'utf-8',
    });
    assert.strictEqual(rejected.status, 1);
    assert.match(rejected.stderr, /Private traceability requirement failed/);
    assert.doesNotMatch(rejected.stdout + rejected.stderr, /private-canary|tracking\.example|synthetic-step/);
    assert.ok(!fs.existsSync(privateMap), 'invalid configuration must not leave a usable crosswalk');
  }
  const prepared = spawnSync(process.execPath, [cli, '--prepare', privateMap], {
    env: { ...process.env, E2E_TRACEABILITY_CROSSWALK_JSON: JSON.stringify(crosswalk) },
    encoding: 'utf-8',
  });
  assert.strictEqual(prepared.status, 0, prepared.stderr);
  fs.writeFileSync(input, JSON.stringify(fixtureResult('linux')));
  const publicBytes = fs.readFileSync(input);
  const joined = spawnSync(
    process.execPath,
    [
      cli,
      '--crosswalk',
      privateMap,
      '--input',
      input,
      '--output',
      output,
      '--terminal-result',
      terminalPath,
      '--source-version',
      expected.sourceVersion,
      '--build-id',
      expected.buildId,
      '--platform',
      'linux',
      '--vscode-version',
      '1.140.0',
    ],
    { encoding: 'utf-8' }
  );
  assert.strictEqual(joined.status, 0, joined.stderr);
  assert.doesNotMatch(prepared.stdout + joined.stdout + joined.stderr, /tracking\.example|synthetic-step|812/);
  assert.deepStrictEqual(fs.readFileSync(input), publicBytes);
  assert.strictEqual(JSON.parse(fs.readFileSync(output, 'utf-8')).scenarios[0].source.caseId, 812);
  const failedOutput = output;
  fs.writeFileSync(input, JSON.stringify({ ...fixtureResult('linux'), outcome: 'failure' }));
  const rejected = spawnSync(
    process.execPath,
    [
      cli,
      '--crosswalk',
      privateMap,
      '--input',
      input,
      '--output',
      failedOutput,
      '--terminal-result',
      terminalPath,
      '--source-version',
      expected.sourceVersion,
      '--build-id',
      expected.buildId,
      '--platform',
      'linux',
      '--vscode-version',
      '1.140.0',
    ],
    { encoding: 'utf-8' }
  );
  assert.strictEqual(rejected.status, 1);
  assert.ok(!fs.existsSync(failedOutput));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
console.log('[enrich-e2e-traceability.unit] all tests passed');

function fixtureResult(platform) {
  return {
    label: scenario.suiteId,
    outcome: 'success',
    passing: 6,
    failing: 0,
    pending: 0,
    ogfScenarios: getOgfScenariosForPhase(scenario.expectedPhase, {
      passed: true,
      executedVariant: scenario.executedVariant,
      platform,
      vscodeVersion: '1.140.0',
      ...expected,
    }),
  };
}
