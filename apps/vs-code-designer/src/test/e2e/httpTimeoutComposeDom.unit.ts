import * as assert from 'assert';
import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';
import { isDeepStrictEqual } from 'util';
import * as vm from 'vm';
import type { CdpConnection } from './cdpClient';
import type { CdpEvaluator } from './cdpFormHelpers';
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

async function httpSettingsPanelDomFixture(options: {
  panelOpen: boolean;
  includeSettings?: boolean;
  overlayText?: string;
  timeoutLabel?: string;
  activePanelId?: string;
  activePanelTitle?: string;
  methodControlCount?: number;
  methodDisabled?: boolean;
  methodCovered?: boolean;
  methodListboxRelationship?: 'default' | 'owns' | 'both' | 'missing' | 'stale' | 'hidden' | 'not-listbox' | 'ambiguous';
  includeUnrelatedGlobalListbox?: boolean;
  duplicateGetOption?: boolean;
  getOptionDisabled?: boolean;
  getOptionCovered?: boolean;
  staleMethodControl?: boolean;
  staleGetOption?: boolean;
  methodOwnershipDeadlineRace?: boolean;
  switchTarget?: 'label' | 'indicator' | 'ambiguous' | 'missing' | 'covered';
  switchChecked?: boolean;
  switchDisabled?: boolean;
  switchTransitionDelayMs?: number;
}) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(
    '<html><body>' +
      '<button id="msla-node-HTTP" class="react-flow__node">HTTP</button>' +
      '<button id="unrelated-settings" role="tab" aria-selected="false">Settings</button>' +
      '<div id="panel-host"></div>' +
      '</body></html>',
    { pretendToBeVisual: true, runScripts: 'outside-only' }
  );
  const window = dom.window;
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  const globalKeys = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'Element',
    'Node',
    'NodeFilter',
    'Event',
    'CustomEvent',
    'MouseEvent',
    'KeyboardEvent',
    'getComputedStyle',
  ] as const;
  const prior = globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const key of globalKeys) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === 'getComputedStyle' ? window.getComputedStyle.bind(window) : window[key],
    });
  }
  const React = designerRequire('react');
  const { createRoot } = designerRequire('react-dom/client');
  const { flushSync } = designerRequire('react-dom');
  const { Combobox: FluentCombobox, FluentProvider, Option, webLightTheme } = designerRequire('@fluentui/react-components');
  const clicked: string[] = [];
  let switchTransitionObserved = false;
  let methodTransitionObserved = false;
  let methodRoot: any;
  let staleMethodControlApplied = false;
  let staleGetOptionApplied = false;
  let methodOwnershipObservationCount = 0;
  const mouseEvents: Array<{
    type: string;
    x: number;
    y: number;
    button: string;
    buttons?: number;
    clickCount?: number;
    targetId: string;
  }> = [];
  let pendingMouse:
    | {
        x: number;
        y: number;
        targetId: string;
        target: any;
        moved: boolean;
        pressed: boolean;
      }
    | undefined;
  const rect = (left: number, top: number, width: number, height: number) => ({
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
    switch (element.id) {
      case 'msla-node-HTTP':
        return rect(20, 20, 160, 60);
      case 'unrelated-settings':
        return rect(220, 20, 120, 40);
      case 'http-parameters':
        return rect(520, 100, 120, 40);
      case 'http-settings':
        return rect(660, 100, 120, 40);
      case 'method-cover':
        return rect(520, 150, 260, 40);
      case 'get-option-cover':
        return rect(520, 330, 260, 36);
      case 'unrelated-method-listbox':
        return rect(20, 500, 240, 100);
      case 'unrelated-get-option':
        return rect(20, 510, 240, 36);
      case 'ambiguous-method-listbox':
        return rect(800, 320, 180, 100);
      case 'ambiguous-get-option':
        return rect(800, 330, 180, 36);
      case 'request-timeout':
        return rect(520, 180, 220, 40);
      case 'async-pattern':
        return rect(650, 240, 48, 40);
      case 'async-pattern-label':
      case 'async-pattern-label-secondary':
        return rect(520, 240, 110, 40);
      case 'async-pattern-cover':
      case 'async-pattern-indicator':
      case 'async-pattern-indicator-secondary':
        return rect(650, 240, 48, 40);
      case 'blocking-menu':
        return rect(360, 20, 120, 60);
      default: {
        if (element instanceof window.HTMLElement && element.matches('input[role="combobox"][aria-label="Method"]')) {
          const controls = Array.from(window.document.querySelectorAll('input[role="combobox"][aria-label="Method"]'));
          return rect(520, 150 + controls.indexOf(element) * 48, 260, 40);
        }
        if (element instanceof window.HTMLElement && element.getAttribute('role') === 'listbox') {
          return rect(520, 320, 260, 220);
        }
        if (element instanceof window.HTMLElement && element.getAttribute('role') === 'option') {
          const optionElements = Array.from(window.document.querySelectorAll('[role="option"]') as ArrayLike<any>).filter(
            (option) => !option.closest('#unrelated-method-listbox') && !option.closest('#ambiguous-method-listbox')
          );
          return rect(520, 330 + optionElements.indexOf(element) * 36, 260, 36);
        }
        return rect(0, 0, 1000, 800);
      }
    }
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
  window.document.elementFromPoint = (x: number, y: number) => {
    for (const coverId of ['method-cover', 'get-option-cover']) {
      const cover = window.document.getElementById(coverId);
      if (cover instanceof window.HTMLElement) {
        const bounds = layout(cover);
        if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
          return cover;
        }
      }
    }
    const methodControls = Array.from(window.document.querySelectorAll('input[role="combobox"][aria-label="Method"]'));
    const methodControl = methodControls.find((element) => {
      const bounds = layout(element);
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    });
    if (methodControl) {
      return methodControl;
    }
    const methodOptions = Array.from(window.document.querySelectorAll('[role="option"]'));
    const methodOption = methodOptions.find((element) => {
      const bounds = layout(element);
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    });
    if (methodOption) {
      return methodOption;
    }
    const candidates = [
      'async-pattern-cover',
      'http-settings',
      'http-parameters',
      'request-timeout',
      'async-pattern-label',
      'async-pattern-label-secondary',
      'async-pattern-indicator',
      'async-pattern-indicator-secondary',
      'async-pattern',
      'blocking-menu',
      'unrelated-settings',
      'msla-node-HTTP',
    ]
      .map((id) => window.document.getElementById(id))
      .filter((element) => element instanceof window.HTMLElement && window.getComputedStyle(element).pointerEvents !== 'none');
    return (
      candidates.find((element) => {
        const bounds = layout(element);
        return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
      }) ?? window.document.body
    );
  };
  const renderMethodControls = () => {
    const host = window.document.getElementById('method-host');
    assert.ok(host);
    methodRoot ??= createRoot(host);
    const count = options.methodControlCount ?? 1;
    const MethodControl = ({ index }: { index: number }) => {
      const [value, setValue] = React.useState('');
      return React.createElement(
        FluentCombobox,
        {
          'aria-label': 'Method',
          disabled: options.methodDisabled,
          placeholder: 'Enter method',
          value,
          selectedOptions: value ? [value] : [],
          onOptionSelect: (_event: unknown, data: { optionText?: string; optionValue?: string }) => {
            const selected = data.optionValue ?? data.optionText ?? '';
            const apply = () => {
              methodTransitionObserved = selected === 'GET';
              setValue(selected);
            };
            window.setTimeout(apply, 0);
          },
          key: `method-${index}`,
        },
        React.createElement(Option, { value: 'GET', disabled: options.getOptionDisabled }, 'GET'),
        options.duplicateGetOption ? React.createElement(Option, { value: 'GET-duplicate', text: 'GET' }, 'GET') : null,
        React.createElement(Option, { value: 'PUT' }, 'PUT'),
        React.createElement(Option, { value: 'POST' }, 'POST'),
        React.createElement(Option, { value: 'PATCH' }, 'PATCH'),
        React.createElement(Option, { value: 'DELETE' }, 'DELETE')
      );
    };
    flushSync(() =>
      methodRoot.render(
        React.createElement(
          FluentProvider,
          { targetDocument: window.document, theme: webLightTheme },
          Array.from({ length: count }, (_, index) => React.createElement(MethodControl, { index, key: index }))
        )
      )
    );
  };
  const mountPanel = () => {
    const host = window.document.getElementById('panel-host');
    assert.ok(host);
    const switchTarget = options.switchTarget ?? 'label';
    const labels =
      switchTarget === 'label'
        ? '<label id="async-pattern-label" class="fui-Switch__label" for="async-pattern">On</label>'
        : switchTarget === 'ambiguous'
          ? '<label id="async-pattern-label" class="fui-Switch__label" for="async-pattern">On</label>' +
            '<label id="async-pattern-label-secondary" class="fui-Switch__label" for="async-pattern">Enabled</label>'
          : '';
    const indicators =
      switchTarget === 'missing'
        ? ''
        : '<div id="async-pattern-indicator" class="fui-Switch__indicator" style="pointer-events: none" aria-hidden="true"><span></span></div>';
    host.innerHTML = `
      <section class="msla-panel-container">
        <div class="msla-panel-layout msla-panel-border-selected">
          <div class="msla-panel-header"><input aria-label="Card title" value="${options.activePanelTitle ?? 'HTTP'}" /></div>
          <div id="msla-node-details-panel-${options.activePanelId ?? 'HTTP'}" class="msla-node-details-panel">
            <button id="http-parameters" role="tab" aria-selected="true">Parameters</button>
            ${
              options.includeSettings === false
                ? ''
                : '<button id="http-settings" role="tab" aria-selected="false"><span> Settings </span></button>'
            }
            <div id="method-host"></div>
            ${options.methodCovered ? '<div id="method-cover">Blocking Method overlay</div>' : ''}
            ${options.getOptionCovered ? '<div id="get-option-cover">Blocking GET overlay</div>' : ''}
            <input id="request-timeout" aria-label="${options.timeoutLabel ?? 'Request options - Timeout'}" value="" />
            <div id="async-pattern-root" class="fui-Switch">
              <input
                id="async-pattern"
                class="fui-Switch__input"
                role="switch"
                aria-label="Asynchronous pattern"
                type="checkbox"
                style="opacity: 0; position: absolute; inset: 0"
                ${options.switchChecked === false ? '' : 'checked'}
                ${options.switchDisabled ? 'disabled' : ''}
              />
              ${labels}
              ${indicators}
            </div>
            ${switchTarget === 'covered' ? '<div id="async-pattern-cover">Blocking overlay</div>' : ''}
          </div>
        </div>
      </section>
      ${options.overlayText ? `<div id="blocking-menu" role="menu">${options.overlayText}</div>` : ''}
      ${
        options.includeUnrelatedGlobalListbox
          ? '<div id="unrelated-method-listbox" role="listbox"><div id="unrelated-get-option" role="option">GET</div></div>'
          : ''
      }
    `;
    renderMethodControls();
    const settings = window.document.getElementById('http-settings');
    settings?.addEventListener('click', () => {
      window.document.getElementById('http-parameters')?.setAttribute('aria-selected', 'false');
      settings.setAttribute('aria-selected', 'true');
    });
    const timeout = window.document.getElementById('request-timeout');
    timeout?.addEventListener('click', () => timeout.focus());
    const asyncPattern = window.document.getElementById('async-pattern');
    asyncPattern?.addEventListener('change', () => {
      switchTransitionObserved = true;
    });
  };
  window.document.getElementById('msla-node-HTTP')?.addEventListener('click', mountPanel);
  if (options.panelOpen) {
    mountPanel();
  }
  const configureMethodListboxRelationship = () => {
    const control = window.document.querySelector('input[role="combobox"][aria-label="Method"][aria-expanded="true"]');
    if (!(control instanceof window.HTMLInputElement)) {
      return;
    }
    const listbox = Array.from(window.document.querySelectorAll('[role="listbox"]') as ArrayLike<any>).find(
      (element) => element.id !== 'unrelated-method-listbox' && element.id !== 'ambiguous-method-listbox'
    );
    if (!(listbox instanceof window.HTMLElement)) {
      return;
    }
    if (!listbox.id) {
      listbox.id = 'method-owned-listbox';
    }
    const relationship = options.methodListboxRelationship ?? 'default';
    const hideProductionListbox = () => {
      if (options.includeUnrelatedGlobalListbox) {
        listbox.style.display = 'none';
      }
    };
    switch (relationship) {
      case 'default':
        break;
      case 'owns': {
        control.removeAttribute('aria-controls');
        control.setAttribute('aria-owns', listbox.id);
        break;
      }
      case 'both': {
        control.setAttribute('aria-controls', listbox.id);
        control.setAttribute('aria-owns', listbox.id);
        break;
      }
      case 'missing': {
        control.removeAttribute('aria-controls');
        control.removeAttribute('aria-owns');
        hideProductionListbox();
        break;
      }
      case 'stale': {
        control.setAttribute('aria-controls', 'missing-method-listbox');
        control.removeAttribute('aria-owns');
        hideProductionListbox();
        break;
      }
      case 'hidden': {
        control.setAttribute('aria-controls', listbox.id);
        control.removeAttribute('aria-owns');
        listbox.style.display = 'none';
        break;
      }
      case 'not-listbox': {
        let target = window.document.getElementById('method-owned-non-listbox');
        if (!target) {
          target = window.document.createElement('div');
          target.id = 'method-owned-non-listbox';
          window.document.body.appendChild(target);
        }
        control.setAttribute('aria-controls', target.id);
        control.removeAttribute('aria-owns');
        hideProductionListbox();
        break;
      }
      case 'ambiguous': {
        let second = window.document.getElementById('ambiguous-method-listbox');
        if (!second) {
          second = window.document.createElement('div');
          second.id = 'ambiguous-method-listbox';
          second.setAttribute('role', 'listbox');
          second.innerHTML = '<div id="ambiguous-get-option" role="option">GET</div>';
          window.document.body.appendChild(second);
        }
        control.setAttribute('aria-controls', listbox.id);
        control.setAttribute('aria-owns', second.id);
        break;
      }
    }
  };
  const cdp = {
    async evaluate<T>(_context: number | undefined, expression: string, cdpOptions?: { timeoutMs?: number }) {
      configureMethodListboxRelationship();
      const isMethodOwnershipObservation = expression.includes('HTTP Method listbox relationship is missing');
      if (isMethodOwnershipObservation) {
        methodOwnershipObservationCount++;
        if (options.methodOwnershipDeadlineRace && methodOwnershipObservationCount === 2) {
          const timeoutMs = cdpOptions?.timeoutMs ?? 1;
          await new Promise((resolve) => window.setTimeout(resolve, timeoutMs + 5));
          throw new Error('Designer CDP action deadline expired');
        }
      }
      return window.eval(expression) as T;
    },
    async send(method: string, params: Record<string, unknown>) {
      if (method === 'Input.dispatchMouseEvent') {
        const type = String(params.type);
        const x = Number(params.x);
        const y = Number(params.y);
        const button = String(params.button);
        const buttons = params.buttons === undefined ? undefined : Number(params.buttons);
        const clickCount = params.clickCount === undefined ? undefined : Number(params.clickCount);
        const element = window.document.elementFromPoint(x, y);
        const targetId =
          element instanceof window.HTMLElement
            ? element.getAttribute('role') === 'combobox' && element.getAttribute('aria-label') === 'Method'
              ? 'combobox:Method'
              : element.getAttribute('role') === 'option'
                ? `option:${(element.textContent || '').trim()}`
                : element.id ||
                  `${element.getAttribute('role') || element.tagName.toLowerCase()}:${(element.textContent || element.getAttribute('aria-label') || '').trim()}`
            : '';
        mouseEvents.push({ type, x, y, button, buttons, clickCount, targetId });
        if (
          type === 'mouseMoved' &&
          options.staleMethodControl &&
          !staleMethodControlApplied &&
          element instanceof window.HTMLInputElement &&
          element.getAttribute('role') === 'combobox' &&
          element.getAttribute('aria-label') === 'Method'
        ) {
          staleMethodControlApplied = true;
          element.replaceWith(element.cloneNode(true));
        }
        if (
          type === 'mouseMoved' &&
          options.staleGetOption &&
          !staleGetOptionApplied &&
          element instanceof window.HTMLElement &&
          element.getAttribute('role') === 'option' &&
          element.textContent?.trim() === 'GET'
        ) {
          staleGetOptionApplied = true;
          element.replaceWith(element.cloneNode(true));
        }
        if (type === 'mouseMoved' && button === 'none' && targetId) {
          pendingMouse = { x, y, targetId, target: element, moved: true, pressed: false };
        } else if (
          type === 'mousePressed' &&
          button === 'left' &&
          buttons === 1 &&
          clickCount === 1 &&
          pendingMouse?.moved &&
          pendingMouse.x === x &&
          pendingMouse.y === y &&
          pendingMouse.targetId === targetId &&
          pendingMouse.target === element
        ) {
          pendingMouse.pressed = true;
        } else if (
          type === 'mouseReleased' &&
          button === 'left' &&
          buttons === 0 &&
          clickCount === 1 &&
          pendingMouse?.moved &&
          pendingMouse.pressed &&
          pendingMouse.x === x &&
          pendingMouse.y === y &&
          pendingMouse.targetId === targetId &&
          pendingMouse.target === element &&
          element instanceof window.HTMLElement
        ) {
          clicked.push(element.id);
          const dispatchClick = () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
          const switchActivationDelay =
            element.id === 'async-pattern' || element.id === 'async-pattern-label' ? (options.switchTransitionDelayMs ?? 0) : 0;
          if (switchActivationDelay > 0) {
            window.setTimeout(dispatchClick, switchActivationDelay);
          } else {
            dispatchClick();
          }
          pendingMouse = undefined;
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        } else {
          pendingMouse = undefined;
        }
      }
      if (method === 'Input.insertText') {
        const active = window.document.activeElement;
        if (active instanceof window.HTMLInputElement) {
          active.value = String(params.text);
        }
      }
      return {};
    },
  } as unknown as CdpConnection;
  return {
    cdp,
    clicked,
    mouseEvents,
    window,
    driver: (settingsTimeoutMs = 45_000) => new HttpTimeoutComposeDriver(cdp, 17, Date.now() + 20_000, () => {}, settingsTimeoutMs),
    methodTransitionObserved: () => methodTransitionObserved,
    methodOwnershipObservationCount: () => methodOwnershipObservationCount,
    switchTransitionObserved: () => switchTransitionObserved,
    assertNativePointerShapes: () => {
      assert.strictEqual(mouseEvents.length, clicked.length * 3, 'Every completed click requires exactly three native mouse events');
      for (let index = 0; index < clicked.length; index++) {
        const sequence = mouseEvents.slice(index * 3, index * 3 + 3);
        assert.deepStrictEqual(
          sequence.map(({ type, button, buttons, clickCount }) => ({ type, button, buttons, clickCount })),
          [
            { type: 'mouseMoved', button: 'none', buttons: undefined, clickCount: undefined },
            { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1 },
            { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1 },
          ]
        );
        assert.ok(
          sequence.every(({ x, y }) => x === sequence[0].x && y === sequence[0].y),
          'Native click coordinates changed'
        );
      }
    },
    assertNativeClickSequences: () => {
      assert.strictEqual(mouseEvents.length, clicked.length * 3, 'Every synthesized click requires exactly three native mouse events');
      for (let index = 0; index < clicked.length; index++) {
        const sequence = mouseEvents.slice(index * 3, index * 3 + 3);
        assert.deepStrictEqual(
          sequence.map(({ type, button, buttons, clickCount }) => ({ type, button, buttons, clickCount })),
          [
            { type: 'mouseMoved', button: 'none', buttons: undefined, clickCount: undefined },
            { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1 },
            { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1 },
          ]
        );
        assert.ok(
          sequence.every(({ x, y }) => x === sequence[0].x && y === sequence[0].y),
          'Native click coordinates changed'
        );
        assert.ok(
          sequence.every(({ targetId }) => targetId === clicked[index]),
          'Native click hit target changed'
        );
      }
    },
    dispose: () => {
      methodRoot?.unmount();
      window.close();
      for (const [key, descriptor] of prior) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          delete (globalThis as Record<string, unknown>)[key];
        }
      }
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
    const nativeSteps = new Set<string>();
    const visit = (node: any) => {
      if (ts.isCallExpression(node) && node.expression.getText(syntax) === 'getWebviewTabs') {
        assert.strictEqual(node.arguments[0].getText(syntax), 'httpTimeoutComposeDesignerViewType');
        bindings++;
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(syntax).endsWith('.save') &&
        node.expression.getText(syntax).includes('driver')
      ) {
        saves++;
      }
      if (
        ts.isCallExpression(node) &&
        [
          'closeActiveDesignerTab',
          'openExactExplorerFileInNativeEditor',
          'pasteJsonValueIntoActiveNativeEditor',
          'saveAndCloseActiveNativeEditor',
          'openDesignerFromExactExplorerFile',
        ].includes(node.expression.getText(syntax))
      ) {
        nativeSteps.add(node.expression.getText(syntax));
      }
      ts.forEachChild(node, visit);
    };
    visit(syntax);
    assert.strictEqual(bindings, 4, 'Every original/reopened launch owner assertion binds V2');
    assert.strictEqual(saves, 3, 'Each authored lifecycle state uses the tested enabled production toolbar selector');
    assert.deepStrictEqual(
      [...nativeSteps].sort(),
      [
        'closeActiveDesignerTab',
        'openDesignerFromExactExplorerFile',
        'openExactExplorerFileInNativeEditor',
        'pasteJsonValueIntoActiveNativeEditor',
        'saveAndCloseActiveNativeEditor',
      ],
      'The family must exercise the native workflow.json edit and reopened-designer lifecycle'
    );
    assert.ok(
      family.includes("['definition', 'actions', 'Compose', 'runtimeConfiguration']") &&
        family.includes('httpTimeoutComposeAction.runtimeConfiguration'),
      'The family must paste only the unsupported timeout property into the authored Compose action'
    );
    const initialTextEditorIndex = family.indexOf('showTextDocument');
    assert.ok(
      initialTextEditorIndex >= 0 && initialTextEditorIndex < family.indexOf("executeCommand('azureLogicAppsStandard.openDesigner'"),
      'Initial Designer opening must retain the proven MSN workflow.json tab setup'
    );
    assert.ok(!family.includes("driver.click('button', ['Code'])"), 'The embedded Designer Code tab is not the OGF flow');
    assert.ok(
      family.includes("'http-timeout-request-scenario-2-complete-before-reset'") && family.includes("'http-timeout-transition-cleared'"),
      'The family must prove Scenario 2 completion and the same-workflow reset before Compose authoring'
    );
    assert.ok(
      !family.includes("boundedCdp } from './workspaceMultiRootWorkbench'"),
      'Native editor actions must use shared workbench helpers'
    );
    const nativeHelpers = fs.readFileSync(path.join(repository, 'apps/vs-code-designer/src/test/e2e/workbenchEditorActions.ts'), 'utf8');
    assert.ok(
      !nativeHelpers.includes("from './workspaceMultiRootWorkbench'"),
      'Shared native editor helpers must not depend on multi-root-specific workbench actions'
    );
    assert.ok(
      family.includes('originalOwner = await activeSession.driver.context()') &&
        family.includes('assert.notStrictEqual(reopenedOwner.targetId, originalOwner.targetId'),
      'The family must prove the reopened Designer has a fresh CDP target'
    );
    const nativeEditorActions = fs.readFileSync(
      path.join(repository, 'apps/vs-code-designer/src/test/e2e/workbenchEditorActions.ts'),
      'utf8'
    );
    const nativeEditorSyntax = ts.createSourceFile('workbenchEditorActions.ts', nativeEditorActions, ts.ScriptTarget.Latest, true);
    const nativeOpenFunction = nativeEditorSyntax.statements.find(
      (statement: any) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'openExactExplorerFileInNativeEditor'
    ) as any;
    assert.ok(nativeOpenFunction?.body, 'Exact native editor open helper must remain a function declaration');
    const nativeOpenBody = nativeOpenFunction.body.getText(nativeEditorSyntax);
    const nativeOpenClicks: any[] = [];
    const visitNativeOpen = (node: any) => {
      if (ts.isCallExpression(node) && node.expression.getText(nativeEditorSyntax) === 'clickPoint') {
        nativeOpenClicks.push(node);
      }
      ts.forEachChild(node, visitNativeOpen);
    };
    visitNativeOpen(nativeOpenFunction.body);
    assert.strictEqual(nativeOpenClicks.length, 1, 'Exact native editor opening must use one shared hit-tested Explorer click');
    assert.strictEqual(nativeOpenClicks[0].arguments[1].getText(nativeEditorSyntax), 'position');
    assert.match(nativeOpenClicks[0].arguments[0].getText(nativeEditorSyntax), /^boundedCdp\(connection, clickDeadline\)$/);
    assert.ok(
      !nativeOpenBody.includes('Input.dispatchMouseEvent') &&
        !nativeOpenBody.includes('clickCount: 2') &&
        !nativeOpenBody.includes('for (const clickCount of [1, 2])'),
      'Exact native editor opening must not regress to a raw synthetic double-click sequence'
    );
    for (const requiredContract of [
      "executeCommand('workbench.view.explorer')",
      'revealInExplorer',
      'explorer-viewlet .monaco-list-row',
      'opening the exact selected workflow.json in the native editor',
      'boundedCdp(connection, selectionDeadline)',
      "executeCommand('workbench.action.focusActiveEditorGroup')",
      '.native-edit-context',
      'document.activeElement === input',
      'modify(originalText, [...jsonPath], value',
      'applyEdits(originalText, edits)',
      'editor.selections',
      'Math.min(anchor, active) === edit.offset',
      'vscode.env.clipboard.writeText(text)',
      "pressKey(boundedCdp(connection, pasteDeadline), 'KeyV', 'v', 86, 2)",
      "pressKey(boundedCdp(connection, saveDeadline), 'KeyS', 's', 83, 2)",
      'isDeepStrictEqual(JSON.parse(fs.readFileSync(filePath',
      "pressKey(boundedCdp(connection, closeDeadline), 'KeyW', 'w', 87, 2)",
      'TabInputText',
      "button: 'right'",
      "'.monaco-menu .action-label'",
      "'Open Designer'",
      'Open Designer pointer click left the context menu open; pressing Enter',
      "pressKey(openDesignerCdp, 'Enter', 'Enter', 13, 0)",
      'observing the dismissed Open Designer context menu',
      'beforePoll?.()',
    ]) {
      assert.ok(nativeEditorActions.includes(requiredContract), `Native editor helper lost required contract: ${requiredContract}`);
    }
    assert.ok(
      isDeepStrictEqual(
        { type: 'Compose', inputs: 'test', runAfter: {}, runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } } },
        { inputs: 'test', runAfter: {}, runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } }, type: 'Compose' }
      ),
      'Persistence comparison must accept semantically equal JSON objects with different property order'
    );
    assert.ok(
      !nativeEditorActions.includes('JSON.stringify(JSON.parse(fs.readFileSync(filePath'),
      'Native editor persistence must not regress to property-order-sensitive JSON.stringify equality'
    );
    assert.ok(
      family.includes("'http-timeout-compose-native-editor-open'"),
      'The family must capture evidence after opening the exact native workflow.json editor'
    );
    assert.ok(
      family.includes("'http-timeout-compose-native-editor-replaced'"),
      'The family must capture evidence after exact native workflow.json replacement and before save'
    );
    assert.ok(
      nativeEditorActions.includes('isExactPath(editor.document.uri.fsPath, filePath)'),
      'Native editor helper must bind the active editor to the exact physical workflow.json path'
    );
    assert.ok(
      nativeEditorActions.includes('tabs.length === 1 && tabs[0].isActive && tabs[0].label.includes(workflowName)'),
      'Native editor helper must require one fresh active designer tab for the generated workflow'
    );
    const selectionIndex = family.indexOf('await selectHttpTimeoutComposeDesignerV2(');
    assert.ok(selectionIndex >= 0 && selectionIndex < family.indexOf("executeCommand('azureLogicAppsStandard.openDesigner'"));
  });
  await control('HTTP panel selectors and Settings identities are anchored to production components and prior art', () => {
    const panelContainer = fs.readFileSync(path.join(repository, 'libs/designer-ui/src/lib/panel/panelcontainer.tsx'), 'utf8');
    const panelContent = fs.readFileSync(path.join(repository, 'libs/designer-ui/src/lib/panel/panelcontent.tsx'), 'utf8');
    const panelTitle = fs.readFileSync(path.join(repository, 'libs/designer-ui/src/lib/panel/panelheader/panelheadertitle.tsx'), 'utf8');
    const settingsTab = fs.readFileSync(
      path.join(repository, 'libs/designer-v2/src/lib/ui/panel/nodeDetailsPanel/tabs/settingsTab.tsx'),
      'utf8'
    );
    const networking = fs.readFileSync(path.join(repository, 'libs/designer-v2/src/lib/ui/settings/sections/networking.tsx'), 'utf8');
    const manifest = fs.readFileSync(
      path.join(repository, 'libs/logic-apps-shared/src/designer-client-services/lib/base/manifests/http.ts'),
      'utf8'
    );
    const settingTokenField = fs.readFileSync(
      path.join(repository, 'libs/designer-ui/src/lib/settings/settingsection/settingTokenField.tsx'),
      'utf8'
    );
    const combobox = fs.readFileSync(path.join(repository, 'libs/designer-ui/src/lib/combobox/index.tsx'), 'utf8');
    const priorArt = fs.readFileSync(path.join(repository, 'apps/vs-code-designer/src/test/e2e/workspaceLifecycle.test.ts'), 'utf8');
    const readiness = fs.readFileSync(path.join(repository, 'apps/vs-code-designer/src/test/e2e/screenshotReadiness.ts'), 'utf8');
    assert.ok(panelContainer.includes("'msla-panel-layout', `msla-panel-border-${type}`"));
    assert.ok(panelContainer.includes("renderPanelContents(node, 'selected', false)"));
    assert.ok(panelContent.includes('id={`msla-node-details-panel-${nodeId}`}'));
    assert.ok(panelContent.includes("<Tab value={id} role={'tab'}>"));
    assert.ok(panelTitle.includes('id={titleId}'));
    assert.ok(panelTitle.includes('ariaLabel={panelHeaderCardTitle}'));
    assert.ok(settingsTab.includes('id: constants.PANEL_TAB_NAMES.SETTINGS'));
    assert.ok(settingsTab.includes("defaultMessage: 'Settings'"));
    assert.ok(networking.includes("defaultMessage: 'Request options - Timeout'"));
    assert.ok(networking.includes('ariaLabel: requestOptionsTitle'));
    assert.ok(networking.includes("defaultMessage: 'Asynchronous pattern'"));
    assert.ok(networking.includes('ariaLabel: asyncPatternTitle'));
    assert.ok(manifest.includes("title: 'Method'"));
    assert.ok(manifest.includes("description: 'Enter method'"));
    assert.ok(manifest.includes("required: ['uri', 'method']"));
    assert.ok(manifest.includes("{ value: 'GET', displayName: 'GET' }"));
    assert.ok(settingTokenField.includes('case constants.PARAMETER.EDITOR.COMBOBOX:'));
    assert.ok(settingTokenField.includes('label={label}'));
    assert.ok(settingTokenField.includes('placeholder={placeholder}'));
    assert.ok(settingTokenField.includes('options={dropdownOptions}'));
    assert.ok(combobox.includes('<FluentCombobox'));
    assert.ok(combobox.includes('aria-label={label}'));
    assert.ok(combobox.includes('placeholder={baseEditorProps.placeholder}'));
    assert.ok(combobox.includes('<Option key={option.key} value={option.key} text={option.displayName} disabled={option.disabled}>'));
    assert.ok(priorArt.includes("document.querySelectorAll('.msla-panel-layout.msla-panel-border-selected')"));
    assert.ok(
      priorArt.includes(
        'layout.querySelector(\'.msla-panel-header input[aria-label="Card title"], .msla-panel-header input[id$="-title"]\')'
      )
    );
    assert.ok(readiness.includes("visibleElements('.msla-panel-layout.msla-panel-border-selected')"));
    assert.ok(readiness.includes('layout.querySelector(\'[id^="msla-node-details-panel-"]'));
  });
  await control('HTTP Method uses the production Fluent combobox DOM and selects exact GET through native pointer input', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true });
    try {
      const method = fixture.window.document.querySelector('input[role="combobox"][aria-label="Method"]');
      assert.ok(method instanceof fixture.window.HTMLInputElement);
      assert.strictEqual(method.getAttribute('placeholder'), 'Enter method');
      assert.strictEqual(method.value, '');
      await fixture.driver().selectHttpMethodGet();
      assert.strictEqual(method.value, 'GET');
      assert.strictEqual(fixture.methodTransitionObserved(), true);
      assert.strictEqual(fixture.clicked.length, 2, 'Method selection requires one native control click and one native GET click');
      fixture.assertNativePointerShapes();
    } finally {
      fixture.dispose();
    }
  });
  for (const methodListboxRelationship of ['owns', 'both'] as const) {
    await control(`HTTP Method accepts one visible listbox through ${methodListboxRelationship}`, async () => {
      const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, methodListboxRelationship });
      try {
        await fixture.driver().selectHttpMethodGet();
        const method = fixture.window.document.querySelector('input[role="combobox"][aria-label="Method"]');
        assert.ok(method instanceof fixture.window.HTMLInputElement);
        assert.strictEqual(method.value, 'GET');
        assert.strictEqual(fixture.methodTransitionObserved(), true);
        assert.strictEqual(fixture.clicked.length, 2);
        fixture.assertNativePointerShapes();
      } finally {
        fixture.dispose();
      }
    });
  }
  for (const [name, fixtureOptions, expected] of [
    ['missing', { methodControlCount: 0 }, /exactly one visible, enabled HTTP Method control/],
    ['ambiguous', { methodControlCount: 2 }, /Production HTTP Method combobox was ambiguous/],
    ['disabled', { methodDisabled: true }, /Production HTTP Method combobox is disabled/],
    ['covered', { methodCovered: true }, /Production HTTP Method combobox is not hit-testable/],
    ['non-http-stable-id', { activePanelId: 'Compose', activePanelTitle: 'HTTP' }, /Active node-details panel is not HTTP/],
    ['inconsistent-http-title', { activePanelId: 'HTTP', activePanelTitle: 'Compose' }, /Active node-details panel is not HTTP/],
  ] as const) {
    await control(`${name} HTTP Method control fails closed without native selection`, async () => {
      const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, ...fixtureOptions });
      try {
        const startedAt = Date.now();
        await assert.rejects(() => fixture.driver(120).selectHttpMethodGet(), expected);
        assert.ok(Date.now() - startedAt < 1000, `${name} Method control must honor the local HTTP panel deadline`);
        assert.strictEqual(fixture.methodTransitionObserved(), false);
        assert.strictEqual(fixture.clicked.length, 0);
      } finally {
        fixture.dispose();
      }
    });
  }
  for (const [methodListboxRelationship, expected] of [
    ['missing', /HTTP Method listbox relationship is missing/],
    ['stale', /HTTP Method listbox relationship is stale/],
    ['hidden', /HTTP Method listbox relationship resolved to a hidden listbox/],
    ['not-listbox', /HTTP Method relationship did not resolve to a listbox/],
    ['ambiguous', /HTTP Method listbox relationship was ambiguous/],
  ] as const) {
    await control(`${methodListboxRelationship} HTTP Method listbox ownership fails closed without global fallback`, async () => {
      const fixture = await httpSettingsPanelDomFixture({
        panelOpen: true,
        methodListboxRelationship,
        includeUnrelatedGlobalListbox: true,
        methodOwnershipDeadlineRace: true,
      });
      try {
        const startedAt = Date.now();
        await assert.rejects(
          () => fixture.driver(220).selectHttpMethodGet(),
          (error: Error) => {
            assert.match(error.message, /Timed out waiting for exactly one visible, enabled HTTP Method GET option/);
            assert.match(error.message, expected);
            assert.match(error.message, /Last bounded error: Error: Designer CDP action deadline expired/);
            return true;
          }
        );
        assert.ok(Date.now() - startedAt < 1000, `${methodListboxRelationship} Method ownership must honor the local deadline`);
        assert.strictEqual(
          fixture.methodOwnershipObservationCount(),
          2,
          'Ownership polling must stop after the in-flight bounded observation reaches the local deadline'
        );
        assert.strictEqual(fixture.clicked.length, 1, 'Only the expanded Method combobox may receive native input');
        assert.ok(!fixture.clicked.includes('unrelated-get-option'), 'An unrelated global GET option must never be selected');
        assert.strictEqual(fixture.methodTransitionObserved(), false);
        fixture.assertNativePointerShapes();
      } finally {
        fixture.dispose();
      }
    });
  }
  for (const [name, fixtureOptions, expected] of [
    ['ambiguous', { duplicateGetOption: true }, /Exact HTTP Method GET option was ambiguous/],
    ['disabled', { getOptionDisabled: true }, /HTTP Method GET option is disabled/],
    ['covered', { getOptionCovered: true }, /HTTP Method GET option is not hit-testable/],
  ] as const) {
    await control(`${name} HTTP Method GET option fails closed after one native control click`, async () => {
      const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, ...fixtureOptions });
      try {
        await assert.rejects(() => fixture.driver(500).selectHttpMethodGet(), expected);
        assert.strictEqual(fixture.clicked.length, 1, 'Only the Method control may be clicked before an invalid GET option fails closed');
        assert.strictEqual(fixture.methodTransitionObserved(), false);
        fixture.assertNativePointerShapes();
      } finally {
        fixture.dispose();
      }
    });
  }
  await control('stale HTTP Method control fails closed on the local deadline after native moved/pressed/released input', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, staleMethodControl: true });
    try {
      const startedAt = Date.now();
      await assert.rejects(() => fixture.driver(180).selectHttpMethodGet(), /HTTP Method combobox has not opened/);
      assert.ok(Date.now() - startedAt < 1000, 'Stale Method control must honor the local HTTP panel deadline');
      assert.deepStrictEqual(
        fixture.mouseEvents.slice(0, 3).map(({ type, button, buttons, clickCount }) => ({ type, button, buttons, clickCount })),
        [
          { type: 'mouseMoved', button: 'none', buttons: undefined, clickCount: undefined },
          { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1 },
          { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1 },
        ]
      );
      assert.strictEqual(fixture.clicked.length, 0);
      assert.strictEqual(fixture.methodTransitionObserved(), false);
    } finally {
      fixture.dispose();
    }
  });
  await control('stale HTTP Method GET option fails closed without accepting an implicit method', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, staleGetOption: true });
    try {
      const startedAt = Date.now();
      await assert.rejects(() => fixture.driver(220).selectHttpMethodGet(), /HTTP Method GET selected in the active HTTP panel/);
      assert.ok(Date.now() - startedAt < 1000, 'Stale GET option must honor the local HTTP panel deadline');
      assert.strictEqual(fixture.clicked.length, 1, 'Only the stable Method control click may complete');
      assert.strictEqual(fixture.methodTransitionObserved(), false);
      const method = fixture.window.document.querySelector('input[role="combobox"][aria-label="Method"]');
      assert.ok(method instanceof fixture.window.HTMLInputElement);
      assert.strictEqual(method.value, '', 'The unit must fail if HTTP authoring relies on an implicit Method');
      assert.deepStrictEqual(
        fixture.mouseEvents.slice(-3).map(({ type, button, buttons, clickCount }) => ({ type, button, buttons, clickCount })),
        [
          { type: 'mouseMoved', button: 'none', buttons: undefined, clickCount: undefined },
          { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1 },
          { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1 },
        ]
      );
    } finally {
      fixture.dispose();
    }
  });
  await control('HTTP Settings prefers the associated label over the overlaid native switch input', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, timeoutLabel: 'Action timeout' });
    try {
      await fixture.driver().configureHttpRequestSettings('PT1S');
      assert.strictEqual(fixture.clicked.filter((id) => id === 'msla-node-HTTP').length, 0);
      assert.strictEqual(fixture.clicked.filter((id) => id === 'http-settings').length, 1);
      assert.strictEqual(fixture.clicked.filter((id) => id === 'async-pattern-label').length, 1);
      assert.ok(!fixture.clicked.includes('async-pattern'), 'The opacity-zero native switch input must not be the click target');
      const timeoutInput = fixture.window.document.getElementById('request-timeout');
      assert.ok(timeoutInput instanceof fixture.window.HTMLInputElement);
      assert.strictEqual(timeoutInput.value, 'PT1S');
      const asyncPattern = fixture.window.document.getElementById('async-pattern');
      assert.ok(asyncPattern instanceof fixture.window.HTMLInputElement);
      assert.strictEqual(asyncPattern.getAttribute('role'), 'switch');
      assert.strictEqual(asyncPattern.getAttribute('aria-label'), 'Asynchronous pattern');
      assert.strictEqual(fixture.window.getComputedStyle(asyncPattern).opacity, '0');
      assert.strictEqual(asyncPattern.labels?.[0]?.id, 'async-pattern-label');
      const indicator = fixture.window.document.getElementById('async-pattern-indicator');
      assert.ok(indicator instanceof fixture.window.HTMLElement);
      assert.strictEqual(fixture.window.getComputedStyle(indicator).pointerEvents, 'none');
      assert.strictEqual(asyncPattern.checked, false);
      assert.strictEqual(fixture.switchTransitionObserved(), true, 'Driver must observe the native checked-state transition');
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  await control('HTTP Settings opens a closed panel through the proven HTTP node interaction', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: false });
    try {
      await fixture.driver().configureHttpRequestSettings('PT24H');
      assert.strictEqual(fixture.clicked.filter((id) => id === 'msla-node-HTTP').length, 1);
      assert.strictEqual(fixture.clicked.filter((id) => id === 'http-settings').length, 1);
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  await control('HTTP Settings scopes normalized tab text to the selected HTTP node-details panel', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true });
    try {
      await fixture.driver().configureHttpRequestSettings('PT1S');
      assert.ok(fixture.clicked.includes('http-settings'));
      assert.ok(!fixture.clicked.includes('unrelated-settings'));
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  for (const [name, fixtureOptions, selectedNodeIdentity] of [
    ['non-http stable ID with HTTP title', { activePanelId: 'Compose', activePanelTitle: 'HTTP' }, '["Compose","HTTP"]'],
    ['stable HTTP ID with inconsistent title', { activePanelId: 'HTTP', activePanelTitle: 'Compose' }, '["HTTP","Compose"]'],
  ] as const) {
    await control(`HTTP Settings rejects ${name}`, async () => {
      const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, ...fixtureOptions });
      try {
        const startedAt = Date.now();
        await assert.rejects(
          () => fixture.driver(100).configureHttpRequestSettings('PT1S'),
          (error: Error) => {
            assert.match(error.message, /visible hit-tested Settings tab inside the active HTTP node-details panel/);
            assert.ok(error.message.includes(`selectedNodeIdentity=${selectedNodeIdentity}`));
            return true;
          }
        );
        assert.ok(Date.now() - startedAt < 1000, `${name} must fail on the local HTTP panel deadline`);
        assert.ok(!fixture.clicked.includes('http-settings'));
        assert.ok(!fixture.clicked.includes('unrelated-settings'));
      } finally {
        fixture.dispose();
      }
    });
  }
  await control('HTTP Settings uses indicator coordinates when the same native switch input receives the pointer sequence', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, switchTarget: 'indicator' });
    try {
      const indicator = fixture.window.document.getElementById('async-pattern-indicator');
      const asyncPattern = fixture.window.document.getElementById('async-pattern');
      assert.ok(indicator instanceof fixture.window.HTMLElement);
      assert.ok(asyncPattern instanceof fixture.window.HTMLInputElement);
      assert.strictEqual(asyncPattern.checked, true);
      const indicatorRect = indicator.getBoundingClientRect();
      assert.strictEqual(
        fixture.window.document.elementFromPoint(
          indicatorRect.left + indicatorRect.width / 2,
          indicatorRect.top + indicatorRect.height / 2
        ),
        asyncPattern,
        'The opacity-zero native input must overlay the non-hit-testable Fluent indicator'
      );
      await fixture.driver().configureHttpRequestSettings('PT1S');
      assert.strictEqual(fixture.clicked.filter((id) => id === 'async-pattern').length, 1);
      assert.ok(!fixture.clicked.includes('async-pattern-indicator'));
      assert.deepStrictEqual(
        fixture.mouseEvents
          .filter(({ targetId }) => targetId === 'async-pattern')
          .map(({ type, button, buttons, clickCount }) => ({ type, button, buttons, clickCount })),
        [
          { type: 'mouseMoved', button: 'none', buttons: undefined, clickCount: undefined },
          { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1 },
          { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1 },
        ]
      );
      assert.strictEqual(asyncPattern.checked, false);
      assert.strictEqual(fixture.switchTransitionObserved(), true);
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  await control('HTTP Settings does not click an already-disabled asynchronous-pattern switch', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, switchChecked: false });
    try {
      await fixture.driver().configureHttpRequestSettings('PT1S');
      assert.ok(!fixture.clicked.includes('async-pattern-label'));
      assert.ok(!fixture.clicked.includes('async-pattern-indicator'));
      assert.ok(!fixture.clicked.includes('async-pattern'));
      assert.strictEqual(fixture.switchTransitionObserved(), false);
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  await control('ambiguous asynchronous-pattern labels fail closed without clicking either target', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, switchTarget: 'ambiguous' });
    try {
      await assert.rejects(() => fixture.driver().configureHttpRequestSettings('PT1S'), /Visible associated switch label was ambiguous/);
      assert.ok(!fixture.clicked.includes('async-pattern-label'));
      assert.ok(!fixture.clicked.includes('async-pattern-label-secondary'));
      assert.ok(!fixture.clicked.includes('async-pattern'));
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  await control('disabled asynchronous-pattern switch fails closed without native input', async () => {
    const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, switchDisabled: true });
    try {
      await assert.rejects(() => fixture.driver().configureHttpRequestSettings('PT1S'), /Production switch input is disabled/);
      assert.ok(!fixture.clicked.includes('async-pattern-label'));
      assert.ok(!fixture.clicked.includes('async-pattern-indicator'));
      assert.ok(!fixture.clicked.includes('async-pattern'));
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  for (const [switchTarget, expectedReason] of [
    ['missing', 'No visible associated label or Fluent switch indicator found'],
    ['covered', 'Visible Fluent switch indicator was not enabled and hit-testable'],
  ] as const) {
    await control(`${switchTarget} asynchronous-pattern target fails closed on the local HTTP Settings deadline`, async () => {
      const fixture = await httpSettingsPanelDomFixture({ panelOpen: true, switchTarget });
      try {
        if (switchTarget === 'covered') {
          const indicator = fixture.window.document.getElementById('async-pattern-indicator');
          const cover = fixture.window.document.getElementById('async-pattern-cover');
          assert.ok(indicator instanceof fixture.window.HTMLElement);
          assert.ok(cover instanceof fixture.window.HTMLElement);
          const indicatorRect = indicator.getBoundingClientRect();
          assert.strictEqual(
            fixture.window.document.elementFromPoint(
              indicatorRect.left + indicatorRect.width / 2,
              indicatorRect.top + indicatorRect.height / 2
            ),
            cover,
            'An unrelated overlay at indicator coordinates must remain the hit target'
          );
        }
        const startedAt = Date.now();
        await assert.rejects(
          () => fixture.driver(500).configureHttpRequestSettings('PT1S'),
          (error: Error) => {
            assert.match(error.message, /one visible, enabled, hit-testable Asynchronous pattern target/);
            assert.ok(error.message.includes(expectedReason));
            return true;
          }
        );
        assert.ok(Date.now() - startedAt < 1500, `${switchTarget} target must honor the local HTTP Settings deadline`);
        assert.ok(!fixture.clicked.includes('async-pattern-label'));
        assert.ok(!fixture.clicked.includes('async-pattern-indicator'));
        assert.ok(!fixture.clicked.includes('async-pattern'));
        fixture.assertNativeClickSequences();
      } finally {
        fixture.dispose();
      }
    });
  }
  await control('asynchronous-pattern checked-state polling honors the local HTTP Settings deadline', async () => {
    const fixture = await httpSettingsPanelDomFixture({
      panelOpen: true,
      switchTransitionDelayMs: 1000,
    });
    try {
      const startedAt = Date.now();
      await assert.rejects(
        () => fixture.driver(500).configureHttpRequestSettings('PT1S'),
        /Timed out waiting for disabled Asynchronous pattern/
      );
      assert.ok(Date.now() - startedAt < 1500, 'Checked-state polling must not inherit the suite-wide deadline');
      assert.strictEqual(fixture.clicked.filter((id) => id === 'async-pattern-label').length, 1);
      assert.ok(!fixture.clicked.includes('async-pattern'));
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  await control('missing scoped HTTP Settings tab fails on its local bound with panel and overlay diagnostics', async () => {
    const fixture = await httpSettingsPanelDomFixture({
      panelOpen: true,
      includeSettings: false,
      overlayText: 'Add an action menu',
    });
    try {
      const startedAt = Date.now();
      await assert.rejects(
        () => fixture.driver(80).configureHttpRequestSettings('PT1S'),
        (error: Error) => {
          assert.match(error.message, /visible hit-tested Settings tab inside the active HTTP node-details panel/);
          assert.match(error.message, /selectedNodeIdentity=\["HTTP","HTTP"\]/);
          assert.match(error.message, /tabs=\["Parameters"\]/);
          assert.match(error.message, /overlays=\["Add an action menu"\]/);
          return true;
        }
      );
      assert.ok(Date.now() - startedAt < 1000, 'Missing Settings must honor the local driver-control deadline');
      const source = fs.readFileSync(path.join(repository, 'apps/vs-code-designer/src/test/e2e/httpTimeoutComposeDriver.ts'), 'utf8');
      assert.ok(source.includes('const httpSettingsPanelTimeoutMs = 45_000;'));
      assert.ok(source.includes('Math.min(this.deadline, startedAt + this.settingsPanelTimeoutMs)'));
      assert.ok(source.includes('input[role="combobox"][aria-label="Method"]'));
      assert.ok(source.includes("normalize(option.textContent) === 'GET'"));
      assert.ok(source.includes("'HTTP Method GET selected in the active HTTP panel'"));
      assert.ok(source.includes('input[role="switch"][aria-label="Asynchronous pattern"]'));
      assert.ok(source.includes('input.labels?.[0]'));
      assert.ok(source.includes('Array.from(input.labels || []).filter(visible)'));
      assert.ok(source.includes("switchRoot.querySelectorAll('.fui-Switch__indicator')"));
      assert.ok(source.includes('acceptInputHit && hit === input'));
      assert.ok(source.includes('pointFor(indicators[0], true)'));
      assert.ok(source.includes('await clickPoint(localCdp, observation.point);'));
      const switchDriver = source.slice(
        source.indexOf('private async disableAsyncPattern'),
        source.indexOf('private async openHttpSettings')
      );
      const methodDriver = source.slice(source.indexOf('async selectHttpMethodGet'), source.indexOf('async configureHttpRequestSettings'));
      const methodOptionDriver = source.slice(
        source.indexOf('private async httpMethodGetOptionObservation'),
        source.indexOf('private async disableAsyncPattern')
      );
      assert.ok(methodDriver.includes('const localCdp = boundedCdp(this.cdp, deadline);'));
      assert.ok(methodDriver.includes('await clickPoint(localCdp, control.point);'));
      assert.ok(methodDriver.includes('await clickPoint(localCdp, option.point);'));
      assert.ok(methodOptionDriver.includes("['aria-controls', 'aria-owns']"));
      assert.ok(!methodOptionDriver.includes('document.querySelectorAll(\'[role="listbox"]\')'));
      assert.ok(!methodDriver.includes('.click('), 'Method driver must not invoke a DOM or generic element click');
      assert.ok(!/\.value\s*=(?!=)/.test(methodDriver), 'Method driver must not assign the production combobox value');
      assert.ok(!switchDriver.includes('.click('), 'Switch driver must not invoke a DOM or generic element click');
      assert.ok(!/\.checked\s*=(?!=)/.test(switchDriver), 'Switch driver must not mutate native checked state');
      fixture.assertNativeClickSequences();
    } finally {
      fixture.dispose();
    }
  });
  await control('stalled HTTP panel CDP honors the tight local deadline for every bounded operation', async () => {
    const timeoutBudgets: number[] = [];
    const stalledCdp: CdpEvaluator = {
      evaluate<T>(_contextId: number | undefined, _expression: string, options?: { timeoutMs?: number }): Promise<T> {
        const timeoutMs = options?.timeoutMs ?? 5000;
        timeoutBudgets.push(timeoutMs);
        return new Promise<T>((_resolve, reject) => {
          setTimeout(() => reject(new Error('stalled HTTP panel evaluate')), Math.max(1, timeoutMs));
        });
      },
      send(_method: string, _params?: Record<string, unknown>, options?: { timeoutMs?: number }): Promise<unknown> {
        const timeoutMs = options?.timeoutMs ?? 5000;
        timeoutBudgets.push(timeoutMs);
        return new Promise<unknown>((_resolve, reject) => {
          setTimeout(() => reject(new Error('stalled HTTP panel send')), Math.max(1, timeoutMs));
        });
      },
    };
    const startedAt = Date.now();
    const driver = new HttpTimeoutComposeDriver(stalledCdp, 17, Date.now() + 20_000, () => {}, 80);
    await assert.rejects(() => driver.configureHttpRequestSettings('PT1S'), /stalled HTTP panel evaluate/);
    assert.ok(Date.now() - startedAt < 1000, 'Stalled CDP must not inherit the family deadline');
    assert.ok(timeoutBudgets.length >= 1);
    assert.ok(timeoutBudgets.every((timeoutMs) => timeoutMs > 0 && timeoutMs <= 80));
    const source = fs.readFileSync(path.join(repository, 'apps/vs-code-designer/src/test/e2e/httpTimeoutComposeDriver.ts'), 'utf8');
    for (const boundedOperation of [
      'const localCdp = boundedCdp(this.cdp, deadline);',
      'new ProvenDesignerCdpActions(localCdp, this.contextId, deadline, this.assertActive)',
      'this.httpSettingsPanelObservation(localCdp)',
      "await localActions.clickNode(['HTTP']);",
      'await clickPoint(localCdp, observation.settingsPoint);',
    ]) {
      assert.ok(source.includes(boundedOperation), `HTTP panel operation lost local CDP bound: ${boundedOperation}`);
    }
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
