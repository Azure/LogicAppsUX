import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { nodeJsDependencyName } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { binariesExist, getLatestNodeJsVersion, verifyDependencyIntegrity } from '../../../utils/binaries';
import { getLocalNodeJsVersion, getNodeJsCommand, setNodeJsCommand } from '../../../utils/nodeJs/nodeJsVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../../../utils/vsCodeConfig/settings';
import { installNodeJs } from '../installNodeJs';
import { validateNodeJsIsLatest } from '../validateNodeJsIsLatest';

const contextRef = vi.hoisted(() => ({ current: undefined as any }));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_eventName: string, callback: (context: any) => Promise<void>) => {
    contextRef.current = {
      errorHandling: {},
      telemetry: { properties: {} },
      ui: {
        showWarningMessage: vi.fn(),
      },
    };
    await callback(contextRef.current);
  }),
  DialogResponses: {
    dontWarnAgain: { title: "Don't warn again" },
    learnMore: { title: 'Learn more' },
  },
  openUrl: vi.fn(),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: { appendLog: vi.fn() },
  },
}));

vi.mock('../../../utils/binaries', () => ({
  binariesExist: vi.fn(),
  getLatestNodeJsVersion: vi.fn(),
  verifyDependencyIntegrity: vi.fn(() => true),
}));

vi.mock('../../../utils/nodeJs/nodeJsVersion', () => ({
  getLocalNodeJsVersion: vi.fn(),
  getNodeJsCommand: vi.fn(),
  setNodeJsCommand: vi.fn(),
}));

vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

vi.mock('../installNodeJs', () => ({
  installNodeJs: vi.fn(),
}));

vi.mock('../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/\{(\d+)\}/g, (_match, index) => String(args[Number(index)] ?? `{${index}}`))
  ),
}));

const flushPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

describe('validateNodeJsIsLatest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined);
    vi.mocked(getWorkspaceSetting).mockReturnValue(false);
    vi.mocked(getNodeJsCommand).mockReturnValue('node');
    vi.mocked(setNodeJsCommand).mockResolvedValue(undefined);
    vi.mocked(installNodeJs).mockResolvedValue(undefined);
    vi.mocked(updateGlobalSetting).mockResolvedValue(undefined);
    vi.mocked(vscode.window.withProgress).mockImplementation(async (_options, task) => task({} as any, {} as any));
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(undefined);
  });

  it('reinstalls when binaries exist but the on-disk integrity check fails', async () => {
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(verifyDependencyIntegrity).mockReturnValue(false);

    await validateNodeJsIsLatest('20');

    expect(verifyDependencyIntegrity).toHaveBeenCalledWith(contextRef.current, nodeJsDependencyName);
    expect(installNodeJs).toHaveBeenCalledWith(contextRef.current, '20');
    expect(contextRef.current.telemetry.properties.integrityValid).toBe('false');
    expect(getLocalNodeJsVersion).not.toHaveBeenCalled();
  });

  it('does not reinstall when binaries exist and the on-disk integrity check passes', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(verifyDependencyIntegrity).mockReturnValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.0.0');

    await validateNodeJsIsLatest('18');

    expect(installNodeJs).not.toHaveBeenCalled();
    expect(contextRef.current.telemetry.properties.integrityValid).toBe('true');
  });

  it('installs without checking GitHub latest version when binaries are missing', async () => {
    vi.mocked(binariesExist).mockResolvedValue(false);

    await validateNodeJsIsLatest('18');

    expect(setNodeJsCommand).toHaveBeenCalledOnce();
    expect(binariesExist).toHaveBeenCalledWith(nodeJsDependencyName);
    expect(setNodeJsCommand.mock.invocationCallOrder[0]).toBeLessThan(binariesExist.mock.invocationCallOrder[0]);
    expect(installNodeJs).toHaveBeenCalledWith(contextRef.current, '18');
    expect(getLocalNodeJsVersion).not.toHaveBeenCalled();
    expect(getLatestNodeJsVersion).not.toHaveBeenCalled();
    expect(contextRef.current.telemetry.properties.binariesExist).toBe('false');
  });

  it('repairs the NodeJS command before checking whether binaries exist', async () => {
    vi.mocked(binariesExist).mockResolvedValue(true);

    await validateNodeJsIsLatest('20');

    expect(setNodeJsCommand).toHaveBeenCalledOnce();
    expect(binariesExist).toHaveBeenCalledOnce();
    expect(setNodeJsCommand.mock.invocationCallOrder[0]).toBeLessThan(binariesExist.mock.invocationCallOrder[0]);
  });

  it('does not reinstall after the first validation repairs the NodeJS binary state', async () => {
    vi.mocked(binariesExist).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await validateNodeJsIsLatest('20');
    await validateNodeJsIsLatest('20');

    expect(installNodeJs).toHaveBeenCalledOnce();
  });

  it('checks latest version only when binaries are present and warnings are enabled', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.0.0');

    await validateNodeJsIsLatest('18');

    expect(getLocalNodeJsVersion).toHaveBeenCalledWith(contextRef.current);
    expect(getLatestNodeJsVersion).toHaveBeenCalledWith(contextRef.current, '18');
    expect(installNodeJs).not.toHaveBeenCalled();
    expect(contextRef.current.telemetry.properties.binariesExist).toBe('true');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs local version: 18.0.0');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs dependency feed version: 18');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs resolved newest version: 18.0.0');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs latest version source: unknown');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs warning decision: notNewer');
  });

  it('does not block validation when the outdated Node.js warning is unanswered', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.1.0');
    vi.mocked(vscode.window.showWarningMessage).mockReturnValue(new Promise(() => {}));

    await validateNodeJsIsLatest('18');

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Update your local Node JS version (18.0.0) to the latest version (18.1.0) for the best experience.',
      { title: 'Update' },
      DialogResponses.learnMore,
      DialogResponses.dontWarnAgain
    );
    expect(installNodeJs).not.toHaveBeenCalled();
  });

  it('shows the outdated Node.js warning when the target version includes minor and patch', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.20.8');

    await validateNodeJsIsLatest('18.0.0');

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Update your local Node JS version (18.0.0) to the latest version (18.20.8) for the best experience.',
      { title: 'Update' },
      DialogResponses.learnMore,
      DialogResponses.dontWarnAgain
    );
  });

  it('uses the dependency feed target for a newer same-major minor Node.js warning', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('20.18.3');

    await validateNodeJsIsLatest('20.19.0');

    expect(getLatestNodeJsVersion).not.toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Update your local Node JS version (20.18.3) to the latest version (20.19.0) for the best experience.',
      { title: 'Update' },
      DialogResponses.learnMore,
      DialogResponses.dontWarnAgain
    );
    expect(contextRef.current.telemetry.properties.latestVersionSource).toBe('dependencyFeed');
    expect(contextRef.current.telemetry.properties.nodeJsWarningDecision).toBe('shown');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs resolved newest version: 20.19.0');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs latest version source: dependencyFeed');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('NodeJs warning decision: shown');
  });

  it('shows the outdated Node.js warning for a newer target major version', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.20.8');

    await validateNodeJsIsLatest('20.0.0');

    expect(getLatestNodeJsVersion).not.toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Update your local Node JS version (18.20.8) to the latest version (20.0.0) for the best experience.',
      { title: 'Update' },
      DialogResponses.learnMore,
      DialogResponses.dontWarnAgain
    );
  });

  it('does not show the outdated Node.js warning when fallback latest version does not match the requested target major', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('20.18.3');

    await validateNodeJsIsLatest('18.0.0');

    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
  });

  it('updates the warning setting from the nonblocking outdated Node.js prompt callback', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.1.0');
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(DialogResponses.dontWarnAgain);
    contextRef.current = undefined;

    await validateNodeJsIsLatest('18');
    await flushPromises();

    expect(updateGlobalSetting).toHaveBeenCalledWith('showNodeJsWarning', false);
  });

  it('updates Node.js and refreshes the command from the nonblocking outdated prompt callback only after Update is selected', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.1.0');
    let resolveWarning!: (value: any) => void;
    const warningPromise = new Promise((resolve) => {
      resolveWarning = resolve;
    });
    vi.mocked(vscode.window.showWarningMessage).mockReturnValue(warningPromise);
    contextRef.current = undefined;

    await validateNodeJsIsLatest('18');
    const update = vi.mocked(vscode.window.showWarningMessage).mock.calls[0][1];
    expect(installNodeJs).not.toHaveBeenCalled();
    resolveWarning(update);
    await flushPromises();

    expect(installNodeJs).toHaveBeenCalledWith(contextRef.current, '18');
    expect(setNodeJsCommand).toHaveBeenCalledTimes(2);
    expect(vscode.window.withProgress).toHaveBeenCalledWith(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Updating Node JS runtime dependency',
      },
      expect.any(Function)
    );
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Node JS runtime dependency update completed.');
  });

  it('opens learn more from the nonblocking outdated Node.js prompt callback', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.1.0');
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(DialogResponses.learnMore);
    contextRef.current = undefined;

    await validateNodeJsIsLatest('18');
    await flushPromises();

    expect(openUrl).toHaveBeenCalledWith('https://nodejs.org/en/download');
    expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
  });

  it('surfaces update failures from the nonblocking outdated Node.js prompt callback', async () => {
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalNodeJsVersion).mockResolvedValue('18.0.0');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('18.1.0');
    vi.mocked(installNodeJs).mockRejectedValueOnce(new Error('download failed'));
    let resolveWarning!: (value: any) => void;
    const warningPromise = new Promise((resolve) => {
      resolveWarning = resolve;
    });
    vi.mocked(vscode.window.showWarningMessage).mockReturnValue(warningPromise);
    contextRef.current = undefined;

    await validateNodeJsIsLatest('18');
    const update = vi.mocked(vscode.window.showWarningMessage).mock.calls[0][1];
    resolveWarning(update);
    await flushPromises();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to update Node JS runtime dependency: "download failed".');
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });
});
