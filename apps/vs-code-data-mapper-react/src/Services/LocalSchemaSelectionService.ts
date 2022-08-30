import type { SchemaInfoProperties } from '@microsoft/logic-apps-data-mapper';
import type { WebviewApi } from 'vscode-webview';

export class LocalSchemaSelectionService {
  private vscode: WebviewApi<unknown>;
  constructor(vscode: WebviewApi<unknown>) {
    this.vscode = vscode;
  }

  async getSchemas(): Promise<SchemaInfoProperties[]> {
    this.vscode.postMessage({
      command: 'readLocalFileOptions',
    });
    return [];
  }

  async getSchemaFile(_xmlName: string): Promise<any> {
    return;
  }
}
