import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import * as path from 'path';
import { LogicAppNameStep } from '../LogicAppNameStep';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';

describe('SetLogicAppName', () => {
  const testLogicAppName = 'LogicApp';
  const testWorkspaceName = 'TestWorkspace';
  const testWorkspaceFile = path.join('path', 'to', `${testWorkspaceName}.code-workspace`);
  const testWorkspace = {
    folders: [{ name: testLogicAppName }],
  };
  let step: LogicAppNameStep;
  let testContext: any;
  let existsSyncSpy: any;
  let readFileSpy: any;
  let appendLogSpy: any;

  beforeEach(() => {
    step = new LogicAppNameStep();
    testContext = {
      projectType: ProjectType.logicApp,
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
    existsSyncSpy = vi.spyOn(fse, 'existsSync').mockReturnValue(false);
    readFileSpy = vi.spyOn(vscode.workspace.fs, 'readFile').mockResolvedValue(Buffer.from(JSON.stringify(testWorkspace)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldPrompt', () => {
    it('returns true when projectType is defined', () => {
      expect(step.shouldPrompt(testContext)).toBe(true);
    });

    it('returns false when projectType is undefined', () => {
      testContext.projectType = undefined;
      expect(step.shouldPrompt(testContext)).toBe(false);
    });
  });

  describe('prompt', () => {
    it('sets context.logicAppName and logs output for valid input', async () => {
      const validName = 'ValidProject';
      testContext.ui.showInputBox = vi.fn((options: any) => {
        options.testInput = validName;
        return options.validateInput(options.testInput).then((result: string | undefined) => {
          if (result) {
            return Promise.reject(new Error(result));
          }
          return Promise.resolve(validName);
        });
      });
      await step.prompt(testContext);
      expect(testContext.logicAppName).toBe(validName);
      expect(appendLogSpy).toHaveBeenCalledWith(localize('logicAppNameSet', `Logic App project name set to ${validName}`));
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
      await expect(step.prompt(testContext)).rejects.toThrow(localize('logicAppNameEmpty', 'Logic app name cannot be empty'));
    });
  });

  describe('validateLogicAppName (private method)', () => {
    const callValidate = (name: string | undefined, context: any) => (step as any).validateLogicAppName(name, context);

    it('returns error message when name is empty', async () => {
      const res = await callValidate('', testContext);
      expect(res).toBe(localize('logicAppNameEmpty', 'Logic app name cannot be empty'));
    });

    it('returns error when name already exists in the workspace file', async () => {
      existsSyncSpy.mockReturnValue(true);

      const res = await callValidate(testLogicAppName, testContext);
      expect(res).toBe(localize('logicAppNameExists', 'A project with this name already exists in the workspace'));
    });

    it('returns error when name does not pass regex validation', async () => {
      const invalidName = '1InvalidName';
      const res = await callValidate(invalidName, testContext);
      expect(res).toBe(
        localize('logicAppNameInvalidMessage', 'Logic app name must start with a letter and can only contain letters, digits, "_" and "-".')
      );
    });

    it('returns undefined for a valid name', async () => {
      const validName = 'My_Valid-Name123';
      const res = await callValidate(validName, testContext);
      expect(res).toBeUndefined();
    });
  });
});
