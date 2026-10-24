import * as assert from 'assert';
import * as vscode from 'vscode';
import { clickPoint, type CdpEvaluator, type Point } from './cdpFormHelpers';

const terminalTaskName = 'func: host start';
const terminalFocusFindCommand = 'workbench.action.terminal.focusFind';
const terminalFocusCommand = 'workbench.action.terminal.focus';
const terminalSelectAllCommand = 'workbench.action.terminal.selectAll';
const terminalCopySelectionCommand = 'workbench.action.terminal.copySelection';
const terminalClearSelectionCommand = 'workbench.action.terminal.clearSelection';
const toggleMaximizedPanelCommand = 'workbench.action.toggleMaximizedPanel';

interface TerminalSearchState {
  findInput?: Point;
  findValue: string;
  findWidgetText: string;
  terminalText: string;
  missingRequiredText: string[];
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
  console.log(
    `[workbench-terminal] stopped-host cleanup found ${terminals.length} matching terminal(s): ${JSON.stringify(
      terminals.map((terminal) => terminal.name)
    )}`
  );
  for (const terminal of terminals) {
    terminal.dispose();
  }
  while (Date.now() < deadline) {
    const remaining = vscode.window.terminals.filter((terminal) => terminal.name.toLowerCase().includes(terminalTaskName));
    if (remaining.length === 0) {
      console.log(`[workbench-terminal] stopped-host cleanup removed ${terminals.length} matching terminal handle(s)`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${terminalTaskName} terminal cleanup did not settle before the validation launch`);
}

export async function findTextInFuncHostTerminal(
  cdp: CdpEvaluator,
  searchText: string,
  requiredVisibleText: readonly string[],
  deadline: number
): Promise<string> {
  const terminal = await waitForFuncHostTerminal(deadline);
  terminal.show(false);
  const terminalBufferText = await waitForTerminalBufferText(terminal, requiredVisibleText, deadline);

  await pressControlShortcut(cdp, 'f', 'KeyF', 70);
  const chordDeadline = Math.min(deadline, Date.now() + 3000);
  let opened = await pollTerminalSearchState(cdp, searchText, requiredVisibleText, chordDeadline, (state) => state.findInput);
  if (!opened.findInput) {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(terminalFocusFindCommand), `${terminalFocusFindCommand} is not registered`);
    console.log(`[workbench-terminal] Ctrl+F was not routed through CDP; invoking ${terminalFocusFindCommand}`);
    await vscode.commands.executeCommand(terminalFocusFindCommand);
    opened = await pollTerminalSearchState(cdp, searchText, requiredVisibleText, deadline, (state) => state.findInput);
  }
  assert.ok(opened.findInput, `${terminalTaskName} terminal Find input did not open`);
  await clickPoint(cdp, opened.findInput);
  await replaceFocusedText(cdp, searchText);

  const found = await pollTerminalSearchState(
    cdp,
    searchText,
    requiredVisibleText,
    deadline,
    (state) => state.findValue === searchText && state.found
  );
  assert.ok(
    found.findValue === searchText && found.found,
    [
      `${terminalTaskName} terminal did not reveal the expected validation text through Ctrl+F`,
      `Find value: ${JSON.stringify(found.findValue)}`,
      `Find widget: ${JSON.stringify(found.findWidgetText)}`,
      `Missing required text: ${JSON.stringify(found.missingRequiredText)}`,
      `Visible terminal tail: ${JSON.stringify(found.terminalText.slice(-4000))}`,
      `Terminal buffer tail: ${JSON.stringify(terminalBufferText.slice(-4000))}`,
    ].join('\n')
  );
  return found.terminalText || terminalBufferText;
}

export async function prepareFuncHostTerminalEvidence(cdp: CdpEvaluator, deadline: number): Promise<void> {
  await vscode.commands.executeCommand('notifications.hideToasts');
  const panelState = async (): Promise<{ visible: boolean; maximized: boolean }> =>
    cdp.evaluate(
      undefined,
      `(() => {
        const panels = Array.from(document.querySelectorAll('[id="workbench.parts.panel"], .part.panel')).filter((element) => {
          if (!(element instanceof HTMLElement)) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        });
        const panel = panels.at(-1);
        const rect = panel?.getBoundingClientRect();
        return {
          visible: !!rect,
          maximized: !!rect && rect.height >= innerHeight * 0.65,
        };
      })()`,
      { timeoutMs: Math.min(3000, Math.max(1, deadline - Date.now())) }
    );
  const initial = await panelState();
  assert.ok(initial.visible, `${terminalTaskName} panel is not visible before evidence capture`);
  if (!initial.maximized) {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(toggleMaximizedPanelCommand), `${toggleMaximizedPanelCommand} is not registered`);
    await vscode.commands.executeCommand(toggleMaximizedPanelCommand);
  }
  while (Date.now() < deadline) {
    const state = await panelState();
    if (state.visible && state.maximized) {
      await vscode.commands.executeCommand('notifications.hideToasts');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${terminalTaskName} panel did not maximize before evidence capture`);
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

async function waitForTerminalBufferText(terminal: vscode.Terminal, requiredText: readonly string[], deadline: number): Promise<string> {
  const commands = await vscode.commands.getCommands(true);
  for (const command of [terminalFocusCommand, terminalSelectAllCommand, terminalCopySelectionCommand, terminalClearSelectionCommand]) {
    assert.ok(commands.includes(command), `${command} is not registered`);
  }
  const previousClipboard = await vscode.env.clipboard.readText();
  let lastBuffer = '';
  try {
    while (Date.now() < deadline) {
      terminal.show(false);
      await vscode.commands.executeCommand(terminalFocusCommand);
      await vscode.commands.executeCommand(terminalSelectAllCommand);
      await vscode.commands.executeCommand(terminalCopySelectionCommand);
      lastBuffer = await vscode.env.clipboard.readText();
      await vscode.commands.executeCommand(terminalClearSelectionCommand);
      const compactBuffer = compactText(lastBuffer);
      if (requiredText.every((value) => compactBuffer.includes(compactText(value)))) {
        return lastBuffer;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    await vscode.commands.executeCommand(terminalClearSelectionCommand);
    await vscode.env.clipboard.writeText(previousClipboard);
  }
  throw new Error(
    [
      `${terminalTaskName} terminal buffer did not contain the expected validation text`,
      `Missing required text: ${JSON.stringify(requiredText.filter((value) => !compactText(lastBuffer).includes(compactText(value))))}`,
      `Terminal buffer tail: ${JSON.stringify(lastBuffer.slice(-4000))}`,
    ].join('\n')
  );
}

function compactText(value: string): string {
  return value.replace(/\s+/g, '');
}

async function pollTerminalSearchState<T>(
  cdp: CdpEvaluator,
  searchText: string,
  requiredVisibleText: readonly string[],
  deadline: number,
  accept: (state: TerminalSearchState) => T | undefined
): Promise<TerminalSearchState> {
  let lastState: TerminalSearchState = {
    findValue: '',
    findWidgetText: '',
    terminalText: '',
    missingRequiredText: [...requiredVisibleText],
    found: false,
  };
  while (Date.now() < deadline) {
    lastState = await readTerminalSearchState(cdp, searchText, requiredVisibleText, Math.min(3000, deadline - Date.now()));
    if (accept(lastState)) {
      return lastState;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return lastState;
}

function readTerminalSearchState(
  cdp: CdpEvaluator,
  searchText: string,
  requiredVisibleText: readonly string[],
  timeoutMs: number
): Promise<TerminalSearchState> {
  return cdp.evaluate(
    undefined,
    `(() => {
      const searchText = ${JSON.stringify(searchText)};
      const requiredVisibleText = ${JSON.stringify(requiredVisibleText)};
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
      const terminalText = Array.from(document.querySelectorAll('.xterm-rows, .xterm-accessibility-tree'))
        .filter(visible)
        .map((element) => element.textContent || '')
        .join('\\n');
      const inputs = Array.from(document.querySelectorAll('.panel input')).filter(visible);
      const findInput = inputs.find((input) => {
        const container = input.closest('.terminal-find-widget, .simple-find-part, .find-widget');
        const identity = normalize(
          [input.getAttribute('aria-label'), input.getAttribute('placeholder'), container?.getAttribute('aria-label')].filter(Boolean).join(' ')
        ).toLowerCase();
        return !!container && identity.includes('find');
      });
      const findWidget = findInput?.closest('.terminal-find-widget, .simple-find-part, .find-widget');
      const findWidgetText = normalize(findWidget?.textContent);
      const missingRequiredText = requiredVisibleText.filter((value) => !compact(terminalText).includes(compact(value)));
      const terminalTextAvailable = compact(terminalText).length > 0;
      return {
        findInput: findInput ? pointFor(findInput) : undefined,
        findValue: findInput instanceof HTMLInputElement ? findInput.value : '',
        findWidgetText,
        terminalText: normalize(terminalText),
        missingRequiredText,
        found: findInput instanceof HTMLInputElement && findInput.value === searchText &&
          !/no results/i.test(findWidgetText) && (!terminalTextAvailable || missingRequiredText.length === 0),
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
