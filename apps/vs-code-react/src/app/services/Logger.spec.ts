import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { LogEntryLevel } from '@microsoft/logic-apps-shared';
import { LoggerService } from './Logger';

describe('DataMapperLoggerService', () => {
  const mockSendMsgToVsix = vi.fn();
  const context = { designerVersion: '1.0.0', dataMapperVersion: 2 };
  const loggerService = new LoggerService(mockSendMsgToVsix, context);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should log telemetry event', () => {
    loggerService.log({
      level: LogEntryLevel.Verbose,
      area: 'testEvent',
      message: 'test message',
      args: ['arg1', 'arg2'],
    });

    expect(mockSendMsgToVsix).toHaveBeenCalledWith({
      command: 'logTelemetry',
      data: {
        area: 'testEvent',
        args: JSON.stringify(['arg1', 'arg2', context]),
        level: String(LogEntryLevel.Verbose),
        message: 'test message',
        timestamp: expect.any(String),
      },
    });
  });

  it('should start a trace and return an id', () => {
    const eventData = { action: 'testAction', actionModifier: 'start', name: 'testTrace', source: 'testSource' };
    const traceId = loggerService.startTrace(eventData);

    expect(traceId).toBeDefined();
    expect(mockSendMsgToVsix).toHaveBeenCalledWith({
      command: ExtensionCommand.logTelemetry,
      data: expect.objectContaining({
        action: 'testAction',
        actionModifier: 'start',
        name: 'testTrace',
        source: 'testSource',
        timestamp: expect.any(String),
        duration: '0',
        data: JSON.stringify({ id: traceId, context }),
      }),
    });
  });

  it('should end a trace and log the duration', () => {
    const eventData = { action: 'testAction', actionModifier: 'start', name: 'testTrace', source: 'testSource' };
    const traceId = loggerService.startTrace(eventData);

    // Simulate some delay
    vi.advanceTimersByTime(1000);

    loggerService.endTrace(traceId, { data: { additional: 'info' } });

    expect(mockSendMsgToVsix).toHaveBeenCalledWith({
      command: ExtensionCommand.logTelemetry,
      data: expect.objectContaining({
        action: 'testAction',
        actionModifier: 'end',
        name: 'testTrace',
        source: 'testSource',
        timestamp: expect.any(String),
        duration: expect.any(String),
        data: JSON.stringify({ additional: 'info', context, id: traceId }),
      }),
    });
  });

  it('should not log if trace id is invalid', () => {
    loggerService.endTrace('invalidId');

    expect(mockSendMsgToVsix).not.toHaveBeenCalled();
  });

  it('does not send raw error details as telemetry properties', () => {
    loggerService.log({
      level: LogEntryLevel.Error,
      area: 'createConnection',
      message: 'Unable to connect',
      error: new Error('GLASSWING_TEST_ONLY_PASSWORD'),
    });

    expect(mockSendMsgToVsix).toHaveBeenCalledWith({
      command: ExtensionCommand.logTelemetry,
      data: expect.objectContaining({
        error: JSON.stringify({ name: 'Error' }),
        message: 'Unable to connect',
      }),
    });
    expect(JSON.stringify(mockSendMsgToVsix.mock.calls)).not.toContain('GLASSWING_TEST_ONLY_PASSWORD');
  });

  it('does not throw when telemetry data is circular', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    expect(() =>
      loggerService.log({
        level: LogEntryLevel.Error,
        area: 'createConnection',
        message: 'Unable to connect',
        args: [circular],
      })
    ).not.toThrow();
    expect(mockSendMsgToVsix).toHaveBeenCalledWith({
      command: ExtensionCommand.logTelemetry,
      data: expect.objectContaining({
        args: '[Unable to serialize telemetry value]',
      }),
    });
  });
});
