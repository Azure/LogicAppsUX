import * as assert from 'assert';
import * as vscode from 'vscode';

type DialogMethodName = 'showErrorMessage' | 'showInformationMessage' | 'showWarningMessage';
type DialogMethod = (message: string, ...items: unknown[]) => Thenable<unknown>;

interface DialogAttempt {
  method: DialogMethodName;
  message: string;
  items: string[];
}

interface DialogGuardState {
  installed: boolean;
  attempts: DialogAttempt[];
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
    windowWithDialogs[method] = (message: string, ...items: unknown[]): Thenable<undefined> => {
      state.attempts.push({
        method,
        message,
        items: items.map(formatDialogItem),
      });
      console.error(`[activation-smoke] Unexpected VS Code dialog attempted through ${method}: ${message}`);
      return Promise.resolve(undefined);
    };
  }

  state.installed = true;
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
    attempts: [],
  };

  return globalWithState[globalStateKey];
}

function formatDialogItem(item: unknown): string {
  if (typeof item === 'string') {
    return item;
  }

  if (typeof item === 'object' && item !== null && 'title' in item) {
    return String((item as { title: unknown }).title);
  }

  return String(item);
}
