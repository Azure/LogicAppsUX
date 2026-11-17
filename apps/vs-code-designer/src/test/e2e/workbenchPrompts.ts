import * as assert from 'assert';
import { createHash } from 'node:crypto';
import type { CdpEvaluator } from './cdpFormHelpers';
import { clickPoint } from './cdpFormHelpers';
import {
  affirmativeAzureConnectorPrompt,
  selectWorkbenchPromptOption,
  type WorkbenchPrompt,
  type WorkbenchPromptContainer,
} from './workbenchPromptSelection';
import {
  command as workbenchCommand,
  waitForRegularWorkbenchOwnership,
  type RegularWorkbenchOwnershipExpectation,
} from './workbenchCdpActions';
import { operationDiagnostics, operationDiagnosticBinding } from './operationDiagnostics';
import { captureCdpScreenshot } from './screenshot';
import type { DiagnosticProducer } from '../../../scripts/e2e-cli-diagnostics';

export const subscriptionTitles = [
  'Select subscription',
  'Select subscription.',
  'Select a subscription',
  'Select a subscription.',
  'Select an Azure subscription',
  'Select an Azure subscription.',
];
// Diagnostic identities only. Inclusion here MUST NOT approve a prompt.
export const knownPromptTitles = [
  ...subscriptionTitles,
  'Select a resource group for new resources.',
  'Loading...',
  'Loading',
  'Sign in to Azure',
  'Select an account',
  'Select an Azure account',
  'Select a location for new resources.',
];

export function classifyWorkbenchPrompt(prompt?: DetectedWorkbenchPrompt) {
  const title = (prompt?.title ?? '').replace(/\s+/g, ' ').trim();
  const category = /sign in|account/i.test(title)
    ? 'authentication'
    : /resource group/i.test(title)
      ? 'resource-group'
      : /grant|permission/i.test(title)
        ? 'permission'
        : /subscription/i.test(title)
          ? 'subscription'
          : /^Loading(?:\.\.\.)?$/.test(title)
            ? 'loading'
            : 'unknown';
  return {
    kind: prompt?.kind === 'quickInput' || prompt?.kind === 'dialog' || prompt?.kind === 'notification' ? prompt.kind : 'unknown',
    category,
    categoryCode: ['unknown', 'authentication', 'resource-group', 'permission', 'subscription', 'loading'].indexOf(category),
    knownTitleCode: knownPromptTitles.indexOf(title) + 1,
    sha256: createHash('sha256').update(title).digest('hex'),
  };
}

// Detection-owned, one attempt, on the same connection. Never reconnect, focus,
// dismiss, retry the prompt or turn a missing diagnostic image into success.
export async function flagUnexpectedWorkbenchPrompt(
  cdp: CdpEvaluator,
  prompt: DetectedWorkbenchPrompt | undefined,
  originalError: unknown,
  trace: DiagnosticProducer = operationDiagnostics.fork('unexpected-ui', { maxEvents: 16, maxBytes: 32768 })
): Promise<void> {
  const identity = classifyWorkbenchPrompt(prompt);
  const state = {
    unexpected: true,
    elementKindCode: ['unknown', 'quickInput', 'dialog', 'notification'].indexOf(identity.kind),
    categoryCode: identity.categoryCode,
    title: { sha256: identity.sha256, knownTitleCode: identity.knownTitleCode },
    count: prompt?.rows.length ?? 0,
    screenshotPresent: false,
    screenshotMissing: true,
  };
  trace.emit('unexpected-ui', 'failure', { error: originalError, state });
  const capture = trace.start('unexpected-ui-capture', state);
  const checkpoint = `unexpected-ui-${capture.id.replace(/:/g, '-')}`;
  const binding = operationDiagnosticBinding();
  let secondaryError: unknown;
  try {
    const file = await captureCdpScreenshot(cdp.diagnosticCdp ?? cdp, checkpoint, {
      classification: 'diagnostic',
      captureBeforeObservation: true,
      expectation: { kind: 'diagnostic', label: checkpoint, reason: 'unexpected-workbench-prompt' },
      timeoutMs: 5000,
      deadlineMs: Date.now() + 5000,
      allowWindowsDiagnosticFallback: false,
      onDiagnosticFailure: (error) => {
        secondaryError = error;
      },
      diagnosticContext: {
        operationId: capture.id,
        nativeInvocation: binding.nativeInvocation,
        phase: binding.phase,
      },
    });
    state.screenshotPresent = Boolean(file);
    state.screenshotMissing = !file;
    if (file) {
      capture.end(state);
    } else {
      capture.fail(secondaryError ?? new Error('Unexpected UI diagnostic screenshot unavailable; original failure retained'), state);
    }
  } catch (error) {
    capture.fail(error, state);
  } finally {
    trace.emit('unexpected-ui-terminal', 'summary', { state });
    console.warn(
      `[unexpected-ui] ${JSON.stringify({
        ...identity,
        checkpoint,
        operationId: capture.id,
        nativeInvocation: binding.nativeInvocation,
        phase: binding.phase,
        screenshot: state.screenshotPresent ? `${checkpoint}.png` : null,
        screenshotMissing: state.screenshotMissing,
      })}`
    );
  }
}

export interface DetectedWorkbenchPrompt extends WorkbenchPromptContainer {
  title: string;
  interactive: boolean;
  inputPoint?: { x: number; y: number };
  // Observation only: selection still uses the original title and exact policy.
  promptSources?: {
    placeholder: string;
    widgetTitle: string;
    inputLabel: string;
    titleSourceCode: number;
    busy: boolean;
    inputFocused: boolean;
    inputHitTestable: boolean;
    documentFocused: boolean;
    documentVisible: boolean;
  };
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
  )).filter(container => visible(container) &&
    (!container.classList.contains('quick-input-widget') ||
      (!container.inert && !container.classList.contains('quick-input-widget-closing'))));
  return containers.filter(container => !containers.some(other => other !== container && other.contains(container)))
    .map(container => {
      const quickInput = container.classList.contains('quick-input-widget');
      const notification = container.classList.contains('notification-toast') || container.classList.contains('notification-list-item');
      const input = Array.from(container.querySelectorAll('input')).find(visible);
      const title = normalize(input?.getAttribute('placeholder') || container.querySelector('.quick-input-title')?.textContent);
      const placeholder = normalize(input?.getAttribute('placeholder'));
      const widgetTitle = normalize(container.querySelector('.quick-input-title')?.textContent);
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
        promptSources: {
          placeholder, widgetTitle, inputLabel: normalize(input?.getAttribute('aria-label')),
          titleSourceCode: input?.getAttribute('placeholder') ? 1 : 2,
          busy: container.getAttribute('aria-busy') === 'true' || !!container.querySelector('[aria-busy="true"], .monaco-progress-container.active'),
          inputFocused: !!input && document.activeElement === input,
          inputHitTestable: !!input && !!pointFor(input),
          documentFocused: document.hasFocus(), documentVisible: document.visibilityState === 'visible',
        },
      };
    });
})()`;

export function readWorkbenchPrompts(cdp: CdpEvaluator, timeoutMs = 3000): Promise<DetectedWorkbenchPrompt[]> {
  return cdp.evaluate(undefined, workbenchPromptDomScript, { timeoutMs });
}

export async function revealWorkbenchPromptOption(
  cdp: CdpEvaluator,
  matchText: string,
  optionTexts: readonly string[],
  deadline: number
): Promise<boolean> {
  return cdp.evaluate<boolean>(
    undefined,
    `(() => {
      const normalize = value => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const expectedPrompt = normalize(${JSON.stringify(matchText)});
      const expectedOptions = ${JSON.stringify(optionTexts)}.map(normalize);
      const containers = Array.from(document.querySelectorAll(
        '.quick-input-widget, .monaco-dialog-box, [role="dialog"], .notification-toast, .notification-list-item'
      )).filter(container => normalize(container.innerText || container.textContent || '').includes(expectedPrompt));
      const options = Array.from(new Set(containers.flatMap(container =>
        Array.from(container.querySelectorAll('a.monaco-button, button, .monaco-text-button'))
      ))).filter(option => expectedOptions.includes(normalize(option.querySelector('.label-name')?.textContent || option.textContent)));
      if (options.length !== 1 || !(options[0] instanceof HTMLElement)) return false;
      options[0].scrollIntoView({ block: 'center', inline: 'center' });
      return true;
    })()`,
    { timeoutMs: Math.min(3000, remaining(deadline)) }
  );
}

export async function revealRetainedWorkbenchNotifications(
  cdp: CdpEvaluator,
  expectation: RegularWorkbenchOwnershipExpectation,
  deadline: number
): Promise<void> {
  await waitForRegularWorkbenchOwnership(cdp, expectation, deadline);
  await workbenchCommand(cdp, 'Notifications: Show Notifications', deadline);
  while (Date.now() < deadline) {
    const revealed = await cdp.evaluate<boolean>(
      undefined,
      `(() => {
        const visible = element => {
          if (!(element instanceof HTMLElement)) return false;
          const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        };
        return Array.from(document.querySelectorAll(
          '.notifications-center, .notifications-list-container, [aria-label="Notifications"]'
        )).some(visible);
      })()`,
      { timeoutMs: Math.min(3000, remaining(deadline)) }
    );
    if (revealed) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline))));
  }
  assert.fail('Notifications: Show Notifications completed without revealing the visible Notification Center');
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
  let lastPrompt: DetectedWorkbenchPrompt | undefined;
  let captureAttempted = false;
  const read = () => readWorkbenchPrompts(cdp, Math.min(3000, remaining(deadline, signal)));
  const blocking = (prompts: DetectedWorkbenchPrompt[]) =>
    prompts.filter((prompt) => prompt.kind !== 'notification' || includeNotification?.(prompt));
  const requirePrompt = async (check: () => void, prompt: DetectedWorkbenchPrompt | undefined) => {
    lastPrompt = prompt;
    try {
      check();
    } catch (error) {
      captureAttempted = true;
      await flagUnexpectedWorkbenchPrompt(cdp, prompt, error);
      throw error;
    }
  };
  try {
    let prompts = blocking(await read());
    lastPrompt = prompts[0];
    signal?.throwIfAborted();
    if (!prompts.length) {
      return false;
    }
    await requirePrompt(
      () => assert.strictEqual(prompts.length, 1, 'Ambiguous workbench prompt during affirmative connector setup'),
      prompts[0]
    );
    let prompt = prompts[0];
    if (isLoadingPrompt(prompt)) {
      return false;
    }
    const title = `Enable connectors in Azure for Logic App ${appName}`;
    const matchesConnector = (value: DetectedWorkbenchPrompt) =>
      value.kind === 'quickInput' ? value.title === title : value.text.includes(title);
    if (!matchesConnector(prompt)) {
      await requirePrompt(
        () =>
          assert.ok(
            selectExistingTarget,
            'Unrecognized auth/subscription/resource-group prompt: approved existing WIF identity and target fixture configuration are required'
          ),
        prompt
      );
      return selectExistingTarget!(prompt);
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
      await requirePrompt(() => assert.ok(matches.length <= 1, 'Missing/ambiguous affirmative connector option'), prompt);
      selected = selectWorkbenchPromptOption([{ ...affirmativeAzureConnectorPrompt, matchText: title }], [prompt]);
      if (selected.point) {
        assert.strictEqual(matches.length, 1, 'Affirmative connector selection must resolve exactly one matching option');
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
      prompts = blocking(await read());
      await requirePrompt(
        () =>
          assert.strictEqual(prompts.length, 1, 'Affirmative connector prompt disappeared or became ambiguous before it was actionable'),
        prompts[0]
      );
      prompt = prompts[0];
      await requirePrompt(
        () => assert.ok(matchesConnector(prompt), 'Connector setup changed to another prompt before the affirmative option was actionable'),
        prompt
      );
    }
    assert.strictEqual(selected.targetText, affirmative, 'Never route connector setup to Skip, No, Cancel or a partial label');
    await clickPoint(cdp, selected.point);
    let emptySince: number | undefined;
    while (true) {
      remaining(deadline, signal);
      const next = blocking(await read());
      lastPrompt = next[0];
      if (!next.length) {
        emptySince ??= Date.now();
        if (Date.now() - emptySince >= 500) {
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
        continue;
      }
      emptySince = undefined;
      await requirePrompt(() => assert.strictEqual(next.length, 1, 'Ambiguous follow-up connector wizard'), next[0]);
      if (isLoadingPrompt(next[0])) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
        continue;
      }
      if (!matchesConnector(next[0])) {
        await requirePrompt(
          () =>
            assert.ok(
              selectExistingTarget,
              'Affirmative connector setup requires approved existing WIF auth, subscription and resource-group selections; no resource creation or bypass'
            ),
          next[0]
        );
        try {
          assert.strictEqual(await selectExistingTarget!(next[0]), true, 'Existing approved fixture selection failed');
        } catch (error) {
          captureAttempted = true;
          throw error;
        }
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
    }
  } catch (error) {
    if (!captureAttempted && lastPrompt) {
      await flagUnexpectedWorkbenchPrompt(cdp, lastPrompt, error);
    }
    throw error;
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
  let captureAttempted = false;
  try {
    while (true) {
      remaining(deadline, signal);
      const selection = selectWorkbenchPromptOption([rule], [prompt]);
      if (selection.point) {
        await clickPoint(cdp, selection.point);
        break;
      }
      try {
        assert.strictEqual(selection.visible, true, `Expected workbench prompt is no longer visible: ${rule.matchText}`);
      } catch (error) {
        captureAttempted = true;
        await flagUnexpectedWorkbenchPrompt(cdp, prompt, error);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
      const prompts = await readWorkbenchPrompts(cdp, Math.min(3000, remaining(deadline, signal)));
      const matches = prompts.filter(matchesPrompt);
      try {
        assert.strictEqual(matches.length, 1, `Expected one matching workbench prompt while waiting for option: ${rule.matchText}`);
      } catch (error) {
        captureAttempted = true;
        await flagUnexpectedWorkbenchPrompt(cdp, prompts[0], error);
        throw error;
      }
      prompt = matches[0];
    }
    while (true) {
      remaining(deadline, signal);
      const prompts = await readWorkbenchPrompts(cdp, Math.min(3000, remaining(deadline, signal)));
      if (!prompts.some(matchesPrompt)) {
        return true;
      }
      prompt = prompts.find(matchesPrompt)!;
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining(deadline, signal))));
    }
  } catch (error) {
    if (!captureAttempted) {
      await flagUnexpectedWorkbenchPrompt(cdp, prompt, error);
    }
    throw error;
  }
}
