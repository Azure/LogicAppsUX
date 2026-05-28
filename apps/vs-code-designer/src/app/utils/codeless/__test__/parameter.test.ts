import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Parameter, WorkflowParameter } from '@microsoft/vscode-extension-logic-apps';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyParametersJson,
  getParameter,
  getParametersJson,
  getStringParameter,
  saveWorkflowParameter,
  saveWorkflowParameterRecords,
} from '../parameter';

const mocks = vi.hoisted(() => ({
  addNewFileInCSharpProject: vi.fn(),
  createJsonFileIfDoesNotExist: vi.fn(),
  getLogicAppProjectRoot: vi.fn(),
  isCSharpProject: vi.fn(),
  parseError: vi.fn(),
  pathExists: vi.fn(),
  pathExistsSync: vi.fn(),
  readFile: vi.fn(),
  writeFormattedJson: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  pathExists: mocks.pathExists,
  pathExistsSync: mocks.pathExistsSync,
  readFile: mocks.readFile,
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  parseError: mocks.parseError,
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...params: string[]) =>
    defaultValue.replace(/\{(\d+)\}/g, (_match, index: string) => params[Number(index)]),
}));

vi.mock('../../detectProjectLanguage', () => ({
  isCSharpProject: mocks.isCSharpProject,
}));

vi.mock('../../fs', () => ({
  writeFormattedJson: mocks.writeFormattedJson,
}));

vi.mock('../common', () => ({
  createJsonFileIfDoesNotExist: mocks.createJsonFileIfDoesNotExist,
}));

vi.mock('../connection', () => ({
  getLogicAppProjectRoot: mocks.getLogicAppProjectRoot,
}));

vi.mock('../updateBuildFile', () => ({
  addNewFileInCSharpProject: mocks.addNewFileInCSharpProject,
}));

describe('codeless parameter utilities', () => {
  const projectPath = 'D:\\workspace\\logic-app';
  const workflowFilePath = `${projectPath}\\workflow.json`;
  const parametersFilePath = path.join(projectPath, 'parameters.json');
  const context = { telemetry: { measurements: {}, properties: {} } } as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addNewFileInCSharpProject.mockResolvedValue(undefined);
    mocks.createJsonFileIfDoesNotExist.mockResolvedValue(undefined);
    mocks.getLogicAppProjectRoot.mockResolvedValue(projectPath);
    mocks.isCSharpProject.mockResolvedValue(false);
    mocks.parseError.mockReturnValue({ message: 'parse failed' });
    mocks.pathExists.mockResolvedValue(false);
    mocks.pathExistsSync.mockReturnValue(false);
    mocks.readFile.mockResolvedValue(Buffer.from(''));
    mocks.writeFormattedJson.mockResolvedValue(undefined);
  });

  describe('getParametersJson', () => {
    it('returns an empty object when parameters.json is missing', async () => {
      await expect(getParametersJson(projectPath)).resolves.toEqual({});

      expect(mocks.pathExists).toHaveBeenCalledWith(parametersFilePath);
      expect(mocks.readFile).not.toHaveBeenCalled();
    });

    it('returns an empty object when parameters.json is empty', async () => {
      mocks.pathExists.mockResolvedValue(true);
      mocks.readFile.mockResolvedValue(Buffer.from(' \r\n\t '));

      await expect(getParametersJson(projectPath)).resolves.toEqual({});
    });

    it('returns parsed parameters when parameters.json contains valid JSON', async () => {
      const parameters: Record<string, Parameter> = {
        accountName: { type: 'String', value: 'contoso' },
      };
      mocks.pathExists.mockResolvedValue(true);
      mocks.readFile.mockResolvedValue(Buffer.from(JSON.stringify(parameters)));

      await expect(getParametersJson(projectPath)).resolves.toEqual(parameters);
    });

    it('throws a localized parse error when parameters.json contains invalid JSON', async () => {
      mocks.pathExists.mockResolvedValue(true);
      mocks.readFile.mockResolvedValue(Buffer.from('{ invalid json }'));

      await expect(getParametersJson(projectPath)).rejects.toThrow('Failed to parse "parameters.json": parse failed.');
    });
  });

  describe('saveWorkflowParameter', () => {
    it('writes non-empty parameters and updates the C# build file when parameters.json is created', async () => {
      const parameters: Record<string, Parameter> = {
        accountName: { type: 'String', value: 'contoso' },
      };
      mocks.isCSharpProject.mockResolvedValue(true);

      await saveWorkflowParameter(context, workflowFilePath, parameters);

      expect(mocks.getLogicAppProjectRoot).toHaveBeenCalledWith(context, workflowFilePath);
      expect(mocks.writeFormattedJson).toHaveBeenCalledWith(parametersFilePath, parameters);
      expect(mocks.isCSharpProject).toHaveBeenCalledWith(context, projectPath);
      expect(mocks.addNewFileInCSharpProject).toHaveBeenCalledWith(context, 'parameters.json', projectPath);
    });

    it('writes non-empty parameters without updating the build file when parameters.json already exists', async () => {
      const parameters: Record<string, Parameter> = {
        accountName: { type: 'String', value: 'contoso' },
      };
      mocks.pathExistsSync.mockReturnValue(true);

      await saveWorkflowParameter(context, workflowFilePath, parameters);

      expect(mocks.writeFormattedJson).toHaveBeenCalledWith(parametersFilePath, parameters);
      expect(mocks.isCSharpProject).not.toHaveBeenCalled();
      expect(mocks.addNewFileInCSharpProject).not.toHaveBeenCalled();
    });

    it('writes empty parameters only when parameters.json already exists', async () => {
      mocks.pathExistsSync.mockReturnValue(true);

      await saveWorkflowParameter(context, workflowFilePath, {});

      expect(mocks.writeFormattedJson).toHaveBeenCalledWith(parametersFilePath, {});
      expect(mocks.isCSharpProject).not.toHaveBeenCalled();
      expect(mocks.addNewFileInCSharpProject).not.toHaveBeenCalled();
    });

    it('does not create parameters.json for empty parameters', async () => {
      await saveWorkflowParameter(context, workflowFilePath, {});

      expect(mocks.writeFormattedJson).not.toHaveBeenCalled();
      expect(mocks.isCSharpProject).not.toHaveBeenCalled();
      expect(mocks.addNewFileInCSharpProject).not.toHaveBeenCalled();
    });
  });

  it('saves workflow parameter records with default values converted to values', async () => {
    const workflowParameterRecords: Record<string, WorkflowParameter> = {
      accountName: { defaultValue: 'contoso', type: 'String' },
      location: { type: 'String', value: 'westus' },
    };

    await saveWorkflowParameterRecords(context, workflowFilePath, workflowParameterRecords);

    expect(mocks.writeFormattedJson).toHaveBeenCalledWith(parametersFilePath, {
      accountName: { type: 'String', value: 'contoso' },
      location: { type: 'String', value: 'westus' },
    });
  });

  it('creates standard parameter objects', () => {
    expect(getParameter('Array', [1, 2])).toEqual({ type: 'Array', value: [1, 2] });
    expect(getStringParameter('contoso')).toEqual({ type: 'String', value: 'contoso' });
  });

  it('delegates empty parameters file creation', async () => {
    await createEmptyParametersJson(projectPath);

    expect(mocks.createJsonFileIfDoesNotExist).toHaveBeenCalledWith(projectPath, 'parameters.json');
  });
});
