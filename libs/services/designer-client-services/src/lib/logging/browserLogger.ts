import type { LogEntry } from './logEntry';
import { LogEntryLevel } from './logEntry';

export type logType = 'error' | 'warn' | 'info' | 'debug' | 'verbose';
const convertLevelToType = (level: number): logType => {
  switch (level) {
    case LogEntryLevel.Debug:
      return 'debug';
    case LogEntryLevel.Error:
      return 'error';
    case LogEntryLevel.Warning:
      return 'warn';
    case LogEntryLevel.Verbose:
      return 'verbose';
    default:
      return 'info';
  }
};
export class BrowserReporter {
  private static defaultColor = '#7f8c8d';
  private static levelColorMap: Record<number, string> = {
    [LogEntryLevel.Error]: '#c0392b', // Red
    [LogEntryLevel.Warning]: '#f39c12', // Yellow
    [LogEntryLevel.Debug]: '#00BCD4', // Cyan
  };

  public static log(logObj: LogEntry) {
    let consoleLogFn = console.info;
    if (logObj.level === LogEntryLevel.Error) {
      consoleLogFn = console.error;
    }
    if (logObj.level === LogEntryLevel.Warning) {
      consoleLogFn = console.warn;
    }
    if (logObj.level === LogEntryLevel.Debug) {
      consoleLogFn = console.debug;
    }

    // Type
    const type = convertLevelToType(logObj.level);

    // Tag
    const tag = logObj.area ?? '';

    // Styles
    const color = BrowserReporter.levelColorMap[logObj.level] || BrowserReporter.defaultColor;
    const style = `
        background: ${color};
        border-radius: 0.5em;
        color: white;
        font-weight: bold;
        padding: 2px 0.5em;
      `;

    const badge = `%c${[tag, type].filter(Boolean).join(':')}`;

    // Log to the console
    const timestamp = '[' + new Date().toLocaleTimeString() + '] ';
    consoleLogFn(badge, style, timestamp, logObj.message, logObj);
  }
}
