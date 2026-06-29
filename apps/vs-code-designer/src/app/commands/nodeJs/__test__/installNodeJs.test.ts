import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installNodeJs } from '../installNodeJs';
import {
  downloadAndExtractDependency,
  getCpuArchitecture,
  getLatestNodeJsVersion,
  getNodeJsBinariesReleaseUrl,
} from '../../../utils/binaries';
import { setNodeJsCommand } from '../../../utils/nodeJs/nodeJsVersion';
import { ensureRuntimeDependenciesPath } from '../../../utils/runtimeDependenciesPath';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

vi.mock('../../../utils/binaries', () => ({
  downloadAndExtractDependency: vi.fn(),
  getCpuArchitecture: vi.fn(),
  getLatestNodeJsVersion: vi.fn(),
  getNodeJsBinariesReleaseUrl: vi.fn(),
}));

vi.mock('../../../utils/nodeJs/nodeJsVersion', () => ({
  setNodeJsCommand: vi.fn(),
}));

vi.mock('../../../utils/runtimeDependenciesPath', () => ({
  ensureRuntimeDependenciesPath: vi.fn(),
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      show: vi.fn(),
    },
  },
}));

describe('installNodeJs', () => {
  const context = {
    telemetry: {
      properties: {},
    },
  } as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context.telemetry.properties = {};
    vi.mocked(getCpuArchitecture).mockReturnValue('x64');
    vi.mocked(ensureRuntimeDependenciesPath).mockResolvedValue('dependencies');
    vi.mocked(getLatestNodeJsVersion).mockResolvedValue('20.20.2');
    vi.mocked(getNodeJsBinariesReleaseUrl).mockReturnValue('https://example.com/node.zip');
    vi.mocked(downloadAndExtractDependency).mockResolvedValue(undefined);
    vi.mocked(setNodeJsCommand).mockResolvedValue(undefined);
  });

  it('updates the NodeJS command after successfully extracting NodeJS', async () => {
    await installNodeJs(context, '20');

    expect(downloadAndExtractDependency).toHaveBeenCalledWith(context, 'https://example.com/node.zip', 'dependencies', 'NodeJs');
    expect(setNodeJsCommand).toHaveBeenCalledOnce();
    expect(downloadAndExtractDependency.mock.invocationCallOrder[0]).toBeLessThan(setNodeJsCommand.mock.invocationCallOrder[0]);
  });
});
