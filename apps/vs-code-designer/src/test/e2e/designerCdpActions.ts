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
          const hasToolbar = ['workflow', 'code', 'save'].every((label) => toolbarText.some((value) => value === label || value.includes(label)));
          if (!hasToolbar) return false;
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
