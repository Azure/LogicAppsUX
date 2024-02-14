import { LoggerService, InitLoggerService } from '../logger';
import type { LogEntry } from '../logging/logEntry';
import { LogEntryLevel } from '../logging/logEntry';

describe('lib/designer-client-services/logger', () => {
  it('should call mock log fn when service is called', () => {
    const mockLoggingService = {
      log: jest.fn(),
      startTrace: jest.fn(),
      endTrace: jest.fn(),
    };
    InitLoggerService([mockLoggingService]);
    const entry: LogEntry = {
      timestamp: 0,
      level: LogEntryLevel.Verbose,
      area: 'test',
      message: 'test message',
    };
    LoggerService().log(entry);
    expect(mockLoggingService.log).toHaveBeenCalledWith(entry);
  });

  it('should call mock log fn for all services when service is called', () => {
    const mockLoggingService1 = {
      log: jest.fn(),
      startTrace: jest.fn(),
      endTrace: jest.fn(),
    };
    const mockLoggingService2 = {
      log: jest.fn(),
      startTrace: jest.fn(),
      endTrace: jest.fn(),
    };
    InitLoggerService([mockLoggingService1, mockLoggingService2]);

    const entry: LogEntry = {
      timestamp: 0,
      level: LogEntryLevel.Verbose,
      area: 'test',
      message: 'test message',
    };
    LoggerService().log(entry);
    expect(mockLoggingService1.log).toHaveBeenCalledWith(entry);
    expect(mockLoggingService2.log).toHaveBeenCalledWith(entry);
  });

  it('should start trace and return guid', () => {
    const mockLoggingService1 = {
      log: jest.fn(),
      startTrace: jest.fn(),
      endTrace: jest.fn(),
    };
    InitLoggerService([mockLoggingService1]);

    const entry = {
      source: 'testsource',
      action: 'testAction',
    };

    LoggerService().startTrace(entry);

    expect(mockLoggingService1.startTrace).toHaveBeenCalledWith(entry);
  });

  it('should start and end same trace', () => {
    const innerGuid = 'innerguid';
    const mockLoggingService1 = {
      log: jest.fn(),
      startTrace: jest.fn().mockReturnValue(innerGuid),
      endTrace: jest.fn(),
    };
    InitLoggerService([mockLoggingService1]);

    const entry = {
      source: 'testsource',
      action: 'testAction',
    };

    const g = LoggerService().startTrace(entry);
    LoggerService().endTrace(g, { data: 'test', status: 'someStatus' });
    expect(mockLoggingService1.endTrace).toHaveBeenCalledWith(innerGuid, { data: 'test', status: 'someStatus' });
  });

  it('should start and end same multiple traces successfully if multipleLoggers', () => {
    const innerGuid1 = 'innerguid1';
    const innerGuid2 = 'innerguid2';
    const mockLoggingService1 = {
      log: jest.fn(),
      startTrace: jest.fn().mockReturnValue(innerGuid1),
      endTrace: jest.fn(),
    };
    const mockLoggingService2 = {
      log: jest.fn(),
      startTrace: jest.fn().mockReturnValue(innerGuid2),
      endTrace: jest.fn(),
    };
    InitLoggerService([mockLoggingService1, mockLoggingService2]);

    const entry = {
      source: 'testsource',
      action: 'testAction',
    };

    const g = LoggerService().startTrace(entry);
    LoggerService().endTrace(g, { data: 'test', status: 'someStatus' });
    expect(mockLoggingService1.endTrace).toHaveBeenCalledWith(innerGuid1, { data: 'test', status: 'someStatus' });
    expect(mockLoggingService2.endTrace).toHaveBeenCalledWith(innerGuid2, { data: 'test', status: 'someStatus' });
  });
});
