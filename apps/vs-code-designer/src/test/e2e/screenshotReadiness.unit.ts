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

async function main(): Promise<void> {
  testBlankWorkbenchRejected();
  testEmptyWorkbenchShellAccepted();
  testSelectedMonitoringPanelRejectsWrongAction();
  testSelectedMonitoringPanelRejectsPrefixTitle();
  testSelectedMonitoringPanelAcceptsMatchingActionValues();
  testMonitoringPanelRequiresExpectedValues();
  testMonitoringPanelRejectsPropertiesOnlyWhileInputsLoading();
  testDesignerCanvasAcceptsRequiredNodeAliases();
  testDesignerPanelRequiresExactFieldValue();
  testDesignerPanelRequiresFocusedEditorTokenSource();
  testDesignerPanelRejectsAncestorFocusAndPlainTextToken();
  testDesignerPanelRequiresVisiblePickerSectionAndToken();
  testCreateWorkspaceRejectsWrongExactValidationMessage();
  testCreateWorkspaceRejectsHiddenValidationMessage();
  testCreateWorkspaceRequiresActualControlValue();
  testCreateWorkspaceRejectsPendingPathValidation();
  testCreateWorkspaceRejectsFooterClippedFieldControl();
  testCreateWorkspaceRejectsOutputPanelClippedFieldControl();
  testCreateWorkspaceAcceptsFullyVisibleAnchoredFieldControl();
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
  const accepted = runProbe(
    new FakeDocument(
      new FakeElement('body', {}, [
        new FakeElement('div', { class: 'react-flow' }, [
          new FakeElement('div', { class: 'msla-card' }, [], 'When an HTTP request is received'),
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
    picker: { sectionLabels: ['Dynamic content'], tokenTitles: ['Body'] },
  });
  const rejected = runProbe(document, {
    kind: 'designerPanel',
    label: 'response-token-picker-open',
    actionTitle: 'Response',
    picker: { sectionLabels: ['Expression'], tokenTitles: ['Body'] },
  });

  assert.strictEqual(accepted.ready, true, JSON.stringify(accepted));
  assert.strictEqual(rejected.ready, false, JSON.stringify(rejected));
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
    new FakeElement(
      'div',
      { id: `msla-node-details-panel-${options.nodeId}`, class: 'msla-panel-content-container' },
      options.fields ?? [],
      options.text
    ),
  ]);
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
  clientHeight = 40;
  scrollHeight = 40;
  scrollTop = 0;
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
  return {
    display: style.display ?? 'block',
    visibility: style.visibility ?? 'visible',
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
