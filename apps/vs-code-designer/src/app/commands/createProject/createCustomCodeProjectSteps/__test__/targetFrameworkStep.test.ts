import { Platform, ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { describe, expect, it, vi } from 'vitest';
import { TargetFrameworkStep } from '../targetFrameworkStep';

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

describe('TargetFrameworkStep', () => {
  it('should prompt only for custom code projects', () => {
    const step = new TargetFrameworkStep();

    expect(step.shouldPrompt({ projectType: ProjectType.customCode } as any)).toBe(true);
    expect(step.shouldPrompt({ projectType: ProjectType.logicApp } as any)).toBe(false);
    expect(step.shouldPrompt({ projectType: ProjectType.rulesEngine } as any)).toBe(false);
  });

  it('should offer only .NET 8 on non-Windows platforms', async () => {
    const restorePlatform = mockPlatform(Platform.mac);
    const context = createContext();
    let capturedPicks: any[] = [];
    context.ui.showQuickPick.mockImplementation((picks: any[]) => {
      capturedPicks = picks;
      return Promise.resolve(picks[0]);
    });

    await new TargetFrameworkStep().prompt(context);

    expect(capturedPicks.map((pick) => pick.data)).toEqual([TargetFramework.Net8]);
    expect(context.targetFramework).toBe(TargetFramework.Net8);
    restorePlatform();
  });

  it('should offer .NET Framework before .NET 8 on Windows', async () => {
    const restorePlatform = mockPlatform(Platform.windows);
    const context = createContext();
    let capturedPicks: any[] = [];
    context.ui.showQuickPick.mockImplementation((picks: any[]) => {
      capturedPicks = picks;
      return Promise.resolve(picks[1]);
    });

    await new TargetFrameworkStep().prompt(context);

    expect(capturedPicks.map((pick) => pick.data)).toEqual([TargetFramework.NetFx, TargetFramework.Net8]);
    expect(context.targetFramework).toBe(TargetFramework.Net8);
    restorePlatform();
  });
});

function createContext() {
  return {
    projectType: ProjectType.customCode,
    ui: {
      showQuickPick: vi.fn(),
    },
  } as any;
}

function mockPlatform(platform: NodeJS.Platform): () => void {
  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  return () => Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
}
