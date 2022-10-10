import { tryGetWebviewPanel } from '../../../utils/codeless/common';
import type { WebviewPanel } from 'vscode';

export abstract class OpenDesignerBase {
  protected workflowName: string;
  protected panelName: string;
  protected apiVersion: string;
  protected panelGroupKey: string;

  protected constructor(workflowName: string, panelName: string, apiVersion: string, panelGroupKey: string) {
    this.workflowName = workflowName;
    this.panelName = panelName;
    this.apiVersion = apiVersion;
    this.panelGroupKey = panelGroupKey;
  }

  protected abstract createPanel(): Promise<void>;

  protected getExistingPanel(): WebviewPanel | undefined {
    return tryGetWebviewPanel(this.panelGroupKey, this.panelName);
  }
}
