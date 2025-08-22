import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppNamespaceStep } from '../AppNamespaceStep';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../../../../extensionVariables';

describe('AppNamespaceStep', () => {
  const validFunctionAppNamespace = 'Valid_Namespace1';
  const invalidFunctionAppNamespace = 'Invalid-Namespace';

  let appNamespaceStep: AppNamespaceStep;
  let testContext: any;
  let appendLogSpy: any;

  beforeEach(() => {
    appNamespaceStep = new AppNamespaceStep();
    testContext = {
      projectType: ProjectType.customCode,
      ui: {
        showInputBox: vi.fn((options: any) => {
          return options.validateInput(options.testInput).then((validationResult: string | undefined) => {
            if (validationResult) {
              return Promise.reject(new Error(validationResult));
            }
            return Promise.resolve(options.testInput);
          });
        }),
      },
    };
    appendLogSpy = vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prompt', () => {
    it('sets context.functionAppNamespace and logs output for valid input', async () => {
      testContext.ui.showInputBox = vi.fn((options: any) => {
        options.testInput = validFunctionAppNamespace;
        return options.validateInput(options.testInput).then((result: string | undefined) => {
          if (result) {
            return Promise.reject(new Error(result));
          }
          return Promise.resolve(options.testInput);
        });
      });

      await appNamespaceStep.prompt(testContext);
      expect(testContext.functionAppNamespace).toBe(validFunctionAppNamespace);
      expect(appendLogSpy).toHaveBeenCalledWith(`Function App project namespace set to ${validFunctionAppNamespace}`);
    });

    it('rejects when input is invalid (empty)', async () => {
      const emptyNamespace = '';
      testContext.ui.showInputBox = vi.fn((options: any) => {
        options.testInput = emptyNamespace;
        return options.validateInput(options.testInput).then((result: string | undefined) => {
          if (result) {
            return Promise.reject(new Error(result));
          }
          return Promise.resolve(emptyNamespace);
        });
      });

      await expect(appNamespaceStep.prompt(testContext)).rejects.toThrowError(`Can't have an empty namespace.`);
    });
  });

  describe('validateNamespace', () => {
    const callValidateNamespace = (name: string | undefined) => (appNamespaceStep as any).validateNamespace(name);

    it('returns error for empty namespace', async () => {
      const result = await callValidateNamespace('');
      expect(result).toBe(`Can't have an empty namespace.`);
    });

    it('returns error when namespace does not pass regex validation', async () => {
      const result = await callValidateNamespace(invalidFunctionAppNamespace);
      expect(result).toBe(
        'The namespace must start with a letter or underscore, contain only letters, digits, underscores, and periods, and must not end with a period.'
      );
    });

    it('returns undefined for valid namespace', async () => {
      const result = await callValidateNamespace(validFunctionAppNamespace);
      expect(result).toBeUndefined();
    });
  });
});
