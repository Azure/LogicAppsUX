import type { LogEntry, TelemetryEvent } from './logging/logEntry';
import { AssertionErrorCode, AssertionException, guid } from '@microsoft/logic-apps-shared';

export interface ILoggerService {
  log: (entry: Omit<LogEntry, 'timestamp'>) => void;
  startTrace: (eventData: Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>) => string;
  endTrace: (id: string, eventData: Pick<TelemetryEvent, 'status' | 'data'>) => void;
}

class Service implements ILoggerService {
  private loggingServices: ILoggerService[];
  private traceIds = new Map<string, { service: number; traceId: string }[]>();
  constructor(services: ILoggerService[]) {
    this.loggingServices = services;
  }

  public log = (entry: Omit<LogEntry, 'timestamp'>) => {
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
