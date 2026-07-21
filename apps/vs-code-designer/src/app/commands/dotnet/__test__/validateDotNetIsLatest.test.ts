import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dotnetDependencyName } from '../../../../constants';
import { binariesExist, getLatestDotNetVersion } from '../../../utils/binaries';
import { shouldCheckForDependencyUpdates } from '../../../utils/dependencyUpdateCheck';
import { getDotNetCommand, getLocalDotNetVersionFromBinaries } from '../../../utils/dotnet/dotnet';
import { installDotNet } from '../installDotNet';
import { validateDotNetIsLatest } from '../validateDotNetIsLatest';

const contextRef = vi.hoisted(() => ({ current: undefined as any }));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_eventName: string, callback: (context: any) => Promise<void>) => {
    contextRef.current = {
      errorHandling: {},
      telemetry: { properties: {} },
    };
    await callback(contextRef.current);
  }),
}));

vi.mock('../../../utils/binaries', () => ({
  binariesExist: vi.fn(),
  getLatestDotNetVersion: vi.fn(),
}));

vi.mock('../../../utils/dependencyUpdateCheck', () => ({
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDotNetCommand).mockReturnValue('dotnet');
    // Default to performing update checks; throttled behavior is covered explicitly below.
    vi.mocked(shouldCheckForDependencyUpdates).mockReturnValue(true);
  });

  it('installs without checking GitHub latest version when binaries are missing', async () => {
    vi.mocked(binariesExist).mockResolvedValue(false);

    await validateDotNetIsLatest('8');

    expect(binariesExist).toHaveBeenCalledWith(dotnetDependencyName);
    expect(installDotNet).toHaveBeenCalledWith(contextRef.current, '8');
    expect(getLocalDotNetVersionFromBinaries).not.toHaveBeenCalled();
    expect(getLatestDotNetVersion).not.toHaveBeenCalled();
    expect(contextRef.current.telemetry.properties.binariesExist).toBe('false');
  });

  it('checks latest version when binaries are present and local version exists', async () => {
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalDotNetVersionFromBinaries).mockResolvedValue('8.0.318');
    vi.mocked(getLatestDotNetVersion).mockResolvedValue('8.0.318');

    await validateDotNetIsLatest('8');

    expect(getLocalDotNetVersionFromBinaries).toHaveBeenCalledWith('8');
    expect(getLatestDotNetVersion).toHaveBeenCalledWith(contextRef.current, '8');
    expect(installDotNet).not.toHaveBeenCalled();
    expect(contextRef.current.telemetry.properties.binariesExist).toBe('true');
  });

  it('skips the GitHub latest-version lookup when the update check is throttled', async () => {
    vi.mocked(shouldCheckForDependencyUpdates).mockReturnValue(false);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalDotNetVersionFromBinaries).mockResolvedValue('8.0.318');

    await validateDotNetIsLatest('8');

    // The local presence check still runs, but the network "is there a newer version?" lookup is skipped.
    expect(getLocalDotNetVersionFromBinaries).toHaveBeenCalledWith('8');
    expect(getLatestDotNetVersion).not.toHaveBeenCalled();
    expect(installDotNet).not.toHaveBeenCalled();
  });

  it('reinstalls a missing local version even when the update check is throttled', async () => {
    vi.mocked(shouldCheckForDependencyUpdates).mockReturnValue(false);
    vi.mocked(binariesExist).mockResolvedValue(true);
    vi.mocked(getLocalDotNetVersionFromBinaries).mockResolvedValue(null);

    await validateDotNetIsLatest('8');

    // A present-but-unrunnable SDK must still be reinstalled regardless of the throttle.
    expect(installDotNet).toHaveBeenCalledWith(contextRef.current, '8');
    expect(getLatestDotNetVersion).not.toHaveBeenCalled();
  });
});
