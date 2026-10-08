import * as assert from 'assert';
import type { CdpConnection } from './cdpClient';
import { ProvenDesignerCdpActions } from './designerCdpActions';
import {
  assembleHttpTimeoutComposeCode,
  type HttpTimeoutComposeContext,
  type HttpTimeoutComposeErrorObservation,
  type HttpTimeoutComposeRenderedPage,
  pollHttpTimeoutCompose,
} from './httpTimeoutComposeOracle';

// Shared CLI input dispatch (native CDP mouse/key events), not DOM .click(),
// React handler invocation, editor-model writes, or extension save-message injection.
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

export class HttpTimeoutComposeDriver extends ProvenDesignerCdpActions {
  private codeEditorObjectId?: string;

  override async replaceFocused(value: string): Promise<void> {
    await this.key('KeyA', 'a', 65, 2);
    await this.send('Input.insertText', { text: value });
  }

  override async save(): Promise<void> {
    await this.click('[role="toolbar"] button, button[aria-label="Save"]', ['Save']);
    const readSaveState = () =>
      this.evaluate<{ save: boolean; saving: boolean }>(`(() => {
        ${visibleDom}
        const labels = Array.from(document.querySelectorAll('[role="toolbar"] button, button[aria-label*="Sav"]'))
          .filter(visible)
          .map((button) => normalize(button.textContent || button.getAttribute('aria-label')).toLowerCase());
        return {
          save: labels.some((text) => text === 'save'),
          saving: labels.some((text) => text.startsWith('saving')),
        };
      })()`);
    await pollHttpTimeoutCompose(readSaveState, (state) => state.saving, this.deadline, 'V2 designer Saving transition');
    await pollHttpTimeoutCompose(readSaveState, (state) => state.save && !state.saving, this.deadline, 'V2 designer Save completion');
  }

  async readCode(): Promise<string> {
    // MonacoEditor is a compatibility export of CodeMirrorEditor. Read only
    // actual .cm-line/gutter DOM, including viewport overlap, never EditorState.
    await this.focusCode();
    await this.key('End', 'End', 35, 2);
    const end = await this.codePage((page) => page.atLineEnd && page.selectionLine === Math.max(...page.lines.map((line) => line.number)));
    const endLine = Math.max(...end.lines.map((line) => line.number));
    await this.key('Home', 'Home', 36, 2);
    const pages: HttpTimeoutComposeRenderedPage[] = [end];
    let page = await this.codePage(
      (candidate) => candidate.atLineStart && candidate.selectionLine === 1 && candidate.lines.some((line) => line.number === 1)
    );
    while (true) {
      pages.push(page);
      const last = Math.max(...page.lines.map((line) => line.number));
      if (last === endLine) {
        break;
      }
      assert.ok(last < endLine, 'Code EOF changed while reading');
      const priorSelection = page.selectionLine;
      await this.key('PageDown', 'PageDown', 34);
      // CodeMirror can buffer more than a screen. A page movement may keep
      // identical rendered bounds; advance only after the actual DOM caret moved.
      page = await this.codePage((candidate) => candidate.selectionLine > priorSelection);
    }
    await this.key('End', 'End', 35, 2);
    const endAgain = await this.codePage((candidate) => candidate.atLineEnd && candidate.selectionLine === endLine);
    return assembleHttpTimeoutComposeCode([...pages, endAgain], endLine);
  }

  async replaceCode(value: string): Promise<void> {
    await this.focusCode();
    await this.replaceFocused(value);
  }

  private async focusCode(): Promise<void> {
    await this.click('.cm-editor');
    await pollHttpTimeoutCompose(
      () =>
        this.evaluate<boolean>(`(() => {
        ${visibleDom}
        const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
        const content = editors.length === 1 ? editors[0].querySelector('.cm-content') : null;
        return !!content && content === document.activeElement &&
          content.getAttribute('contenteditable') === 'true' && content.getAttribute('aria-readonly') !== 'true';
      })()`),
      Boolean,
      this.deadline,
      'focused writable production CodeMirror editor'
    );
    if (!this.codeEditorObjectId) {
      const response = (await this.send('Runtime.evaluate', {
        contextId: this.contextId,
        expression: `(() => {
          ${visibleDom}
          const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
          return editors.length === 1 ? editors[0] : null;
        })()`,
        returnByValue: false,
      })) as { result?: { result?: { objectId?: string } } };
      this.codeEditorObjectId = response.result?.result?.objectId;
      assert.ok(this.codeEditorObjectId, 'CodeMirror DOM object identity missing');
    }
    await this.assertCodeEditorIdentity();
  }

  private async assertCodeEditorIdentity(): Promise<void> {
    const response = (await this.send('Runtime.callFunctionOn', {
      objectId: this.codeEditorObjectId,
      functionDeclaration: `function() {
        ${visibleDom}
        const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
        return this.isConnected && editors.length === 1 && editors[0] === this &&
          this.querySelector('.cm-content') === document.activeElement;
      }`,
      returnByValue: true,
    })) as { result?: { result?: { value?: boolean } } };
    assert.strictEqual(response.result?.result?.value, true, 'Bound CodeMirror editor changed, detached or lost focus');
  }

  private async codePage(
    ready: (page: HttpTimeoutComposeRenderedPage & { selectionLine: number; atLineStart: boolean; atLineEnd: boolean }) => boolean
  ): Promise<HttpTimeoutComposeRenderedPage & { selectionLine: number; atLineStart: boolean; atLineEnd: boolean }> {
    let previous = '';
    return pollHttpTimeoutCompose(
      async () => {
        await this.assertCodeEditorIdentity();
        const page = await this.evaluate<
          HttpTimeoutComposeRenderedPage & {
            selectionLine: number;
            atLineStart: boolean;
            atLineEnd: boolean;
          }
        >(`(() => {
        ${visibleDom}
        const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
        if (editors.length !== 1) return { editorId: '', lines: [], selectionLine: 0 };
        const editor = editors[0];
        const content = editor.querySelector('.cm-content');
        const numbers = Array.from(editor.querySelectorAll('.cm-lineNumbers .cm-gutterElement'))
          .filter(number => {
            const style = getComputedStyle(number);
            // CodeMirror's numeric width spacer is hidden and zero-height.
            // Keep offscreen rendered rows, but never confuse that spacer for a line.
            return /^[1-9]\\d*$/.test(number.textContent || '') &&
              style.display !== 'none' && style.visibility !== 'hidden' &&
              number.getBoundingClientRect().height > 0;
          });
        const lineElements = Array.from(content?.querySelectorAll('.cm-line') || []);
        const lineNumber = line => {
          const top = line.getBoundingClientRect().top;
          const matches = numbers.filter(number => Math.abs(number.getBoundingClientRect().top - top) < 2);
          return matches.length === 1 ? Number(matches[0].textContent) : 0;
        };
        const lines = lineElements.map(line => {
          return { number: lineNumber(line), text: line.textContent || '' };
        });
        const selection = document.getSelection();
        const focus = selection?.focusNode;
        const focusElement = focus?.nodeType === Node.ELEMENT_NODE ? focus : focus?.parentElement;
        const selectedLine = focusElement?.closest('.cm-line');
        let offset = -1;
        if (selectedLine && content?.contains(selectedLine)) {
          const range = document.createRange();
          range.setStart(selectedLine, 0);
          range.setEnd(focus, selection.focusOffset);
          offset = range.toString().length;
        }
        return {
          editorId: 'CodeMirror',
          lines,
          selectionLine: selectedLine ? lineNumber(selectedLine) : 0,
          atLineStart: offset === 0,
          atLineEnd: offset >= 0 && offset === (selectedLine?.textContent || '').length,
        };
      })()`);
        return { ...page, editorId: this.codeEditorObjectId ?? '' };
      },
      (page) => {
        const current = JSON.stringify(page);
        const stable = current === previous;
        previous = current;
        return stable && !!page.editorId && ready(page);
      },
      this.deadline,
      'complete stable CodeMirror rendered page and caret'
    );
  }

  async context(): Promise<HttpTimeoutComposeContext> {
    const cdp = this.cdp as CdpConnection;
    assert.ok(cdp.targetId, 'Designer CDP target identity missing');
    const frameId = cdp.getExecutionContextFrameId(this.contextId);
    assert.ok(frameId, 'Designer frame identity missing');
    const documentOrigin = await this.evaluate<number>('performance.timeOrigin');
    assert.ok(Number.isFinite(documentOrigin) && documentOrigin > 0, 'Designer document origin missing');
    return { targetId: cdp.targetId, contextId: this.contextId, frameId, documentOrigin };
  }

  async errorObservation(): Promise<HttpTimeoutComposeErrorObservation> {
    const context = await this.context();
    const state = await this.evaluate<{ visible: boolean; messages: string[] }>(`(() => {
      ${visibleDom}
      const messages = Array.from(document.querySelectorAll(
        '[role="alert"], [aria-live], .ms-MessageBar, [class*="error"], [class*="Error"]'
      )).filter(fullyVisible).filter(element => !element.closest('.monaco-editor, .cm-editor'))
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
