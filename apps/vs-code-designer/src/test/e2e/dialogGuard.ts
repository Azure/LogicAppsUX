import * as assert from 'assert';
import { createRequire } from 'module';
import * as path from 'path';
import * as vscode from 'vscode';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

type DialogMethodName = 'showErrorMessage' | 'showInformationMessage' | 'showWarningMessage';
type DialogMethod = (message: string, ...items: unknown[]) => Thenable<unknown>;
type AzExtUtilsModule = {
  registerOnActionStartHandler(handler: (context: IActionContext) => void): { dispose(): void };
};

interface DialogAttempt {
  method: DialogMethodName;
  message: string;
  items: string[];
}

interface DialogAllowance {
  message: RegExp;
  response: string;
}

interface DialogGuardState {
  installed: boolean;
  azExtInstalled: boolean;
  attempts: DialogAttempt[];
  allowances: DialogAllowance[];
}

const dialogMethods: DialogMethodName[] = ['showErrorMessage', 'showInformationMessage', 'showWarningMessage'];
const globalStateKey = '__logicAppsE2eDialogGuard';

export function installDialogGuard(): void {
  const state = getDialogGuardState();
  if (state.installed) {
    return;
  }

  const windowWithDialogs = vscode.window as unknown as Record<DialogMethodName, DialogMethod>;
  for (const method of dialogMethods) {
    windowWithDialogs[method] = (message: string, ...items: unknown[]): Thenable<unknown> => {
      const allowedResponse = findAllowedResponse(message, items);
      if (allowedResponse !== undefined) {
        return Promise.resolve(allowedResponse);
      }

      if (shouldIgnoreDialogAttempt(method, message)) {
        return Promise.resolve(undefined);
      }

      state.attempts.push({
        method,
        message,
        items: items.map(formatDialogItem),
      });
      console.error(`[activation-smoke] Unexpected VS Code dialog attempted through ${method}: ${message}`);
      return Promise.resolve(undefined);
    };
  }

  installAzExtActionContextGuard(state);
  state.installed = true;
}

export async function withAllowedDialogResponses<T>(allowances: DialogAllowance[], callback: () => Promise<T>): Promise<T> {
  const state = getDialogGuardState();
  state.allowances.push(...allowances);
  try {
    return await callback();
  } finally {
    state.allowances.splice(state.allowances.length - allowances.length, allowances.length);
  }
}

export async function assertNoDialogAttempts(context: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const attempts = getDialogGuardState().attempts;
  if (attempts.length === 0) {
    return;
  }

  assert.fail(
    [
      `Unexpected VS Code dialog attempt(s) during ${context}.`,
      'The @vscode/test-cli baseline should suppress activation prompts and surface setup warnings as test failures.',
      ...attempts.map(
        (attempt, index) =>
          `${index + 1}. ${attempt.method}: ${attempt.message}${attempt.items.length ? ` [${attempt.items.join(', ')}]` : ''}`
      ),
    ].join('\n')
  );
}

function getDialogGuardState(): DialogGuardState {
  const globalWithState = globalThis as unknown as Record<string, DialogGuardState | undefined>;
  globalWithState[globalStateKey] ??= {
    installed: false,
    azExtInstalled: false,
    attempts: [],
    allowances: [],
  };

  return globalWithState[globalStateKey];
}

function findAllowedResponse(message: string, items: unknown[]): unknown {
  const state = getDialogGuardState();
  for (let index = state.allowances.length - 1; index >= 0; index--) {
    const allowance = state.allowances[index];
    if (!allowance.message.test(message)) {
      continue;
    }

    return items.find((item) => formatDialogItem(item) === allowance.response);
  }

  return undefined;
}

function installAzExtActionContextGuard(state: DialogGuardState): void {
  if (state.azExtInstalled) {
    return;
  }

  const azExtUtils = getAzExtUtilsModule();
  if (!azExtUtils) {
    return;
  }

  azExtUtils.registerOnActionStartHandler((context) => {
    const ui = context.ui as unknown as Record<DialogMethodName, DialogMethod>;
    for (const method of dialogMethods) {
      ui[method] = (message: string, ...items: unknown[]): Thenable<unknown> => {
        const allowedResponse = findAllowedResponse(message, items);
        if (allowedResponse !== undefined) {
          return Promise.resolve(allowedResponse);
        }

        if (shouldIgnoreDialogAttempt(method, message)) {
          return Promise.resolve(undefined);
        }

        state.attempts.push({
          method,
          message,
          items: items.map(formatDialogItem),
        });
        return Promise.reject(new Error(`Unexpected azext-utils dialog attempted through ${method}: ${message}`));
      };
    }
  });

  state.azExtInstalled = true;
}

function shouldIgnoreDialogAttempt(method: DialogMethodName, message: string): boolean {
  return method === 'showErrorMessage' && /Error exists after running preLaunchTask "func: host start"/i.test(message);
}

function getAzExtUtilsModule(): AzExtUtilsModule | undefined {
  try {
    const extensionDistMainPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'main.js');
    const extensionRequire = createRequire(extensionDistMainPath);
    const azExtUtils = extensionRequire('@microsoft/vscode-azext-utils') as Partial<AzExtUtilsModule>;
    if (typeof azExtUtils.registerOnActionStartHandler === 'function') {
      return azExtUtils as AzExtUtilsModule;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function formatDialogItem(item: unknown): string {
  if (typeof item === 'string') {
    return item;
  }

  if (isMessageItem(item)) {
    return item.title;
  }

  if (typeof item === 'object' && item !== null && 'title' in item) {
    return String((item as { title: unknown }).title);
  }

  return String(item);
}

function isMessageItem(item: unknown): item is vscode.MessageItem {
  return typeof item === 'object' && item !== null && 'title' in item && typeof (item as { title: unknown }).title === 'string';
}
