import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataMapperLoggerService } from './dataMapperLoggerService';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

describe('DataMapperLoggerService', () => {
  let mockSendMsgToVsix: ReturnType<typeof vi.fn>;
  let logger: DataMapperLoggerService;

  beforeEach(() => {
    mockSendMsgToVsix = vi.fn();
    logger = new DataMapperLoggerService(mockSendMsgToVsix, {
      designerVersion: 'testVersion',
      dataMapperVersion: 2,
    });
    vi.useFakeTimers();
    vi.setSystemTime(12345678);
  });

  it('tracks an event properly', () => {
    logger.trackEvent('testEvent', { foo: 'bar' });
    expect(mockSendMsgToVsix).toHaveBeenCalledWith({
      command: ExtensionCommand.logTelemetry,
      data: {
        foo: 'bar',
        timestamp: 12345678,
        name: 'testEvent',
        context: {
          designerVersion: 'testVersion',
          dataMapperVersion: 2,
        },
      },
    });
  });

  it('starts a trace and returns an id', () => {
    const id = logger.startTrace('traceEvent');
    expect(id).toBeTruthy();
    expect(mockSendMsgToVsix).toHaveBeenCalledWith({
      command: ExtensionCommand.logTelemetry,
      data: {
        timestamp: 12345678,
        actionModifier: 'start',
        duration: 0,
        data: {
          id,
          eventName: 'traceEvent',
          context: {
            designerVersion: 'testVersion',
            dataMapperVersion: 2,
          },
        },
      },
    });
  });

  it('ends a trace properly', () => {
    const id = logger.startTrace('traceEvent');
    logger.endTrace(id, 'traceEventEnd', { message: 'data' });
    expect(mockSendMsgToVsix).toHaveBeenCalledTimes(2);
    expect(mockSendMsgToVsix).toHaveBeenNthCalledWith(2, {
      command: ExtensionCommand.logTelemetry,
      data: {
        eventName: 'traceEventEnd',
        timestamp: 12345678,
        actionModifier: 'end',
        duration: 0,
        data: {
          id,
          custom: 'data',
        },
        context: {
          designerVersion: 'testVersion',
          dataMapperVersion: 2,
        },
      },
    });
  });

  it('does nothing if ending a non-existent trace', () => {
    logger.endTrace('fakeId', 'fakeEvent', { message: 'data' });
    expect(mockSendMsgToVsix).not.toHaveBeenCalled();
  });
});
