import * as vscode from 'vscode';

let output: vscode.LogOutputChannel | undefined;

export function getDataMapperLogger(): vscode.LogOutputChannel {
  output ??= vscode.window.createOutputChannel('Logic App Data Mapper', { log: true });
  return output;
}

export function disposeDataMapperLogger(): void {
  output?.dispose();
  output = undefined;
}

// Error messages from XML parsers and workers can contain user payloads or scripts.
export function errorCategory(error: unknown): string {
  if (error instanceof Error) {
    const code = 'code' in error ? String(error.code) : '';
    if (/^[A-Z][A-Z0-9_]{1,63}$/.test(code)) {
      return code;
    }
    if (error instanceof SyntaxError) {
      return 'SyntaxError';
    }
    if (error instanceof TypeError) {
      return 'TypeError';
    }
  }
  return 'Error';
}
