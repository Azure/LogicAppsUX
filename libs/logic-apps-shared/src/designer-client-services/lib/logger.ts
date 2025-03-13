import { AssertionErrorCode, AssertionException, guid } from '../../utils/src';
import type { LogEntry, TelemetryEvent } from './logging/logEntry';
import { LogEntryLevel } from './logging/logEntry';

export interface ILoggerService {
  log: (entry: LogEntryWithoutTimestamp) => void;
  startTrace: (eventData: Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>) => string;
  endTrace: (id: string, eventData: Pick<TelemetryEvent, 'status' | 'data'>) => void;
  logErrorWithFormatting: (error: Error | string | unknown, area: string, level?: number) => void;
}

export type LogEntryWithoutTimestamp = Omit<LogEntry, 'timestamp'>;

class Service implements ILoggerService {
  private loggingServices: ILoggerService[];
  private traceIds = new Map<string, { service: number; traceId: string }[]>();
  constructor(services: ILoggerService[]) {
    this.loggingServices = services;
  }

  public log = (entry: LogEntryWithoutTimestamp) => {
    this.loggingServices.forEach((s) => s.log(entry));
  };

  public startTrace = (eventData: Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>) => {
    const traceIds = this.loggingServices.map((s, i) => {
      const id = s.startTrace(eventData);
      return {
        service: i,
        traceId: id,
      };
    });
    const groupId = guid();
    this.traceIds.set(groupId, traceIds);
    return groupId;
  };

  public endTrace = (id: string, eventData: Pick<TelemetryEvent, 'status' | 'data'>) => {
    const group = this.traceIds.get(id);
    this.traceIds.delete(id);
    group?.forEach((tid) => {
      this.loggingServices[tid.service].endTrace(tid.traceId, eventData);
    });
  };

  public logErrorWithFormatting = (error: Error | string | unknown, area: string, level: number = LogEntryLevel.Error): void => {
    const logEntry: LogEntryWithoutTimestamp = {
      level,
      area,
      message: '',
    };
    if (typeof error === 'string') {
      this.log({ ...logEntry, message: error });
    } else if (error instanceof Error) {
      this.log({ ...logEntry, message: error.message, args: [{ stack: error.stack ?? '', cause: error.cause ?? '' }] });
    }
  };
}

let service: ILoggerService;

export const InitLoggerService = (loggerServices: ILoggerService[]): void => {
  service = new Service(loggerServices);
};

export const LoggerService = (): ILoggerService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Logger Service needs to be initialized before using');
  }

  return service;
};
