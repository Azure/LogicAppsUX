import { getFuncDiagnosticProducer, type DiagnosticSpan } from '../../../../scripts/e2e-cli-diagnostics';
import type * as vscode from 'vscode';

// Test-only adapter: state is captured synchronously at the owning operation,
// never retained as a live task/map reference. Secondary failures cannot escape.
const identities = new WeakMap<object, number>();
let nextIdentity = 0;
function identity(value: object): number {
  let id = identities.get(value);
  if (!id) {
    id = ++nextIdentity;
    identities.set(value, id);
  }
  return id;
}

export function funcTaskState(task: vscode.Task, execution?: vscode.TaskExecution): Record<string, unknown> {
  const shell = task.execution as vscode.ShellExecution | undefined;
  const command = shell?.command?.toString() || '';
  const placeholder = /\$\{config:azureLogicAppsStandard\.funcCoreToolsBinaryPath\}/;
  const scope = task.scope;
  return {
    taskId: identity(task),
    executionId: execution ? identity(execution) : undefined,
    name: task.name,
    type: task.definition.type,
    workspace: typeof scope === 'object' ? scope.uri.fsPath : undefined,
    scopePresent: scope !== undefined,
    shell: task.definition.type === 'shell',
    commandPresent: Boolean(command),
    commandPlaceholder: placeholder.test(command),
    // This flag proves absolute command shape, not executable identity/existence.
    commandPhysical: /^(?:[a-z]:[\\/]|\/|\\\\)/i.test(command.replace(/^["']/, '')),
    commandLinePlaceholder: placeholder.test(shell?.commandLine || ''),
    definitionCommandPlaceholder: typeof task.definition.command === 'string' && placeholder.test(task.definition.command),
    commandStructured: typeof shell?.command === 'object' && shell.command !== null,
  };
}

export function emitFuncDiagnostic(channel: 'events' | 'startup', operation: string, state: () => unknown): void {
  try {
    getFuncDiagnosticProducer(channel)?.emit(operation, 'sample', { state: state() });
  } catch {
    // Diagnostics are never a product gate.
  }
}

export function startFuncDiagnostic(operation: string, state: () => unknown): DiagnosticSpan | undefined {
  try {
    return getFuncDiagnosticProducer('startup')?.start(operation, state());
  } catch {
    return undefined;
  }
}

export function finishFuncDiagnostic(
  span: DiagnosticSpan | undefined,
  status: 'end' | 'failure',
  state: () => unknown,
  error?: unknown
): void {
  try {
    if (span) {
      if (status === 'failure') {
        span.fail(error, state());
      } else {
        span.end(state());
      }
    }
  } catch {
    // Preserve the owner's exact result/error even if snapshotting fails.
  }
}
