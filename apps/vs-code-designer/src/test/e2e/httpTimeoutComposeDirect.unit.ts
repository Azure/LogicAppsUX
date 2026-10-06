import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type Control = (name: string, run: () => void | Promise<void>) => Promise<void>;

// Execute the actual family orchestrator, phase writer, root-absence observation
// and terminal/ledger finalizer. CLI outcomes/OS closure observations are unit
// fixtures only; no Code/runtime is launched or native coverage claimed.
export async function runHttpTimeoutComposeDirectControls(control: Control): Promise<void> {
  const runner = require(path.resolve(__dirname, '../../../scripts/run-e2e-cli.js'))._test;
  const keys = [
    'LA_E2E_CLI_BATCH_MODE',
    'LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT',
    'LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH',
    'LA_E2E_CLI_PRESERVE_WORKSPACES',
  ] as const;
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    delete process.env[key];
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'http-timeout-direct-writer-unit-'));
  try {
    for (const fault of [
      'none',
      'missing-bootstrap',
      'out-of-order',
      'stale-phase',
      'incomplete-phase',
      'missing-phase-closure',
      'phase-orphan',
      'final-orphan',
      'final-observation-error',
      'retained-workspace',
      'retained-runtime',
      'cleanup-error',
      'stale-terminal',
      'malformed-phases',
      'no-tests',
      'stale-closure',
    ]) {
      await control(`direct orchestrator/writer ${fault} preserves truthful current-invocation result`, async () => {
        const directory = fs.mkdtempSync(path.join(root, `${fault}-`));
        const resultsDir = path.join(directory, 'results');
        const artifactDir = path.join(directory, 'artifacts');
        const workspace = path.join(directory, 'workspace-owned');
        const runtime = path.join(directory, 'runtime-owned');
        fs.mkdirSync(resultsDir);
        const terminalPath = path.join(resultsDir, 'httpTimeoutComposeOriginal.terminal-result.json');
        const ledgerPath = path.join(resultsDir, 'httpTimeoutComposeOriginal.cleanup-ledger.json');
        fs.writeFileSync(terminalPath, JSON.stringify({ complete: true, invocation: { id: 'stale-prior-invocation' }, phaseResults: [] }));
        let calls = 0;
        let cleanupCalled = false;
        let initializedId = '';
        let phasePath = '';
        const expected = runner.getDirectExpectedPhaseIds('httpTimeoutComposeOriginal');
        const closure = (ownerPid: number) => ({
          schemaVersion: 1,
          verified: true,
          ownerPid,
          alivePids: [] as number[],
          checkedAt: new Date().toISOString(),
        });
        const invocation = runner.runHttpTimeoutComposeOriginal({
          artifactDir,
          resultsDir,
          createParent: () => {
            fs.mkdirSync(workspace);
            return workspace;
          },
          createRuntimeRoot: () => {
            fs.mkdirSync(runtime);
            return runtime;
          },
          cleanup: async () => {
            assert.strictEqual(calls, 3);
            assert.strictEqual(JSON.parse(fs.readFileSync(terminalPath, 'utf8')).complete, fault === 'stale-terminal');
            cleanupCalled = true;
            if (fault === 'cleanup-error') {
              throw new Error('unit-owned cleanup failed');
            }
            if (fault !== 'retained-workspace') {
              fs.rmSync(workspace, { recursive: true });
            }
          },
          cleanupRuntime: async () => {
            if (fault !== 'retained-runtime') {
              fs.rmSync(runtime, { recursive: true });
            }
          },
          observeClosure: async (ownerPid: number) => {
            assert.strictEqual(cleanupCalled, true, 'Final closure observation follows actual owned cleanup attempt');
            if (fault === 'final-observation-error') {
              throw new Error('unit process observation failed');
            }
            return fault === 'final-orphan' ? { ...closure(ownerPid), verified: false, alivePids: [1234] } : closure(ownerPid);
          },
          run: async (args: string[], options: { extraEnv: Record<string, string> }) => {
            calls++;
            const env = options.extraEnv;
            phasePath = env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
            const initialized = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
            assert.strictEqual(initialized.complete, false);
            assert.strictEqual(initialized.lifecycleFinalized, false);
            assert.strictEqual(initialized.invocation.replacedPriorResult, true);
            assert.notStrictEqual(initialized.invocation.id, 'stale-prior-invocation');
            initializedId ||= initialized.invocation.id;
            assert.strictEqual(initialized.invocation.id, initializedId);
            assert.strictEqual(env.LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_INVOCATION_ID, initializedId);
            if (calls === 2) {
              const wsDir = path.join(workspace, 'ws');
              const appDir = path.join(wsDir, 'app');
              const wfDir = path.join(appDir, 'workflow');
              fs.mkdirSync(wfDir, { recursive: true });
              const wsFilePath = path.join(wsDir, 'ws.code-workspace');
              fs.writeFileSync(wsFilePath, '{}');
              fs.writeFileSync(path.join(wfDir, 'workflow.json'), '{}');
              fs.writeFileSync(
                env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST,
                JSON.stringify([
                  {
                    parentDir: workspace,
                    wsName: 'ws',
                    appName: 'app',
                    wfName: 'workflow',
                    wsDir,
                    appDir,
                    wfDir,
                    wsFilePath,
                    appType: 'standard',
                    wfType: 'Stateless',
                    createdAt: new Date().toISOString(),
                  },
                ])
              );
            }
            const phaseStartedAt = new Date().toISOString();
            const processCleanup = closure(1000 + calls);
            const phase = {
              label: args[1],
              phaseId: runner.getSuitePhaseId(args[1], env),
              invocationId: initializedId,
              phaseStartedAt,
              phaseFinishedAt: new Date().toISOString(),
              complete: true,
              exitCode: 0,
              signal: null,
              cleanupVerified: true,
              diagnosticsError: '',
              processCleanup,
              mochaPassingCount: 1,
            };
            if (fault === 'out-of-order' && calls < 3) {
              phase.phaseId = expected[2 - calls];
            }
            if (fault === 'stale-phase' && calls === 1) {
              phase.invocationId = 'another-invocation';
            }
            if (fault === 'incomplete-phase' && calls === 2) {
              phase.complete = false;
            }
            if (fault === 'no-tests' && calls === 1) {
              phase.mochaPassingCount = 0;
            }
            if (fault === 'stale-closure' && calls === 3) {
              phase.processCleanup.checkedAt = '2000-01-01T00:00:00.000Z';
            }
            if (fault === 'missing-phase-closure' && calls === 1) {
              delete (phase as any).processCleanup;
            }
            if (fault === 'phase-orphan' && calls === 3) {
              phase.processCleanup = { ...processCleanup, verified: false, alivePids: [1234] };
            }
            if (!(fault === 'missing-bootstrap' && calls === 1)) {
              runner.writeSuitePhaseResult(env, phase);
            }
            if (fault === 'stale-terminal' && calls === 3) {
              fs.writeFileSync(terminalPath, JSON.stringify({ complete: true, invocation: { id: 'stale-replacement' } }));
            }
            if (fault === 'malformed-phases' && calls === 3) {
              fs.appendFileSync(phasePath, '\ninvalid-json');
            }
            return 0;
          },
        });
        if (fault === 'none') {
          assert.strictEqual(await invocation, 0);
        } else {
          await assert.rejects(() => invocation);
        }
        const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
        const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
        assert.strictEqual(
          terminal.originalProcessClosureVerified,
          false,
          'Current post-exit ancestry fixtures cannot prove original retained process identities'
        );
        assert.strictEqual(terminal.processClosureProof, 'original-identities-unverified');
        assert.strictEqual(terminal.complete, fault === 'none');
        assert.strictEqual(terminal.lifecycleFinalized, true);
        assert.strictEqual(terminal.invocation.id, initializedId);
        assert.strictEqual(ledger.invocation.id, initializedId);
        assert.strictEqual(ledger.verified, fault === 'none');
        assert.deepStrictEqual(terminal.expectedPhaseIds, expected);
        assert.strictEqual(terminal.ogfScenarios, undefined, 'Unit writer fixtures cannot create mapped/native credit');
        if (fault === 'none') {
          assert.strictEqual(terminal.suiteId, 'httpTimeoutComposeOriginal');
          assert.strictEqual(terminal.exitCode, 0);
          assert.strictEqual(terminal.signal, null);
          assert.strictEqual(terminal.cleanupVerified, true);
          assert.strictEqual(terminal.diagnosticsError, '');
          assert.strictEqual(terminal.phaseCompleteness, true);
          assert.deepStrictEqual(terminal.observedPhaseIds, expected);
          for (const field of ['missingPhaseIds', 'unexpectedPhaseIds', 'duplicatePhaseIds', 'blockedPhaseIds']) {
            assert.deepStrictEqual(terminal[field], [], `Supplementary acceptance requires empty ${field}`);
          }
          assert.strictEqual(ledger.ownedRootCleanup.verified, true);
          assert.strictEqual(fs.existsSync(workspace), false);
          assert.strictEqual(fs.existsSync(runtime), false);
          assert.strictEqual(terminal.phaseResults.length, 3);
          for (const [index, phase] of terminal.phaseResults.entries()) {
            assert.deepStrictEqual(
              phase,
              {
                phaseId: expected[index],
                complete: true,
                exitCode: 0,
                signal: null,
                cleanupVerified: true,
                diagnosticsError: '',
              },
              'Each original phase must have the standard supplementary terminal projection'
            );
          }
        }
        assert.ok(fs.existsSync(phasePath), 'Original invocation phase evidence retained');
      });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    for (const key of keys) {
      if (prior[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior[key];
      }
    }
  }
}
