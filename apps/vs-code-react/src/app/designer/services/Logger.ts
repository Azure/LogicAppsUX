import { guid, type ILoggerService, type LogEntry, type TelemetryEvent } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import type { WebviewApi } from 'vscode-webview';
type traceStart = Pick<TelemetryEvent, 'action' | 'actionModifier' | 'name' | 'source'>;

interface LoggerContext {
  designerVersion: string;
}

export class VSCodeLoggerService implements ILoggerService {
  private context: LoggerContext;
  private vscodeContext: WebviewApi<unknown>;
  private inProgressTraces = new Map<string, { data: traceStart; startTimestamp: number }>();

  constructor(context: LoggerContext, vscodeContext: WebviewApi<unknown>) {
    this.context = context;
    this.vscodeContext = vscodeContext;
  }

  public log = (entry: Omit<LogEntry, 'timestamp'>) => {
    this.vscodeContext.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: { ...entry, timestamp: Date.now(), args: [...(entry.args ?? []), this.context] },
    });
  };

  public startTrace = (eventData: traceStart): string => {
    const id = guid();
    const startTimestamp = Date.now();
    this.vscodeContext.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: { ...eventData, timestamp: startTimestamp, actionModifier: 'start', duration: 0, data: { id, context: this.context } },
    });
    this.inProgressTraces.set(id, { data: eventData, startTimestamp });
    return id;
  };

  public endTrace = (id: string, eventData?: Pick<TelemetryEvent, 'data'> | undefined) => {
    const traceData = this.inProgressTraces.get(id);
    const endTimestamp = Date.now();
    if (!traceData) {
      return;
    }
    this.inProgressTraces.delete(id);
    this.vscodeContext.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: {
        ...traceData.data,
        timestamp: endTimestamp,
        actionModifier: 'end',
        duration: endTimestamp - traceData.startTimestamp,
        data: { ...eventData?.data, context: this.context, id },
      },
    });
  };
}
