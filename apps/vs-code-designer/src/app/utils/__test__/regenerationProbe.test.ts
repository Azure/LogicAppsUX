/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRegenerationProbe } from '../regenerationProbe';

vi.unmock('fs');
vi.unmock('node:fs');
vi.unmock('os');
vi.unmock('node:os');

const invocation = '11111111-1111-4111-8111-111111111111';
const armId = '22222222-2222-4222-8222-222222222222';
const phase = 'vscode-single';
const roots: string[] = [];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regeneration-probe-'));
  roots.push(root);
  const traceFile = path.join(root, `${phase}-product-events.jsonl`);
  const receiptFile = path.join(root, `${phase}-product-arming.json`);
  const receipt = {
    schemaVersion: 1,
    status: 'armed',
    suiteId: 'workspaceArtifactRegeneration',
    invocation,
    phase,
    armId,
    traceFile: path.basename(traceFile),
    armedAtUtc: new Date(Date.now() - 1000).toISOString(),
    source: 'local',
    run: 'local',
    jobAttempt: 1,
  };
  const env = {
    LA_E2E_CLI_REGENERATION_PROBE: '1',
    LA_E2E_CLI_REGENERATION_TRACE_FILE: traceFile,
    LA_E2E_CLI_REGENERATION_TRACE_PHASE: phase,
    LA_E2E_CLI_REGENERATION_TRACE_INVOCATION: invocation,
  };
  return { root, traceFile, receiptFile, receipt, env };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('regeneration probe', () => {
  it('does no probe I/O when the opt-in flag is absent', async () => {
    const { traceFile, env } = fixture();
    const failures: string[] = [];
    const probe = createRegenerationProbe({ ...env, LA_E2E_CLI_REGENERATION_PROBE: undefined }, (reason) => failures.push(reason));

    probe.record({ event: 'activation-start' });
    await probe.flush();
    await probe.dispose();

    expect(fs.existsSync(traceFile)).toBe(false);
    expect(failures).toEqual([]);
  });

  it('writes bound, ordered, allowlisted events only to the pre-created trace', async () => {
    const { root, traceFile, receiptFile, receipt, env } = fixture();
    fs.writeFileSync(traceFile, '');
    fs.writeFileSync(receiptFile, JSON.stringify(receipt));
    const failures: string[] = [];
    const probe = createRegenerationProbe(env, (reason) => failures.push(reason));
    const input = { event: 'activation-workspace' as const, folderCount: 1, rawNotification: 'synthetic-private-value' };

    probe.record({ event: 'activation-start' });
    probe.record(input);
    probe.record({ event: 'warning-call-entered', kind: 'initialization', warningId: 1 });
    probe.record({ event: 'warning-call-returned', kind: 'initialization', warningId: 1 });
    await probe.dispose();

    const contents = fs.readFileSync(traceFile, 'utf8');
    const records = contents
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records.slice(0, 5).map((record) => record.event)).toEqual([
      'recorder-armed',
      'activation-start',
      'activation-workspace',
      'warning-call-entered',
      'warning-call-returned',
    ]);
    expect(records.slice(5).every((record) => record.event === 'heartbeat')).toBe(true);
    expect(records.map((record) => record.sequence)).toEqual(records.map((_record, index) => index + 1));
    expect(records.every((record) => record.schemaVersion === 1 && record.invocation === invocation && record.phase === phase)).toBe(true);
    expect(records.every((record) => record.armId === armId && Number.isFinite(Date.parse(record.timestampUtc)))).toBe(true);
    expect(records[2].payload).toEqual({ folderCount: 1 });
    expect(contents).not.toContain('synthetic-private-value');
    expect(contents).not.toContain(root);
    expect(failures).toEqual([]);
  });

  it('reports an invalid configuration without opening or creating a trace', async () => {
    const { traceFile, env } = fixture();
    const failures: string[] = [];
    const probe = createRegenerationProbe({ ...env, LA_E2E_CLI_REGENERATION_TRACE_PHASE: '../wrong' }, (reason) => failures.push(reason));

    probe.record({ event: 'activation-start' });
    await probe.dispose();

    expect(failures).toEqual(['invalid-configuration']);
    expect(fs.existsSync(traceFile)).toBe(false);
  });

  it('does not create a missing trace', async () => {
    const { traceFile, receiptFile, receipt, env } = fixture();
    fs.writeFileSync(receiptFile, JSON.stringify(receipt));
    const failures: string[] = [];
    const probe = createRegenerationProbe(env, (reason) => failures.push(reason));

    probe.record({ event: 'activation-start' });
    await probe.dispose();

    expect(failures).toEqual(['initialization-failed']);
    expect(fs.existsSync(traceFile)).toBe(false);
  });

  it('reports a trace-write failure without exposing the error or rejecting the caller', async () => {
    const { traceFile, receiptFile, receipt, env } = fixture();
    fs.writeFileSync(traceFile, '');
    fs.writeFileSync(receiptFile, JSON.stringify(receipt));
    const actualOpen = fs.promises.open.bind(fs.promises);
    vi.spyOn(fs.promises, 'open').mockImplementation(async (file, flags, mode) => {
      const handle = await actualOpen(file, flags, mode);
      if (String(file) === traceFile) {
        vi.spyOn(handle, 'writeFile').mockRejectedValue(new Error('synthetic-private-write-error'));
      }
      return handle;
    });
    const failures: string[] = [];
    const probe = createRegenerationProbe(env, (reason) => failures.push(reason));

    probe.record({ event: 'activation-start' });
    await expect(probe.dispose()).resolves.toBeUndefined();

    expect(failures).toEqual(['write-failed']);
    expect(JSON.stringify(failures)).not.toContain('synthetic-private-write-error');
  });

  it.each([
    ['wrong invocation', { invocation: '33333333-3333-4333-8333-333333333333' }],
    ['wrong trace', { traceFile: 'another-product-events.jsonl' }],
    ['late arming', { armedAtUtc: '2999-01-01T00:00:00.000Z' }],
  ])('does not write when the receipt has %s', async (_name, mismatch) => {
    const { traceFile, receiptFile, receipt, env } = fixture();
    fs.writeFileSync(traceFile, '');
    fs.writeFileSync(receiptFile, JSON.stringify({ ...receipt, ...mismatch }));
    const failures: string[] = [];
    const probe = createRegenerationProbe(env, (reason) => failures.push(reason));

    probe.record({ event: 'activation-start' });
    await probe.dispose();

    expect(failures).toEqual(['initialization-failed']);
    expect(fs.readFileSync(traceFile, 'utf8')).toBe('');
  });

  it('records an explicit overflow instead of buffering indefinitely', async () => {
    const { traceFile, receiptFile, receipt, env } = fixture();
    fs.writeFileSync(traceFile, '');
    fs.writeFileSync(receiptFile, JSON.stringify(receipt));
    const failures: string[] = [];
    const probe = createRegenerationProbe(env, (reason) => failures.push(reason));

    for (let index = 0; index < 300; index++) {
      probe.record({ event: 'activation-start' });
    }
    await probe.dispose();

    const records = fs
      .readFileSync(traceFile, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records.length).toBeLessThanOrEqual(128);
    expect(records.at(-1)).toMatchObject({ event: 'recorder-overflow', payload: { reason: 'queue-limit' } });
    expect(records.map((record) => record.sequence)).toEqual(records.map((_record, index) => index + 1));
    expect(failures).toEqual([]);
  });
});
