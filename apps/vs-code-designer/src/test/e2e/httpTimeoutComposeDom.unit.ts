import * as assert from 'assert';
import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';
import * as vm from 'vm';
import type { CdpConnection } from './cdpClient';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
import {
  discoverHttpTimeoutConfigurationBundle,
  testInstalledHttpTimeoutConfigurationSnapshot,
} from './httpTimeoutComposeConfiguration.unit';
import {
  assertHttpTimeoutComposePersisted,
  httpTimeoutComposeDesignerViewType,
  type HttpTimeoutComposeWorkflow,
  replaceHttpTimeoutComposeAction,
  selectHttpTimeoutComposeDesignerV2,
} from './httpTimeoutComposeOracle';

type Control = (name: string, run: () => void | Promise<void>) => Promise<void>;
const repository = path.resolve(__dirname, '../../../../..');
const designerRequire = createRequire(path.join(repository, 'libs/designer-ui/package.json'));

function productionEditorExtension(name: string): Record<string, any> {
  const ts = require('typescript');
  const source = fs.readFileSync(path.join(repository, 'libs/designer-ui/src/lib/editor/codemirror', name), 'utf8');
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: designerRequire,
  });
  return exports;
}

// No Code/browser/runtime starts. This transport executes every production
// driver expression on a real EditorView DOM. Only jsdom's missing browser
// layout/input platform is supplied; no page arrays or editor-model writes.
async function editorDomFixture(text: string, options: { readOnly?: boolean; delay?: boolean } = {}) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(
    '<html><body><div id="editor-host" role="code" data-automation-id="codemirror-editor-undefined"></div><div id="toolbar-host"></div></body></html>',
    {
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    }
  );
  const window = dom.window;
  const globalKeys = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'Element',
    'Node',
    'MutationObserver',
    'Window',
    'NodeFilter',
    'getComputedStyle',
  ] as const;
  const prior = globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const key of globalKeys) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === 'getComputedStyle' ? window.getComputedStyle.bind(window) : window[key],
    });
  }
  const { EditorState } = designerRequire('@codemirror/state');
  const { EditorView, lineNumbers, keymap } = designerRequire('@codemirror/view');
  const { defaultKeymap, history } = designerRequire('@codemirror/commands');
  const { json } = designerRequire('@codemirror/lang-json');
  const { createFluentTheme } = productionEditorExtension('themes/fluent.ts');
  const { createKeybindingExtensions } = productionEditorExtension('extensions/keybindings.ts');
  const { createEventExtensions } = productionEditorExtension('extensions/events.ts');
  // Load the real production Fluent renderer during fixture preparation, not
  // after starting the bounded driver observation (cold package loading can be slow).
  const React = designerRequire('react');
  const { createRoot } = designerRequire('react-dom/client');
  const { flushSync } = designerRequire('react-dom');
  const { FluentProvider, Toolbar, ToolbarButton, webLightTheme } = designerRequire('@fluentui/react-components');
  const changes: string[] = [];
  let view: any;
  let reactRoot: any;
  let afterPage: (() => void) | undefined;
  const sent: Array<{ method: string; params: Record<string, any> }> = [];
  const observedPages: Array<{ lines: Array<{ number: number; text: string }> }> = [];
  const handles = new Map<string, any>();
  let nextHandle = 0;
  let selection = window.document.getSelection();
  const platformErrors: unknown[] = [];
  window.addEventListener('error', (event: any) => platformErrors.push(event.error ?? new Error(event.message)));
  const rect = (left = 0, top = 0, width = 1000, height = 180) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  });
  const layout = (element: any) => {
    const scrolling = view?.scrollDOM.scrollTop ?? 0;
    const totalHeight = (view?.state.doc.lines ?? text.split('\n').length) * 18 + 8;
    if (element.matches('.cm-line')) {
      const number = view ? view.state.doc.lineAt(view.posAtDOM(element)).number : 1;
      return rect(65, 4 + (number - 1) * 18 - scrolling, 900, 18);
    }
    if (element.matches('.cm-lineNumbers .cm-gutterElement') && /^\d+$/.test(element.textContent)) {
      if (element.style.visibility === 'hidden' || element.style.height === '0px') {
        return rect(0, 4 - scrolling, 60, 0); // Actual numeric gutter width spacer.
      }
      return rect(0, 4 + (Number(element.textContent) - 1) * 18 - scrolling, 60, 18);
    }
    if (element.matches('.cm-content')) {
      return rect(65, 4 - scrolling, 900, totalHeight);
    }
    if (element.matches('.cm-gutters, .cm-lineNumbers')) {
      return rect(0, 4 - scrolling, 60, totalHeight);
    }
    if (element.closest('#toolbar-host')) {
      return rect(0, 220, 150, 40);
    }
    return rect();
  };
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return layout(this);
  };
  window.HTMLElement.prototype.getClientRects = function () {
    return [layout(this)];
  };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  for (const dimension of ['offsetWidth', 'clientWidth', 'offsetHeight', 'clientHeight']) {
    Object.defineProperty(window.HTMLElement.prototype, dimension, {
      configurable: true,
      get() {
        return dimension.endsWith('Width') ? layout(this).width : layout(this).height;
      },
    });
  }
  window.Range.prototype.getBoundingClientRect = function () {
    const element = this.startContainer.nodeType === 1 ? this.startContainer : this.startContainer.parentElement;
    const line = element?.closest('.cm-line');
    // CodeMirror caches a scratch Range across fixtures. Its measurement must
    // use the node's own current DOM geometry, not a previous fixture's view.
    const bounds = line ? line.getBoundingClientRect() : rect();
    return rect(bounds.left + this.startOffset * 7, bounds.top, Math.max(7, (this.endOffset - this.startOffset) * 7), 18);
  };
  window.Range.prototype.getClientRects = function () {
    return [this.getBoundingClientRect()];
  };
  window.document.elementFromPoint = (x: number, y: number) => {
    if (y >= 220) {
      return window.document.querySelector('#toolbar-host button span') ?? window.document.querySelector('#toolbar-host button');
    }
    return view?.contentDOM;
  };
  const mount = () => {
    view = new EditorView({
      state: EditorState.create({
        doc: text,
        extensions: [
          history(),
          keymap.of(defaultKeymap),
          lineNumbers(),
          json(),
          createFluentTheme(false),
          ...createKeybindingExtensions({}),
          ...createEventExtensions({ onContentChanged: (event: { value: string }) => changes.push(event.value) }),
          EditorState.readOnly.of(options.readOnly === true),
          EditorView.theme({
            '&': { height: '180px' },
            '.cm-scroller': { overflow: 'auto', lineHeight: '18px' },
          }),
        ],
      }),
      parent: window.document.getElementById('editor-host'),
    });
    Object.defineProperty(view.scrollDOM, 'scrollHeight', { configurable: true, get: () => view.state.doc.lines * 18 + 8 });
  };
  if (options.delay) {
    window.setTimeout(mount, 50);
  } else {
    mount();
  }
  const settle = async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
  };
  const evaluate = <T>(expression: string): T => {
    const result = window.eval(expression);
    if (expression.includes('const lineElements =')) {
      observedPages.push(result);
      afterPage?.();
    }
    return result as T;
  };
  const cdp = {
    targetId: 'unit-real-editor-dom',
    getExecutionContextFrameId: () => 'unit-real-editor-frame',
    async evaluate<T>(_context: number, expression: string) {
      return evaluate<T>(expression);
    },
    async send(method: string, params: Record<string, any>) {
      sent.push({ method, params });
      if (method === 'Runtime.evaluate') {
        const element = evaluate<any>(params.expression);
        const objectId = `dom-object-${++nextHandle}`;
        handles.set(objectId, element);
        return { result: { result: element ? { objectId } : { value: null } } };
      }
      if (method === 'Runtime.callFunctionOn') {
        const value = window.eval(`(${params.functionDeclaration})`).call(handles.get(params.objectId));
        return { result: { result: { value } } };
      }
      if (method === 'Input.dispatchMouseEvent' && params.type === 'mouseReleased') {
        const element = window.document.elementFromPoint(params.x, params.y);
        element?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        if (element === view?.contentDOM) {
          view.focus();
        }
      }
      if (method === 'Input.dispatchKeyEvent') {
        const event = new window.KeyboardEvent(params.type === 'keyDown' ? 'keydown' : 'keyup', {
          bubbles: true,
          cancelable: true,
          key: params.key,
          code: params.code,
          ctrlKey: !!(params.modifiers & 2),
          shiftKey: !!(params.modifiers & 8),
          keyCode: params.windowsVirtualKeyCode,
        });
        window.document.activeElement.dispatchEvent(event);
        await settle();
      }
      if (method === 'Input.insertText') {
        // Browser-side contenteditable editing, consumed by EditorView's actual
        // DOM input observer. Never view.dispatch({changes}) or view.setState().
        const content = window.document.activeElement;
        const before = new window.InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: params.text,
        });
        if (content.dispatchEvent(before)) {
          selection = window.document.getSelection();
          assert.ok(selection.rangeCount > 0, 'Actual editor DOM selection required');
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const inserted = window.document.createTextNode(params.text);
          range.insertNode(inserted);
          range.setStartAfter(inserted);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          content.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertText', data: params.text }));
        }
        await settle();
      }
      return {};
    },
  } as unknown as CdpConnection;
  const driver = new HttpTimeoutComposeDriver(cdp, 17, Date.now() + 20_000, () => {});
  return {
    driver,
    window,
    sent,
    observedPages,
    changes,
    view: () => view,
    onPage: (hook: () => void) => {
      afterPage = hook;
    },
    async toolbar(label: string, disabled: boolean, onSave: () => void) {
      reactRoot ??= createRoot(window.document.getElementById('toolbar-host'));
      flushSync(() =>
        reactRoot.render(
          React.createElement(
            FluentProvider,
            { targetDocument: window.document, theme: webLightTheme },
            React.createElement(
              Toolbar,
              null,
              React.createElement(ToolbarButton, { appearance: 'primary', disabled, onClick: onSave }, label)
            )
          )
        )
      );
    },
    async dispose() {
      reactRoot?.unmount();
      view?.destroy();
      await settle();
      window.close();
      for (const [key, descriptor] of prior) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          delete (globalThis as Record<string, unknown>)[key];
        }
      }
      assert.deepStrictEqual(platformErrors, [], 'Unexpected EditorView/Fluent DOM platform exception is a control failure');
    },
  };
}

export async function runHttpTimeoutComposeDomControls(control: Control, authored: HttpTimeoutComposeWorkflow): Promise<void> {
  const installedProbe = await testInstalledHttpTimeoutConfigurationSnapshot();
  if (installedProbe === 'executed') {
    await control('executed installed VS Code configuration snapshot probe', () => {});
  }
  await control('family explicitly selects V2 and the actual production command routes to V2', async () => {
    // A cold Linux producer has declared workspace dependencies but no Code.
    // Discovery must not enumerate/download missing installations or claim a pass.
    const missingFileSystem = {
      exists: () => false,
      list: () => {
        throw new Error('Cold producer must not enumerate nonexistent installations');
      },
    };
    assert.strictEqual(
      discoverHttpTimeoutConfigurationBundle(['/usr/share/code', '/usr/share/code-insiders'], undefined, missingFileSystem),
      undefined
    );
    assert.throws(() => discoverHttpTimeoutConfigurationBundle([], '/explicit/missing/bundle.js', missingFileSystem), /Explicit installed/);
    let version = 1;
    let scope = -1;
    const getConfiguration = () => {
      const snapshot = version;
      return {
        async update(section: string, value: number, target: number) {
          assert.strictEqual(section, 'designerVersion');
          version = value;
          scope = target;
        },
        get<T>() {
          return snapshot as T;
        },
      };
    };
    const before = getConfiguration();
    await selectHttpTimeoutComposeDesignerV2(getConfiguration, 2);
    assert.strictEqual(before.get<number>(), 1, 'WorkspaceConfiguration retains its acquisition-time snapshot');
    assert.strictEqual(getConfiguration().get<number>(), 2);
    assert.strictEqual(scope, 2, 'Only the generated workspace configuration is changed');
    assert.strictEqual(httpTimeoutComposeDesignerViewType, 'designerLocalV2');
    const ts = require('typescript');
    const source = fs.readFileSync(
      path.join(repository, 'apps/vs-code-designer/src/app/commands/workflows/designer/openDesigner.ts'),
      'utf8'
    );
    let openedV2 = 0;
    const exports: Record<string, any> = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports,
      require: (name: string) => {
        if (name === 'vscode') {
          return { workspace: { getConfiguration } };
        }
        if (name.endsWith('/designer-v2/openDesignerV2')) {
          return {
            openDesignerV2: async () => {
              openedV2++;
            },
          };
        }
        if (name.endsWith('/extensionVariables')) {
          return { ext: { prefix: 'azureLogicAppsStandard' } };
        }
        if (name.endsWith('/constants')) {
          return { defaultDesignerVersion: 1, designerVersionSetting: 'designerVersion' };
        }
        if (name.endsWith('/utils/workspace')) {
          return {
            getWorkflowNode: () => {
              throw new Error('V1 route was selected');
            },
          };
        }
        return {};
      },
    });
    await exports.openDesigner({}, undefined);
    assert.strictEqual(openedV2, 1);
    const family = fs.readFileSync(path.join(repository, 'apps/vs-code-designer/src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    const syntax = ts.createSourceFile('family.ts', family, ts.ScriptTarget.Latest, true);
    let bindings = 0;
    let saves = 0;
    let replacements = 0;
    const visit = (node: any) => {
      if (ts.isCallExpression(node) && node.expression.getText(syntax) === 'getWebviewTabs') {
        assert.strictEqual(node.arguments[0].getText(syntax), 'httpTimeoutComposeDesignerViewType');
        bindings++;
      }
      if (ts.isCallExpression(node) && node.expression.getText(syntax) === 'driver.save') {
        saves++;
      }
      if (ts.isCallExpression(node) && node.expression.getText(syntax) === 'driver.replaceCode') {
        replacements++;
      }
      ts.forEachChild(node, visit);
    };
    visit(syntax);
    assert.strictEqual(bindings, 3, 'Every launch/owner assertion binds V2');
    assert.strictEqual(saves, 2, 'Both original saves use the tested enabled production toolbar selector');
    assert.strictEqual(replacements, 1, 'The family replaces through the tested production CodeMirror input path');
    const selectionIndex = family.indexOf('await selectHttpTimeoutComposeDesignerV2(');
    assert.ok(selectionIndex >= 0 && selectionIndex < family.indexOf("executeCommand('azureLogicAppsStandard.openDesigner'"));
    const compatibility = fs.readFileSync(path.join(repository, 'libs/designer-ui/src/lib/editor/monaco/index.tsx'), 'utf8');
    assert.ok(compatibility.includes('CodeMirrorEditor as MonacoEditor'));
  });
  const extended = structuredClone(authored);
  extended.definition.outputs = Object.fromEntries(
    Array.from({ length: 80 }, (_, index) => [`unit_${index}`, { type: 'string', value: `value_${index}` }])
  );
  const largeText = JSON.stringify(extended, null, 2);
  await control('driver reads full highlighted/virtualized production EditorView DOM with real overlap and EOF', async () => {
    const fixture = await editorDomFixture(largeText, { delay: true });
    try {
      assert.strictEqual(await fixture.driver.readCode(), largeText);
      assert.ok(fixture.window.document.querySelector('.cm-line span'), 'Actual JSON language highlighting expected');
      assert.ok(
        Array.from(fixture.window.document.querySelectorAll('.cm-lineNumbers .cm-gutterElement') as any[]).some(
          (element: any) => element.style.visibility === 'hidden'
        ),
        'Actual CodeMirror numeric width spacer must be present and ignored'
      );
      assert.ok(fixture.sent.some((entry) => entry.params.code === 'PageDown'));
      const sets = fixture.observedPages.map((page) => page.lines.map((line) => line.number).join(','));
      assert.ok(new Set(sets).size > 2, 'Observe actual different rendered viewports, not supplied page data');
      assert.ok(!fixture.sent.some((entry) => entry.method === 'Input.insertText'), 'Read cannot inject missing text');
    } finally {
      await fixture.dispose();
    }
  });
  await control('driver replaces through actual contenteditable input and EditorView observes the complete JSON', async () => {
    const initial = JSON.stringify(authored, null, 2);
    const expected = replaceHttpTimeoutComposeAction(authored);
    const fixture = await editorDomFixture(initial);
    try {
      await fixture.driver.replaceCode(JSON.stringify(expected, null, 2));
      const observed = JSON.parse(await fixture.driver.readCode());
      assert.deepStrictEqual(observed, expected);
      assertHttpTimeoutComposePersisted(JSON.parse(fixture.view().state.doc.toString()), expected);
      assert.deepStrictEqual(
        JSON.parse(fixture.changes.at(-1)!),
        expected,
        'Actual production onContentChanged callback receives full replacement'
      );
      assert.strictEqual(fixture.sent.filter((entry) => entry.method === 'Input.insertText').length, 1);
    } finally {
      await fixture.dispose();
    }
  });
  await control(
    'V2 real Fluent ToolbarButton Save waits for an enabled control and delegates completion to persisted workflow proof',
    async () => {
      const fixture = await editorDomFixture(JSON.stringify(authored, null, 2));
      try {
        let saves = 0;
        await fixture.toolbar('Save', true, () => {
          saves++;
        });
        assert.strictEqual(fixture.window.document.querySelector('[role="toolbar"] button').hasAttribute('aria-label'), false);
        const saving = fixture.driver.save();
        await new Promise((resolve) => fixture.window.setTimeout(resolve, 30));
        assert.strictEqual(saves, 0);
        await fixture.toolbar('Save', false, () => {
          saves++;
        });
        while (!saves) {
          await new Promise((resolve) => fixture.window.setTimeout(resolve, 1));
        }
        await saving;
        assert.strictEqual(saves, 1);
      } finally {
        await fixture.dispose();
      }
    }
  );
  await control('V2 Code Save permits the product to return immediately to a disabled clean state', async () => {
    const fixture = await editorDomFixture(JSON.stringify(authored, null, 2));
    try {
      let saves = 0;
      let cleanState: Promise<void> | undefined;
      await fixture.toolbar('Save', false, () => {
        saves++;
        cleanState = fixture.toolbar('Save', true, () => {
          saves++;
        });
      });
      await fixture.driver.save();
      assert.ok(cleanState);
      await cleanState;
      assert.strictEqual(saves, 1);
    } finally {
      await fixture.dispose();
    }
  });
  await control('damaged production gutter DOM cannot invent missing numbered text', async () => {
    const fixture = await editorDomFixture(JSON.stringify(authored, null, 2));
    try {
      fixture.onPage(() => {});
      const original = fixture.driver.cdp.evaluate.bind(fixture.driver.cdp);
      fixture.driver.cdp.evaluate = async <T>(context: number | undefined, expression: string) => {
        if (expression.includes('const lineElements =')) {
          const number = Array.from(fixture.window.document.querySelectorAll('.cm-lineNumbers .cm-gutterElement')) as any[];
          number.find((element) => element.textContent === '8')?.remove();
        }
        return original<T>(context, expression);
      };
      await assert.rejects(() => fixture.driver.readCode(), /Invalid rendered line number|missing line/);
      assert.ok(!fixture.sent.some((entry) => entry.method === 'Input.insertText'));
    } finally {
      await fixture.dispose();
    }
  });
  await control('replaced actual EditorView DOM fails its original remote-object binding', async () => {
    const fixture = await editorDomFixture(JSON.stringify(authored, null, 2));
    try {
      let removed = false;
      fixture.onPage(() => {
        if (!removed) {
          fixture.view().dom.remove();
          removed = true;
        }
      });
      await assert.rejects(() => fixture.driver.readCode(), /Bound CodeMirror editor changed/);
    } finally {
      await fixture.dispose();
    }
  });
  await control('actual read-only CodeMirror DOM cannot be used as an editable Code tab', async () => {
    const fixture = await editorDomFixture(JSON.stringify(authored, null, 2), { readOnly: true });
    try {
      const bounded = new HttpTimeoutComposeDriver(fixture.driver.cdp, 17, Date.now() + 300, () => {});
      await assert.rejects(() => bounded.replaceCode('{}'), /deadline expired|Timed out/);
      assert.ok(!fixture.sent.some((entry) => entry.method === 'Input.insertText'));
    } finally {
      await fixture.dispose();
    }
  });
}
