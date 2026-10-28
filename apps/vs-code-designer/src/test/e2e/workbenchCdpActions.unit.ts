import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { test } from 'node:test';
import {
  matchesRegularWorkbenchOwnership,
  reloadOwnedRegularWorkbench,
  type RegularWorkbenchOwnershipExpectation,
  type RegularWorkbenchOwnershipState,
} from './workbenchCdpActions';

const expectation: RegularWorkbenchOwnershipExpectation = {
  workspaceFilePath: path.resolve('unit.code-workspace'),
  rootPaths: ['one', 'two', 'three'].map((name) => path.resolve(name)),
};

const state = (overrides: Partial<RegularWorkbenchOwnershipState> = {}): RegularWorkbenchOwnershipState => ({
  timeOrigin: 1,
  title: 'unit.code-workspace - Visual Studio Code',
  ready: true,
  roots: ['one', 'two', 'three'],
  owned: true,
  ...overrides,
});

test('regular workbench ownership requires a complete visible exact workspace', () => {
  assert.equal(matchesRegularWorkbenchOwnership(state(), expectation), true);
  assert.equal(matchesRegularWorkbenchOwnership(state({ ready: false }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ title: 'other.code-workspace - Visual Studio Code' }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ title: 'unit-copy - Visual Studio Code' }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ roots: ['one', 'two'] }), expectation), false);
  assert.equal(matchesRegularWorkbenchOwnership(state({ roots: ['one', 'two', 'three', 'stale-root'] }), expectation), false);
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
  assert.deepEqual(queries, ['View: Show Explorer', 'Developer: Reload Window']);
  assert.equal(keys.length, 4);
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
