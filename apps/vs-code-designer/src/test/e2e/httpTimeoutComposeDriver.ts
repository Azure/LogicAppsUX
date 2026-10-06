import * as assert from 'assert';
import type { CdpConnection } from './cdpClient';
import { clickPoint, type Point } from './cdpFormHelpers';
import {
  assembleHttpTimeoutComposeCode,
  type HttpTimeoutComposeContext,
  type HttpTimeoutComposeErrorObservation,
  type HttpTimeoutComposeRenderedPage,
  httpTimeoutComposeRemaining,
  pollHttpTimeoutCompose,
} from './httpTimeoutComposeOracle';

// Shared CLI input dispatch (native CDP mouse/key events), not DOM .click(),
// React handler invocation, Monaco setValue, or extension save-message injection.
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
  const fullyVisible = (element) => {
    if (!visible(element)) return false;
    const rect = element.getBoundingClientRect(), clip = bounds(element);
    return clip && rect.left >= clip.left && rect.top >= clip.top && rect.right <= clip.right && rect.bottom <= clip.bottom;
  };
  const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
`;

export class HttpTimeoutComposeDriver {
  constructor(
    readonly cdp: CdpConnection,
    readonly contextId: number,
    readonly deadline: number,
    readonly assertActive: () => void
  ) {}

  async evaluate<T>(expression: string): Promise<T> {
    this.assertActive();
    return this.cdp.evaluate<T>(this.contextId, expression, {
      timeoutMs: Math.min(5000, httpTimeoutComposeRemaining(this.deadline)),
    });
  }

  async send(method: string, params: Record<string, unknown>): Promise<unknown> {
    this.assertActive();
    return this.cdp.send(method, params, { timeoutMs: Math.min(5000, httpTimeoutComposeRemaining(this.deadline)) });
  }

  async click(selector: string, names: string[] = [], last = false): Promise<void> {
    const point = await pollHttpTimeoutCompose(
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
      this.deadline,
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

  async discover(search: string, titles: string[]): Promise<void> {
    await this.click('[data-automation-id="msla-search-box"] input, .msla-search-box input, input[placeholder*="Search"]');
    await this.replaceFocused(search);
    await pollHttpTimeoutCompose(
      () =>
        this.evaluate<boolean>(`(() => {
        ${visibleDom}
        return Array.from(document.querySelectorAll(
          '[data-automation-id="msla-search-box"] input, .msla-search-box input, input[placeholder*="Search"]'
        )).some(element => visible(element) && element.value === ${JSON.stringify(search)});
      })()`),
      Boolean,
      this.deadline,
      'discovery search text'
    );
    await this.click(
      '[data-automation-id^="msla-op-search-result-"], [data-testid^="msla-op-search-result-"], .msla-op-search-card-container',
      titles
    );
  }

  async openActionDiscovery(): Promise<void> {
    await this.closePanel();
    await this.click('[data-automation-id^="msla-plus-button-"], [id^="msla-edge-button-"]', [], true);
    const state = await pollHttpTimeoutCompose(
      () =>
        this.evaluate<string>(`(() => {
        ${visibleDom}
        if (Array.from(document.querySelectorAll(
          '[data-automation-id="msla-search-box"] input, .msla-search-box input, input[placeholder*="Search"]'
        )).some(visible)) return 'panel';
        if (Array.from(document.querySelectorAll(
          '[data-automation-id^="msla-add-button-"], [role="menuitem"]'
        )).some(element => visible(element) && normalize(element.getAttribute('aria-label') || element.textContent) === 'Add an action'))
          return 'menu';
        return '';
      })()`),
      Boolean,
      this.deadline,
      'action insertion menu or discovery panel'
    );
    if (state === 'menu') {
      await this.click('[data-automation-id^="msla-add-button-"], [role="menuitem"]', ['Add an action']);
    }
  }

  async hasNode(titles: string[]): Promise<boolean> {
    return this.evaluate<boolean>(`(() => {
      ${visibleDom}
      const titles = ${JSON.stringify(titles)};
      return Array.from(document.querySelectorAll('.react-flow__node'))
        .some(element => visible(element) && titles.some(title => normalize(element.textContent).includes(title)));
    })()`);
  }

  async waitNode(titles: string[]): Promise<void> {
    await pollHttpTimeoutCompose(() => this.hasNode(titles), Boolean, this.deadline, `${titles.join('/')} canvas node`);
  }

  async closePanel(): Promise<void> {
    const open = await this.evaluate<boolean>(`(() => {
      ${visibleDom}
      return Array.from(document.querySelectorAll('[data-automation-id="msla-panel-header-close-nav"]')).some(visible);
    })()`);
    if (open) {
      await this.click('[data-automation-id="msla-panel-header-close-nav"]');
      await pollHttpTimeoutCompose(
        () =>
          this.evaluate<boolean>(`(() => {
          ${visibleDom}
          return !Array.from(document.querySelectorAll('[data-automation-id="msla-panel-header-close-nav"]')).some(visible);
        })()`),
        Boolean,
        this.deadline,
        'details panel close'
      );
    }
  }

  async readCode(): Promise<string> {
    // Code initialization is asynchronous. Wait for the actual visible editor,
    // then wait for each input-driven viewport to settle; never synthesize text.
    await this.click('.monaco-editor');
    await this.key('End', 'End', 35, 2);
    const end = await this.codePage((page) => page.lines.length > 0);
    const endLine = Math.max(...end.lines.map((line) => line.number));
    await this.key('Home', 'Home', 36, 2);
    const pages: HttpTimeoutComposeRenderedPage[] = [];
    let page = await this.codePage((candidate) => candidate.lines.some((line) => line.number === 1));
    while (true) {
      pages.push(page);
      const last = Math.max(...page.lines.map((line) => line.number));
      if (last === endLine) {
        break;
      }
      assert.ok(last < endLine, 'Code EOF changed while reading');
      await this.key('PageDown', 'PageDown', 34);
      page = await this.codePage((candidate) => Math.max(...candidate.lines.map((line) => line.number)) > last);
    }
    // Include the separately observed EOF page to check overlap consistency.
    return assembleHttpTimeoutComposeCode([...pages, end], endLine);
  }

  private async codePage(ready: (page: HttpTimeoutComposeRenderedPage) => boolean): Promise<HttpTimeoutComposeRenderedPage> {
    let previous = '';
    return pollHttpTimeoutCompose(
      () =>
        this.evaluate<HttpTimeoutComposeRenderedPage>(`(() => {
        ${visibleDom}
        const editors = Array.from(document.querySelectorAll('.monaco-editor')).filter(visible);
        if (editors.length !== 1) return { editorId: '', lines: [] };
        const editor = editors[0];
        const numbers = Array.from(editor.querySelectorAll('.line-numbers'));
        const lines = Array.from(editor.querySelectorAll('.view-lines .view-line')).map(line => {
          const number = numbers.find(number => number.style.top === line.style.top);
          return { number: Number(number?.textContent), text: (line.textContent || '').replace(/\\u00a0/g, ' ') };
        });
        return {
          editorId: editor.getAttribute('data-uri') || editor.getAttribute('data-mode-id') || '',
          lines,
        };
      })()`),
      (page) => {
        const current = JSON.stringify(page);
        const stable = current === previous;
        previous = current;
        return stable && !!page.editorId && ready(page);
      },
      this.deadline,
      'complete stable Monaco rendered page'
    );
  }

  async context(): Promise<HttpTimeoutComposeContext> {
    assert.ok(this.cdp.targetId, 'Designer CDP target identity missing');
    const frameId = this.cdp.getExecutionContextFrameId(this.contextId);
    assert.ok(frameId, 'Designer frame identity missing');
    const documentOrigin = await this.evaluate<number>('performance.timeOrigin');
    assert.ok(Number.isFinite(documentOrigin) && documentOrigin > 0, 'Designer document origin missing');
    return { targetId: this.cdp.targetId, contextId: this.contextId, frameId, documentOrigin };
  }

  async errorObservation(): Promise<HttpTimeoutComposeErrorObservation> {
    const context = await this.context();
    const state = await this.evaluate<{ visible: boolean; messages: string[] }>(`(() => {
      ${visibleDom}
      const messages = Array.from(document.querySelectorAll(
        '[role="alert"], [aria-live], .ms-MessageBar, [class*="error"], [class*="Error"]'
      )).filter(fullyVisible).filter(element => !element.closest('.monaco-editor'))
        .filter(element => Array.from(element.querySelectorAll('*')).every(child => {
          if (!(child.textContent || '').trim()) return true;
          const style = getComputedStyle(child);
          return style.display === 'none' || style.visibility === 'hidden' || fullyVisible(child);
        }))
        .flatMap(element => (element.innerText || '').split(/\\r?\\n/).map(normalize)).filter(Boolean);
      return { visible: document.visibilityState === 'visible', messages };
    })()`);
    return { ...context, ...state, activeDesigner: true }; // assertActive() precedes every read.
  }
}
