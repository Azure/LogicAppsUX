import * as assert from 'assert';
import { closeCopilotChatIfVisibleCore, closeCopilotChatIfVisibleWithAttachRetry } from './copilotChatController';
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
  await testCopilotChatAttachRetryRecoversTransientFailure();
  await testCopilotChatAttachRetryUsesRemainingBudgetForCoreCleanup();
  await testCopilotChatAttachRetryStopsWhenFirstFailureConsumesBudget();
  await testCopilotChatAttachRetryStopsWhenRetryDelayConsumesRemainingBudget();
  await testCopilotChatAttachRetryFailsWhenSuccessfulAttachLeavesNoCleanupBudget();
  await testCopilotChatAttachRetryKeepsSecondAttemptAndCoreWithinRemainingBudget();
  await testCopilotChatAttachRetrySanitizesRetryLog();
  await testCopilotChatAttachRetrySanitizesTerminalError();
  await testCopilotChatAttachRetryStopsAfterBound();
  await testCopilotChatAttachRetryDoesNotDuplicateSuccessfulFirstAttach();
  await testCopilotChatAttachRetryDoesNotReclassifyReadStateFailure();
  await testCopilotChatAttachRetryDoesNotReclassifyVisibleChatClosureFailure();
  await testCopilotChatInitialReadRetryRecoversOnSameConnection();
  await testCopilotChatInitialReadRetryStopsAfterBoundAndRedactsErrors();
  await testCopilotChatInitialReadRetryRespectsDeadline();
  await testCopilotChatInitialReadRetryUsesSharedAttachBudget();
  await testCopilotChatInitialReadRetryDoesNotRetryOtherErrors();
  await testCopilotChatInitialReadRetryDoesNotRetryAfterStateObservation();
  await testCopilotChatInitialReadRetryPreservesClosureFailures();
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

async function testCopilotChatAttachRetryRecoversTransientFailure(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectFailuresBeforeSuccess: 1,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await closeCopilotChatIfVisibleWithAttachRetry('retry-transient-test', harness, { timeoutMs: 2000 });

  assert.strictEqual(harness.connectCalls, 2);
  assert.strictEqual(harness.createdCloseHosts, 1);
  assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
  assert.ok(
    harness.logs.some((line) => line.includes('attempt 1/2 failed; retrying')),
    harness.logs.join('\n')
  );
}

async function testCopilotChatAttachRetryUsesRemainingBudgetForCoreCleanup(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectFailuresBeforeSuccess: 1,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await closeCopilotChatIfVisibleWithAttachRetry('retry-budget-test', harness, { timeoutMs: 1000 });

  assert.strictEqual(harness.connectCalls, 2);
  assert.deepStrictEqual(harness.readTimeouts, [750]);
}

async function testCopilotChatAttachRetryStopsWhenFirstFailureConsumesBudget(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectDurationsMs: [1000],
    connectFailuresBeforeSuccess: 1,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('retry-first-failure-budget-test', harness, { timeoutMs: 1000 }),
    /after 1 attempt \(max 2\)/
  );
  assert.deepStrictEqual(harness.connectTimeouts, [1000]);
  assert.strictEqual(harness.connectCalls, 1);
  assert.deepStrictEqual(harness.sleepDurations, []);
}

async function testCopilotChatAttachRetryStopsWhenRetryDelayConsumesRemainingBudget(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectFailuresBeforeSuccess: 1,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('retry-delay-budget-test', harness, { timeoutMs: 100 }),
    /after 1 attempt \(max 2\)/
  );
  assert.deepStrictEqual(harness.connectTimeouts, [100]);
  assert.deepStrictEqual(harness.sleepDurations, [100]);
  assert.strictEqual(harness.connectCalls, 1);
}

async function testCopilotChatAttachRetryFailsWhenSuccessfulAttachLeavesNoCleanupBudget(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectDurationsMs: [1000],
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('retry-no-cleanup-budget-test', harness, { timeoutMs: 1000 }),
    /cleanup deadline expired/
  );
  assert.strictEqual(harness.connectCalls, 1);
  assert.strictEqual(harness.createdCloseHosts, 0);
  assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
  assert.deepStrictEqual(harness.readTimeouts, []);
}

async function testCopilotChatAttachRetryKeepsSecondAttemptAndCoreWithinRemainingBudget(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectDurationsMs: [5000, 0],
    connectFailuresBeforeSuccess: 1,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await closeCopilotChatIfVisibleWithAttachRetry('retry-realistic-budget-test', harness, { timeoutMs: 8000 });

  assert.deepStrictEqual(harness.connectTimeouts, [5000, 2750]);
  assert.deepStrictEqual(harness.sleepDurations, [250]);
  assert.deepStrictEqual(harness.readTimeouts, [1500]);
}

async function testCopilotChatAttachRetrySanitizesRetryLog(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    attachErrors: [new Error(createSensitiveAttachErrorMessage())],
    connectFailuresBeforeSuccess: 1,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await closeCopilotChatIfVisibleWithAttachRetry('retry-sanitize-log-test', harness, { timeoutMs: 2000 });

  assertSensitiveAttachDetailsRedacted(harness.logs.join('\n'));
  assert.ok(
    harness.logs.some((line) => line.includes('cdp-websocket-upgrade-failed')),
    harness.logs.join('\n')
  );
}

async function testCopilotChatAttachRetrySanitizesTerminalError(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    attachErrors: [new Error(createSensitiveAttachErrorMessage()), new Error(createSensitiveAttachErrorMessage())],
    connectFailuresBeforeSuccess: 2,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  let message = '';
  try {
    await closeCopilotChatIfVisibleWithAttachRetry('retry-sanitize-terminal-test', harness, { timeoutMs: 2000 });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert.ok(message.includes('cdp-websocket-upgrade-failed'), message);
  assertSensitiveAttachDetailsRedacted(message);
  assertSensitiveAttachDetailsRedacted(harness.logs.join('\n'));
}

async function testCopilotChatAttachRetryStopsAfterBound(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectFailuresBeforeSuccess: 3,
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('retry-persistent-test', harness, { timeoutMs: 2000 }),
    /failed to attach workbench CDP for optional cleanup after 2 attempts/
  );
  assert.strictEqual(harness.connectCalls, 2);
  assert.strictEqual(harness.createdCloseHosts, 0);
  assert.deepStrictEqual(harness.commands, []);
}

async function testCopilotChatAttachRetryDoesNotDuplicateSuccessfulFirstAttach(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await closeCopilotChatIfVisibleWithAttachRetry('retry-first-success-test', harness, { timeoutMs: 2000 });

  assert.strictEqual(harness.connectCalls, 1);
  assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
  assert.strictEqual(harness.readTimeouts.length, 1);
}

async function testCopilotChatAttachRetryDoesNotReclassifyReadStateFailure(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    readStateFailure: new Error('synthetic read state failure'),
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('retry-read-failure-test', harness, { timeoutMs: 2000 }),
    /synthetic read state failure/
  );
  assert.strictEqual(harness.connectCalls, 1);
  assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
}

async function testCopilotChatAttachRetryDoesNotReclassifyVisibleChatClosureFailure(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    states: [{ visible: true, matchCount: 1, owners: [{ kind: 'unknown', label: 'copilot-chat', unrelatedVisibleCount: 0 }] }],
  });

  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('retry-visible-failure-test', harness, { timeoutMs: 1000 }),
    /visible Copilot Chat could not be closed/
  );
  assert.strictEqual(harness.connectCalls, 1);
  assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
}

function initialReadTimeout(): Error {
  return new Error('Timed out waiting for CDP Runtime.evaluate response after 1500ms');
}

async function testCopilotChatInitialReadRetryRecoversOnSameConnection(): Promise<void> {
  for (const initiallyVisible of [false, true]) {
    const harness = new FakeCopilotChatAttachHarness({
      readStateFailures: [initialReadTimeout()],
      readDurationsMs: [1500],
      states: [
        {
          visible: initiallyVisible,
          matchCount: initiallyVisible ? 1 : 0,
          owners: initiallyVisible ? [{ kind: 'auxiliarybar', label: 'copilot-chat', unrelatedVisibleCount: 0 }] : [],
        },
        { visible: false, matchCount: 0, owners: [] },
      ],
    });

    await closeCopilotChatIfVisibleWithAttachRetry('initial-read-transient-test', harness);

    assert.strictEqual(harness.connectCalls, 1);
    assert.strictEqual(harness.createdCloseHosts, 1);
    assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
    assert.deepStrictEqual(harness.commands, initiallyVisible ? ['workbench.action.closeAuxiliaryBar'] : []);
    assert.strictEqual(harness.readTimeouts.length, initiallyVisible ? 3 : 2);
    assert.ok(harness.logs.some((line) => line.includes('initial workbench Chat state read recovered on attempt 2')));
  }
}

async function testCopilotChatInitialReadRetryStopsAfterBoundAndRedactsErrors(): Promise<void> {
  const sensitiveTimeout = new Error(`${initialReadTimeout().message}\r\n${createSensitiveAttachErrorMessage()}`);
  const harness = new FakeCopilotChatAttachHarness({
    readStateFailures: [sensitiveTimeout, sensitiveTimeout, sensitiveTimeout],
    readDurationsMs: [1500, 1500],
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('initial-read-persistent-test', harness),
    (error: Error) => {
      assert.match(error.message, /initial workbench Chat state read failed after 2 attempts \(max 2\)/);
      assert.match(error.message, /cdp-runtime-evaluate-timeout/);
      assertSensitiveAttachDetailsRedacted(error.message);
      return true;
    }
  );
  assert.strictEqual(harness.connectCalls, 1);
  assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
  assert.deepStrictEqual(harness.readTimeouts, [1500, 1500]);
  assert.deepStrictEqual(harness.commands, []);
  assert.strictEqual(harness.closeEditorTabCalls, 0);
  assert.strictEqual(harness.now(), 3250);
  assertSensitiveAttachDetailsRedacted(harness.logs.join('\n'));
}

async function testCopilotChatInitialReadRetryRespectsDeadline(): Promise<void> {
  for (const { durationMs, failures, expectedSleeps } of [
    { durationMs: 1000, failures: [initialReadTimeout()], expectedSleeps: [] },
    { durationMs: 900, failures: [initialReadTimeout()], expectedSleeps: [100] },
    { durationMs: 1000, failures: [], expectedSleeps: [] },
  ]) {
    const harness = new FakeCopilotChatAttachHarness({
      readStateFailures: failures,
      readDurationsMs: [durationMs],
      states: [{ visible: false, matchCount: 0, owners: [] }],
    });

    await assert.rejects(
      () => closeCopilotChatIfVisibleWithAttachRetry('initial-read-deadline-test', harness, { timeoutMs: 1000 }),
      /initial workbench Chat state read failed after 1 attempt \(max 2\).*deadline-exceeded/
    );
    assert.strictEqual(harness.connectCalls, 1);
    assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
    assert.deepStrictEqual(harness.readTimeouts, [1000]);
    assert.deepStrictEqual(harness.sleepDurations, expectedSleeps);
    assert.deepStrictEqual(harness.commands, []);
    assert.strictEqual(harness.now(), 1000);
  }

  const shortBudget = new FakeCopilotChatAttachHarness({
    readStateFailures: [initialReadTimeout()],
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });
  await assert.rejects(
    () => closeCopilotChatIfVisibleWithAttachRetry('initial-read-short-budget-test', shortBudget, { timeoutMs: 100 }),
    /after 1 attempt.*deadline-exceeded/
  );
  assert.deepStrictEqual(shortBudget.readTimeouts, [100]);
  assert.deepStrictEqual(shortBudget.sleepDurations, [100]);
  assert.strictEqual(shortBudget.connections[0]?.disposeCalls, 1);
}

async function testCopilotChatInitialReadRetryUsesSharedAttachBudget(): Promise<void> {
  const harness = new FakeCopilotChatAttachHarness({
    connectDurationsMs: [5000, 0],
    connectFailuresBeforeSuccess: 1,
    readStateFailures: [initialReadTimeout()],
    readDurationsMs: [1500],
    states: [{ visible: false, matchCount: 0, owners: [] }],
  });

  await closeCopilotChatIfVisibleWithAttachRetry('initial-read-shared-budget-test', harness);

  assert.deepStrictEqual(harness.connectTimeouts, [5000, 2750]);
  assert.deepStrictEqual(harness.readTimeouts, [1500, 1000]);
  assert.deepStrictEqual(harness.sleepDurations, [250, 250]);
  assert.strictEqual(harness.now(), 7000);
  assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
}

async function testCopilotChatInitialReadRetryDoesNotRetryOtherErrors(): Promise<void> {
  for (const message of [
    'CDP WebSocket closed',
    'CDP evaluation failed: synthetic exception details',
    'Timed out waiting for CDP Page.captureScreenshot response after 1500ms',
  ]) {
    const failure = new Error(message);
    const harness = new FakeCopilotChatAttachHarness({
      readStateFailures: [failure],
      states: [{ visible: false, matchCount: 0, owners: [] }],
    });

    await assert.rejects(() => closeCopilotChatIfVisibleWithAttachRetry('initial-read-other-error-test', harness), failure);

    assert.strictEqual(harness.connectCalls, 1);
    assert.strictEqual(harness.readTimeouts.length, 1);
    assert.deepStrictEqual(harness.sleepDurations, []);
    assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
  }
}

async function testCopilotChatInitialReadRetryDoesNotRetryAfterStateObservation(): Promise<void> {
  for (const visible of [false, true]) {
    const failure = initialReadTimeout();
    const harness = new FakeCopilotChatAttachHarness({
      readStateFailures: [undefined, failure],
      states: [
        {
          visible,
          matchCount: visible ? 1 : 0,
          owners: visible ? [{ kind: 'auxiliarybar', label: 'copilot-chat', unrelatedVisibleCount: 0 }] : [],
        },
      ],
    });

    await assert.rejects(
      () => closeCopilotChatIfVisibleWithAttachRetry('initial-read-post-observation-test', harness, { absentSettleMs: 1500 }),
      failure
    );
    assert.strictEqual(harness.connectCalls, 1);
    assert.strictEqual(harness.readTimeouts.length, 2);
    assert.deepStrictEqual(harness.commands, visible ? ['workbench.action.closeAuxiliaryBar'] : []);
    assert.deepStrictEqual(harness.sleepDurations, [250]);
    assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
    assert.ok(!harness.logs.some((line) => line.includes('retrying')));
  }
}

async function testCopilotChatInitialReadRetryPreservesClosureFailures(): Promise<void> {
  for (const editor of [false, true]) {
    const harness = new FakeCopilotChatAttachHarness({
      readStateFailures: [initialReadTimeout()],
      rejectCommands: !editor,
      rejectEditorTabs: editor,
      states: [
        { visible: true, matchCount: 1, owners: [{ kind: editor ? 'editor' : 'panel', label: 'copilot-chat', unrelatedVisibleCount: 0 }] },
      ],
    });

    await assert.rejects(
      () => closeCopilotChatIfVisibleWithAttachRetry('initial-read-close-rejection-test', harness),
      editor ? /synthetic editor tab close failure/ : /failed to execute workbench\.action\.closePanel/
    );
    assert.strictEqual(harness.connectCalls, 1);
    assert.strictEqual(harness.readTimeouts.length, 2);
    assert.strictEqual(harness.connections[0]?.disposeCalls, 1);
    assert.strictEqual(harness.closeEditorTabCalls, editor ? 1 : 0);
    assert.deepStrictEqual(harness.commands, editor ? [] : ['workbench.action.closePanel']);
  }
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

function createSensitiveAttachErrorMessage(): string {
  return [
    'CDP WebSocket upgrade failed: HTTP/1.1 401 Unauthorized',
    'Authorization: Bearer synthetic-secret-token',
    'Location: https://example.invalid/private?sig=synthetic-signature',
    'Targets: [{"url":"https://host.invalid/workbench?access_token=target-secret","title":"Private Customer Workflow"}]',
  ].join('\r\n');
}

function assertSensitiveAttachDetailsRedacted(value: string): void {
  for (const forbidden of [
    'HTTP/1.1 401',
    'Authorization',
    'synthetic-secret-token',
    'example.invalid',
    'synthetic-signature',
    'host.invalid',
    'access_token',
    'target-secret',
    'Private Customer Workflow',
  ]) {
    assert.ok(!value.includes(forbidden), `Attach retry diagnostic leaked ${forbidden}: ${value}`);
  }
}

class FakeCopilotChatAttachConnection {
  disposeCalls = 0;

  dispose(): void {
    this.disposeCalls++;
  }
}

class FakeCopilotChatAttachHarness {
  readonly commands: string[] = [];
  readonly connectTimeouts: number[] = [];
  readonly logs: string[] = [];
  readonly connections: FakeCopilotChatAttachConnection[] = [];
  readonly readTimeouts: number[] = [];
  readonly sleepDurations: number[] = [];
  connectCalls = 0;
  createdCloseHosts = 0;
  closeEditorTabCalls = 0;
  private currentNow = 0;

  constructor(
    private readonly options: {
      attachErrors?: Error[];
      connectDurationsMs?: number[];
      connectFailuresBeforeSuccess?: number;
      readStateFailure?: Error;
      readStateFailures?: (Error | undefined)[];
      readDurationsMs?: number[];
      rejectCommands?: boolean;
      rejectEditorTabs?: boolean;
      states: CopilotChatWorkbenchState[];
    }
  ) {}

  connect(timeoutMs: number): Promise<FakeCopilotChatAttachConnection> {
    const callIndex = this.connectCalls;
    this.connectCalls++;
    this.connectTimeouts.push(timeoutMs);
    this.currentNow += this.options.connectDurationsMs?.[callIndex] ?? 0;
    if (this.connectCalls <= (this.options.connectFailuresBeforeSuccess ?? 0)) {
      return Promise.reject(this.options.attachErrors?.[callIndex] ?? new Error(`synthetic attach failure ${this.connectCalls}`));
    }
    const connection = new FakeCopilotChatAttachConnection();
    this.connections.push(connection);
    return Promise.resolve(connection);
  }

  createCloseHost(_connection: FakeCopilotChatAttachConnection): FakeCopilotChatHost {
    this.createdCloseHosts++;
    const host = new FakeCopilotChatHost(this.options.states, {
      readTimeouts: this.readTimeouts,
      readStateFailure: this.options.readStateFailure,
      readStateFailures: this.options.readStateFailures,
      readDurationsMs: this.options.readDurationsMs,
      rejectCommands: this.options.rejectCommands,
      rejectEditorTabs: this.options.rejectEditorTabs,
      clock: {
        now: () => this.now(),
        advance: (ms) => {
          this.currentNow += ms;
        },
      },
    });
    host.log = (message) => this.log(message);
    host.sleep = (ms) => this.sleep(ms);
    const originalExecuteCommand = host.executeCommand.bind(host);
    host.executeCommand = async (command) => {
      this.commands.push(command);
      await originalExecuteCommand(command);
    };
    const originalCloseEditorTabs = host.closeEditorTabs.bind(host);
    host.closeEditorTabs = async () => {
      this.closeEditorTabCalls++;
      await originalCloseEditorTabs();
    };
    return host;
  }

  sleep(ms: number): Promise<void> {
    this.sleepDurations.push(ms);
    this.currentNow += ms;
    return Promise.resolve();
  }

  now(): number {
    return this.currentNow;
  }

  log(message: string): void {
    this.logs.push(message);
  }
}

class FakeCopilotChatHost {
  readonly commands: string[] = [];
  readonly logs: string[] = [];
  closeEditorTabCalls = 0;
  private readIndex = 0;
  private stateIndex = 0;
  private currentNow = 0;

  constructor(
    private readonly states: CopilotChatWorkbenchState[],
    private readonly options: {
      rejectCommands?: boolean;
      rejectEditorTabs?: boolean;
      readStateFailure?: Error;
      readStateFailures?: (Error | undefined)[];
      readDurationsMs?: number[];
      readTimeouts?: number[];
      clock?: { now(): number; advance(ms: number): void };
    } = {}
  ) {}

  closeEditorTabs(): Promise<void> {
    this.closeEditorTabCalls++;
    if (this.options.rejectEditorTabs) {
      return Promise.reject(new Error('synthetic editor tab close failure'));
    }
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
    const callIndex = this.readIndex++;
    this.options.readTimeouts?.push(_timeoutMs);
    this.advance(this.options.readDurationsMs?.[callIndex] ?? 0);
    const failure = this.options.readStateFailure ?? this.options.readStateFailures?.[callIndex];
    if (failure) {
      return Promise.reject(failure);
    }
    const state = this.states[Math.min(this.stateIndex++, this.states.length - 1)];
    return Promise.resolve(state);
  }

  sleep(_ms: number): Promise<void> {
    this.advance(_ms);
    return Promise.resolve();
  }

  log(message: string): void {
    this.logs.push(message);
  }

  now(): number {
    return this.options.clock?.now() ?? this.currentNow;
  }

  private advance(ms: number): void {
    if (this.options.clock) {
      this.options.clock.advance(ms);
      return;
    }
    this.currentNow += ms;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
