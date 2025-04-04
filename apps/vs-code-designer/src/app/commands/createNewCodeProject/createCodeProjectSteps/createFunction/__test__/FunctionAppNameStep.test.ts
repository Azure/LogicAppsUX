import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import * as path from 'path';
import { FunctionAppNameStep } from '../FunctionAppNameStep';
import { ext } from '../../../../../../extensionVariables';
import { localize } from '../../../../../../localize';
import { IProjectWizardContext, ProjectType } from '@microsoft/vscode-extension-logic-apps';

describe('FunctionAppNameStep', () => {
  const existingFunctionAppName = 'Func1';
  const validFunctionAppName = 'Valid_Func_';
  const invalidFunctionAppName = 'Invalid-Func';

  const testLogicAppName = 'LogicApp1';
  const testWorkspaceName = 'TestWorkspace';
  const testWorkspaceFile = path.join('path', 'to', `${testWorkspaceName}.code-workspace`);
  const testWorkspace = {
    folders: [{ name: existingFunctionAppName }],
  };
  let functionAppNameStep: FunctionAppNameStep;
  let testContext: any;
  let existsSyncSpy: any;
  let appendLogSpy: any;
  let readFileSpy: any;

  beforeEach(() => {
    functionAppNameStep = new FunctionAppNameStep();
    testContext = {
      projectType: ProjectType.customCode,
      workspaceCustomFilePath: testWorkspaceFile,
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
    readFileSpy = vi.spyOn(vscode.workspace.fs, 'readFile').mockResolvedValue(Buffer.from(JSON.stringify(testWorkspace)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prompt', () => {
    it('sets context.functionAppName and logs output for valid input', async () => {
      testContext.ui.showInputBox = vi.fn((options: any) => {
        options.testInput = validFunctionAppName;
        return options.validateInput(options.testInput).then((result: string | undefined) => {
          if (result) {
            return Promise.reject(new Error(result));
          }
          return Promise.resolve(options.testInput);
        });
      });
      await functionAppNameStep.prompt(testContext);
      expect(testContext.functionAppName).toBe(validFunctionAppName);
      expect(appendLogSpy).toHaveBeenCalledWith(localize('functionAppNameSet', `Function App project name set to ${validFunctionAppName}`));
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
      await expect(functionAppNameStep.prompt(testContext)).rejects.toThrow(
        localize('emptyFunctionNameError', "Can't have an empty function name.")
      );
    });
  });

  describe('validateFunctionName', () => {
    const callValidateFunctionName = (name: string | undefined, context: IProjectWizardContext) =>
      (functionAppNameStep as any).validateFunctionName(name, context);

    it('returns error for empty function name', async () => {
      const emptyName = '';
      const result = await callValidateFunctionName(emptyName, testContext);
      expect(result).toBe(localize('emptyFunctionNameError', "Can't have an empty function name."));
    });

    it('returns error when function name is same as logic app name', async () => {
      const result = await callValidateFunctionName(testLogicAppName, testContext);
      expect(result).toBe(
        localize('functionNameSameAsProjectNameError', `Can't use the same name for the function and the logic app project.`)
      );
    });

    it('returns error when function name already exists in workspace', async () => {
      const result = await callValidateFunctionName(existingFunctionAppName, testContext);
      expect(result).toBe(localize('functionNameExistsInWorkspaceError', 'A function with this name already exists in the workspace.'));
    });

    it('returns error when function name does not pass regex validation', async () => {
      const result = await callValidateFunctionName(invalidFunctionAppName, testContext);
      expect(result).toBe(
        localize(
          'functionNameInvalidMessage',
          'The function name must start with a letter and can only contain letters, digits, or underscores ("_").'
        )
      );
    });

    it('returns undefined for valid function name', async () => {
      const result = await callValidateFunctionName(validFunctionAppName, testContext);
      expect(result).toBeUndefined();
    });
  });
});
