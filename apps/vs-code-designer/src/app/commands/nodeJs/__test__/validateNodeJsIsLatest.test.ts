import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nodeJsDependencyName } from '../../../../constants';
import { binariesExist, getLatestNodeJsVersion } from '../../../utils/binaries';
import { getLocalNodeJsVersion, getNodeJsCommand } from '../../../utils/nodeJs/nodeJsVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../../../utils/vsCodeConfig/settings';
import { installNodeJs } from '../installNodeJs';
import { validateNodeJsIsLatest } from '../validateNodeJsIsLatest';

const contextRef = vi.hoisted(() => ({ current: undefined as any }));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_eventName: string, callback: (context: any) => Promise<void>) => {
    contextRef.current = {
      errorHandling: {},
      telemetry: { properties: {} },
      ui: { showWarningMessage: vi.fn() },
    };
    await callback(contextRef.current);
  }),
  DialogResponses: {
    dontWarnAgain: { title: "Don't warn again" },
    learnMore: { title: 'Learn more' },
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

describe('validateNodeJsIsLatest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceSetting).mockReturnValue(false);
    vi.mocked(getNodeJsCommand).mockReturnValue('node');
    vi.mocked(updateGlobalSetting).mockResolvedValue(undefined);
  });

  it('installs without checking GitHub latest version when binaries are missing', async () => {
    vi.mocked(binariesExist).mockResolvedValue(false);

    await validateNodeJsIsLatest('18');

    expect(binariesExist).toHaveBeenCalledWith(nodeJsDependencyName);
    expect(installNodeJs).toHaveBeenCalledWith(contextRef.current, '18');
    expect(getLocalNodeJsVersion).not.toHaveBeenCalled();
    expect(getLatestNodeJsVersion).not.toHaveBeenCalled();
    expect(contextRef.current.telemetry.properties.binariesExist).toBe('false');
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
  });
});
