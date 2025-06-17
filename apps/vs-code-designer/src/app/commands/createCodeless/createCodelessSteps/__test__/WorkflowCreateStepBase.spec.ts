import { describe, it, expect, vi, beforeEach, afterEach, Mock, MockInstance } from 'vitest';
import { WorkflowCreateProgress, WorkflowCreateStepBase } from '../WorkflowCreateStepBase';
import { FuncVersion, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { workflowCodeTypeForTelemetry } from '../../../../utils/codeful/utils';
import { Progress } from 'vscode';
import { parseJson } from '../../../../utils/parseJson';

describe('WorkflowCreateStepBase', async () => {
  class MockWorkflowCreateStep extends WorkflowCreateStepBase<IFunctionWizardContext> {
    public executeCore = vi.fn().mockResolvedValue('testPath');
    public shouldExecute = vi.fn().mockReturnValue(true);
  }

  const mockContext: Partial<IFunctionWizardContext> = {
    telemetry: {
      properties: {},
      measurements: {},
    },
  };

  describe('execute', async () => {
    const mockContextForExecute: Partial<IFunctionWizardContext> = {
      ...mockContext,
      functionTemplate: {
        id: 'testId',
        name: 'testName',
        isHttpTrigger: true,
        defaultFunctionName: 'testFunction',
        language: 'CSharp',
        isTimerTrigger: false,
        userPromptedSettings: [],
        categories: [],
      },
      language: ProjectLanguage.CSharp,
      version: FuncVersion.v4,
      isCodeless: false,
    };
    it('adds telemetry properties', () => {
      const step = new MockWorkflowCreateStep();

      const mockProgress: Progress<WorkflowCreateProgress> = {
        report: vi.fn(),
      };

      step.execute(mockContextForExecute as IFunctionWizardContext, mockProgress);
      expect(mockContextForExecute?.telemetry?.properties.workflowCodeType).toBe(
        workflowCodeTypeForTelemetry(mockContextForExecute?.isCodeless)
      );
      expect(mockContextForExecute?.telemetry?.properties.projectLanguage).toBe(mockContextForExecute?.language);
      expect(mockContextForExecute?.telemetry?.properties.projectRuntime).toBe(mockContextForExecute?.version);
      expect(mockContextForExecute?.telemetry?.properties.templateId).toBe(mockContextForExecute?.functionTemplate?.id);
    });

    it('calls executeCore and executes progress', async () => {
      const step = new MockWorkflowCreateStep();
      const mockProgress: Progress<WorkflowCreateProgress> = {
        report: vi.fn(),
      };

      await step.execute(mockContextForExecute as IFunctionWizardContext, mockProgress);

      expect(step.executeCore).toHaveBeenCalledWith(mockContextForExecute as IFunctionWizardContext);

      expect(mockProgress.report).toHaveBeenCalled();
    });
  });

  describe('getJsonFromFile', () => {
    let mockBase;
    beforeEach(() => {
      vi.mock('../../../../utils/parseJson', () => ({
        parseJson: vi.fn(),
      }));
      vi.mock('fs-extra', () => ({
        pathExists: vi.fn().mockReturnValue(Promise.resolve(true)),
        readFile: vi.fn().mockResolvedValue(''),
      }));
      mockBase = new MockWorkflowCreateStep();
    });

    const mockDefaultValue = { version: '2.0' };
    const mockFilePath = '/test/path/file.json';

    // Mock UI for showing messages
    const mockShowWarningMessage = vi.fn();

    beforeEach(() => {
      vi.resetAllMocks();
    });

    const mockGetJsonContext: Partial<IFunctionWizardContext> = {
      ui: {
        showWarningMessage: mockShowWarningMessage,
      } as any,
      ...mockContext,
    };

    it("returns defaultValue when file doesn't exist", async () => {
      // Setup
      (fse.pathExists as unknown as Mock).mockReturnValue(Promise.resolve(false));

      // Execute
      const result = await mockBase.getJsonFromFile(mockGetJsonContext as IFunctionWizardContext, mockFilePath, mockDefaultValue);

      // Assert
      expect(fse.pathExists).toHaveBeenCalledWith(mockFilePath);
      expect(result).toEqual(mockDefaultValue);
    });

    it('returns defaultValue when file is empty', async () => {
      // Setup
      (fse.pathExists as unknown as Mock).mockReturnValue(Promise.resolve(true));
      (fse.readFile as unknown as Mock).mockResolvedValue('');
      const spyPathExists = vi.spyOn(fse, 'pathExists');
      // Execute
      const result = await mockBase.getJsonFromFile(mockContext as IFunctionWizardContext, mockFilePath, mockDefaultValue);

      // Assert
      expect(spyPathExists).toHaveBeenCalledWith(mockFilePath);
      expect(fse.readFile).toHaveBeenCalledWith(mockFilePath);
      expect(result).toEqual(mockDefaultValue);
    });

    it('returns parsed JSON when file has valid content', async () => {
      // Setup
      const mockJson = { test: 'value', nested: { prop: true } };
      const mockJsonBuffer = Buffer.from(JSON.stringify(mockJson));

      (fse.pathExists as unknown as Mock).mockReturnValue(Promise.resolve(true));
      (fse.readFile as unknown as Mock).mockReturnValue(Promise.resolve(mockJsonBuffer));
      (parseJson as unknown as Mock).mockReturnValue(mockJson);

      // Execute
      const result = await mockBase.getJsonFromFile(mockContext as IFunctionWizardContext, mockFilePath, mockDefaultValue);

      // Assert
      expect(fse.pathExists).toHaveBeenCalledWith(mockFilePath);
      expect(fse.readFile).toHaveBeenCalledWith(mockFilePath);
      expect(parseJson).toHaveBeenCalled();
      expect(result).toEqual(mockJson);
    });

    it('throws error when JSON parsing fails and allowOverwrite is false', async () => {
      // Setup
      const invalidJson = '{ invalid: json ';
      const parseError = new Error('Invalid JSON');
      const mockJsonBuffer = Buffer.from(JSON.stringify(invalidJson));

      (fse.pathExists as unknown as Mock).mockReturnValue(Promise.resolve(true));
      (fse.readFile as unknown as Mock).mockReturnValue(Promise.resolve(mockJsonBuffer));
      (parseJson as unknown as Mock).mockImplementation(() => {
        throw parseError;
      });

      // Execute & Assert
      await expect(
        mockBase.getJsonFromFile(mockContext as IFunctionWizardContext, mockFilePath, mockDefaultValue, false)
      ).rejects.toThrow();

      expect(mockGetJsonContext.ui?.showWarningMessage).not.toHaveBeenCalled();
    });
  });
});
