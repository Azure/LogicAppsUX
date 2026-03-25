import { describe, it, expect, vi } from 'vitest';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, msg: string) => msg,
}));

import { TargetFrameworkStep } from '../targetFrameworkStep';

describe('TargetFrameworkStep', () => {
  describe('shouldPrompt', () => {
    it('should return true for customCode projects', () => {
      const step = new TargetFrameworkStep();
      const context = { projectType: ProjectType.customCode } as any;
      expect(step.shouldPrompt(context)).toBe(true);
    });

    it('should return false for logicApp projects', () => {
      const step = new TargetFrameworkStep();
      const context = { projectType: ProjectType.logicApp } as any;
      expect(step.shouldPrompt(context)).toBe(false);
    });

    it('should return false for rulesEngine projects', () => {
      const step = new TargetFrameworkStep();
      const context = { projectType: ProjectType.rulesEngine } as any;
      expect(step.shouldPrompt(context)).toBe(false);
    });
  });

  describe('prompt', () => {
    it('should offer .NET 8 and .NET 10 picks on non-Windows platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const step = new TargetFrameworkStep();
      let capturedPicks: any[] = [];
      const context = {
        projectType: ProjectType.customCode,
        ui: {
          showQuickPick: vi.fn((picks: any[]) => {
            capturedPicks = picks;
            return Promise.resolve(picks[0]);
          }),
        },
      } as any;

      await step.prompt(context);

      expect(capturedPicks).toHaveLength(2);
      expect(capturedPicks[0].data).toBe(TargetFramework.Net8);
      expect(capturedPicks[1].data).toBe(TargetFramework.Net10);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should include .NET Framework on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const step = new TargetFrameworkStep();
      let capturedPicks: any[] = [];
      const context = {
        projectType: ProjectType.customCode,
        ui: {
          showQuickPick: vi.fn((picks: any[]) => {
            capturedPicks = picks;
            return Promise.resolve(picks[0]);
          }),
        },
      } as any;

      await step.prompt(context);

      expect(capturedPicks).toHaveLength(3);
      expect(capturedPicks[0].data).toBe(TargetFramework.NetFx);
      expect(capturedPicks[1].data).toBe(TargetFramework.Net8);
      expect(capturedPicks[2].data).toBe(TargetFramework.Net10);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should set context.targetFramework to the selected value', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const step = new TargetFrameworkStep();
      const context = {
        projectType: ProjectType.customCode,
        ui: {
          showQuickPick: vi.fn((picks: any[]) => {
            // Simulate selecting .NET 10
            const net10Pick = picks.find((p: any) => p.data === TargetFramework.Net10);
            return Promise.resolve(net10Pick);
          }),
        },
      } as any;

      await step.prompt(context);
      expect(context.targetFramework).toBe(TargetFramework.Net10);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
