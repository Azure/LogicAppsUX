import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { test } from 'node:test';
import type { CdpConnection } from './cdpClient';
import {
  connectToOwnedRegularWorkbench,
  ensureRegularWorkbenchExplorer,
  matchesRegularWorkbenchShell,
  matchesRegularWorkbenchOwnership,
  reloadOwnedRegularWorkbench,
  type RegularWorkbenchOwnershipExpectation,
  type RegularWorkbenchOwnershipState,
} from './workbenchCdpActions';
import { normalizeFsPath } from './testUtils';

const expectation: RegularWorkbenchOwnershipExpectation = {
  workspaceFilePath: path.resolve('unit.code-workspace'),
  rootPaths: ['one', 'two', 'three'].map((name) => path.resolve(name)),
};

const state = (overrides: Partial<RegularWorkbenchOwnershipState> = {}): RegularWorkbenchOwnershipState => ({
  timeOrigin: 1,
  title: 'unit.code-workspace - Visual Studio Code',
  ready: true,
  roots: ['one', 'two', 'three'],
  shellOwned: true,
  owned: true,
  ...overrides,
});

test('regular workbench ownership requires a complete visible exact workspace', () => {
  assert.equal(normalizeFsPath('D:\\Unit\\App', 'win32'), normalizeFsPath('d:\\unit\\app', 'win32'));
  assert.notEqual(normalizeFsPath('/Unit/App', 'linux'), normalizeFsPath('/unit/app', 'linux'));
  assert.equal(matchesRegularWorkbenchOwnership(state(), expectation), true);
  assert.equal(
    matchesRegularWorkbenchOwnership(state({ title: 'unit (Workspace) - Visual Studio Code [Extension Development Host]' }), expectation),
    true
  );
  assert.equal(matchesRegularWorkbenchShell(state({ title: '[Extension Development Host] unit (Workspace)' }), expectation), true);
  assert.equal(
    matchesRegularWorkbenchOwnership(
      state({ title: 'workflow.json - unit (Workspace) - Visual Studio Code [Extension Development Host]' }),
      expectation
    ),
    true
  );
  assert.equal(
    matchesRegularWorkbenchOwnership(
      state({ title: '● workflow.json - unit.code-workspace (Workspace) - Visual Studio Code [Extension Development Host]' }),
      expectation
    ),
    true
  );
  assert.equal(matchesRegularWorkbenchOwnership(state({ ready: false }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ title: 'other.code-workspace - Visual Studio Code' }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ title: 'unit-copy - Visual Studio Code' }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ title: 'unit-copy (Workspace) - Visual Studio Code' }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ roots: ['one', 'two'] }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ roots: ['one', 'two', 'three', 'stale-root'] }), expectation), false);
});

test('owned connection uses the phase deadline after the bounded CDP connection succeeds', async () => {
  const connectionTimeoutMs = 80;
  const postConnectionTimeouts: number[] = [];
  const insertedText: string[] = [];
  let disposed = false;
  const fake = {
    targetId: 'unit-window',
    contextGeneration: 1,
    async evaluate<T>(_context: number | undefined, expression: string, options?: { timeoutMs?: number }): Promise<T> {
      postConnectionTimeouts.push(options?.timeoutMs ?? 0);
      if (expression.includes('timeOrigin: performance.timeOrigin')) {
        const current = state({ roots: [], owned: false });
        return {
          timeOrigin: current.timeOrigin,
          title: current.title,
          ready: current.ready,
          roots: current.roots,
        } as T;
      }
      if (expression.includes('.quick-input-widget input')) {
        return true as T;
      }
      if (expression.includes('return found.length===1')) {
        return { x: 10, y: 20 } as T;
      }
      return true as T;
    },
    async send(_method: string, _params?: Record<string, unknown>, options?: { timeoutMs?: number }) {
      postConnectionTimeouts.push(options?.timeoutMs ?? 0);
      if (_method === 'Input.insertText') {
        insertedText.push(String(_params?.text));
      }
      return {};
    },
    dispose() {
      disposed = true;
    },
  };

  const owned = await connectToOwnedRegularWorkbench({
    expectation,
    deadline: Date.now() + 1500,
    connectionTimeoutMs,
    connect: async (options) => {
      assert.ok(options?.timeoutMs && options.timeoutMs <= connectionTimeoutMs);
      await new Promise((resolve) => setTimeout(resolve, 60));
      return fake as unknown as CdpConnection;
    },
  });

  assert.equal(owned.state.shellOwned, true);
  assert.equal(owned.state.owned, false, 'Shell ownership must not depend on Explorer projection');
  assert.ok(postConnectionTimeouts.length > 0);
  assert.ok(
    postConnectionTimeouts[0] > connectionTimeoutMs,
    'Post-connection CDP commands must use the phase deadline, not the nearly exhausted connection deadline'
  );
  assert.deepEqual(insertedText, [], 'Shell ownership must not open the command palette or Explorer');
  assert.equal(disposed, false);
  owned.cdp.dispose();
});

test('Explorer projection clicks the activity item only when exact roots are not already visible', async () => {
  let explorerVisible = false;
  const insertedText: string[] = [];
  const mouseEvents: string[] = [];
  const fake = {
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      if (expression.includes('timeOrigin: performance.timeOrigin')) {
        const current = state({ roots: explorerVisible ? ['one', 'two', 'three'] : [], owned: explorerVisible });
        return {
          timeOrigin: current.timeOrigin,
          title: current.title,
          ready: current.ready,
          roots: current.roots,
        } as T;
      }
      if (expression.includes('.activitybar .action-label')) {
        return { point: { x: 10, y: 20 }, active: false } as T;
      }
      return true as T;
    },
    async send(method: string, params?: Record<string, unknown>) {
      if (method === 'Input.insertText') {
        insertedText.push(String(params?.text));
      }
      if (method === 'Input.dispatchMouseEvent') {
        const type = String(params?.type);
        mouseEvents.push(type);
        if (type === 'mouseReleased') {
          explorerVisible = true;
        }
      }
      return {};
    },
  };

  const projected = await ensureRegularWorkbenchExplorer(fake, expectation, Date.now() + 1000);
  assert.equal(projected.owned, true);
  assert.deepEqual(mouseEvents, ['mouseMoved', 'mousePressed', 'mouseReleased']);
  assert.deepEqual(insertedText, [], 'Visible Explorer activity control must avoid the command palette fallback');

  mouseEvents.length = 0;
  await ensureRegularWorkbenchExplorer(fake, expectation, Date.now() + 1000);
  assert.deepEqual(mouseEvents, [], 'Already-projected exact roots must not trigger another Explorer action');
});

test('Explorer projection waits instead of toggling an already-active Explorer', async () => {
  let ownershipReads = 0;
  const mouseEvents: string[] = [];
  const fake = {
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      if (expression.includes('timeOrigin: performance.timeOrigin')) {
        ownershipReads++;
        const visible = ownershipReads >= 3;
        const current = state({ roots: visible ? ['one', 'two', 'three'] : [], owned: visible });
        return {
          timeOrigin: current.timeOrigin,
          title: current.title,
          ready: current.ready,
          roots: current.roots,
        } as T;
      }
      if (expression.includes('.activitybar .action-label')) {
        return { point: { x: 10, y: 20 }, active: true } as T;
      }
      return true as T;
    },
    async send(method: string) {
      if (method === 'Input.dispatchMouseEvent') {
        mouseEvents.push(method);
      }
      return {};
    },
  };

  const projected = await ensureRegularWorkbenchExplorer(fake, expectation, Date.now() + 1000);
  assert.equal(projected.owned, true);
  assert.deepEqual(mouseEvents, [], 'Already-active Explorer must not be toggled closed while its roots populate');
});

test('Explorer projection falls back to the idempotent command when an inactive activity item is not clickable', async () => {
  let explorerVisible = false;
  const insertedText: string[] = [];
  const fake = {
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      if (expression.includes('timeOrigin: performance.timeOrigin')) {
        const current = state({ roots: explorerVisible ? ['one', 'two', 'three'] : [], owned: explorerVisible });
        return {
          timeOrigin: current.timeOrigin,
          title: current.title,
          ready: current.ready,
          roots: current.roots,
        } as T;
      }
      if (expression.includes('.activitybar .action-label')) {
        return { point: null, active: false } as T;
      }
      return true as T;
    },
    async send(method: string, params?: Record<string, unknown>) {
      if (method === 'Input.insertText') {
        insertedText.push(String(params?.text));
        explorerVisible = true;
      }
      return {};
    },
  };

  const projected = await ensureRegularWorkbenchExplorer(fake, expectation, Date.now() + 1000);
  assert.equal(projected.owned, true);
  assert.deepEqual(insertedText, ['View: Show Explorer']);
});

test('owned reload sends one command and continues the same target with a changed document and contexts', async () => {
  let generation = 1;
  let reads = 0;
  const keys: Record<string, unknown>[] = [];
  const queries: string[] = [];
  const fake = {
    targetId: 'unit-window',
    get contextGeneration() {
      return generation;
    },
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      if (expression.includes('timeOrigin: performance.timeOrigin')) {
        generation = ++reads > 1 ? 2 : 1;
        const current = state({ timeOrigin: reads > 1 ? 2 : 1 });
        return {
          timeOrigin: current.timeOrigin,
          title: current.title,
          ready: current.ready,
          roots: current.roots,
        } as T;
      }
      return (expression.includes('return found.length') ? { x: 10, y: 20 } : true) as T;
    },
    async send(method: string, params?: Record<string, unknown>) {
      if (method === 'Input.insertText') {
        queries.push(String(params?.text));
      }
      if (method === 'Input.dispatchKeyEvent') {
        keys.push(params || {});
      }
      return {};
    },
  };

  const reloaded = await reloadOwnedRegularWorkbench(fake, expectation, Date.now() + 5000);
  assert.deepEqual(queries, ['Developer: Reload Window']);
  assert.equal(keys.length, 2);
  assert.equal(reloaded.targetId, 'unit-window');
  assert.equal(reloaded.before.timeOrigin, 1);
  assert.equal(reloaded.after.timeOrigin, 2);
  assert.ok(reloaded.afterGeneration > reloaded.beforeGeneration);
});

test('closed owned reload connection fails instead of attaching to a replacement window', async () => {
  let reads = 0;
  const fake = {
    targetId: 'unit-original-window',
    contextGeneration: 1,
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      if (expression.includes('timeOrigin: performance.timeOrigin')) {
        if (++reads > 1) {
          throw new Error('CDP WebSocket closed');
        }
        const current = state();
        return {
          timeOrigin: current.timeOrigin,
          title: current.title,
          ready: current.ready,
          roots: current.roots,
        } as T;
      }
      return (expression.includes('return found.length') ? { x: 10, y: 20 } : true) as T;
    },
    async send() {
      return {};
    },
  };

  await assert.rejects(reloadOwnedRegularWorkbench(fake, expectation, Date.now() + 5000), /WebSocket closed/);
});
