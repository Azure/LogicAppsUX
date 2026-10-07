import * as assert from 'assert';
import { clickPoint, pressKey, type CdpEvaluator, type Point } from './cdpFormHelpers';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const logicAppsStandardOutputLabel = 'Azure Logic Apps (Standard)';
const outputCommandPrefix = `workbench.action.output.show.extension-output-${logicAppsExtensionId}-#`;
const outputCommandSuffixes = [`-${logicAppsStandardOutputLabel}`, '-Azure-Logic-Apps-Standard-log'];
const toggleOutputCommand = 'workbench.action.output.toggleOutput';

export function findLogicAppsStandardOutputCommand(commands: readonly string[]): string | undefined {
  const matches = commands.filter(
    (command) => command.startsWith(outputCommandPrefix) && outputCommandSuffixes.some((suffix) => command.endsWith(suffix))
  );
  if (matches.length > 1) {
    throw new Error(`Ambiguous ${logicAppsStandardOutputLabel} output commands: ${matches.join(', ')}`);
  }
  return matches[0];
}

export async function showLogicAppsStandardOutput(
  getCommands: () => Thenable<string[]>,
  executeCommand: (command: string, ...args: unknown[]) => Thenable<unknown>,
  deadline: number,
  selectThroughWorkbench?: () => Promise<boolean>
): Promise<string> {
  let outputOpened = false;
  let workbenchSelectionAttempted = false;
  while (Date.now() < deadline) {
    const commands = await getCommands();
    const exactCommand = findLogicAppsStandardOutputCommand(commands);
    if (exactCommand) {
      await executeCommand(exactCommand);
      return exactCommand;
    }
    if (!outputOpened && commands.includes(toggleOutputCommand)) {
      await executeCommand(toggleOutputCommand);
      outputOpened = true;
      continue;
    }
    if (outputOpened && selectThroughWorkbench && !workbenchSelectionAttempted) {
      workbenchSelectionAttempted = true;
      if (await selectThroughWorkbench()) {
        return `workbench UI channel "${logicAppsStandardOutputLabel}"`;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const candidates = (await getCommands()).filter((command) => command.includes('workbench.action.output.show')).sort();
  throw new Error(
    `${logicAppsStandardOutputLabel} output command was not registered before the startup diagnostic deadline. Candidates: ${candidates.join(', ')}`
  );
}

export async function selectLogicAppsStandardOutputThroughWorkbench(cdp: CdpEvaluator, deadline: number): Promise<boolean> {
  const remaining = () => {
    const value = deadline - Date.now();
    assert.ok(value > 0, `${logicAppsStandardOutputLabel} Output UI selection deadline expired`);
    return value;
  };
  const trigger = await pollWorkbenchOutputState(cdp, deadline, (state) => state.trigger);
  if (!trigger.trigger) {
    return false;
  }
  await clickPoint(cdp, trigger.trigger.point);
  if (trigger.trigger.kind === 'select') {
    await pressKey(cdp, 'Home', undefined, 36);
    for (let index = 0; index < trigger.trigger.optionIndex; index++) {
      await pressKey(cdp, 'ArrowDown', undefined, 40);
    }
    await pressKey(cdp, 'Enter', undefined, 13);
  } else {
    const option = await pollWorkbenchOutputState(cdp, deadline, (state) => state.option);
    assert.ok(option.option, `${logicAppsStandardOutputLabel} was not exposed by the Output channel picker`);
    await clickPoint(cdp, option.option);
  }
  const selected = await pollWorkbenchOutputState(cdp, deadline, (state) => state.selected);
  assert.strictEqual(selected.selected, true, `${logicAppsStandardOutputLabel} was not selected in the Output panel`);
  remaining();
  return true;
}

interface WorkbenchOutputState {
  trigger?: { kind: 'select' | 'picker'; point: Point; optionIndex: number };
  option?: Point;
  selected: boolean;
}

async function pollWorkbenchOutputState<T>(
  cdp: CdpEvaluator,
  deadline: number,
  select: (state: WorkbenchOutputState) => T | undefined
): Promise<WorkbenchOutputState> {
  while (Date.now() < deadline) {
    const state = await readWorkbenchOutputState(cdp, Math.min(3000, deadline - Date.now()));
    if (select(state)) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return readWorkbenchOutputState(cdp, 1000);
}

function readWorkbenchOutputState(cdp: CdpEvaluator, timeoutMs: number): Promise<WorkbenchOutputState> {
  return cdp.evaluate(
    undefined,
    `(() => {
      const expected = ${JSON.stringify(logicAppsStandardOutputLabel)};
      const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
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
      const selects = Array.from(document.querySelectorAll('select')).filter(visible);
      for (const select of selects) {
        const options = Array.from(select.options);
        const optionIndex = options.findIndex((option) => normalize(option.textContent) === expected);
        if (optionIndex >= 0) {
          const point = pointFor(select);
          return {
            trigger: point ? { kind: 'select', point, optionIndex } : undefined,
            selected: normalize(select.selectedOptions[0]?.textContent) === expected,
          };
        }
      }
      const selected = Array.from(document.querySelectorAll(
        '.panel .action-label, .panel [role="button"], .panel .monaco-select-box, .panel select'
      )).filter(visible).some((element) => normalize(element.textContent) === expected || normalize(element.getAttribute('aria-label')) === expected);
      const optionElement = Array.from(document.querySelectorAll(
        '.context-view [role="menuitem"], .context-view [role="option"], .context-view .monaco-list-row'
      )).filter(visible).find((element) => normalize(element.textContent) === expected);
      const picker = Array.from(document.querySelectorAll(
        '.panel .title-actions .monaco-select-box, .panel .title-actions .select-container, ' +
        '.panel .pane-header .monaco-select-box, .panel .pane-header .select-container'
      )).filter(visible).find((element) => {
        const text = normalize(element.textContent);
        const aria = normalize(element.getAttribute('aria-label')).toLowerCase();
        return aria.includes('output channel') || (/^[^\\n]{1,80}$/.test(text) && text.length > 0);
      });
      const pickerPoint = picker ? pointFor(picker) : undefined;
      return {
        trigger: pickerPoint ? { kind: 'picker', point: pickerPoint, optionIndex: -1 } : undefined,
        option: optionElement ? pointFor(optionElement) : undefined,
        selected,
      };
    })()`,
    { timeoutMs }
  );
}
