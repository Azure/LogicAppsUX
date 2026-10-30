import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { test } from 'node:test';
import type { CdpConnection } from './cdpClient';
import {
  clickContextMenuText,
  connectToOwnedRegularWorkbench,
  dispatchContextMenu,
  ensureWorkbenchPanelClosed,
  ensureRegularWorkbenchExplorer,
  matchesRegularWorkbenchShell,
  matchesRegularWorkbenchOwnership,
  reloadOwnedRegularWorkbench,
  readContextMenuState,
  type RegularWorkbenchOwnershipExpectation,
  type RegularWorkbenchOwnershipState,
} from './workbenchCdpActions';
import { normalizeFsPath } from './testUtils';
import { contextMenuDom, workbenchDomFixture } from './workbenchDomFixture';

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

test('workbench panel closure is idempotent and verifies the visible panel disappears', async () => {
  let panelVisible = true;
  let disposed = false;
  const commands: string[] = [];
  const fake = {
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      assert.match(expression, /workbench\\\\\.parts\\\\\.panel/);
      return panelVisible as T;
    },
    async send() {
      return {};
    },
    dispose() {
      disposed = true;
    },
  };
  await ensureWorkbenchPanelClosed({
    deadline: Date.now() + 1000,
    executeCommand: async (commandId) => {
      commands.push(commandId);
      panelVisible = false;
    },
    connect: async () => fake as unknown as CdpConnection,
  });
  assert.deepEqual(commands, ['workbench.action.closePanel']);
  assert.equal(disposed, true);

  commands.length = 0;
  disposed = false;
  await ensureWorkbenchPanelClosed({
    deadline: Date.now() + 1000,
    executeCommand: async (commandId) => {
      commands.push(commandId);
    },
    connect: async () => fake as unknown as CdpConnection,
  });
  assert.deepEqual(commands, [], 'An already-hidden panel must not be toggled open');
  assert.equal(disposed, true);
});

test('workbench panel closure fails when the panel remains visible', async () => {
  const fake = {
    async evaluate<T>(): Promise<T> {
      return true as T;
    },
    async send() {
      return {};
    },
    dispose() {},
  };
  await assert.rejects(
    ensureWorkbenchPanelClosed({
      deadline: Date.now() + 20,
      executeCommand: async () => undefined,
      connect: async () => fake as unknown as CdpConnection,
    }),
    /Workbench action deadline exhausted|Workbench observation did not satisfy its postcondition/
  );
});

test('context menu dispatch moves before the exact right-click sequence', async () => {
  const events: Record<string, unknown>[] = [];
  await dispatchContextMenu(
    {
      async evaluate<T>(): Promise<T> {
        return undefined as T;
      },
      async send(_method: string, params?: Record<string, unknown>) {
        events.push(params ?? {});
        return {};
      },
    },
    { x: 10, y: 20 }
  );
  assert.deepEqual(
    events.map((event) => ({ type: event.type, button: event.button, buttons: event.buttons })),
    [
      { type: 'mouseMoved', button: undefined, buttons: undefined },
      { type: 'mousePressed', button: 'right', buttons: 2 },
      { type: 'mouseReleased', button: 'right', buttons: 0 },
    ]
  );
});

test('context menu action waits for one exact hit-testable item and reports candidates on failure', async () => {
  let reads = 0;
  const clicked: string[] = [];
  const fake = {
    async evaluate<T>(): Promise<T> {
      reads++;
      return {
        menuCount: clicked.length ? 0 : 1,
        candidates: [{ text: 'Create new project...', enabled: true, hitTestable: reads > 1 }],
        point: reads > 1 ? { x: 10, y: 20 } : null,
      } as T;
    },
    async send(method: string) {
      if (method === 'Input.dispatchMouseEvent') {
        clicked.push(method);
      }
      return {};
    },
  };
  await clickContextMenuText(fake, 'Create new project...', Date.now() + 1000);
  assert.ok(reads > 1);
  assert.deepEqual(clicked, ['Input.dispatchMouseEvent', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent']);

  await assert.rejects(
    clickContextMenuText(
      {
        async evaluate<T>(): Promise<T> {
          return {
            candidates: [{ text: 'Create workflow...', enabled: true, hitTestable: true }],
            point: null,
          } as T;
        },
        async send() {
          return {};
        },
      },
      'Create new project...',
      Date.now() + 20
    ),
    /Create workflow/
  );
});

test('production-shaped menu uses the label without keybindings, ancestor disabled state, and native pointer activation', async () => {
  const fixture = workbenchDomFixture(contextMenuDom([{ label: 'Create new project…' }, { label: 'Create workflow…', disabled: true }]));
  try {
    const state = await readContextMenuState(fixture.cdp, 'Create new project...');
    assert.equal(state.menuCount, 1);
    assert.deepEqual(state.candidates, [
      { text: 'Create new project...', enabled: true, hitTestable: true },
      { text: 'Create workflow...', enabled: false, hitTestable: true },
    ]);
    assert.ok(state.point);
    fixture.document.querySelector('.action-menu-item').addEventListener('click', () => {
      fixture.document.querySelector('.context-view').remove();
    });
    await clickContextMenuText(fixture.cdp, 'Create new project...', Date.now() + 1000);
    assert.deepEqual(
      fixture.sent.map((entry) => entry.params.type),
      ['mouseMoved', 'mousePressed', 'mouseReleased']
    );
    assert.equal((await readContextMenuState(fixture.cdp, 'Create new project...')).menuCount, 0);
  } finally {
    fixture.dispose();
  }
});

test('production-shaped menu rejects disabled, duplicate, hidden, occluded, unopened and missing actions without a click', async () => {
  for (const kind of ['disabled', 'duplicate', 'hidden', 'occluded', 'unopened', 'missing'] as const) {
    const fixture = workbenchDomFixture(
      contextMenuDom(
        kind === 'missing'
          ? [{ label: 'Create workflow...' }]
          : Array.from({ length: kind === 'duplicate' ? 2 : 1 }, () => ({
              label: 'Create new project...',
              disabled: kind === 'disabled',
            }))
      )
    );
    try {
      if (kind === 'hidden') {
        fixture.document.querySelector('.context-view').style.display = 'none';
      }
      if (kind === 'unopened') {
        fixture.document.querySelector('.context-view').remove();
      }
      if (kind === 'occluded') {
        fixture.document.body.insertAdjacentHTML('beforeend', '<div data-box="400,40,250,25">Blocking overlay</div>');
      }
      const state = await readContextMenuState(fixture.cdp, 'Create new project...');
      assert.equal(state.point, null, kind);
      await assert.rejects(clickContextMenuText(fixture.cdp, 'Create new project...', Date.now() + 20), /Context menu action/);
      assert.deepEqual(fixture.sent, [], kind);
    } finally {
      fixture.dispose();
    }
  }
});

test('a pointer highlight without menu closure is not successful menu activation', async () => {
  const fixture = workbenchDomFixture(contextMenuDom([{ label: 'Create new project...' }]));
  try {
    await assert.rejects(
      clickContextMenuText(fixture.cdp, 'Create new project...', Date.now() + 200),
      /did not close its menu after the UI click/
    );
    assert.equal(fixture.sent.filter((entry) => entry.params.type === 'mousePressed').length, 1, 'Never replay an ambiguous click');
  } finally {
    fixture.dispose();
  }
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
