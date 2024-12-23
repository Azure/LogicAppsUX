import { AssertionErrorCode, AssertionException, guid } from '@microsoft/logic-apps-shared';
import type { LogCategory } from 'utils/Logging.Utils';

export interface LogMessage {
  message: string;
  data?: any;
}

export interface ILoggerService {
  trackEvent: (name: string, data: any) => void;
  startTrace: (eventName: string) => string;
  endTrace: (id: string, eventName: string, data: LogMessage) => void;
}

export interface IDataMapperLoggerService {
  logToConsole: boolean;
  startTrackEvent: (eventName: string) => void;
  stopTrackEvent: (id: string, eventName: string, data: LogMessage) => void;
  log: (category: LogCategory, id: string, data: LogMessage) => void;
  error: (category: LogCategory, id: string, data: LogMessage) => void;
  warn: (category: LogCategory, id: string, data: LogMessage) => void;
  debug: (category: LogCategory, data: LogMessage) => void;
}

class DataMapperLoggerService implements IDataMapperLoggerService {
  private loggingService: ILoggerService;
  private traceIds = new Map<string, string>();
  private dmPrefix = 'data-mapper-vscode-extension';

  private _logToAppInsights = process.env.NODE_ENV !== 'development';
  public logToConsole = process.env.NODE_ENV !== 'production';

  constructor(service: ILoggerService) {
    this.loggingService = service;
  }

  private trackEvent(name: string, data: any) {
    const properties = this._getTrackingData(data);
    this.loggingService.trackEvent(name, properties);
  }

  public startTrace = (eventName: string) => {
    const traceId = this.loggingService.startTrace(eventName);
    const groupId = guid();
    this.traceIds.set(groupId, traceId);
    return groupId;
  };

  public endTrace = (id: string, eventName: string, data: LogMessage) => {
    const traceId = this.traceIds.get(id);
    if (traceId) {
      this.traceIds.delete(id);
      this.loggingService.endTrace(traceId, eventName, data);
    }
  };

  public startTrackEvent(eventName: string) {
    if (this._logToAppInsights) {
      this.loggingService.startTrace(eventName);
    }

    if (this.logToConsole) {
      console.log(`${this._getTime()} [Start Track Event] - ${eventName}`);
    }
  }

  public stopTrackEvent(id: string, eventName: string, data: LogMessage) {
    this._validateData(data);
    if (this._logToAppInsights) {
      this.loggingService.endTrace(id, eventName, data);
    }

    if (this.logToConsole) {
      console.log(`${this._getTime()} [Stop Track Event] - ${eventName}`);
    }
  }

  public log(category: LogCategory, id: string, data: LogMessage) {
    this._validateCategory(category);
    this._validateId(id);
    this._validateData(data);

    const logId = `${this.dmPrefix}/log/${category}/${id}`;

    if (this._logToAppInsights) {
      this.trackEvent(logId, data);
    }

    if (this.logToConsole) {
      console.log(`%c[${category}] - ${this._getDataString(data)}`, 'color: #ff8c00');
    }
  }

  public error = (category: LogCategory, id: string, data: LogMessage) => {
    this._validateCategory(category);
    this._validateId(id);
    this._validateData(data);
    const errorId = `${this.dmPrefix}/errors/${category}/${id}`;

    if (this._logToAppInsights) {
      this.trackEvent(errorId, data);
    }

    if (this.logToConsole) {
      console.error(`[${category}] - ${this._getDataString(data)}`);
    }
  };

  public warn(category: LogCategory, id: string, data: LogMessage) {
    this._validateCategory(category);
    this._validateId(id);
    this._validateData(data);

    const warningId = `${this.dmPrefix}/warnings/${category}/${id}`;

    if (this._logToAppInsights) {
      this.trackEvent(warningId, data);
    }

    if (this.logToConsole) {
      console.warn(`[${category}] - ${this._getDataString(data)}`);
    }
  }

  public debug(category: LogCategory, data: LogMessage) {
    this._validateCategory(category);
    this._validateData(data);

    if (this.logToConsole) {
      console.debug(`${this._getTime()} %c[${category}] - ${this._getDataString(data)}`);
    }
  }

  private _getDataString(data: LogMessage): string {
    return JSON.stringify(data);
  }

  private _getTime() {
    const now = new Date();
    return now.toISOString();
  }

  private _validateCategory(category?: string) {
    if (!category) {
      throw Error('You must provide a category');
    }
  }

  private _validateId(id?: string) {
    if (!id) {
      throw Error('You must provide an id');
    }
  }

  private _validateData(data?: any) {
    if (!data) {
      throw Error('You must provide data');
    }
  }

  private _getTrackingData(data: any) {
    const properties = typeof data === 'object' ? data : { message: data };

    return {
      ...properties,
    };
  }
}

let service: IDataMapperLoggerService;

export const InitDataMapperLoggerService = (loggerService: ILoggerService): void => {
  service = new DataMapperLoggerService(loggerService);
};

export const LoggerService = (): IDataMapperLoggerService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Logger Service needs to be initialized before using');
  }

  return service;
};
