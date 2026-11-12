import * as assert from 'assert';
import { mock } from 'node:test';
import type { CdpDebuggerEvent } from './cdpClient';
import { ScreenshotCaptureCleanupError, type LivePhysicalWorkspace } from './physicalWorkspaceIdentity';
import { regenerationPhysicalWorkspaceAuthority, type RegenerationPausableConnection } from './regenerationPhysicalWorkspaceAuthority';

class FakePausableConnection implements RegenerationPausableConnection {
  readonly targetId = 'owned-target';
  contextGeneration = 1;
  readonly methods: string[] = [];
  listener?: (event: CdpDebuggerEvent) => void;
  paused = false;
  readonly workspace: LivePhysicalWorkspace = {
    timeOrigin: 42,
    workspaceFilePath: 'workspace',
    rootPaths: ['root'],
    uiRootPaths: ['root'],
  };

  constructor(
    private readonly options: {
      alreadyPaused?: boolean;
      pauseFails?: boolean;
      resumeFails?: boolean;
      resumeLeavesPaused?: boolean;
      disableFails?: boolean;
      disableLeavesPaused?: boolean;
      badFrame?: boolean;
    } = {}
  ) {}

  onDebuggerEvent(listener: (event: CdpDebuggerEvent) => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = undefined;
    };
  }

  async send(method: string): Promise<{ result?: { result: { value: LivePhysicalWorkspace } } }> {
    this.methods.push(method);
    if (method === 'Debugger.enable' && this.options.alreadyPaused) {
      this.paused = true;
      this.listener?.({ method: 'Debugger.paused', callFrameId: 'existing-frame' });
    } else if (method === 'Debugger.pause') {
      if (this.options.pauseFails) {
        throw new Error('private-pause-error');
      }
      this.paused = true;
      this.listener?.({ method: 'Debugger.paused', ...(this.options.badFrame ? {} : { callFrameId: 'frame-1' }) });
    } else if (method === 'Debugger.resume') {
      if (this.options.resumeFails) {
        throw new Error('private-resume-error');
      }
      if (!this.options.resumeLeavesPaused) {
        this.paused = false;
      }
      this.listener?.({ method: 'Debugger.resumed' });
    } else if (method === 'Debugger.disable') {
      if (this.options.disableFails) {
        throw new Error('private-disable-error');
      }
      if (!this.options.disableLeavesPaused) {
        this.paused = false;
      }
    } else if (method === 'Runtime.evaluate') {
      return { result: { result: { value: this.workspace } } };
    }
    return {};
  }

  async evaluate<T>(): Promise<T> {
    this.methods.push('verify-responsive');
    if (this.paused) {
      throw new Error('renderer remains paused');
    }
    return true as T;
  }
}

export async function runRegenerationPhysicalAuthorityControls(): Promise<void> {
  const normal = new FakePausableConnection();
  const lease = await regenerationPhysicalWorkspaceAuthority(normal).arm('owned-target', 42, Date.now() + 2000);
  assert.strictEqual(normal.paused, true);
  const snapshot = await lease.read(Date.now() + 1000);
  assert.deepStrictEqual(snapshot.rootPaths, ['root']);
  assert.deepStrictEqual(snapshot.uiRootPaths, ['root']);
  assert.strictEqual(snapshot.timeOrigin, 42);
  assert.strictEqual(lease.invalidated, false);
  await lease.dispose();
  await lease.dispose();
  assert.strictEqual(normal.paused, false);
  assert.strictEqual(normal.listener, undefined);
  assert.deepStrictEqual(normal.methods, [
    'Debugger.enable',
    'Debugger.pause',
    'Runtime.evaluate',
    'Debugger.resume',
    'Debugger.disable',
    'verify-responsive',
  ]);

  const resumed = new FakePausableConnection();
  const lost = await regenerationPhysicalWorkspaceAuthority(resumed).arm('owned-target', 42, Date.now() + 2000);
  resumed.listener?.({ method: 'Debugger.resumed' });
  assert.strictEqual(lost.invalidated, true);
  await assert.rejects(lost.read(Date.now() + 1000));
  await lost.dispose();

  const changed = new FakePausableConnection();
  const changedLease = await regenerationPhysicalWorkspaceAuthority(changed).arm('owned-target', 42, Date.now() + 2000);
  changed.contextGeneration++;
  assert.strictEqual(changedLease.invalidated, true);
  await assert.rejects(changedLease.read(Date.now() + 1000));
  await changedLease.dispose();

  for (const options of [{ alreadyPaused: true }, { pauseFails: true }, { badFrame: true }]) {
    const fake = new FakePausableConnection(options);
    await assert.rejects(regenerationPhysicalWorkspaceAuthority(fake).arm('owned-target', 42, Date.now() + 2000));
    assert.strictEqual(fake.paused, false);
    assert.strictEqual(fake.listener, undefined);
    assert.ok(fake.methods.includes('Debugger.disable'));
    if (options.alreadyPaused) {
      assert.ok(!fake.methods.includes('Debugger.resume'), 'Do not resume a pause that this diagnostic did not request');
      assert.ok(fake.methods.includes('verify-responsive'), 'An existing pause must not be assumed to have cleared');
    }
  }

  const fallback = new FakePausableConnection({ resumeFails: true });
  const fallbackLease = await regenerationPhysicalWorkspaceAuthority(fallback).arm('owned-target', 42, Date.now() + 2000);
  await fallbackLease.dispose();
  assert.strictEqual(fallback.paused, false);
  assert.ok(fallback.methods.includes('verify-responsive'));

  const falseResume = new FakePausableConnection({ resumeLeavesPaused: true, disableLeavesPaused: true });
  const falseResumeLease = await regenerationPhysicalWorkspaceAuthority(falseResume).arm('owned-target', 42, Date.now() + 2000);
  await assert.rejects(async () => falseResumeLease.dispose(), /renderer remains paused/);
  assert.ok(falseResume.methods.includes('verify-responsive'));

  const failedCleanup = new FakePausableConnection({ resumeFails: true, disableFails: true });
  const failedLease = await regenerationPhysicalWorkspaceAuthority(failedCleanup).arm('owned-target', 42, Date.now() + 2000);
  await assert.rejects(async () => failedLease.dispose());
  assert.strictEqual(failedCleanup.listener, undefined);

  const failedArmCleanup = new FakePausableConnection({ alreadyPaused: true, disableFails: true });
  await assert.rejects(
    regenerationPhysicalWorkspaceAuthority(failedArmCleanup).arm('owned-target', 42, Date.now() + 2000),
    ScreenshotCaptureCleanupError
  );
  assert.strictEqual(failedArmCleanup.listener, undefined);

  const existingPauseRemains = new FakePausableConnection({ alreadyPaused: true, disableLeavesPaused: true });
  await assert.rejects(
    regenerationPhysicalWorkspaceAuthority(existingPauseRemains).arm('owned-target', 42, Date.now() + 2000),
    ScreenshotCaptureCleanupError
  );
  assert.ok(!existingPauseRemains.methods.includes('Debugger.resume'));

  const expired = new FakePausableConnection();
  const now = Date.now();
  const deadline = now + 50;
  let calls = 0;
  const clock = mock.method(Date, 'now', () => (calls++ === 0 ? now : deadline + 1));
  try {
    await assert.rejects(regenerationPhysicalWorkspaceAuthority(expired).arm('owned-target', 42, deadline));
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(expired.methods, ['Debugger.enable', 'Debugger.disable']);
    assert.strictEqual(expired.listener, undefined);
  } finally {
    clock.mock.restore();
  }
}
