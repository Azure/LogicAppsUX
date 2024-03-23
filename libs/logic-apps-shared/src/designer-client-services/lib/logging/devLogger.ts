import type { ILoggerService } from '../logger';
import { BrowserReporter } from './browserLogger';
import type { LogEntry, TelemetryEvent } from './logEntry';
import { LogEntryLevel } from './logEntry';
import { guid } from '@microsoft/logic-apps-shared';

export class DevLogger implements ILoggerService {
  private traceIds = new Map<string, { data: Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>; startTime: number }>();

  public log = (entry: Omit<LogEntry, 'timestamp'>) => {
    BrowserReporter.log({
      timestamp: Date.now(),
      ...entry,
    });
  };

  public startTrace = (eventData: Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>) => {
    const timestamp = Date.now();
    BrowserReporter.log({
      level: LogEntryLevel.Trace,
      message: `Trace Started: ${eventData.name} - ${eventData.action} - ${eventData.actionModifier}`,
      timestamp: timestamp,
      area: eventData.source,
    });

    const id = guid();
    this.traceIds.set(id, {
      data: eventData,
      startTime: timestamp,
    });
    return id;
  };

  public endTrace = (id: string, eventData: Pick<TelemetryEvent, 'status' | 'data'>) => {
    const timestamp = Date.now();
    const trace = this.traceIds.get(id);

    if (!trace) {
      return;
    }
    BrowserReporter.log({
      level: LogEntryLevel.Trace,
      message: `Trace Ended [${eventData.status}]: [${timestamp - trace?.startTime}ms]  ${trace.data.name} - ${trace.data.action} - ${
        trace.data.actionModifier
      }`,
      timestamp: timestamp,
      area: trace.data.source,
      args: [eventData.data],
    });
  };
}
