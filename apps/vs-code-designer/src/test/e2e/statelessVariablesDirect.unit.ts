import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stateless-direct-chain-unit-'));
const runnerPath = path.resolve(__dirname, '..', '..', '..', 'scripts', 'run-e2e-cli.js');
const runner = require(runnerPath) as {
  runDirectFamily(
    suiteId: string,
    visibleDelayMs: string | undefined,
    options: {
      scriptPath: string;
      resultsDir: string;
      batchRoot: string;
      seedDir: string;
      timeoutMs: number;
    }
  ): Promise<number>;
};
const suiteId = 'statelessVariablesLifecycle';
const expected = ['runtimeDependencyBootstrap:bootstrap', `${suiteId}:create`, `${suiteId}:reopen`];
const originalEnv = {
  mode: process.env.UNIT_STATELESS_DIRECT_MODE,
  trace: process.env.UNIT_STATELESS_DIRECT_TRACE,
  journal: process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH,
  keep: process.env.LA_E2E_CLI_PRESERVE_WORKSPACES,
};

// A bounded Node-only command fixture, not another E2E entry point. It executes
// the ACTUAL family orchestrator, phase writer and strict owned-root cleanup.
// Only VS Code phase execution/Core Tools probing are replaced with unit data.
const fixture = `
const assert = require('assert'), fs = require('fs'), path = require('path');
const api = require(${JSON.stringify(runnerPath)})._test;
const mode = process.env.UNIT_STATELESS_DIRECT_MODE;
const tracePath = process.env.UNIT_STATELESS_DIRECT_TRACE;
const phases = [];
let invocations = 0;
const trace = { unitOnly: true, roots: [], pendingReceiptObservations: 0 };
const record = (phase) => api.writeSuitePhaseResult(process.env, phase);
const expected = ${JSON.stringify(expected)};
if (mode === 'stale') {
  for (const phaseId of expected) record({phaseId, label:'unit-stale', complete:true, exitCode:0, cleanupVerified:true, signal:null, diagnosticsError:''});
}
if (mode === 'retained-root') process.env.LA_E2E_CLI_PRESERVE_WORKSPACES = '1';
const operations = {
  waitForFuncCoreToolsAtDependencyRoot: async (dependencyRoot) => {
    assert.ok(fs.existsSync(dependencyRoot));
    assert.equal(invocations, 1);
  },
  runVscodeTest: async (args, options) => {
    const env = {...process.env, ...options.extraEnv};
    const label = args[1];
    const phaseId = api.getSuitePhaseId(label, env);
    const index = invocations++;
    const scratch = fs.mkdtempSync(path.join(process.env.TEMP, 'unit-phase-'));
    fs.writeFileSync(path.join(scratch, 'owned.txt'), 'unit-owned');
    fs.rmSync(scratch, {recursive:true});
    const cleaned = !fs.existsSync(scratch);
    const phase = {phaseId, label, exitCode:0, signal:null, complete:cleaned,
      cleanupVerified:cleaned, cleanupLedger:{verified:cleaned}, diagnosticsError:'',
      mochaPassingCount:0, unitFixture:true};
    if (mode === 'model-hint') {
      // Deliberately untrusted callee data: never a process-observer proof.
      phase.processCleanup = {retainedOriginalIdentitiesVerified:true};
      phase.originalProcessClosureVerified = true;
      phase.processClosureProof = 'retained-original-identities';
    }
    if (index === 1 && mode.startsWith('incomplete')) phase.complete = false;
    phases.push(phase);
    if (!mode.startsWith('reordered') && !(mode === 'missing-zero-exit' && index === 1)) record(phase);
    if (mode === 'duplicate' && index === 1) record(phase);
    if (env.LA_E2E_CLI_WORKSPACE_PARENT) {
      const workspaceParent = env.LA_E2E_CLI_WORKSPACE_PARENT;
      if (!trace.roots.includes(workspaceParent)) trace.roots.push(workspaceParent);
      const entry = {label:'stateless-variables', appType:'standard',
        workspaceFilePath:path.join(workspaceParent, 'unit.code-workspace')};
      fs.writeFileSync(entry.workspaceFilePath, '{"folders":[]}');
      if (env.LA_E2E_CLI_STATELESS_VARIABLES_MODE === 'create') {
        fs.writeFileSync(env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST, JSON.stringify([entry]));
      }
    }
    if (!trace.roots.includes(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT)) trace.roots.push(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT);
    const pending = JSON.parse(fs.readFileSync(env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH, 'utf8'));
    assert.equal(pending.complete, false, 'Leaf phase writer must not finalize the direct family');
    trace.pendingReceiptObservations++;
    if (mode.startsWith('reordered') && index === 2) {
      for (const item of [phases[1], phases[0], phases[2]]) record(item);
    }
  }
};
api.runStatelessVariablesLifecycle(undefined, operations).then(() => {
  assert.equal(invocations, 3);
  for (const owned of trace.roots) assert.equal(fs.existsSync(owned), false, 'Actual family cleanup must remove both roots');
  trace.actorFinishedAt = new Date().toISOString();
  if (mode === 'missing-file') fs.unlinkSync(process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH);
  if (mode === 'malformed') fs.appendFileSync(process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH, '\\n{');
  if (mode === 'missing-artifacts') {
    fs.unlinkSync(process.env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH);
    fs.unlinkSync(process.env.LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH);
  }
}).catch((error) => {
  trace.orchestratorError = error.message;
  // Deliberately reproduce the reviewed bug: force zero after incomplete phase
  // data and actual owned cleanup. The real parent wrapper must reject it.
  if (!mode.endsWith('zero-exit')) process.exitCode = 1;
}).finally(() => {
  trace.invocations = invocations;
  fs.writeFileSync(tracePath, JSON.stringify(trace));
});
`;

interface Receipt {
  suiteId: string;
  generatedAt: string;
  complete: boolean;
  exitCode: number;
  signal: string | null;
  cleanupVerified: boolean;
  diagnosticsError: string;
  phaseCompleteness: boolean;
  originalProcessClosureVerified: boolean;
  processClosureProof: 'retained-original-identities' | 'original-identities-unverified';
  lifecycleFinalized: boolean;
  phaseJournalPath: string;
  expectedPhaseIds: string[];
  observedPhaseIds: string[];
  missingPhaseIds: string[];
  unexpectedPhaseIds: string[];
  duplicatePhaseIds: string[];
  blockedPhaseIds: string[];
  phaseResults: Array<{
    phaseId: string;
    complete: boolean;
    exitCode: number;
    signal: string | null;
    cleanupVerified: boolean;
    diagnosticsError: string;
  }>;
}
interface Ledger {
  verified: boolean;
  processTreeVerified: boolean;
  transientCleanupVerified: boolean;
  processCleanup: {
    verified: boolean;
    checkedAt: string;
    alivePids: number[];
    retainedOriginalIdentitiesVerified?: boolean;
  };
}
interface Trace {
  roots: string[];
  invocations: number;
  pendingReceiptObservations: number;
  actorFinishedAt?: string;
  orchestratorError?: string;
}

async function main(): Promise<void> {
  const scriptPath = path.join(root, 'node-only-phase-fixture.js');
  fs.writeFileSync(scriptPath, fixture);
  const seedDir = path.join(root, 'extensions-seed');
  fs.mkdirSync(seedDir);
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  const modes = [
    'success',
    'missing-artifacts',
    'model-hint',
    'missing-zero-exit',
    'missing-file',
    'stale',
    'reordered',
    'reordered-zero-exit',
    'duplicate',
    'incomplete',
    'incomplete-zero-exit',
    'retained-root',
    'malformed',
  ];
  for (const mode of modes) {
    const caseRoot = path.join(root, mode);
    const resultsDir = path.join(caseRoot, 'results');
    fs.mkdirSync(resultsDir, { recursive: true });
    const terminalPath = path.join(resultsDir, `${suiteId}.terminal-result.json`);
    const ledgerPath = path.join(resultsDir, `${suiteId}.cleanup-ledger.json`);
    fs.writeFileSync(
      terminalPath,
      '{"complete":true,"oldSuccessfulReceipt":true,"originalProcessClosureVerified":true,"processClosureProof":"retained-original-identities"}'
    );
    fs.writeFileSync(ledgerPath, '{"verified":true,"oldSuccessfulReceipt":true}');
    const staleJournal = path.join(caseRoot, 'caller-stale.jsonl');
    fs.writeFileSync(staleJournal, '{"phaseId":"wrong-old-family"}');
    process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH = staleJournal;
    process.env.UNIT_STATELESS_DIRECT_MODE = mode;
    process.env.UNIT_STATELESS_DIRECT_TRACE = path.join(caseRoot, 'actual-orchestrator-trace.json');
    delete process.env.LA_E2E_CLI_PRESERVE_WORKSPACES;
    const code = await runner.runDirectFamily(suiteId, undefined, {
      scriptPath,
      seedDir,
      resultsDir,
      batchRoot: path.join(caseRoot, 'batch'),
      timeoutMs: 30_000,
    });
    const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8')) as Receipt;
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as Ledger;
    const trace = JSON.parse(fs.readFileSync(process.env.UNIT_STATELESS_DIRECT_TRACE, 'utf8')) as Trace;
    const diagnosticSucceeded = mode === 'success' || mode === 'missing-artifacts' || mode === 'model-hint';
    assert.strictEqual(code, diagnosticSucceeded ? 0 : 1, `${mode}: actual wrapper exit must follow phase/finalizer diagnostic outcome`);
    assert.strictEqual(terminal.complete, diagnosticSucceeded, mode);
    assert.strictEqual(terminal.exitCode, diagnosticSucceeded ? 0 : 1, mode);
    assert.strictEqual(terminal.lifecycleFinalized, true, mode);
    assert.strictEqual(ledger.verified, diagnosticSucceeded, 'No inadmissible ordered-phase chain may have a verified ledger');
    assert.strictEqual(terminal.suiteId, suiteId);
    assert.deepStrictEqual(terminal.expectedPhaseIds, expected);
    assert.ok(!fs.readFileSync(terminalPath, 'utf8').includes('oldSuccessfulReceipt'));
    assert.ok(!fs.readFileSync(ledgerPath, 'utf8').includes('oldSuccessfulReceipt'));
    assert.strictEqual(fs.readFileSync(staleJournal, 'utf8'), '{"phaseId":"wrong-old-family"}');
    assert.strictEqual(ledger.processCleanup.verified, true, 'Actual bounded Node child must have an observed clean process tree');
    assert.ok(ledger.processCleanup.checkedAt && Array.isArray(ledger.processCleanup.alivePids), 'No fabricated processCleanup proof');
    assert.strictEqual(
      ledger.processCleanup.retainedOriginalIdentitiesVerified,
      undefined,
      'This branch has only the legacy actual observer, not the other worker retained-identity correction'
    );
    assert.strictEqual(
      terminal.originalProcessClosureVerified,
      false,
      'Exit zero, empty post-exit tree, removed directories, stale receipt and callee model hints cannot prove original closure'
    );
    assert.strictEqual(terminal.processClosureProof, 'original-identities-unverified');
    if (diagnosticSucceeded) {
      // Assert the user-supplied supplementary terminal contract on the real
      // shared-writer artifact, not a separately constructed receipt/checker.
      assert.strictEqual(terminal.signal, null);
      assert.strictEqual(terminal.cleanupVerified, true);
      assert.strictEqual(terminal.diagnosticsError, '');
      assert.strictEqual(terminal.phaseCompleteness, true);
      assert.deepStrictEqual(terminal.missingPhaseIds, []);
      assert.deepStrictEqual(terminal.unexpectedPhaseIds, []);
      assert.deepStrictEqual(terminal.duplicatePhaseIds, []);
      assert.deepStrictEqual(terminal.blockedPhaseIds, []);
      assert.strictEqual(terminal.phaseResults.length, expected.length);
      terminal.phaseResults.forEach((phase, index) =>
        assert.deepStrictEqual(phase, {
          phaseId: expected[index],
          complete: true,
          exitCode: 0,
          signal: null,
          cleanupVerified: true,
          diagnosticsError: '',
        })
      );
      assert.notStrictEqual(terminal.phaseJournalPath, staleJournal);
      assert.ok(fs.existsSync(terminal.phaseJournalPath), 'Fresh scoped phase journal must be retained as provenance');
      assert.ok(trace.actorFinishedAt);
      assert.ok(
        Date.parse(ledger.processCleanup.checkedAt) >= Date.parse(trace.actorFinishedAt),
        'Observed normal child closure/process cleanup must follow actual orchestrator cleanup'
      );
      assert.ok(
        Date.parse(terminal.generatedAt) >= Date.parse(ledger.processCleanup.checkedAt),
        'Final label-specific terminal must follow the real process-cleanup observation'
      );
      assert.strictEqual(ledger.verified, true);
      assert.strictEqual(ledger.transientCleanupVerified, true);
      assert.deepStrictEqual(terminal.observedPhaseIds, expected);
      assert.strictEqual(trace.invocations, 3);
      assert.strictEqual(trace.pendingReceiptObservations, 3);
      trace.roots.forEach((owned) => assert.ok(!fs.existsSync(owned)));
    }
    if (mode === 'missing-zero-exit') {
      assert.ok(trace.orchestratorError, 'The actual orchestrator must reject incomplete phases before the forced-zero fault');
      assert.strictEqual(trace.invocations, 3);
      trace.roots.forEach((owned) => assert.ok(!fs.existsSync(owned)), 'Reviewed zero-after-cleanup failure must be reproduced');
    }
    if (mode === 'retained-root') {
      assert.ok(
        trace.roots.some((owned) => fs.existsSync(owned)),
        'Actual retained root must make admission fail'
      );
      assert.strictEqual(ledger.verified, false);
    }
  }
  console.log(
    `[statelessVariablesDirect.unit] ${modes.length} actual Node-only chains passed; original identities unverified, diagnostic only, no native credit`
  );
}

main()
  .finally(() => {
    for (const [key, value] of Object.entries({
      UNIT_STATELESS_DIRECT_MODE: originalEnv.mode,
      UNIT_STATELESS_DIRECT_TRACE: originalEnv.trace,
      LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: originalEnv.journal,
      LA_E2E_CLI_PRESERVE_WORKSPACES: originalEnv.keep,
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    fs.rmSync(root, { recursive: true, force: true });
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
