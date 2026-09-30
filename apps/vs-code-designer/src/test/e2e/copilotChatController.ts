import type { CopilotChatWorkbenchState } from './copilotChatState';

export interface CopilotChatCloseHost {
  closeEditorTabs(): Promise<void>;
  executeCommand(command: string): Promise<void>;
  readState(timeoutMs: number): Promise<CopilotChatWorkbenchState>;
  sleep(ms: number): Promise<void>;
  log(message: string): void;
  now(): number;
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
