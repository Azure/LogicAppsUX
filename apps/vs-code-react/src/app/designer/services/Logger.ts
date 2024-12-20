import type { ILoggerService, LogEntry, TelemetryEvent } from '@microsoft/logic-apps-shared';
// import { guid  } from '@microsoft/logic-apps-shared';
type traceStart = Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>;

export class VSCodeLoggerService implements ILoggerService {
  // constructor(private context: LoggerContext) {}

  // private inProgressTraces = new Map<string, { data: traceStart; startTimestamp: number }>();
  public log = (entry: Omit<LogEntry, 'timestamp'>) => {
    console.log('charlie', entry);
    // AzLog([{ ...entry, timestamp: Date.now(), args: [...(entry.args ?? []), this.context] }]);
  };

  public startTrace = (eventData: traceStart): string => {
    console.log('charlie', eventData);
    return 'charlie';

    // const id = guid();
    // const startTimestamp = Date.now();
    // trace([{ ...eventData, timestamp: startTimestamp, actionModifier: 'start', duration: 0, data: { id, context: this.context } }]);
    // this.inProgressTraces.set(id, { data: eventData, startTimestamp });
    // return id;
  };

  public endTrace = (id: string, eventData?: Pick<TelemetryEvent, 'data'> | undefined) => {
    console.log('charlie', id, eventData);
    // const traceData = this.inProgressTraces.get(id);
    // const endTimestamp = Date.now();
    // if (!traceData) {
    //     return;
    // }
    // this.inProgressTraces.delete(id);
    // trace([
    //     {
    //         ...traceData.data,
    //         timestamp: endTimestamp,
    //         actionModifier: 'end',
    //         duration: endTimestamp - traceData.startTimestamp,
    //         data: { ...eventData?.data, context: this.context, id },
    //     },
    // ]);
    // return;
  };
}
