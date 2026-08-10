import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dotnetDependencyName } from '../../../../constants';
import { binariesExist, getLatestDotNetVersion } from '../../../utils/binaries';
import { shouldCheckForDependencyUpdates } from '../../../state/dependencies';
import { getDotNetCommand, getLocalDotNetVersionFromBinaries } from '../../../utils/dotnet/dotnet';
import { installDotNet } from '../installDotNet';
import { validateDotNetIsLatest } from '../validateDotNetIsLatest';

const createContext = (): IActionContext =>
  ({
    telemetry: { properties: {}, measurements: {}, suppressIfSuccessful: false, suppressAll: false },
    errorHandling: { suppressDisplay: false, rethrow: false, issueProperties: {} },
    ui: {} as any,
    valuesToMask: [],
  }) as unknown as IActionContext;

vi.mock('../../../utils/binaries', () => ({
  binariesExist: vi.fn(),
  getLatestDotNetVersion: vi.fn(),
}));

vi.mock('../../../state/dependencies', () => ({
  shouldCheckForDependencyUpdates: vi.fn(),
}));

vi.mock('../../../utils/dotnet/dotnet', () => ({
  getDotNetCommand: vi.fn(),
  getLocalDotNetVersionFromBinaries: vi.fn(),
}));

vi.mock('../installDotNet', () => ({
  installDotNet: vi.fn(),
}));

describe('validateDotNetIsLatest', () => {
  let context: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createContext();
    vi.mocked(getDotNetCommand).mockReturnValue('dotnet');
    // Default to performing update checks; throttled behavior is covered explicitly below.
    vi.mocked(shouldCheckForDependencyUpdates).mockReturnValue(true);
  });

  it('installs without checking GitHub latest version when binaries are missing', async () => {
    vi.mocked(binariesExist).mockResolvedValue(false);

    await validateDotNetIsLatest(context, '8');

    expect(binariesExist).toHaveBeenCalledWith(dotnetDependencyName);
    expect(installDotNet).toHaveBeenCalledWith(context, '8');
    expect(getLocalDotNetVersionFromBinaries).not.toHaveBeenCalled();
    expect(getLatestDotNetVersion).not.toHaveBeenCalled();
    expect(context.telemetry.properties.binariesExist).toBe('false');
  });

  it('checks latest version when binaries are present and local version exists', async () => {
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalDotNetVersionFromBinaries).mockResolvedValue('8.0.318');
    vi.mocked(getLatestDotNetVersion).mockResolvedValue('8.0.318');

    await validateDotNetIsLatest(context, '8');

    expect(getLocalDotNetVersionFromBinaries).toHaveBeenCalledWith('8');
    expect(getLatestDotNetVersion).toHaveBeenCalledWith(context, '8');
    expect(installDotNet).not.toHaveBeenCalled();
    expect(context.telemetry.properties.binariesExist).toBe('true');
  });

  it('skips the GitHub latest-version lookup when the update check is throttled', async () => {
    vi.mocked(shouldCheckForDependencyUpdates).mockReturnValue(false);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalDotNetVersionFromBinaries).mockResolvedValue('8.0.318');

    await validateDotNetIsLatest(context, '8');

    // The local presence check still runs, but the network "is there a newer version?" lookup is skipped.
    expect(getLocalDotNetVersionFromBinaries).toHaveBeenCalledWith('8');
    expect(getLatestDotNetVersion).not.toHaveBeenCalled();
    expect(installDotNet).not.toHaveBeenCalled();
  });

  it('reinstalls a missing local version even when the update check is throttled', async () => {
    vi.mocked(shouldCheckForDependencyUpdates).mockReturnValue(false);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalDotNetVersionFromBinaries).mockResolvedValue(null);

    await validateDotNetIsLatest(context, '8');

    // A present-but-unrunnable SDK must still be reinstalled regardless of the throttle.
    expect(installDotNet).toHaveBeenCalledWith(context, '8');
    expect(getLatestDotNetVersion).not.toHaveBeenCalled();
  });
});
