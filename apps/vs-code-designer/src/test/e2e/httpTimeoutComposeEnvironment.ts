import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import type { CdpConnection } from './cdpClient';
import { clickPoint } from './cdpFormHelpers';
import { httpTimeoutComposeRemaining, pollHttpTimeoutCompose } from './httpTimeoutComposeOracle';
import { normalizeFsPath } from './testUtils';
import { selectWorkbenchPromptOption, type WorkbenchPromptContainer } from './workbenchPromptSelection';

export function sameHttpTimeoutCanonicalPath(actual: string, expected: string, platform = process.platform): boolean {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const canonical = (value: string) => {
    const resolved = paths.normalize(value);
    return platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return canonical(actual) === canonical(expected);
}

export function assertHttpTimeoutWorkspaceIdentity(actual: string, expected: string, ownedParent: string): void {
  const root = path.resolve(ownedParent);
  const rootStat = fs.lstatSync(root);
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Owned workspace parent must be a real directory');
  const canonicalRoot = fs.realpathSync.native(root);
  const physical = (file: string) => {
    const resolved = path.resolve(file);
    const relative = path.relative(normalizeFsPath(root), normalizeFsPath(resolved));
    assert.ok(
      relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      'Workspace file escapes the owned fixture root'
    );
    // Reject link aliases/reparse-point paths inside the owned fixture, rather
    // than accepting any alias which happens to resolve to the expected file.
    let current = root;
    const parts = path.relative(root, resolved).split(path.sep);
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      const stat = fs.lstatSync(current);
      assert.ok(!stat.isSymbolicLink(), 'Workspace path contains a symlink/reparse point');
      assert.ok(index === parts.length - 1 ? stat.isFile() : stat.isDirectory(), 'Workspace path must resolve to an existing regular file');
    }
    const canonical = fs.realpathSync.native(resolved);
    const contained = path.relative(normalizeFsPath(canonicalRoot), normalizeFsPath(canonical));
    assert.ok(
      contained && contained !== '..' && !contained.startsWith(`..${path.sep}`) && !path.isAbsolute(contained),
      'Physical workspace file escapes the owned fixture root'
    );
    return canonical;
  };
  assert.ok(sameHttpTimeoutCanonicalPath(physical(actual), physical(expected)), 'Opened workspace is not the generated physical workspace');
}

// Same stock QuickPick/list-row selectors as workspaceLifecycle's native
// workbench helper. This family handles only the affirmative connector choice;
// unknown/ambiguous/noninteractive prompts fail instead of being dismissed.
export const httpTimeoutConnectorPromptDom = `(() => {
  const visible = element => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth;
  };
  const normalize = text => (text || '').replace(/\\s+/g, ' ').trim();
  return Array.from(document.querySelectorAll('.quick-input-widget')).filter(visible).map(container => {
    const input = Array.from(container.querySelectorAll('input')).find(visible);
    const title = normalize(input?.getAttribute('placeholder') || container.querySelector('.quick-input-title')?.textContent);
    const rows = Array.from(container.querySelectorAll('.monaco-list-row, [role="option"]')).filter(visible)
      .filter((row, index, all) => all.indexOf(row) === index).map(row => {
        const text = normalize(row.querySelector('.label-name')?.textContent || row.textContent);
        const rect = row.getBoundingClientRect();
        const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const hit = document.elementFromPoint(point.x, point.y);
        const interactive = row.getAttribute('aria-disabled') !== 'true' && !row.hasAttribute('disabled') &&
          !!hit && (hit === row || row.contains(hit));
        return { text, ...(interactive ? { point } : {}) };
      });
    return {
      kind: 'quickInput', text: title, buttons: [], rows,
      interactive: document.visibilityState === 'visible' &&
        !!input && container.contains(document.activeElement) && !input.disabled && !input.readOnly,
    };
  });
})()`;

export async function handleHttpTimeoutConnectorPrompt(cdp: CdpConnection, appName: string, deadline: number): Promise<boolean> {
  const read = () =>
    cdp.evaluate<Array<WorkbenchPromptContainer & { interactive: boolean }>>(undefined, httpTimeoutConnectorPromptDom, {
      timeoutMs: Math.min(3000, httpTimeoutComposeRemaining(deadline)),
    });
  const containers = await read();
  if (containers.length === 0) {
    return false;
  }
  assert.strictEqual(containers.length, 1, 'Ambiguous workbench QuickPick while opening original designer');
  const prompt = containers[0];
  if (/^Loading(?:\.\.\.)?$/.test(prompt.text) && prompt.rows.length === 0) {
    return false;
  }
  const title = `Enable connectors in Azure for Logic App ${appName}`;
  assert.strictEqual(prompt.text, title, 'Unknown workbench QuickPick; do not answer another wizard');
  assert.strictEqual(prompt.interactive, true, 'Connector QuickPick is not interactive/focused');
  assert.strictEqual(
    prompt.rows.filter((row) => row.text === 'Use connectors from Azure').length,
    1,
    'Missing/ambiguous Use connectors from Azure option'
  );
  const selection = selectWorkbenchPromptOption([{ matchText: title, optionText: 'Use connectors from Azure' }], containers);
  assert.strictEqual(selection.targetText, 'Use connectors from Azure');
  assert.ok(selection.point, 'Use connectors from Azure must be visible, enabled and hit-testable');
  await clickPoint(
    {
      evaluate: cdp.evaluate.bind(cdp),
      send: (method, params) => cdp.send(method, params, { timeoutMs: Math.min(3000, httpTimeoutComposeRemaining(deadline)) }),
    },
    selection.point
  );
  await pollHttpTimeoutCompose(read, (value) => value.length === 0, deadline, 'native affirmative connector prompt dismissal');
  return true;
}
