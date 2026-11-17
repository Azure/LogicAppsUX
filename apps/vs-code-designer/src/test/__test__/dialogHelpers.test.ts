import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Key, type WebDriver } from 'vscode-extension-tester';
import { focusModalPrimaryButton, pushDialogButtonWithRetry } from '../ui/helpers';
import { confirmVSCodeRegenerationIfVisible, waitForExactNugetDebugFiles } from '../ui/nugetDebugConversionHelpers';

const modal = vi.hoisted(() => ({
  getButtons: vi.fn(),
  wait: vi.fn(),
}));

vi.mock('vscode-extension-tester', () => ({
  By: { css: (selector: string) => selector },
  Key: { ENTER: 'Enter', TAB: 'Tab' },
  ModalDialog: class {
    getButtons = modal.getButtons;
    wait = modal.wait;
  },
  until: { elementIsVisible: (element: unknown) => element },
}));

const REGENERATION_PROMPT = 'The .vscode configuration files will be regenerated to match the current project settings';
let dom: JSDOM;

function makeVisible(element: HTMLElement): void {
  Object.defineProperty(element, 'getClientRects', { configurable: true, value: () => [{}] });
}

function createDialog(message: string, labels: string[], options?: { hidden?: boolean; nativeButtons?: boolean }) {
  const dialog = document.createElement('div');
  dialog.className = 'monaco-dialog-box';
  dialog.style.display = options?.hidden ? 'none' : 'block';
  makeVisible(dialog);

  const text = document.createElement('div');
  text.textContent = message;
  dialog.append(text);

  const buttons = labels.map((label) => {
    const element = document.createElement(options?.nativeButtons ? 'button' : 'a');
    element.className = 'monaco-button monaco-text-button';
    element.textContent = label;
    element.tabIndex = 0;
    makeVisible(element);
    dialog.append(element);
    return element;
  });
  document.body.append(dialog);
  return { dialog, buttons };
}

function createDriver() {
  const handles = new Map<HTMLElement, ReturnType<typeof createHandle>>();

  function createHandle(element: HTMLElement) {
    return {
      getText: vi.fn(async () => element.textContent || ''),
      click: vi.fn(async () => element.click()),
      sendKeys: vi.fn(async (key: string) => {
        if (!element.isConnected) {
          throw new Error('stale element');
        }
        if (key === Key.ENTER) {
          element.click();
        }
      }),
    };
  }

  function handle(element: HTMLElement) {
    let result = handles.get(element);
    if (!result) {
      result = createHandle(element);
      handles.set(element, result);
    }
    return result;
  }

  const defaultContent = vi.fn().mockResolvedValue(undefined);
  const driver = {
    executeScript: vi.fn(async (script: (...args: any[]) => unknown, ...args: unknown[]) => {
      const result = script(...args);
      return result instanceof HTMLElement ? handle(result) : result;
    }),
    switchTo: vi.fn(() => ({ defaultContent })),
    wait: vi.fn().mockResolvedValue(undefined),
    actions: vi.fn(),
  };
  return { driver: driver as unknown as WebDriver, mock: driver, defaultContent, handle };
}

beforeEach(() => {
  dom = new JSDOM('<!doctype html><body></body>');
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
  vi.stubGlobal('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  vi.clearAllMocks();
  vi.useFakeTimers();
  modal.wait.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  dom.window.close();
  vi.unstubAllGlobals();
});

describe('pushDialogButtonWithRetry', () => {
  it.each(['invalid session id', 'unexpected script failure'])('propagates modal focus errors: %s', async (message) => {
    const { driver, mock } = createDriver();
    const error = new Error(message);
    mock.executeScript.mockRejectedValueOnce(error);

    await expect(focusModalPrimaryButton(driver, 'Yes')).rejects.toBe(error);
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('rejects a missing modal without sending any keys', async () => {
    const { driver, mock } = createDriver();
    modal.getButtons.mockRejectedValue(new Error('No such element: .monaco-dialog-box'));

    expect(await focusModalPrimaryButton(driver, 'Yes')).toBe(false);
    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    const assertion = expect(result).rejects.toThrow('No such element: .monaco-dialog-box');
    await vi.runAllTimersAsync();
    await assertion;
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('propagates a session ending during modal focus', async () => {
    const { driver, mock } = createDriver();
    mock.executeScript.mockRejectedValue(new Error('invalid session id'));

    await expect(pushDialogButtonWithRetry(driver, 'Yes', 1)).rejects.toThrow('invalid session id');
    expect(modal.getButtons).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it.each(['invalid session id', 'unexpected modal wait failure'])('propagates modal wait errors: %s', async (message) => {
    const { driver, mock } = createDriver();
    const error = new Error(message);
    modal.wait.mockRejectedValueOnce(error);

    await expect(pushDialogButtonWithRetry(driver, 'Yes', 1)).rejects.toBe(error);
    expect(mock.executeScript).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('continues after an expected modal visibility timeout', async () => {
    const { buttons } = createDialog('Expected prompt', ['Yes']);
    const { driver, handle } = createDriver();
    const yes = handle(buttons[0]);
    const timeout = new Error('dialog not visible yet');
    timeout.name = 'TimeoutError';
    modal.wait.mockRejectedValueOnce(timeout);
    modal.getButtons.mockResolvedValue([yes]);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
    expect(yes.click).toHaveBeenCalledOnce();
  });

  it('does not recover from an unexpected focus error by clicking a button', async () => {
    const { buttons } = createDialog('Expected prompt', ['Yes']);
    const { driver, mock, handle } = createDriver();
    const yes = handle(buttons[0]);
    const error = new Error('unexpected script failure');
    mock.executeScript.mockRejectedValueOnce(error);
    modal.getButtons.mockResolvedValue([yes]);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    const assertion = expect(result).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await assertion;
    expect(yes.click).not.toHaveBeenCalled();
    expect(yes.sendKeys).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('propagates an unexpected focus error during the keyboard fallback', async () => {
    const { buttons } = createDialog('Expected prompt', ['Yes']);
    const { driver, mock, handle } = createDriver();
    const yes = handle(buttons[0]);
    const error = new Error('unexpected fallback script failure');
    yes.click.mockRejectedValueOnce(new Error('click intercepted'));
    modal.getButtons.mockResolvedValue([yes]);
    mock.executeScript.mockImplementationOnce(async () => yes).mockRejectedValueOnce(error);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    const assertion = expect(result).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await assertion;
    expect(yes.sendKeys).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('rejects a missing named button instead of treating a no-op as a click', async () => {
    const { buttons } = createDialog('A different prompt', ['No']);
    const { driver, mock, handle } = createDriver();
    const no = handle(buttons[0]);
    modal.getButtons.mockResolvedValue([no]);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    const assertion = expect(result).rejects.toThrow('Modal dialog does not contain button "Yes"');
    await vi.runAllTimersAsync();
    await assertion;
    expect(no.click).not.toHaveBeenCalled();
    expect(no.sendKeys).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('clicks the requested button when the modal is visible', async () => {
    const { buttons } = createDialog('Expected prompt', ['Yes', 'No']);
    const { driver, mock, handle } = createDriver();
    const yes = handle(buttons[0]);
    const no = handle(buttons[1]);
    modal.getButtons.mockResolvedValue([yes, no]);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
    expect(yes.click).toHaveBeenCalledOnce();
    expect(no.click).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('targets Enter to the verified button if the direct click fails', async () => {
    const { buttons } = createDialog('Expected prompt', ['Yes', 'No']);
    const click = vi.fn();
    buttons[0].addEventListener('click', click);
    const { driver, mock, handle } = createDriver();
    const yes = handle(buttons[0]);
    const no = handle(buttons[1]);
    yes.click.mockRejectedValueOnce(new Error('click intercepted'));
    modal.getButtons.mockResolvedValue([yes, no]);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
    expect(yes.sendKeys).toHaveBeenCalledWith(Key.ENTER);
    expect(click).toHaveBeenCalledOnce();
    expect(no.sendKeys).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('does not send Enter when the matching button cannot be focused', async () => {
    const { buttons } = createDialog('Expected prompt', ['Yes']);
    vi.spyOn(buttons[0], 'focus').mockImplementation(() => undefined);
    const { driver, mock, handle } = createDriver();
    const yes = handle(buttons[0]);
    yes.click.mockRejectedValueOnce(new Error('click intercepted'));
    modal.getButtons.mockResolvedValue([yes]);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    const assertion = expect(result).rejects.toThrow('click intercepted');
    await vi.runAllTimersAsync();
    await assertion;
    expect(yes.sendKeys).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('does not send Enter elsewhere if the focused button disappears', async () => {
    const { buttons } = createDialog('Expected prompt', ['Yes']);
    const { driver, mock, handle } = createDriver();
    const yes = handle(buttons[0]);
    yes.click.mockRejectedValueOnce(new Error('click intercepted'));
    const unrelatedClick = vi.fn();
    yes.sendKeys.mockImplementationOnce(async () => {
      buttons[0].remove();
      const unrelated = createDialog('Unrelated question', ['Yes']);
      unrelated.buttons[0].addEventListener('click', unrelatedClick);
      throw new Error('stale element reference');
    });
    modal.getButtons.mockResolvedValue([yes]);

    const result = pushDialogButtonWithRetry(driver, 'Yes', 1);
    const assertion = expect(result).rejects.toThrow('stale element reference');
    await vi.runAllTimersAsync();
    await assertion;
    expect(unrelatedClick).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });
});

describe('optional .vscode regeneration', () => {
  it('does not confirm or send keys when no prompt exists', async () => {
    const { driver, mock } = createDriver();
    await expect(confirmVSCodeRegenerationIfVisible(driver)).resolves.toBe(false);
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it.each(['invalid session id', 'unexpected frame failure'])('propagates default-content errors: %s', async (message) => {
    const { driver, mock, defaultContent } = createDriver();
    const error = new Error(message);
    defaultContent.mockRejectedValueOnce(error);

    await expect(confirmVSCodeRegenerationIfVisible(driver)).rejects.toBe(error);
    expect(mock.executeScript).not.toHaveBeenCalled();
  });

  it.each(['invalid session id', 'unexpected script failure'])('propagates prompt-check errors: %s', async (message) => {
    const { driver, mock } = createDriver();
    const error = new Error(message);
    mock.executeScript.mockRejectedValueOnce(error);

    await expect(confirmVSCodeRegenerationIfVisible(driver)).rejects.toBe(error);
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('does not accept matching files when the prompt check loses the driver session', async () => {
    const { driver, mock } = createDriver();
    const error = new Error('invalid session id');
    const assertFiles = vi.fn();
    mock.executeScript.mockRejectedValueOnce(error);

    await expect(waitForExactNugetDebugFiles(driver, assertFiles, 2000)).rejects.toBe(error);
    expect(assertFiles).not.toHaveBeenCalled();
  });

  it('ignores a hidden matching prompt and a visible unrelated Yes dialog', async () => {
    const hidden = createDialog(REGENERATION_PROMPT, ['Yes'], { hidden: true });
    const unrelated = createDialog('Delete another workspace?', ['Yes']);
    const hiddenClick = vi.fn();
    const unrelatedClick = vi.fn();
    hidden.buttons[0].addEventListener('click', hiddenClick);
    unrelated.buttons[0].addEventListener('click', unrelatedClick);
    const { driver, mock } = createDriver();

    await expect(confirmVSCodeRegenerationIfVisible(driver)).resolves.toBe(false);
    expect(hiddenClick).not.toHaveBeenCalled();
    expect(unrelatedClick).not.toHaveBeenCalled();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('does not confirm a transparent prompt or a disabled Yes button', async () => {
    const transparent = createDialog(REGENERATION_PROMPT, ['Yes']);
    transparent.dialog.style.opacity = '0';
    const disabled = createDialog(REGENERATION_PROMPT, ['Yes']);
    disabled.buttons[0].setAttribute('aria-disabled', 'true');
    const transparentClick = vi.fn();
    const disabledClick = vi.fn();
    transparent.buttons[0].addEventListener('click', transparentClick);
    disabled.buttons[0].addEventListener('click', disabledClick);
    const { driver } = createDriver();

    await expect(confirmVSCodeRegenerationIfVisible(driver)).resolves.toBe(false);
    expect(transparentClick).not.toHaveBeenCalled();
    expect(disabledClick).not.toHaveBeenCalled();
  });

  it.each([false, true])('confirms the matching visible prompt with nativeButtons=%s', async (nativeButtons) => {
    const { buttons } = createDialog(REGENERATION_PROMPT, ['Yes', 'Cancel'], { nativeButtons });
    const click = vi.fn();
    buttons[0].addEventListener('click', click);
    const { driver } = createDriver();

    await expect(confirmVSCodeRegenerationIfVisible(driver)).resolves.toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it('does not use a Yes button from a nested unrelated dialog', async () => {
    const outer = createDialog(REGENERATION_PROMPT, []);
    const nested = createDialog('Unrelated question', ['Yes']);
    outer.dialog.append(nested.dialog);
    const click = vi.fn();
    nested.buttons[0].addEventListener('click', click);
    const { driver } = createDriver();

    await expect(confirmVSCodeRegenerationIfVisible(driver)).resolves.toBe(false);
    expect(click).not.toHaveBeenCalled();
  });

  it('accepts completed exact files without ever requiring a prompt', async () => {
    const { driver, mock } = createDriver();
    const assertFiles = vi.fn();

    await expect(waitForExactNugetDebugFiles(driver, assertFiles, 2000)).resolves.toBeUndefined();
    expect(assertFiles).toHaveBeenCalledOnce();
    expect(mock.executeScript).toHaveBeenCalledOnce();
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('confirms a visible prompt even when the exact files already match', async () => {
    const { buttons } = createDialog(REGENERATION_PROMPT, ['Yes']);
    const click = vi.fn();
    buttons[0].addEventListener('click', click);
    const { driver } = createDriver();
    const assertFiles = vi.fn();

    await expect(waitForExactNugetDebugFiles(driver, assertFiles, 2000)).resolves.toBeUndefined();
    expect(click).toHaveBeenCalledOnce();
    expect(assertFiles).toHaveBeenCalledOnce();
  });

  it('keeps polling exact files when regeneration has no prompt', async () => {
    const { driver, mock } = createDriver();
    const assertFiles = vi.fn().mockImplementationOnce(() => {
      throw new Error('tasks.json not regenerated yet');
    });

    const result = waitForExactNugetDebugFiles(driver, assertFiles, 3000);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
    expect(assertFiles).toHaveBeenCalledTimes(2);
    expect(mock.executeScript).toHaveBeenCalledTimes(2);
    expect(mock.actions).not.toHaveBeenCalled();
  });

  it('checks exact files after confirming the matching prompt', async () => {
    const { buttons } = createDialog(REGENERATION_PROMPT, ['Yes']);
    let regenerated = false;
    buttons[0].addEventListener('click', () => {
      regenerated = true;
    });
    const { driver } = createDriver();
    const assertFiles = vi.fn(() => {
      if (!regenerated) {
        throw new Error('files not regenerated yet');
      }
    });

    const result = waitForExactNugetDebugFiles(driver, assertFiles, 3000);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
    expect(assertFiles).toHaveBeenCalledOnce();
    expect(regenerated).toBe(true);
  });

  it('fails with the exact-file assertion when files never become valid', async () => {
    const { driver } = createDriver();
    const assertFiles = vi.fn(() => {
      throw new Error('tasks.json mismatch');
    });

    const result = waitForExactNugetDebugFiles(driver, assertFiles, 2000);
    const assertion = expect(result).rejects.toThrow('Timed out waiting for exact converted NuGet .vscode files: tasks.json mismatch');
    await vi.runAllTimersAsync();
    await assertion;
    expect(assertFiles).toHaveBeenCalledTimes(2);
  });
});
