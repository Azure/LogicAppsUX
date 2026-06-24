import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateNodeJsIsLatest } from '../validateNodeJsIsLatest';
import { binariesExist } from '../../../utils/binaries';
import { getNodeJsCommand } from '../../../utils/nodeJs/nodeJsVersion';
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
    vi.mocked(installNodeJs).mockResolvedValue(undefined);
  });

  it('installs NodeJS when the binaries check resolves false', async () => {
    vi.mocked(binariesExist).mockResolvedValue(false);

    await validateNodeJsIsLatest('20');

    expect(installNodeJs).toHaveBeenCalledWith(expect.anything(), '20');
  });

  it('does not install NodeJS when binaries exist and update warnings are disabled', async () => {
    vi.mocked(binariesExist).mockResolvedValue(true);

    await validateNodeJsIsLatest('20');

    expect(installNodeJs).not.toHaveBeenCalled();
  });
});
