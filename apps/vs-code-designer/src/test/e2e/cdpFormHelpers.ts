import * as assert from 'assert';
import type { FieldLabels } from './createWorkspaceTypes';
import { containsIgnoreCase } from './testUtils';

export type CdpEvaluator = {
  evaluate<T>(contextId: number | undefined, expression: string): Promise<T>;
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
};

export type Point = {
  x: number;
  y: number;
};

type FieldState = {
  ok: boolean;
  reason?: string;
  value?: string;
  fieldText?: string;
  validationText?: string;
  pageText?: string;
  ariaInvalid?: string | null;
  describedBy?: string | null;
};

type WizardButtonState = {
  found: boolean;
  disabled?: boolean;
  text?: string;
  pageText?: string;
  fieldValues?: unknown[];
};

export async function enterFieldValue(cdp: CdpEvaluator, contextId: number, labels: FieldLabels, value: string): Promise<void> {
  await scrollFieldIntoView(cdp, contextId, labels);
  const focusResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; value?: string }>(
    contextId,
    withField(
      labels,
      `input.focus();
      input.select();
      return { ok: true, value: input.value };`
    )
  );

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus ${getLabels(labels).join('/')} field. Text: ${focusResult.text ?? ''}`
  );

  try {
    await replaceFocusedInputText(cdp, value);
  } catch {
    await cdp.evaluate(
      contextId,
      withField(
        labels,
        `setInputValue(input, ${JSON.stringify(value)});
        return { ok: true, value: input.value };`
      )
    );
  }

  const result = await waitForFieldValue(cdp, contextId, labels, value);
  assert.strictEqual(
    result.value,
    value,
    `Expected field "${getLabels(labels).join('/')}" to equal "${value}". State: ${JSON.stringify(result)}`
  );
}

export async function scrollFieldIntoView(cdp: CdpEvaluator, contextId: number, labels: FieldLabels): Promise<void> {
  await waitForFieldVisible(cdp, contextId, labels);
  const result = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string }>(
    contextId,
    withField(
      labels,
      `const target = field || input;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      input.focus();
      return { ok: true, text: field?.innerText || input.value || '' };`
    )
  );

  assert.strictEqual(result.ok, true, result.reason ?? `Failed to scroll ${getLabels(labels).join('/')} field into view`);
  await delay(150);
}

export async function waitForFieldVisible(cdp: CdpEvaluator, contextId: number, labels: FieldLabels): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels).catch(() => undefined);
    if (result?.ok) {
      return;
    }

    await delay(250);
  }

  const text = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting for field "${getLabels(labels).join('/')}" to be visible. Webview text: ${text}`);
}

export async function waitForFieldHidden(cdp: CdpEvaluator, contextId: number, labels: FieldLabels): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels).catch(() => undefined);
    if (!result?.ok) {
      return;
    }

    await delay(250);
  }

  const result = await getFieldState(cdp, contextId, labels).catch((error) => ({ text: String(error) }));
  assert.fail(`Expected field "${getLabels(labels).join('/')}" to be hidden. State: ${JSON.stringify(result)}`);
}

export async function waitForFieldValidationMessage(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels,
  expectedMessage: string
): Promise<void> {
  const deadline = Date.now() + (expectedMessage === 'not exist' ? 45000 : 10000);
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels);
    const fieldText = `${result.fieldText ?? ''}\n${result.validationText ?? ''}`;
    if (containsIgnoreCase(fieldText, expectedMessage)) {
      return;
    }

    await delay(250);
  }

  const finalState = await getFieldState(cdp, contextId, labels).catch((error) => ({ text: String(error) }));
  assert.fail(
    `Timed out waiting for validation message "${expectedMessage}" on field "${getLabels(labels).join('/')}". State: ${JSON.stringify(finalState)}`
  );
}

export async function waitForFieldValidationMessageToClear(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels,
  message: string
): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels);
    const fieldText = `${result.fieldText ?? ''}\n${result.validationText ?? ''}`;
    if (!containsIgnoreCase(fieldText, message)) {
      return;
    }

    await delay(250);
  }

  const result = await getFieldState(cdp, contextId, labels).catch((error) => ({ text: String(error) }));
  assert.fail(
    `Timed out waiting for validation message "${message}" to clear on field "${getLabels(labels).join('/')}". State: ${JSON.stringify(result)}`
  );
}

export async function waitForAsyncValidationToSettle(cdp: CdpEvaluator, contextId: number): Promise<void> {
  const pendingMessages = ['Validating path', 'Checking workspace availability'];
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const pageText = await getPageText(cdp, contextId);
    if (!pendingMessages.some((message) => containsIgnoreCase(pageText, message))) {
      return;
    }

    await delay(250);
  }

  const pageText = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting for async Create Workspace validation to settle. Webview text: ${pageText}`);
}

export async function assertNextButtonDisabled(cdp: CdpEvaluator, contextId: number, context: string): Promise<void> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const result = await getNextButtonState(cdp, contextId);
    if (result.found && result.disabled) {
      return;
    }

    await delay(250);
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected Next button to be disabled for ${context}. State: ${JSON.stringify(result)}`);
}

export async function assertNextButtonEnabled(cdp: CdpEvaluator, contextId: number, context: string): Promise<void> {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const result = await getNextButtonState(cdp, contextId);
    if (result.found && !result.disabled) {
      return;
    }

    await delay(250);
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected Next button to be enabled for ${context}. State: ${JSON.stringify(result)}`);
}

export async function assertWizardButtonDisabledOrAbsent(
  cdp: CdpEvaluator,
  contextId: number,
  buttonText: string,
  context: string
): Promise<void> {
  const result = await getWizardButtonState(cdp, contextId, buttonText);
  assert.ok(
    !result.found || result.disabled,
    `Expected ${buttonText} button to be disabled or absent for ${context}. State: ${JSON.stringify(result)}`
  );
}

export async function assertDropdownHasOptions(
  cdp: CdpEvaluator,
  contextId: number,
  labelText: string,
  expectedOptions: string[]
): Promise<void> {
  const focusResult = await getDropdownClickPoint(cdp, contextId, labelText);
  assert.strictEqual(focusResult.ok, true, focusResult.reason ?? `Failed to find "${labelText}" dropdown. Text: ${focusResult.text ?? ''}`);
  assert.ok(focusResult.point, `Failed to locate "${labelText}" dropdown click point.`);

  await clickPoint(cdp, focusResult.point);
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await dispatchDropdownClickFallback(cdp, contextId, labelText);
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Enter', undefined, 13);
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Space', ' ', 32);
  }
  await waitForDropdownOptions(cdp, contextId);
  const options = await getVisibleDropdownOptions(cdp, contextId);
  for (const expectedOption of expectedOptions) {
    assert.ok(
      options.some((option) => option === expectedOption),
      `Expected "${labelText}" dropdown to include "${expectedOption}". Options: ${JSON.stringify(options)}`
    );
  }
  await pressKey(cdp, 'Escape', 'Escape', 27);
}

export async function selectRadioOption(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  const focusResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; point?: Point }>(
    contextId,
    `(() => {
      const expected = ${JSON.stringify(labelText)};
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent);
          return text.length > 0 && text.length < 180 && text.includes(expected);
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      if (!label) {
        return { ok: false, reason: 'Radio label not found', text: document.body?.innerText || '' };
      }

      const radioRoot = label.closest('[role="radio"], .fui-Radio') || label;
      const input = radioRoot.querySelector('input[type="radio"]');
      if (!(input instanceof HTMLInputElement)) {
        return { ok: false, reason: 'Radio input not found', text: radioRoot.outerHTML };
      }

      const clickable = radioRoot instanceof HTMLElement ? radioRoot : input;
      clickable.scrollIntoView({ block: 'center', inline: 'center' });
      input.focus();
      const rect = clickable.getBoundingClientRect();
      return {
        ok: true,
        text: radioRoot.outerHTML,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      };
    })()`
  );

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus radio option "${labelText}". Text: ${focusResult.text ?? ''}`
  );
  assert.ok(focusResult.point, `Failed to locate radio option "${labelText}" click point.`);
  await clickPoint(cdp, focusResult.point);
  if (!(await isRadioOptionChecked(cdp, contextId, labelText))) {
    await dispatchRadioClickFallback(cdp, contextId, labelText);
  }
  if (!(await isRadioOptionChecked(cdp, contextId, labelText))) {
    await pressKey(cdp, 'Space', ' ', 32);
  }
  await waitForRadioOptionChecked(cdp, contextId, labelText);
}

export async function selectDropdownOption(cdp: CdpEvaluator, contextId: number, labelText: string, optionText: string): Promise<void> {
  if (await isDropdownValueSelected(cdp, contextId, labelText, optionText)) {
    return;
  }

  const focusResult = await getDropdownClickPoint(cdp, contextId, labelText);

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus "${labelText}" dropdown. Text: ${focusResult.text ?? ''}`
  );
  assert.ok(focusResult.point, `Failed to locate "${labelText}" dropdown click point.`);
  await clickPoint(cdp, focusResult.point);
  await delay(500);
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await dispatchDropdownClickFallback(cdp, contextId, labelText);
    await delay(500);
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Enter', undefined, 13);
    await delay(500);
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Space', ' ', 32);
    await delay(500);
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'ArrowDown', 'ArrowDown', 40);
    await delay(250);
    await pressKey(cdp, 'Enter', undefined, 13);
    await delay(500);
    if (await isDropdownValueSelected(cdp, contextId, labelText, optionText)) {
      return;
    }
  }

  const optionResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; options?: string[]; optionIndex?: number }>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const options = Array.from(document.querySelectorAll('[role="option"]')).filter(isVisible);
        const option = options.find((candidate) => normalize(candidate.textContent) === ${JSON.stringify(optionText)});
        if (!(option instanceof HTMLElement)) {
          return {
            ok: false,
            reason: 'Dropdown option not found',
            options: options.map((candidate) => normalize(candidate.textContent)),
            text: document.body?.innerText || '',
          };
        }

        return { ok: true, optionIndex: options.indexOf(option) };
    })()`
  );

  assert.strictEqual(
    optionResult.ok,
    true,
    `Failed to select "${optionText}" from "${labelText}". Reason: ${optionResult.reason ?? 'unknown'}. Options: ${JSON.stringify(
      optionResult.options
    )}. Text: ${optionResult.text ?? ''}`
  );
  for (let index = 0; index < (optionResult.optionIndex ?? 0); index++) {
    await pressKey(cdp, 'ArrowDown', 'ArrowDown', 40);
  }
  await pressKey(cdp, 'Enter', undefined, 13);
  await waitForDropdownValue(cdp, contextId, labelText, optionText);
}

export async function hasDropdownOptions(cdp: CdpEvaluator, contextId: number): Promise<boolean> {
  return cdp.evaluate<boolean>(
    contextId,
    `(() => {
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      return Array.from(document.querySelectorAll('[role="option"]')).some(isVisible);
    })()`
  );
}

export async function isRadioOptionChecked(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<boolean> {
  const result = await cdp.evaluate<{ checked: boolean }>(
    contextId,
    `(() => {
      const expected = ${JSON.stringify(labelText)};
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent);
          return text.length > 0 && text.length < 180 && text.includes(expected);
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const radioRoot = label?.closest('[role="radio"], .fui-Radio') || label;
      const input = radioRoot?.querySelector('input[type="radio"]');
      return { checked: input instanceof HTMLInputElement ? input.checked : false };
    })()`
  );
  return result.checked;
}

export async function isDropdownValueSelected(
  cdp: CdpEvaluator,
  contextId: number,
  labelText: string,
  optionText: string
): Promise<boolean> {
  const result = await cdp.evaluate<{ selected: boolean }>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter((candidate) => {
          const text = normalize(candidate.textContent).toLowerCase();
          return text.length > 0 && text.length < 160 && text.includes(${JSON.stringify(labelText.toLowerCase())});
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const dropdownId = label?.getAttribute('for');
      const field = label?.closest('[class*="fui-Field"]') || label?.parentElement;
      const dropdown = (dropdownId ? document.getElementById(dropdownId) : null) || field?.querySelector('button[role="combobox"]');
      const text = dropdown?.textContent || '';
      return { selected: normalize(text).includes(${JSON.stringify(optionText)}) };
    })()`
  );
  return result.selected;
}

export async function pressKey(cdp: CdpEvaluator, code: string, key?: string, windowsVirtualKeyCode?: number): Promise<void> {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: key ?? code,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: key ?? code,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
}

export async function clickPoint(cdp: CdpEvaluator, point: Point): Promise<void> {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
    button: 'none',
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
}

export async function getFieldState(cdp: CdpEvaluator, contextId: number, labels: FieldLabels): Promise<FieldState> {
  return cdp.evaluate(
    contextId,
    withField(
      labels,
      `return {
      ok: true,
      value: input.value,
      fieldText: field?.innerText || '',
      validationText: getValidationText(input, field),
      pageText: document.body?.innerText || '',
      ariaInvalid: input.getAttribute('aria-invalid'),
      describedBy: input.getAttribute('aria-describedby'),
    };`
    )
  );
}

export async function getNextButtonState(cdp: CdpEvaluator, contextId: number): Promise<WizardButtonState> {
  return getWizardButtonState(cdp, contextId, 'Next');
}

export async function getWizardButtonState(cdp: CdpEvaluator, contextId: number, buttonText: string): Promise<WizardButtonState> {
  return cdp.evaluate(
    contextId,
    `(() => {
      const expectedButtonText = ${JSON.stringify(buttonText)};
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const buttons = Array.from(document.querySelectorAll('button')).filter(isVisible);
      const button = buttons.find((candidate) => (candidate.textContent || '').includes(expectedButtonText));
      const invalidFields = Array.from(document.querySelectorAll('input[aria-invalid="true"]')).map((input) => {
        const label = input.id ? document.querySelector('label[for="' + CSS.escape(input.id) + '"]') : null;
        const field = input.closest('[class*="fui-Field"]') || input.parentElement;
        return {
          label: label?.textContent || '',
          value: input instanceof HTMLInputElement ? input.value : '',
          text: field?.innerText || '',
        };
      });
      const fieldValues = Array.from(document.querySelectorAll('input')).filter(isVisible).map((input) => {
        const label = input.id ? document.querySelector('label[for="' + CSS.escape(input.id) + '"]') : null;
        const field = input.closest('[class*="fui-Field"]') || input.parentElement;
        return {
          label: label?.textContent || '',
          type: input instanceof HTMLInputElement ? input.type : '',
          value: input instanceof HTMLInputElement ? input.value : '',
          checked: input instanceof HTMLInputElement ? input.checked : undefined,
          text: field?.innerText || '',
        };
      });
      const pageText = document.body?.innerText || '';
      if (!button) {
        return { found: false, text: pageText, pageText, invalidFields, fieldValues };
      }

      const disabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
      return { found: true, disabled, text: button.textContent || '', pageText, invalidFields, fieldValues };
    })()`
  );
}

export async function getPageText(cdp: CdpEvaluator, contextId: number): Promise<string> {
  return cdp.evaluate<string>(contextId, 'document.body?.innerText || ""').catch((error) => String(error));
}

export function getLabels(labels: FieldLabels): string[] {
  return Array.isArray(labels) ? labels : [labels];
}

async function getVisibleDropdownOptions(cdp: CdpEvaluator, contextId: number): Promise<string[]> {
  return cdp.evaluate<string[]>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      return Array.from(document.querySelectorAll('[role="option"]')).filter(isVisible).map((option) => normalize(option.textContent));
    })()`
  );
}

async function waitForDropdownOptions(cdp: CdpEvaluator, contextId: number): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await hasDropdownOptions(cdp, contextId)) {
      return;
    }

    await delay(100);
  }

  const pageText = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting for dropdown options. Text: ${pageText}`);
}

async function waitForRadioOptionChecked(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await cdp.evaluate<{ checked: boolean; text?: string }>(
      contextId,
      `(() => {
        const expected = ${JSON.stringify(labelText)};
        const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
        const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
        const label = Array.from(document.querySelectorAll('label, span, div'))
          .filter(isVisible)
          .filter((candidate) => {
            const text = normalize(candidate.textContent);
            return text.length > 0 && text.length < 180 && text.includes(expected);
          })
          .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
        const radioRoot = label?.closest('[role="radio"], .fui-Radio') || label;
        const input = radioRoot?.querySelector('input[type="radio"]');
        return { checked: input instanceof HTMLInputElement ? input.checked : false, text: radioRoot?.outerHTML || document.body?.innerText || '' };
      })()`
    );
    if (result.checked) {
      return;
    }

    await delay(100);
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected radio option "${labelText}" to be checked. State: ${JSON.stringify(result)}`);
}

async function waitForDropdownValue(cdp: CdpEvaluator, contextId: number, labelText: string, optionText: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await isDropdownValueSelected(cdp, contextId, labelText, optionText)) {
      return;
    }

    await delay(100);
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected dropdown "${labelText}" to select "${optionText}". State: ${JSON.stringify(result)}`);
}

async function waitForFieldValue(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels,
  expectedValue: string
): Promise<{ ok: boolean; value?: string; fieldText?: string; pageText?: string }> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels);
    if (result.value === expectedValue) {
      return result;
    }

    await delay(100);
  }

  return getFieldState(cdp, contextId, labels);
}

async function replaceFocusedInputText(cdp: CdpEvaluator, value: string): Promise<void> {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
    modifiers: 2,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: 2,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: 2,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Backspace',
    code: 'Backspace',
    windowsVirtualKeyCode: 8,
    nativeVirtualKeyCode: 8,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Backspace',
    code: 'Backspace',
    windowsVirtualKeyCode: 8,
    nativeVirtualKeyCode: 8,
  });

  if (value) {
    await cdp.send('Input.insertText', { text: value });
  }
}

async function dispatchRadioClickFallback(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  await cdp.evaluate(
    contextId,
    `(() => {
      const expected = ${JSON.stringify(labelText)};
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent);
          return text.length > 0 && text.length < 180 && text.includes(expected);
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const radioRoot = label?.closest('[role="radio"], .fui-Radio') || label;
      const input = radioRoot?.querySelector('input[type="radio"]');
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      input.focus();
      input.click();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`
  );
}

async function getDropdownClickPoint(
  cdp: CdpEvaluator,
  contextId: number,
  labelText: string
): Promise<{ ok: boolean; reason?: string; text?: string; point?: Point }> {
  return cdp.evaluate<{ ok: boolean; reason?: string; text?: string; point?: Point }>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent).toLowerCase();
          return text.length > 0 && text.length < 160 && text.includes(${JSON.stringify(labelText.toLowerCase())});
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      if (!label) {
        return { ok: false, reason: 'Dropdown label not found', text: document.body?.innerText || '' };
      }
      const dropdownId = label?.getAttribute('for');
      const field = label?.closest('[class*="fui-Field"]') || label?.parentElement;
      const dropdown = (dropdownId ? document.getElementById(dropdownId) : null) || field?.querySelector('button[role="combobox"]');
      if (!(dropdown instanceof HTMLButtonElement)) {
        return { ok: false, reason: 'Dropdown button not found', text: document.body?.innerText || '' };
      }

      dropdown.scrollIntoView({ block: 'center', inline: 'center' });
      dropdown.focus();
      const rect = dropdown.getBoundingClientRect();
      return {
        ok: true,
        text: document.body?.innerText || '',
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      };
    })()`
  );
}

async function dispatchDropdownClickFallback(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  await cdp.evaluate(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent).toLowerCase();
          return text.length > 0 && text.length < 160 && text.includes(${JSON.stringify(labelText.toLowerCase())});
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const dropdownId = label?.getAttribute('for');
      const field = label?.closest('[class*="fui-Field"]') || label?.parentElement;
      const dropdown = (dropdownId ? document.getElementById(dropdownId) : null) || field?.querySelector('button[role="combobox"]');
      if (!(dropdown instanceof HTMLButtonElement)) {
        return;
      }

      dropdown.focus();
      dropdown.click();
    })()`
  );
}

function withField(labels: FieldLabels, action: string): string {
  return `(() => {
      const labelsToFind = ${JSON.stringify(getLabels(labels))};
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const visibleInputs = Array.from(document.querySelectorAll('input')).filter(isVisible);
      const inputByAttribute = visibleInputs
        .filter((candidate) => {
          const searchableText = [
            candidate.getAttribute('aria-label'),
            candidate.getAttribute('placeholder'),
            candidate.getAttribute('name'),
            candidate.id,
          ].map(normalize).join(' ').toLowerCase();
          return labelsToFind.some((expected) => searchableText.includes(expected.toLowerCase()));
        })
        .sort((a, b) => normalize(a.getAttribute('placeholder') || a.getAttribute('aria-label') || a.id).length - normalize(b.getAttribute('placeholder') || b.getAttribute('aria-label') || b.id).length)[0];
      const visibleTextElements = Array.from(document.querySelectorAll('label, span, div, p'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent);
          return text.length > 0 && text.length < 160;
        });
      const exactLabel = visibleTextElements
        .filter((candidate) => labelsToFind.some((expected) => normalize(candidate.textContent).toLowerCase() === expected.toLowerCase()))
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const partialLabel = visibleTextElements
        .filter((candidate) =>
          labelsToFind.some((expected) => normalize(candidate.textContent).toLowerCase().includes(expected.toLowerCase()))
        )
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const label = exactLabel || partialLabel;
      if (!label && !inputByAttribute) {
        return { ok: false, reason: 'Field label not found', text: document.body?.innerText || '' };
      }

      const inputId = label?.getAttribute('for');
      const fieldRoot = label?.closest('[class*="fui-Field"]') || label?.parentElement?.parentElement || label?.parentElement;
      const labelRect = label?.getBoundingClientRect();
      const nearestInput = labelRect
        ? visibleInputs
            .map((candidate) => ({ candidate, rect: candidate.getBoundingClientRect() }))
            .filter(({ rect }) => rect.bottom >= labelRect.top - 5)
            .sort((a, b) => {
              const scoreA = a.rect.top >= labelRect.bottom - 5 ? a.rect.top - labelRect.bottom : 0;
              const scoreB = b.rect.top >= labelRect.bottom - 5 ? b.rect.top - labelRect.bottom : 0;
              return scoreA - scoreB || a.rect.top - b.rect.top;
            })[0]?.candidate
        : undefined;
      const fieldInputs = fieldRoot ? Array.from(fieldRoot.querySelectorAll('input')).filter(isVisible) : [];
      const fieldInput =
        fieldInputs.length === 1
          ? fieldInputs[0]
          : labelRect
            ? fieldInputs
                .map((candidate) => ({ candidate, rect: candidate.getBoundingClientRect() }))
                .filter(({ rect }) => rect.bottom >= labelRect.top - 5)
                .sort((a, b) => {
                  const scoreA = a.rect.top >= labelRect.bottom - 5 ? a.rect.top - labelRect.bottom : 0;
                  const scoreB = b.rect.top >= labelRect.bottom - 5 ? b.rect.top - labelRect.bottom : 0;
                  return scoreA - scoreB || a.rect.top - b.rect.top;
                })[0]?.candidate
            : undefined;
      const input = inputByAttribute || (inputId ? document.getElementById(inputId) : null) || fieldInput || nearestInput;
      if (!(input instanceof HTMLInputElement)) {
        return { ok: false, reason: 'Field input not found', text: document.body?.innerText || '', labelHtml: label?.outerHTML };
      }

      const field = input.closest('[class*="fui-Field"]') || input.parentElement;
      const getValidationText = (inputElement, fieldElement) => {
        const describedBy = inputElement.getAttribute('aria-describedby');
        const describedText = describedBy
          ? describedBy
              .split(/\\s+/)
              .map((id) => document.getElementById(id)?.innerText || '')
              .filter(Boolean)
              .join('\\n')
          : '';
        return [describedText, fieldElement?.innerText || ''].filter(Boolean).join('\\n');
      };
      const setInputValue = (inputElement, value) => {
        inputElement.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(inputElement, value);
        inputElement.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: value ? 'insertText' : 'deleteContentBackward', data: value }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        inputElement.blur();
      };

      ${action}
    })()`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
