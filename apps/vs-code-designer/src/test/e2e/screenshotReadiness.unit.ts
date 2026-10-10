import * as assert from 'assert';
import * as vm from 'vm';
import {
  buildScreenshotMetadata,
  buildScreenshotReadinessExpression,
  installScreenshotInvalidationLatchExpression,
  isStableScreenshotSample,
  type ScreenshotExpectation,
  type ScreenshotReadinessSnapshot,
} from './screenshotReadiness';

const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string, options?: Record<string, unknown>) => { window: Window & typeof globalThis };
};

async function main(): Promise<void> {
  testBlankWorkbenchRejected();
  testEmptyWorkbenchShellAccepted();
  testSelectedMonitoringPanelRejectsWrongAction();
  testSelectedMonitoringPanelRejectsPrefixTitle();
  testSelectedMonitoringPanelAcceptsMatchingActionValues();
  testMonitoringPanelRequiresExpectedValues();
  testMonitoringPanelRejectsPropertiesOnlyWhileInputsLoading();
  testDesignerCanvasAcceptsRequiredNodeAliases();
  testDesignerCanvasRejectsHiddenConcreteRequiredNode();
  testDesignerCanvasRejectsOffscreenConcreteRequiredNode();
  testDesignerCanvasRejectsRequiredTextOutsideCanvasNode();
  testDesignerCanvasRejectsCoveredConcreteRequiredNode();
  testDesignerCanvasRejectsAncestorClippedConcreteRequiredNode();
  testDesignerCanvasAcceptsShiftedCanvasRootWhenRequiredCardIsVisible();
  testDesignerCanvasRejectsPartiallyClippedRequiredNode();
  testDesignerCanvasRejectsClippedRequiredTitle();
  testDesignerCanvasRejectsVisibleCardWithOffscreenTitleInRealDom();
  testDesignerCanvasRejectsHiddenRequiredTitleInRealDom();
  testDesignerCanvasRejectsObservedNarrowViewportRequiredCardClipping();
  testDesignerCanvasRejectsNonCanvasSubstituteNode();
  testDesignerCanvasRejectsOffCenterLoaderOverRequiredNode();
  testDesignerCanvasPrefersCanvasOverSelectedPanel();
  testDesignerCanvasBlocksScopedLoadersOnly();
  testDesignerPanelRequiresExactFieldValue();
  testDesignerPanelUsesVisibleHeaderFallbackOnlyInsideActivePanel();
  testDesignerPanelRequiresConcreteScopedSemanticText();
  testDesignerPanelReportsSplitIdentitySemanticAndFieldDiagnostics();
  testDesignerPanelRequiresFocusedEditorTokenSource();
  testDesignerPanelRejectsAncestorFocusAndPlainTextToken();
  testDesignerPanelRequiresVisiblePickerSectionAndToken();
  testDesignerPanelAcceptsFluentLayerContentUnderHiddenHost();
  testDesignerPanelAcceptsAssociatedPickerWhenEditorRetainsFocus();
  testDesignerPanelAcceptsPickerSectionAliases();
  testDesignerPanelMatchesRequestedPickerActionAndToken();
  testDesignerPanelRejectsUnownedPickerText();
  testDesignerPanelRejectsInexactPickerAndEditorIdentity();
  testDesignerPanelRequiresOwnPickerSectionHeader();
  testDesignerPanelRejectsUnassociatedPickerAndInvisibleContributors();
  testDesignerPanelReportsPickerReadinessDiagnostics();
  testPickerReadinessDiagnosticsSerializeWithoutRuntimeText();
  testCreateWorkspaceRejectsWrongExactValidationMessage();
  testCreateWorkspaceRejectsHiddenValidationMessage();
  testCreateWorkspaceRequiresActualControlValue();
  testCreateWorkspaceRejectsPendingPathValidation();
  testCreateWorkspaceRejectsFooterClippedFieldControl();
  testCreateWorkspaceRejectsOutputPanelClippedFieldControl();
  testCreateWorkspaceAcceptsFullyVisibleAnchoredFieldControl();
  testCreateWorkspaceRejectsClippedFunctionNameFieldControl();
  testCreateWorkspaceAcceptsCenteredFunctionNameFieldControl();
  testCreateWorkspaceRejectsWrongFunctionNameFieldValue();
  testCreateWorkspaceRequiresEnabledCreateButton();
  testCreateWorkspaceRequiresScrollPosition();
  testOverviewRequiresStatusOnExpectedRunRow();
  testOverviewRejectsStatusFromRunListWrapper();
  testDiscoveryRequiresVisibleDiscoveryPanel();
  testAmbiguousSelectedPanelsRejected();
  testUnrelatedMutationDoesNotInvalidateScopedRoot();
  testAncestorVisibilityMutationInvalidatesScopedRoot();
  testRootDetachMutationInvalidatesScopedRoot();
  testWorkbenchShellMixedBatchStructuralMutationInvalidates();
  testStableSamplesRequireSameGeometry();
  testWorkbenchShellStabilityAllowsUnrelatedWorkbenchChurn();
  testWorkbenchShellStabilityRejectsStructuralShellChurn();
  testMetadataDoesNotCarryRawText();
  testMetadataRedactsEmbeddedSecretValues();
  console.log('[screenshotReadiness.unit] all tests passed');
}

function testBlankWorkbenchRejected(): void {
  const snapshot = runProbe(new FakeDocument(new FakeElement('body', {}, [], '')), {
    kind: 'workbenchShell',
    label: 'empty-window-startup',
  });

  assert.strictEqual(snapshot.ready, false);
  assert.ok(snapshot.reasonCodes.includes('workbench-shell-missing'));
}

function testEmptyWorkbenchShellAccepted(): void {
  const snapshot = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', { class: 'monaco-workbench' }, [
          new FakeElement('div', { id: 'workbench.parts.activitybar' }, [], 'Accounts'),
          new FakeElement('div', { id: 'workbench.parts.editor' }, [], 'No folder opened'),
          new FakeElement('div', { id: 'workbench.parts.statusbar' }, [], 'Extension Development Host'),
        ]),
      ])
    ),
    {
      kind: 'workbenchShell',
      label: 'empty-window-startup',
    }
  );

  assert.strictEqual(snapshot.ready, true, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('workbench-shell-visible'));
}

function testSelectedMonitoringPanelRejectsWrongAction(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      monitoringPanel({
        title: 'Get current weather',
        nodeId: 'Get_current_weather',
        valueText: 'Status Succeeded Inputs weather payload',
      }),
      new FakeElement('div', { class: 'react-flow' }, [], 'Response'),
    ])
  );

  const snapshot = runProbe(document, {
    kind: 'monitoringAction',
    label: 'response-result-opened',
    actionTitle: 'Response',
    expectedStatus: 'Succeeded',
  });

  assert.strictEqual(snapshot.ready, false);
  assert.ok(snapshot.reasonCodes.includes('monitoring-action-state-missing'));
}

function testSelectedMonitoringPanelRejectsPrefixTitle(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      monitoringPanel({ title: 'Response extra', nodeId: 'Response_extra', valueText: 'Status Succeeded Outputs response payload' }),
    ])
  );

  const snapshot = runProbe(document, {
    kind: 'monitoringAction',
    label: 'response-result-opened',
    actionTitle: 'Response',
    expectedStatus: 'Succeeded',
  });

  assert.strictEqual(snapshot.ready, false);
  assert.ok(snapshot.reasonCodes.includes('monitoring-action-state-missing'));
}

function testSelectedMonitoringPanelAcceptsMatchingActionValues(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      monitoringPanel({ title: 'Response', nodeId: 'Response', valueText: 'Status Succeeded Outputs response payload' }),
    ])
  );

  const snapshot = runProbe(document, {
    kind: 'monitoringAction',
    label: 'response-result-opened',
    actionTitle: 'Response',
    expectedStatus: 'Succeeded',
  });

  assert.strictEqual(snapshot.ready, true, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('monitoring-action-state-visible'));
}

function testMonitoringPanelRequiresExpectedValues(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      monitoringPanel({ title: 'Response', nodeId: 'Response', valueText: 'Status Succeeded Outputs response payload' }),
    ])
  );

  const accepted = runProbe(document, {
    kind: 'monitoringAction',
    label: 'response-result-opened',
    actionTitle: 'Response',
    expectedStatus: 'Succeeded',
    expectedValues: ['response payload'],
  });
  const rejected = runProbe(document, {
    kind: 'monitoringAction',
    label: 'response-result-opened',
    actionTitle: 'Response',
    expectedStatus: 'Succeeded',
    expectedValues: ['weather payload'],
  });

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
}

function testMonitoringPanelRejectsPropertiesOnlyWhileInputsLoading(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      monitoringPanelWithSections({
        title: 'Response',
        nodeId: 'Response',
        values: [
          { prefix: 'inputs', text: 'Loading inputs' },
          { prefix: 'properties', text: 'Status Succeeded' },
        ],
      }),
    ])
  );

  const rejected = runProbe(document, {
    kind: 'monitoringAction',
    label: 'response-result-opened',
    actionTitle: 'Response',
    expectedStatus: 'Succeeded',
  });
  const accepted = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        monitoringPanelWithSections({
          title: 'Response',
          nodeId: 'Response',
          values: [
            { prefix: 'inputs', text: 'Inputs request payload' },
            { prefix: 'properties', text: 'Status Succeeded' },
          ],
        }),
      ])
    ),
    {
      kind: 'monitoringAction',
      label: 'response-result-opened',
      actionTitle: 'Response',
      expectedStatus: 'Succeeded',
      expectedValues: ['request payload'],
    }
  );

  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
  assert.ok(rejected.reasonCodes.includes('monitoring-action-state-missing'));
  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
}

function testDesignerCanvasAcceptsRequiredNodeAliases(): void {
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'When an HTTP request is received');
  requestCard.bounds = { left: 100, top: 100, width: 200, height: 80, right: 300, bottom: 180 };
  const responseCard = new FakeElement('div', { class: 'msla-card' }, [], 'Response');
  responseCard.bounds = { left: 100, top: 240, width: 200, height: 80, right: 300, bottom: 320 };
  const accepted = runProbe(
    new FakeDocument(new FakeElement('body', {}, [new FakeElement('div', { class: 'react-flow' }, [requestCard, responseCard])])),
    {
      kind: 'designerCanvas',
      label: 'request-trigger-added',
      requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'Response'],
    }
  );
  const rejected = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', { class: 'react-flow' }, [
          new FakeElement('div', { class: 'msla-card' }, [], 'When the workflow runs'),
          new FakeElement('div', { class: 'msla-card' }, [], 'Response'),
        ]),
      ])
    ),
    {
      kind: 'designerCanvas',
      label: 'request-trigger-added',
      requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'Response'],
    }
  );

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
  assert.ok(rejected.reasonCodes.includes('designer-canvas-state-missing'));
}

function testDesignerCanvasRejectsHiddenConcreteRequiredNode(): void {
  const hiddenRequestCard = new FakeElement('div', { class: 'msla-card', 'aria-hidden': 'true' }, [], 'When an HTTP request is received');
  const snapshot = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', { class: 'react-flow' }, [
          hiddenRequestCard,
          new FakeElement('div', { class: 'msla-card' }, [], 'Response'),
        ]),
      ])
    ),
    {
      kind: 'designerCanvas',
      label: 'request-trigger-added',
      requiredNodes: ['When an HTTP request is received', 'Response'],
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
  assert.strictEqual(
    JSON.stringify((snapshot.details?.designerCanvas as { missing?: string[] } | undefined)?.missing),
    JSON.stringify(['required-0'])
  );
}

function testDesignerCanvasRejectsOffscreenConcreteRequiredNode(): void {
  const offscreenRequestCard = new FakeElement('div', { class: 'msla-card' }, [], 'When an HTTP request is received');
  offscreenRequestCard.bounds = { left: 0, top: -200, width: 200, height: 40, right: 200, bottom: -160 };
  const snapshot = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', { class: 'react-flow' }, [
          offscreenRequestCard,
          new FakeElement('div', { class: 'msla-card' }, [], 'Response'),
        ]),
      ])
    ),
    {
      kind: 'designerCanvas',
      label: 'request-trigger-added',
      requiredNodes: ['When an HTTP request is received', 'Response'],
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
}

function testDesignerCanvasRejectsRequiredTextOutsideCanvasNode(): void {
  const snapshot = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', {}, [], 'When an HTTP request is received'),
        new FakeElement('div', { class: 'react-flow' }, [new FakeElement('div', { class: 'msla-card' }, [], 'Response')]),
      ])
    ),
    {
      kind: 'designerCanvas',
      label: 'request-trigger-added',
      requiredNodes: ['When an HTTP request is received', 'Response'],
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
}

function testDesignerCanvasRejectsCoveredConcreteRequiredNode(): void {
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'When an HTTP request is received');
  requestCard.bounds = { left: 100, top: 100, width: 200, height: 80, right: 300, bottom: 180 };
  const responseCard = new FakeElement('div', { class: 'msla-card' }, [], 'Response');
  responseCard.bounds = { left: 100, top: 240, width: 200, height: 80, right: 300, bottom: 320 };
  const overlay = new FakeElement('div', { class: 'canvas-loading-overlay' }, [], 'Loading designer');
  overlay.bounds = { left: 0, top: 0, width: 600, height: 600, right: 600, bottom: 600 };
  const snapshot = runProbe(
    new FakeDocument(new FakeElement('body', {}, [new FakeElement('div', { class: 'react-flow' }, [requestCard, responseCard]), overlay])),
    {
      kind: 'designerCanvas',
      label: 'request-trigger-added',
      requiredNodes: ['When an HTTP request is received', 'Response'],
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
  assert.ok(
    ((snapshot.details?.designerCanvas as { covered?: string[] } | undefined)?.covered ?? []).includes('required-0'),
    JSON.stringify(snapshot)
  );
}

function testDesignerCanvasRejectsAncestorClippedConcreteRequiredNode(): void {
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'When an HTTP request is received');
  requestCard.bounds = { left: 150, top: 360, width: 200, height: 80, right: 350, bottom: 440 };
  const clippingAncestor = new FakeElement('div', { style: 'overflow:hidden' }, [requestCard]);
  clippingAncestor.bounds = { left: 100, top: 100, width: 300, height: 180, right: 400, bottom: 280 };
  clippingAncestor.clientHeight = 180;
  clippingAncestor.scrollHeight = 360;
  clippingAncestor.clientWidth = 300;
  clippingAncestor.scrollWidth = 300;
  const canvas = new FakeElement('div', { class: 'react-flow' }, [clippingAncestor]);
  canvas.bounds = { left: 100, top: 100, width: 400, height: 360, right: 500, bottom: 460 };

  const snapshot = runProbe(new FakeDocument(new FakeElement('body', {}, [canvas])), {
    kind: 'designerCanvas',
    label: 'ancestor-clipped-node',
    requiredNodes: ['When an HTTP request is received'],
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
}

function testDesignerCanvasAcceptsShiftedCanvasRootWhenRequiredCardIsVisible(): void {
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'When an HTTP request is received');
  requestCard.bounds = { left: 20, top: 120, width: 220, height: 80, right: 240, bottom: 200 };
  const canvas = new FakeElement('div', { class: 'react-flow' }, [requestCard]);
  canvas.bounds = { left: -138, top: 73, width: 458, height: 593, right: 320, bottom: 666 };

  const snapshot = runProbe(
    new FakeDocument(new FakeElement('body', {}, [canvas])),
    {
      kind: 'designerCanvas',
      label: 'shifted-canvas-root',
      requiredNodes: ['When an HTTP request is received'],
    },
    { window: { innerWidth: 458, innerHeight: 666, devicePixelRatio: 1, scrollY: 0, getComputedStyle: getComputedStyleForFakeElement } }
  );

  assert.strictEqual(snapshot.ready, true, JSON.stringify(snapshot));
  assert.strictEqual((snapshot.details?.designerCanvas as { canvasRootVisible?: boolean } | undefined)?.canvasRootVisible, false);
}

function testDesignerCanvasRejectsPartiallyClippedRequiredNode(): void {
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'When an HTTP request is received');
  requestCard.bounds = { left: -80, top: 120, width: 220, height: 80, right: 140, bottom: 200 };
  const canvas = new FakeElement('div', { class: 'react-flow' }, [requestCard]);
  canvas.bounds = { left: 0, top: 73, width: 458, height: 593, right: 458, bottom: 666 };

  const snapshot = runProbe(
    new FakeDocument(new FakeElement('body', {}, [canvas])),
    {
      kind: 'designerCanvas',
      label: 'partially-clipped-card',
      requiredNodes: ['When an HTTP request is received'],
    },
    { window: { innerWidth: 458, innerHeight: 666, devicePixelRatio: 1, scrollY: 0, getComputedStyle: getComputedStyleForFakeElement } }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
  assert.ok(((snapshot.details?.designerCanvas as { clipped?: string[] } | undefined)?.clipped ?? []).includes('required-0'));
}

function testDesignerCanvasRejectsClippedRequiredTitle(): void {
  const title = new FakeElement('span', { class: 'msla-card-title' }, [], 'Response');
  title.bounds = { left: -80, top: 125, width: 70, height: 20, right: -10, bottom: 145 };
  const responseCard = new FakeElement('div', { class: 'msla-card' }, [title]);
  responseCard.bounds = { left: -30, top: 120, width: 220, height: 80, right: 190, bottom: 200 };
  const canvas = new FakeElement('div', { class: 'react-flow' }, [responseCard]);
  canvas.bounds = { left: 0, top: 73, width: 458, height: 593, right: 458, bottom: 666 };

  const snapshot = runProbe(
    new FakeDocument(new FakeElement('body', {}, [canvas])),
    {
      kind: 'designerCanvas',
      label: 'clipped-required-title',
      requiredNodes: ['Response'],
    },
    { window: { innerWidth: 458, innerHeight: 666, devicePixelRatio: 1, scrollY: 0, getComputedStyle: getComputedStyleForFakeElement } }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(((snapshot.details?.designerCanvas as { clipped?: string[] } | undefined)?.clipped ?? []).includes('required-0'));
}

function testDesignerCanvasRejectsVisibleCardWithOffscreenTitleInRealDom(): void {
  const snapshot = runJsdomRequiredTitleProbe({
    titleStyle: '',
    titleRect: { left: -30, top: 130, width: 25, height: 20 },
    label: 'offscreen-title',
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(((snapshot.details?.designerCanvas as { clipped?: string[] } | undefined)?.clipped ?? []).includes('required-0'));
}

function testDesignerCanvasRejectsHiddenRequiredTitleInRealDom(): void {
  for (const titleStyle of ['visibility:hidden', 'opacity:0']) {
    const snapshot = runJsdomRequiredTitleProbe({
      titleStyle,
      titleRect: { left: 30, top: 130, width: 100, height: 20 },
      label: `hidden-title-${titleStyle}`,
    });

    assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
    assert.ok(((snapshot.details?.designerCanvas as { clipped?: string[] } | undefined)?.clipped ?? []).includes('required-0'));
  }
}

function testDesignerCanvasRejectsObservedNarrowViewportRequiredCardClipping(): void {
  const weatherCard = new FakeElement('div', { class: 'msla-card' }, [], 'Get current weather Connected to MSN Weather');
  weatherCard.bounds = { left: -96, top: 220, width: 280, height: 96, right: 184, bottom: 316 };
  const responseCard = new FakeElement('div', { class: 'msla-card' }, [], 'Response');
  responseCard.bounds = { left: 208, top: 340, width: 220, height: 88, right: 428, bottom: 428 };
  const canvas = new FakeElement('div', { class: 'react-flow' }, [weatherCard, responseCard]);
  canvas.bounds = { left: 0, top: 73, width: 458, height: 593, right: 458, bottom: 666 };

  const snapshot = runProbe(
    new FakeDocument(new FakeElement('body', {}, [canvas])),
    {
      kind: 'designerCanvas',
      label: 'observed-458-required-card-clipped',
      requiredNodes: ['Get current weather'],
    },
    { window: { innerWidth: 458, innerHeight: 666, devicePixelRatio: 1, scrollY: 0, getComputedStyle: getComputedStyleForFakeElement } }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(((snapshot.details?.designerCanvas as { clipped?: string[] } | undefined)?.clipped ?? []).includes('required-0'));
}

function runJsdomRequiredTitleProbe(options: {
  titleStyle: string;
  titleRect: { left: number; top: number; width: number; height: number };
  label: string;
}): ScreenshotReadinessSnapshot {
  const dom = new JSDOM(
    `<html><body><div class="react-flow" id="canvas"><div class="msla-card" id="card"><span class="msla-card-title" id="title" style="${options.titleStyle}">Response</span></div></div></body></html>`,
    { runScripts: 'outside-only' }
  );
  const { window } = dom;
  const windowAny = window as any;
  const { document } = windowAny;
  Object.defineProperty(windowAny, 'innerWidth', { configurable: true, value: 458 });
  Object.defineProperty(windowAny, 'innerHeight', { configurable: true, value: 666 });
  configureJsdomElementGeometry(windowAny, {
    canvas: { left: 0, top: 73, width: 458, height: 593 },
    card: { left: 20, top: 120, width: 220, height: 80 },
    title: options.titleRect,
  });

  return vm.runInNewContext(
    buildScreenshotReadinessExpression({ kind: 'designerCanvas', label: options.label, requiredNodes: ['Response'] }, 1, 1),
    {
      document,
      window: windowAny,
      HTMLElement: windowAny.HTMLElement,
      HTMLInputElement: windowAny.HTMLInputElement,
      HTMLButtonElement: windowAny.HTMLButtonElement,
      Node: windowAny.Node,
      getComputedStyle: windowAny.getComputedStyle.bind(windowAny),
    }
  ) as ScreenshotReadinessSnapshot;
}

function configureJsdomElementGeometry(
  window: any,
  geometry: Record<string, { left: number; top: number; width: number; height: number }>
): void {
  const htmlElementPrototype = window.HTMLElement.prototype;
  Object.defineProperty(htmlElementPrototype, 'offsetWidth', {
    configurable: true,
    get() {
      return geometry[this.id]?.width ?? 100;
    },
  });
  Object.defineProperty(htmlElementPrototype, 'offsetHeight', {
    configurable: true,
    get() {
      return geometry[this.id]?.height ?? 40;
    },
  });
  htmlElementPrototype.getClientRects = function () {
    const rect = geometry[this.id];
    return rect ? [this.getBoundingClientRect()] : [];
  };
  htmlElementPrototype.getBoundingClientRect = function () {
    const rect = geometry[this.id] ?? { left: 0, top: 0, width: 100, height: 40 };
    return {
      bottom: rect.top + rect.height,
      height: rect.height,
      left: rect.left,
      right: rect.left + rect.width,
      top: rect.top,
      width: rect.width,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    };
  };
  window.document.elementFromPoint = (x: number, y: number) =>
    (Object.entries(geometry)
      .map(([id, rect]) => ({ element: window.document.getElementById(id), rect }))
      .reverse()
      .find(({ element, rect }) => element && x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height)
      ?.element as any) ?? null;
}

function testDesignerCanvasRejectsNonCanvasSubstituteNode(): void {
  const panelSubstitute = new FakeElement('div', { class: 'msla-card' }, [], 'Get current weather');
  panelSubstitute.bounds = { left: 520, top: 100, width: 220, height: 80, right: 740, bottom: 180 };
  const canvas = new FakeElement('div', { class: 'react-flow' }, [], 'Get current weather');
  canvas.bounds = { left: 100, top: 100, width: 360, height: 240, right: 460, bottom: 340 };

  const snapshot = runProbe(new FakeDocument(new FakeElement('body', {}, [canvas, panelSubstitute])), {
    kind: 'designerCanvas',
    label: 'noncanvas-substitute-node',
    requiredNodes: ['Get current weather'],
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
}

function testDesignerCanvasRejectsOffCenterLoaderOverRequiredNode(): void {
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'Get current weather');
  requestCard.bounds = { left: 420, top: 160, width: 140, height: 80, right: 560, bottom: 240 };
  const canvas = new FakeElement('div', { class: 'react-flow' }, [requestCard]);
  canvas.bounds = { left: 100, top: 100, width: 500, height: 320, right: 600, bottom: 420 };
  const overlay = new FakeElement('div', { class: 'ms-Spinner' }, [], 'Loading');
  overlay.bounds = { left: 400, top: 140, width: 180, height: 120, right: 580, bottom: 260 };

  const snapshot = runProbe(new FakeDocument(new FakeElement('body', {}, [canvas, overlay])), {
    kind: 'designerCanvas',
    label: 'off-center-loader',
    requiredNodes: ['Get current weather'],
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('loader-visible') || snapshot.reasonCodes.includes('designer-canvas-required-node-missing'));
}

function testDesignerCanvasPrefersCanvasOverSelectedPanel(): void {
  const panelCard = new FakeElement('div', { class: 'msla-card' }, [], 'Get current weather');
  panelCard.bounds = { left: 20, top: 20, width: 200, height: 80, right: 220, bottom: 100 };
  const selectedPanel = new FakeElement('div', { class: 'msla-panel-layout msla-panel-border-selected' }, [panelCard]);
  selectedPanel.bounds = { left: 0, top: 0, width: 260, height: 200, right: 260, bottom: 200 };
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'Get current weather');
  requestCard.bounds = { left: 320, top: 120, width: 220, height: 80, right: 540, bottom: 200 };
  const canvas = new FakeElement('div', { class: 'react-flow' }, [requestCard]);
  canvas.bounds = { left: 300, top: 100, width: 360, height: 260, right: 660, bottom: 360 };

  const snapshot = runProbe(new FakeDocument(new FakeElement('body', {}, [selectedPanel, canvas])), {
    kind: 'designerCanvas',
    label: 'selected-panel-with-canvas',
    requiredNodes: ['Get current weather'],
  });

  assert.strictEqual(snapshot.ready, true, JSON.stringify(snapshot));
}

function testDesignerCanvasBlocksScopedLoadersOnly(): void {
  const canvas = new FakeElement('div', { class: 'react-flow' }, canvasCards());
  canvas.bounds = { left: 100, top: 100, width: 400, height: 300, right: 500, bottom: 400 };
  const unrelatedLoader = new FakeElement('div', { class: 'loading' }, [], 'Loading unrelated view');
  unrelatedLoader.bounds = { left: 700, top: 100, width: 80, height: 80, right: 780, bottom: 180 };

  const unrelated = runProbe(new FakeDocument(new FakeElement('body', {}, [canvas, unrelatedLoader])), {
    kind: 'designerCanvas',
    label: 'action-added',
    requiredNodes: ['Request', 'Response'],
  });

  const inside = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', { class: 'react-flow' }, [
          ...canvasCards(),
          new FakeElement('div', { class: 'loading' }, [], 'Loading designer'),
        ]),
      ])
    ),
    {
      kind: 'designerCanvas',
      label: 'action-added',
      requiredNodes: ['Request', 'Response'],
    }
  );

  const overlay = new FakeElement('div', { class: 'loading' }, [], 'Loading overlay');
  overlay.bounds = { left: 90, top: 90, width: 420, height: 320, right: 510, bottom: 410 };
  const overlaidCanvas = new FakeElement('div', { class: 'react-flow' }, canvasCards());
  overlaidCanvas.bounds = { left: 100, top: 100, width: 400, height: 300, right: 500, bottom: 400 };
  const overlaid = runProbe(new FakeDocument(new FakeElement('body', {}, [overlaidCanvas, overlay])), {
    kind: 'designerCanvas',
    label: 'action-added',
    requiredNodes: ['Request', 'Response'],
  });

  assert.strictEqual(unrelated.ready, true, JSON.stringify(unrelated));
  assert.strictEqual(inside.ready, false, JSON.stringify(inside));
  assert.ok(inside.blockers.includes('loader-visible'));
  assert.strictEqual(overlaid.ready, false, JSON.stringify(overlaid));
  assert.ok(overlaid.blockers.includes('loader-visible'));
}

function canvasCards(): FakeElement[] {
  const requestCard = new FakeElement('div', { class: 'msla-card' }, [], 'Request');
  requestCard.bounds = { left: 150, top: 140, width: 200, height: 80, right: 350, bottom: 220 };
  const responseCard = new FakeElement('div', { class: 'msla-card' }, [], 'Response');
  responseCard.bounds = { left: 150, top: 260, width: 200, height: 80, right: 350, bottom: 340 };
  return [requestCard, responseCard];
}

function testDesignerPanelRequiresExactFieldValue(): void {
  const fieldControl = new FakeElement('div', { 'aria-label': 'Location', role: 'textbox' }, [], '98058');
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      designerPanel({
        title: 'Get current weather',
        nodeId: 'Get_current_weather',
        text: 'Location',
        fields: [new FakeElement('div', { class: 'ms-TextField' }, [fieldControl], 'Location')],
      }),
    ])
  );
  assert.ok(
    document.body.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"], [role="combobox"]').includes(fieldControl)
  );

  const accepted = runProbe(document, {
    kind: 'designerPanel',
    label: 'msn-weather-action-configured',
    actionTitle: 'Get current weather',
    requiredText: ['Location'],
    fields: [{ labels: ['Location'], value: '98058' }],
  });
  const rejected = runProbe(document, {
    kind: 'designerPanel',
    label: 'msn-weather-action-configured',
    actionTitle: 'Get current weather',
    requiredText: ['Location'],
    fields: [{ labels: ['Location'], value: '98059' }],
  });

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
}

function testDesignerPanelUsesVisibleHeaderFallbackOnlyInsideActivePanel(): void {
  const expectation: ScreenshotExpectation = {
    kind: 'designerPanel',
    label: 'http-method-selected',
    actionTitle: 'HTTP',
    requiredText: ['Method', 'URI'],
    fields: [{ labels: ['Method'], value: 'GET' }],
  };
  const accepted = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        designerPanelWithVisibleHeader({
          headerTitle: '  hTtP  ',
          text: 'Method URI',
          fields: [visibleMethodControl('GET')],
        }),
      ])
    ),
    expectation
  );
  const punctuationCollision = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        designerPanelWithVisibleHeader({
          headerTitle: 'HTTP!',
          text: 'Method URI',
          fields: [visibleMethodControl('GET')],
        }),
      ])
    ),
    expectation
  );
  const editablePunctuationCollision = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        designerPanel({
          title: 'HTTP!',
          nodeId: 'HTTP',
          text: 'Method URI',
          fields: [visibleMethodControl('GET')],
        }),
      ])
    ),
    expectation
  );
  const stableNodeIdSlug = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        designerPanel({
          title: '',
          nodeId: 'Get_current_weather',
          text: 'Location',
        }),
      ])
    ),
    {
      kind: 'designerPanel',
      label: 'stable-node-id-slug',
      actionTitle: 'Get current weather',
      requiredText: ['Location'],
    }
  );
  const unrelatedGlobalHeader = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('h1', {}, [], 'HTTP'),
        designerPanelWithVisibleHeader({
          headerTitle: 'Compose',
          text: 'Method URI',
          fields: [visibleMethodControl('GET')],
        }),
      ])
    ),
    expectation
  );
  const conflictingStableId = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        designerPanelWithVisibleHeader({
          headerTitle: 'HTTP',
          nodeId: 'Compose',
          text: 'Method URI',
          fields: [visibleMethodControl('GET')],
        }),
      ])
    ),
    expectation
  );
  const hiddenPanel = designerPanelWithVisibleHeader({
    headerTitle: 'HTTP',
    text: 'Method URI',
    fields: [visibleMethodControl('GET')],
  });
  hiddenPanel.attributes.style = 'display: none';
  const hidden = runProbe(new FakeDocument(new FakeElement('body', {}, [new FakeElement('h1', {}, [], 'HTTP'), hiddenPanel])), expectation);

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(stableNodeIdSlug.ready, true, JSON.stringify(stableNodeIdSlug));
  assert.strictEqual((accepted.details?.designerPanel as { usedVisibleHeaderFallback?: boolean })?.usedVisibleHeaderFallback, true);
  for (const snapshot of [punctuationCollision, editablePunctuationCollision, unrelatedGlobalHeader, conflictingStableId, hidden]) {
    assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  }
  assert.ok(punctuationCollision.reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(editablePunctuationCollision.reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(unrelatedGlobalHeader.reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(conflictingStableId.reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(hidden.reasonCodes.includes('selected-panel-missing'));
}

function testDesignerPanelRequiresConcreteScopedSemanticText(): void {
  const expectation: ScreenshotExpectation = {
    kind: 'designerPanel',
    label: 'http-method-selected',
    actionTitle: 'HTTP',
    requiredText: ['Method', 'URI'],
    fields: [{ labels: ['Method'], value: 'GET' }],
  };
  const httpPanel = (semanticChildren: FakeElement[], globalChildren: FakeElement[] = []) =>
    new FakeDocument(
      new FakeElement('body', {}, [
        ...globalChildren,
        new FakeElement('section', { class: 'msla-panel-layout msla-panel-border-selected' }, [
          new FakeElement('div', { class: 'msla-panel-header' }, [
            new FakeInputElement('input', { 'aria-label': 'Card title', id: 'HTTP-title', value: 'HTTP' }),
          ]),
          new FakeElement('div', { id: 'msla-node-details-panel-HTTP', class: 'msla-node-details-panel' }, [
            new FakeElement('div', { class: 'fui-Field' }, [...semanticChildren, visibleMethodControl('GET')]),
          ]),
        ]),
      ])
    );
  const visibleLabels = runProbe(httpPanel([visibleSemanticText('Method', 100), visibleSemanticText('URI', 120)]), expectation);
  const hiddenLabels = runProbe(
    httpPanel(
      [new FakeElement('label', { style: 'display: none' }, [], 'Method'), new FakeElement('label', { 'aria-hidden': 'true' }, [], 'URI')],
      [new FakeElement('div', {}, [], 'Method URI')]
    ),
    expectation
  );
  const unrelatedGlobalText = runProbe(
    httpPanel([], [new FakeElement('div', {}, [new FakeElement('span', {}, [], 'Method URI')])]),
    expectation
  );
  const excludedDecoys = [
    new FakeElement('div', { role: 'menu' }, [new FakeElement('span', {}, [], 'Method URI')]),
    new FakeElement('div', { role: 'listbox' }, [new FakeElement('span', {}, [], 'Method URI')]),
    new FakeElement('div', { role: 'dialog' }, [new FakeElement('span', {}, [], 'Method URI')]),
    new FakeElement('div', { class: 'ms-Layer' }, [new FakeElement('span', {}, [], 'Method URI')]),
    new FakeElement('div', { class: 'webview-overlay-content' }, [new FakeElement('span', {}, [], 'Method URI')]),
  ].map((decoy) => runProbe(httpPanel([decoy]), expectation));

  assert.strictEqual(visibleLabels.ready, true, JSON.stringify(visibleLabels));
  for (const snapshot of [hiddenLabels, unrelatedGlobalText, ...excludedDecoys]) {
    assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
    assert.ok(snapshot.reasonCodes.includes('designer-panel-required-text-mismatch'), JSON.stringify(snapshot));
    assert.ok(!snapshot.reasonCodes.includes('designer-panel-field-mismatch'), JSON.stringify(snapshot));
  }
}

function testDesignerPanelReportsSplitIdentitySemanticAndFieldDiagnostics(): void {
  const expectation: ScreenshotExpectation = {
    kind: 'designerPanel',
    label: 'http-method-selected',
    actionTitle: 'HTTP',
    requiredText: ['Method', 'URI'],
    fields: [{ labels: ['Method'], value: 'GET' }],
  };
  const snapshotFor = (options: { headerTitle: string; text: string; methodValue: string }) =>
    runProbe(
      new FakeDocument(
        new FakeElement('body', {}, [
          designerPanelWithVisibleHeader({
            headerTitle: options.headerTitle,
            text: options.text,
            fields: [visibleMethodControl(options.methodValue)],
          }),
        ])
      ),
      expectation
    );
  const identity = snapshotFor({ headerTitle: 'Compose', text: 'Method URI', methodValue: 'GET' });
  const semantic = snapshotFor({ headerTitle: 'HTTP', text: 'Method', methodValue: 'GET' });
  const field = snapshotFor({ headerTitle: 'HTTP', text: 'Method URI', methodValue: 'PUT' });

  assert.deepStrictEqual(
    [identity, semantic, field].map((snapshot) => snapshot.ready),
    [false, false, false]
  );
  assert.ok(identity.reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(!identity.reasonCodes.includes('designer-panel-required-text-mismatch'));
  assert.ok(!identity.reasonCodes.includes('designer-panel-field-mismatch'));
  assert.ok(semantic.reasonCodes.includes('designer-panel-required-text-mismatch'));
  assert.ok(!semantic.reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(!semantic.reasonCodes.includes('designer-panel-field-mismatch'));
  assert.ok(field.reasonCodes.includes('designer-panel-field-mismatch'));
  assert.ok(field.reasonCodes.includes('field-value-mismatch'));
  assert.ok(!field.reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(!field.reasonCodes.includes('designer-panel-required-text-mismatch'));
  assert.ok([identity, semantic, field].every((snapshot) => !snapshot.reasonCodes.includes('designer-panel-state-missing')));
}

function testDesignerPanelRequiresFocusedEditorTokenSource(): void {
  const token = new FakeElement(
    'span',
    {
      class: 'msla-token',
      'data-automation-id': 'msla-token msla-input-token-Body',
      'data-testid': 'token-Body-Get-current-weather',
      'aria-label': 'Body Get current weather',
      title: "body('Get_current_weather')",
    },
    [],
    "Body body('Get_current_weather')"
  );
  const editor = new FakeElement('div', { 'aria-label': 'Body', role: 'textbox' }, [token], 'Body');
  const originalEditorQuerySelectorAll = editor.querySelectorAll.bind(editor);
  editor.querySelectorAll = (selector: string): FakeElement[] => {
    if (
      selector === '*' ||
      selector.includes('token') ||
      selector.includes('Token') ||
      selector.includes('pill') ||
      selector.includes('Pill')
    ) {
      return [token];
    }
    return originalEditorQuerySelectorAll(selector);
  };
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      designerPanel({
        title: 'Response',
        nodeId: 'Response',
        text: 'Body',
        fields: [new FakeElement('div', { class: 'ms-TextField' }, [editor], 'Body')],
      }),
    ])
  );
  assignOwnerDocument(document.body, document);
  document.activeElement = editor;
  assert.ok(editor.querySelectorAll('[data-automation-id*="token"], [class*="token"]').includes(token));

  const accepted = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-body-token-configured',
    actionTitle: 'Response',
    editor: { labels: ['Body'], focused: true, token: { titles: ['Body'], sourceAction: 'Get current weather' } },
  });
  const rejected = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-body-token-configured',
    actionTitle: 'Response',
    editor: { labels: ['Body'], focused: true, token: { titles: ['Body'], sourceAction: 'Weather' } },
  });

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
}

function testDesignerPanelRejectsAncestorFocusAndPlainTextToken(): void {
  const editor = new FakeElement('div', { 'aria-label': 'Body', role: 'textbox', contenteditable: 'true' }, [], 'Body Get current weather');
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      designerPanel({
        title: 'Response',
        nodeId: 'Response',
        text: 'Body',
        fields: [new FakeElement('div', { class: 'ms-TextField' }, [editor], 'Body')],
      }),
    ])
  );
  document.activeElement = document.body;

  const snapshot = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-body-token-configured',
    actionTitle: 'Response',
    editor: { labels: ['Body'], focused: true, token: { titles: ['Body'], sourceAction: 'Get_current_weather' } },
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('editor-focus-mismatch') || snapshot.reasonCodes.includes('editor-token-mismatch'));
}

function testDesignerPanelRequiresVisiblePickerSectionAndToken(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      designerPanel({ title: 'Response', nodeId: 'Response', text: 'Body' }),
      new FakeElement('div', { role: 'dialog', class: 'msla-token-picker' }, [], 'Dynamic content Request Body'),
    ])
  );

  const accepted = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    picker: { sectionLabels: ['Dynamic content'] },
  });
  const rejected = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    picker: { sectionLabels: ['Expression'] },
  });

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));

  const concrete = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const sectionOnlyAccepted = runProbe(concrete.document, {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  });

  assert.strictEqual(sectionOnlyAccepted.ready, true, JSON.stringify(sectionOnlyAccepted));
}

function testDesignerPanelAcceptsFluentLayerContentUnderHiddenHost(): void {
  const expectation: ScreenshotExpectation = {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  };
  const hiddenHostInheritedLayer = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const visibleHostControl = createAssociatedPickerDocument({
    hostStyle: 'visibility: visible',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const explicitlyHiddenLayerWrapper = createAssociatedPickerDocument({
    layerWrapperStyle: 'visibility: hidden',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });

  const hiddenHostSnapshot = runProbe(hiddenHostInheritedLayer.document, expectation);
  const visibleHostSnapshot = runProbe(visibleHostControl.document, expectation);
  const hiddenWrapperSnapshot = runProbe(explicitlyHiddenLayerWrapper.document, expectation);

  assert.strictEqual(hiddenHostSnapshot.ready, true, JSON.stringify(hiddenHostSnapshot));
  assert.strictEqual(visibleHostSnapshot.ready, true, JSON.stringify(visibleHostSnapshot));
  assert.strictEqual(hiddenWrapperSnapshot.ready, false, JSON.stringify(hiddenWrapperSnapshot));
  assert.ok(hiddenWrapperSnapshot.reasonCodes.includes('picker-search-missing'));
}

function testDesignerPanelAcceptsAssociatedPickerWhenEditorRetainsFocus(): void {
  const retainedEditorFocus = createAssociatedPickerDocument({
    activeSearch: false,
    sections: [
      { label: 'Variables', tokens: ['aefawf', 'Body'] },
      { label: 'manual', tokens: ['Body', 'Headers', 'Path Parameters', 'Queries'] },
    ],
  });

  const snapshot = runProbe(retainedEditorFocus.document, {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: ['Variables'], tokenTitles: ['Body'] },
  });

  assert.strictEqual(snapshot.ready, true, JSON.stringify(snapshot));
}

function testDesignerPanelAcceptsPickerSectionAliases(): void {
  const aliases = ['Get current weather', 'Get_current_weather'];
  const expectation: ScreenshotExpectation = {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: aliases, tokenTitles: ['Body', 'Headers'] },
  };
  const createPickerDocument = (sectionLabels: string[], tokenTitles: string[]) =>
    createAssociatedPickerDocument({
      sections: sectionLabels.map((sectionLabel) => ({ label: sectionLabel, tokens: tokenTitles })),
    }).document;
  const friendlyOnly = runProbe(createPickerDocument(['Get current weather'], ['Body', 'Headers']), expectation);
  const internalOnly = runProbe(createPickerDocument(['Get_current_weather'], ['Body', 'Headers']), expectation);
  const bothAliases = runProbe(createPickerDocument(['Get current weather', 'Get_current_weather'], ['Body', 'Headers']), expectation);
  const neitherAlias = runProbe(createPickerDocument(['Current weather'], ['Body', 'Headers']), expectation);
  const missingRequestedTitle = runProbe(createPickerDocument(['Get current weather'], ['Body']), expectation);

  assert.strictEqual(friendlyOnly.ready, true, JSON.stringify(friendlyOnly));
  assert.strictEqual(internalOnly.ready, true, JSON.stringify(internalOnly));
  assert.strictEqual(bothAliases.ready, true, JSON.stringify(bothAliases));
  assert.strictEqual(neitherAlias.ready, false, JSON.stringify(neitherAlias));
  assert.strictEqual(missingRequestedTitle.ready, false, JSON.stringify(missingRequestedTitle));
  assert.ok(neitherAlias.reasonCodes.includes('picker-section-missing'));
  assert.ok(missingRequestedTitle.reasonCodes.includes('picker-token-missing'));
}

function testDesignerPanelMatchesRequestedPickerActionAndToken(): void {
  const weatherBody = createAssociatedPickerDocument({
    sections: [
      { label: 'Get current weather', tokens: ['Body', 'Pressure'] },
      { label: 'When an HTTP request is received', tokens: ['Body'] },
    ],
  });
  const weatherTemperature = createAssociatedPickerDocument({
    sections: [
      { label: 'Get current weather', tokens: ['Body', 'Temperature'] },
      { label: 'When an HTTP request is received', tokens: ['Temperature'] },
    ],
  });
  const forecastSummary = createAssociatedPickerDocument({
    sections: [
      { label: 'Get current weather', tokens: ['Summary'] },
      { label: 'Get forecast', tokens: ['Summary'] },
    ],
  });
  const repeatedBody = createAssociatedPickerDocument({
    sections: [
      { label: 'Get current weather', tokens: ['Body'] },
      { label: 'Get forecast', tokens: ['Body'] },
    ],
  });

  const baseExpectation = {
    kind: 'designerPanel' as const,
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
  };

  assert.strictEqual(
    runProbe(weatherBody.document, {
      ...baseExpectation,
      picker: { sectionLabels: ['Get current weather', 'Get_current_weather'], tokenTitles: ['Body'] },
    }).ready,
    true
  );
  assert.strictEqual(
    runProbe(weatherTemperature.document, {
      ...baseExpectation,
      picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Temperature'] },
    }).ready,
    true
  );
  assert.strictEqual(
    runProbe(forecastSummary.document, {
      ...baseExpectation,
      picker: { sectionLabels: ['Get forecast'], tokenTitles: ['Summary'] },
    }).ready,
    true
  );
  assert.strictEqual(
    runProbe(repeatedBody.document, {
      ...baseExpectation,
      picker: { sectionLabels: ['Get forecast'], tokenTitles: ['Body'] },
    }).ready,
    true
  );
}

function testDesignerPanelRejectsUnownedPickerText(): void {
  const baseExpectation = {
    kind: 'designerPanel' as const,
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
  };
  const httpBodyOnly = createAssociatedPickerDocument({
    sections: [
      { label: 'Get current weather', tokens: ['Pressure'] },
      { label: 'When an HTTP request is received', tokens: ['Body'] },
    ],
  });
  const bodyOnlyInDescription = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: [{ title: 'Pressure', description: 'Body appears only in the description' }] }],
  });
  const unrelatedPicker = createAssociatedPickerDocument({
    sections: [{ label: 'When an HTTP request is received', tokens: ['Body'] }],
    extraText: 'Get current weather Body documentation',
  });

  const httpBodyOnlySnapshot = runProbe(httpBodyOnly.document, {
    ...baseExpectation,
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  });
  const descriptionSnapshot = runProbe(bodyOnlyInDescription.document, {
    ...baseExpectation,
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  });
  const unrelatedSnapshot = runProbe(unrelatedPicker.document, {
    ...baseExpectation,
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  });

  assert.strictEqual(httpBodyOnlySnapshot.ready, false, JSON.stringify(httpBodyOnlySnapshot));
  assert.strictEqual(descriptionSnapshot.ready, false, JSON.stringify(descriptionSnapshot));
  assert.strictEqual(unrelatedSnapshot.ready, false, JSON.stringify(unrelatedSnapshot));
  assert.ok(httpBodyOnlySnapshot.reasonCodes.includes('picker-token-missing'));
  assert.ok(descriptionSnapshot.reasonCodes.includes('picker-token-missing'));
  assert.ok(
    unrelatedSnapshot.reasonCodes.includes('picker-token-missing') || unrelatedSnapshot.reasonCodes.includes('picker-section-missing')
  );
}

function testDesignerPanelRejectsInexactPickerAndEditorIdentity(): void {
  const baseExpectation = {
    kind: 'designerPanel' as const,
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  };
  const suffixedSection = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather 2', tokens: ['Body'] }],
  });
  const suffixedToken = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body preview'] }],
  });
  const suffixedEditorLabel = createAssociatedPickerDocument({
    editorLabel: 'Body template',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const bodyOnlyInEditorContainerDocs = createAssociatedPickerDocument({
    editorLabel: 'Headers',
    editorContainerExtraText: 'Documentation mentions Body for a different field',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });

  const sectionSnapshot = runProbe(suffixedSection.document, baseExpectation);
  const tokenSnapshot = runProbe(suffixedToken.document, baseExpectation);
  const editorLabelSnapshot = runProbe(suffixedEditorLabel.document, baseExpectation);
  const editorContainerSnapshot = runProbe(bodyOnlyInEditorContainerDocs.document, baseExpectation);

  assert.strictEqual(sectionSnapshot.ready, false, JSON.stringify(sectionSnapshot));
  assert.strictEqual(tokenSnapshot.ready, false, JSON.stringify(tokenSnapshot));
  assert.strictEqual(editorLabelSnapshot.ready, false, JSON.stringify(editorLabelSnapshot));
  assert.strictEqual(editorContainerSnapshot.ready, false, JSON.stringify(editorContainerSnapshot));
  assert.ok(sectionSnapshot.reasonCodes.includes('picker-section-missing'));
  assert.ok(tokenSnapshot.reasonCodes.includes('picker-token-missing'));
  assert.ok(editorLabelSnapshot.reasonCodes.includes('picker-editor-label-mismatch'));
  assert.ok(editorContainerSnapshot.reasonCodes.includes('picker-editor-label-mismatch'));
}

function testDesignerPanelRequiresOwnPickerSectionHeader(): void {
  const expectation: ScreenshotExpectation = {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  };
  const missingOwnHeader = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  missingOwnHeader.elements.headers[0].attributes.class = 'not-msla-token-picker-section-header';

  const disconnectedOwnHeader = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  disconnectedOwnHeader.elements.headers[0].isConnected = false;

  const nestedHeader = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  nestedHeader.elements.headers[0].attributes.class = 'not-msla-token-picker-section-header';
  const parentSection = nestedHeader.document.body.querySelector('.msla-token-picker-section') as FakeElement | undefined;
  assert.ok(parentSection);
  const borrowedHeader = new FakeElement('div', { class: 'msla-token-picker-section-header' }, [], 'Get current weather');
  const borrowedSection = new FakeElement('section', { class: 'msla-token-picker-section' }, [borrowedHeader]);
  borrowedSection.parentElement = parentSection;
  parentSection.children.push(borrowedSection);
  assignOwnerDocument(borrowedSection, nestedHeader.document);
  setBounds(borrowedSection, 135, 152, 320, 32);
  setBounds(borrowedHeader, 135, 152, 320, 32);

  const missingSnapshot = runProbe(missingOwnHeader.document, expectation);
  const disconnectedSnapshot = runProbe(disconnectedOwnHeader.document, expectation);
  const nestedSnapshot = runProbe(nestedHeader.document, expectation);

  assert.strictEqual(missingSnapshot.ready, false, JSON.stringify(missingSnapshot));
  assert.strictEqual(disconnectedSnapshot.ready, false, JSON.stringify(disconnectedSnapshot));
  assert.strictEqual(nestedSnapshot.ready, false, JSON.stringify(nestedSnapshot));
  assert.ok(missingSnapshot.reasonCodes.includes('picker-section-missing'));
  assert.ok(disconnectedSnapshot.reasonCodes.includes('picker-section-missing'));
  assert.ok(
    nestedSnapshot.reasonCodes.some((reasonCode) => reasonCode.startsWith('picker-')),
    JSON.stringify(nestedSnapshot)
  );
}

function testDesignerPanelRejectsUnassociatedPickerAndInvisibleContributors(): void {
  const baseExpectation = {
    kind: 'designerPanel' as const,
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: ['Get current weather'], tokenTitles: ['Body'] },
  };
  const wrongAction = createAssociatedPickerDocument({
    actionTitle: 'Compose',
    nodeId: 'Compose',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const missingEditor = createAssociatedPickerDocument({
    includeEditor: false,
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const wrongAssociation = createAssociatedPickerDocument({
    dialogLabelId: 'other-editor-label',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const inactiveSearch = createAssociatedPickerDocument({
    activeSearch: false,
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const hiddenSearch = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  hiddenSearch.elements.search.attributes.style = 'display: none';
  const transparentSearch = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  transparentSearch.elements.search.attributes.style = 'opacity: 0';
  const hiddenHostWithoutVisibleLayer = createAssociatedPickerDocument({
    layerStyle: 'visibility: hidden',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const transparentLayer = createAssociatedPickerDocument({
    layerStyle: 'visibility: visible; opacity: 0',
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  const detachedSearch = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  detachedSearch.elements.search.isConnected = false;
  const clippedHeader = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  clippedHeader.elements.headers[0].bounds = { left: 140, top: -60, width: 360, height: 32, right: 500, bottom: -28 };
  const clippedButton = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  clippedButton.elements.buttons[0].bounds = { left: 150, top: 900, width: 340, height: 32, right: 490, bottom: 932 };
  const clippedTitle = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });
  clippedTitle.elements.titles[0].bounds = { left: 160, top: 900, width: 180, height: 20, right: 340, bottom: 920 };

  const snapshots = [
    runProbe(wrongAction.document, baseExpectation),
    runProbe(missingEditor.document, baseExpectation),
    runProbe(wrongAssociation.document, baseExpectation),
    runProbe(hiddenHostWithoutVisibleLayer.document, baseExpectation),
    runProbe(transparentLayer.document, baseExpectation),
    runProbe(clippedHeader.document, baseExpectation),
    runProbe(clippedButton.document, baseExpectation),
  ];

  for (const snapshot of snapshots) {
    assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  }
  assert.ok(snapshots[0].reasonCodes.includes('designer-panel-identity-mismatch'));
  assert.ok(snapshots[1].reasonCodes.includes('editor-missing'));
  assert.ok(snapshots[2].reasonCodes.includes('picker-editor-association-missing'));
  assert.ok(snapshots.slice(3).every((snapshot) => snapshot.reasonCodes.some((code) => code.startsWith('picker-'))));
  assert.strictEqual(runProbe(inactiveSearch.document, baseExpectation).ready, true);
  assert.strictEqual(runProbe(hiddenSearch.document, baseExpectation).ready, true);
  assert.strictEqual(runProbe(transparentSearch.document, baseExpectation).ready, true);
  assert.strictEqual(runProbe(detachedSearch.document, baseExpectation).ready, true);
  assert.strictEqual(runProbe(clippedTitle.document, baseExpectation).ready, true);
}

function testDesignerPanelReportsPickerReadinessDiagnostics(): void {
  const { document } = createAssociatedPickerDocument({
    sections: [{ label: 'Get current weather', tokens: ['Body'] }],
  });

  const snapshot = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: ['Get_current_weather'], tokenTitles: ['Body', 'Headers'] },
  });
  const pickerDetails = snapshot.details?.picker as
    | {
        expectedSectionLabelCount?: number;
        expectedRequestedTitleCount?: number;
        strictRootCount?: number;
        looseRootCount?: number;
        concretePathReason?: string;
        strictSectionMatch?: boolean;
        looseSectionMatch?: boolean;
        strictRequestedTitlesMatch?: boolean;
        looseRequestedTitlesMatch?: boolean;
        strictSections?: Array<{ headerPresent?: boolean; matchedSectionLabelIndices?: number[]; matchedRequestedTitleIndices?: number[] }>;
      }
    | undefined;

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('picker-token-missing'));
  assert.strictEqual(pickerDetails?.expectedSectionLabelCount, 1);
  assert.strictEqual(pickerDetails?.expectedRequestedTitleCount, 2);
  assert.strictEqual(pickerDetails?.concretePathReason, 'picker-token-missing');
  assert.strictEqual(pickerDetails?.strictRootCount, 0);
  assert.strictEqual(pickerDetails?.looseRootCount, 0);
  assert.strictEqual(pickerDetails?.strictSectionMatch, false);
  assert.strictEqual(pickerDetails?.looseSectionMatch, false);
  assert.strictEqual(pickerDetails?.strictRequestedTitlesMatch, false);
  assert.strictEqual(pickerDetails?.looseRequestedTitlesMatch, false);
  assert.strictEqual(pickerDetails?.strictSections?.length, 0);
}

function testPickerReadinessDiagnosticsSerializeWithoutRuntimeText(): void {
  const privateTitle = 'Confidential ClientProjectGamma42';
  const secret = 'SYNTHSECRET123';
  const privateIdentity = 'PrivateClientGamma42';
  const { document } = createAssociatedPickerDocument({
    sections: [
      {
        label: privateTitle,
        tokens: [
          'Authorization: ******',
          { title: `connectionKey=${secret}`, description: `No header fallback ${privateTitle} ${secret}` },
        ],
      },
    ],
  });
  const privateSection = document.body.querySelector('.msla-token-picker-section');
  if (privateSection) {
    privateSection.attributes['data-automation-id'] = privateIdentity;
    privateSection.attributes.role = privateIdentity;
  }

  const snapshot = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    editor: { labels: ['Body'] },
    picker: { sectionLabels: [privateTitle], tokenTitles: ['Missing requested title'] },
  });
  const metadata = buildScreenshotMetadata({
    checkpoint: 'picker-diagnostics',
    phase: 'designerPanel',
    classification: 'diagnostic',
    verdict: 'failed',
    targetId: 'target',
    frameId: 'frame',
    generation: 1,
    timeoutMs: 15000,
    elapsedMs: 15000,
    samples: [snapshot],
    captureAttempts: 0,
    events: [{ name: 'readiness-timeout', elapsedMs: 15000, details: snapshot.details }],
  });
  const serialized = JSON.stringify(metadata).toLowerCase();
  const eventPicker = metadata.events?.[0]?.details?.picker as
    | {
        strictSectionMatch?: boolean;
        looseSectionMatch?: boolean;
        strictRequestedTitlesMatch?: boolean;
        looseRequestedTitlesMatch?: boolean;
        strictSections?: Array<{ headerPresent?: boolean; matchedSectionLabelIndices?: number[]; matchedRequestedTitleIndices?: number[] }>;
      }
    | undefined;

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('picker-token-missing'));
  assert.ok(!serialized.includes(privateTitle.toLowerCase()), serialized);
  assert.ok(!serialized.includes('confidential_clientprojectgamma42'), serialized);
  assert.ok(!serialized.includes(secret.toLowerCase()), serialized);
  assert.ok(!serialized.includes(`connectionkey_${secret.toLowerCase()}`), serialized);
  assert.ok(!serialized.includes(privateIdentity.toLowerCase()), serialized);
  assert.ok(!serialized.includes('privateclientgamma42'), serialized);
  assert.strictEqual(eventPicker?.strictSectionMatch, false);
  assert.strictEqual(eventPicker?.looseSectionMatch, false);
  assert.strictEqual(eventPicker?.strictRequestedTitlesMatch, false);
  assert.strictEqual(eventPicker?.looseRequestedTitlesMatch, false);
  assert.strictEqual(eventPicker?.strictSections?.length, 0);
}
function testCreateWorkspaceRejectsWrongExactValidationMessage(): void {
  const document = createWorkspaceDocument([
    fieldWithInput({
      label: 'Workspace name',
      value: '',
      describedBy: 'workspace-name-error',
      ariaInvalid: 'true',
      errorText: 'A different error',
    }),
  ]);

  const snapshot = runProbe(document, {
    kind: 'createWorkspace',
    label: 'workspace-name-required',
    stage: 'validation',
    fields: [{ labels: ['Workspace name'], validationMessage: 'Workspace name is required' }],
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('create-workspace-field-validation-mismatch'));
}

function testCreateWorkspaceRejectsHiddenValidationMessage(): void {
  const document = createWorkspaceDocument([
    fieldWithInput({
      label: 'Workspace name',
      value: '',
      describedBy: 'workspace-name-error',
      ariaInvalid: 'true',
      errorText: 'Workspace name is required',
      errorAttributes: { 'aria-hidden': 'true' },
    }),
  ]);

  const snapshot = runProbe(document, {
    kind: 'createWorkspace',
    label: 'workspace-name-required',
    stage: 'validation',
    fields: [{ labels: ['Workspace name'], validationMessage: 'Workspace name is required' }],
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('create-workspace-field-validation-mismatch'));
}

function testCreateWorkspaceRequiresActualControlValue(): void {
  const document = createWorkspaceDocument([
    new FakeElement(
      'div',
      { class: 'ms-TextField' },
      [new FakeInputElement('input', { 'aria-label': 'Workspace name', value: 'wrong' })],
      'Workspace name Suggested: expected-name'
    ),
  ]);

  const snapshot = runProbe(document, {
    kind: 'createWorkspace',
    label: 'workspace-name-valid',
    stage: 'fields-valid',
    fields: [{ labels: ['Workspace name'], value: 'expected-name' }],
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('create-workspace-field-value-mismatch'));
}

function testCreateWorkspaceRejectsPendingPathValidation(): void {
  const pendingDocument = createWorkspaceDocument([
    fieldWithInput({
      label: 'Workspace parent folder path',
      value: 'C:\\workspace',
      describedBy: 'workspace-path-status',
      errorText: 'Validating path...',
      errorAttributes: { id: 'workspace-path-status', role: 'status' },
    }),
    new FakeElement('button', {}, [], 'Validating...'),
    new FakeElement('button', {}, [], 'Next'),
  ]);
  const settledDocument = createWorkspaceDocument([
    fieldWithInput({ label: 'Workspace parent folder path', value: 'C:\\workspace' }),
    new FakeElement('button', {}, [], 'Browse...'),
    new FakeElement('button', {}, [], 'Next'),
  ]);

  const expectation: ScreenshotExpectation = {
    kind: 'createWorkspace',
    label: 'create-workspace-fields-valid',
    stage: 'fields-valid',
    fields: [{ labels: ['Workspace parent folder path'], value: 'C:\\workspace' }],
    nextButton: 'enabled',
  };
  const rejected = runProbe(pendingDocument, expectation);
  const accepted = runProbe(settledDocument, expectation);

  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
  assert.ok(rejected.reasonCodes.includes('create-workspace-validation-pending'));
  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
}

function testCreateWorkspaceRejectsFooterClippedFieldControl(): void {
  const input = new FakeInputElement('input', { 'aria-label': 'Workspace parent folder path', value: 'C:\\workspace' });
  input.bounds = { left: 32, top: 382, width: 520, height: 32, right: 552, bottom: 414 };
  const field = new FakeElement('div', { class: 'ms-TextField' }, [input], 'Workspace parent folder path');
  field.bounds = { left: 24, top: 352, width: 540, height: 64, right: 564, bottom: 416 };
  const footer = new FakeElement('footer', { class: 'wizard-footer' }, [], 'Next');
  footer.bounds = { left: 0, top: 392, width: 714, height: 22, right: 714, bottom: 414 };
  const document = createWorkspaceDocument([field, footer]);

  const snapshot = runProbe(
    document,
    {
      kind: 'createWorkspace',
      label: 'create-workspace-top-clipped',
      stage: 'scrolled',
      fields: [{ labels: ['Workspace parent folder path'], value: 'C:\\workspace' }],
    },
    {
      window: {
        innerWidth: 714,
        innerHeight: 414,
        devicePixelRatio: 1,
        scrollY: 0,
        getComputedStyle: getComputedStyleForFakeElement,
      },
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('create-workspace-field-clipped'));
}

function testCreateWorkspaceRejectsOutputPanelClippedFieldControl(): void {
  const input = new FakeInputElement('input', { 'aria-label': 'Workspace parent folder path', value: 'C:\\workspace' });
  input.bounds = { left: 32, top: 350, width: 620, height: 32, right: 652, bottom: 382 };
  const field = new FakeElement('div', { class: 'ms-TextField' }, [input], 'Workspace parent folder path');
  field.bounds = { left: 24, top: 320, width: 640, height: 64, right: 664, bottom: 384 };
  const scrollContainer = new FakeElement('main', {}, [
    new FakeElement('h1', {}, [], 'Create logic app workspace'),
    field,
    new FakeElement('button', {}, [], 'Next'),
  ]);
  scrollContainer.bounds = { left: 0, top: 200, width: 846, height: 160, right: 846, bottom: 360 };
  scrollContainer.clientHeight = 160;
  scrollContainer.scrollHeight = 480;
  const document = new FakeDocument(new FakeElement('body', {}, [scrollContainer]));

  const snapshot = runProbe(
    document,
    {
      kind: 'createWorkspace',
      label: 'create-workspace-output-panel-clipped',
      stage: 'scrolled',
      fields: [{ labels: ['Workspace parent folder path'], value: 'C:\\workspace' }],
    },
    {
      window: {
        innerWidth: 846,
        innerHeight: 435,
        devicePixelRatio: 1,
        scrollY: 0,
        getComputedStyle: getComputedStyleForFakeElement,
      },
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('create-workspace-field-clipped'));
}

function testCreateWorkspaceAcceptsFullyVisibleAnchoredFieldControl(): void {
  const input = new FakeInputElement('input', { 'aria-label': 'Workspace parent folder path', value: 'C:\\workspace' });
  input.bounds = { left: 32, top: 214, width: 520, height: 32, right: 552, bottom: 246 };
  const field = new FakeElement('div', { class: 'ms-TextField' }, [input], 'Workspace parent folder path');
  field.bounds = { left: 24, top: 184, width: 540, height: 64, right: 564, bottom: 248 };
  const footer = new FakeElement('footer', { class: 'wizard-footer' }, [], 'Next');
  footer.bounds = { left: 0, top: 392, width: 714, height: 22, right: 714, bottom: 414 };
  const document = createWorkspaceDocument([field, footer]);

  const snapshot = runProbe(
    document,
    {
      kind: 'createWorkspace',
      label: 'create-workspace-top-anchored',
      stage: 'scrolled',
      fields: [{ labels: ['Workspace parent folder path'], value: 'C:\\workspace' }],
    },
    {
      window: {
        innerWidth: 714,
        innerHeight: 414,
        devicePixelRatio: 1,
        scrollY: 0,
        getComputedStyle: getComputedStyleForFakeElement,
      },
    }
  );

  assert.strictEqual(snapshot.ready, true, JSON.stringify(snapshot));
}

function testCreateWorkspaceRejectsClippedFunctionNameFieldControl(): void {
  const input = new FakeInputElement('input', { 'aria-label': 'Function name', value: 'WeatherFunction' });
  input.bounds = { left: 32, top: 382, width: 520, height: 32, right: 552, bottom: 414 };
  const field = new FakeElement('div', { class: 'ms-TextField' }, [input], 'Function name');
  field.bounds = { left: 24, top: 352, width: 540, height: 64, right: 564, bottom: 416 };
  const footer = new FakeElement('footer', { class: 'wizard-footer' }, [], 'Next');
  footer.bounds = { left: 0, top: 392, width: 714, height: 22, right: 714, bottom: 414 };
  const document = createWorkspaceDocument([field, footer]);

  const snapshot = runProbe(
    document,
    {
      kind: 'createWorkspace',
      label: 'create-workspace-custom-code-function-name',
      stage: 'scrolled',
      fields: [{ labels: ['Function name'], value: 'WeatherFunction' }],
      nextButton: 'enabled',
    },
    {
      window: {
        innerWidth: 714,
        innerHeight: 414,
        devicePixelRatio: 1,
        scrollY: 0,
        getComputedStyle: getComputedStyleForFakeElement,
      },
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('create-workspace-field-clipped'));
}

function testCreateWorkspaceAcceptsCenteredFunctionNameFieldControl(): void {
  const input = new FakeInputElement('input', { 'aria-label': 'Function name', value: 'WeatherFunction' });
  input.bounds = { left: 32, top: 214, width: 520, height: 32, right: 552, bottom: 246 };
  const field = new FakeElement('div', { class: 'ms-TextField' }, [input], 'Function name');
  field.bounds = { left: 24, top: 184, width: 540, height: 64, right: 564, bottom: 248 };
  const footer = new FakeElement('footer', { class: 'wizard-footer' }, [], 'Next');
  footer.bounds = { left: 0, top: 392, width: 714, height: 22, right: 714, bottom: 414 };
  const document = createWorkspaceDocument([field, footer]);

  const snapshot = runProbe(
    document,
    {
      kind: 'createWorkspace',
      label: 'create-workspace-custom-code-function-name',
      stage: 'scrolled',
      fields: [{ labels: ['Function name'], value: 'WeatherFunction' }],
      nextButton: 'enabled',
    },
    {
      window: {
        innerWidth: 714,
        innerHeight: 414,
        devicePixelRatio: 1,
        scrollY: 0,
        getComputedStyle: getComputedStyleForFakeElement,
      },
    }
  );

  assert.strictEqual(snapshot.ready, true, JSON.stringify(snapshot));
}

function testCreateWorkspaceRejectsWrongFunctionNameFieldValue(): void {
  const input = new FakeInputElement('input', { 'aria-label': 'Function name', value: 'OtherFunction' });
  input.bounds = { left: 32, top: 214, width: 520, height: 32, right: 552, bottom: 246 };
  const field = new FakeElement('div', { class: 'ms-TextField' }, [input], 'Function name');
  field.bounds = { left: 24, top: 184, width: 540, height: 64, right: 564, bottom: 248 };
  const document = createWorkspaceDocument([field]);

  const snapshot = runProbe(
    document,
    {
      kind: 'createWorkspace',
      label: 'create-workspace-custom-code-function-name',
      stage: 'scrolled',
      fields: [{ labels: ['Function name'], value: 'WeatherFunction' }],
      nextButton: 'enabled',
    },
    {
      window: {
        innerWidth: 714,
        innerHeight: 414,
        devicePixelRatio: 1,
        scrollY: 0,
        getComputedStyle: getComputedStyleForFakeElement,
      },
    }
  );

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('create-workspace-field-value-mismatch'));
}

function testCreateWorkspaceRequiresEnabledCreateButton(): void {
  const document = createWorkspaceDocument([
    new FakeElement('div', {}, [], 'Workspace name Workflow name'),
    new FakeElement('button', {}, [], 'Create workspace'),
  ]);

  const accepted = runProbe(document, {
    kind: 'createWorkspace',
    label: 'create-workspace-review',
    stage: 'review',
    createButton: 'enabled',
  });
  const rejected = runProbe(document, {
    kind: 'createWorkspace',
    label: 'create-workspace-review',
    stage: 'review',
    createButton: 'disabled',
  });

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
}

function testCreateWorkspaceRequiresScrollPosition(): void {
  const scrollable = new FakeElement(
    'main',
    {},
    [new FakeElement('button', {}, [], 'Next')],
    'Create logic app workspace Workspace parent folder path'
  );
  scrollable.clientHeight = 100;
  scrollable.scrollHeight = 400;
  scrollable.scrollTop = 300;
  const document = new FakeDocument(new FakeElement('body', {}, [scrollable]));

  const accepted = runProbe(document, {
    kind: 'createWorkspace',
    label: 'create-workspace-scrolled-bottom',
    stage: 'scrolled',
    scrollPosition: 'bottom',
  });
  const rejected = runProbe(document, {
    kind: 'createWorkspace',
    label: 'create-workspace-scrolled-bottom',
    stage: 'scrolled',
    scrollPosition: 'top',
  });

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
}

function testOverviewRequiresStatusOnExpectedRunRow(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      new FakeElement('main', {}, [
        new FakeElement('h1', {}, [], 'Workflow overview wf'),
        new FakeElement('button', {}, [], 'Run trigger'),
        new FakeElement('tr', {}, [], 'old-run Succeeded'),
        new FakeElement('tr', {}, [], 'expected-run Running'),
      ]),
    ])
  );

  const snapshot = runProbe(document, {
    kind: 'overview',
    label: 'expected-run-succeeded',
    workflowName: 'wf',
    runName: 'expected-run',
    runStatus: 'Succeeded',
  });

  assert.strictEqual(snapshot.ready, false, JSON.stringify(snapshot));
  assert.ok(snapshot.reasonCodes.includes('overview-state-missing'));
}

function testOverviewRejectsStatusFromRunListWrapper(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      new FakeElement('main', {}, [
        new FakeElement('h1', {}, [], 'Workflow overview wf'),
        new FakeElement('button', {}, [], 'Run trigger'),
        new FakeElement('div', { class: 'run-history-list' }, [
          new FakeElement('div', { role: 'row' }, [], 'old-run Succeeded'),
          new FakeElement('div', { role: 'row' }, [], 'expected-run Running'),
        ]),
      ]),
    ])
  );

  const rejected = runProbe(document, {
    kind: 'overview',
    label: 'expected-run-succeeded',
    workflowName: 'wf',
    runName: 'expected-run',
    runStatus: 'Succeeded',
  });
  const accepted = runProbe(document, {
    kind: 'overview',
    label: 'expected-run-running',
    workflowName: 'wf',
    runName: 'expected-run',
    runStatus: 'Running',
  });

  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
}

function testDiscoveryRequiresVisibleDiscoveryPanel(): void {
  const rejected = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', { class: 'react-flow' }, [new FakeElement('div', { class: 'msla-card' }, [], 'Search')]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Search',
    }
  );
  const accepted = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { class: 'msla-recommendation-panel' }, [
          new FakeInputElement('input', { 'aria-label': 'Search' }),
          new FakeElement('div', {}, [], 'Add an action Search'),
        ]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Search',
    }
  );
  const acceptedFluentPicker = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { class: 'msla-panel-root-Discovery' }, [
          new FakeElement('h2', {}, [], 'Add a trigger'),
          new FakeElement('div', { 'data-automation-id': 'msla-search-box' }, [
            new FakeInputElement('input', {
              'aria-label': 'Search for a trigger or connector',
              placeholder: 'Search for a trigger or connector',
              value: 'Request',
            }),
          ]),
          new FakeElement('div', {}, [], 'Built-in tools Request HTTP Schedule'),
        ]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Request',
    }
  );
  const acceptedAriaHiddenFluentPicker = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { class: 'msla-panel-root-Discovery', 'aria-hidden': 'true' }, [
          new FakeElement('h2', {}, [], 'Add a trigger'),
          new FakeElement('div', { 'data-automation-id': 'msla-search-box' }, [
            new FakeInputElement('input', {
              'aria-label': 'Search for a trigger or connector',
              placeholder: 'Search for a trigger or connector',
              value: 'Request',
            }),
          ]),
          new FakeElement('div', {}, [], 'Built-in tools Request HTTP Schedule'),
        ]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Request',
    }
  );
  const rejectedTransparentAncestor = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { style: 'opacity: 0' }, [
          new FakeElement('section', { class: 'msla-panel-root-Discovery' }, [
            new FakeElement('h2', {}, [], 'Add a trigger'),
            new FakeElement('div', { 'data-automation-id': 'msla-search-box' }, [
              new FakeInputElement('input', {
                'aria-label': 'Search for a trigger or connector',
                placeholder: 'Search for a trigger or connector',
                value: 'Request',
              }),
            ]),
            new FakeElement('div', {}, [], 'Built-in tools Request HTTP Schedule'),
          ]),
        ]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Request',
    }
  );
  const rejectedStylesheetTransparentAncestor = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { 'data-computed-opacity': '0' }, [
          new FakeElement('section', { class: 'msla-panel-root-Discovery' }, [
            new FakeElement('h2', {}, [], 'Add a trigger'),
            new FakeElement('div', { 'data-automation-id': 'msla-search-box' }, [
              new FakeInputElement('input', {
                'aria-label': 'Search for a trigger or connector',
                placeholder: 'Search for a trigger or connector',
                value: 'Request',
              }),
            ]),
            new FakeElement('div', {}, [], 'Built-in tools Request HTTP Schedule'),
          ]),
        ]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Request',
    }
  );
  const rejectedCascadeTransparentAncestor = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { style: 'opacity: 1; opacity: 0' }, [
          new FakeElement('section', { class: 'msla-panel-root-Discovery' }, [
            new FakeElement('h2', {}, [], 'Add a trigger'),
            new FakeElement('div', { 'data-automation-id': 'msla-search-box' }, [
              new FakeInputElement('input', {
                'aria-label': 'Search for a trigger or connector',
                placeholder: 'Search for a trigger or connector',
                value: 'Request',
              }),
            ]),
            new FakeElement('div', {}, [], 'Built-in tools Request HTTP Schedule'),
          ]),
        ]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Request',
    }
  );
  const acceptedCascadeVisibleAncestor = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { style: 'opacity: 0; opacity: 1' }, [
          new FakeElement('section', { class: 'msla-panel-root-Discovery' }, [
            new FakeElement('h2', {}, [], 'Add a trigger'),
            new FakeElement('div', { 'data-automation-id': 'msla-search-box' }, [
              new FakeInputElement('input', {
                'aria-label': 'Search for a trigger or connector',
                placeholder: 'Search for a trigger or connector',
                value: 'Request',
              }),
            ]),
            new FakeElement('div', {}, [], 'Built-in tools Request HTTP Schedule'),
          ]),
        ]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Request',
    }
  );
  const acceptedSearchboxRoot = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeInputElement('input', {
          'data-automation-id': 'msla-search-box',
          'aria-label': 'Search for a trigger or connector',
          placeholder: 'Search for a trigger or connector',
          value: 'Request',
        }),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
      searchText: 'Request',
    }
  );
  const unrelatedDialog = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('section', { role: 'dialog' }, [new FakeElement('div', {}, [], 'Unrelated confirmation')]),
      ])
    ),
    {
      kind: 'discovery',
      label: 'operation-search',
    }
  );

  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
  assert.ok(rejected.reasonCodes.includes('discovery-state-missing'));
  assert.strictEqual(unrelatedDialog.ready, false, JSON.stringify(unrelatedDialog));
  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(acceptedFluentPicker.ready, true, JSON.stringify(acceptedFluentPicker));
  assert.strictEqual(acceptedAriaHiddenFluentPicker.ready, true, JSON.stringify(acceptedAriaHiddenFluentPicker));
  assert.strictEqual(rejectedTransparentAncestor.ready, false, JSON.stringify(rejectedTransparentAncestor));
  assert.strictEqual(rejectedStylesheetTransparentAncestor.ready, false, JSON.stringify(rejectedStylesheetTransparentAncestor));
  assert.strictEqual(rejectedCascadeTransparentAncestor.ready, false, JSON.stringify(rejectedCascadeTransparentAncestor));
  assert.strictEqual(acceptedCascadeVisibleAncestor.ready, true, JSON.stringify(acceptedCascadeVisibleAncestor));
  assert.strictEqual(acceptedSearchboxRoot.ready, true, JSON.stringify(acceptedSearchboxRoot));
}

function testAmbiguousSelectedPanelsRejected(): void {
  const document = new FakeDocument(
    new FakeElement('body', {}, [
      monitoringPanel({ title: 'Response', nodeId: 'Response', valueText: 'Status Succeeded Outputs response payload' }),
      monitoringPanel({ title: 'Response', nodeId: 'Response', valueText: 'Status Succeeded Outputs duplicate payload' }),
    ])
  );

  const snapshot = runProbe(document, {
    kind: 'monitoringAction',
    label: 'response-result-opened',
    actionTitle: 'Response',
    expectedStatus: 'Succeeded',
  });

  assert.strictEqual(snapshot.ready, false);
  assert.ok(snapshot.reasonCodes.includes('selected-panel-ambiguous'));
}

function testUnrelatedMutationDoesNotInvalidateScopedRoot(): void {
  const scopedPanel = monitoringPanel({ title: 'Response', nodeId: 'Response', valueText: 'Status Succeeded Outputs response payload' });
  const unrelated = new FakeElement('section', { class: 'terminal-clock' }, [], '12:00:00');
  const document = new FakeDocument(new FakeElement('body', {}, [scopedPanel, unrelated]));
  const observerCallbacks: Array<(mutations: Array<{ type: string; target: FakeElement }>) => void> = [];
  const context: Record<string, unknown> = {
    document,
    window: {
      innerWidth: 1200,
      innerHeight: 800,
      devicePixelRatio: 1,
      scrollY: 0,
      getComputedStyle: getComputedStyleForFakeElement,
    },
    globalThis: undefined,
    HTMLElement: FakeElement,
    HTMLInputElement: FakeInputElement,
    HTMLButtonElement: FakeElement,
    MutationObserver: class {
      observe(): void {}
      disconnect(): void {}
      constructor(callback: (mutations: Array<{ type: string; target: FakeElement }>) => void) {
        observerCallbacks.push(callback);
      }
    },
    getComputedStyle: getComputedStyleForFakeElement,
  };
  context.globalThis = context;

  vm.runInNewContext(installScreenshotInvalidationLatchExpression, context);
  runProbe(
    document,
    { kind: 'monitoringAction', label: 'response-result-opened', actionTitle: 'Response', expectedStatus: 'Succeeded' },
    context
  );
  const state = context.__logicAppsScreenshotInvalidation as { revision: number };
  const scopedRevision = state.revision;
  for (const observerCallback of observerCallbacks) {
    observerCallback([{ type: 'characterData', target: unrelated }]);
  }
  assert.strictEqual(state.revision, scopedRevision, 'unrelated terminal/text changes must not invalidate the selected panel capture');
}

function testAncestorVisibilityMutationInvalidatesScopedRoot(): void {
  const scopedPanel = monitoringPanel({ title: 'Response', nodeId: 'Response', valueText: 'Status Succeeded Outputs response payload' });
  const wrapper = new FakeElement('section', { class: 'webview-overlay-content' }, [scopedPanel]);
  const document = new FakeDocument(new FakeElement('body', {}, [wrapper]));
  const observerCallbacks: Array<(mutations: Array<{ type: string; target: FakeElement }>) => void> = [];
  const context = createLatchContext(document, observerCallbacks);

  vm.runInNewContext(installScreenshotInvalidationLatchExpression, context);
  runProbe(
    document,
    { kind: 'monitoringAction', label: 'response-result-opened', actionTitle: 'Response', expectedStatus: 'Succeeded' },
    context
  );
  const state = context.__logicAppsScreenshotInvalidation as { revision: number };
  const scopedRevision = state.revision;
  wrapper.attributes.style = 'visibility: hidden';
  for (const observerCallback of observerCallbacks) {
    observerCallback([{ type: 'attributes', target: wrapper }]);
  }

  assert.ok(state.revision > scopedRevision, 'ancestor visibility changes must invalidate the selected panel capture');
}

function testRootDetachMutationInvalidatesScopedRoot(): void {
  const scopedPanel = monitoringPanel({ title: 'Response', nodeId: 'Response', valueText: 'Status Succeeded Outputs response payload' });
  const wrapper = new FakeElement('section', { class: 'webview-overlay-content' }, [scopedPanel]);
  const document = new FakeDocument(new FakeElement('body', {}, [wrapper]));
  const observerCallbacks: Array<(mutations: Array<{ type: string; target: FakeElement; removedNodes?: FakeElement[] }>) => void> = [];
  const context = createLatchContext(document, observerCallbacks);

  vm.runInNewContext(installScreenshotInvalidationLatchExpression, context);
  runProbe(
    document,
    { kind: 'monitoringAction', label: 'response-result-opened', actionTitle: 'Response', expectedStatus: 'Succeeded' },
    context
  );
  const state = context.__logicAppsScreenshotInvalidation as { revision: number };
  const scopedRevision = state.revision;
  scopedPanel.parentElement = undefined;
  for (const observerCallback of observerCallbacks) {
    observerCallback([{ type: 'childList', target: wrapper, removedNodes: [scopedPanel] }]);
  }

  assert.ok(state.revision > scopedRevision, 'root detach/reattach changes must invalidate the selected panel capture');
}

function testWorkbenchShellMixedBatchStructuralMutationInvalidates(): void {
  const outputPane = new FakeElement('section', { class: 'output-pane' }, [], 'C# output');
  const workbenchShell = new FakeElement('div', { class: 'monaco-workbench' }, [
    new FakeElement('div', { id: 'workbench.parts.activitybar' }, [], 'Accounts'),
    new FakeElement('div', { id: 'workbench.parts.editor' }, [], 'No folder opened'),
    outputPane,
  ]);
  const document = new FakeDocument(new FakeElement('body', {}, [workbenchShell]));
  const observers: Array<{
    callback: (mutations: Array<{ type: string; target: FakeElement }>) => void;
    targets: FakeElement[];
  }> = [];
  const context: Record<string, unknown> = {
    document,
    window: {
      innerWidth: 1200,
      innerHeight: 800,
      devicePixelRatio: 1,
      scrollY: 0,
      getComputedStyle: getComputedStyleForFakeElement,
    },
    globalThis: undefined,
    HTMLElement: FakeElement,
    HTMLInputElement: FakeInputElement,
    HTMLButtonElement: FakeElement,
    MutationObserver: class {
      readonly targets: FakeElement[] = [];

      observe(target: FakeElement): void {
        this.targets.push(target);
      }

      disconnect(): void {}

      constructor(readonly callback: (mutations: Array<{ type: string; target: FakeElement }>) => void) {
        observers.push(this);
      }
    },
    getComputedStyle: getComputedStyleForFakeElement,
  };
  context.globalThis = context;

  vm.runInNewContext(installScreenshotInvalidationLatchExpression, context);
  runProbe(document, { kind: 'workbenchShell', label: 'empty-window-startup' }, context);
  const state = context.__logicAppsScreenshotInvalidation as { structuralRevision: number };
  const structuralRevision = state.structuralRevision;
  const rootObserver = observers.find((observer) => observer.targets.includes(workbenchShell));
  assert.ok(rootObserver, 'expected latch to observe the workbench shell root');

  rootObserver.callback([
    { type: 'childList', target: outputPane },
    { type: 'attributes', target: workbenchShell },
  ]);

  assert.ok(state.structuralRevision > structuralRevision, 'mixed output child-list + shell root attributes must invalidate shell capture');
}

function createLatchContext(
  document: FakeDocument,
  observerCallbacks: Array<
    (mutations: Array<{ type: string; target: FakeElement; removedNodes?: FakeElement[]; addedNodes?: FakeElement[] }>) => void
  >
): Record<string, unknown> {
  const context: Record<string, unknown> = {
    document,
    window: {
      innerWidth: 1200,
      innerHeight: 800,
      devicePixelRatio: 1,
      scrollY: 0,
      getComputedStyle: getComputedStyleForFakeElement,
    },
    globalThis: undefined,
    HTMLElement: FakeElement,
    HTMLInputElement: FakeInputElement,
    HTMLButtonElement: FakeElement,
    MutationObserver: class {
      observe(): void {}
      disconnect(): void {}
      constructor(callback: (mutations: Array<{ type: string; target: FakeElement }>) => void) {
        observerCallbacks.push(callback);
      }
    },
    getComputedStyle: getComputedStyleForFakeElement,
  };
  context.globalThis = context;
  return context;
}

function testStableSamplesRequireSameGeometry(): void {
  const base: ScreenshotReadinessSnapshot = {
    ready: true,
    reasonCodes: ['ok'],
    blockers: [],
    anchors: [{ name: 'body', visible: true, bounds: { left: 0, top: 0, width: 100, height: 100 } }],
    viewport: { width: 100, height: 100, deviceScaleFactor: 1 },
    counts: { loaders: 0 },
    generation: 1,
    revision: 1,
    scrollY: 0,
    expectationKind: 'workbenchShell',
  };

  assert.strictEqual(isStableScreenshotSample(base, { ...base }), true);
  assert.strictEqual(
    isStableScreenshotSample(base, {
      ...base,
      anchors: [{ name: 'body', visible: true, bounds: { left: 0, top: 1, width: 100, height: 100 } }],
    }),
    false
  );
  assert.strictEqual(isStableScreenshotSample(base, { ...base, viewport: { ...base.viewport, width: 458 } }), false);
}

function testWorkbenchShellStabilityAllowsUnrelatedWorkbenchChurn(): void {
  const base: ScreenshotReadinessSnapshot = {
    ready: true,
    reasonCodes: ['workbench-shell-visible'],
    blockers: [],
    anchors: [{ name: 'body', visible: true, bounds: { left: 0, top: 0, width: 100, height: 100 } }],
    viewport: { width: 100, height: 100, deviceScaleFactor: 1 },
    counts: { loaders: 0, documentLoaders: 0, buttons: 1 },
    generation: 1,
    revision: 1,
    structuralRevision: 1,
    scrollY: 0,
    expectationKind: 'workbenchShell',
  };

  assert.strictEqual(
    isStableScreenshotSample(base, {
      ...base,
      counts: { loaders: 0, documentLoaders: 0, buttons: 2 },
      revision: 5,
      structuralRevision: 1,
    }),
    true
  );
}

function testWorkbenchShellStabilityRejectsStructuralShellChurn(): void {
  const base: ScreenshotReadinessSnapshot = {
    ready: true,
    reasonCodes: ['workbench-shell-visible'],
    blockers: [],
    anchors: [{ name: 'workbenchShell', visible: true, bounds: { left: 0, top: 0, width: 100, height: 100 } }],
    viewport: { width: 100, height: 100, deviceScaleFactor: 1 },
    counts: { workbenchShellParts: 3, documentLoaders: 0 },
    generation: 1,
    revision: 1,
    structuralRevision: 1,
    scrollY: 0,
    expectationKind: 'workbenchShell',
  };

  assert.strictEqual(
    isStableScreenshotSample(base, {
      ...base,
      revision: 5,
      structuralRevision: 2,
    }),
    false
  );
}

function testMetadataDoesNotCarryRawText(): void {
  const metadata = buildScreenshotMetadata({
    checkpoint: 'create-workspace-standard-review',
    phase: 'createWorkspace',
    classification: 'evidence',
    verdict: 'accepted',
    targetId: 'vscode-webview://contains-sensitive-looking-url',
    frameId: 'frame-with-absolute-path-C:\\temp\\workspace',
    generation: 2,
    timeoutMs: 15000,
    elapsedMs: 250,
    captureAttempts: 1,
    events: [
      {
        name: 'rejected',
        elapsedMs: 10,
        details: {
          targetUrl: 'vscode-webview://contains-sensitive-looking-url',
          workspacePath: 'C:\\temp\\workspace',
        },
      },
    ],
    samples: [
      {
        ready: true,
        reasonCodes: ['ok'],
        blockers: [],
        anchors: [{ name: 'body', visible: true, bounds: { left: 0, top: 0, width: 800, height: 600 } }],
        viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
        counts: { loaders: 0 },
        generation: 2,
        revision: 1,
        scrollY: 0,
        expectationKind: 'createWorkspace',
      },
    ],
  });

  const serialized = JSON.stringify(metadata);
  assert.ok(!serialized.includes('vscode-webview://'));
  assert.ok(!serialized.includes('C:\\temp\\workspace'));
  assert.ok(serialized.includes('opaqueTargetId'));
  assert.ok(serialized.includes('targetUrl'));
  assert.ok(serialized.includes('workspacePath'));
}

function testMetadataRedactsEmbeddedSecretValues(): void {
  const secret = 'SENTINELSECRET123';
  const metadata = buildScreenshotMetadata({
    checkpoint: 'secret-metadata',
    phase: 'failed',
    classification: 'diagnostic',
    verdict: 'failed',
    targetId: 'target',
    frameId: 'frame',
    generation: 1,
    elapsedMs: 0,
    timeoutMs: 1000,
    events: [
      {
        name: 'readiness-unavailable',
        elapsedMs: 10,
        details: {
          message: `Authorization: Bearer ${secret}`,
          runtime: `connectionRuntimeUrl=https://example.invalid/runtime/${secret}`,
          signed: `https://example.invalid/path?sig=${secret}&ok=true`,
          connectionKey: secret,
          sig: secret,
          designerCanvas: {
            missing: ['required-0'],
            matched: ['required-1'],
            covered: ['required-2'],
            scopedCounts: { canvasNodes: 4 },
          },
          benign: { nested: 'safe-value' },
        },
      },
    ],
    samples: [
      {
        ready: false,
        reasonCodes: ['fixture'],
        blockers: [],
        anchors: [],
        viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
        counts: {},
        details: {
          message: `Authorization: Bearer ${secret}`,
          runtime: `connectionRuntimeUrl=https://example.invalid/runtime/${secret}`,
          signed: `https://example.invalid/path?sig=${secret}&ok=true`,
          connectionKey: secret,
        },
        generation: 1,
        revision: 1,
        scrollY: 0,
        expectationKind: 'diagnostic',
      },
    ],
    captureAttempts: 0,
  });

  const serialized = JSON.stringify(metadata);
  assert.ok(!serialized.includes(secret), serialized);
  assert.ok(serialized.includes('safe-value'), serialized);
  const details = metadata.events?.[0]?.details as {
    designerCanvas?: { missing?: string[]; matched?: string[]; covered?: string[]; scopedCounts?: { canvasNodes?: number } };
    benign?: { nested?: string };
    sig?: string;
  };
  assert.deepStrictEqual(details?.designerCanvas?.missing, ['required-0']);
  assert.deepStrictEqual(details?.designerCanvas?.matched, ['required-1']);
  assert.deepStrictEqual(details?.designerCanvas?.covered, ['required-2']);
  assert.strictEqual(details?.designerCanvas?.scopedCounts?.canvasNodes, 4);
  assert.strictEqual(details?.benign?.nested, 'safe-value');
  assert.strictEqual(details?.sig, '[redacted]');
}

function runProbe(
  document: FakeDocument,
  expectation: ScreenshotExpectation,
  overrides: Record<string, unknown> = {}
): ScreenshotReadinessSnapshot {
  const expression = buildScreenshotReadinessExpression(expectation, 1, 1);
  return vm.runInNewContext(expression, {
    document,
    window: {
      innerWidth: 1200,
      innerHeight: 800,
      devicePixelRatio: 1,
      scrollY: 0,
      getComputedStyle: getComputedStyleForFakeElement,
    },
    HTMLElement: FakeElement,
    HTMLInputElement: FakeInputElement,
    HTMLButtonElement: FakeElement,
    getComputedStyle: getComputedStyleForFakeElement,
    ...overrides,
  }) as ScreenshotReadinessSnapshot;
}

function monitoringPanel(options: { title: string; nodeId: string; valueText: string }): FakeElement {
  return monitoringPanelWithSections({
    title: options.title,
    nodeId: options.nodeId,
    values: [{ prefix: 'outputs', text: options.valueText }],
  });
}

function monitoringPanelWithSections(options: {
  title: string;
  nodeId: string;
  values: Array<{ prefix: 'inputs' | 'outputs' | 'properties'; text: string }>;
}): FakeElement {
  return new FakeElement('section', { class: 'msla-panel-layout msla-panel-border-selected' }, [
    new FakeElement('div', { class: 'msla-panel-header' }, [
      new FakeInputElement('input', { 'aria-label': 'Card title', id: `${options.nodeId}-title`, value: options.title }),
    ]),
    new FakeElement('div', { id: `msla-node-details-panel-${options.nodeId}`, class: 'msla-panel-content-container' }, [
      ...options.values.map(
        (value) =>
          new FakeElement('div', { class: 'msla-trace-values', 'aria-labelledby': `${value.prefix}-${options.nodeId}` }, [], value.text)
      ),
    ]),
  ]);
}

function designerPanel(options: { title: string; nodeId: string; text: string; fields?: FakeElement[] }): FakeElement {
  return new FakeElement('section', { class: 'msla-panel-layout msla-panel-border-selected' }, [
    new FakeElement('div', { class: 'msla-panel-header' }, [
      new FakeInputElement('input', { 'aria-label': 'Card title', id: `${options.nodeId}-title`, value: options.title }),
    ]),
    new FakeElement('div', { id: `msla-node-details-panel-${options.nodeId}`, class: 'msla-panel-content-container' }, [
      ...(options.text ? [visibleSemanticText(options.text, 80)] : []),
      ...(options.fields ?? []),
    ]),
  ]);
}

function designerPanelWithVisibleHeader(options: {
  headerTitle: string;
  nodeId?: string;
  text: string;
  fields?: FakeElement[];
}): FakeElement {
  return new FakeElement('section', { class: 'msla-panel-layout msla-panel-border-selected' }, [
    new FakeElement('div', { class: 'msla-panel-header' }, [
      new FakeElement('div', { class: 'msla-panel-card-title-container' }, [
        new FakeElement('h2', { role: 'heading' }, [], options.headerTitle),
      ]),
    ]),
    new FakeElement(
      'div',
      {
        ...(options.nodeId ? { id: `msla-node-details-panel-${options.nodeId}` } : {}),
        class: 'msla-node-details-panel',
      },
      [...(options.text ? [visibleSemanticText(options.text, 80)] : []), ...(options.fields ?? [])]
    ),
  ]);
}

function visibleSemanticText(text: string, top: number): FakeElement {
  const element = new FakeElement('span', {}, [], text);
  element.bounds = { left: 20, top, width: 200, height: 20, right: 220, bottom: top + 20 };
  return element;
}

function visibleMethodControl(value: string): FakeInputElement {
  const control = new FakeInputElement('input', { 'aria-label': 'Method', value });
  control.bounds = { left: 20, top: 160, width: 260, height: 40, right: 280, bottom: 200 };
  return control;
}

function createAssociatedPickerDocument(options: {
  actionTitle?: string;
  nodeId?: string;
  editorLabel?: string;
  editorLabelId?: string;
  dialogLabelId?: string;
  includeEditor?: boolean;
  activeSearch?: boolean;
  hostStyle?: string;
  layerStyle?: string;
  layerWrapperStyle?: string;
  extraText?: string;
  editorContainerExtraText?: string;
  sections: Array<{ label: string; tokens: Array<string | { title: string; description?: string }> }>;
}): {
  document: FakeDocument;
  elements: {
    search: FakeElement;
    headers: FakeElement[];
    buttons: FakeElement[];
    titles: FakeElement[];
  };
} {
  const editorLabel = options.editorLabel ?? 'Body';
  const editorLabelId = options.editorLabelId ?? 'response-body-label';
  const editor = new FakeElement(
    'div',
    {
      id: 'response-body-editor',
      class: 'editor-input',
      role: 'textbox',
      contenteditable: 'true',
      'aria-labelledby': editorLabelId,
    },
    [],
    ''
  );
  const editorContainer = new FakeElement(
    'div',
    { id: 'msla-tokenpicker-callout-location-response-body', class: 'msla-editor-container' },
    [
      new FakeElement('label', { id: editorLabelId }, [], editorLabel),
      editor,
      new FakeElement('div', {}, [], options.editorContainerExtraText ?? ''),
    ]
  );
  const selectedPanel = designerPanel({
    title: options.actionTitle ?? 'Response',
    nodeId: options.nodeId ?? 'Response',
    text: editorLabel,
    fields: options.includeEditor === false ? [] : [editorContainer],
  });
  const search = new FakeInputElement('input', {
    id: 'picker-search',
    'data-automation-id': 'msla-token-picker-search',
    class: 'msla-token-picker-search',
    value: '',
  });
  const headers: FakeElement[] = [];
  const buttons: FakeElement[] = [];
  const titles: FakeElement[] = [];
  const sectionElements = options.sections.map((section, sectionIndex) => {
    const header = new FakeElement('div', { class: 'msla-token-picker-section-header' }, [], section.label);
    headers.push(header);
    const optionButtons = section.tokens.map((token, tokenIndex) => {
      const tokenTitle = typeof token === 'string' ? token : token.title;
      const tokenDescription = typeof token === 'string' ? '' : (token.description ?? '');
      const title = new FakeElement('div', { class: 'msla-token-picker-option-title' }, [], tokenTitle);
      const description = new FakeElement(
        'div',
        { class: 'msla-token-picker-option-description', title: tokenDescription },
        [],
        tokenDescription
      );
      const button = new FakeElement(
        'button',
        {
          class: 'msla-token-picker-section-option',
          'data-automation-id': `msla-token-picker-section-option-${tokenIndex}`,
        },
        [
          new FakeElement('div', { class: 'msla-token-picker-section-option-text' }, [
            new FakeElement('div', { class: 'msla-token-picker-option-inner' }, [title, description]),
          ]),
        ]
      );
      buttons.push(button);
      titles.push(title);
      return new FakeElement('li', {}, [button]);
    });
    return new FakeElement('section', { class: 'msla-token-picker-section', id: `picker-section-${sectionIndex}` }, [
      header,
      new FakeElement('ul', { class: 'msla-token-picker-section-options', 'aria-label': section.label }, optionButtons),
    ]);
  });
  const picker = new FakeElement('div', { class: 'msla-token-picker' }, [
    new FakeElement('div', { class: 'msla-token-picker-search-container' }, [search]),
    ...sectionElements,
  ]);
  const pickerContainer = new FakeElement('div', { class: 'msla-token-picker-container-v3' }, [picker]);
  const dialog = new FakeElement('div', { role: 'dialog', 'aria-labelledby': options.dialogLabelId ?? editorLabelId }, [pickerContainer]);
  const layerContent = new FakeElement('div', { class: 'ms-Layer-content', style: options.layerStyle ?? 'visibility: visible' }, [dialog]);
  const layerWrapper = new FakeElement('div', { class: 'ms-Layer', style: options.layerWrapperStyle ?? '' }, [layerContent]);
  const layerHost = new FakeElement('div', { id: 'msla-layer-host', style: options.hostStyle ?? 'visibility: hidden' }, [layerWrapper]);
  const document = new FakeDocument(
    new FakeElement('body', {}, [selectedPanel, layerHost, new FakeElement('div', { class: 'docs' }, [], options.extraText ?? '')])
  );
  document.activeElement = options.activeSearch === false ? editor : search;
  applyPickerGeometry({
    layerHost,
    layerWrapper,
    layerContent,
    dialog,
    pickerContainer,
    picker,
    search,
    sections: sectionElements,
    headers,
    buttons,
    titles,
  });
  return { document, elements: { search, headers, buttons, titles } };
}

function applyPickerGeometry(elements: {
  layerHost: FakeElement;
  layerWrapper: FakeElement;
  layerContent: FakeElement;
  dialog: FakeElement;
  pickerContainer: FakeElement;
  picker: FakeElement;
  search: FakeElement;
  sections: FakeElement[];
  headers: FakeElement[];
  buttons: FakeElement[];
  titles: FakeElement[];
}): void {
  setBounds(elements.layerHost, 0, 0, 800, 700);
  setBounds(elements.layerWrapper, 100, 80, 420, 560);
  setBounds(elements.layerContent, 100, 80, 420, 560);
  setBounds(elements.dialog, 100, 80, 420, 560);
  setBounds(elements.pickerContainer, 100, 80, 420, 560);
  setBounds(elements.picker, 100, 80, 420, 560);
  setBounds(elements.search, 120, 100, 360, 32);
  elements.sections.forEach((section, sectionIndex) => {
    const sectionTop = 150 + sectionIndex * 130;
    setBounds(section, 120, sectionTop, 360, 118);
    setBounds(elements.headers[sectionIndex], 120, sectionTop, 360, 32);
  });
  elements.buttons.forEach((button, index) => {
    const sectionIndex = Math.floor(index / 3);
    const optionIndex = index % 3;
    const top = 188 + sectionIndex * 130 + optionIndex * 34;
    setBounds(button, 130, top, 340, 30);
    setBounds(elements.titles[index], 140, top + 5, 200, 20);
  });
}

function setBounds(element: FakeElement, left: number, top: number, width: number, height: number): void {
  element.bounds = { left, top, width, height, right: left + width, bottom: top + height };
  element.offsetWidth = width;
  element.offsetHeight = height;
}

function createWorkspaceDocument(fields: FakeElement[]): FakeDocument {
  return new FakeDocument(
    new FakeElement('body', {}, [
      new FakeElement('main', {}, [
        new FakeElement('h1', {}, [], 'Create logic app workspace'),
        ...fields,
        new FakeElement('button', {}, [], 'Next'),
      ]),
    ])
  );
}

function fieldWithInput(options: {
  label: string;
  value: string;
  describedBy?: string;
  ariaInvalid?: string;
  errorText?: string;
  errorAttributes?: Record<string, string>;
}): FakeElement {
  const describedBy = options.describedBy ?? `${options.label.toLowerCase().replace(/\W+/g, '-')}-description`;
  return new FakeElement(
    'div',
    { class: 'ms-TextField' },
    [
      new FakeInputElement('input', {
        'aria-label': options.label,
        value: options.value,
        'aria-describedby': describedBy,
        'aria-invalid': options.ariaInvalid ?? 'false',
      }),
      new FakeElement('div', { id: describedBy, role: 'alert', ...(options.errorAttributes ?? {}) }, [], options.errorText ?? ''),
    ],
    options.label
  );
}

class FakeDocument {
  readonly documentElement = new FakeElement('html');
  readonly defaultView = { getComputedStyle: getComputedStyleForFakeElement };
  activeElement?: FakeElement;

  constructor(readonly body: FakeElement) {
    assignOwnerDocument(this.body, this);
    this.documentElement.ownerDocument = this;
  }

  querySelectorAll(selector: string): FakeElement[] {
    return this.body.querySelectorAll(selector);
  }

  getElementById(id: string): FakeElement | undefined {
    return this.body.allDescendants().find((element) => element.id === id);
  }

  elementFromPoint(x: number, y: number): FakeElement | undefined {
    const matches = this.body.allDescendants().filter((element) => {
      const rect = element.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
    const explicitlyPositioned = matches.filter((element) => element.bounds);
    if (explicitlyPositioned.length > 0) {
      return explicitlyPositioned.at(-1);
    }

    return matches.sort((a, b) => b.depth - a.depth)[0];
  }
}

function assignOwnerDocument(element: FakeElement, ownerDocument: FakeDocument): void {
  element.ownerDocument = ownerDocument;
  for (const child of element.children) {
    assignOwnerDocument(child, ownerDocument);
  }
}

class FakeElement {
  readonly style = {};
  ownerDocument?: FakeDocument;
  hidden = false;
  offsetWidth = 200;
  offsetHeight = 40;
  clientWidth = 200;
  clientHeight = 40;
  scrollWidth = 200;
  scrollHeight = 40;
  scrollTop = 0;
  isConnected = true;
  bounds?: { left: number; top: number; width: number; height: number; right: number; bottom: number };

  constructor(
    readonly tagName: string,
    readonly attributes: Record<string, string> = {},
    readonly children: FakeElement[] = [],
    readonly ownText = ''
  ) {
    this.id = attributes.id ?? '';
    for (const child of children) {
      child.parentElement = this;
      child.ownerDocument = this.ownerDocument;
    }
  }

  id: string;
  parentElement?: FakeElement;

  get depth(): number {
    let depth = 0;
    let current = this.parentElement;
    while (current) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }

  get textContent(): string {
    return `${this.ownText} ${this.children.map((child) => child.textContent).join(' ')}`.trim();
  }

  get innerText(): string {
    return this.textContent;
  }

  getClientRects(): unknown[] {
    return [this.getBoundingClientRect()];
  }

  getBoundingClientRect(): { left: number; top: number; width: number; height: number; right: number; bottom: number } {
    if (this.bounds) {
      return this.bounds;
    }
    if (hasClass(this, 'msla-panel-layout')) {
      return { left: 0, top: 0, width: 480, height: 320, right: 480, bottom: 320 };
    }
    return { left: 0, top: 0, width: this.offsetWidth, height: this.offsetHeight, right: this.offsetWidth, bottom: this.offsetHeight };
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  querySelector(selector: string): FakeElement | undefined {
    return this.querySelectorAll(selector)[0];
  }

  querySelectorAll(selector: string): FakeElement[] {
    const selectors = selector.split(',').map((value) => value.trim());
    return this.allDescendants().filter((element) => selectors.some((candidate) => matchesSelector(element, candidate)));
  }

  allDescendants(): FakeElement[] {
    return [this, ...this.children.flatMap((child) => child.allDescendants())];
  }

  contains(candidate: FakeElement): boolean {
    if (!candidate) {
      return false;
    }
    return this.allDescendants().includes(candidate);
  }

  matches(selector: string): boolean {
    return matchesSelector(this, selector);
  }
}

class FakeInputElement extends FakeElement {
  get value(): string {
    return this.attributes.value ?? '';
  }
}

function matchesSelector(element: FakeElement, selector: string): boolean {
  if (selector === '*') {
    return true;
  }
  const panelHeaderDescendant = selector.match(/^\.msla-panel-header\s+(.+)$/);
  if (panelHeaderDescendant && !panelHeaderDescendant[1].startsWith('input[')) {
    let ancestor = element.parentElement;
    while (ancestor && !hasClass(ancestor, 'msla-panel-header')) {
      ancestor = ancestor.parentElement;
    }
    return !!ancestor && matchesSelector(element, panelHeaderDescendant[1]);
  }
  if (selector === 'iframe') {
    return element.tagName === 'iframe';
  }
  if (selector === 'body') {
    return element.tagName === 'body';
  }
  if (selector === 'input' || selector === 'textarea') {
    return element.tagName === selector;
  }
  if (selector === '[contenteditable="true"]') {
    return element.getAttribute('contenteditable') === 'true';
  }
  if (selector === '[role="textbox"]') {
    return element.getAttribute('role') === 'textbox';
  }
  if (selector === '[role="combobox"]') {
    return element.getAttribute('role') === 'combobox';
  }
  if (selector === '.msla-panel-layout.msla-panel-border-selected') {
    return hasClass(element, 'msla-panel-layout') && hasClass(element, 'msla-panel-border-selected');
  }
  if (selector === '.msla-panel-header input[aria-label="Card title"]' || selector === '.msla-panel-header input[id$="-title"]') {
    return element instanceof FakeInputElement && element.parentElement ? hasClass(element.parentElement, 'msla-panel-header') : false;
  }
  if (selector === '[id^="msla-node-details-panel-"]') {
    return element.id.startsWith('msla-node-details-panel-');
  }
  if (selector === '.msla-panel-content-container') {
    return hasClass(element, 'msla-panel-content-container');
  }
  if (selector === '.msla-trace-values[aria-labelledby^="inputs-"]') {
    return hasClass(element, 'msla-trace-values') && String(element.getAttribute('aria-labelledby') ?? '').startsWith('inputs-');
  }
  if (selector === '.msla-trace-values[aria-labelledby^="outputs-"]') {
    return hasClass(element, 'msla-trace-values') && String(element.getAttribute('aria-labelledby') ?? '').startsWith('outputs-');
  }
  if (selector === '.msla-trace-values[aria-labelledby^="properties-"]') {
    return hasClass(element, 'msla-trace-values') && String(element.getAttribute('aria-labelledby') ?? '').startsWith('properties-');
  }
  if (selector.startsWith('.')) {
    return hasClass(element, selector.slice(1));
  }
  if (selector.startsWith('[') && selector.endsWith(']')) {
    return matchesAttributeSelector(element, selector.slice(1, -1));
  }
  return element.tagName === selector;
}

function matchesAttributeSelector(element: FakeElement, selector: string): boolean {
  const prefixMatch = selector.match(/^([^=^$]+)\^="([^"]+)"$/);
  if (prefixMatch) {
    return String(element.getAttribute(prefixMatch[1]) ?? '').startsWith(prefixMatch[2]);
  }

  const containsMatch = selector.match(/^([^=^$*]+)\*="([^"]+)"$/);
  if (containsMatch) {
    return String(element.getAttribute(containsMatch[1]) ?? '').includes(containsMatch[2]);
  }

  const exactMatch = selector.match(/^([^=]+)="([^"]+)"$/);
  if (exactMatch) {
    return element.getAttribute(exactMatch[1]) === exactMatch[2];
  }

  return element.getAttribute(selector) !== null;
}

function hasClass(element: FakeElement, className: string): boolean {
  return String(element.attributes.class ?? '')
    .split(/\s+/)
    .includes(className);
}

function getComputedStyleForFakeElement(element?: FakeElement): {
  display: string;
  visibility: string;
  opacity: string;
  overflow: string;
  overflowX: string;
  overflowY: string;
} {
  const styleText = element?.attributes.style ?? '';
  const style = Object.fromEntries(
    styleText
      .split(';')
      .map((declaration) => declaration.split(':').map((part) => part.trim()))
      .filter((declaration): declaration is [string, string] => declaration.length === 2 && declaration[0].length > 0)
  );
  const computedOpacity = element?.attributes['data-computed-opacity'];
  const inheritedVisibility = element?.parentElement ? getComputedStyleForFakeElement(element.parentElement).visibility : 'visible';
  return {
    display: style.display ?? 'block',
    visibility: style.visibility ?? inheritedVisibility,
    opacity: computedOpacity ?? style.opacity ?? '1',
    overflow: style.overflow ?? 'visible',
    overflowX: style['overflow-x'] ?? style.overflow ?? 'visible',
    overflowY: style['overflow-y'] ?? style.overflow ?? 'visible',
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
