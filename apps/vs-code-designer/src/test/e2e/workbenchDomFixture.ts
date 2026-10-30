import type { CdpEvaluator } from './cdpFormHelpers';

// Production-shaped Code 1.144 Menu / Monaco List DOM. Execute the helper's
// actual expressions; only the browser layout and CDP input bridge are supplied.
// No Code, extension host, Func process or machine-population scan is started.
export function workbenchDomFixture(html: string) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(`<html><body>${html}</body></html>`, { pretendToBeVisual: true, runScripts: 'outside-only' });
  const { window } = dom;
  const document = window.document;
  const sent: Array<{ method: string; params: Record<string, any> }> = [];
  const hidden = (element: any): boolean => {
    for (let current = element; current; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return true;
      }
    }
    return false;
  };
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const box = this.closest('[data-box]')?.getAttribute('data-box') ?? '0,0,100,20';
    const [left, top, width, height] = box.split(',').map(Number);
    return { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height };
  };
  window.HTMLElement.prototype.getClientRects = function () {
    return hidden(this) ? [] : [this.getBoundingClientRect()];
  };
  const hit = (x: number, y: number) =>
    [...document.querySelectorAll('[data-box]')].reverse().find((element: any) => {
      const rect = element.getBoundingClientRect();
      return !hidden(element) && rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom;
    });
  document.elementFromPoint = hit;
  const cdp: CdpEvaluator = {
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      const result = window.eval(expression);
      return result === undefined ? result : JSON.parse(JSON.stringify(result));
    },
    async send(method, params = {}) {
      sent.push({ method, params });
      if (method === 'Input.dispatchMouseEvent') {
        const element = hit(Number(params.x), Number(params.y));
        if (element && params.type !== 'mouseMoved') {
          const type = params.type === 'mousePressed' ? 'mousedown' : 'mouseup';
          const button = params.button === 'right' ? 2 : 0;
          element.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button, buttons: params.buttons }));
          if (params.type === 'mouseReleased' && button === 0) {
            element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button }));
          }
        }
      } else if (method === 'Input.dispatchKeyEvent') {
        document.activeElement?.dispatchEvent(
          new window.KeyboardEvent(params.type === 'keyDown' ? 'keydown' : 'keyup', {
            bubbles: true,
            key: params.key,
            code: params.code,
            keyCode: params.windowsVirtualKeyCode,
            shiftKey: !!(Number(params.modifiers) & 8),
            ctrlKey: !!(Number(params.modifiers) & 2),
          })
        );
      } else if (method === 'Input.insertText') {
        if (document.activeElement instanceof window.HTMLInputElement) {
          document.activeElement.value = params.text;
        }
      }
      return {};
    },
  };
  return { cdp, document, window, sent, dispose: () => window.close() };
}

export function contextMenuDom(items: Array<{ label: string; disabled?: boolean }>): string {
  return `<div class="context-view monaco-menu-container" role="presentation">
    <div class="monaco-menu" role="presentation"><div class="monaco-action-bar vertical">
      <ul class="actions-container" role="menu" tabindex="0">
        ${items
          .map(
            (item, index) => `<li class="action-item${item.disabled ? ' disabled' : ''}" ${item.disabled ? 'aria-disabled="true"' : ''}>
          <a class="action-menu-item${item.disabled ? ' disabled' : ''}" role="menuitem" tabindex="0"
            ${item.disabled ? 'aria-disabled="true"' : ''} data-box="400,${40 + index * 30},250,25">
            <span class="menu-item-check" role="none"></span><span class="action-label">${item.label}</span>
            <span class="keybinding">Ctrl+Shift+P</span>
          </a></li>`
          )
          .join('')}
      </ul>
    </div></div></div>`;
}
