import type { CopilotChatWorkbenchState } from './copilotChatState';

export interface CopilotChatCloseHost {
  closeEditorTabs(): Promise<void>;
  executeCommand(command: string): Promise<void>;
  readState(timeoutMs: number): Promise<CopilotChatWorkbenchState>;
  sleep(ms: number): Promise<void>;
  log(message: string): void;
  now(): number;
}

export interface CopilotChatCdpConnection {
  dispose(): void;
}

export interface CopilotChatAttachRetryHost<TCdp extends CopilotChatCdpConnection> {
  connect(timeoutMs: number): Promise<TCdp>;
  createCloseHost(cdp: TCdp): CopilotChatCloseHost;
  log(message: string): void;
  now(): number;
  sleep(ms: number): Promise<void>;
}

const maxCopilotChatAttachAttempts = 2;
const maxCopilotChatAttachBudgetMs = 5000;

export async function closeCopilotChatIfVisibleWithAttachRetry<TCdp extends CopilotChatCdpConnection>(
  stage: string,
  retryHost: CopilotChatAttachRetryHost<TCdp>,
  options: { timeoutMs?: number; absentSettleMs?: number } = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const deadline = retryHost.now() + timeoutMs;
  let lastAttachError: unknown;
  let attemptsMade = 0;

  for (let attempt = 1; attempt <= maxCopilotChatAttachAttempts; attempt++) {
    const attachTimeoutMs = getAttachTimeout(deadline, retryHost.now());
    if (attachTimeoutMs <= 0) {
      break;
    }

    attemptsMade++;
    let cdp: TCdp | undefined;
    try {
      cdp = await retryHost.connect(attachTimeoutMs);
      try {
        const cleanupTimeoutMs = getRemainingCleanupTimeout(deadline, retryHost.now());
        if (cleanupTimeoutMs <= 0) {
          throw new Error('Copilot Chat cleanup deadline expired after workbench CDP attach');
        }
        await closeCopilotChatIfVisibleCore(stage, retryHost.createCloseHost(cdp), {
          ...options,
          timeoutMs: cleanupTimeoutMs,
        });
      } finally {
        cdp.dispose();
      }
      return;
    } catch (error) {
      if (cdp) {
        throw error;
      }

      lastAttachError = error;
      if (attempt >= maxCopilotChatAttachAttempts || retryHost.now() >= deadline) {
        break;
      }

      const message = summarizeAttachError(error);
      retryHost.log(
        `[copilot-chat] ${stage}: workbench CDP attach attempt ${attempt}/${maxCopilotChatAttachAttempts} failed; retrying. Reason: ${message}`
      );
      const retryDelayMs = Math.min(250, deadline - retryHost.now());
      if (retryDelayMs <= 0) {
        break;
      }
      await retryHost.sleep(retryDelayMs);
    }
  }

  throw new Error(
    `[copilot-chat] ${stage}: failed to attach workbench CDP for optional cleanup after ${attemptsMade} ${
      attemptsMade === 1 ? 'attempt' : 'attempts'
    } (max ${maxCopilotChatAttachAttempts}). Last error: ${summarizeAttachError(lastAttachError)}`
  );
}

export async function closeCopilotChatIfVisibleCore(
  stage: string,
  host: CopilotChatCloseHost,
  options: { timeoutMs?: number; absentSettleMs?: number } = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const absentSettleMs = options.absentSettleMs ?? 0;
  const deadline = host.now() + timeoutMs;

  let state = await host.readState(getReadTimeout(deadline, host.now()));
  if (!state.visible) {
    const absentDeadline = Math.min(deadline, host.now() + absentSettleMs);
    while (host.now() < absentDeadline) {
      await host.sleep(Math.min(250, absentDeadline - host.now()));
      state = await host.readState(getReadTimeout(deadline, host.now()));
      if (state.visible) {
        break;
      }
    }
    if (!state.visible) {
      host.log(`[copilot-chat] ${stage}: no visible Copilot Chat surface`);
      return;
    }
  }

  let lastState = state;
  while (host.now() < deadline) {
    host.log(`[copilot-chat] ${stage}: closing visible Copilot Chat ${JSON.stringify(state).slice(0, 1000)}`);
    if (state.owners.some((owner) => owner.kind === 'editor')) {
      await host.closeEditorTabs();
    }
    const commands = getCopilotChatCloseCommands(state);
    if (commands.length === 0 && !state.owners.some((owner) => owner.kind === 'editor')) {
      break;
    }

    for (const command of commands) {
      try {
        await host.executeCommand(command);
      } catch (error) {
        throw new Error(
          `[copilot-chat] ${stage}: failed to execute ${command} while closing visible Copilot Chat. State: ${JSON.stringify(state).slice(
            0,
            1000
          )}. Cause: ${String(error)}`
        );
      }
    }

    await host.sleep(250);
    state = await host.readState(getReadTimeout(deadline, host.now()));
    lastState = state;
    if (!state.visible) {
      host.log(`[copilot-chat] ${stage}: Copilot Chat closed`);
      return;
    }
  }

  throw new Error(
    `[copilot-chat] ${stage}: visible Copilot Chat could not be closed. Last state: ${JSON.stringify(lastState).slice(0, 1200)}`
  );
}

export function getCopilotChatCloseCommands(state: CopilotChatWorkbenchState): string[] {
  const commands = new Set<string>();
  for (const owner of state.owners) {
    if (owner.unrelatedVisibleCount > 0) {
      continue;
    }
    if (owner.kind === 'auxiliarybar') {
      commands.add('workbench.action.closeAuxiliaryBar');
    } else if (owner.kind === 'sidebar') {
      commands.add('workbench.action.closeSidebar');
    } else if (owner.kind === 'panel') {
      commands.add('workbench.action.closePanel');
    }
  }
  return [...commands];
}

function getReadTimeout(deadline: number, now: number): number {
  return Math.max(250, Math.min(1500, deadline - now));
}

function getAttachTimeout(deadline: number, now: number): number {
  return Math.min(maxCopilotChatAttachBudgetMs, deadline - now);
}

function getRemainingCleanupTimeout(deadline: number, now: number): number {
  return deadline - now;
}

function summarizeAttachError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const normalized = raw.toLowerCase();

  if (normalized.includes('cdp websocket handshake')) {
    return 'cdp-websocket-handshake-timeout';
  }
  if (normalized.includes('websocket upgrade failed')) {
    return 'cdp-websocket-upgrade-failed';
  }
  if (normalized.includes('unable to find vs code workbench cdp target') || normalized.includes('targets:')) {
    return 'workbench-target-discovery-failed';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('fetch aborted') || normalized.includes('body aborted')) {
    return 'workbench-target-fetch-failed';
  }
  if (normalized.includes('deadline exceeded')) {
    return 'deadline-exceeded';
  }
  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return 'timeout';
  }
  if (normalized.includes('socket')) {
    return 'socket-connect-failed';
  }
  if (normalized.includes('abort')) {
    return 'aborted';
  }

  return error instanceof Error && error.name ? `error:${error.name}` : 'unknown-error';
}
