import * as assert from 'assert';
import { clickPoint, type CdpEvaluator, type Point } from './cdpFormHelpers';

const visibleDom = `
  const bounds = (element) => {
    let left = 0, top = 0, right = innerWidth, bottom = innerHeight;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') return null;
      const rect = parent.getBoundingClientRect();
      if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) {
        left = Math.max(left, rect.left); right = Math.min(right, rect.right);
      }
      if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) {
        top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom);
      }
    }
    return { left, top, right, bottom };
  };
  const visible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const clip = bounds(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
      style.visibility !== 'hidden' && style.opacity !== '0' && element.getClientRects().length > 0 &&
      clip && rect.bottom > clip.top && rect.right > clip.left && rect.top < clip.bottom && rect.left < clip.right;
  };
  const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
`;

export const requestTriggerTitles = ['When an HTTP request is received', 'When a HTTP request is received'];
export const responseActionTitle = 'Response';

export interface DesignerClickResult {
  ok: boolean;
  reason?: string;
  point?: Point;
  text?: string;
  candidates?: string[];
}

export class DesignerCdpActions {
  constructor(
    readonly cdp: CdpEvaluator,
    readonly contextId: number,
    readonly deadline: number,
    readonly assertActive: () => void = () => undefined
  ) {}

  async evaluate<T>(expression: string): Promise<T> {
    this.assertActive();
    return this.cdp.evaluate<T>(this.contextId, expression, {
      timeoutMs: Math.min(5000, this.remaining()),
    });
  }

  async send(method: string, params: Record<string, unknown>): Promise<unknown> {
    this.assertActive();
    return this.cdp.send(method, params, { timeoutMs: Math.min(5000, this.remaining()) });
  }

  async click(selector: string, names: string[] = [], last = false): Promise<void> {
    const point = await this.poll(
      () =>
        this.evaluate<Point | null>(`(() => {
        ${visibleDom}
        const names = ${JSON.stringify(names)};
        const matches = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
          .filter(visible).filter(element => !element.disabled && element.getAttribute('aria-disabled') !== 'true')
          .filter(element => !names.length || names.includes(normalize(
            element.querySelector('.msla-op-search-card-title')?.textContent ||
            element.getAttribute('aria-label') || element.textContent)));
        const element = ${last ? 'matches.at(-1)' : 'matches[0]'};
        if (!element) return null;
        element.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = element.getBoundingClientRect();
        const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const hit = document.elementFromPoint(point.x, point.y);
        return hit && (hit === element || element.contains(hit)) ? point : null;
      })()`),
      (value) => value !== null,
      `visible clickable ${names.join('/') || selector}`
    );
    assert.ok(point);
    await clickPoint(
      {
        evaluate: <T>(_contextId: number | undefined, expression: string) => this.evaluate<T>(expression),
        send: (method, params) => this.send(method, params ?? {}),
      },
      point
    );
  }

  async clickElement(
    selectors: string[],
    textToFind: string,
    options: { requireTextMatch?: boolean; useLastMatch?: boolean } = {}
  ): Promise<DesignerClickResult> {
    let lastResult: DesignerClickResult | undefined;
    const result = await this.poll(
      async () => {
        lastResult = await this.evaluate<DesignerClickResult>(`(() => {
          ${visibleDom}
          const selectors = ${JSON.stringify(selectors)};
          const textToFind = ${JSON.stringify(textToFind.toLowerCase())};
          const requireTextMatch = ${JSON.stringify(options.requireTextMatch !== false)};
          const useLastMatch = ${JSON.stringify(options.useLastMatch === true)};
          const candidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
            .filter(visible)
            .filter((element) => {
              if (!requireTextMatch || !textToFind) return true;
              return [
                element.textContent,
                element.getAttribute('aria-label'),
                element.getAttribute('title'),
              ].some((value) => normalize(value).toLowerCase().includes(textToFind));
            });
          const debugCandidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
            .filter(visible)
            .slice(0, 12)
            .map((element) => [
              element.getAttribute('data-automation-id'),
              element.getAttribute('aria-label'),
              element.getAttribute('title'),
              normalize(element.textContent).slice(0, 120),
            ].filter(Boolean).join(' | '));
          const element = useLastMatch ? candidates.at(-1) : candidates[0];
          if (!(element instanceof HTMLElement)) {
            return { ok: false, reason: 'Element not found', candidates: debugCandidates, text: document.body?.innerText || '' };
          }
          element.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = element.getBoundingClientRect();
          const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          const hit = document.elementFromPoint(point.x, point.y);
          if (!hit || (hit !== element && !element.contains(hit))) {
            return { ok: false, reason: 'Element was not hit-testable', candidates: debugCandidates, text: normalize(element.textContent) };
          }
          return { ok: true, point, text: normalize(element.textContent || element.getAttribute('aria-label') || '') };
        })()`);
        return lastResult;
      },
      (value) => value.ok && value.point !== undefined,
      `clickable designer element "${textToFind}". Last state=${JSON.stringify(lastResult)}`
    );
    assert.ok(result.point);
    await this.dispatchClick(result.point);
    return result;
  }

  async key(code: string, key: string, virtualKey: number, modifiers = 0): Promise<void> {
    for (const type of ['keyDown', 'keyUp']) {
      await this.send('Input.dispatchKeyEvent', {
        type,
        code,
        key,
        windowsVirtualKeyCode: virtualKey,
        nativeVirtualKeyCode: virtualKey,
        modifiers,
      });
    }
  }

  async replaceFocused(value: string): Promise<void> {
    await this.key('KeyA', 'a', 65, 2);
    await this.send('Input.insertText', { text: value });
  }

  async save(): Promise<void> {
    await this.click('[role="toolbar"] button, button[aria-label="Save"]', ['Save']);
    await this.poll(
      () =>
        this.evaluate<boolean>(`(() => {
          ${visibleDom}
          const buttons = Array.from(document.querySelectorAll('[role="toolbar"] button, button[aria-label*="Sav"]')).filter(visible);
          return buttons.some((button) => {
            const text = normalize(button.textContent || button.getAttribute('aria-label')).toLowerCase();
            return text === 'save' && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
          });
        })()`),
      Boolean,
      'designer save completion'
    );
  }

  async waitForDesignerReady(existingNodeTitles: string[] = []): Promise<void> {
    await this.poll(
      () =>
        this.evaluate<boolean>(`(() => {
          ${visibleDom}
          const toolbarText = Array.from(document.querySelectorAll('[role="toolbar"] button, button'))
            .filter(visible)
            .map((button) => normalize(button.textContent || button.getAttribute('aria-label')).toLowerCase());
          const hasSave = toolbarText.some((value) => value === 'save' || value.includes('save'));
          if (!hasSave) return false;
          const addTrigger = Array.from(document.querySelectorAll(
            '[data-testid="card-Add a trigger"], [data-testid="card-Add trigger"], ' +
            '[data-automation-id="card-Add_a_trigger"], [data-automation-id="card-Add_trigger"], ' +
            '[aria-label="Add a trigger"], [aria-label="Add trigger"]'
          )).filter(visible).find((element) => {
            const rect = element.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return hit && (hit === element || element.contains(hit));
          });
          if (addTrigger) return true;
          const titles = ${JSON.stringify(existingNodeTitles.map((title) => title.toLowerCase()))};
          return titles.length > 0 && Array.from(document.querySelectorAll('.react-flow__node, [id^="msla-node-"]'))
            .filter(visible)
            .some((node) => titles.some((title) => normalize(node.textContent).toLowerCase().includes(title)));
        })()`),
      Boolean,
      'semantic Designer readiness'
    );
  }

  async addRequestTrigger(): Promise<void> {
    await this.click(
      [
        '[data-testid="card-Add a trigger"]',
        '[data-testid="card-Add trigger"]',
        '[data-automation-id="card-Add_a_trigger"]',
        '[data-automation-id="card-Add_trigger"]',
        '[aria-label="Add a trigger"]',
        '[aria-label="Add trigger"]',
      ].join(', ')
    );
    await this.waitForDiscoveryPanel('Request trigger discovery panel');
    await this.discover('Request', requestTriggerTitles, [
      'when a http request is received',
      'when an http request is received',
      'http request',
    ]);
    await this.waitNode(requestTriggerTitles);
    await this.closePanel();
  }

  async addAction(search: string, operationName: string, variants: string[] = [operationName.toLowerCase()]): Promise<void> {
    await this.openActionDiscovery();
    await this.discover(search, [operationName], variants);
    await this.waitNode([operationName]);
  }

  async search(search: string): Promise<void> {
    await this.click('[data-automation-id="msla-search-box"] input, .msla-search-box input, input[placeholder*="Search"]');
    await this.replaceFocused(search);
    await this.poll(
      () =>
        this.evaluate<boolean>(`(() => {
          ${visibleDom}
          return Array.from(document.querySelectorAll(
            '[data-automation-id="msla-search-box"] input, .msla-search-box input, input[placeholder*="Search"]'
          )).some(element => visible(element) && element.value === ${JSON.stringify(search)});
        })()`),
      Boolean,
      `discovery search text "${search}"`
    );
  }

  async discover(search: string, titles: string[], variants: string[] = titles.map((title) => title.toLowerCase())): Promise<void> {
    await this.search(search);
    await this.waitForSearchResults(`${search} search results`);
    await this.selectOperation(titles[0], variants);
  }

  async openActionDiscovery(): Promise<void> {
    await this.closePanel();
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.click(
        [
          '[data-automation-id^="msla-plus-button-"]',
          '[id^="msla-edge-button-"]',
          '[data-testid="card-Add an action"]',
          '[data-automation-id="card-Add_an_action"]',
          '[aria-label="Add an action"]',
        ].join(', '),
        [],
        true
      );
      const state = await this.waitForDiscoveryState(7500);
      if (state === 'panel') {
        return;
      }
      if (state === 'menu') {
        await this.click('[data-automation-id^="msla-add-button-"], [role="menuitem"]', ['Add an action']);
        await this.waitForDiscoveryPanel('action discovery panel');
        return;
      }
    }
    await this.waitForDiscoveryPanel('action discovery panel');
  }

  async selectOperation(operationName: string, variants: string[]): Promise<void> {
    const expected = [operationName, ...variants].map((variant) => variant.toLowerCase());
    let lastCandidates: string[] = [];
    for (let attempt = 0; attempt < 20; attempt++) {
      const result = await this.evaluate<{ point?: Point; candidates: string[] }>(`(() => {
        ${visibleDom}
        const variants = ${JSON.stringify(expected)};
        const selectors = [
          '[data-automation-id^="msla-op-search-result-"]',
          '[data-testid^="msla-op-search-result-"]',
          '.msla-op-search-card-container',
          '.msla-op-search-card',
          '.msla-recommendation-panel-card',
          '[role="option"]',
        ];
        const cards = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter(visible);
        const details = (card) => {
          const title = normalize(card.querySelector('.msla-op-search-card-title')?.textContent);
          const text = normalize(title || card.textContent).toLowerCase();
          const combined = [text, card.getAttribute('aria-label'), card.getAttribute('data-automation-id')]
            .map(normalize).join(' ').toLowerCase();
          return { title, text, combined };
        };
        const candidates = cards.slice(0, 16).map((card) => details(card).combined.slice(0, 200));
        const exact = cards.find((card) => details(card).text === variants[0]);
        const element = exact || cards.find((card) => {
          const { text, combined } = details(card);
          if (combined === 'all' || combined.startsWith('all ')) return false;
          if (variants[0] === 'get current weather' && text.includes(variants[0]) && text !== variants[0] && !combined.includes('msnweather')) {
            return false;
          }
          return variants.some((variant) => combined.includes(variant));
        });
        if (!(element instanceof HTMLElement)) return { candidates };
        element.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = element.getBoundingClientRect();
        const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const hit = document.elementFromPoint(point.x, point.y);
        return hit && (hit === element || element.contains(hit)) ? { point, candidates } : { candidates };
      })()`);
      lastCandidates = result.candidates;
      if (result.point) {
        await this.dispatchClick(result.point);
        return;
      }
      await this.evaluate(`(() => {
        ${visibleDom}
        const containers = Array.from(document.querySelectorAll('div'))
          .filter(visible)
          .filter((element) => /(auto|scroll)/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 20)
          .sort((a, b) => b.clientHeight - a.clientHeight);
        const container = containers.find((element) => element.textContent?.includes('connector results found')) || containers[0];
        if (container) container.scrollTop += 650;
      })()`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    assert.fail(`Expected operation card "${operationName}". Candidates=${JSON.stringify(lastCandidates)}`);
  }

  async hasNode(titles: string[]): Promise<boolean> {
    return this.evaluate<boolean>(`(() => {
      ${visibleDom}
      const titles = ${JSON.stringify(titles.map((title) => title.toLowerCase()))};
      return Array.from(document.querySelectorAll('.react-flow__node, [id^="msla-node-"]'))
        .some(element => visible(element) && titles.some(title => normalize(element.textContent).toLowerCase().includes(title)));
    })()`);
  }

  async waitNode(titles: string[]): Promise<void> {
    await this.poll(() => this.hasNode(titles), Boolean, `${titles.join('/')} canvas node`);
  }

  async clickNode(titles: string[]): Promise<void> {
    const point = await this.poll(
      () =>
        this.evaluate<Point | null>(`(() => {
          ${visibleDom}
          const titles = ${JSON.stringify(titles.map((title) => title.toLowerCase()))};
          const nodes = Array.from(document.querySelectorAll('.react-flow__node, [id^="msla-node-"]')).filter(visible);
          const element = nodes.filter((node) => titles.some((title) => normalize(node.textContent).toLowerCase().includes(title))).at(-1);
          if (!(element instanceof HTMLElement)) return null;
          element.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = element.getBoundingClientRect();
          const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          const hit = document.elementFromPoint(point.x, point.y);
          return hit && (hit === element || element.contains(hit)) ? point : null;
        })()`),
      (value) => value !== null,
      `${titles.join('/')} designer node`
    );
    assert.ok(point);
    await this.dispatchClick(point);
  }

  async closePanel(): Promise<void> {
    const open = await this.evaluate<boolean>(`(() => {
      ${visibleDom}
      return Array.from(document.querySelectorAll(
        '[data-automation-id="msla-panel-header-close-nav"], button[aria-label="Close"]'
      )).some(visible);
    })()`);
    if (!open) {
      return;
    }
    await this.click('[data-automation-id="msla-panel-header-close-nav"], button[aria-label="Close"]', [], true);
    await this.poll(
      () =>
        this.evaluate<boolean>(`(() => {
          ${visibleDom}
          return !Array.from(document.querySelectorAll(
            '[data-automation-id="msla-panel-header-close-nav"], button[aria-label="Close"]'
          )).some(visible);
        })()`),
      Boolean,
      'details panel close'
    );
  }

  async fillParameter(labels: string[], value: string): Promise<void> {
    const point = await this.poll(
      () =>
        this.evaluate<Point | null>(`(() => {
          ${visibleDom}
          const labels = ${JSON.stringify(labels.map((label) => label.toLowerCase()))};
          const editors = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"]')).filter(visible);
          const identity = (element) => [
            element.textContent,
            element.getAttribute('aria-label'),
            element.getAttribute('aria-labelledby')?.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' '),
            element.getAttribute('data-testid'),
            element.getAttribute('data-automation-id'),
            element.getAttribute('placeholder'),
            element.getAttribute('title'),
          ].map(normalize).join(' ').toLowerCase();
          let editor = editors.find((element) => labels.some((label) => identity(element).includes(label)));
          if (!editor) {
            const labelElements = Array.from(document.querySelectorAll('label, span, div, p, [data-automation-id], [data-testid]'))
              .filter(visible)
              .filter((element) => labels.some((label) => identity(element) === label || identity(element).includes(label)))
              .sort((a, b) => identity(a).length - identity(b).length);
            for (const label of labelElements) {
              let container = label;
              for (let depth = 0; depth < 6 && container; depth++) {
                editor = Array.from(container.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"]')).find(visible);
                if (editor) break;
                container = container.parentElement;
              }
              if (editor) break;
            }
          }
          if (!(editor instanceof HTMLElement)) return null;
          editor.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = editor.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()`),
      (result) => result !== null,
      `${labels.join('/')} parameter editor`
    );
    assert.ok(point);
    await this.dispatchClick(point);
    await this.replaceFocused(value);
  }

  async waitForText(expectedText: string[], description: string): Promise<void> {
    await this.poll(
      () =>
        this.evaluate<boolean>(`(() => {
          const text = (document.body?.innerText || '').toLowerCase();
          return ${JSON.stringify(expectedText.map((text) => text.toLowerCase()))}.some((expected) => text.includes(expected));
        })()`),
      Boolean,
      description
    );
  }

  private async discoveryState(): Promise<'panel' | 'menu' | ''> {
    return this.evaluate(`(() => {
      ${visibleDom}
      if (Array.from(document.querySelectorAll(
        '[data-automation-id="msla-search-box"], .msla-search-box, .msla-panel-root-Discovery, ' +
        '[data-automation-id="msla-search-box"] input, .msla-search-box input, input[placeholder*="Search"]'
      )).some(visible)) return 'panel';
      if (Array.from(document.querySelectorAll(
        '[data-automation-id^="msla-add-button-"], [role="menuitem"]'
      )).some((element) => visible(element) && normalize(element.getAttribute('aria-label') || element.textContent) === 'Add an action'))
        return 'menu';
      return '';
    })()`);
  }

  private async waitForDiscoveryState(timeoutMs: number): Promise<'panel' | 'menu' | ''> {
    const deadline = Math.min(this.deadline, Date.now() + timeoutMs);
    while (Date.now() < deadline) {
      const state = await this.discoveryState();
      if (state) {
        return state;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return '';
  }

  private async dispatchClick(point: Point): Promise<void> {
    this.assertActive();
    this.remaining();
    await clickPoint(
      {
        evaluate: <T>(_contextId: number | undefined, expression: string) => this.evaluate<T>(expression),
        send: (method, params) => this.send(method, params ?? {}),
      },
      point
    );
  }

  async waitForDiscoveryPanel(description: string): Promise<void> {
    await this.poll(
      () => this.discoveryState(),
      (state) => state === 'panel',
      description
    );
  }

  async waitForSearchResults(description: string): Promise<void> {
    await this.poll(
      () =>
        this.evaluate<boolean>(`(() => {
          ${visibleDom}
          return [
            '[data-automation-id^="msla-op-search-result-"]',
            '[data-testid^="msla-op-search-result-"]',
            '.msla-op-search-card-container',
            '.msla-op-search-card',
            '.msla-recommendation-panel-card',
            '[role="option"]',
          ].some((selector) => Array.from(document.querySelectorAll(selector)).some(visible));
        })()`),
      Boolean,
      description
    );
  }

  private remaining(): number {
    const remaining = this.deadline - Date.now();
    assert.ok(remaining > 0, 'Designer CDP action deadline expired');
    return remaining;
  }

  private async poll<T>(run: () => Promise<T>, accept: (value: T) => boolean, description: string): Promise<T> {
    let lastError: unknown;
    while (Date.now() < this.deadline) {
      try {
        const value = await run();
        if (accept(value)) {
          return value;
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.fail(`Timed out waiting for ${description}${lastError ? `. Last error: ${String(lastError)}` : ''}`);
  }
}

export interface MsnDesignerClickResult {
  ok: boolean;
  reason?: string;
  point?: Point;
  text?: string;
  candidates?: unknown[];
  rect?: { left: number; top: number; width: number; height: number };
  target?: Record<string, unknown>;
  hitTarget?: Record<string, unknown>;
  viewport?: { width: number; height: number; devicePixelRatio: number; frameUrl?: string; title?: string };
}

/**
 * Behavioral-parity implementation for the MSN Weather workspace lifecycle.
 *
 * Keep this path independent from DesignerCdpActions. This class preserves the
 * exact interaction semantics from workspaceLifecycle.test.ts before
 * 7b0422eb19d36e6e98ac179161074e09796548c6.
 */
export class MsnDesignerCdpActions {
  constructor(
    readonly cdp: CdpEvaluator,
    readonly contextId: number
  ) {}

  async getText(): Promise<string> {
    return this.cdp.evaluate<string>(
      this.contextId,
      `(() => {
        const collectText = (root) => {
          let text = '';
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
          let node = walker.currentNode;
          while (node) {
            if (node instanceof HTMLScriptElement || node instanceof HTMLStyleElement) {
              node = walker.nextSibling() || walker.nextNode();
              continue;
            }
            if (node.parentElement instanceof HTMLScriptElement || node.parentElement instanceof HTMLStyleElement) {
              node = walker.nextNode();
              continue;
            }
            if (node.nodeType === Node.TEXT_NODE) {
              text += node.textContent || '';
            }
            if (node.shadowRoot) {
              text += collectText(node.shadowRoot);
            }
            if (node instanceof HTMLIFrameElement && node.contentDocument) {
              text += collectText(node.contentDocument);
            }
            node = walker.nextNode();
          }
          return text;
        };
        return collectText(document);
      })()`
    );
  }

  async waitForText(expectedText: string[], timeoutMs: number, description: string): Promise<void> {
    await this.waitUntil(
      () =>
        this.cdp.evaluate<boolean>(
          this.contextId,
          `(() => {
            const collectText = (root) => {
              let text = '';
              const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
              let node = walker.currentNode;
              while (node) {
                if (node instanceof HTMLScriptElement || node instanceof HTMLStyleElement) {
                  node = walker.nextSibling() || walker.nextNode();
                  continue;
                }
                if (node.parentElement instanceof HTMLScriptElement || node.parentElement instanceof HTMLStyleElement) {
                  node = walker.nextNode();
                  continue;
                }
                if (node.nodeType === Node.TEXT_NODE) {
                  text += node.textContent || '';
                }
                if (node.shadowRoot) {
                  text += collectText(node.shadowRoot);
                }
                if (node instanceof HTMLIFrameElement && node.contentDocument) {
                  text += collectText(node.contentDocument);
                }
                node = walker.nextNode();
              }
              return text;
            };
            const text = collectText(document).toLowerCase();
            return ${JSON.stringify(expectedText.map((text) => text.toLowerCase()))}.some((expected) => text.includes(expected));
          })()`
        ),
      timeoutMs,
      description
    );
  }

  async clickElement(
    selectors: string[],
    textToFind: string,
    options: { requireTextMatch?: boolean; useLastMatch?: boolean } = {}
  ): Promise<MsnDesignerClickResult> {
    const result = await this.cdp.evaluate<MsnDesignerClickResult>(
      this.contextId,
      `(() => {
        const selectors = ${JSON.stringify(selectors)};
        const textToFind = ${JSON.stringify(textToFind.toLowerCase())};
        const requireTextMatch = ${JSON.stringify(options.requireTextMatch !== false)};
        const useLastMatch = ${JSON.stringify(options.useLastMatch === true)};
        const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const describeElement = (element) => {
          if (!element) {
            return undefined;
          }
          const rect = element.getBoundingClientRect();
          return {
            tagName: element.tagName,
            id: element.id || undefined,
            role: element.getAttribute('role') || undefined,
            ariaLabel: normalize(element.getAttribute('aria-label')) || undefined,
            title: normalize(element.getAttribute('title')) || undefined,
            dataAutomationId: normalize(element.getAttribute('data-automation-id')) || undefined,
            className: typeof element.className === 'string' ? normalize(element.className).slice(0, 200) : undefined,
            text: normalize(element.textContent || '').slice(0, 200),
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          };
        };
        const matchesText = (element) => {
          const text = normalize(element.textContent).toLowerCase();
          const ariaLabel = normalize(element.getAttribute('aria-label')).toLowerCase();
          const title = normalize(element.getAttribute('title')).toLowerCase();
          return !requireTextMatch || !textToFind || text.includes(textToFind) || ariaLabel.includes(textToFind) || title.includes(textToFind);
        };
        const candidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
          .filter(isVisible)
          .filter(matchesText);
        const debugCandidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
          .filter(isVisible)
          .slice(0, 10)
          .map(describeElement);
        const element = useLastMatch ? candidates.at(-1) : candidates[0];
        if (!element) {
          return { ok: false, reason: 'Element not found', candidates: debugCandidates, text: document.body?.innerText || '' };
        }

        element.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = element.getBoundingClientRect();
        const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const hitTarget = document.elementFromPoint(point.x, point.y);
        return {
          ok: true,
          point,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          text: normalize(element.textContent || element.getAttribute('aria-label') || ''),
          target: describeElement(element),
          hitTarget: describeElement(hitTarget),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            frameUrl: document.location.href,
            title: document.title,
          },
        };
      })()`
    );

    assert.ok(
      result.ok && result.point,
      `Expected clickable designer element "${textToFind}". Reason=${result.reason} candidates=${JSON.stringify(result.candidates)} text=${String(
        result.text
      ).slice(0, 1000)}`
    );

    console.log(
      `[workspace-lifecycle][designer-click] "${textToFind}" ${JSON.stringify({
        text: result.text,
        point: result.point,
        rect: result.rect,
        target: result.target,
        hitTarget: result.hitTarget,
        viewport: result.viewport,
        contextId: this.contextId,
      })}`
    );
    await clickPoint(this.cdp, result.point);
    return result;
  }

  async tryClickElement(
    selectors: string[],
    textToFind: string,
    options: { requireTextMatch?: boolean; useLastMatch?: boolean } = {}
  ): Promise<MsnDesignerClickResult | undefined> {
    try {
      return await this.clickElement(selectors, textToFind, options);
    } catch (error) {
      console.log(`[workspace-lifecycle] Optional designer element "${textToFind}" was not clickable: ${String(error)}`);
      return undefined;
    }
  }

  async hasDiscoveryPanel(): Promise<boolean> {
    return this.cdp.evaluate<boolean>(
      this.contextId,
      `(() => {
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        return [
          '.msla-panel-root-Discovery',
          '[data-automation-id="msla-search-box"]',
          '.msla-search-box',
        ].some((selector) => Array.from(document.querySelectorAll(selector)).some(isVisible));
      })()`
    );
  }

  async waitForDiscoveryPanel(timeoutMs: number, description: string): Promise<void> {
    await this.waitUntil(() => this.hasDiscoveryPanel(), timeoutMs, description);
  }

  async waitForOptionalDiscoveryPanel(timeoutMs: number): Promise<boolean> {
    try {
      await this.waitForDiscoveryPanel(timeoutMs, 'optional designer discovery panel');
      return true;
    } catch {
      return false;
    }
  }

  async search(searchTerm: string): Promise<void> {
    const result = await this.cdp.evaluate<{ ok: boolean; reason?: string; text?: string; value?: string }>(
      this.contextId,
      `(() => {
        const searchTerm = ${JSON.stringify(searchTerm)};
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const selectors = [
          '[data-automation-id="msla-search-box"] input',
          '[data-automation-id="msla-search-box"]',
          '.msla-search-box input',
          '.msla-search-box',
          'input[placeholder*="Search"]',
          'input[type="text"]',
        ];
        for (const selector of selectors) {
          const element = Array.from(document.querySelectorAll(selector)).find(isVisible);
          if (!element) {
            continue;
          }

          const input = element instanceof HTMLInputElement ? element : element.querySelector('input');
          if (!(input instanceof HTMLInputElement)) {
            continue;
          }

          input.scrollIntoView({ block: 'center', inline: 'center' });
          input.focus();
          input.select();
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          setter?.call(input, searchTerm);
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: searchTerm }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            ok: true,
            text: input.placeholder || input.getAttribute('aria-label') || '',
            value: input.value,
          };
        }

        return { ok: false, reason: 'Search input not found', text: document.body?.innerText || '' };
      })()`
    );

    assert.ok(
      result.ok && result.value === searchTerm,
      `Expected designer search input for "${searchTerm}". Reason=${result.reason} value=${result.value} text=${result.text?.slice(0, 1000)}`
    );
  }

  async waitForSearchResults(timeoutMs: number, description: string): Promise<void> {
    await this.waitUntil(
      () =>
        this.cdp.evaluate<boolean>(
          this.contextId,
          `(() => {
            const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
            const selectors = [
              '[data-automation-id^="msla-op-search-result-"]',
              '[data-testid^="msla-op-search-result-"]',
              '.msla-op-search-card-container',
              '.msla-op-search-card',
              '.msla-recommendation-panel-card',
              '[role="option"]',
            ];
            return selectors.some((selector) => Array.from(document.querySelectorAll(selector)).some(isVisible));
          })()`
        ),
      timeoutMs,
      description
    );
  }

  async selectOperation(operationName: string, variants: string[]): Promise<void> {
    let result:
      | {
          ok: boolean;
          reason?: string;
          point?: Point;
          text?: string;
          candidates?: string[];
        }
      | undefined;

    for (let attempt = 0; attempt < 20; attempt++) {
      result = await this.cdp.evaluate(
        this.contextId,
        `(() => {
        const variants = ${JSON.stringify([operationName, ...variants].map((variant) => variant.toLowerCase()))};
        const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const selectors = [
          '[data-automation-id^="msla-op-search-result-"]',
          '[data-testid^="msla-op-search-result-"]',
          '.msla-op-search-card-container',
          '.msla-op-search-card',
          '.msla-recommendation-panel-card',
          '[role="option"]',
          '[class*="connector"] [role="button"]',
          '[class*="connector"] button',
        ];
        const cards = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter(isVisible);
        const candidates = cards.slice(0, 12).map((element) => {
          const aid = normalize(element.getAttribute('data-automation-id'));
          const aria = normalize(element.getAttribute('aria-label'));
          const text = normalize(element.textContent).slice(0, 160);
          return aid + ' | ' + aria + ' | ' + text;
        });

        const exactOperationName = variants[0];
        const getCardDetails = (card) => {
          const title = normalize(card.querySelector('.msla-op-search-card-title')?.textContent);
          const text = normalize(title || card.textContent).toLowerCase();
          const aria = normalize(card.getAttribute('aria-label')).toLowerCase();
          const aid = normalize(card.getAttribute('data-automation-id')).toLowerCase();
          return { title, text, aria, aid, combined: text + ' ' + aria + ' ' + aid };
        };
        const exactCard = cards.find((card) => getCardDetails(card).text === exactOperationName);
        if (exactCard) {
          exactCard.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = exactCard.getBoundingClientRect();
          return {
            ok: true,
            point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            text: normalize(getCardDetails(exactCard).title || exactCard.textContent || exactCard.getAttribute('aria-label') || ''),
            candidates,
          };
        }

        for (const card of cards) {
          const { title, text, combined } = getCardDetails(card);
          if (combined === 'all' || combined.startsWith('all ')) {
            continue;
          }
          if (exactOperationName === 'get current weather' && text.includes(exactOperationName) && text !== exactOperationName && !combined.includes('msnweather')) {
            continue;
          }

          if (variants.some((variant) => combined.includes(variant))) {
            card.scrollIntoView({ block: 'center', inline: 'center' });
            const rect = card.getBoundingClientRect();
            return {
              ok: true,
              point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
              text: normalize(title || card.textContent || card.getAttribute('aria-label') || ''),
              candidates,
            };
          }
        }

        return { ok: false, reason: 'Operation card not found', candidates, text: document.body?.innerText || '' };
      })()`
      );

      if (result?.ok && result.point) {
        console.log(`[workspace-lifecycle] Selecting operation "${operationName}" (${result.text ?? ''})`);
        await clickPoint(this.cdp, result.point);
        return;
      }

      await this.scrollSearchResults();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    assert.ok(
      result?.ok && result.point,
      `Expected operation card "${operationName}". Reason=${result?.reason} candidates=${JSON.stringify(result?.candidates)} text=${String(
        result?.text
      ).slice(0, 1000)}`
    );
  }

  async openActionDiscovery(label: string, logDiagnostics: (stage: string, point?: Point) => Promise<void>): Promise<void> {
    console.log(`[workspace-lifecycle] ${label}: clicking Add an action`);
    await this.closePanel(`${label} existing details panel`);
    let actionPanelOpened = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const plusClick = await this.clickElement(
        [
          '[data-automation-id^="msla-plus-button-"]',
          '[id^="msla-edge-button-"]',
          '[data-testid="card-Add an action"]',
          '[data-automation-id="card-Add_an_action"]',
          '[aria-label="Add an action"]',
        ],
        'Add an action',
        { requireTextMatch: false, useLastMatch: true }
      );
      await logDiagnostics(`after Add Action click attempt ${attempt}`, plusClick.point);

      if (await this.waitForOptionalDiscoveryPanel(7500)) {
        actionPanelOpened = true;
        break;
      }

      const menuClick = await this.tryClickElement(['[data-automation-id^="msla-add-button-"]', '[role="menuitem"]'], 'Add an action');
      if (menuClick) {
        await logDiagnostics(`after Add Action menu click attempt ${attempt}`, menuClick.point);
        if (await this.waitForOptionalDiscoveryPanel(7500)) {
          actionPanelOpened = true;
          break;
        }
      }

      await logDiagnostics(`after Add Action failed attempt ${attempt}`, plusClick.point);
      console.log(`[workspace-lifecycle] ${label}: Add Action panel did not open on attempt ${attempt}`);
    }
    assert.ok(actionPanelOpened, `${label} Add Action panel should open`);
    await this.waitForDiscoveryPanel(60000, `${label} action discovery panel`);
  }

  async clickNode(title: string): Promise<void> {
    const result = await this.cdp.evaluate<{
      ok: boolean;
      reason?: string;
      text?: string;
      point?: Point;
      candidates?: string[];
    }>(
      this.contextId,
      `(() => {
        const title = ${JSON.stringify(title.toLowerCase())};
        const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const exactId = 'msla-node-' + ${JSON.stringify(title === responseActionTitle ? responseActionTitle : title)};
        const exactNode = document.getElementById(exactId);
        const candidates = exactNode instanceof HTMLElement && isVisible(exactNode)
          ? [exactNode]
          : Array.from(document.querySelectorAll('.react-flow__node, [id^="msla-node-"]'))
            .filter(isVisible)
            .filter((element) => normalize(element.textContent).toLowerCase() === title || normalize(element.textContent).toLowerCase().includes(title));
        const debugCandidates = Array.from(document.querySelectorAll('.react-flow__node, [id^="msla-node-"]'))
          .filter(isVisible)
          .slice(0, 20)
          .map((element) => (element.id || '(no id)') + ' | ' + normalize(element.textContent).slice(0, 120));
        const element = candidates.at(-1);
        if (!element) {
          return { ok: false, reason: 'Designer node not found', candidates: debugCandidates, text: document.body?.innerText || '' };
        }

        element.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = element.getBoundingClientRect();
        return {
          ok: true,
          point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          text: normalize(element.textContent || element.getAttribute('aria-label') || ''),
        };
      })()`
    );

    assert.ok(
      result.ok && result.point,
      `Expected designer node "${title}". Reason=${result.reason} candidates=${JSON.stringify(result.candidates)} text=${String(
        result.text
      ).slice(0, 1000)}`
    );

    console.log(`[workspace-lifecycle] Clicking designer node "${title}" (${result.text ?? ''})`);
    await clickPoint(this.cdp, result.point);
  }

  async hasDetailsPanel(): Promise<boolean> {
    return this.cdp.evaluate<boolean>(
      this.contextId,
      `(() => {
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        return Array.from(document.querySelectorAll('[id^="msla-node-details-panel"], .msla-panel-container')).some(isVisible);
      })()`
    );
  }

  async closePanel(description: string): Promise<void> {
    if (!(await this.hasDetailsPanel())) {
      console.log(`[workspace-lifecycle] ${description}: details panel was already closed`);
      return;
    }

    const closeTarget = await this.cdp.evaluate<{
      ok: boolean;
      reason?: string;
      point?: Point;
      candidates?: string[];
      panelText?: string;
    }>(
      this.contextId,
      `(() => {
        const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const panels = Array.from(document.querySelectorAll('.msla-panel-container'))
          .filter(isVisible)
          .map((panel) => ({ panel, rect: panel.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width > 250 && rect.height > 200)
          .sort((a, b) => a.rect.left - b.rect.left);
        const panel = panels.at(-1)?.panel;
        const candidates = Array.from(document.querySelectorAll('[data-automation-id="msla-panel-header-close-nav"], button[aria-label="Close"]'))
          .filter(isVisible)
          .slice(0, 10)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return normalize(element.getAttribute('data-automation-id') || element.getAttribute('aria-label') || element.textContent || '') +
              ' @ ' + Math.round(rect.left) + ',' + Math.round(rect.top);
          });
        if (!(panel instanceof HTMLElement)) {
          return { ok: false, reason: 'Visible details panel container not found', candidates, panelText: document.body?.innerText || '' };
        }

        const closeButton = Array.from(panel.querySelectorAll('[data-automation-id="msla-panel-header-close-nav"], button[aria-label="Close"]'))
          .filter(isVisible)
          .at(-1);
        if (!(closeButton instanceof HTMLElement)) {
          return { ok: false, reason: 'Details panel Close button not found', candidates, panelText: normalize(panel.textContent).slice(0, 1000) };
        }

        closeButton.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = closeButton.getBoundingClientRect();
        return {
          ok: true,
          point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          candidates,
          panelText: normalize(panel.textContent).slice(0, 1000),
        };
      })()`
    );
    assert.ok(
      closeTarget.ok && closeTarget.point,
      `${description} Close button should be clickable before adding another operation. Reason=${closeTarget.reason} candidates=${JSON.stringify(
        closeTarget.candidates
      )} panelText=${closeTarget.panelText?.slice(0, 1000)}`
    );
    console.log(`[workspace-lifecycle] Closing ${description} details panel`);
    await clickPoint(this.cdp, closeTarget.point);

    await this.waitUntil(async () => !(await this.hasDetailsPanel()), 15000, `${description} to close before adding another operation`);
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  async fillParameter(labels: string[], value: string, description: string): Promise<void> {
    const focusResult = await this.cdp.evaluate<{
      ok: boolean;
      reason?: string;
      point?: Point;
      candidates?: string[];
      text?: string;
    }>(
      this.contextId,
      `(() => {
        const labels = ${JSON.stringify(labels.map((label) => label.toLowerCase()))};
        const normalize = (input) => (input || '').replace(/\\s+/g, ' ').trim();
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const editableSelectors = ['input:not([type="hidden"])', 'textarea', '[contenteditable="true"]'];
        const isEditable = (element) =>
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.getAttribute('contenteditable') === 'true';
        const editables = () => editableSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter(isVisible).filter(isEditable);
        const elementText = (element) =>
          [
            element.textContent,
            element.getAttribute('aria-label'),
            element.getAttribute('aria-labelledby')?.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' '),
            element.getAttribute('data-testid'),
            element.getAttribute('data-automation-id'),
            element.getAttribute('placeholder'),
            element.getAttribute('title'),
          ]
            .map(normalize)
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        const matches = (element) => labels.some((label) => elementText(element).includes(label));

        const direct = editables().find(matches);
        if (direct instanceof HTMLElement) {
          direct.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = direct.getBoundingClientRect();
          return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
        }

        const labelCandidates = Array.from(document.querySelectorAll('label, span, div, p, [data-automation-id], [data-testid]'))
          .filter(isVisible)
          .filter((element) => {
            const text = elementText(element);
            return labels.some((label) => text === label || text.includes(label));
          })
          .sort((a, b) => elementText(a).length - elementText(b).length);

        for (const label of labelCandidates) {
          let container = label;
          for (let depth = 0; depth < 6 && container; depth++) {
            const editable = editableSelectors
              .flatMap((selector) => Array.from(container.querySelectorAll(selector)))
              .filter(isVisible)
              .filter(isEditable)[0];
            if (editable instanceof HTMLElement) {
              editable.scrollIntoView({ block: 'center', inline: 'center' });
              const rect = editable.getBoundingClientRect();
              return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
            }
            container = container.parentElement;
          }
        }

        return {
          ok: false,
          reason: 'Parameter editor not found',
          candidates: editables().slice(0, 20).map((element) => elementText(element).slice(0, 160)),
          text: document.body?.innerText || '',
        };
      })()`
    );

    assert.ok(
      focusResult.ok && focusResult.point,
      `Expected ${description} parameter editor. Reason=${focusResult.reason} candidates=${JSON.stringify(
        focusResult.candidates
      )} text=${focusResult.text?.slice(0, 1000)}`
    );

    await clickPoint(this.cdp, focusResult.point);
    await this.replaceFocused(value);
  }

  async replaceFocused(value: string): Promise<void> {
    await this.cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17,
      nativeVirtualKeyCode: 17,
    });
    await this.cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'a',
      code: 'KeyA',
      windowsVirtualKeyCode: 65,
      nativeVirtualKeyCode: 65,
      modifiers: 2,
    });
    await this.cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'a',
      code: 'KeyA',
      windowsVirtualKeyCode: 65,
      nativeVirtualKeyCode: 65,
      modifiers: 2,
    });
    await this.cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17,
      nativeVirtualKeyCode: 17,
    });
    await this.cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Backspace',
      code: 'Backspace',
      windowsVirtualKeyCode: 8,
      nativeVirtualKeyCode: 8,
    });
    await this.cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Backspace',
      code: 'Backspace',
      windowsVirtualKeyCode: 8,
      nativeVirtualKeyCode: 8,
    });
    await this.cdp.send('Input.insertText', { text: value });
  }

  async save(label: string): Promise<void> {
    console.log(`[workspace-lifecycle] ${label}: saving workflow through designer command bar`);
    await this.clickElement(['button[aria-label="Save"]'], 'Save');
    try {
      await this.waitUntil(
        async () =>
          this.cdp.evaluate<boolean>(
            this.contextId,
            `(() => {
              const button = document.querySelector('button[aria-label="Save"]');
              const text = (button?.textContent || '').toLowerCase();
              const label = (button?.getAttribute('aria-label') || '').toLowerCase();
              return !text.includes('saving') && !label.includes('saving');
            })()`
          ),
        60000,
        `${label} designer save to complete`
      );
    } catch (error) {
      const diagnostics = await this.cdp.evaluate<Record<string, unknown>>(
        this.contextId,
        `(() => {
          const save = document.querySelector('button[aria-label*="Sav"]');
          const visibleText = Array.from(document.querySelectorAll('body *'))
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            })
            .map((element) => (element.textContent || '').trim())
            .filter(Boolean);
          return {
            save: save ? {
              ariaLabel: save.getAttribute('aria-label'),
              text: (save.textContent || '').trim(),
              disabled: save.hasAttribute('disabled'),
            } : null,
            bodyText: (document.body?.innerText || '').slice(0, 4000),
            visibleErrorText: visibleText.filter((text) => /error|required|invalid|failed/i.test(text)).slice(0, 40),
          };
        })()`
      );
      console.error(`[workspace-lifecycle] ${label}: designer save did not complete ${JSON.stringify(diagnostics)}`);
      throw error;
    }
  }

  private async scrollSearchResults(): Promise<void> {
    await this.cdp.evaluate(
      this.contextId,
      `(() => {
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const scrollContainers = Array.from(document.querySelectorAll('div'))
          .filter(isVisible)
          .filter((element) => {
            const style = getComputedStyle(element);
            return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 20;
          })
          .sort((a, b) => b.clientHeight - a.clientHeight);
        const container = scrollContainers.find((element) => element.textContent?.includes('connector results found')) ?? scrollContainers[0];
        if (container) {
          container.scrollTop += 650;
        } else {
          window.scrollBy(0, 650);
        }
      })()`
    );
  }

  private async waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs: number, description: string): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        if (await predicate()) {
          return;
        }
      } catch (error) {
        lastError = error;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    assert.fail(`Timed out waiting for ${description}${lastError ? `. Last error: ${String(lastError)}` : ''}`);
  }
}

/**
 * Compatibility surface for scenarios that need the proven MSN Designer
 * interactions plus the generalized helper's scenario-specific CDP utilities.
 *
 * Keep MsnDesignerCdpActions unchanged; this adapter only orchestrates its
 * historical primitives behind the existing high-level API.
 */
export class ProvenDesignerCdpActions extends DesignerCdpActions {
  private readonly proven: MsnDesignerCdpActions;

  constructor(cdp: CdpEvaluator, contextId: number, deadline: number, assertActive: () => void = () => undefined) {
    super(cdp, contextId, deadline, assertActive);
    const assertScenarioActive = (): void => {
      assertActive();
      assert.ok(Date.now() < deadline, 'Designer action scenario deadline expired');
    };
    const guardedCdp: CdpEvaluator = {
      evaluate: <T>(guardedContextId: number | undefined, expression: string, options?: { timeoutMs?: number }) => {
        assertScenarioActive();
        return cdp.evaluate<T>(guardedContextId, expression, options);
      },
      send: (method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }) => {
        assertScenarioActive();
        return cdp.send(method, params, options);
      },
    };
    this.proven = new MsnDesignerCdpActions(guardedCdp, contextId);
  }

  override async clickElement(
    selectors: string[],
    textToFind: string,
    options: { requireTextMatch?: boolean; useLastMatch?: boolean } = {}
  ): Promise<DesignerClickResult> {
    const result = await this.proven.clickElement(selectors, textToFind, options);
    return {
      ok: result.ok,
      reason: result.reason,
      point: result.point,
      text: result.text,
      candidates: result.candidates?.filter((candidate): candidate is string => typeof candidate === 'string'),
    };
  }

  override async replaceFocused(value: string): Promise<void> {
    await this.proven.replaceFocused(value);
  }

  override async save(): Promise<void> {
    await this.proven.save('shared Designer actions');
  }

  override async waitForDesignerReady(existingNodeTitles: string[] = []): Promise<void> {
    await this.proven.waitForText(
      ['Add a trigger', 'Add trigger', ...existingNodeTitles],
      180000,
      'semantic Designer readiness through proven MSN text discovery'
    );
  }

  override async addRequestTrigger(): Promise<void> {
    await this.proven.clickElement(
      [
        '[data-testid="card-Add a trigger"]',
        '[data-testid="card-Add trigger"]',
        '[data-automation-id="card-Add_a_trigger"]',
        '[data-automation-id="card-Add_trigger"]',
        '[aria-label="Add a trigger"]',
        '[aria-label="Add trigger"]',
      ],
      'Add a trigger',
      { requireTextMatch: false }
    );
    await this.proven.waitForDiscoveryPanel(60000, 'Request trigger discovery panel');
    await this.proven.search('Request');
    await this.proven.waitForSearchResults(60000, 'Request search results');
    await this.proven.selectOperation('Request', ['when a http request is received', 'when an http request is received', 'http request']);
    await this.proven.waitForText(requestTriggerTitles, 90000, 'Request trigger on canvas');
    await this.proven.closePanel('Request trigger panel');
  }

  override async addAction(search: string, operationName: string, variants: string[] = [operationName.toLowerCase()]): Promise<void> {
    await this.proven.openActionDiscovery(operationName, async (stage, point) => {
      console.log(`[designer-actions] ${operationName}: ${stage}${point ? ` point=${JSON.stringify(point)}` : ''}`);
    });
    await this.proven.search(search);
    await this.proven.waitForSearchResults(60000, `${search} search results`);
    await this.proven.selectOperation(operationName, variants);
    await this.proven.waitForText([operationName], 90000, `${operationName} action on canvas`);
  }

  override async search(search: string): Promise<void> {
    await this.proven.search(search);
  }

  override async selectOperation(operationName: string, variants: string[]): Promise<void> {
    await this.proven.selectOperation(operationName, variants);
  }

  override async openActionDiscovery(): Promise<void> {
    await this.proven.openActionDiscovery('shared Designer actions', async (stage, point) => {
      console.log(`[designer-actions] ${stage}${point ? ` point=${JSON.stringify(point)}` : ''}`);
    });
  }

  override async clickNode(titles: string[]): Promise<void> {
    assert.ok(titles.length > 0, 'Expected at least one Designer node title');
    await this.proven.clickNode(titles[0]);
  }

  override async closePanel(): Promise<void> {
    await this.proven.closePanel('shared Designer actions');
  }

  override async fillParameter(labels: string[], value: string): Promise<void> {
    await this.proven.fillParameter(labels, value, labels.join('/'));
  }
}

export type DesignerActionProfile = 'generalized' | 'msn';

export function resolveDesignerActionProfile(
  actionProfile: DesignerActionProfile | undefined,
  includeMsnWeather: boolean
): DesignerActionProfile {
  return actionProfile ?? (includeMsnWeather ? 'msn' : 'generalized');
}
