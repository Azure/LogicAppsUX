import * as assert from 'node:assert/strict';
import { observeCSharpReadiness, type ReadinessClock } from './dependencyReadiness';

class FakeClock implements ReadinessClock {
  time = 0;
  private readonly timers = new Map<() => void, number>();

  now(): number {
    return this.time;
  }

  schedule(callback: () => void, delayMs: number): () => void {
    this.timers.set(callback, this.time + delayMs);
    return () => this.timers.delete(callback);
  }

  advance(ms: number): void {
    this.time += ms;
    for (const [callback, deadline] of this.timers) {
      if (deadline <= this.time) {
        this.timers.delete(callback);
        callback();
      }
    }
  }

  get pendingTimers(): number {
    return this.timers.size;
  }
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void; reject(error: Error): void } {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function active(captureActivityLogs: () => unknown): unknown {
  return { isActive: true, exports: { captureActivityLogs } };
}

async function main(): Promise<void> {
  let controls = 0;
  const check = async (label: string, body: () => Promise<void>) => {
    await body();
    controls++;
    console.log(`[dependencyReadiness.unit] PASS ${label}`);
  };

  await check('awaits capture and async disposal in order, preserving receivers', async () => {
    const clock = new FakeClock();
    const captured = deferred<unknown>();
    const disposed = deferred<void>();
    const order: string[] = [];
    const capture = {
      dispose() {
        assert.equal(this, capture);
        order.push('dispose');
        return disposed.promise;
      },
    };
    const api = {
      captureActivityLogs() {
        assert.equal(this, api);
        order.push('capture');
        return captured.promise;
      },
    };
    const observation = observeCSharpReadiness({ isActive: true, exports: api }, 100, clock).then(() => order.push('complete'));
    assert.deepEqual(order, ['capture']);
    captured.resolve(capture);
    await Promise.resolve();
    assert.deepEqual(order, ['capture', 'dispose']);
    disposed.resolve();
    await observation;
    assert.deepEqual(order, ['capture', 'dispose', 'complete']);
    assert.equal(clock.pendingTimers, 0);
  });

  await check('missing/inactive dependencies fail without activation', async () => {
    let activated = false;
    for (const extension of [undefined, null, {}, { isActive: false, activate: () => (activated = true) }]) {
      const clock = new FakeClock();
      await assert.rejects(observeCSharpReadiness(extension, 100, clock), /already-active/);
      assert.equal(clock.pendingTimers, 0);
    }
    assert.equal(activated, false);
  });

  await check('missing/malformed expected API fails closed', async () => {
    for (const exports of [undefined, null, {}, { captureActivityLogs: true }]) {
      await assert.rejects(observeCSharpReadiness({ isActive: true, exports }, 100, new FakeClock()), /expected captureActivityLogs/);
    }
    for (const capture of [undefined, null, {}, { dispose: true }]) {
      await assert.rejects(
        observeCSharpReadiness(
          active(() => capture),
          100,
          new FakeClock()
        ),
        /disposable activity capture/
      );
    }
  });

  await check('synchronous capture throw and async rejection retain cause', async () => {
    const failure = new Error('capture failed');
    for (const capture of [
      () => {
        throw failure;
      },
      () => Promise.reject(failure),
    ]) {
      await assert.rejects(observeCSharpReadiness(active(capture), 100, new FakeClock()), (error) => error === failure);
    }
  });

  await check('synchronous and async disposal failures retain cause', async () => {
    const failure = new Error('dispose failed');
    for (const dispose of [
      () => {
        throw failure;
      },
      () => Promise.reject(failure),
    ]) {
      await assert.rejects(
        observeCSharpReadiness(
          active(() => ({ dispose })),
          100,
          new FakeClock()
        ),
        (error) => error === failure
      );
    }
  });

  await check('zero/negative/nonfinite budgets fail before invoking API', async () => {
    let called = false;
    for (const budget of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const clock = new FakeClock();
      await assert.rejects(
        observeCSharpReadiness(
          active(() => (called = true)),
          budget,
          clock
        ),
        /positive finite deadline/
      );
      assert.equal(clock.pendingTimers, 0);
    }
    assert.equal(called, false);
  });

  await check('never-resolving capture fails at deadline', async () => {
    const clock = new FakeClock();
    const observation = observeCSharpReadiness(
      active(() => new Promise<never>(() => {})),
      100,
      clock
    );
    const failed = assert.rejects(observation, /100ms absolute deadline/);
    clock.advance(100);
    await failed;
    assert.equal(clock.pendingTimers, 0);
  });

  await check('capture and disposal share a single absolute budget', async () => {
    const clock = new FakeClock();
    const captured = deferred<unknown>();
    const disposed = deferred<void>();
    const observation = observeCSharpReadiness(
      active(() => captured.promise),
      100,
      clock
    );
    const failed = assert.rejects(observation, /absolute deadline/);
    clock.advance(75);
    captured.resolve({ dispose: () => disposed.promise });
    await Promise.resolve();
    clock.advance(25);
    await failed;
    // Leave no rejected continuation when disposal finishes after timeout.
    disposed.resolve();
  });

  await check('late capture disposed exactly once; timeout never becomes success', async () => {
    const clock = new FakeClock();
    const captured = deferred<unknown>();
    let disposals = 0;
    const lateErrors: unknown[] = [];
    const observation = observeCSharpReadiness(
      active(() => captured.promise),
      100,
      clock,
      (_message, error) => lateErrors.push(error)
    );
    const failed = assert.rejects(observation, /absolute deadline/);
    clock.advance(100);
    await failed;
    const disposal = deferred<void>();
    captured.resolve({
      dispose: () => {
        disposals++;
        disposal.resolve();
      },
    });
    await disposal.promise;
    await assert.rejects(observation, /absolute deadline/);
    assert.equal(disposals, 1);
    assert.equal(clock.pendingTimers, 0);
  });

  await check('late disposal rejection is reported without unhandled rejection', async () => {
    const clock = new FakeClock();
    const captured = deferred<unknown>();
    const reported = deferred<unknown>();
    const failure = new Error('late disposal failed');
    const observation = observeCSharpReadiness(
      active(() => captured.promise),
      100,
      clock,
      (_message, error) => reported.resolve(error)
    );
    const failed = assert.rejects(observation, /absolute deadline/);
    clock.advance(100);
    await failed;
    captured.resolve({ dispose: () => Promise.reject(failure) });
    assert.equal(await reported.promise, failure);
    await assert.rejects(observation, /absolute deadline/);
  });

  await check('late capture rejection is reported', async () => {
    const clock = new FakeClock();
    const captured = deferred<unknown>();
    const reported = deferred<unknown>();
    const failure = new Error('late capture failed');
    const observation = observeCSharpReadiness(
      active(() => captured.promise),
      100,
      clock,
      (_message, error) => reported.resolve(error)
    );
    const failed = assert.rejects(observation, /absolute deadline/);
    clock.advance(100);
    await failed;
    captured.reject(failure);
    assert.equal(await reported.promise, failure);
  });

  await check('absolute clock expiry fails even before timer callback runs', async () => {
    const clock = new FakeClock();
    let disposed = false;
    await assert.rejects(
      observeCSharpReadiness(
        active(() => {
          clock.time = 100;
          return { dispose: () => (disposed = true) };
        }),
        100,
        clock
      ),
      /absolute deadline/
    );
    assert.equal(disposed, true);
    assert.equal(clock.pendingTimers, 0);
  });
  console.log(`[dependencyReadiness.unit] ${controls} controls passed`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
