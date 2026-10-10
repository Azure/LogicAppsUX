import * as assert from 'assert';
import * as vscode from 'vscode';
import { clickPoint, type CdpEvaluator, type Point } from './cdpFormHelpers';

const terminalTaskName = 'func: host start';
const terminalFocusFindCommand = 'workbench.action.terminal.focusFind';

interface TerminalSearchState {
  findInput?: Point;
  findValue: string;
  findWidgetText: string;
  terminalText: string;
  found: boolean;
}

export async function disposeStoppedFuncHostTerminals(deadline: number): Promise<void> {
  const activeTasks = vscode.tasks.taskExecutions.filter((execution) => execution.task.name.toLowerCase().includes(terminalTaskName));
  assert.strictEqual(
    activeTasks.length,
    0,
    `Refusing to dispose ${terminalTaskName} terminals while matching task executions remain active`
  );
  const terminals = vscode.window.terminals.filter((terminal) => terminal.name.toLowerCase().includes(terminalTaskName));
  for (const terminal of terminals) {
    terminal.dispose();
  }
  while (Date.now() < deadline) {
    if (!vscode.window.terminals.some((terminal) => terminal.name.toLowerCase().includes(terminalTaskName))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${terminalTaskName} terminal cleanup did not settle before the validation launch`);
}

export async function findTextInFuncHostTerminal(cdp: CdpEvaluator, expectedText: string, deadline: number): Promise<string> {
  const terminal = await waitForFuncHostTerminal(deadline);
  terminal.show(false);

  await pressControlShortcut(cdp, 'f', 'KeyF', 70);
  const chordDeadline = Math.min(deadline, Date.now() + 3000);
  let opened = await pollTerminalSearchState(cdp, expectedText, chordDeadline, (state) => state.findInput);
  if (!opened.findInput) {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(terminalFocusFindCommand), `${terminalFocusFindCommand} is not registered`);
    console.log(`[workbench-terminal] Ctrl+F was not routed through CDP; invoking ${terminalFocusFindCommand}`);
    await vscode.commands.executeCommand(terminalFocusFindCommand);
    opened = await pollTerminalSearchState(cdp, expectedText, deadline, (state) => state.findInput);
  }
  assert.ok(opened.findInput, `${terminalTaskName} terminal Find input did not open`);
  await clickPoint(cdp, opened.findInput);
  await replaceFocusedText(cdp, expectedText);

  const found = await pollTerminalSearchState(cdp, expectedText, deadline, (state) => state.findValue === expectedText && state.found);
  assert.ok(
    found.findValue === expectedText && found.found,
    [
      `${terminalTaskName} terminal did not reveal the expected validation text through Ctrl+F`,
      `Find value: ${JSON.stringify(found.findValue)}`,
      `Find widget: ${JSON.stringify(found.findWidgetText)}`,
      `Visible terminal tail: ${JSON.stringify(found.terminalText.slice(-4000))}`,
    ].join('\n')
  );
  return found.terminalText;
}

async function waitForFuncHostTerminal(deadline: number): Promise<vscode.Terminal> {
  while (Date.now() < deadline) {
    const matches = vscode.window.terminals.filter((terminal) => terminal.name.toLowerCase().includes(terminalTaskName));
    if (matches.length > 0) {
      return matches.at(-1) as vscode.Terminal;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `${terminalTaskName} terminal was not created before the validation deadline. Terminals: ${vscode.window.terminals
      .map((terminal) => terminal.name)
      .join(', ')}`
  );
}

async function pollTerminalSearchState<T>(
  cdp: CdpEvaluator,
  expectedText: string,
  deadline: number,
  accept: (state: TerminalSearchState) => T | undefined
): Promise<TerminalSearchState> {
  let lastState: TerminalSearchState = { findValue: '', findWidgetText: '', terminalText: '', found: false };
  while (Date.now() < deadline) {
    lastState = await readTerminalSearchState(cdp, expectedText, Math.min(3000, deadline - Date.now()));
    if (accept(lastState)) {
      return lastState;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return lastState;
}

function readTerminalSearchState(cdp: CdpEvaluator, expectedText: string, timeoutMs: number): Promise<TerminalSearchState> {
  return cdp.evaluate(
    undefined,
    `(() => {
      const expected = ${JSON.stringify(expectedText)};
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' &&
          rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
      };
      const pointFor = (element) => {
        if (!visible(element)) return undefined;
        const rect = element.getBoundingClientRect();
        const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const hit = document.elementFromPoint(point.x, point.y);
        return hit && (hit === element || element.contains(hit)) ? point : undefined;
      };
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const compact = (value) => normalize(value).replace(/\\s+/g, '');
      const terminals = Array.from(document.querySelectorAll('.terminal-wrapper, .integrated-terminal')).filter(visible);
      const terminal = terminals.at(-1);
      const terminalText = terminal
        ? Array.from(terminal.querySelectorAll('.xterm-rows, .xterm-accessibility-tree'))
            .filter(visible)
            .map((element) => element.textContent || '')
            .join('\\n')
        : '';
      const inputs = Array.from(document.querySelectorAll('.panel input')).filter(visible);
      const findInput = inputs.find((input) => {
        const container = input.closest('.terminal-find-widget, .simple-find-part, .find-widget');
        const identity = normalize(
          [input.getAttribute('aria-label'), input.getAttribute('placeholder'), container?.getAttribute('aria-label')].filter(Boolean).join(' ')
        ).toLowerCase();
        return !!container && identity.includes('find');
      });
      const findWidget = findInput?.closest('.terminal-find-widget, .simple-find-part, .find-widget');
      return {
        findInput: findInput ? pointFor(findInput) : undefined,
        findValue: findInput instanceof HTMLInputElement ? findInput.value : '',
        findWidgetText: normalize(findWidget?.textContent),
        terminalText: normalize(terminalText),
        found: findInput instanceof HTMLInputElement && findInput.value === expected &&
          compact(terminalText).includes(compact(expected)),
      };
    })()`,
    { timeoutMs }
  );
}

async function replaceFocusedText(cdp: CdpEvaluator, value: string): Promise<void> {
  await pressControlShortcut(cdp, 'a', 'KeyA', 65);
  await cdp.send('Input.insertText', { text: value });
}

async function pressControlShortcut(cdp: CdpEvaluator, key: string, code: string, virtualKeyCode: number): Promise<void> {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Control',
    code: 'ControlLeft',
    modifiers: 2,
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
  });
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      modifiers: 2,
      windowsVirtualKeyCode: virtualKeyCode,
      nativeVirtualKeyCode: virtualKeyCode,
    });
  }
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
  });
}
