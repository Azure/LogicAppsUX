import * as childProcess from 'child_process';
import type * as vscode from 'vscode';
import { CompilerWorkerClient } from '../src/worker/compilerWorkerClient';
import { disposeDataMapperLogger } from '../src/logger';
import { outputChannel } from './__mocks__/vscode';

jest.mock('child_process', () => {
  const { EventEmitter } = jest.requireActual('events');
  const { PassThrough } = jest.requireActual('stream');
  return {
    spawn: jest.fn(() =>
      Object.assign(new EventEmitter(), {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        exitCode: null,
        killed: false,
        kill: jest.fn(),
      })
    ),
  };
});

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

describe('compiler worker logging', () => {
  let client: CompilerWorkerClient;
  beforeEach(() => {
    disposeDataMapperLogger();
    jest.clearAllMocks();
    client = new CompilerWorkerClient({
      asAbsolutePath: (file: string) => file,
      extensionPath: '.',
    } as vscode.ExtensionContext);
  });
  afterEach(() => {
    const worker = jest.mocked(childProcess.spawn).mock.results[0]?.value;
    worker?.emit('exit', 0, null);
    client.dispose();
    disposeDataMapperLogger();
    jest.useRealTimers();
  });

  test('records lifecycle, request IDs and timing without stdout/stderr payloads', async () => {
    const pending = client.testMap({ xslt: 'private-xslt', inputXml: 'private-input' });
    const worker = jest.mocked(childProcess.spawn).mock.results[0].value;
    worker.stdout.write('private-invalid-response\n');
    worker.stderr.write('private-stderr');
    worker.stdout.write(`${JSON.stringify({ id: 1, result: { protocolVersion: 1 } })}\n`);
    await flush();
    worker.stdout.write(`${JSON.stringify({ id: 2, result: { outputXml: 'private-output', diagnostics: [] } })}\n`);
    expect(await pending).toEqual({ outputXml: 'private-output', diagnostics: [] });
    expect(outputChannel.info).toHaveBeenCalledWith('Compiler worker ready (protocol version 1).');
    expect(outputChannel.info).toHaveBeenCalledWith(expect.stringContaining('Worker request #2 testMap completed'));
    expect(outputChannel.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid compiler worker response'));
    const logs = JSON.stringify([...outputChannel.info.mock.calls, ...outputChannel.warn.mock.calls]);
    expect(logs).not.toContain('private-');
  });

  test('logs worker errors without leaking response details', async () => {
    const pending = client.testMap({ xslt: '', inputXml: '' });
    const worker = jest.mocked(childProcess.spawn).mock.results[0].value;
    worker.stdout.write(`${JSON.stringify({ id: 1, result: { protocolVersion: 1 } })}\n`);
    await flush();
    worker.stdout.write(
      `${JSON.stringify({ id: 2, error: { code: 'TRANSFORM_FAILED', message: 'private-message', details: 'private-details' } })}\n`
    );
    await expect(pending).rejects.toThrow('private-message');
    expect(outputChannel.error).toHaveBeenCalledWith(expect.stringContaining('TRANSFORM_FAILED'));
    expect(JSON.stringify(outputChannel.error.mock.calls)).not.toContain('private-');
  });

  test('logs timed out requests and terminates the worker', async () => {
    jest.useFakeTimers();
    const pending = client.testMap({ xslt: '', inputXml: '' });
    const rejection = expect(pending).rejects.toThrow('timed out');
    const worker = jest.mocked(childProcess.spawn).mock.results[0].value;
    worker.stdout.write(`${JSON.stringify({ id: 1, result: { protocolVersion: 1 } })}\n`);
    await flush();
    await jest.advanceTimersByTimeAsync(60_000);
    await rejection;
    expect(outputChannel.error).toHaveBeenCalledWith(expect.stringContaining('testMap timed out'));
    expect(worker.kill).toHaveBeenCalled();
  });
});
