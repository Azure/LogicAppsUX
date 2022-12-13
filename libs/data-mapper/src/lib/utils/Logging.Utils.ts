import AppInsights from '../core/services/appInsights/AppInsights';

export class LogService {
  public static error(category: LogCategory, id: string, data: any) {
    LogService._validateCategory(category);
    LogService._validateId(id);
    LogService._validateData(data);

    const errorId = `/errors/${category}/${id}`;

    if (LogService._logToAppInsights) {
      LogService._trackEvent(errorId, data);
    }
    if (LogService._logToConsole) {
      console.error(`[${category}] - ${LogService._getDataString(data)}`);
    }
  }

  public static warn(category: LogCategory, id: string, data: any) {
    LogService._validateCategory(category);
    LogService._validateId(id);
    LogService._validateData(data);

    const warningId = `/warnings/${category}/${id}`;

    if (LogService._logToAppInsights) {
      LogService._trackEvent(warningId, data);
    }
    if (LogService._logToConsole) {
      console.warn(`[${category}] - ${LogService._getDataString(data)}`);
    }
  }

  public static trackEvent(category: LogCategory, id: string, data: any) {
    LogService._validateCategory(category);
    LogService._validateId(id);
    LogService._validateData(data);

    const eventId = `/event/${category}/${id}`;

    if (LogService._logToAppInsights) {
      LogService._trackEvent(eventId, data);
    }
    if (LogService._logToConsole) {
      console.log(`%c[${category}] - ${LogService._getDataString(data)}`, 'color: #ff8c00');
    }
  }

  public static startTrackPage(pageName: string) {
    if (LogService._logToAppInsights) {
      AppInsights.startTrackPage(pageName);
    }
    if (LogService._logToConsole) {
      console.log(`${LogService._getTime()} [Start Track Page] - ${pageName}`);
    }
  }

  public static stopTrackPage(pageName: string, data: any) {
    if (LogService._logToAppInsights) {
      AppInsights.stopTrackPage(pageName, window.location.href, data);
    }

    if (LogService._logToConsole) {
      console.log(`${LogService._getTime()} [Stop Track Page] - ${pageName}`);
    }
  }

  public static startTrackEvent(eventName: string) {
    if (LogService._logToAppInsights) {
      AppInsights.startTrackEvent(eventName);
    }
    if (LogService._logToConsole) {
      console.log(`${LogService._getTime()} [Start Track Event] - ${eventName}`);
    }
  }

  public static stopTrackEvent(eventName: string, data: any) {
    LogService._validateData(data);
    if (LogService._logToAppInsights) {
      AppInsights.stopTrackEvent(eventName, data);
    }
    if (LogService._logToConsole) {
      console.log(`${LogService._getTime()} [Stop Track Event] - ${eventName}`);
    }
  }

  public static debug(category: LogCategory, data: any) {
    LogService._validateCategory(category);
    LogService._validateData(data);

    if (LogService._logToConsole) {
      console.debug(`${LogService._getTime()} %c[${category}] - ${LogService._getDataString(data)}`);
    }
  }

  private static _logToAppInsights = process.env.NODE_ENV !== 'development' && !!AppInsights;
  // TODO Allow manual turning on of console logging by providing a variable
  private static _logToConsole = process.env.NODE_ENV !== 'production';

  private static _getDataString(data: any): string {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  private static _getTime() {
    const now = new Date();
    return now.toISOString();
  }

  private static _validateCategory(category?: string) {
    if (!category) {
      throw Error('You must provide a category');
    }
  }

  private static _validateId(id?: string) {
    if (!id) {
      throw Error('You must provide an id');
    }
  }

  private static _validateData(data?: any) {
    if (!data) {
      throw Error('You must provide data');
    }
  }

  private static _trackEvent(name: string, data: any) {
    const properties = LogService._getTrackingData(data);
    AppInsights.trackEvent({ name }, properties);
  }

  private static _getTrackingData(data: any) {
    const properties = typeof data === 'object' ? data : { message: data };

    return {
      ...properties,
    };
  }
}

export enum LogCategory {
  DataMapperDesigner = 'DataMapperDesigner',
  FunctionsQuery = 'FunctionsQuery',
  InputDropDown = 'InputDropDown',
  FunctionNodePropertiesTab = 'FunctionNodePropertiesTab',
  TestMapPanel = 'TestMapPanel',
  DataMapUtils = 'DataMapUtils',
  EdgeUtils = 'EdgeUtils',
  FunctionUtils = 'FunctionUtils',
  IconUtils = 'IconUtils',
  ReactFlowUtils = 'ReactFlowUtils',
}
