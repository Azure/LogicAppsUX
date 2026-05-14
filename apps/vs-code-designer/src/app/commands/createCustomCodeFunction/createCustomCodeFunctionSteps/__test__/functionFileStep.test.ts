import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import { window } from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ext } from '../../../../../extensionVariables';
import { FunctionFileStep } from '../functionFileStep';

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('vscode', () => ({
  window: {
    showErrorMessage: vi.fn(),
  },
}));

vi.mock('../../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

describe('FunctionFileStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
    vi.mocked(fs.readFile).mockResolvedValue('namespace <%= namespace %> { public class <%= methodName %> {} }');
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  it('should always prompt', () => {
    expect(new FunctionFileStep().shouldPrompt()).toBe(true);
  });

  it('should log and return when the functions folder is missing', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    const context = createContext();

    await new FunctionFileStep().prompt(context);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('is not a valid directory'));
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should log and return when the functions path is not a directory', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as any);
    const context = createContext();

    await new FunctionFileStep().prompt(context);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('is not a valid directory'));
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should create a .NET 8 function file from the template', async () => {
    vi.mocked(fs.pathExists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const context = createContext();

    await new FunctionFileStep().prompt(context);

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionsFileNet8'), 'utf-8');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ProcessOrder.cs'),
      'namespace Contoso.Functions { public class ProcessOrder {} }'
    );
  });

  it('should create a .NET Framework function file from the template', async () => {
    vi.mocked(fs.pathExists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const context = createContext({ targetFramework: TargetFramework.NetFx });

    await new FunctionFileStep().prompt(context);

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionsFileNetFx'), 'utf-8');
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('ProcessOrder.cs'), expect.any(String));
  });

  it('should not overwrite an existing function file', async () => {
    vi.mocked(fs.pathExists).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const context = createContext();

    await new FunctionFileStep().prompt(context);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('already exists in the target functions project'));
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    workspacePath: 'C:\\workspace',
    functionAppName: 'Functions',
    customCodeFunctionName: 'ProcessOrder',
    functionAppNamespace: 'Contoso.Functions',
    targetFramework: TargetFramework.Net8,
    ...overrides,
  } as any;
}
