import * as assert from 'assert';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

export interface RunAfterPersistenceIdentity {
  requestTriggerId: string;
  firstComposeId: string;
  secondComposeId: string;
  firstComposeInput: string;
  secondComposeInput: string;
}

export interface RunAfterPersistenceOracleResult {
  workflowPath: string;
  sha256: string;
  identity: RunAfterPersistenceIdentity;
}

export async function readRunAfterPersistenceWorkflow(
  workflowPath: string,
  identity: RunAfterPersistenceIdentity
): Promise<RunAfterPersistenceOracleResult> {
  const bytes = await readFile(workflowPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const workflow = JSON.parse(bytes.toString('utf8')) as {
    kind?: unknown;
    definition?: {
      triggers?: Record<string, unknown>;
      actions?: Record<string, unknown>;
      outputs?: unknown;
    };
  };
  assertRunAfterPersistenceWorkflow(workflow, identity);
  return { workflowPath, sha256, identity };
}

export function assertRunAfterPersistenceWorkflow(
  workflow: {
    kind?: unknown;
    definition?: {
      triggers?: Record<string, unknown>;
      actions?: Record<string, unknown>;
    };
  },
  identity: RunAfterPersistenceIdentity
): void {
  assert.strictEqual(workflow.kind, 'Stateful', 'Run After lifecycle workflow must remain Stateful');
  assert.ok(workflow.definition && typeof workflow.definition === 'object', 'workflow.json must contain a definition object');

  const triggers = workflow.definition.triggers;
  assert.ok(triggers && typeof triggers === 'object' && !Array.isArray(triggers), 'Workflow triggers must be an object');
  assert.deepStrictEqual(Object.keys(triggers), [identity.requestTriggerId], 'Workflow must contain exactly the captured Request trigger');
  const trigger = triggers[identity.requestTriggerId] as { type?: unknown; kind?: unknown };
  assert.strictEqual(trigger.type, 'Request', 'Captured trigger must be the built-in Request trigger');
  assert.strictEqual(trigger.kind, 'Http', 'Captured Request trigger must retain Http kind');

  const actions = workflow.definition.actions;
  assert.ok(actions && typeof actions === 'object' && !Array.isArray(actions), 'Workflow actions must be an object');
  assert.deepStrictEqual(
    Object.keys(actions).sort(),
    [identity.firstComposeId, identity.secondComposeId].sort(),
    'Workflow must contain exactly the two captured Compose actions'
  );
  assert.notStrictEqual(identity.firstComposeId, identity.secondComposeId, 'Compose action identities must be unique');
  assert.notStrictEqual(identity.firstComposeInput, identity.secondComposeInput, 'Compose input sentinels must be unique');

  const first = actions[identity.firstComposeId] as {
    type?: unknown;
    inputs?: unknown;
    runAfter?: unknown;
  };
  const second = actions[identity.secondComposeId] as {
    type?: unknown;
    inputs?: unknown;
    runAfter?: unknown;
  };
  assert.strictEqual(first.type, 'Compose', 'First captured action must be Compose');
  assert.strictEqual(second.type, 'Compose', 'Second captured action must be Compose');
  assert.deepStrictEqual(first.inputs, identity.firstComposeInput, 'First Compose input must match its unique sentinel exactly');
  assert.deepStrictEqual(second.inputs, identity.secondComposeInput, 'Second Compose input must match its unique sentinel exactly');
  assert.deepStrictEqual(first.runAfter ?? {}, {}, 'First Compose must not contain an action predecessor');
  assert.deepStrictEqual(
    second.runAfter,
    { [identity.firstComposeId]: ['FAILED'] },
    'Second Compose must run after exactly the first Compose on Failed only'
  );
}
