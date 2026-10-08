import * as assert from 'node:assert/strict';
import type { CdpConnection } from './cdpClient';
import { clickPoint, type CdpEvaluator, type Point } from './cdpFormHelpers';

const remainingWorkbenchBudget = (deadline: number): number => {
  const remaining = deadline - Date.now();
  assert.ok(remaining > 0, 'Workbench action deadline exhausted');
  return remaining;
};

export function boundedCdp(cdp: Pick<CdpConnection, 'evaluate' | 'send'>, deadline: number): CdpEvaluator {
  return {
    evaluate: (context, expression) => cdp.evaluate(context, expression, { timeoutMs: Math.min(5000, remainingWorkbenchBudget(deadline)) }),
    send: (method, params) => cdp.send(method, params, { timeoutMs: Math.min(5000, remainingWorkbenchBudget(deadline)) }),
  };
}

export async function poll<T>(read: () => Promise<T>, accept: (value: T) => boolean, deadline: number): Promise<T> {
  while (remainingWorkbenchBudget(deadline)) {
    const value = await read();
    remainingWorkbenchBudget(deadline);
    if (accept(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(200, remainingWorkbenchBudget(deadline))));
  }
  throw new Error('Workbench observation did not satisfy its postcondition');
}

export const workbenchVisibleScript = `
  const visible = e => e instanceof HTMLElement && getComputedStyle(e).visibility !== 'hidden' &&
    getComputedStyle(e).display !== 'none' && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const text = e => (e.innerText || e.textContent || e.getAttribute('aria-label') || e.getAttribute('title') || '')
    .replace(/\\s+/g,' ').replace(/…/g,'...').trim();
  const normalized = value => value.toLowerCase();
  const point = e => { const r=e.getBoundingClientRect(); const p={x:r.left+r.width/2,y:r.top+r.height/2};
    const hit=document.elementFromPoint(p.x,p.y); return hit && (hit===e || e.contains(hit)) ? p : null; };
`;

export async function clickText(
  cdp: CdpEvaluator,
  selector: string,
  label: string,
  deadline: number,
  context?: number,
  exact = true
): Promise<void> {
  const position = await poll(
    () =>
      cdp.evaluate<Point | null>(
        context,
        `(() => { ${workbenchVisibleScript}
          const found=Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter(visible)
            .filter(e => ${exact ? 'normalized(text(e))===' : 'normalized(text(e)).includes('}normalized(${JSON.stringify(label)})${exact ? '' : ')'} &&
              !e.disabled && e.getAttribute('aria-disabled')!=='true');
          return found.length===1 ? point(found[0]) : null;
        })()`
      ),
    (value) => value !== null,
    deadline
  );
  assert.ok(position, 'Exactly one visible enabled control is required');
  await clickPoint(cdp, position);
}

export async function command(cdp: CdpEvaluator, title: string, deadline: number): Promise<void> {
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', { type, key: 'P', code: 'KeyP', modifiers: 10, windowsVirtualKeyCode: 80 });
  }
  await poll(
    () =>
      cdp.evaluate<boolean>(
        undefined,
        `(() => { ${workbenchVisibleScript} return Array.from(document.querySelectorAll('.quick-input-widget input')).some(visible); })()`
      ),
    Boolean,
    deadline
  );
  await cdp.send('Input.insertText', { text: title });
  await clickText(cdp, '.quick-input-list .monaco-list-row .label-name', title, deadline);
}
