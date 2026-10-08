import * as assert from 'assert';
import type { CdpEvaluator } from './cdpFormHelpers';
import { clickPoint } from './cdpFormHelpers';
import {
  affirmativeAzureConnectorPrompt,
  selectWorkbenchPromptOption,
  type WorkbenchPrompt,
  type WorkbenchPromptContainer,
} from './workbenchPromptSelection';

export interface DetectedWorkbenchPrompt extends WorkbenchPromptContainer {
  title: string;
  interactive: boolean;
  inputPoint?: { x: number; y: number };
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
        interactive: !input || (!input.disabled && !input.readOnly),
        inputPoint: input ? pointFor(input) : undefined,
      };
    });
})()`;

export function readWorkbenchPrompts(cdp: CdpEvaluator, timeoutMs = 3000): Promise<DetectedWorkbenchPrompt[]> {
  return cdp.evaluate(undefined, workbenchPromptDomScript, { timeoutMs });
}

function isLoadingPrompt(prompt: DetectedWorkbenchPrompt): boolean {
  return prompt.kind === 'quickInput' && /^Loading(?:\.\.\.)?$/.test(prompt.title) && prompt.rows.length === 0;
}

function remaining(deadline: number, signal?: AbortSignal): number {
  signal?.throwIfAborted();
  const value = deadline - Date.now();
  assert.ok(value > 0, 'Workbench affirmative prompt deadline expired');
  return value;
}

export async function handleAffirmativeConnectorWorkbenchPrompt(
  cdp: CdpEvaluator,
  appName: string,
  deadline: number,
  selectExistingTarget?: (prompt: DetectedWorkbenchPrompt) => Promise<boolean>,
  signal?: AbortSignal,
  includeNotification?: (prompt: DetectedWorkbenchPrompt) => boolean
): Promise<boolean> {
  const read = () => readWorkbenchPrompts(cdp, Math.min(3000, remaining(deadline, signal)));
  const blocking = (prompts: DetectedWorkbenchPrompt[]) =>
    prompts.filter((prompt) => prompt.kind !== 'notification' || includeNotification?.(prompt));
  let prompts = blocking(await read());
  signal?.throwIfAborted();
  if (!prompts.length) {
    return false;
  }
  assert.strictEqual(prompts.length, 1, 'Ambiguous workbench prompt during affirmative connector setup');
  let prompt = prompts[0];
  if (isLoadingPrompt(prompt)) {
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
  const affirmative =
    prompt.kind === 'quickInput' ? affirmativeAzureConnectorPrompt.optionText : affirmativeAzureConnectorPrompt.alternateOptionTexts?.[0];
  assert.ok(affirmative, 'Shared affirmative policy must declare the actual Yes alternative');
  let selected: ReturnType<typeof selectWorkbenchPromptOption>;
  while (true) {
    const options = prompt.kind === 'quickInput' ? prompt.rows : prompt.buttons;
    const matches = options.filter(
      (option) => option.text.replace(/\s+/g, ' ').trim().toLowerCase() === affirmative.replace(/\s+/g, ' ').trim().toLowerCase()
    );
    assert.ok(matches.length <= 1, 'Missing/ambiguous affirmative connector option');
    selected = selectWorkbenchPromptOption([{ ...affirmativeAzureConnectorPrompt, matchText: title }], [prompt]);
    if (selected.point) {
      assert.strictEqual(matches.length, 1, 'Affirmative connector selection must resolve exactly one matching option');
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
    prompts = blocking(await read());
    assert.strictEqual(prompts.length, 1, 'Affirmative connector prompt disappeared or became ambiguous before it was actionable');
    prompt = prompts[0];
    assert.ok(matchesConnector(prompt), 'Connector setup changed to another prompt before the affirmative option was actionable');
  }
  assert.strictEqual(selected.targetText, affirmative, 'Never route connector setup to Skip, No, Cancel or a partial label');
  await clickPoint(cdp, selected.point);
  let emptySince: number | undefined;
  while (true) {
    remaining(deadline, signal);
    const next = blocking(await read());
    if (!next.length) {
      emptySince ??= Date.now();
      if (Date.now() - emptySince >= 500) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
      continue;
    }
    emptySince = undefined;
    assert.strictEqual(next.length, 1, 'Ambiguous follow-up connector wizard');
    if (isLoadingPrompt(next[0])) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
      continue;
    }
    if (!matchesConnector(next[0])) {
      assert.ok(
        selectExistingTarget,
        'Affirmative connector setup requires approved existing WIF auth, subscription and resource-group selections; no resource creation or bypass'
      );
      assert.strictEqual(await selectExistingTarget(next[0]), true, 'Existing approved fixture selection failed');
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
  }
}

export async function selectExactWorkbenchPromptOption(
  cdp: CdpEvaluator,
  initialPrompt: DetectedWorkbenchPrompt,
  rule: WorkbenchPrompt,
  deadline: number,
  signal?: AbortSignal
): Promise<boolean> {
  const matchesPrompt = (prompt: DetectedWorkbenchPrompt) =>
    prompt.kind === initialPrompt.kind && prompt.text.toLowerCase().includes(rule.matchText.toLowerCase());
  let prompt = initialPrompt;
  while (true) {
    remaining(deadline, signal);
    const selection = selectWorkbenchPromptOption([rule], [prompt]);
    if (selection.point) {
      await clickPoint(cdp, selection.point);
      break;
    }
    assert.strictEqual(selection.visible, true, `Expected workbench prompt is no longer visible: ${rule.matchText}`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
    const prompts = await readWorkbenchPrompts(cdp, Math.min(3000, remaining(deadline, signal)));
    const matches = prompts.filter(matchesPrompt);
    assert.strictEqual(matches.length, 1, `Expected one matching workbench prompt while waiting for option: ${rule.matchText}`);
    prompt = matches[0];
  }
  while (true) {
    remaining(deadline, signal);
    const prompts = await readWorkbenchPrompts(cdp, Math.min(3000, remaining(deadline, signal)));
    if (!prompts.some(matchesPrompt)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
  }
}
