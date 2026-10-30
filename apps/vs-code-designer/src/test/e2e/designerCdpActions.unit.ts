import * as assert from 'assert';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { runInNewContext } from 'vm';
import type { Point } from './cdpFormHelpers';
import { MsnDesignerCdpActions, ProvenDesignerCdpActions, resolveDesignerActionProfile } from './designerCdpActions';

interface TestDomWindow {
  document: {
    getElementById: (id: string) => object | null;
    querySelectorAll: (selector: string) => Iterable<object>;
  };
  HTMLElement: {
    prototype: object;
  };
  eval: (source: string) => unknown;
  close: () => void;
}

const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string, options?: Record<string, unknown>) => { window: TestDomWindow };
};

const actionsSourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'designerCdpActions.ts');
const lifecycleSourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'workspaceLifecycle.ts');
const lifecycleWrapperSourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'workspaceLifecycle.test.ts');
const actionsSourceText = fs.readFileSync(actionsSourcePath, 'utf-8');
const lifecycleSourceText = fs.readFileSync(lifecycleSourcePath, 'utf-8');
const lifecycleWrapperSourceText = fs.readFileSync(lifecycleWrapperSourcePath, 'utf-8');
const actionsSource = ts.createSourceFile(actionsSourcePath, actionsSourceText, ts.ScriptTarget.Latest, true);
const lifecycleSource = ts.createSourceFile(lifecycleSourcePath, lifecycleSourceText, ts.ScriptTarget.Latest, true);
const lifecycleWrapperSource = ts.createSourceFile(lifecycleWrapperSourcePath, lifecycleWrapperSourceText, ts.ScriptTarget.Latest, true);

const generalizedHelperSha256 = 'e2fa4c863c79409d4150912a11566a95c0d0ee6814e42caefc3650b9853470a6';

async function main(): Promise<void> {
  testActionProfileResolution();
  testGeneralizedHelperIsIsolated();
  testRecursiveDesignerTextCollection();
  testRenderedVisibilityAndDiagnosticOnlyHitTarget();
  testDiscoveryAndSearchParity();
  testSearchResultsAndOperationParity();
  testActionMenuParity();
  testNodeAndPanelParity();
  testParameterAndSaveParity();
  testProvenSaveButtonDom();
  await testReplacementKeySequence();
  await testExactNodeIdentity();
  await testExactPanelRebinding();
  await testDeleteWaitsForExactClickedNode();
  await testProvenAdapterCancellation();
  await testPersistedDesignerReadiness();
  await testExactPersistedNodeReadiness();
  await testStableActionInsertionAcknowledgement();
  await testRequestTriggerRequiresInsertionAcknowledgement();
  testProductionOperationCardContracts();
  testOperationClickRouting();
  await testOperationClickRetryControls();
  testOperationCardVisibility();
  await testDiscoveryVisibleOperationCard();
  await testSettingsTabPaths();
  await testRunAfterToggleOrderingAndRerenderReacquisition();
  await testRunAfterRejectsDisabledAndWrongFinalState();
  testRunAfterCheckboxOwnerDom();
  testProvenAdapterUsesUnmodifiedMsnHelper();
  testProvenAdapterCompatibility();
  testRunAfterIdentityAndStatusContracts();
  testHelperConsumersDoNotRegisterCanonicalLifecycleSuite();
  testWorkspaceLifecycleWrapperParity();
  console.log('[designerCdpActions.unit] all tests passed');
}

async function testProvenAdapterCancellation(): Promise<void> {
  let evaluateCalls = 0;
  const actions = new ProvenDesignerCdpActions(
    {
      evaluate: async () => {
        evaluateCalls++;
        return false as never;
      },
      send: async () => undefined,
    },
    7,
    Date.now() + 60000,
    () => {
      throw new Error('scenario cancelled');
    }
  );
  // Exercise the guard directly through operation selection. The historical
  // Designer-ready poll catches evaluation failures until its long native budget.
  await assert.rejects(() => actions.selectOperation('Compose', ['compose']), /scenario cancelled/);
  assert.strictEqual(evaluateCalls, 0, 'Cancelled scenarios must not issue delegated MSN CDP requests');
}

async function testPersistedDesignerReadiness(): Promise<void> {
  const dom = new JSDOM(
    `<html><body>
      <div role="toolbar"><button id="save" aria-label="Saving" aria-busy="true" disabled>Saving</button></div>
      <div class="react-flow" data-visible="true">
        <div class="react-flow__pane" data-visible="true"></div>
        <div id="msla-node-Compose" class="react-flow__node" data-visible="true">Compose</div>
        <div id="msla-node-Request" class="react-flow__node" data-offscreen="true">Request</div>
      </div>
    </body></html>`,
    { runScripts: 'outside-only' }
  );
  const { document, HTMLElement } = dom.window;
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value(this: { getAttribute: (name: string) => string | null }) {
      return this.getAttribute('data-offscreen') === 'true'
        ? { left: 0, top: 2000, right: 100, bottom: 2100, width: 100, height: 100 }
        : { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
    configurable: true,
    value() {
      return [this.getBoundingClientRect()];
    },
  });
  let evaluations = 0;
  const actions = new ProvenDesignerCdpActions(
    {
      evaluate: async <T>(_contextId: number | undefined, expression: string) => {
        evaluations++;
        if (evaluations === 1) {
          throw new Error('transient execution context replacement');
        }
        if (evaluations === 3) {
          const save = document.getElementById('save') as {
            setAttribute: (name: string, value: string) => void;
            removeAttribute: (name: string) => void;
            textContent: string;
          } | null;
          save?.setAttribute('aria-label', 'Save');
          save?.setAttribute('aria-busy', 'false');
          save?.removeAttribute('disabled');
          if (save) {
            save.textContent = 'Save';
          }
        }
        return dom.window.eval(expression) as T;
      },
      send: async () => undefined,
    },
    1,
    Date.now() + 5000
  );

  await actions.waitForPersistedDesignerReady();
  assert.ok(
    evaluations >= 5,
    'Persisted readiness must retry transient evaluation errors, reject busy Save, and require three stable ready observations'
  );
  dom.window.close();
}

async function testExactPersistedNodeReadiness(): Promise<void> {
  let observations = 0;
  const expected = [
    { nodeId: 'Request', title: 'When an HTTP request is received' },
    { nodeId: 'Initialize_variables', title: 'Initialize variables' },
  ];
  const actions = new ProvenDesignerCdpActions(
    {
      evaluate: async <T>() => {
        observations++;
        return {
          canvasCount: 1,
          identities: observations === 1 ? expected.slice(0, 1) : expected,
          missing: observations === 1 ? ['Initialize_variables'] : [],
          ambiguous: [],
        } as T;
      },
      send: async () => undefined,
    },
    1,
    Date.now() + 5000
  );
  assert.deepStrictEqual(await actions.waitForExactNodeIds(expected.map((identity) => identity.nodeId)), expected);
  assert.ok(observations >= 5, 'Exact persisted node readiness must reject missing nodes and require stable observations');

  const ambiguous = new ProvenDesignerCdpActions(
    {
      evaluate: async <T>() =>
        ({
          canvasCount: 1,
          identities: expected,
          missing: [],
          ambiguous: ['Initialize_variables'],
        }) as T,
      send: async () => undefined,
    },
    1,
    Date.now() + 5
  );
  await assert.rejects(
    () => ambiguous.waitForExactNodeIds(expected.map((identity) => identity.nodeId)),
    /exact persisted Designer node IDs/
  );
}

async function testStableActionInsertionAcknowledgement(): Promise<void> {
  const actions = new ProvenDesignerCdpActions(
    { evaluate: async () => undefined as never, send: async () => undefined },
    1,
    Date.now() + 10_000
  ) as any;
  const before = [{ nodeId: 'Request', title: 'When an HTTP request is received' }];
  const compose = { nodeId: 'Compose', title: 'Compose' };
  const snapshots = [
    {
      nodes: [...before, { nodeId: 'Compose', title: '' }],
      panelNodeIds: ['Compose'],
      discoveryVisible: false,
      loaderCount: 0,
    },
    ...[1, 2, 3].map(() => ({
      nodes: [...before, compose],
      panelNodeIds: ['Compose'],
      discoveryVisible: false,
      loaderCount: 0,
    })),
  ];
  actions.readActionInsertionSnapshot = async () => snapshots.shift() ?? snapshots.at(-1);
  const inserted = await actions.waitForStableSingleNewNodeIdentity(before, 'Compose', Date.now() + 1000, 'Compose');
  assert.deepStrictEqual(inserted, compose, 'Insertion acknowledgement must require one stable exact new node');

  const virtualizedBefore = [{ nodeId: 'Append_to_string_variable', title: 'Append to string variable' }];
  const remountedRequest = { nodeId: 'When_an_HTTP_request_is_received', title: 'When an HTTP request is received' };
  const response = { nodeId: 'Response', title: 'Response' };
  const remountSnapshots = [1, 2, 3].map(() => ({
    nodes: [...virtualizedBefore, remountedRequest, response],
    panelNodeIds: ['Response'],
    discoveryVisible: false,
    loaderCount: 0,
  }));
  actions.readActionInsertionSnapshot = async () => remountSnapshots.shift() ?? remountSnapshots.at(-1);
  const insertedResponse = await actions.waitForStableSingleNewNodeIdentity(virtualizedBefore, 'Response', Date.now() + 1000, 'Response');
  assert.deepStrictEqual(insertedResponse, response, 'Insertion acknowledgement must ignore unrelated virtualized-node remounts');

  actions.readActionInsertionSnapshot = async () => ({
    nodes: [...before, compose, { nodeId: 'Compose_1', title: 'Compose 1' }],
    panelNodeIds: ['Compose', 'Compose_1'],
    discoveryVisible: false,
    loaderCount: 0,
  });
  await assert.rejects(
    () => actions.waitForStableSingleNewNodeIdentity(before, 'Compose', Date.now() + 1000, 'Compose'),
    /ambiguous Designer nodes/
  );

  const sameTitleRemountSnapshots = [
    ...[1, 2, 3].map(() => ({
      nodes: [...virtualizedBefore, compose],
      panelNodeIds: [],
      discoveryVisible: false,
      loaderCount: 0,
    })),
    ...[1, 2, 3].map(() => ({
      nodes: [...virtualizedBefore, compose, { nodeId: 'Compose_1', title: 'Compose 1' }],
      panelNodeIds: ['Compose_1'],
      discoveryVisible: false,
      loaderCount: 0,
    })),
  ];
  actions.readActionInsertionSnapshot = async () => sameTitleRemountSnapshots.shift() ?? sameTitleRemountSnapshots.at(-1);
  const insertedCompose1 = await actions.waitForStableSingleNewNodeIdentity(virtualizedBefore, 'Compose', Date.now() + 1000, 'Compose');
  assert.deepStrictEqual(
    insertedCompose1,
    { nodeId: 'Compose_1', title: 'Compose 1' },
    'Insertion acknowledgement must not credit a same-title remounted card without the newly opened details panel'
  );

  let selectCalls = 0;
  let closeCalls = 0;
  actions.readExactNodeIdentities = async () => before;
  actions.proven = {
    closePanel: async () => {
      closeCalls++;
    },
    openActionDiscovery: async () => undefined,
    search: async () => undefined,
    waitForSearchResults: async () => undefined,
    selectOperation: async () => {
      selectCalls++;
    },
  };
  actions.waitForStableSingleNewNodeIdentity = async () => undefined;
  actions.readActionInsertionSnapshot = async () => ({
    nodes: before,
    panelNodeIds: [],
    discoveryVisible: true,
    loaderCount: 0,
  });
  await assert.rejects(
    () => actions.insertActionAndGetIdentity({ search: 'Compose', operationName: 'Compose', variants: ['compose'] }),
    /insertion-not-acknowledged/
  );
  assert.strictEqual(closeCalls, 1, 'Insertion baseline must close the responsive panel before reading existing nodes');
  assert.strictEqual(selectCalls, 1, 'Missing insertion acknowledgement must not restart discovery or operation matching');
}

async function testRequestTriggerRequiresInsertionAcknowledgement(): Promise<void> {
  for (const title of ['When an HTTP request is received', 'When a HTTP request is received']) {
    for (const inserted of [true, false]) {
      const deadline = Date.now() + 60000;
      const actions = new ProvenDesignerCdpActions({ evaluate: async () => undefined as never, send: async () => undefined }, 1, deadline);
      let acknowledgements = 0;
      let panelCloses = 0;
      const hooks = { onDiscoveryOpen: async () => undefined };
      Object.assign(actions, {
        readActionInsertionSnapshot: async () => ({ nodes: [], panelNodeIds: [], discoveryVisible: true, loaderCount: 0 }),
        proven: {
          hasDiscoveryPanel: async () => true,
          search: async (search: string) => assert.strictEqual(search, 'Request'),
          waitForSearchResults: async () => undefined,
          waitForText: async () => assert.fail('Discovery card text must never acknowledge trigger insertion'),
          selectOperation: async (
            operationName: string,
            variants: string[],
            dispatch: (point: Point, selectedTitle: string) => Promise<void>
          ) => {
            assert.strictEqual(operationName, 'When an HTTP request is received');
            assert.ok(variants.includes(title.toLowerCase()));
            await dispatch({ x: 70, y: 40 }, title);
          },
          closePanel: async () => {
            panelCloses++;
          },
        },
        selectActionWithAcknowledgement: async (
          point: Point,
          before: unknown[],
          selectedTitle: string,
          insertionDeadline: number,
          actualHooks: object
        ) => {
          acknowledgements++;
          assert.deepStrictEqual(point, { x: 70, y: 40 });
          assert.deepStrictEqual(before, []);
          assert.strictEqual(selectedTitle, title);
          assert.ok(insertionDeadline <= deadline, 'Trigger insertion must retain the original scenario deadline');
          assert.strictEqual(actualHooks, hooks);
          return inserted ? { nodeId: 'When_an_HTTP_request_is_received', title } : undefined;
        },
      });
      if (inserted) {
        await actions.addRequestTrigger(hooks);
      } else {
        await assert.rejects(() => actions.addRequestTrigger(hooks), /Request trigger insertion was not acknowledged/);
      }
      assert.strictEqual(acknowledgements, 1, 'Request must use the shared browser-routed insertion acknowledgement');
      assert.strictEqual(panelCloses, inserted ? 1 : 0, 'Unacknowledged discovery must not be closed as if insertion succeeded');
    }
  }
}

function testOperationClickRouting(): void {
  class TestElement {
    id = 'exact-card';
    tagName = 'DIV';
    className = '';
    parentElement = null;
    disabled = false;
    isConnected = true;
    clientLeft = 2;
    clientTop = 3;
    offsetWidth = 100;
    offsetHeight = 60;
    rect = { left: 10, top: 20, right: 110, bottom: 80, width: 100, height: 60 };
    getBoundingClientRect() {
      return this.rect;
    }
    getClientRects() {
      return [this.rect];
    }
    getAttribute() {
      return null;
    }
    contains(element: unknown) {
      return element === this;
    }
    querySelector() {
      return { textContent: 'Initialize variables' };
    }
  }
  const card = new TestElement();
  const style = { display: 'block', visibility: 'visible', opacity: '1', transform: 'none', zoom: '1' };
  const state = {
    card,
    title: 'initialize variables',
    activity: false,
    events: [],
    routeSignature: undefined as string | undefined,
    bounds: { left: 10, top: 20, width: 100, height: 60 },
  };
  const root: any = {
    frameElement: { tagName: 'IFRAME' },
    innerWidth: 1200,
    innerHeight: 900,
    devicePixelRatio: 2.5,
    document: { elementFromPoint: () => card, querySelectorAll: () => [card] },
    getComputedStyle: () => style,
  };
  root.parent = root;
  const context = root;
  root.__laOperationClick = state;
  const probe = () =>
    runInNewContext(
      `(() => {
      ${getStringConstant('visibleDom')}
      ${getStringConstant('operationCardVisibilityDom')}
      ${getStringConstant('operationCardIdentityDom')}
      ${getStringConstant('operationClickProbeDom')}
    })()`,
      {
        window: context,
        document: context.document,
        innerWidth: context.innerWidth,
        innerHeight: context.innerHeight,
        getComputedStyle: () => style,
        HTMLElement: TestElement,
        Element: TestElement,
      }
    ) as any;
  assert.strictEqual(JSON.stringify(probe().point), JSON.stringify({ x: 60, y: 50 }), 'DPR must not scale local CSS coordinates');
  assert.strictEqual(probe().actionable, true, 'Local checks must not traverse masked window.parent or assume its frame identity');
  style.transform = 'scale(1.25)';
  assert.strictEqual(probe().actionable, true, 'Browser protocol geometry, not local CSS math, handles transforms');
  style.transform = 'none';
  root.document.elementFromPoint = () => null;
  assert.match(probe().reason, /obscured/);
  root.document.elementFromPoint = () => card;
  root.innerWidth++;
  assert.match(probe().reason, /geometry changed/);
  root.innerWidth--;
  (state as any).routeChanged = false;
  card.rect.left++;
  assert.match(probe().reason, /card moved/);
}

// Mirrors RecommendationPanelCard/OperationSearchCard, not an invented button:
// V2 search uses the recommendation family, an API-id automation attribute, and
// a distinct title node alongside optional badges, connector caption and tools.
function operationCardFixture(
  kind: 'search' | 'recommendation' | 'search-testid' = 'search',
  decorated = false,
  operationTitle = 'Initialize variables'
): string {
  const recommendation = kind === 'recommendation';
  const prefix = recommendation ? 'msla-recommendation-panel-card' : 'msla-op-search-card';
  const identity = recommendation
    ? `class="fui-Card msla-recommendation-panel-card" role="button" data-automation-id="/connectionProviders/${operationTitle.startsWith('When ') ? 'request' : 'variables'}" tabindex="0" title="${operationTitle}"`
    : kind === 'search-testid'
      ? 'data-testid="msla-op-search-result-InitializeVariable"'
      : 'id="msla-op-search-result-InitializeVariable" class="fui-Card msla-op-search-card-container" data-automation-id="msla-op-search-result-InitializeVariable"';
  return `<div ${identity} aria-label="${operationTitle}" style="flex-direction:row">
    <div class="${prefix}-image"><span role="presentation"></span></div>
    <div class="${prefix}-text"><div class="${prefix}-horizontal-flex-items">
      <span class="${prefix}-title">${operationTitle}</span>${decorated ? `<span class="fui-Badge">${operationTitle.startsWith('When ') ? 'Trigger' : 'Preview'}</span>` : ''}
    </div>${decorated ? `<span class="${prefix}-subtitle">${operationTitle.startsWith('When ') ? 'Request' : 'Variables'}</span>` : ''}</div>
    <div class="${prefix}-horizontal-flex-items">
      <button class="info-dot-visible-on-hover" aria-label="More information"><span aria-hidden="true"></span></button>
    </div>
  </div>`;
}

function testProductionOperationCardContracts(): void {
  const componentRoot = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    'libs',
    'designer-ui',
    'src',
    'lib',
    'panel',
    'recommendationpanel'
  );
  const recommendation = fs.readFileSync(path.join(componentRoot, 'recommendationPanelCard', 'index.tsx'), 'utf-8');
  const search = fs.readFileSync(path.join(componentRoot, 'operationSearchCard', 'index.tsx'), 'utf-8');
  const grid = fs.readFileSync(path.join(componentRoot, 'browseResultsV2.tsx'), 'utf-8');
  assert.match(
    grid,
    /<RecommendationPanelCard[\s\S]*onOperationClick=\{onOperationSelected\}/,
    'V2 production operation results must be represented by the regression fixture'
  );
  assert.match(recommendation, /className="msla-recommendation-panel-card"/);
  assert.match(recommendation, /className="msla-recommendation-panel-card-title"/);
  assert.match(recommendation, /role="button"/);
  assert.match(recommendation, /aria-label=\{operationTitle\}/);
  assert.match(recommendation, /data-automation-id=\{apiId\}/);
  assert.match(search, /className="msla-op-search-card-container"/);
  assert.match(search, /className="msla-op-search-card-title"/);
  assert.match(search, /data-automation-id=\{buttonId\}/);
  const dom = new JSDOM(operationCardFixture('recommendation', true));
  try {
    assert.strictEqual(
      Array.from(dom.window.document.querySelectorAll('.msla-op-search-card-container, [data-automation-id^="msla-op-search-result-"]'))
        .length,
      0,
      'Recommendation regression cannot accidentally match invented legacy selector aliases'
    );
    const root = dom.window.document.querySelectorAll('.msla-recommendation-panel-card') as any;
    assert.strictEqual(root.length, 1);
    assert.notStrictEqual(
      root[0].textContent.trim(),
      'Initialize variables',
      'Decorations must exercise semantic title extraction, not coincidental whole-card text equality'
    );
  } finally {
    dom.window.close();
  }
}

async function testOperationClickRetryControls(): Promise<void> {
  // These are deterministic protocol/DOM controls. Mocked trusted receipts below
  // exercise retry policy only; they are not native trusted-event proof.
  const run = async (control: {
    name: string;
    insertOn?: number;
    mismatch?: boolean;
    missingEvents?: boolean;
    untrusted?: boolean;
    activity?: 'loader' | 'node' | 'transient-node' | 'transient-busy' | 'discovery';
    replaceAfterClick?: boolean;
    replaceBeforeProbe?: boolean;
    dispatchFailure?: boolean;
    moveAfterClick?: boolean;
    obscureAfterClick?: boolean;
    beforeCapture?: 'move' | 'perpetual-move' | 'replace' | 'ambiguous' | 'wrong-title' | 'hide' | 'disable' | 'obscure' | 'expire';
    geometryRace?: 'move' | 'replace' | 'detach' | 'missing' | 'zero-area' | 'expire';
    postGeometryDetach?: boolean;
    scenarioExtraBudget?: boolean;
    cardKind?: 'search' | 'recommendation' | 'search-testid';
    decoratedCard?: boolean;
    operationTitle?: string;
    mixedFamilyDuplicate?: boolean;
    expireOnRetry?: boolean;
    hiddenAncestor?: boolean;
    loadingBeforeClick?: boolean;
    browserPoint?: Point;
    browserHitMismatch?: boolean;
    malformedQuad?: boolean;
    expectedClicks: number;
    expectedSuccess?: boolean;
  }): Promise<void> => {
    const operationTitle = control.operationTitle ?? 'Initialize variables';
    const dom = new JSDOM(
      `<html><body>
      <div id="msla-node-Request">Request</div>
      ${operationCardFixture(control.cardKind, control.decoratedCard, operationTitle)}</body></html>`,
      { runScripts: 'outside-only' }
    );
    const window = dom.window as any;
    const card = window.document.querySelector(`[aria-label="${operationTitle}"]`);
    let activeCard = card;
    if (control.hiddenAncestor) {
      card.parentElement.style.visibility = 'hidden';
      card.style.visibility = 'visible';
    }
    let left = 20;
    let obscured = false;
    const rect = () => ({ left, top: 20, right: left + 100, bottom: 60, width: 100, height: 40 });
    Object.defineProperty(window.HTMLElement.prototype, 'getBoundingClientRect', { configurable: true, value: rect });
    Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [rect()] });
    window.HTMLElement.prototype.scrollIntoView = () => undefined;
    window.document.elementFromPoint = () => (obscured ? window.document.body : activeCard);
    let now = 100_000;
    const originalNow = Date.now;
    const originalTimeout = global.setTimeout;
    Date.now = () => now;
    global.setTimeout = ((callback: () => void, delay = 0) =>
      originalTimeout(() => {
        now += delay;
        callback();
      }, 0)) as typeof setTimeout;
    let clicks = 0;
    let observations = 0;
    let geometryReads = 0;
    let geometryObjects = 0;
    let geometryReleases = 0;
    let inputEvents = 0;
    let disconnected = false;
    let probeListeners: any[] = [];
    const removedListeners: any[] = [];
    for (const target of [window.document, window]) {
      const remove = target.removeEventListener;
      target.removeEventListener = function (type: string, listener: unknown, options: unknown) {
        removedListeners.push([target, type, listener]);
        return remove.call(this, type, listener, options);
      };
    }
    const NativeObserver = window.MutationObserver;
    window.MutationObserver = class extends NativeObserver {
      disconnect() {
        disconnected = true;
        super.disconnect();
      }
    };
    const captures: string[] = [];
    const afterEvidence: any[] = [];
    const replace = () => {
      const replacement = activeCard.cloneNode(true);
      activeCard.replaceWith(replacement);
      activeCard = replacement;
    };
    const before = control.operationTitle ? [] : [{ nodeId: 'Request', title: 'Request' }];
    const added = { nodeId: 'Initialize', title: operationTitle };
    const deadline = now + 8000;
    const actions = new ProvenDesignerCdpActions(
      {
        evaluate: async <T>(_contextId: number | undefined, expression: string, options?: { timeoutMs?: number }) => {
          if (expression.includes('const result = (actionable, reason, targetPoint)')) {
            assert.ok(
              (options?.timeoutMs ?? Number.POSITIVE_INFINITY) <= Math.max(1, deadline - now),
              'DOM proof must use the remaining insertion budget'
            );
          }
          // A virtual clock makes never-ready deadline controls deterministic.
          if (!clicks) {
            now += 25;
          }
          const result = window.eval(expression) as T;
          if (window.__laOperationClick) {
            probeListeners = window.__laOperationClick.listeners;
          }
          return result;
        },
        send: async (method, params, options) => {
          if (
            ['Runtime.evaluate', 'DOM.getContentQuads', 'DOM.getNodeForLocation', 'DOM.resolveNode', 'Runtime.callFunctionOn'].includes(
              method
            )
          ) {
            assert.ok(
              (options?.timeoutMs ?? Number.POSITIVE_INFINITY) <= Math.max(1, deadline - now),
              'Protocol proof must use the remaining insertion budget'
            );
          }
          if (method === 'Page.getFrameTree') {
            return { result: { frameTree: { frame: { id: 'test-input-root' } } } };
          }
          const browserPoint = control.browserPoint ?? { x: 70, y: 40 };
          if (method === 'Runtime.evaluate') {
            geometryObjects++;
            assert.strictEqual(params?.contextId, 1, 'Resolve the exact selected Designer context');
            return { result: { result: { objectId: 'original-card' } } };
          }
          if (method === 'DOM.getContentQuads') {
            geometryReads++;
            if (control.postGeometryDetach && clicks) {
              activeCard.remove();
              return { result: { quads: [] } };
            }
            if (geometryReads === 2 && control.geometryRace) {
              assert.strictEqual(inputEvents, 0, 'No input may precede the screenshot/geometry race proof');
              if (control.geometryRace === 'move') {
                left++;
              }
              if (control.geometryRace === 'replace') {
                replace();
              }
              if (control.geometryRace === 'detach') {
                activeCard.remove();
              }
              if (control.geometryRace === 'expire') {
                now = deadline;
              }
              if (['missing', 'replace', 'detach', 'expire'].includes(control.geometryRace)) {
                return { result: { quads: [] } };
              }
              if (control.geometryRace === 'zero-area') {
                return { result: { quads: [[0, 0, 0, 0, 0, 0, 0, 0]] } };
              }
            }
            assert.strictEqual(params?.objectId, 'original-card');
            return {
              result: {
                quads: control.malformedQuad
                  ? [[0, 0]]
                  : [
                      [
                        browserPoint.x - 50,
                        browserPoint.y - 20,
                        browserPoint.x + 50,
                        browserPoint.y - 20,
                        browserPoint.x + 50,
                        browserPoint.y + 20,
                        browserPoint.x - 50,
                        browserPoint.y + 20,
                      ],
                    ],
              },
            };
          }
          if (method === 'DOM.getNodeForLocation') {
            assert.deepStrictEqual({ x: params?.x, y: params?.y }, { x: Math.floor(browserPoint.x), y: Math.floor(browserPoint.y) });
            window.__testOperationHit = activeCard.querySelector('[class$="-title"]') ?? activeCard;
            return { result: { backendNodeId: 99, frameId: 'designer-frame' } };
          }
          if (method === 'DOM.resolveNode') {
            assert.strictEqual(params?.backendNodeId, 99);
            assert.strictEqual(params?.executionContextId, 1);
            return { result: { object: { objectId: 'hit-target' } } };
          }
          if (method === 'Runtime.callFunctionOn') {
            assert.strictEqual(params?.objectId, 'hit-target');
            const matches = window.eval(`(${params?.functionDeclaration}).call(window.__testOperationHit)`);
            return { result: { result: { value: matches && !control.browserHitMismatch } } };
          }
          if (method === 'Runtime.releaseObjectGroup') {
            geometryReleases++;
            return {};
          }
          assert.strictEqual(method, 'Input.dispatchMouseEvent');
          inputEvents++;
          assert.ok(now < deadline, 'Every input must remain inside the original insertion budget');
          assert.strictEqual(window.__laOperationClick.card, activeCard, 'Input must use the currently proven retained identity');
          assert.ok(activeCard.isConnected, 'Never dispatch to a detached card');
          assert.ok(geometryReads >= 2, 'No input until two browser geometry proofs');
          assert.deepStrictEqual({ x: params?.x, y: params?.y }, browserPoint, 'Dispatch browser CSS coordinates without DPR scaling');
          if (control.dispatchFailure) {
            throw new Error('test dispatch transport failure');
          }
          if (params?.type !== 'mouseReleased') {
            return;
          }
          clicks++;
          if (control.untrusted) {
            for (const type of ['pointerdown', 'pointerup', 'click']) {
              // Negative control only: real DOM listeners must label these
              // synthetic unit-fixture events untrusted and retain their path.
              card.dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX: 70, clientY: 40 }));
            }
            assert.ok(window.__laOperationClick.events.every((event: any) => !event.trusted && event.path.length > 0));
          } else if (!control.missingEvents) {
            window.__laOperationClick.events = ['pointerdown', 'pointerup', 'click'].map((type) => ({
              type,
              trusted: !control.untrusted,
              matchesCard: !control.mismatch,
              recipient: control.mismatch ? 'DIV#overlay' : 'BUTTON',
              x: 70,
              y: 40,
            }));
          }
          if (control.moveAfterClick) {
            left++;
          }
          if (control.obscureAfterClick) {
            obscured = true;
          }
          if (control.activity === 'transient-node') {
            const node = window.document.createElement('div');
            node.id = 'msla-node-transient';
            window.document.body.append(node);
            node.remove();
          }
          if (control.activity === 'transient-busy') {
            window.document.body.setAttribute('aria-busy', 'true');
            window.document.body.setAttribute('aria-busy', 'false');
          }
          if (control.replaceAfterClick) {
            replace();
          }
        },
      },
      1,
      deadline + (control.scenarioExtraBudget ? 30000 : 0)
    ) as any;
    actions.readActionInsertionSnapshot = async () => {
      if (clicks > 0) {
        now += Math.min(500, Math.max(0, deadline - now));
        observations++;
      }
      const inserted = control.insertOn !== undefined && clicks >= control.insertOn;
      const oneShot = observations === 1;
      return {
        nodes: inserted ? [...before, added] : control.activity === 'node' && oneShot ? [...before, added] : before,
        panelNodeIds: inserted ? ['Initialize'] : [],
        discoveryVisible: !inserted && !(control.activity === 'discovery' && oneShot),
        loaderCount: (control.loadingBeforeClick && clicks === 0) || (control.activity === 'loader' && oneShot) ? 1 : 0,
      };
    };
    try {
      let identity: unknown;
      let error: unknown;
      try {
        await actions.proven.selectOperation(
          control.operationTitle ? 'When an HTTP request is received' : operationTitle,
          [operationTitle.toLowerCase()],
          async (point: Point, selectedTitle: string) => {
            assert.strictEqual(selectedTitle, operationTitle, 'Dispatch must retain only the selected semantic operation title');
            assert.strictEqual(
              window.__laSelectedOperationCard.card,
              activeCard,
              'Production selection must retain the actual fixture card'
            );
            if (control.replaceBeforeProbe) {
              replace();
            }
            identity = await actions.selectActionWithAcknowledgement(point, before, selectedTitle, deadline, {
              onOperationClick: async (stage: string, attempt: number, evidence: any) => {
                captures.push(`${attempt}-${stage}`);
                if (stage === 'after') {
                  afterEvidence.push(evidence);
                }
                if (stage === 'before' && (captures.length === 1 || control.beforeCapture === 'perpetual-move')) {
                  assert.strictEqual(inputEvents, 0, 'Before screenshot precedes all input');
                  if (control.beforeCapture === 'move' || control.beforeCapture === 'perpetual-move') {
                    left++;
                  }
                  if (control.beforeCapture === 'replace') {
                    replace();
                  }
                  if (control.beforeCapture === 'ambiguous') {
                    if (control.mixedFamilyDuplicate) {
                      const wrapper = window.document.createElement('div');
                      wrapper.innerHTML = operationCardFixture('search', true, operationTitle);
                      window.document.body.append(wrapper.firstElementChild);
                    } else {
                      window.document.body.append(activeCard.cloneNode(true));
                    }
                  }
                  if (control.beforeCapture === 'wrong-title') {
                    activeCard.querySelector('[class$="-title"]').textContent = 'Initialize something else';
                  }
                  if (control.beforeCapture === 'hide') {
                    activeCard.style.display = 'none';
                  }
                  if (control.beforeCapture === 'disable') {
                    activeCard.setAttribute('aria-disabled', 'true');
                  }
                  if (control.beforeCapture === 'obscure') {
                    obscured = true;
                  }
                  if (control.beforeCapture === 'expire') {
                    now = deadline;
                  }
                }
                if (stage === 'before' && attempt === 2 && control.expireOnRetry) {
                  now = deadline;
                }
              },
            });
          }
        );
      } catch (caught) {
        error = caught;
      }
      assert.strictEqual(clicks, control.expectedClicks, control.name);
      assert.strictEqual(!!identity, !!control.expectedSuccess, control.name);
      if (control.expectedSuccess) {
        assert.ifError(error);
      }
      if ((!control.expectedSuccess && control.beforeCapture) || control.expireOnRetry) {
        assert.ok(error, `${control.name}: unsafe input must fail closed`);
      }
      assert.ok(now <= deadline + 500, `${control.name}: original deadline must not restart`);
      if (clicks) {
        const afterIndex = captures.indexOf('1-after');
        assert.ok(
          afterIndex > 0 && captures.slice(0, afterIndex).every((stage) => stage === '1-before'),
          'Every pre-input refresh must capture a fresh before screenshot without counting an insertion attempt'
        );
      }
      if (control.dispatchFailure) {
        assert.deepStrictEqual(captures, ['1-before', '1-after'], 'Failed trusted dispatch still needs an immediate after diagnostic');
        assert.match(String(error), /test dispatch transport failure/);
      }
      if (!control.expectedClicks && !control.dispatchFailure) {
        assert.strictEqual(inputEvents, 0, 'Refusal means no input, not just no release');
      }
      if (control.malformedQuad) {
        assert.match(String(error), /single finite browser content quad/);
      }
      if (control.beforeCapture === 'ambiguous') {
        assert.match(String(error), /found 2/);
      }
      if (control.beforeCapture === 'wrong-title') {
        assert.match(String(error), /Initialize something else/, 'Acquisition timeout must diagnose the actual candidate title');
      }
      if (control.postGeometryDetach) {
        assert.ok(afterEvidence[0]?.events?.length === 3, 'Detachment during post-click protocol reads must preserve all receipts');
        assert.strictEqual(afterEvidence[0]?.geometry?.connected, false, 'Report current DOM connectivity with absent quads');
      }
      if (
        control.beforeCapture === 'replace' ||
        control.beforeCapture === 'move' ||
        ['move', 'replace', 'missing', 'zero-area'].includes(control.geometryRace ?? '')
      ) {
        assert.ok(captures.filter((stage) => stage === '1-before').length >= 2, 'Changed proof requires a fresh screenshot');
      }
      assert.strictEqual(geometryReleases, geometryObjects, 'Every geometry object group must be released, including missing quads');
      assert.strictEqual(disconnected, true, 'Always disconnect mutation observation');
      assert.strictEqual(probeListeners.length, 5, 'Exercise all pointer/route listeners');
      assert.ok(
        probeListeners.every(([target, type, listener]) =>
          removedListeners.some(
            ([removedTarget, removedType, removedListener]) =>
              removedTarget === target && removedType === type && removedListener === listener
          )
        ),
        'Remove every retained pointer/route listener on all exit paths'
      );
      assert.strictEqual(window.__laOperationClick, undefined, 'Probe must always be disposed');
      assert.strictEqual(window.__laOperationInputRoot, undefined, 'Input-root sentinel must always be disposed');
      assert.strictEqual(window.__laSelectedOperationCard, undefined, 'Original selection reference must always be disposed');
    } finally {
      Date.now = originalNow;
      global.setTimeout = originalTimeout;
      dom.window.close();
    }
  };
  await run({ name: 'first insertion: no duplicate', insertOn: 1, expectedClicks: 1, expectedSuccess: true });
  for (const operationTitle of ['When an HTTP request is received', 'When a HTTP request is received']) {
    await run({
      name: 'visible V2 Request trigger remains actionable while other results load',
      operationTitle,
      cardKind: 'recommendation',
      decoratedCard: true,
      loadingBeforeClick: true,
      insertOn: 1,
      expectedClicks: 1,
      expectedSuccess: true,
    });
    await run({
      name: 'Request trigger geometry refreshes before browser input',
      operationTitle,
      cardKind: 'recommendation',
      decoratedCard: true,
      beforeCapture: 'move',
      insertOn: 1,
      expectedClicks: 1,
      expectedSuccess: true,
    });
    await run({
      name: 'Request discovery card alone cannot acknowledge insertion',
      operationTitle,
      cardKind: 'recommendation',
      decoratedCard: true,
      expectedClicks: 2,
      expectedSuccess: false,
    });
  }
  await run({
    name: 'native V2 recommendation card is acquired after production selection',
    cardKind: 'recommendation',
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  await run({
    name: 'recommendation semantic title excludes badges and connector caption',
    cardKind: 'recommendation',
    decoratedCard: true,
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  await run({
    name: 'legacy test-id-only selected card remains supported',
    cardKind: 'search-testid',
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  for (const beforeCapture of ['move', 'replace'] as const) {
    await run({
      name: `native-shaped recommendation screenshot ${beforeCapture} refreshes before input`,
      cardKind: 'recommendation',
      decoratedCard: true,
      beforeCapture,
      insertOn: 1,
      expectedClicks: 1,
      expectedSuccess: true,
    });
  }
  for (const geometryRace of ['move', 'replace', 'missing'] as const) {
    await run({
      name: `native-shaped recommendation protocol ${geometryRace} refreshes before input`,
      cardKind: 'recommendation',
      decoratedCard: true,
      geometryRace,
      insertOn: 1,
      expectedClicks: 1,
      expectedSuccess: true,
    });
  }
  await run({
    name: 'native-shaped recommendation still selectable during unrelated loading',
    cardKind: 'recommendation',
    decoratedCard: true,
    loadingBeforeClick: true,
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  await run({
    name: 'mixed operation card families with equal exact titles refuse input',
    cardKind: 'recommendation',
    decoratedCard: true,
    beforeCapture: 'ambiguous',
    mixedFamilyDuplicate: true,
    expectedClicks: 0,
  });
  await run({
    name: 'native-shaped recommendation replacement after input stays frozen',
    cardKind: 'recommendation',
    decoratedCard: true,
    replaceAfterClick: true,
    expectedClicks: 1,
  });
  await run({
    name: 'successful insertion detaches during post-click geometry, receipts survive',
    postGeometryDetach: true,
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  for (const geometryRace of ['move', 'replace', 'missing', 'zero-area'] as const) {
    await run({
      name: `protocol race ${geometryRace} recovers only before input`,
      geometryRace,
      insertOn: 1,
      expectedClicks: 1,
      expectedSuccess: true,
    });
  }
  for (const geometryRace of ['detach', 'expire'] as const) {
    await run({ name: `protocol race ${geometryRace} has no unsafe input`, geometryRace, expectedClicks: 0 });
  }
  await run({
    name: 'browser frame-offset CSS point is authoritative',
    browserPoint: { x: 172.5, y: 133.25 },
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  await run({ name: 'browser hit mismatch refuses input', browserHitMismatch: true, expectedClicks: 0 });
  await run({ name: 'invalid browser geometry refuses input', malformedQuad: true, expectedClicks: 0 });
  await run({
    name: 'visible card overrides hidden ancestor',
    hiddenAncestor: true,
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  await run({
    name: 'first click does not wait for unrelated search loading',
    loadingBeforeClick: true,
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  await run({ name: 'one idle retry inserts exactly once', insertOn: 2, expectedClicks: 2, expectedSuccess: true });
  await run({ name: 'retry budget exhausted', expectedClicks: 2 });
  for (const activity of ['loader', 'node', 'transient-node', 'transient-busy', 'discovery'] as const) {
    await run({ name: `sticky ${activity}: no retry`, activity, expectedClicks: 1 });
  }
  await run({ name: 'recipient mismatch: no retry', mismatch: true, expectedClicks: 1 });
  await run({ name: 'missing events: no retry', missingEvents: true, expectedClicks: 1 });
  await run({ name: 'synthetic events: no retry', untrusted: true, expectedClicks: 1 });
  await run({ name: 'card moved after click: no retry', moveAfterClick: true, expectedClicks: 1 });
  await run({ name: 'card obscured after click: no retry', obscureAfterClick: true, expectedClicks: 1 });
  await run({ name: 'same-title rerender cannot substitute original card', replaceAfterClick: true, expectedClicks: 1 });
  await run({
    name: 'same-title rerender before any input is freshly proven',
    replaceBeforeProbe: true,
    insertOn: 1,
    expectedClicks: 1,
    expectedSuccess: true,
  });
  await run({ name: 'dispatch failure retains after diagnostic', dispatchFailure: true, expectedClicks: 0 });
  for (const beforeCapture of ['move', 'replace'] as const) {
    await run({
      name: `capture race ${beforeCapture} refreshes before input`,
      beforeCapture,
      insertOn: 1,
      expectedClicks: 1,
      expectedSuccess: true,
    });
  }
  for (const beforeCapture of ['perpetual-move', 'ambiguous', 'wrong-title', 'hide', 'disable', 'obscure', 'expire'] as const) {
    await run({ name: `capture race ${beforeCapture}: no dispatch`, beforeCapture, expectedClicks: 0 });
  }
  await run({ name: 'retry capture consumes original budget', expireOnRetry: true, expectedClicks: 1 });
  await run({
    name: 'screenshot cannot renew insertion budget within a longer scenario',
    scenarioExtraBudget: true,
    beforeCapture: 'expire',
    expectedClicks: 0,
  });
}

async function testDiscoveryVisibleOperationCard(): Promise<void> {
  for (const kind of ['search', 'recommendation', 'search-testid'] as const) {
    const dom = new JSDOM(
      `<html><body><div class="msla-panel-root-Discovery">
    ${operationCardFixture(kind, true)}
    </div></body></html>`,
      { runScripts: 'outside-only' }
    );
    const window = dom.window as any;
    const card = window.document.querySelector('[aria-label="Initialize variables"]');
    window.document.elementFromPoint = () => card;
    Object.defineProperty(window.HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value(this: { tagName: string }) {
        return this === card
          ? { left: 20, top: 20, right: 120, bottom: 60, width: 100, height: 40 }
          : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
      },
    });
    Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{}] });
    const actions = new ProvenDesignerCdpActions(
      {
        evaluate: async <T>(_id: number | undefined, expression: string) => window.eval(expression) as T,
        send: async () => undefined,
      },
      1,
      Date.now() + 1000
    ) as any;
    try {
      assert.strictEqual(
        (await actions.readActionInsertionSnapshot()).discoveryVisible,
        true,
        'A visible product operation card proves discovery even when wrappers have no box'
      );
      card.style.display = 'none';
      assert.strictEqual(
        (await actions.readActionInsertionSnapshot()).discoveryVisible,
        false,
        'Hidden result cards must not keep discovery visible'
      );
    } finally {
      dom.window.close();
    }
  }
}

function testOperationCardVisibility(): void {
  const dom = new JSDOM(
    '<html><body><div style="visibility:hidden"><button style="visibility:visible">Initialize variables</button></div></body></html>',
    { runScripts: 'outside-only' }
  );
  const window = dom.window as any;
  const card = window.document.querySelector('button');
  card.getBoundingClientRect = () => ({ left: 20, top: 20, width: 100, height: 40 });
  card.getClientRects = () => [{}];
  const isVisible = () =>
    window.eval(`(() => { ${getStringConstant('operationCardVisibilityDom')}
    return operationCardVisible(document.querySelector('button')); })()`);
  try {
    assert.strictEqual(isVisible(), true, 'An explicitly visible card can override inherited ancestor visibility');
    card.parentElement.style.opacity = '0';
    assert.strictEqual(isVisible(), false, 'Ancestor transparency cannot be overridden by the card');
    card.parentElement.style.opacity = '1';
    card.style.visibility = 'hidden';
    assert.strictEqual(isVisible(), false, 'A hidden card must not be selected');
  } finally {
    dom.window.close();
  }
}

async function testSettingsTabPaths(): Promise<void> {
  const createActions = () =>
    new ProvenDesignerCdpActions({ evaluate: async () => undefined as never, send: async () => undefined }, 1, Date.now() + 10_000) as any;

  const direct = createActions();
  const directClicks: unknown[] = [];
  direct.assertExactPanelOwnership = async () => undefined;
  direct.waitForSettingsTabTarget = async () => ({ kind: 'direct', point: { x: 1, y: 2 } });
  direct.dispatchTrustedPoint = async (point: unknown) => directClicks.push(point);
  direct.waitForCondition = async () => undefined;
  await direct.openSettingsTab('Compose');
  assert.deepStrictEqual(directClicks, [{ x: 1, y: 2 }], 'Visible Settings tab path must dispatch one trusted click');

  const overflow = createActions();
  const overflowClicks: unknown[] = [];
  let conditions = 0;
  overflow.assertExactPanelOwnership = async () => undefined;
  overflow.waitForSettingsTabTarget = async () => ({ kind: 'overflow', point: { x: 3, y: 4 } });
  overflow.waitForPoint = async () => ({ x: 5, y: 6 });
  overflow.dispatchTrustedPoint = async (point: unknown) => overflowClicks.push(point);
  overflow.waitForCondition = async () => {
    conditions++;
  };
  await overflow.openSettingsTab('Compose_1');
  assert.deepStrictEqual(
    overflowClicks,
    [
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ],
    'Overflow Settings path must click the panel trigger before the portal menu item'
  );
  assert.strictEqual(conditions, 2, 'Overflow Settings path must verify the expanded menu and selected tab');

  const selected = createActions();
  let selectedClicks = 0;
  selected.assertExactPanelOwnership = async () => undefined;
  selected.waitForSettingsTabTarget = async () => ({ kind: 'selected' });
  selected.dispatchTrustedPoint = async () => {
    selectedClicks++;
  };
  await selected.openSettingsTab('Compose_1');
  assert.strictEqual(selectedClicks, 0, 'Already-selected Settings tab must not receive another click');

  const ambiguous = new ProvenDesignerCdpActions(
    {
      evaluate: async () =>
        ({
          directSettingsCount: 0,
          overflowTriggerCount: 2,
        }) as never,
      send: async () => undefined,
    },
    1,
    Date.now() + 20
  ) as any;
  await assert.rejects(() => ambiguous.waitForSettingsTabTarget('Compose_1', Date.now() + 20), /overflowTriggerCount.*2/);
}

function testProvenAdapterUsesUnmodifiedMsnHelper(): void {
  const adapter = getClass('ProvenDesignerCdpActions').getText(actionsSource);
  assert.ok(
    adapter.includes('new MsnDesignerCdpActions(guardedCdp, contextId)'),
    'Proven adapter must delegate directly through the cancellation-only CDP guard'
  );
  assert.ok(
    adapter.includes('return cdp.evaluate<T>(guardedContextId, expression, options)') &&
      adapter.includes('return cdp.send(method, params, options)'),
    'Cancellation guard must preserve the original MSN CDP request options'
  );
  for (const forbiddenRewrite of ['boundedCdp', 'waitForProvenCondition', ').waitUntil =', 'Math.min(options?.timeoutMs']) {
    assert.ok(!adapter.includes(forbiddenRewrite), `Proven adapter must not rewrite MSN behavior with ${forbiddenRewrite}`);
  }
}

function testProvenAdapterCompatibility(): void {
  const addRequestTrigger = getMethod('ProvenDesignerCdpActions', 'addRequestTrigger');
  for (const selector of [
    '[data-testid="card-Add a trigger"]',
    '[data-testid="card-Add trigger"]',
    '[data-automation-id="card-Add_a_trigger"]',
    '[data-automation-id="card-Add_trigger"]',
    '[aria-label="Add a trigger"]',
    '[aria-label="Add trigger"]',
  ]) {
    assert.ok(addRequestTrigger.includes(selector), `Proven adapter must support ${selector}`);
  }
  assert.match(
    addRequestTrigger,
    /\{\s*requireTextMatch:\s*false\s*\}/,
    'Exact V2 Add-trigger selectors must not be rejected by the historical article-sensitive text filter'
  );
  assert.match(addRequestTrigger, /attempt <= 3/, 'Request discovery may retry only after an explicit no-panel acknowledgement');
  assert.match(addRequestTrigger, /waitForOptionalDiscoveryPanel\(20000\)/);
  const deleteNode = getMethod('ProvenDesignerCdpActions', 'deleteNode');
  assert.ok(deleteNode.includes("await this.key('Delete', 'Delete', 46)"), 'Node deletion must use the native Delete key');
  assert.ok(deleteNode.includes('\'[role="dialog"] button\''), 'Node deletion must bind confirmation to the visible modal');
  assert.ok(deleteNode.includes("=== 'Delete'"), 'Node deletion must require the exact Delete action');
  assert.ok(
    deleteNode.includes('const clickedNodeId = await this.proven.clickNode(matchingTitles[0])'),
    'Node deletion must retain the exact clicked node ID'
  );
  assert.ok(
    deleteNode.includes('document.getElementById(${JSON.stringify(clickedNodeId)}) === null'),
    'Node deletion must wait for the exact clicked node ID to disappear'
  );
  assert.ok(deleteNode.includes('settledObservations >= 3'), 'Node deletion must require bounded consecutive settled observations');
  assert.ok(
    deleteNode.includes('settleState.canvasVisible') &&
      deleteNode.includes('settleState.loaderCount === 0') &&
      deleteNode.includes('settleState.blockerCount === 0'),
    'Node deletion must require a visible unblocked canvas without loaders'
  );
  assert.ok(
    deleteNode.includes('settleState.remainingNodeIds.length > 0 || settleState.addTriggerCount > 0'),
    'Node deletion must require another workflow node or the Add-trigger empty state'
  );
  assert.ok(!deleteNode.includes('if (!(await this.hasNode(titles)))'), 'Node deletion must not poll substring-based node titles');
  assert.strictEqual(
    (deleteNode.match(/await this\.key\('Delete', 'Delete', 46\)/g) ?? []).length,
    1,
    'Canvas stabilization must never redispatch Delete'
  );
}

function testHelperConsumersDoNotRegisterCanonicalLifecycleSuite(): void {
  const registration = lifecycleWrapperSource.statements.find(
    (node): node is ts.IfStatement =>
      ts.isIfStatement(node) && node.thenStatement.getText(lifecycleWrapperSource).includes('registerWorkspaceLifecycleSuite()')
  );
  assert.ok(registration, 'Expected canonical workspace lifecycle registration guard');
  const condition = registration.expression.getText(lifecycleWrapperSource);
  assert.match(condition, /!process\.env\.LA_E2E_CLI_STATELESS_VARIABLES_MODE/);
  assert.match(condition, /!process\.env\.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE/);
  assert.match(condition, /!process\.env\.LA_E2E_CLI_RUN_AFTER_PERSISTENCE_MODE/);
}

function testRunAfterIdentityAndStatusContracts(): void {
  const addRequest = getMethod('ProvenDesignerCdpActions', 'addRequestTriggerAndGetIdentity');
  assert.match(addRequest, /await this\.addRequestTrigger\(hooks\)/, 'Request insertion must reuse the proven shared Request flow');
  assert.match(addRequest, /readActionInsertionSnapshot/, 'Request insertion must preserve responsive panel identities');
  assert.match(addRequest, /waitForStableSingleNewNodeIdentity/, 'Request insertion must return one stable new node identity');
  assert.doesNotMatch(addRequest, /selectOperationById|msla-op-search-result-request/);
  const requestFlow = getMethod('ProvenDesignerCdpActions', 'addRequestTrigger');
  assertOrdered(
    requestFlow,
    ['hooks.onDiscoveryOpen', "this.proven.search('Request')", "hooks.onSearchEntered?.('Request')", 'this.proven.selectOperation'],
    'Request insertion evidence hooks'
  );

  const addAction = getMethod('ProvenDesignerCdpActions', 'addActionAndGetIdentity');
  assert.match(addAction, /return this\.insertActionAndGetIdentity\(options, hooks\)/);
  assert.doesNotMatch(addAction, /selectOperationById|msla-op-search-result-|openActionDiscoveryAfterNode|afterNodeId/);
  const sharedAddAction = getMethod('ProvenDesignerCdpActions', 'addAction');
  assert.match(sharedAddAction, /await this\.insertActionAndGetIdentity/);
  const insertion = getMethod('ProvenDesignerCdpActions', 'insertActionAndGetIdentity');
  assertOrdered(
    insertion,
    [
      'this.proven.closePanel',
      'readActionInsertionSnapshot()',
      'this.proven.openActionDiscovery',
      'hooks.onDiscoveryOpen',
      'this.proven.search',
      'hooks.onSearchEntered',
      'this.proven.waitForSearchResults',
      'this.proven.selectOperation',
      'selectActionWithAcknowledgement',
    ],
    'Stable action insertion'
  );
  assert.strictEqual(
    (insertion.match(/this\.proven\.selectOperation/g) ?? []).length,
    1,
    'Insertion must select once; any retry must retain the exact original DOM card through the guarded dispatcher'
  );

  const setStatus = getMethod('ProvenDesignerCdpActions', 'setRunAfterStatus');
  assertOrdered(
    setStatus,
    ['readRunAfterState', 'clickRunAfterStatus', 'waitForRunAfterStatus', 'readRunAfterState'],
    'Single Run After status transition'
  );
  assert.strictEqual(
    (setStatus.match(/clickRunAfterStatus/g) ?? []).length,
    1,
    'One status transition must dispatch at most one checkbox click'
  );

  const exactNode = getMethod('ProvenDesignerCdpActions', 'clickNodeById');
  assert.match(exactNode, /exactVisibleElementById\('msla-node-' \+ nodeId\)/);
  assert.match(exactNode, /visiblePanels\.length === 1/);
  assert.match(exactNode, /visiblePanels\[0\]\.id === expectedId/);
  assert.match(exactNode, /elementFromPoint/);

  const nodeIdentity = getMethod('ProvenDesignerCdpActions', 'readNodeIdentity');
  assert.match(nodeIdentity, /exactVisibleElementById\('msla-node-' \+ nodeId\)/);
  assert.doesNotMatch(nodeIdentity, /readExactNodeIdentities/);

  const insertionSnapshot = getMethod('ProvenDesignerCdpActions', 'readActionInsertionSnapshot');
  assert.match(insertionSnapshot, /msla-node-details-panel-/);
  assert.match(insertionSnapshot, /filter\(visible\)/);
  assert.match(insertionSnapshot, /closest\('\.msla-panel-layout'\)/);
  assert.match(insertionSnapshot, /msla-panel-header/);
  assert.match(insertionSnapshot, /\[\.\.\.panelNodes, \.\.\.cardNodes\]/);

  const settings = getMethod('ProvenDesignerCdpActions', 'openSettingsTab');
  assert.match(actionsSourceText, /const exactVisibleElementById = \(id\)/);
  assert.doesNotMatch(settings, /document\.getElementById/);
  assert.match(settings, /waitForSettingsTabTarget/);
  assert.match(settings, /Math\.min\(this\.deadline, Date\.now\(\) \+ 90000\)/);
  assert.match(settings, /settingsDeadline/);
  assert.match(settings, /closest\('\.msla-panel-layout'\)/);
  assert.match(actionsSourceText, /const semanticSettingsTabs = \(root\)/);
  assert.match(settings, /semanticSettingsTabs\(panelLayout\)/);
  assert.match(actionsSourceText, /interactiveCandidates/);
  assert.match(settings, /\^\\\\d\+ more tabs\$/);
  assert.match(settings, /aria-controls/);
  assert.match(settings, /\[role="menuitem"\]/);
  assert.match(settings, /aria-disabled/);
  assert.match(settings, /elementFromPoint/);

  const predecessor = getMethod('ProvenDesignerCdpActions', 'expandRunAfterPredecessor');
  assert.match(predecessor, /readNodeIdentity\(predecessorNodeId\)/);
  assert.match(predecessor, /headers\.length !== 1/);
  assert.match(predecessor, /msla-run-after-node-title/);
  assert.match(predecessor, /while \(Date\.now\(\) < predecessorDeadline\)/);
  assert.match(predecessor, /lastState/);
  assert.match(predecessor, /state\.count === 1 && state\.point/);

  const readState = getMethod('ProvenDesignerCdpActions', 'readRunAfterState');
  for (const label of ['Is successful', 'Has timed out', 'Is skipped', 'Has failed']) {
    assert.ok(readState.includes(label), `Run After state must bind exact ${label} control`);
  }
  assert.match(actionsSourceText, /const runAfterCheckboxOwnerDom =/);
  assert.match(actionsSourceText, /Array\.from\(input\.labels \|\| \[\]\)\.filter\(visible\)/);
  assert.match(actionsSourceText, /const preferredLabel = input\.labels\?\.\[0\]/);
  assert.match(actionsSourceText, /if \(labels\.length > 1\) return null/);
  assert.match(actionsSourceText, /associatedLabel instanceof HTMLElement/);
  assert.match(actionsSourceText, /fallback instanceof HTMLElement && visible\(fallback\)/);
  assert.match(actionsSourceText, /const runAfterCheckboxPoint = \(input\)/);
  assert.match(readState, /\$\{runAfterCheckboxOwnerDom\}/);
  assert.match(readState, /const owner = runAfterCheckboxOwner\(input\)/);

  assert.match(readState, /controls\.filter\(\(control\) => control\.visible\)\.length, 4/);

  const clickStatus = getMethod('ProvenDesignerCdpActions', 'clickRunAfterStatus');
  assert.match(clickStatus, /\$\{runAfterCheckboxOwnerDom\}/);
  assert.match(clickStatus, /runAfterCheckboxPoint\(controls\[0\]\)/);
  assert.doesNotMatch(clickStatus, /input\.closest\('label'\) \|\| input/);

  const setStatuses = getMethod('ProvenDesignerCdpActions', 'setRunAfterStatuses');
  assertOrdered(setStatuses, ["['Failed', 'TimedOut', 'Skipped', 'Succeeded']", 'readRunAfterState', 'setRunAfterStatus'], 'Toggle order');
  assert.match(setStatuses, /const state = await this\.readRunAfterState/, 'Every toggle must reacquire state after React rerenders');
  assert.match(setStatuses, /finalState\.statuses\[status\]\.checked/);
  assert.match(setStatuses, /expected\.includes\(status\)/);
}

async function testRunAfterToggleOrderingAndRerenderReacquisition(): Promise<void> {
  const actions = new ProvenDesignerCdpActions(
    { evaluate: async () => undefined as never, send: async () => undefined },
    1,
    Date.now() + 10_000
  ) as any;
  const checked = { Succeeded: true, TimedOut: false, Skipped: false, Failed: false };
  let generation = 0;
  const clickGenerations: number[] = [];
  const clicked: string[] = [];
  actions.readRunAfterState = async () => {
    generation++;
    return {
      childNodeId: 'Compose_2',
      predecessorNodeId: 'Compose',
      predecessorTitle: 'Compose',
      expanded: true,
      statuses: Object.fromEntries(Object.entries(checked).map(([status, value]) => [status, { checked: value, disabled: false }])),
    };
  };
  actions.clickRunAfterStatus = async (_child: string, _predecessor: string, status: keyof typeof checked) => {
    clickGenerations.push(generation);
    clicked.push(status);
    checked[status] = !checked[status];
  };
  actions.waitForRunAfterStatus = async () => undefined;

  const state = await actions.setRunAfterStatuses('Compose_2', 'Compose', ['Failed']);
  assert.deepStrictEqual(clicked, ['Failed', 'Succeeded'], 'Failed must be selected before Succeeded is cleared');
  assert.ok(clickGenerations[1] > clickGenerations[0], 'Each toggle must use state reacquired after the prior React rerender');
  assert.strictEqual(state.statuses.Failed.checked, true);
  assert.strictEqual(state.statuses.Succeeded.checked, false);
}

async function testRunAfterRejectsDisabledAndWrongFinalState(): Promise<void> {
  const disabled = new ProvenDesignerCdpActions(
    { evaluate: async () => undefined as never, send: async () => undefined },
    1,
    Date.now() + 10_000
  ) as any;
  disabled.readRunAfterState = async () => ({
    childNodeId: 'Compose_2',
    predecessorNodeId: 'Compose',
    predecessorTitle: 'Compose',
    expanded: true,
    statuses: {
      Succeeded: { checked: true, disabled: false },
      TimedOut: { checked: false, disabled: false },
      Skipped: { checked: false, disabled: false },
      Failed: { checked: false, disabled: true },
    },
  });
  await assert.rejects(() => disabled.setRunAfterStatuses('Compose_2', 'Compose', ['Failed']), /disabled/);

  const wrongFinal = new ProvenDesignerCdpActions(
    { evaluate: async () => undefined as never, send: async () => undefined },
    1,
    Date.now() + 10_000
  ) as any;
  wrongFinal.readRunAfterState = async () => ({
    childNodeId: 'Compose_2',
    predecessorNodeId: 'Compose',
    predecessorTitle: 'Compose',
    expanded: true,
    statuses: {
      Succeeded: { checked: true, disabled: false },
      TimedOut: { checked: false, disabled: false },
      Skipped: { checked: false, disabled: false },
      Failed: { checked: false, disabled: false },
    },
  });
  wrongFinal.clickRunAfterStatus = async () => undefined;
  wrongFinal.waitForRunAfterStatus = async () => undefined;
  await assert.rejects(
    () => wrongFinal.setRunAfterStatuses('Compose_2', 'Compose', ['Failed']),
    /Run after Failed did not reach the required state/
  );
}

function testRunAfterCheckboxOwnerDom(): void {
  const dom = new JSDOM(
    `<html><body>
      <span id="failed-root" data-visible="true">
        <input id="failed" type="checkbox" />
        <span aria-hidden="true"></span>
        <label id="failed-label" for="failed" data-visible="true"><span id="failed-text">Has failed</span></label>
      </span>
      <span id="fallback-root" data-visible="true"><input id="fallback" type="checkbox" /></span>
      <span id="hidden-root"><input id="hidden-fallback" type="checkbox" /></span>
      <span id="ambiguous-root" data-visible="true">
        <input id="ambiguous" type="checkbox" />
        <label id="ambiguous-label-a" for="ambiguous" data-visible="true">Has failed</label>
        <label id="ambiguous-label-b" for="ambiguous" data-visible="true">Has failed</label>
      </span>
    </body></html>`,
    { runScripts: 'outside-only' }
  );
  const { document, HTMLElement } = dom.window;
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  });
  const rect = { left: 10, top: 20, right: 110, bottom: 40, width: 100, height: 20, x: 10, y: 20, toJSON: () => ({}) };
  for (const id of ['failed-label', 'fallback-root']) {
    Object.defineProperty(document.getElementById(id), 'getBoundingClientRect', {
      configurable: true,
      value: () => rect,
    });
  }
  let hitTarget = document.getElementById('failed-text');
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => hitTarget,
  });

  const helper = getStringConstant('runAfterCheckboxOwnerDom');
  const evaluate = (inputId: string) =>
    JSON.parse(
      JSON.stringify(
        dom.window.eval(`(() => {
      const visible = (element) => element instanceof HTMLElement && element.getAttribute('data-visible') === 'true';
      ${helper}
      const input = document.getElementById(${JSON.stringify(inputId)});
      const owner = runAfterCheckboxOwner(input);
      return {
        ownerId: owner?.id || null,
        point: runAfterCheckboxPoint(input),
      };
    })()`)
      )
    ) as { ownerId: string | null; point: { x: number; y: number } | null };

  assert.deepStrictEqual(
    evaluate('failed'),
    { ownerId: 'failed-label', point: { x: 60, y: 30 } },
    'Fluent sibling checkbox labels must own semantic matching and trusted point geometry'
  );

  hitTarget = document.getElementById('fallback-root');
  assert.deepStrictEqual(
    evaluate('fallback'),
    { ownerId: 'fallback-root', point: { x: 60, y: 30 } },
    'A visible parent may remain the compatibility fallback when no visible associated label exists'
  );
  assert.deepStrictEqual(evaluate('hidden-fallback'), { ownerId: null, point: null });
  assert.deepStrictEqual(evaluate('ambiguous'), { ownerId: null, point: null }, 'Multiple visible associated labels must fail closed');

  const failed = document.getElementById('failed') as { disabled: boolean };
  failed.disabled = true;
  hitTarget = document.getElementById('failed-label');
  assert.deepStrictEqual(
    evaluate('failed'),
    { ownerId: 'failed-label', point: null },
    'Disabled checkbox inputs must not produce a trusted click point'
  );
  dom.window.close();
}

function testActionProfileResolution(): void {
  assert.strictEqual(resolveDesignerActionProfile(undefined, false), 'generalized');
  assert.strictEqual(resolveDesignerActionProfile(undefined, true), 'msn');
  assert.strictEqual(resolveDesignerActionProfile('msn', false), 'msn');
  assert.strictEqual(resolveDesignerActionProfile('generalized', true), 'generalized');
}

function getClass(name: string): ts.ClassDeclaration {
  const declaration = actionsSource.statements.find(
    (node): node is ts.ClassDeclaration => ts.isClassDeclaration(node) && node.name?.text === name
  );
  assert.ok(declaration, `Expected class ${name}`);
  return declaration;
}

function getMethod(className: string, methodName: string): string {
  const declaration = getClass(className);
  const method = declaration.members.find(
    (member): member is ts.MethodDeclaration =>
      ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === methodName
  );
  assert.ok(method, `Expected ${className}.${methodName}`);
  return method.getText(actionsSource);
}

function getStringConstant(name: string): string {
  for (const statement of actionsSource.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        declaration.initializer &&
        ts.isNoSubstitutionTemplateLiteral(declaration.initializer)
      ) {
        return declaration.initializer.text;
      }
    }
  }
  assert.fail(`Expected string constant ${name}`);
}

function getFunction(name: string): string {
  const declaration = lifecycleSource.statements.find(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name
  );
  assert.ok(declaration, `Expected function ${name}`);
  return declaration.getText(lifecycleSource);
}

function assertOrdered(source: string, values: string[], description: string): void {
  let previous = -1;
  for (const value of values) {
    const index = source.indexOf(value, previous + 1);
    assert.ok(index >= 0, `${description}: missing ${value}`);
    assert.ok(index > previous, `${description}: ${value} must follow the previous value`);
    previous = index;
  }
}

function testGeneralizedHelperIsIsolated(): void {
  const marker = actionsSourceText.indexOf('export interface MsnDesignerClickResult');
  assert.ok(marker > 0, 'Expected MSN parity class marker');
  const generalizedSource = actionsSourceText.slice(0, marker).replaceAll('\r\n', '\n').trimEnd();
  assert.strictEqual(
    createHash('sha256').update(generalizedSource).digest('hex'),
    generalizedHelperSha256,
    'Generalized DesignerCdpActions must remain byte-for-byte isolated from MSN parity restoration'
  );
}

function testRecursiveDesignerTextCollection(): void {
  for (const methodName of ['getText', 'waitForText']) {
    const source = getMethod('MsnDesignerCdpActions', methodName);
    assert.match(source, /document\.createTreeWalker\(root, NodeFilter\.SHOW_ELEMENT \| NodeFilter\.SHOW_TEXT\)/);
    assert.match(source, /node\.shadowRoot[\s\S]*collectText\(node\.shadowRoot\)/);
    assert.match(source, /node instanceof HTMLIFrameElement && node\.contentDocument[\s\S]*collectText\(node\.contentDocument\)/);
    assert.match(source, /HTMLScriptElement \|\| node instanceof HTMLStyleElement/);
  }
}

function testRenderedVisibilityAndDiagnosticOnlyHitTarget(): void {
  const source = getMethod('MsnDesignerCdpActions', 'clickElement');
  assert.match(
    source,
    /const isVisible = \(element\) => !!\(element && \(element\.offsetWidth \|\| element\.offsetHeight \|\| element\.getClientRects\(\)\.length\)\)/
  );
  assert.match(source, /text\.includes\(textToFind\) \|\| ariaLabel\.includes\(textToFind\) \|\| title\.includes\(textToFind\)/);
  assert.match(source, /const hitTarget = document\.elementFromPoint\(point\.x, point\.y\)/);
  assert.match(source, /ok: true,[\s\S]*point,[\s\S]*hitTarget: describeElement\(hitTarget\)/);
  assert.doesNotMatch(source, /hitTarget[\s\S]{0,120}return \{ ok: false/);
}

function testDiscoveryAndSearchParity(): void {
  const discovery = getMethod('MsnDesignerCdpActions', 'hasDiscoveryPanel');
  assertOrdered(
    discovery,
    ['.msla-panel-root-Discovery', '[data-automation-id="msla-search-box"]', '.msla-search-box'],
    'Discovery selector order'
  );

  const search = getMethod('MsnDesignerCdpActions', 'search');
  assertOrdered(
    search,
    [
      '[data-automation-id="msla-search-box"] input',
      '[data-automation-id="msla-search-box"]',
      '.msla-search-box input',
      '.msla-search-box',
      'input[placeholder*="Search"]',
      'input[type="text"]',
    ],
    'Search selector order'
  );
  assertOrdered(
    search,
    [
      "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set",
      'setter?.call(input, searchTerm)',
      "new InputEvent('input', { bubbles: true, inputType: 'insertText', data: searchTerm })",
      "new Event('change', { bubbles: true })",
    ],
    'Search native setter and event order'
  );
}

function testSearchResultsAndOperationParity(): void {
  const expectedResultSelectors = [
    '[data-automation-id^="msla-op-search-result-"]',
    '[data-testid^="msla-op-search-result-"]',
    '.msla-op-search-card-container',
    '.msla-op-search-card',
    '.msla-recommendation-panel-card',
    '[role="option"]',
  ];
  assertOrdered(getMethod('MsnDesignerCdpActions', 'waitForSearchResults'), expectedResultSelectors, 'Search-result selector order');

  const waitUntil = getMethod('MsnDesignerCdpActions', 'waitUntil');
  assert.match(waitUntil, /setTimeout\(resolve, 500\)/);

  const operation = getMethod('MsnDesignerCdpActions', 'selectOperation');
  assertOrdered(
    operation,
    [...expectedResultSelectors, '[class*="connector"] [role="button"]', '[class*="connector"] button'],
    'Operation selector order'
  );
  assertOrdered(
    getStringConstant('operationCardIdentityDom'),
    [...expectedResultSelectors, '[class*="connector"] [role="button"]', '[class*="connector"] button'],
    'Readiness must accept every selector family that can retain an operation card'
  );
  assert.match(operation, /dispatch \? operationCardIdentityDom/);
  assert.match(operation, /operationCardTitle\(card\)/);
  assertOrdered(
    operation,
    [
      'const exactCard = cards.find',
      'if (exactCard)',
      'for (const card of cards)',
      "if (combined === 'all' || combined.startsWith('all '))",
      "exactOperationName === 'get current weather'",
      'variants.some((variant) => combined.includes(variant))',
    ],
    'Operation matching order'
  );
  assert.match(operation, /cards\.slice\(0, 12\)/);
  assert.match(operation, /card\.disabled \|\| card\.getAttribute\('aria-disabled'\) === 'true'/);
  assert.match(operation, /const hit = document\.elementFromPoint\(point\.x, point\.y\)/);
  assert.match(operation, /hit === card \|\| card\.contains\(hit\)/);
  assert.match(operation, /Exact operation card is not enabled and hit-testable/);
  assert.match(operation, /reason: 'Operation card not found'/);
  assert.match(operation, /for \(let attempt = 0; attempt < 20; attempt\+\+\)/);
  assert.match(operation, /setTimeout\(resolve, 300\)/);

  const scroll = getMethod('MsnDesignerCdpActions', 'scrollSearchResults');
  assert.match(scroll, /container\.scrollTop \+= 650/);
  assert.match(scroll, /window\.scrollBy\(0, 650\)/);
}

function testActionMenuParity(): void {
  const source = getMethod('MsnDesignerCdpActions', 'openActionDiscovery');
  assert.match(source, /for \(let attempt = 1; attempt <= 3; attempt\+\+\)/);
  assertOrdered(
    source,
    [
      '[data-automation-id^="msla-plus-button-"]',
      '[id^="msla-edge-button-"]',
      '[data-testid="card-Add an action"]',
      '[data-automation-id="card-Add_an_action"]',
      '[aria-label="Add an action"]',
      'await this.waitForOptionalDiscoveryPanel(7500)',
      '[data-automation-id^="msla-add-button-"]',
      '[role="menuitem"]',
      'await this.waitForOptionalDiscoveryPanel(7500)',
      'await this.waitForDiscoveryPanel(60000',
    ],
    'Action-menu flow'
  );
  assert.match(source, /requireTextMatch: false, useLastMatch: true/);
  assert.match(source, /after Add Action failed attempt/);
}

function testNodeAndPanelParity(): void {
  const node = getMethod('MsnDesignerCdpActions', 'clickNode');
  assertOrdered(
    node,
    [
      "const exactId = 'msla-node-'",
      'const exactNode = document.getElementById(exactId)',
      'exactNode instanceof HTMLElement && isVisible(exactNode)',
      'document.querySelectorAll(\'.react-flow__node, [id^="msla-node-"]\')',
    ],
    'Node ID preference'
  );
  assert.match(node, /async clickNode\(title: string\): Promise<string>/);
  assert.match(node, /id: element\.id/);
  assert.match(node, /return result\.id/);

  const panel = getMethod('MsnDesignerCdpActions', 'closePanel');
  assert.match(panel, /document\.querySelectorAll\('\.msla-panel-container'\)/);
  assert.match(panel, /const panel = panels\.at\(-1\)\?\.panel/);
  assert.match(panel, /panel\.querySelectorAll\('\[data-automation-id="msla-panel-header-close-nav"\], button\[aria-label="Close"\]'\)/);
  assert.match(panel, /this\.waitUntil\(async \(\) => !\(await this\.hasDetailsPanel\(\)\), 15000/);
  assert.match(panel, /setTimeout\(resolve, 750\)/);
}

async function testExactNodeIdentity(): Promise<void> {
  class FakeHTMLElement {
    readonly offsetWidth = 100;
    readonly offsetHeight = 50;

    constructor(
      readonly id: string,
      readonly textContent: string
    ) {}

    getClientRects(): object[] {
      return [{}];
    }

    scrollIntoView(): void {}

    getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
      return { left: 10, top: 20, width: 100, height: 50 };
    }

    getAttribute(): null {
      return null;
    }
  }

  const httpAction = new FakeHTMLElement('msla-node-HTTP', 'HTTP');
  const requestTrigger = new FakeHTMLElement('msla-node-Request', 'When an HTTP request is received');
  const document = {
    body: { innerText: 'HTTP When an HTTP request is received' },
    getElementById: (id: string) => (id === httpAction.id ? httpAction : id === requestTrigger.id ? requestTrigger : null),
    querySelectorAll: () => [httpAction, requestTrigger],
  };
  const actions = new MsnDesignerCdpActions(
    {
      evaluate: async <T>(_contextId: number | undefined, expression: string) =>
        runInNewContext(expression, { document, HTMLElement: FakeHTMLElement }) as T,
      send: async () => undefined,
    },
    7
  );

  assert.strictEqual(await actions.clickNode('HTTP'), httpAction.id);
}

async function testExactPanelRebinding(): Promise<void> {
  const identity = { nodeId: 'Initialize_variables', title: 'Initialize variables' };
  let trustedClicks = 0;
  const existingPanel = new ProvenDesignerCdpActions(
    {
      evaluate: async <T>(_contextId: number | undefined, expression: string) => {
        assert.ok(expression.includes('[id^="msla-node-details-panel-"]'));
        return [identity] as T;
      },
      send: async () => {
        trustedClicks++;
      },
    },
    7,
    Date.now() + 5000
  );
  assert.deepStrictEqual(await existingPanel.ensureNodePanelOpen(identity), identity);
  assert.strictEqual(trustedClicks, 0, 'An already-open exact owned panel must not replay the card click');

  const wrongPanel = new ProvenDesignerCdpActions(
    {
      evaluate: async <T>() => [{ nodeId: 'Response', title: 'Response' }] as T,
      send: async () => undefined,
    },
    7,
    Date.now() + 5000
  );
  await assert.rejects(() => wrongPanel.ensureNodePanelOpen(identity), /Expected one visible details panel owned by Initialize_variables/);

  let panelRead = false;
  let cardClicks = 0;
  const cardFallback = new ProvenDesignerCdpActions(
    {
      evaluate: async <T>(_contextId: number | undefined, expression: string) => {
        if (expression.includes('return Array.from(document.querySelectorAll(\'[id^="msla-node-details-panel-"]\'))')) {
          panelRead = true;
          return [] as T;
        }
        if (expression.includes("const element = exactVisibleElementById('msla-node-' + nodeId)")) {
          if (expression.includes('return {')) {
            return identity as T;
          }
          return { x: 25, y: 30 } as T;
        }
        if (expression.includes('const expectedId = "msla-node-details-panel-Initialize_variables"')) {
          return true as T;
        }
        throw new Error(`Unexpected CDP expression: ${expression.slice(0, 200)}`);
      },
      send: async (method) => {
        if (method === 'Input.dispatchMouseEvent') {
          cardClicks++;
        }
      },
    },
    7,
    Date.now() + 5000
  );
  assert.deepStrictEqual(await cardFallback.ensureNodePanelOpen(identity), identity);
  assert.strictEqual(panelRead, true);
  assert.strictEqual(cardClicks, 3, 'No visible panel must fall back to one trusted moved/pressed/released card click');
}

async function testDeleteWaitsForExactClickedNode(): Promise<void> {
  let substringPresenceChecks = 0;
  let exactDisappearanceChecks = 0;
  let settleChecks = 0;
  let deleteKeyDispatches = 0;
  const actions = new ProvenDesignerCdpActions(
    {
      evaluate: async <T>(_contextId: number | undefined, expression: string) => {
        if (expression.includes('[id^="msla-node-details-panel"]')) {
          return false as T;
        }
        if (expression.includes('const titles = ["http"]')) {
          substringPresenceChecks++;
          return true as T;
        }
        if (expression.includes('const title = "http"')) {
          return {
            ok: true,
            id: 'msla-node-HTTP',
            point: { x: 10, y: 20 },
            text: 'HTTP',
          } as T;
        }
        if (expression.includes('document.getElementById("msla-node-HTTP") === null')) {
          exactDisappearanceChecks++;
          return true as T;
        }
        if (expression.includes('const canvasVisible = visibleElements')) {
          settleChecks++;
          return {
            canvasVisible: settleChecks > 1,
            loaderCount: 0,
            blockerCount: 0,
            remainingNodeIds: settleChecks > 1 ? ['msla-node-Request'] : [],
            addTriggerCount: 0,
          } as T;
        }
        if (expression.includes('const dialogs = Array.from')) {
          return { dialogCount: 0, deleteButtonCount: 0 } as T;
        }
        throw new Error(`Unexpected CDP expression: ${expression.slice(0, 200)}`);
      },
      send: async (method) => {
        if (method === 'Input.dispatchKeyEvent') {
          deleteKeyDispatches++;
        }
      },
    },
    7,
    Date.now() + 5000
  );

  await actions.deleteNode(['HTTP']);
  assert.strictEqual(
    substringPresenceChecks,
    1,
    'The remaining "When an HTTP request is received" trigger must not keep exact HTTP action deletion pending'
  );
  assert.strictEqual(exactDisappearanceChecks, 4);
  assert.strictEqual(settleChecks, 4, 'Transient full-canvas absence must not complete deletion');
  assert.strictEqual(deleteKeyDispatches, 2, 'One native Delete key press consists of exactly keyDown and keyUp');
}

function testParameterAndSaveParity(): void {
  const parameter = getMethod('MsnDesignerCdpActions', 'fillParameter');
  assert.match(parameter, /reason: 'Parameter editor not found'/);
  assert.match(parameter, /candidates: editables\(\)\.slice\(0, 20\)/);
  assert.match(parameter, /text: document\.body\?\.innerText \|\| ''/);
  assert.match(parameter, /Expected \$\{description\} parameter editor/);

  const save = getMethod('MsnDesignerCdpActions', 'save');
  assert.match(save, /this\.clickElement\(\['button\[aria-label="Save"\]'\], 'Save'\)/);
  assert.match(save, /document\.querySelector\('button\[aria-label="Save"\]'\)/);
  assert.match(save, /!text\.includes\('saving'\) && !label\.includes\('saving'\)/);
  assert.match(save, /60000/);
  assert.match(save, /document\.querySelector\('button\[aria-label\*="Sav"\]'\)/);
  assert.match(save, /visibleErrorText/);
  assert.match(save, /designer save did not complete/);

  const provenSave = getMethod('ProvenDesignerCdpActions', 'save');
  assert.match(provenSave, /this\.dispatchSemanticSave\(\)/);
  assert.match(provenSave, /state\.busy \|\| state\.disabled/);
  assert.match(provenSave, /!state\.busy/);
  assert.doesNotMatch(provenSave, /this\.proven\.save/);

  const dispatchSave = getMethod('ProvenDesignerCdpActions', 'dispatchSemanticSave');
  assert.match(dispatchSave, /\$\{provenSaveButtonDom\}/);
  assert.match(dispatchSave, /provenSaveButtonPoint\(\)/);
  assert.match(dispatchSave, /this\.dispatchTrustedPoint\(point\)/);

  const externalOracleSave = getMethod('ProvenDesignerCdpActions', 'saveWithExternalOracle');
  assert.match(externalOracleSave, /this\.dispatchSemanticSave\(\)/);
  assert.doesNotMatch(externalOracleSave, /this\.save\(\)/);
  assert.doesNotMatch(externalOracleSave, /this\.waitForCondition\(/);
  assert.doesNotMatch(externalOracleSave, /Designer Save acknowledgement|Designer Save completion/);

  const persistedReady = getMethod('ProvenDesignerCdpActions', 'waitForPersistedDesignerReady');
  assert.match(persistedReady, /provenSaveButtonState\(\)/);
  assert.match(persistedReady, /!save\.busy/);
  assert.match(persistedReady, /stableObservations >= 3/);
  assert.match(persistedReady, /catch \(error\)/);
  assert.match(persistedReady, /stableObservations = 0/);
  assert.doesNotMatch(persistedReady, /exactVisibleElementById/);
  assert.doesNotMatch(persistedReady, /waitForText/);
}

function testProvenSaveButtonDom(): void {
  const helper = getStringConstant('provenSaveButtonDom');
  const evaluate = (body: string, hitTargetId: string) => {
    const dom = new JSDOM(`<html><body>${body}</body></html>`, { runScripts: 'outside-only' });
    const { document, HTMLElement } = dom.window;
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => undefined,
    });
    const rect = { left: 20, top: 30, right: 120, bottom: 60, width: 100, height: 30, x: 20, y: 30, toJSON: () => ({}) };
    for (const button of Array.from(document.querySelectorAll('button'))) {
      Object.defineProperty(button, 'getBoundingClientRect', {
        configurable: true,
        value: () => rect,
      });
    }
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => document.getElementById(hitTargetId),
    });
    const result = JSON.parse(
      JSON.stringify(
        dom.window.eval(`(() => {
          const visible = (element) => element instanceof HTMLElement && element.getAttribute('data-visible') === 'true';
          const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
          ${helper}
          const state = provenSaveButtonState();
          return {
            state: state ? {
              ariaName: state.ariaName,
              textName: state.textName,
              disabled: state.disabled,
              busy: state.busy,
            } : null,
            point: provenSaveButtonPoint(),
          };
        })()`)
      )
    ) as {
      state: { ariaName: string; textName: string; disabled: boolean; busy: boolean } | null;
      point: Point | null;
    };
    dom.window.close();
    return result;
  };

  assert.deepStrictEqual(
    evaluate(
      '<div role="toolbar"><button id="v2-save" data-visible="true"><span id="v2-save-text">Save</span></button></div>',
      'v2-save-text'
    ),
    {
      state: { ariaName: '', textName: 'save', disabled: false, busy: false },
      point: { x: 70, y: 45 },
    },
    'Designer V2 Save must resolve from exact visible toolbar text without requiring aria-label'
  );
  assert.deepStrictEqual(
    evaluate('<button id="v1-save" aria-label="Save" data-visible="true"><span id="v1-save-text">Save</span></button>', 'v1-save-text'),
    {
      state: { ariaName: 'save', textName: 'save', disabled: false, busy: false },
      point: { x: 70, y: 45 },
    },
    'The Proven resolver must retain compatibility with the historical aria-labeled Save button'
  );
  assert.deepStrictEqual(
    evaluate(
      '<div role="toolbar"><button id="saving" data-visible="true" disabled><span id="saving-text">Saving</span></button></div>',
      'saving-text'
    ),
    {
      state: { ariaName: '', textName: 'saving', disabled: true, busy: true },
      point: null,
    },
    'Saving controls must acknowledge progress but never produce another click point'
  );
  assert.deepStrictEqual(
    evaluate(
      '<div role="toolbar"><button id="save-a" data-visible="true">Save</button><button id="save-b" data-visible="true">Save</button></div>',
      'save-a'
    ),
    { state: null, point: null },
    'Ambiguous visible Save controls must fail closed'
  );
}

async function testReplacementKeySequence(): Promise<void> {
  const calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  const actions = new MsnDesignerCdpActions(
    {
      evaluate: async () => undefined as never,
      send: async (method, params) => {
        calls.push({ method, params });
        return undefined;
      },
    },
    7
  );

  await actions.replaceFocused('98058');
  assert.deepStrictEqual(
    calls.map(({ method, params }) => [method, params?.type, params?.code, params?.text]),
    [
      ['Input.dispatchKeyEvent', 'keyDown', 'ControlLeft', undefined],
      ['Input.dispatchKeyEvent', 'keyDown', 'KeyA', undefined],
      ['Input.dispatchKeyEvent', 'keyUp', 'KeyA', undefined],
      ['Input.dispatchKeyEvent', 'keyUp', 'ControlLeft', undefined],
      ['Input.dispatchKeyEvent', 'keyDown', 'Backspace', undefined],
      ['Input.dispatchKeyEvent', 'keyUp', 'Backspace', undefined],
      ['Input.insertText', undefined, undefined, '98058'],
    ]
  );
  assert.strictEqual(calls[1].params?.modifiers, 2);
  assert.strictEqual(calls[2].params?.modifiers, 2);
}

function testWorkspaceLifecycleWrapperParity(): void {
  const openDesigner = getFunction('openDesignerAndCreateWorkflow');
  assert.match(openDesigner, /resolveDesignerActionProfile\(options\.actionProfile, options\.includeMsnWeather === true\)/);
  assert.match(openDesigner, /getMsnDesignerActions\(designerCdp, contextId\)\.waitForText/);
  assert.match(openDesigner, /getMsnDesignerActions\(designerCdp, contextId\)\.getText\(\)/);
  const msnLifecycle = getFunction('runMsnWeatherLifecycle');
  assert.match(
    msnLifecycle,
    /warmOnly: true,[\s\S]*useAzureConnectors: true,[\s\S]*actionProfile: 'msn'/,
    'MSN warmup must explicitly use the historical action profile'
  );

  const request = getFunction('addRequestTriggerThroughDesigner');
  assertOrdered(
    request,
    [
      'trigger-panel-before-evidence',
      'trigger-panel-open',
      'request-search-entered',
      'waitForSearchResults(60000',
      "selectOperation('Request'",
      'waitForText(requestTriggerTitleVariants, 90000',
      'closePanel(`${label} Request trigger panel`)',
      'request-trigger-added',
    ],
    'Request wrapper checkpoints'
  );

  const response = getFunction('addResponseActionThroughDesigner');
  assertOrdered(
    response,
    [
      'openActionDiscoveryPanelThroughDesigner',
      'response-search-entered',
      'waitForSearchResults(60000',
      'selectOperation(responseActionTitle',
      'waitForText([responseActionTitle], 90000',
      'closePanel(`${label} Response action panel before action-added evidence`)',
      'waitForText([responseActionTitle], 30000',
      'response-action-added',
    ],
    'Response wrapper checkpoints'
  );

  const actionPanel = getFunction('openActionDiscoveryPanelThroughDesigner');
  assert.match(actionPanel, /actions\.openActionDiscovery/);
  assert.match(actionPanel, /action-panel-open/);

  const weather = getFunction('addMsnWeatherActionThroughDesigner');
  assert.match(weather, /msn-weather-search-entered/);
  assert.match(weather, /msn-weather-action-added/);
  assert.match(weather, /msn-weather-action-configured/);
  assert.match(weather, /'msn'/);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
