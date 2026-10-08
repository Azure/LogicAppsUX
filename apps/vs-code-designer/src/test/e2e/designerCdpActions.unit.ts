import * as assert from 'assert';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { MsnDesignerCdpActions, ProvenDesignerCdpActions, resolveDesignerActionProfile } from './designerCdpActions';

const actionsSourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'designerCdpActions.ts');
const lifecycleSourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'workspaceLifecycle.test.ts');
const actionsSourceText = fs.readFileSync(actionsSourcePath, 'utf-8');
const lifecycleSourceText = fs.readFileSync(lifecycleSourcePath, 'utf-8');
const actionsSource = ts.createSourceFile(actionsSourcePath, actionsSourceText, ts.ScriptTarget.Latest, true);
const lifecycleSource = ts.createSourceFile(lifecycleSourcePath, lifecycleSourceText, ts.ScriptTarget.Latest, true);

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
  await testReplacementKeySequence();
  await testProvenAdapterCancellation();
  testProvenAdapterUsesUnmodifiedMsnHelper();
  testProvenAdapterCompatibility();
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
  await assert.rejects(() => actions.waitForDesignerReady(), /scenario cancelled/);
  assert.strictEqual(evaluateCalls, 0, 'Cancelled scenarios must not issue delegated MSN CDP requests');
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

  const panel = getMethod('MsnDesignerCdpActions', 'closePanel');
  assert.match(panel, /document\.querySelectorAll\('\.msla-panel-container'\)/);
  assert.match(panel, /const panel = panels\.at\(-1\)\?\.panel/);
  assert.match(panel, /panel\.querySelectorAll\('\[data-automation-id="msla-panel-header-close-nav"\], button\[aria-label="Close"\]'\)/);
  assert.match(panel, /this\.waitUntil\(async \(\) => !\(await this\.hasDetailsPanel\(\)\), 15000/);
  assert.match(panel, /setTimeout\(resolve, 750\)/);
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
