import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { InitProjectStep } from '../initProjectStep';
import { detectCustomCodeTargetFramework } from '../../../utils/customCodeUtils';
import { getOrCreateDesignTimeDirectory } from '../../../utils/codeless/startDesignTimeApi';
import { removeFromGitIgnore } from '../../../utils/git';

const probeEvents = vi.hoisted(() => ({ record: vi.fn() }));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizardExecuteStep: class {},
  DialogResponses: {
    yes: { title: 'Yes' },
  },
  isUserCancelledError: (error: unknown) =>
    typeof error === 'object' && error !== null && '_isUserCancelledError' in error && error._isUserCancelledError === true,
  nonNullProp: (value: Record<string, unknown>, key: string) => value[key],
}));

vi.mock('../../../utils/regenerationProbe', () => ({
  recordRegenerationEvent: probeEvents.record,
  beginRegenerationWarning: (kind: string, checkId: number) => {
    probeEvents.record({ event: 'warning-call-entered', kind, warningId: 7, checkId });
    return 7;
  },
}));

vi.mock('../../../utils/customCodeUtils', () => ({
  detectCustomCodeTargetFramework: vi.fn(),
}));

vi.mock('../../../utils/codeless/startDesignTimeApi', () => ({
  getOrCreateDesignTimeDirectory: vi.fn(),
}));

vi.mock('../../../utils/git', () => ({
  removeFromGitIgnore: vi.fn(),
}));

vi.mock('../../../utils/binaries', () => ({
  binariesExistSync: vi.fn(() => true),
}));

vi.mock('../../../projectConsistency/fileGenerators', () => ({
  generateTasksJson: vi.fn(),
  generateLaunchJson: vi.fn(),
  generateSettingsJson: vi.fn(),
  generateExtensionsJson: vi.fn(),
}));

vi.mock('../../../utils/fs', () => ({
  isSubpath: vi.fn(() => false),
  writeFormattedJson: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  default: {},
  ensureDir: vi.fn(),
  pathExists: vi.fn(),
}));

describe('InitProjectStep regeneration diagnostics', () => {
  const projectPath = path.join('D:\\workspace', 'logicapp');
  let context: IProjectWizardContext;
  let showWarningMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    showWarningMessage = vi.fn();
    context = {
      projectPath,
      workspacePath: 'D:\\workspace',
      version: '~4',
      language: 'JavaScript',
      telemetry: { properties: {} },
      errorHandling: {},
      ui: { showWarningMessage },
    } as unknown as IProjectWizardContext;
    vi.mocked(fse.pathExists).mockResolvedValue(true);
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(detectCustomCodeTargetFramework).mockResolvedValue(undefined);
    vi.mocked(getOrCreateDesignTimeDirectory).mockResolvedValue('D:\\workspace\\logicapp\\workflow-designtime');
    vi.mocked(removeFromGitIgnore).mockResolvedValue(undefined);
  });

  it('keeps the originating check id and recognizes cancellation without constructor identity', async () => {
    const cancellation = { _isUserCancelledError: true };
    showWarningMessage.mockRejectedValue(cancellation);

    await expect(new InitProjectStep(42).execute(context)).rejects.toBe(cancellation);

    expect(probeEvents.record).toHaveBeenCalledWith({
      event: 'warning-call-entered',
      kind: 'overwrite',
      warningId: 7,
      checkId: 42,
    });
    expect(probeEvents.record).toHaveBeenCalledWith({
      event: 'warning-call-returned',
      kind: 'overwrite',
      warningId: 7,
      checkId: 42,
      awaitable: true,
    });
    expect(probeEvents.record).toHaveBeenCalledWith({
      event: 'warning-error',
      kind: 'overwrite',
      warningId: 7,
      checkId: 42,
      errorKind: 'user-cancelled',
      durationMs: expect.any(Number),
    });
  });
});
