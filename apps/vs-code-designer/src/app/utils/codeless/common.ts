import { ext } from '../../../extensionVariables';
import type { WebviewPanel } from 'vscode';

export function tryGetWebviewPanel(category: string, name: string): WebviewPanel | undefined {
  const currentPanels = ext.openWebviewPanels[category];
  return currentPanels ? currentPanels[name] : undefined;
}

export function cacheWebviewPanel(category: string, name: string, panel: WebviewPanel): void {
  const currentPanels = ext.openWebviewPanels[category];

  if (currentPanels) {
    currentPanels[name] = panel;
  }
}

export function removeWebviewPanelFromCache(category: string, name: string): void {
  const currentPanels = ext.openWebviewPanels[category];

  if (currentPanels) {
    delete currentPanels[name];
  }
}
