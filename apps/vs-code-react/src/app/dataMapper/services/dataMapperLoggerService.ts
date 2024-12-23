import type { ILoggerService, LogMessage } from '@microsoft/logic-apps-data-mapper-v2';

export class DataMapperLoggerService implements ILoggerService {
  public trackEvent = (name: string, data: Record<string, any>) => {
    console.log(`Track Event: ${name}`, data);
  };

  public startTrace = (eventName: string) => {
    console.log(`Start Trace: ${eventName}`);
    return '';
  };

  public endTrace = (id: string, eventName: string, data: LogMessage) => {
    console.log(`End Trace: ${id} - ${eventName} - ${data}`);
  };
}
