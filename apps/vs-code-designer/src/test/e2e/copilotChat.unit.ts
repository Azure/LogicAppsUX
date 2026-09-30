import * as assert from 'assert';
import { closeCopilotChatIfVisibleCore } from './copilotChatController';
import type { CopilotChatWorkbenchState } from './copilotChatState';
import { buildCopilotChatStateExpression } from './copilotChatState';

const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string, options?: Record<string, unknown>) => { window: Window & typeof globalThis };
};

async function main(): Promise<void> {
  testCopilotChatStateDetectsVisibleOwnedSurface();
  testCopilotChatStateDetectsKnownGitHubCopilotViewId();
  testCopilotChatStateDetectsKnownBuiltInChatViewId();
  testCopilotChatStateIgnoresAbsentHiddenStandaloneAndSimilarlyNamedViews();
  testCopilotChatStateIgnoresInactiveSelectorWithHiddenContent();
  await testCloseCopilotChatNoOpsForNavigationDescendantsWithHiddenContent();
  await testCloseCopilotChatFailsWithoutMutatingNestedMixedContainer();
  await testCloseCopilotChatFailsWithoutMutatingBuiltInContainerWithMixedViews();
  await testCloseCopilotChatNoOpsWhenAbsent();
  await testCloseCopilotChatWaitsForDelayedStartupAppearance();
  await testCloseCopilotChatClosesVisibleSurface();
  await testCloseCopilotChatClosesExclusiveBuiltInSurface();
  await testCloseCopilotChatClosesVisibleEditorTab();
  await testCloseCopilotChatFailsWithoutMutatingMixedContainer();
  await testCloseCopilotChatFailsWhenCloseCommandRejects();
  await testCloseCopilotChatFailsWhenVisibleSurfaceCannotClose();
  console.log('[copilotChat.unit] all tests passed');
}

function testCopilotChatStateDetectsVisibleOwnedSurface(): void {
  const state = evaluateState(`
    <div class="auxiliarybar" aria-label="Secondary Side Bar">
      <div aria-label="GitHub Copilot Chat" title="GitHub Copilot Chat">
        <span>Copilot Chat</span>
      </div>
    </div>
  `);

  assert.strictEqual(state.visible, true, JSON.stringify(state));
  assert.strictEqual(state.matchCount, 1, JSON.stringify(state));
  assert.strictEqual(state.owners[0]?.kind, 'auxiliarybar', JSON.stringify(state));
}

function testCopilotChatStateDetectsKnownGitHubCopilotViewId(): void {
  const state = evaluateState(`
    <div class="sidebar" aria-label="Side Bar">
      <div data-view-id="github.copilot.chat" aria-label="Chat"></div>
    </div>
  `);

  assert.strictEqual(state.visible, true, JSON.stringify(state));
  assert.strictEqual(state.owners[0]?.kind, 'sidebar', JSON.stringify(state));
}

function testCopilotChatStateDetectsKnownBuiltInChatViewId(): void {
  for (const viewId of ['workbench.panel.chat', 'workbench.panel.chat.view.copilot']) {
    const state = evaluateState(`
      <div class="auxiliarybar" aria-label="Secondary Side Bar">
        <div data-view-id="${viewId}" aria-label="Chat">
          <section aria-label="Build with Agent"></section>
        </div>
      </div>
    `);

    assert.strictEqual(state.visible, true, `${viewId}: ${JSON.stringify(state)}`);
    assert.strictEqual(state.owners[0]?.kind, 'auxiliarybar', `${viewId}: ${JSON.stringify(state)}`);
  }
}

function testCopilotChatStateIgnoresAbsentHiddenStandaloneAndSimilarlyNamedViews(): void {
  const absent = evaluateState('<div class="auxiliarybar" aria-label="Secondary Side Bar"><span>Explorer</span></div>');
  const activityIconOnly = evaluateState('<button aria-label="GitHub Copilot Chat">Copilot Chat</button>');
  const builtInCommandOnly = evaluateState(
    '<div class="auxiliarybar" aria-label="Secondary Side Bar"><button data-view-id="workbench.panel.chat">Chat</button></div>'
  );
  const hiddenChat = evaluateState(
    '<div class="auxiliarybar" aria-label="Secondary Side Bar"><div aria-label="GitHub Copilot Chat" data-hidden="true">GitHub Copilot Chat</div></div>'
  );
  const similarlyNamed = evaluateState(
    '<div class="auxiliarybar" aria-label="Secondary Side Bar"><div aria-label="Copilot Chat Notes">GitHub Copilot Chat Notes</div></div>'
  );
  const mixedContainerWithoutExactChat = evaluateState(
    '<div class="auxiliarybar" aria-label="Secondary Side Bar"><div aria-label="Explorer">Explorer</div><div>Copilot Chat Notes</div></div>'
  );
  const ordinaryEditorText = evaluateState('<div class="editor-group-container"><div><span>GitHub Copilot Chat</span></div></div>');
  const substringViewId = evaluateState(
    '<div class="auxiliarybar" aria-label="Secondary Side Bar"><div data-view-id="github.copilot.chat.notes" aria-label="Chat notes"></div></div>'
  );

  assert.strictEqual(absent.visible, false, JSON.stringify(absent));
  assert.strictEqual(activityIconOnly.visible, false, JSON.stringify(activityIconOnly));
  assert.strictEqual(builtInCommandOnly.visible, false, JSON.stringify(builtInCommandOnly));
  assert.strictEqual(hiddenChat.visible, false, JSON.stringify(hiddenChat));
  assert.strictEqual(similarlyNamed.visible, false, JSON.stringify(similarlyNamed));
  assert.strictEqual(mixedContainerWithoutExactChat.visible, false, JSON.stringify(mixedContainerWithoutExactChat));
  assert.strictEqual(ordinaryEditorText.visible, false, JSON.stringify(ordinaryEditorText));
  assert.strictEqual(substringViewId.visible, false, JSON.stringify(substringViewId));
}

function testCopilotChatStateIgnoresInactiveSelectorWithHiddenContent(): void {
  const state = evaluateState(`
    <div class="editor-group-container" id="workbench.parts.editor">
      <div role="tab" aria-selected="false" aria-label="GitHub Copilot Chat" title="GitHub Copilot Chat"></div>
      <div data-view-id="github.copilot.chat" aria-label="GitHub Copilot Chat" style="display:none"></div>
      <div aria-label="Explorer"></div>
    </div>
  `);

  assert.strictEqual(state.visible, false, JSON.stringify(state));
  assert.strictEqual(state.matchCount, 0, JSON.stringify(state));
}

async function testCloseCopilotChatNoOpsForNavigationDescendantsWithHiddenContent(): Promise<void> {
  for (const body of [
    `<div class="auxiliarybar" aria-label="Secondary Side Bar">
      <button aria-label="Open Chat"><span aria-label="GitHub Copilot Chat"></span></button>
      <div data-view-id="github.copilot.chat" aria-label="GitHub Copilot Chat" style="display:none"></div>
    </div>`,
    `<div class="editor-group-container" id="workbench.parts.editor">
      <div role="tab" aria-selected="true"><span aria-label="GitHub Copilot Chat"></span></div>
      <div data-view-id="github.copilot.chat" aria-label="GitHub Copilot Chat" style="display:none"></div>
    </div>`,
  ]) {
    const state = evaluateState(body);
    const host = new FakeCopilotChatHost([state]);

    assert.strictEqual(state.visible, false, JSON.stringify(state));
    assert.strictEqual(state.matchCount, 0, JSON.stringify(state));
    await closeCopilotChatIfVisibleCore('navigation-descendant-test', host, { timeoutMs: 1000 });
    assert.deepStrictEqual(host.commands, []);
    assert.strictEqual(host.closeEditorTabCalls, 0);
  }
}

async function testCloseCopilotChatNoOpsWhenAbsent(): Promise<void> {
  const host = new FakeCopilotChatHost([{ visible: false, matchCount: 0, owners: [] }]);

  await closeCopilotChatIfVisibleCore('absent-test', host, { timeoutMs: 1000 });

  assert.deepStrictEqual(host.commands, []);
  assert.strictEqual(host.closeEditorTabCalls, 0);
}

async function testCloseCopilotChatWaitsForDelayedStartupAppearance(): Promise<void> {
  const host = new FakeCopilotChatHost([
    { visible: false, matchCount: 0, owners: [] },
    { visible: true, matchCount: 1, owners: [{ kind: 'auxiliarybar', label: 'copilot-chat', unrelatedVisibleCount: 0 }] },
    { visible: false, matchCount: 0, owners: [] },
  ]);

  await closeCopilotChatIfVisibleCore('delayed-test', host, { timeoutMs: 2000, absentSettleMs: 500 });

  assert.deepStrictEqual(host.commands, ['workbench.action.closeAuxiliaryBar']);
}

async function testCloseCopilotChatClosesVisibleSurface(): Promise<void> {
  const host = new FakeCopilotChatHost([
    { visible: true, matchCount: 1, owners: [{ kind: 'auxiliarybar', label: 'copilot-chat', unrelatedVisibleCount: 0 }] },
    { visible: false, matchCount: 0, owners: [] },
  ]);

  await closeCopilotChatIfVisibleCore('visible-test', host, { timeoutMs: 1000 });

  assert.deepStrictEqual(host.commands, ['workbench.action.closeAuxiliaryBar']);
  assert.strictEqual(host.closeEditorTabCalls, 0);
}

async function testCloseCopilotChatClosesExclusiveBuiltInSurface(): Promise<void> {
  const state = evaluateState(`
    <div class="auxiliarybar" aria-label="Secondary Side Bar">
      <div data-view-id="workbench.panel.chat" aria-label="Chat">
        <section aria-label="Build with Agent"></section>
      </div>
    </div>
  `);
  const host = new FakeCopilotChatHost([state, { visible: false, matchCount: 0, owners: [] }]);

  assert.strictEqual(state.visible, true, JSON.stringify(state));
  assert.strictEqual(state.owners[0]?.unrelatedVisibleCount, 0, JSON.stringify(state));
  await closeCopilotChatIfVisibleCore('exclusive-built-in-test', host, { timeoutMs: 1000 });
  assert.deepStrictEqual(host.commands, ['workbench.action.closeAuxiliaryBar']);
  assert.strictEqual(host.closeEditorTabCalls, 0);
}

async function testCloseCopilotChatClosesVisibleEditorTab(): Promise<void> {
  const host = new FakeCopilotChatHost([
    { visible: true, matchCount: 1, owners: [{ kind: 'editor', label: 'copilot-chat', unrelatedVisibleCount: 0 }] },
    { visible: false, matchCount: 0, owners: [] },
  ]);

  await closeCopilotChatIfVisibleCore('editor-test', host, { timeoutMs: 1000 });

  assert.deepStrictEqual(host.commands, []);
  assert.strictEqual(host.closeEditorTabCalls, 1);
}

async function testCloseCopilotChatFailsWithoutMutatingMixedContainer(): Promise<void> {
  const host = new FakeCopilotChatHost([
    { visible: true, matchCount: 1, owners: [{ kind: 'auxiliarybar', label: 'copilot-chat', unrelatedVisibleCount: 1 }] },
  ]);

  await assert.rejects(
    () => closeCopilotChatIfVisibleCore('mixed-container-test', host, { timeoutMs: 1000 }),
    /visible Copilot Chat could not be closed/
  );
  assert.deepStrictEqual(host.commands, []);
}

async function testCloseCopilotChatFailsWithoutMutatingNestedMixedContainer(): Promise<void> {
  const nestedMixed = evaluateState(`
    <div class="auxiliarybar" aria-label="Secondary Side Bar">
      <div class="content">
        <div data-view-id="github.copilot.chat" aria-label="GitHub Copilot Chat"></div>
        <div data-view-id="my.explorer" aria-label="Explorer"></div>
      </div>
    </div>
  `);
  const host = new FakeCopilotChatHost([nestedMixed]);

  assert.strictEqual(nestedMixed.visible, true, JSON.stringify(nestedMixed));
  assert.strictEqual(nestedMixed.owners[0]?.unrelatedVisibleCount, 1, JSON.stringify(nestedMixed));
  await assert.rejects(
    () => closeCopilotChatIfVisibleCore('nested-mixed-container-test', host, { timeoutMs: 1000 }),
    /visible Copilot Chat could not be closed/
  );
  assert.deepStrictEqual(host.commands, []);
}

async function testCloseCopilotChatFailsWithoutMutatingBuiltInContainerWithMixedViews(): Promise<void> {
  for (const chatLeaf of [
    '<div data-view-id="workbench.panel.chat.view.copilot" aria-label="Chat"></div>',
    '<div data-view-id="github.copilot.chat" aria-label="Chat"></div>',
  ]) {
    const builtInContainerMixed = evaluateState(`
      <div class="auxiliarybar" aria-label="Secondary Side Bar">
        <div id="workbench.panel.chat">
          <div class="content">
            ${chatLeaf}
            <div data-view-id="my.explorer" aria-label="Explorer"></div>
          </div>
        </div>
      </div>
    `);
    const host = new FakeCopilotChatHost([builtInContainerMixed]);

    assert.strictEqual(builtInContainerMixed.visible, true, JSON.stringify(builtInContainerMixed));
    assert.strictEqual(builtInContainerMixed.owners[0]?.unrelatedVisibleCount, 1, JSON.stringify(builtInContainerMixed));
    await assert.rejects(
      () => closeCopilotChatIfVisibleCore('built-in-container-mixed-views-test', host, { timeoutMs: 1000 }),
      /visible Copilot Chat could not be closed/
    );
    assert.deepStrictEqual(host.commands, []);
  }
}

async function testCloseCopilotChatFailsWhenCloseCommandRejects(): Promise<void> {
  const host = new FakeCopilotChatHost(
    [{ visible: true, matchCount: 1, owners: [{ kind: 'panel', label: 'copilot-chat', unrelatedVisibleCount: 0 }] }],
    {
      rejectCommands: true,
    }
  );

  await assert.rejects(
    () => closeCopilotChatIfVisibleCore('rejected-command-test', host, { timeoutMs: 1000 }),
    /failed to execute workbench\.action\.closePanel/
  );
}

async function testCloseCopilotChatFailsWhenVisibleSurfaceCannotClose(): Promise<void> {
  const host = new FakeCopilotChatHost([
    { visible: true, matchCount: 1, owners: [{ kind: 'unknown', label: 'copilot-chat', unrelatedVisibleCount: 0 }] },
  ]);

  await assert.rejects(
    () => closeCopilotChatIfVisibleCore('failure-test', host, { timeoutMs: 1000 }),
    /visible Copilot Chat could not be closed/
  );
  assert.deepStrictEqual(host.commands, []);
}

function evaluateState(body: string): CopilotChatWorkbenchState {
  const dom = new JSDOM(`<html><body>${body}</body></html>`, { runScripts: 'outside-only' });
  const { window } = dom;
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
  const htmlElementPrototype = (window as any).HTMLElement.prototype;
  Object.defineProperty(htmlElementPrototype, 'offsetWidth', {
    configurable: true,
    get() {
      return this.hasAttribute('data-hidden') ? 0 : 300;
    },
  });
  Object.defineProperty(htmlElementPrototype, 'offsetHeight', {
    configurable: true,
    get() {
      return this.hasAttribute('data-hidden') ? 0 : 120;
    },
  });
  htmlElementPrototype.getClientRects = function () {
    return this.hasAttribute('data-hidden') ? [] : [this.getBoundingClientRect()];
  };
  htmlElementPrototype.getBoundingClientRect = function () {
    const hidden = this.hasAttribute('data-hidden');
    return {
      bottom: hidden ? 0 : 120,
      height: hidden ? 0 : 120,
      left: 0,
      right: hidden ? 0 : 300,
      top: 0,
      width: hidden ? 0 : 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  };

  return window.eval(buildCopilotChatStateExpression()) as CopilotChatWorkbenchState;
}

class FakeCopilotChatHost {
  readonly commands: string[] = [];
  readonly logs: string[] = [];
  closeEditorTabCalls = 0;
  private readIndex = 0;
  private currentNow = 0;

  constructor(
    private readonly states: CopilotChatWorkbenchState[],
    private readonly options: { rejectCommands?: boolean } = {}
  ) {}

  closeEditorTabs(): Promise<void> {
    this.closeEditorTabCalls++;
    return Promise.resolve();
  }

  executeCommand(command: string): Promise<void> {
    this.commands.push(command);
    if (this.options.rejectCommands) {
      return Promise.reject(new Error(`synthetic ${command} failure`));
    }
    return Promise.resolve();
  }

  readState(_timeoutMs: number): Promise<CopilotChatWorkbenchState> {
    const state = this.states[Math.min(this.readIndex, this.states.length - 1)];
    this.readIndex++;
    return Promise.resolve(state);
  }

  sleep(_ms: number): Promise<void> {
    this.currentNow += _ms;
    return Promise.resolve();
  }

  log(message: string): void {
    this.logs.push(message);
  }

  now(): number {
    return this.currentNow;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
