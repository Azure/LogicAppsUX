import type { ILoggerService } from '../logger';
import { BrowserReporter } from './browserLogger';
import type { LogEntry, TelemetryEvent } from './logEntry';

export class DevLogger implements ILoggerService {
  private traceIds = new Map<string, Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>>();

  public log = (entry: Omit<LogEntry, 'timestamp'>) => {
    BrowserReporter.log({
      timestamp: new Date().getMilliseconds(),
      ...entry,
    });
  };

  public startTrace = (_eventData: Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>) => {
    return '';
  };

  public endTrace = (_id: string, _eventData?: Pick<TelemetryEvent, 'data'> | undefined) => {
    return;
  };
}
