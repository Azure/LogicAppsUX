import * as assert from 'assert';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { OwnedProcessEvidenceError, type OwnedProcessIdentity } from '../../../scripts/e2e-cli-owned-processes';
import { createHttpTimeoutProcessCleanup, createMsnProcessCleanup } from './ownedMsnProcessCleanup';

async function run(): Promise<void> {
  const roots: string[] = [];
  function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-msn-process-bridge-control-'));
    roots.push(root);
    const workspace = path.join(root, 'workspace');
    const dependencies = path.join(root, 'dependencies');
    const evidence = path.join(root, 'evidence');
    for (const directory of [workspace, dependencies, evidence]) {
      fs.mkdirSync(directory);
    }
    const executable = path.join(dependencies, 'runtime.exe');
    fs.writeFileSync(executable, '');
    const creationIdentity = (ticks: number) =>
      process.platform === 'win32' ? String(ticks) : `11111111-1111-4111-8111-111111111111:${ticks}`;
    const owner: OwnedProcessIdentity = { pid: 101, parentPid: 1, creationIdentity: creationIdentity(100), executable: process.execPath };
    const child: OwnedProcessIdentity = { pid: 102, parentPid: owner.pid, creationIdentity: creationIdentity(200), executable };
    const invocationId = randomUUID();
    const evidenceBase = path.join(evidence, `owned-processes-${invocationId}`);
    const env: NodeJS.ProcessEnv = {
      LA_E2E_CLI_MSN_PROCESS_INVOCATION: invocationId,
      LA_E2E_CLI_WORKSPACE_PARENT: workspace,
      LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: dependencies,
      LA_E2E_CLI_MSN_PROCESS_EVIDENCE_BASE: evidenceBase,
      LA_E2E_CLI_MSN_PROCESS_OWNER_JSON: JSON.stringify(owner),
    };
    let time = 100;
    let records: OwnedProcessIdentity[] = [owner, child];
    const budgets: number[] = [];
    const input = {
      now: () => time,
      provider: () => ({
        snapshot: async (budget: number) => {
          budgets.push(budget);
          return records;
        },
      }),
    };
    return {
      root,
      evidence,
      workspace,
      dependencies,
      evidenceBase,
      owner,
      child,
      creationIdentity,
      env,
      input,
      budgets,
      create: () => createMsnProcessCleanup(env, input),
      setRecords: (value: OwnedProcessIdentity[]) => {
        records = value;
      },
      setTime: (value: number) => {
        time = value;
      },
    };
  }
  const reason =
    (expected: string) =>
    (error: unknown): boolean =>
      error instanceof OwnedProcessEvidenceError && error.reason === expected;

  try {
    const positive = fixture();
    const cleanup = positive.create();
    positive.env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON = 'malformed-after-binding';
    await cleanup.capture();
    positive.setTime(60_100);
    positive.setRecords([positive.owner]);
    await cleanup.finalize();
    const before = JSON.parse(fs.readFileSync(`${positive.evidenceBase}.before-teardown.json`, 'utf8'));
    const after = JSON.parse(fs.readFileSync(`${positive.evidenceBase}.after-teardown.json`, 'utf8'));
    assert.strictEqual(before.processExitVerified, false);
    assert.strictEqual(after.processExitVerified, true);
    assert.strictEqual(after.filesystemCleanupVerified, false);
    assert.strictEqual(before.invocationId, after.invocationId);
    assert.deepStrictEqual(after.actions, []);
    assert.deepStrictEqual(positive.budgets, [10_000, 10_000, 10_000]);
    assert.ok(fs.existsSync(positive.workspace) && fs.existsSync(positive.dependencies));
    await assert.rejects(cleanup.capture(), reason('duplicate-process-capture'));
    await assert.rejects(cleanup.finalize(), reason('duplicate-process-finalization'));
    assert.strictEqual(positive.budgets.length, 3, 'Repeated calls cannot reset the deadline or start more observations');

    const http = fixture();
    const terminated: OwnedProcessIdentity[] = [];
    const terminationBudgets: number[] = [];
    const httpEnv: NodeJS.ProcessEnv = {
      LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_INVOCATION: http.env.LA_E2E_CLI_MSN_PROCESS_INVOCATION,
      LA_E2E_CLI_WORKSPACE_PARENT: http.workspace,
      LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: http.dependencies,
      LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_EVIDENCE_BASE: http.evidenceBase,
      LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_OWNER_JSON: http.env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON,
    };
    const httpCleanup = createHttpTimeoutProcessCleanup(httpEnv, {
      now: http.input.now,
      provider: () => ({
        snapshot: http.input.provider().snapshot,
        terminateExact: async (record, budget) => {
          assert.deepStrictEqual(
            {
              pid: record.pid,
              parentPid: record.parentPid,
              creationIdentity: record.creationIdentity,
              executable: record.executable,
            },
            http.child
          );
          terminated.push(record);
          terminationBudgets.push(budget);
          http.setRecords([http.owner]);
        },
      }),
    });
    await httpCleanup.capture();
    http.setTime(60_100);
    await httpCleanup.finalize();
    const httpAfter = JSON.parse(fs.readFileSync(`${http.evidenceBase}.runtime-1.after-teardown.json`, 'utf8'));
    assert.strictEqual(terminated.length, 1);
    assert.deepStrictEqual(httpAfter.actions, [{ pid: http.child.pid, creationIdentity: http.child.creationIdentity, requested: true }]);
    assert.strictEqual(httpAfter.processExitVerified, true);
    assert.strictEqual(httpAfter.filesystemCleanupVerified, false);
    assert.strictEqual(httpCleanup.captureAtTeardown, false);
    assert.deepStrictEqual(http.budgets, [10_000, 10_000, 10_000]);
    assert.deepStrictEqual(terminationBudgets, [10_000]);

    const alreadyStopped = fixture();
    alreadyStopped.setRecords([alreadyStopped.owner]);
    const alreadyStoppedCleanup = createHttpTimeoutProcessCleanup(
      {
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_INVOCATION: alreadyStopped.env.LA_E2E_CLI_MSN_PROCESS_INVOCATION,
        LA_E2E_CLI_WORKSPACE_PARENT: alreadyStopped.workspace,
        LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: alreadyStopped.dependencies,
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_EVIDENCE_BASE: alreadyStopped.evidenceBase,
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_OWNER_JSON: alreadyStopped.env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON,
      },
      alreadyStopped.input
    );
    await assert.rejects(alreadyStoppedCleanup.capture(), reason('missing-live-owned-process-observation'));
    const alreadyStoppedBefore = JSON.parse(fs.readFileSync(`${alreadyStopped.evidenceBase}.runtime-1.before-teardown.json`, 'utf8'));
    assert.deepStrictEqual(alreadyStoppedBefore.observedProcesses, []);
    assert.strictEqual(alreadyStoppedBefore.failureReason, 'missing-live-owned-process-observation');
    await assert.rejects(alreadyStoppedCleanup.finalize(), reason('missing-live-owned-process-observation'));

    const repeated = fixture();
    const designTime = { ...repeated.child, pid: 103 };
    const runtimeOne = { ...repeated.child, pid: 104 };
    const runtimeTwo = {
      ...repeated.child,
      pid: 105,
      parentPid: designTime.pid,
      creationIdentity: repeated.creationIdentity(300),
    };
    repeated.setRecords([repeated.owner, designTime, runtimeOne]);
    const repeatedTerminated: number[] = [];
    const repeatedCleanup = createHttpTimeoutProcessCleanup(
      {
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_INVOCATION: repeated.env.LA_E2E_CLI_MSN_PROCESS_INVOCATION,
        LA_E2E_CLI_WORKSPACE_PARENT: repeated.workspace,
        LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: repeated.dependencies,
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_EVIDENCE_BASE: repeated.evidenceBase,
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_OWNER_JSON: repeated.env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON,
      },
      {
        now: repeated.input.now,
        provider: () => ({
          snapshot: repeated.input.provider().snapshot,
          terminateExact: async (record) => {
            repeatedTerminated.push(record.pid);
            repeated.setRecords(
              [repeated.owner, designTime, { ...runtimeOne, parentPid: 999 }, runtimeTwo].filter(
                (candidate) => !repeatedTerminated.includes(candidate.pid)
              )
            );
          },
        }),
      }
    );
    await repeatedCleanup.capture();
    repeated.setRecords([repeated.owner, designTime, { ...runtimeOne, parentPid: 999 }, runtimeTwo]);
    await repeatedCleanup.capture();
    const repeatedFirstBefore = JSON.parse(fs.readFileSync(`${repeated.evidenceBase}.runtime-1.before-teardown.json`, 'utf8'));
    const repeatedSecondBefore = JSON.parse(fs.readFileSync(`${repeated.evidenceBase}.runtime-2.before-teardown.json`, 'utf8'));
    assert.deepStrictEqual(
      repeatedFirstBefore.observedProcesses.map((record: OwnedProcessIdentity) => record.pid),
      [designTime.pid, runtimeOne.pid]
    );
    assert.deepStrictEqual(
      repeatedSecondBefore.observedProcesses.map((record: OwnedProcessIdentity) => record.pid),
      [runtimeTwo.pid],
      'A later live-boundary capture must exclude only exact identities already proven by an earlier capture'
    );
    await assert.rejects(repeatedCleanup.capture(), reason('too-many-http-runtime-captures'));
    await repeatedCleanup.finalize();
    assert.deepStrictEqual(
      repeatedTerminated,
      [runtimeTwo.pid, designTime.pid, runtimeOne.pid],
      'Runtime captures must finalize newest-first so an earlier guard never sees an uncaptured later runtime'
    );
    for (const capture of [1, 2]) {
      assert.ok(fs.existsSync(`${repeated.evidenceBase}.runtime-${capture}.before-teardown.json`));
      assert.ok(fs.existsSync(`${repeated.evidenceBase}.runtime-${capture}.after-teardown.json`));
    }

    const replacementDuringSecondCapture = fixture();
    const original = { ...replacementDuringSecondCapture.child, pid: 106 };
    replacementDuringSecondCapture.setRecords([replacementDuringSecondCapture.owner, original]);
    const replacementCapture = createHttpTimeoutProcessCleanup(
      {
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_INVOCATION: replacementDuringSecondCapture.env.LA_E2E_CLI_MSN_PROCESS_INVOCATION,
        LA_E2E_CLI_WORKSPACE_PARENT: replacementDuringSecondCapture.workspace,
        LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: replacementDuringSecondCapture.dependencies,
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_EVIDENCE_BASE: replacementDuringSecondCapture.evidenceBase,
        LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_OWNER_JSON: replacementDuringSecondCapture.env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON,
      },
      replacementDuringSecondCapture.input
    );
    await replacementCapture.capture();
    replacementDuringSecondCapture.setRecords([
      replacementDuringSecondCapture.owner,
      { ...original, parentPid: 999, creationIdentity: `${original.creationIdentity}-replacement` },
    ]);
    await assert.rejects(replacementCapture.capture(), reason('unproven-process-ancestry'));

    for (const text of ['', 'not-json', '{}', 'null', '{"pid":"101"}']) {
      const malformed = fixture();
      malformed.env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON = text;
      const invalid = malformed.create();
      await assert.rejects(invalid.capture(), /missing-or-malformed-owner-input|invalid-owner-input/);
      assert.deepStrictEqual(malformed.budgets, []);
      await assert.rejects(invalid.capture(), reason('duplicate-process-capture'));
      await assert.rejects(invalid.finalize(), reason('missing-live-owned-process-observation'));
    }
    const missing = fixture();
    delete missing.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT;
    const lazy = missing.create();
    await assert.rejects(lazy.capture(), reason('missing-owned-process-environment'));
    assert.deepStrictEqual(missing.budgets, [], 'Lazy invalid setup must not perform observations');

    const early = fixture();
    const earlyCleanup = early.create();
    await assert.rejects(earlyCleanup.finalize(), reason('missing-live-owned-process-observation'));
    await assert.rejects(earlyCleanup.capture(), reason('duplicate-process-capture'));
    assert.deepStrictEqual(early.budgets, []);

    const collision = fixture();
    fs.writeFileSync(`${collision.evidenceBase}.before-teardown.json`, 'preexisting-control');
    const collisionCleanup = collision.create();
    await assert.rejects(collisionCleanup.capture(), /EEXIST/);
    assert.strictEqual(fs.readFileSync(`${collision.evidenceBase}.before-teardown.json`, 'utf8'), 'preexisting-control');
    await assert.rejects(collisionCleanup.finalize(), reason('missing-live-owned-process-observation'));
    assert.strictEqual(collision.budgets.length, 1, 'Failed persistence cannot authorize process finalization');

    const timeout = fixture();
    timeout.input.provider = () => ({
      snapshot: async (budget: number) => {
        timeout.budgets.push(budget);
        timeout.setTime(10_100);
        return [timeout.owner, timeout.child];
      },
    });
    await assert.rejects(timeout.create().capture(), reason('observation-budget-exhausted'));
    const timeoutEvidence = JSON.parse(fs.readFileSync(`${timeout.evidenceBase}.before-teardown.json`, 'utf8'));
    assert.strictEqual(timeoutEvidence.failureReason, 'observation-budget-exhausted');
    assert.strictEqual(timeoutEvidence.processExitVerified, false);
    assert.deepStrictEqual(timeout.budgets, [10_000], 'Capture keeps its original bounded observation deadline');

    const unavailable = fixture();
    unavailable.input.provider = () => ({
      snapshot: async () => {
        throw new Error('private-observation-control');
      },
    });
    await assert.rejects(unavailable.create().capture(), reason('process-observation-failed'));
    const failedEvidence = JSON.parse(fs.readFileSync(`${unavailable.evidenceBase}.before-teardown.json`, 'utf8'));
    assert.strictEqual(failedEvidence.failureReason, 'process-observation-failed');
    assert.ok(!JSON.stringify(failedEvidence).includes('private-observation-control'));

    const doubleFailure = fixture();
    fs.writeFileSync(`${doubleFailure.evidenceBase}.before-teardown.json`, 'preexisting-control');
    doubleFailure.input.provider = unavailable.input.provider;
    await assert.rejects(doubleFailure.create().capture(), (error: AggregateError) => {
      assert.strictEqual(error.errors.length, 2);
      assert.ok(reason('process-observation-failed')(error.errors[0]));
      assert.match(String(error.errors[1]), /EEXIST/);
      return true;
    });

    const replacement = fixture();
    const replacementCleanup = replacement.create();
    await replacementCleanup.capture();
    replacement.setRecords([replacement.owner]);
    fs.renameSync(replacement.evidence, `${replacement.evidence}-original`);
    fs.mkdirSync(replacement.evidence);
    await assert.rejects(replacementCleanup.finalize(), reason('process-evidence-location-changed'));
    assert.ok(!fs.existsSync(`${replacement.evidenceBase}.after-teardown.json`));

    const escaped = fixture();
    escaped.env.LA_E2E_CLI_MSN_PROCESS_EVIDENCE_BASE = path.join(escaped.evidence, 'foreign-invocation');
    await assert.rejects(escaped.create().capture(), reason('unsafe-process-evidence-location'));
    assert.deepStrictEqual(escaped.budgets, []);
    const linked = fixture();
    const link = path.join(linked.root, 'linked-evidence');
    fs.symlinkSync(linked.evidence, link, process.platform === 'win32' ? 'junction' : 'dir');
    linked.env.LA_E2E_CLI_MSN_PROCESS_EVIDENCE_BASE = path.join(link, path.basename(linked.evidenceBase));
    await assert.rejects(linked.create().capture(), reason('unsafe-process-evidence-location'));
    fs.unlinkSync(link);
    assert.deepStrictEqual(linked.budgets, []);
    console.log('[ownedMsnProcessCleanup.unit] all tests passed');
  } finally {
    for (const root of roots) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
