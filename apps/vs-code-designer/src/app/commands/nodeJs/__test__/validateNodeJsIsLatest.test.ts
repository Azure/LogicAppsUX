import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateNodeJsIsLatest } from '../validateNodeJsIsLatest';
import { binariesExist } from '../../../utils/binaries';
import { getNodeJsCommand, setNodeJsCommand } from '../../../utils/nodeJs/nodeJsVersion';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import { installNodeJs } from '../installNodeJs';

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_eventName: string, callback: (context: any) => Promise<void>) =>
    callback({
      errorHandling: {},
      telemetry: {
        properties: {},
      },
      ui: {
        showWarningMessage: vi.fn(),
      },
    })
  ),
  DialogResponses: {
    learnMore: { title: 'Learn More' },
    dontWarnAgain: { title: "Don't Warn Again" },
  },
  openUrl: vi.fn(),
}));

vi.mock('../../../utils/binaries', () => ({
  binariesExist: vi.fn(),
  getLatestNodeJsVersion: vi.fn(),
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
  localize: vi.fn((_key: string, defaultValue: string) => defaultValue),
}));

describe('validateNodeJsIsLatest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceSetting).mockReturnValue(false);
    vi.mocked(getNodeJsCommand).mockReturnValue('node');
    vi.mocked(setNodeJsCommand).mockResolvedValue(undefined);
    vi.mocked(installNodeJs).mockResolvedValue(undefined);
  });

  it('installs NodeJS when the binaries check resolves false', async () => {
    vi.mocked(binariesExist).mockResolvedValue(false);

    await validateNodeJsIsLatest('20');

    expect(installNodeJs).toHaveBeenCalledWith(expect.anything(), '20');
  });

  it('repairs the NodeJS command before checking whether binaries exist', async () => {
    vi.mocked(binariesExist).mockResolvedValue(true);

    await validateNodeJsIsLatest('20');

    expect(setNodeJsCommand).toHaveBeenCalledOnce();
    expect(binariesExist).toHaveBeenCalledOnce();
    expect(setNodeJsCommand.mock.invocationCallOrder[0]).toBeLessThan(binariesExist.mock.invocationCallOrder[0]);
  });

  it('does not install NodeJS when binaries exist and update warnings are disabled', async () => {
    vi.mocked(binariesExist).mockResolvedValue(true);

    await validateNodeJsIsLatest('20');

    expect(installNodeJs).not.toHaveBeenCalled();
  });

  it('does not reinstall after the first validation repairs the NodeJS binary state', async () => {
    vi.mocked(binariesExist).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await validateNodeJsIsLatest('20');
    await validateNodeJsIsLatest('20');

    expect(installNodeJs).toHaveBeenCalledOnce();
  });
});
