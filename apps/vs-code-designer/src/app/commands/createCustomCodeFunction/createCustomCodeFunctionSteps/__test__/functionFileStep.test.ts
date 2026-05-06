import { describe, it, expect, vi } from 'vitest';
import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';

vi.mock('fs-extra');
vi.mock('vscode');
vi.mock('../../../../../extensionVariables', () => ({
  ext: { outputChannel: { appendLog: vi.fn() } },
}));
vi.mock('../../../../../localize', () => ({
  localize: (_key: string, msg: string) => msg,
}));

import { FunctionFileStep } from '../functionFileStep';

describe('FunctionFileStep', () => {
  describe('csTemplateFileName mapping', () => {
    it('should map Net10 to FunctionsFileNet10', () => {
      const step = new FunctionFileStep();
      const mapping = (step as any).csTemplateFileName;
      expect(mapping[TargetFramework.Net10]).toBe('FunctionsFileNet10');
    });

    it('should preserve Net8 mapping', () => {
      const step = new FunctionFileStep();
      const mapping = (step as any).csTemplateFileName;
      expect(mapping[TargetFramework.Net8]).toBe('FunctionsFileNet8');
    });

    it('should preserve NetFx mapping', () => {
      const step = new FunctionFileStep();
      const mapping = (step as any).csTemplateFileName;
      expect(mapping[TargetFramework.NetFx]).toBe('FunctionsFileNetFx');
    });

    it('should contain exactly three framework entries', () => {
      const step = new FunctionFileStep();
      const mapping = (step as any).csTemplateFileName;
      expect(Object.keys(mapping)).toHaveLength(3);
    });
  });

  describe('shouldPrompt', () => {
    it('should always return true', () => {
      const step = new FunctionFileStep();
      expect(step.shouldPrompt()).toBe(true);
    });
  });
});
