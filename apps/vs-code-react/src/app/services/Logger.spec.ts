import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
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
        args: [
          'arg1',
          'arg2',
          {
            dataMapperVersion: 2,
            designerVersion: '1.0.0',
          },
        ],
        level: LogEntryLevel.Verbose,
        message: 'test message',
        timestamp: expect.any(Number),
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
        timestamp: expect.any(Number),
        duration: 0,
        data: { id: traceId, context },
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
        timestamp: expect.any(Number),
        duration: expect.any(Number),
        data: { additional: 'info', context, id: traceId },
      }),
    });
  });

  it('should not log if trace id is invalid', () => {
    loggerService.endTrace('invalidId');

    expect(mockSendMsgToVsix).not.toHaveBeenCalled();
  });
});
