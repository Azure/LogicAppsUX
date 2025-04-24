import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import * as path from 'path';
import { FunctionNameStep } from '../FunctionNameStep';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { IProjectWizardContext, ProjectType } from '@microsoft/vscode-extension-logic-apps';

describe('FunctionNameStep', () => {
  const existingFunctionName = 'Func1';
  const validFunctionName = 'Valid_Func_';
  const invalidFunctionName = 'Invalid-Func';

  const testLogicAppName = 'LogicApp1';
  const testFunctionFolderPath = path.join('path', 'to', existingFunctionName);
  const testFunctionFolderDirectory: [string, vscode.FileType][] = [
    [`${existingFunctionName}.cs`, vscode.FileType.File],
    [`${existingFunctionName}.csproj`, vscode.FileType.File],
    [`${existingFunctionName}.sln`, vscode.FileType.File],
    ['.vscode', vscode.FileType.Directory],
  ];
  let functionNameStep: FunctionNameStep;
  let testContext: any;
  let existsSyncSpy: any;
  let appendLogSpy: any;
  let readFileSpy: any;

  beforeEach(() => {
    functionNameStep = new FunctionNameStep();
    testContext = {
      projectType: ProjectType.customCode,
      functionFolderPath: testFunctionFolderPath,
      logicAppName: testLogicAppName,
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
    existsSyncSpy = vi.spyOn(fse, 'existsSync').mockReturnValue(true);
    readFileSpy = vi.spyOn(vscode.workspace.fs, 'readDirectory').mockResolvedValue(testFunctionFolderDirectory);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prompt', () => {
    it('sets context.customCodeFunctionName and logs output for valid input', async () => {
      testContext.ui.showInputBox = vi.fn((options: any) => {
        options.testInput = validFunctionName;
        return options.validateInput(options.testInput).then((result: string | undefined) => {
          if (result) {
            return Promise.reject(new Error(result));
          }
          return Promise.resolve(options.testInput);
        });
      });
      await functionNameStep.prompt(testContext);
      expect(testContext.customCodeFunctionName).toBe(validFunctionName);
      expect(appendLogSpy).toHaveBeenCalledWith(localize('functionNameSet', `Function name set to ${validFunctionName}`));
    });

    it('rejects when input is invalid (empty)', async () => {
      const emptyName = '';
      testContext.ui.showInputBox = vi.fn((options: any) => {
        options.testInput = emptyName;
        return options.validateInput(options.testInput).then((result: string | undefined) => {
          if (result) {
            return Promise.reject(new Error(result));
          }
          return Promise.resolve(emptyName);
        });
      });
      await expect(functionNameStep.prompt(testContext)).rejects.toThrow(
        localize('emptyFunctionNameError', `Can't have an empty function name.`)
      );
    });
  });

  describe('validateFunctionName', () => {
    const callValidateFunctionName = (name: string | undefined, context: IProjectWizardContext) =>
      (functionNameStep as any).validateFunctionName(name, context);

    it('returns error for empty function name', async () => {
      const emptyName = '';
      const result = await callValidateFunctionName(emptyName, testContext);
      expect(result).toBe(localize('emptyFunctionNameError', `Can't have an empty function name.`));
    });

    it('returns error when function name is same as logic app name', async () => {
      const result = await callValidateFunctionName(testLogicAppName, testContext);
      expect(result).toBe(
        localize('functionNameSameAsProjectNameError', `Can't use the same name for the function and the logic app project.`)
      );
    });

    it('returns error when function name already exists in functions project', async () => {
      const result = await callValidateFunctionName(existingFunctionName, testContext);
      expect(result).toBe(
        localize('functionNameExistsInFunctionsProjectError', 'A function with this name already exists in the functions project.')
      );
    });

    it('returns error when function name does not pass regex validation', async () => {
      const result = await callValidateFunctionName(invalidFunctionName, testContext);
      expect(result).toBe(
        localize(
          'functionNameInvalidMessage',
          'The function name must start with a letter and can only contain letters, digits, or underscores ("_").'
        )
      );
    });

    it('returns undefined for valid function name', async () => {
      const result = await callValidateFunctionName(validFunctionName, testContext);
      expect(result).toBeUndefined();
    });
  });
});
