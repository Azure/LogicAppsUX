import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { EvidenceScreenshotSession } from './screenshotSession';

class FakeConnection {
  isClosed = false;
  disposals = 0;
  unrefs = 0;
  closeListener?: () => void;
  constructor(readonly targetId: string) {}
  dispose(): void {
    this.disposals++;
    this.isClosed = true;
  }
  unref(): void {
    this.unrefs++;
  }
  onDidClose(listener: () => void): () => void {
    this.closeListener = listener;
    return () => {
      this.closeListener = undefined;
    };
  }
  closeWindow(): void {
    this.isClosed = true;
    this.closeListener?.();
  }
}

test('standard wrappers retain one owner while resolving the exact target on every acquisition', async () => {
  let resolves = 0;
  let connects = 0;
  const connection = new FakeConnection('workbench-1');
  const session = new EvidenceScreenshotSession(
    async () => {
      resolves++;
      return 'workbench-1';
    },
    async () => {
      connects++;
      return connection;
    }
  );
  assert.equal(await session.acquire(Date.now() + 5000), connection);
  assert.equal(await session.acquire(Date.now() + 5000), connection);
  assert.equal(resolves, 2);
  assert.equal(connects, 1);
  assert.equal(connection.disposals, 0);
  assert.equal(connection.unrefs, 1);
  session.dispose();
  session.dispose();
  assert.equal(connection.disposals, 1);
  assert.equal(connection.closeListener, undefined);
  await assert.rejects(session.acquire(Date.now() + 5000), /invocation has already ended/);
});

test('owned window closure and target replacement release the original session', async () => {
  let target = 'workbench-1';
  const connections: FakeConnection[] = [];
  const session = new EvidenceScreenshotSession(
    async () => target,
    async () => {
      const connection = new FakeConnection(target);
      connections.push(connection);
      return connection;
    }
  );
  const first = await session.acquire(Date.now() + 5000);
  first.closeWindow();
  const second = await session.acquire(Date.now() + 5000);
  assert.notEqual(first, second);
  target = 'workbench-2';
  const third = await session.acquire(Date.now() + 5000);
  assert.equal(second.disposals, 1);
  assert.equal(second.closeListener, undefined);
  assert.equal(third.targetId, 'workbench-2');
  session.dispose();
  assert.equal(third.disposals, 1);
});

test('concurrent acquisitions open only one session', async () => {
  let connects = 0;
  const connection = new FakeConnection('workbench-1');
  const session = new EvidenceScreenshotSession(
    async () => 'workbench-1',
    async () => {
      connects++;
      return connection;
    }
  );
  const [first, second] = await Promise.all([session.acquire(Date.now() + 5000), session.acquire(Date.now() + 5000)]);
  assert.equal(first, second);
  assert.equal(connects, 1);
  session.dispose();
});

test('teardown during an in-flight connect closes the eventual socket', async () => {
  let resolveConnection!: (connection: FakeConnection) => void;
  const connection = new FakeConnection('workbench-1');
  const session = new EvidenceScreenshotSession(
    async () => 'workbench-1',
    () =>
      new Promise<FakeConnection>((resolve) => {
        resolveConnection = resolve;
      })
  );
  const acquisition = session.acquire(Date.now() + 5000);
  await Promise.resolve();
  session.dispose();
  resolveConnection(connection);
  await assert.rejects(acquisition, /owner changed or ended/);
  assert.equal(connection.disposals, 1);
  assert.equal(connection.unrefs, 0);
  assert.equal(connection.closeListener, undefined);
});

test('foreign or already closed targets fail without retaining a socket', async () => {
  for (const closed of [false, true]) {
    const connection = new FakeConnection(closed ? 'workbench-1' : 'foreign');
    connection.isClosed = closed;
    const session = new EvidenceScreenshotSession(
      async () => 'workbench-1',
      async () => connection
    );
    await assert.rejects(session.acquire(Date.now() + 5000), /owner changed or ended/);
    assert.equal(connection.disposals, 1);
    assert.equal(connection.unrefs, 0);
    session.dispose();
  }
});

test('connection errors preserve the original failure and permit a later bounded retry', async () => {
  const error = new Error('Original connect failure');
  let attempts = 0;
  const connection = new FakeConnection('workbench-1');
  const session = new EvidenceScreenshotSession(
    async () => 'workbench-1',
    async () => {
      if (++attempts === 1) {
        throw error;
      }
      return connection;
    }
  );
  await assert.rejects(session.acquire(Date.now() + 5000), (candidate) => candidate === error);
  assert.equal(await session.acquire(Date.now() + 5000), connection);
  session.dispose();
});
