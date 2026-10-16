import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { type CdpConnection, waitForWebviewFrameContext } from './cdpClient';
import {
  assertHttpTimeoutWorkspaceIdentity,
  handleHttpTimeoutConnectorPrompt,
  sameHttpTimeoutCanonicalPath,
} from './httpTimeoutComposeEnvironment';

type Control = (name: string, run: () => void | Promise<void>) => Promise<void>;

export async function runHttpTimeoutEnvironmentControls(control: Control): Promise<void> {
  await control('physical workspace identity accepts Windows drive case but preserves Linux case and wrong-root negatives', () => {
    assert.strictEqual(
      sameHttpTimeoutCanonicalPath('d:\\owned\\app\\app.code-workspace', 'D:\\owned\\app\\app.code-workspace', 'win32'),
      true
    );
    assert.strictEqual(sameHttpTimeoutCanonicalPath('/owned/App.code-workspace', '/owned/app.code-workspace', 'linux'), false);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'http-workspace-identity-unit-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'http-workspace-outside-unit-'));
    try {
      const directory = path.join(root, 'workspace');
      fs.mkdirSync(directory);
      const expected = path.join(directory, 'workspace.code-workspace');
      fs.writeFileSync(expected, '{}');
      assertHttpTimeoutWorkspaceIdentity(expected, expected, root);
      if (process.platform === 'win32') {
        const uriPath = expected.replace(/^([A-Z]):/, (_match, drive: string) => `${drive.toLowerCase()}:`);
        assertHttpTimeoutWorkspaceIdentity(uriPath, expected, root);
      }
      const wrong = path.join(directory, 'wrong.code-workspace');
      fs.writeFileSync(wrong, '{}');
      assert.throws(() => assertHttpTimeoutWorkspaceIdentity(wrong, expected, root), /not the generated physical workspace/);
      assert.throws(() => assertHttpTimeoutWorkspaceIdentity(path.join(directory, 'missing.code-workspace'), expected, root));
      const escaped = path.join(outside, 'workspace.code-workspace');
      fs.writeFileSync(escaped, '{}');
      assert.throws(() => assertHttpTimeoutWorkspaceIdentity(escaped, expected, root), /escapes/);
      const link = path.join(root, 'alias');
      fs.symlinkSync(directory, link, process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => assertHttpTimeoutWorkspaceIdentity(path.join(link, 'workspace.code-workspace'), expected, root), /symlink/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  for (const fault of [
    'none',
    'unknown',
    'wrong-app',
    'ambiguous',
    'duplicate-affirmative',
    'disabled',
    'unfocused',
    'hidden-visibility',
    'readonly-input',
    'loading',
    'covered',
    'expired',
    'not-dismissed',
  ]) {
    await control(`stock production connector QuickPick DOM ${fault} is handled fail-closed`, async () => {
      const { JSDOM } = require('jsdom');
      const title =
        fault === 'loading'
          ? 'Loading...'
          : fault === 'unknown'
            ? 'Sign in to another service'
            : `Enable connectors in Azure for Logic App ${fault === 'wrong-app' ? 'otherApp' : 'unitApp'}`;
      const widget = `<div class="quick-input-widget" style="display:block">
        <div class="quick-input-header"><div class="quick-input-box"><input placeholder="${title}" ${
          fault === 'readonly-input' ? 'readonly' : ''
        }></div></div>
        <div class="quick-input-list"><div class="monaco-list" role="listbox"><div class="monaco-list-rows">
          ${
            fault === 'loading'
              ? ''
              : `<div class="monaco-list-row" role="option" ${fault === 'disabled' ? 'aria-disabled="true"' : ''}><div class="quick-input-list-label"><span class="label-name">Use connectors from Azure</span></div></div>
          <div class="monaco-list-row" role="option"><div class="quick-input-list-label"><span class="label-name">Skip for now</span></div></div>
          ${
            fault === 'duplicate-affirmative'
              ? '<div class="monaco-list-row" role="option"><span class="label-name">Use connectors from Azure</span></div>'
              : ''
          }`
          }
        </div></div></div></div>`;
      const dom = new JSDOM(`<html><body>${widget}${fault === 'ambiguous' ? widget : ''}<div id="cover"></div></body></html>`, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
      });
      const { window } = dom;
      const designer = new JSDOM('<html><body></body></html>', { runScripts: 'outside-only' });
      const sends: Record<string, unknown>[] = [];
      const geometry = (element: any) => {
        const skip = element.closest('.monaco-list-row')?.textContent.trim() === 'Skip for now';
        const row = element.matches('.monaco-list-row');
        return {
          left: 0,
          top: row ? (skip ? 80 : 50) : 0,
          right: 600,
          bottom: row ? (skip ? 105 : 75) : 140,
          width: 600,
          height: row ? 25 : 140,
        };
      };
      window.HTMLElement.prototype.getBoundingClientRect = function () {
        return geometry(this);
      };
      window.HTMLElement.prototype.getClientRects = function () {
        return [geometry(this)];
      };
      window.document.hasFocus = () => fault !== 'unfocused';
      if (fault === 'hidden-visibility') {
        Object.defineProperty(window.document, 'visibilityState', { configurable: true, value: 'hidden' });
      }
      window.document.elementFromPoint = (_x: number, y: number) => {
        if (fault === 'covered') {
          return window.document.getElementById('cover');
        }
        return Array.from(window.document.querySelectorAll('.monaco-list-row')).find(
          (row: any) => row.textContent.trim() === (y >= 80 ? 'Skip for now' : 'Use connectors from Azure')
        );
      };
      if (fault !== 'unfocused') {
        window.document.querySelector('input').focus();
      }
      const cdp = {
        async evaluate<T>(_context: number | undefined, expression: string) {
          return window.eval(expression) as T;
        },
        async send(_method: string, params: Record<string, unknown>) {
          sends.push(params);
          if (params.type === 'mouseReleased') {
            assert.strictEqual(params.y, 62.5, 'Native click must select the affirmative Azure connector row');
            const row = window.document.elementFromPoint(Number(params.x), Number(params.y));
            row.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
            if (fault !== 'not-dismissed') {
              window.document.querySelector('.quick-input-widget').remove();
              designer.window.document.body.innerHTML =
                '<main><nav><button>Workflow</button><button>Code</button></nav><button>Save</button><button>Add a trigger</button></main>';
            }
          }
          return {};
        },
      } as unknown as CdpConnection;
      try {
        const deadline = Date.now() + (fault === 'expired' ? -1 : fault === 'not-dismissed' ? 200 : 2000);
        if (fault === 'none' || fault === 'unfocused' || fault === 'hidden-visibility' || fault === 'readonly-input') {
          let contextCreated: (context: { id: number }) => void = () => {};
          const designerCdp = {
            onExecutionContextCreated: (listener: typeof contextCreated) => {
              contextCreated = listener;
            },
            async send() {
              contextCreated({ id: 19 });
              return {};
            },
            async evaluate<T>(_context: number, expression: string) {
              return designer.window.eval(expression) as T;
            },
          } as unknown as CdpConnection;
          assert.strictEqual(
            await waitForWebviewFrameContext(designerCdp, {
              allTextIncludes: ['Workflow', 'Code', 'Save'],
              description: 'original empty designer after native prompt',
              timeoutMs: 2000,
              beforePoll: async (openingDeadline) => {
                assert.ok(openingDeadline <= deadline + 10, 'Do not inflate the existing designer observation deadline');
                await handleHttpTimeoutConnectorPrompt(cdp, 'unitApp', Math.min(deadline, openingDeadline));
              },
            }),
            19
          );
          assert.deepStrictEqual(
            sends.map((event) => event.type),
            ['mouseMoved', 'mousePressed', 'mouseReleased']
          );
          assert.strictEqual(window.document.querySelector('.quick-input-widget'), null);
        } else if (fault === 'loading') {
          assert.strictEqual(await handleHttpTimeoutConnectorPrompt(cdp, 'unitApp', deadline), false);
          assert.strictEqual(sends.length, 0, 'Transient loading prompt must receive no input');
        } else {
          await assert.rejects(() => handleHttpTimeoutConnectorPrompt(cdp, 'unitApp', deadline));
          if (fault !== 'not-dismissed') {
            assert.strictEqual(sends.length, 0, 'Unknown/noninteractive prompt must receive no input');
          }
        }
      } finally {
        window.close();
        designer.window.close();
      }
    });
  }
}
