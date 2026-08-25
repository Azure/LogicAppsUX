import * as assert from 'assert';
import * as vscode from 'vscode';

export function getWebviewTabs(viewType: string): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) =>
    group.tabs.filter((tab) => {
      return getTabViewType(tab) === `mainThreadWebview-${viewType}`;
    })
  );
}

export function getTabViewType(tab: vscode.Tab): string | undefined {
  const input = tab.input as { viewType?: unknown };
  return typeof input.viewType === 'string' ? input.viewType : undefined;
}

export async function waitForWebviewTab(viewType: string, previousCount: number, timeoutMs = 10000): Promise<vscode.Tab> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const tabs = getWebviewTabs(viewType);
    if (tabs.length > previousCount) {
      return tabs[tabs.length - 1];
    }

    if (tabs.length > 0 && previousCount === 0) {
      return tabs[tabs.length - 1];
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  assert.fail(`Timed out waiting for ${viewType} webview tab to open. Open tabs: ${describeOpenTabs()}`);
}

export async function closeWebviewTabs(viewType: string): Promise<void> {
  const tabs = getWebviewTabs(viewType);
  if (tabs.length > 0) {
    await vscode.window.tabGroups.close(tabs);
  }
}

export async function closeAllTabs(): Promise<void> {
  const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
  if (tabs.length > 0) {
    await vscode.window.tabGroups.close(tabs);
  }
}

export function describeOpenTabs(): string {
  return JSON.stringify(
    vscode.window.tabGroups.all.flatMap((group) =>
      group.tabs.map((tab) => ({
        label: tab.label,
        isActive: tab.isActive,
        inputType: tab.input?.constructor?.name,
        viewType: getTabViewType(tab),
      }))
    )
  );
}
