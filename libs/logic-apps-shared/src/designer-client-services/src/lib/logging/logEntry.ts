export type LogEntry = {
  /**
   * The timestamp of the entry.
   */
  readonly timestamp: number;

  /**
   * The level for the entry.
   */
  readonly level: number;

  /**
   * The area for the entry.
   */
  readonly area: string;

  /**
   * The message to be logged.
   */
  readonly message: string;

  /**
   * The trace Id correlated to the log entry
   */
  readonly traceId?: string;

  /**
   * Any error accompanying the log entry
   */
  readonly error?: Error;

  /**
   * Any code accompanying error and warning-style log entries.
   */
  readonly code?: number;

  /**
   * Any additional arguments to be included in the log entry.
   */
  readonly args?: ReadonlyArray<any>;
};

export const LogEntryLevel = {
  /**
   * Debug level.
   */
  Debug: -1,

  /**
   * Verbose level.
   */
  Verbose: 0,

  /**
   * Warning level.
   */
  Warning: 1,

  /**
   * Error level.
   */
  Error: 2,

  /**
   * Trace level.
   */
  Trace: 3,
};

/**
 * A telemetry event to be sent to the server.
 */
export type TelemetryEvent = {
  /**
   * The timestamp of the event.
   */
  readonly timestamp: number;

  /**
   * The status of the operation being traced.
   */
  readonly status: Status | string;

  /**
   * The source of the telemetry data e.g. navigation, blade.
   */
  readonly source: string;

  /**
   * The action being recorded.
   */
  readonly action: string;

  /**
   * A modifier for the action.
   */
  readonly actionModifier?: string;

  /**
   * The elapsed time in milliseconds for the event being recorded (optional).
   */
  readonly duration?: number;

  /**
   * A name associated with the event or item that was the target of the event (optional).
   */
  readonly name?: string;

  /**
   * Any additional information for the event being recorded (optional).
   */
  readonly data?: any;
};

export const Status = {
  Success: 'Success',
  Failure: 'Failure',
  Warning: 'Warning',
  Completed: 'Complete',
} as const;
export type Status = (typeof Status)[keyof typeof Status];
