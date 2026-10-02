import * as vscode from 'vscode';
import { disposeDataMapperLogger, errorCategory, getDataMapperLogger } from '../src/logger';
import { MapEditorProvider } from '../src/mapEditorProvider';
import { CompilerWorkerClient } from '../src/worker/compilerWorkerClient';
import { outputChannel, window as mockWindow } from './__mocks__/vscode';
import { activate } from '../src/extension';

describe('dedicated Data Mapper log channel', () => {
  beforeEach(() => {
    disposeDataMapperLogger();
    jest.clearAllMocks();
    mockWindow.createOutputChannel.mockReturnValue(outputChannel);
  });
  afterEach(disposeDataMapperLogger);

  test('activation registers Show Data Mapper Logs and owns channel disposal', () => {
    const subscriptions: vscode.Disposable[] = [];
    activate({ subscriptions } as vscode.ExtensionContext);
    const command = jest.mocked(vscode.commands.registerCommand).mock.calls.find(([name]) => name === 'biztalkDataMapper.showLogs');
    expect(command).toBeDefined();
    command?.[1]();
    expect(outputChannel.show).toHaveBeenCalledWith(true);
    expect(mockWindow.createOutputChannel).toHaveBeenCalledTimes(1);
    subscriptions.at(-1)?.dispose();
    expect(outputChannel.dispose).toHaveBeenCalledTimes(1);
  });

  test('editor and multiple workers share one channel; worker disposal does not dispose it', () => {
    const context = {} as vscode.ExtensionContext;
    new MapEditorProvider(context);
    const first = new CompilerWorkerClient(context);
    const second = new CompilerWorkerClient(context);
    const logger = getDataMapperLogger();
    expect(mockWindow.createOutputChannel).toHaveBeenCalledTimes(1);
    expect(mockWindow.createOutputChannel).toHaveBeenCalledWith('Logic App Data Mapper', { log: true });
    first.dispose();
    second.dispose();
    expect(outputChannel.dispose).not.toHaveBeenCalled();
    expect(getDataMapperLogger()).toBe(logger);
    disposeDataMapperLogger();
    expect(outputChannel.dispose).toHaveBeenCalledTimes(1);
    getDataMapperLogger();
    expect(mockWindow.createOutputChannel).toHaveBeenCalledTimes(2);
  });

  test('error classification omits payload-bearing messages, stacks, and arbitrary codes', () => {
    const error = Object.assign(new Error('<secret>payload</secret>'), { code: 'ENOENT' });
    expect(errorCategory(error)).toBe('ENOENT');
    error.code = '<secret>payload</secret>';
    expect(errorCategory(error)).toBe('Error');
    expect(errorCategory(new SyntaxError('payload'))).toBe('SyntaxError');
    expect(errorCategory('password=payload')).toBe('Error');
  });
});
