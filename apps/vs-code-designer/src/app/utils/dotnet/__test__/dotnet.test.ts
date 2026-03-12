import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import { DotnetVersion } from '../../../../constants';

const { mockPathExists, mockGetProjFiles } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockGetProjFiles: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzExtFsExtra: {
    pathExists: mockPathExists,
    readFile: vi.fn(),
  },
}));

vi.mock('../../../extensionVariables', () => ({
  ext: { outputChannel: { appendLog: vi.fn() }, dotNetCliPath: 'dotnet' },
}));
vi.mock('../../../localize', () => ({
  localize: (_key: string, msg: string) => msg,
}));
vi.mock('../../telemetry', () => ({
  runWithDurationTelemetry: (_ctx: any, _name: string, fn: () => any) => fn(),
}));
vi.mock('../../workspace', () => ({
  findFiles: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));
vi.mock('../../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  updateWorkspaceSetting: vi.fn(),
}));
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readdirSync: vi.fn().mockReturnValue([]),
  chmodSync: vi.fn(),
}));
vi.mock('semver', () => ({
  clean: vi.fn(),
  maxSatisfying: vi.fn(),
}));

import { getTemplateKeyFromProjFile } from '../dotnet';

describe('dotnet utilities', () => {
  const createContext = () =>
    ({
      telemetry: { properties: {}, measurements: {} },
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathExists.mockResolvedValue(false);
    mockGetProjFiles.mockResolvedValue([]);
  });

  describe('getTemplateKeyFromProjFile', () => {
    it('should default to net10.0 for FuncVersion.v4 when no project path exists', async () => {
      const result = await getTemplateKeyFromProjFile(createContext(), undefined, FuncVersion.v4, ProjectLanguage.CSharp);
      expect(result).toBe(DotnetVersion.net10);
    });

    it('should default to net10.0 for FuncVersion.v4 when project path does not exist', async () => {
      mockPathExists.mockResolvedValue(false);
      const result = await getTemplateKeyFromProjFile(createContext(), '/nonexistent', FuncVersion.v4, ProjectLanguage.CSharp);
      expect(result).toBe(DotnetVersion.net10);
    });

    it('should default to netcoreapp3.1 for FuncVersion.v3', async () => {
      const result = await getTemplateKeyFromProjFile(createContext(), undefined, FuncVersion.v3, ProjectLanguage.CSharp);
      expect(result).toBe(DotnetVersion.net3);
    });

    it('should default to netcoreapp2.1 for FuncVersion.v2', async () => {
      const result = await getTemplateKeyFromProjFile(createContext(), undefined, FuncVersion.v2, ProjectLanguage.CSharp);
      expect(result).toBe(DotnetVersion.net2);
    });

    it('should default to net48 for FuncVersion.v1', async () => {
      const result = await getTemplateKeyFromProjFile(createContext(), undefined, FuncVersion.v1, ProjectLanguage.CSharp);
      expect(result).toBe(DotnetVersion.net48);
    });
  });
});
