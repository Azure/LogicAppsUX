import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dotnetDependencyName } from '../../../../constants';
import { binariesExist, getLatestDotNetVersion } from '../../../utils/binaries';
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
});
