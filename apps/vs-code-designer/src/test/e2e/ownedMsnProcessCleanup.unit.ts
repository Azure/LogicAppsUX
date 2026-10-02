import * as assert from 'assert';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { OwnedProcessEvidenceError, type OwnedProcessIdentity } from '../../../scripts/e2e-cli-owned-processes';
import { createMsnProcessCleanup } from './ownedMsnProcessCleanup';

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
    positive.setTime(5100);
    positive.setRecords([positive.owner]);
    await cleanup.finalize();
    const before = JSON.parse(fs.readFileSync(`${positive.evidenceBase}.before-teardown.json`, 'utf8'));
    const after = JSON.parse(fs.readFileSync(`${positive.evidenceBase}.after-teardown.json`, 'utf8'));
    assert.strictEqual(before.processExitVerified, false);
    assert.strictEqual(after.processExitVerified, true);
    assert.strictEqual(after.filesystemCleanupVerified, false);
    assert.strictEqual(before.invocationId, after.invocationId);
    assert.deepStrictEqual(after.actions, []);
    assert.deepStrictEqual(positive.budgets, [10_000, 5000, 5000]);
    assert.ok(fs.existsSync(positive.workspace) && fs.existsSync(positive.dependencies));
    await assert.rejects(cleanup.capture(), reason('duplicate-process-capture'));
    await assert.rejects(cleanup.finalize(), reason('duplicate-process-finalization'));
    assert.strictEqual(positive.budgets.length, 3, 'Repeated calls cannot reset the deadline or start more observations');

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
    const timeoutCleanup = timeout.create();
    await timeoutCleanup.capture();
    timeout.setTime(10_100);
    await assert.rejects(timeoutCleanup.finalize(), reason('observation-budget-exhausted'));
    const timeoutEvidence = JSON.parse(fs.readFileSync(`${timeout.evidenceBase}.after-teardown.json`, 'utf8'));
    assert.strictEqual(timeoutEvidence.failureReason, 'observation-budget-exhausted');
    assert.strictEqual(timeoutEvidence.processExitVerified, false);
    assert.strictEqual(timeout.budgets.length, 1, 'An expired original deadline cannot start a read');

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
