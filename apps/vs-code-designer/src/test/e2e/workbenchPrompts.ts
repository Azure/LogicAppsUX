import * as assert from 'assert';
import type { CdpEvaluator } from './cdpFormHelpers';
import { clickPoint } from './cdpFormHelpers';
import { affirmativeAzureConnectorPrompt, selectWorkbenchPromptOption, type WorkbenchPromptContainer } from './workbenchPromptSelection';

export interface DetectedWorkbenchPrompt extends WorkbenchPromptContainer {
  title: string;
  interactive: boolean;
}

// Shared stock workbench detection extracted from workspaceLifecycle's prompt
// helper. No VS Code dialog API interception or DOM .click() is used.
export const workbenchPromptDomScript = `(() => {
  const visible = element => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };
  const normalize = text => (text || '').replace(/\\s+/g, ' ').trim();
  const pointFor = element => {
    element.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = element.getBoundingClientRect();
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const hit = document.elementFromPoint(point.x, point.y);
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled') &&
      !!hit && (hit === element || element.contains(hit)) ? point : undefined;
  };
  const containers = Array.from(document.querySelectorAll(
    '.quick-input-widget, .monaco-dialog-box, [role="dialog"], .notification-toast, .notification-list-item'
  )).filter(visible);
  return containers.filter(container => !containers.some(other => other !== container && other.contains(container)))
    .map(container => {
      const quickInput = container.classList.contains('quick-input-widget');
      const notification = container.classList.contains('notification-toast') || container.classList.contains('notification-list-item');
      const input = Array.from(container.querySelectorAll('input')).find(visible);
      const title = normalize(input?.getAttribute('placeholder') || container.querySelector('.quick-input-title')?.textContent);
      const text = normalize((container.innerText || container.textContent || '') + ' ' +
        Array.from(container.querySelectorAll('input')).map(input => (input.value || '') + ' ' + (input.placeholder || '')).join(' '));
      const options = selector => Array.from(container.querySelectorAll(selector)).filter(visible).map(element => ({
        text: normalize(element.querySelector('.label-name')?.textContent || element.textContent),
        label: normalize(element.querySelector('.label-name')?.textContent || element.textContent), point: pointFor(element),
      }));
      return {
        kind: quickInput ? 'quickInput' : notification ? 'notification' : 'dialog',
        title, text,
        rows: options('.monaco-list-row, [role="option"]'),
        buttons: options('a.monaco-button, button, .monaco-text-button'),
        interactive: document.visibilityState === 'visible' &&
          (!input || (!input.disabled && !input.readOnly)),
      };
    });
})()`;

export function readWorkbenchPrompts(cdp: CdpEvaluator, timeoutMs = 3000): Promise<DetectedWorkbenchPrompt[]> {
  return cdp.evaluate(undefined, workbenchPromptDomScript, { timeoutMs });
}

function remaining(deadline: number): number {
  const value = deadline - Date.now();
  assert.ok(value > 0, 'Workbench affirmative prompt deadline expired');
  return value;
}

export async function handleAffirmativeConnectorWorkbenchPrompt(
  cdp: CdpEvaluator,
  appName: string,
  deadline: number,
  selectExistingTarget?: (prompt: DetectedWorkbenchPrompt) => Promise<boolean>
): Promise<boolean> {
  const read = () => readWorkbenchPrompts(cdp, Math.min(3000, remaining(deadline)));
  const blocking = (prompts: DetectedWorkbenchPrompt[]) => prompts.filter((prompt) => prompt.kind !== 'notification');
  const prompts = blocking(await read());
  if (!prompts.length) {
    return false;
  }
  assert.strictEqual(prompts.length, 1, 'Ambiguous workbench prompt during affirmative connector setup');
  const prompt = prompts[0];
  if (prompt.kind === 'quickInput' && /^Loading(?:\.\.\.)?$/.test(prompt.title) && prompt.rows.length === 0) {
    return false;
  }
  const title = `Enable connectors in Azure for Logic App ${appName}`;
  const matchesConnector = (value: DetectedWorkbenchPrompt) =>
    value.kind === 'quickInput' ? value.title === title : value.text.includes(title);
  if (!matchesConnector(prompt)) {
    assert.ok(
      selectExistingTarget,
      'Unrecognized auth/subscription/resource-group prompt: approved existing WIF identity and target fixture configuration are required'
    );
    return selectExistingTarget(prompt);
  }
  assert.strictEqual(prompt.interactive, true, 'Affirmative connector prompt is not interactive/focused');
  const affirmative =
    prompt.kind === 'quickInput' ? affirmativeAzureConnectorPrompt.optionText : affirmativeAzureConnectorPrompt.alternateOptionTexts?.[0];
  assert.ok(affirmative, 'Shared affirmative policy must declare the actual Yes alternative');
  const options = prompt.kind === 'quickInput' ? prompt.rows : prompt.buttons;
  assert.strictEqual(options.filter((option) => option.text === affirmative).length, 1, 'Missing/ambiguous affirmative connector option');
  const selected = selectWorkbenchPromptOption([{ ...affirmativeAzureConnectorPrompt, matchText: title }], [prompt]);
  assert.strictEqual(selected.targetText, affirmative, 'Never route connector setup to Skip, No, Cancel or a partial label');
  assert.ok(selected.point, 'Affirmative connector option must be enabled and hit-testable');
  await clickPoint(cdp, selected.point);
  while (true) {
    remaining(deadline);
    const next = blocking(await read());
    if (!next.length) {
      return true;
    }
    assert.strictEqual(next.length, 1, 'Ambiguous follow-up connector wizard');
    if (!matchesConnector(next[0])) {
      assert.ok(
        selectExistingTarget,
        'Affirmative connector setup requires approved existing WIF auth, subscription and resource-group selections; no resource creation or bypass'
      );
      assert.strictEqual(await selectExistingTarget(next[0]), true, 'Existing approved fixture selection failed');
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline))));
  }
}
