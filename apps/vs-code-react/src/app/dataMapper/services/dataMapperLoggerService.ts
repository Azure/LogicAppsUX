import type { ILoggerService, LogMessage } from '@microsoft/logic-apps-data-mapper-v2';
import { guid } from '@microsoft/logic-apps-shared';
import { ExtensionCommand, type MessageToVsix } from '@microsoft/vscode-extension-logic-apps';

export class DataMapperLoggerService implements ILoggerService {
  private sendMsgToVsix: (msg: MessageToVsix) => void;
  private inProgressTraces = new Map<string, { data: Record<string, any>; startTimestamp: number }>();

  constructor(sendMsgToVsix: (msg: MessageToVsix) => void) {
    this.sendMsgToVsix = sendMsgToVsix;
  }

  public trackEvent = (name: string, data: Record<string, any>) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.logTelmetry,
      data: { ...data, timestamp: Date.now(), name },
    });
  };

  public startTrace = (eventName: string): string => {
    const id = guid();
    const startTimestamp = Date.now();
    this.sendMsgToVsix({
      command: ExtensionCommand.logTelmetry,
      data: { timestamp: startTimestamp, actionModifier: 'start', duration: 0, data: { id, eventName } },
    });

    this.inProgressTraces.set(id, { data: { eventName }, startTimestamp });
    return id;
  };

  public endTrace = (id: string, eventName: string, data: LogMessage) => {
    const traceData = this.inProgressTraces.get(id);
    const endTimestamp = Date.now();
    if (!traceData) {
      return;
    }
    this.inProgressTraces.delete(id);
    this.sendMsgToVsix({
      command: ExtensionCommand.logTelmetry,
      data: {
        ...traceData.data,
        timestamp: endTimestamp,
        eventName,
        actionModifier: 'end',
        duration: endTimestamp - traceData.startTimestamp,
        data: { ...data, id },
      },
    });
  };
}
