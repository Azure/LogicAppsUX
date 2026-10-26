import { DialogResponses } from '@microsoft/vscode-azext-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { runWithTimeout } from '../timeout';

vi.mock('@microsoft/vscode-azext-utils', () => ({
  DialogResponses: {
    no: { title: 'No' },
    yes: { title: 'Yes' },
  },
}));

vi.mock('../../../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

describe('runWithTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns immediately when the async function succeeds before the timeout', async () => {
    const installDependency = vi.fn().mockResolvedValue(undefined);

    await runWithTimeout(installDependency, 'Dependency', 1000, 'https://example.com/help');

    expect(installDependency).toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).not.toHaveBeenCalled();
  });

  it('retries when the timeout warning is accepted', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const installDependency = vi.fn(() => {
      attempts += 1;
      return attempts === 1 ? new Promise<void>(() => undefined) : Promise.resolve();
    });
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(DialogResponses.yes);

    const result = runWithTimeout(installDependency, 'Dependency', 100, 'https://example.com/help');
    await vi.advanceTimersByTimeAsync(100);
    await result;

    expect(installDependency).toHaveBeenCalledTimes(2);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringMatching(/^Timeout: /));
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringMatching(/^Retrying: /));
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('shows an error and does not retry when the timeout warning is declined', async () => {
    vi.useFakeTimers();
    const installDependency = vi.fn(() => new Promise<void>(() => undefined));
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(DialogResponses.no);

    const result = runWithTimeout(installDependency, 'Dependency', 2000, 'https://example.com/help');
    await vi.advanceTimersByTimeAsync(2000);
    await result;

    expect(installDependency).toHaveBeenCalledOnce();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringMatching(/^Timeout: /));
    expect(ext.outputChannel.appendLog).not.toHaveBeenCalledWith(expect.stringMatching(/^Retrying: /));
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Dependency timed out after 2 seconds. Please click [here](https://example.com/help) to manually install the dependency.'
    );
  });
});
