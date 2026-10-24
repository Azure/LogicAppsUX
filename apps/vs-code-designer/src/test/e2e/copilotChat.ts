import * as vscode from 'vscode';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';
import { closeCopilotChatIfVisibleWithAttachRetry } from './copilotChatController';
import { buildCopilotChatStateExpression, type CopilotChatWorkbenchState } from './copilotChatState';
import { getTabViewType } from './webviewTabs';

export async function closeCopilotChatIfVisible(
  stage: string,
  options: { timeoutMs?: number; absentSettleMs?: number } = {}
): Promise<void> {
  await closeCopilotChatIfVisibleWithAttachRetry(
    stage,
    {
      connect: (timeoutMs) => connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs }),
      createCloseHost: (cdp) => ({
        closeEditorTabs: () => closeCopilotChatEditorTabs(stage),
        executeCommand: async (command) => {
          await vscode.commands.executeCommand(command);
        },
        log: (message) => console.log(message),
        now: () => Date.now(),
        readState: (readTimeoutMs) => readCopilotChatState(cdp, readTimeoutMs),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      }),
      log: (message) => console.log(message),
      now: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
    options
  );
}

async function closeCopilotChatEditorTabs(stage: string): Promise<void> {
  const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs.filter(isCopilotChatEditorTab));
  if (tabs.length === 0) {
    return;
  }

  const closed = await vscode.window.tabGroups.close(tabs);
  if (!closed) {
    throw new Error(`[copilot-chat] ${stage}: failed to close Copilot Chat editor tab(s): ${tabs.map((tab) => tab.label).join(', ')}`);
  }
}

function isCopilotChatEditorTab(tab: vscode.Tab): boolean {
  if (!/^(github\s+)?copilot chat$/i.test(tab.label.trim())) {
    return false;
  }
  const viewType = getTabViewType(tab)?.toLowerCase() ?? '';
  const inputType = tab.input?.constructor?.name?.toLowerCase() ?? '';
  return viewType === 'github.copilot.chat' || viewType === 'github-copilot-chat' || inputType.includes('chat');
}

async function readCopilotChatState(
  cdp: { evaluate<T>(contextId: number | undefined, expression: string, options?: { timeoutMs?: number }): Promise<T> },
  timeoutMs: number
): Promise<CopilotChatWorkbenchState> {
  return cdp.evaluate<CopilotChatWorkbenchState>(undefined, buildCopilotChatStateExpression(), {
    timeoutMs,
  });
}
