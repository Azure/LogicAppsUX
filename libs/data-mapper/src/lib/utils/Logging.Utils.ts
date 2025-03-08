import appInsights from '../core/services/appInsights/AppInsights';

export interface LogMessage {
  message: string;
  data?: any;
}

const dmPrefix = 'data-mapper-vscode-extension';

export class LogService {
  public static error(category: LogCategory, id: string, data: LogMessage) {
    LogService._validateCategory(category);
    LogService._validateId(id);
    LogService._validateData(data);

    const errorId = `${dmPrefix}/errors/${category}/${id}`;

    if (LogService._logToAppInsights) {
      LogService._trackEvent(errorId, data);
    }

    if (LogService.logToConsole) {
      console.error(`[${category}] - ${LogService._getDataString(data)}`);
    }
  }

  public static warn(category: LogCategory, id: string, data: LogMessage) {
    LogService._validateCategory(category);
    LogService._validateId(id);
    LogService._validateData(data);

    const warningId = `${dmPrefix}/warnings/${category}/${id}`;

    if (LogService._logToAppInsights) {
      LogService._trackEvent(warningId, data);
    }

    if (LogService.logToConsole) {
      console.warn(`[${category}] - ${LogService._getDataString(data)}`);
    }
  }

  public static log(category: LogCategory, id: string, data: LogMessage) {
    LogService._validateCategory(category);
    LogService._validateId(id);
    LogService._validateData(data);

    const logId = `${dmPrefix}/log/${category}/${id}`;

    if (LogService._logToAppInsights) {
      LogService._trackEvent(logId, data);
    }

    if (LogService.logToConsole) {
      console.log(`%c[${category}] - ${LogService._getDataString(data)}`, 'color: #ff8c00');
    }
  }

  public static startTrackPage(pageName: string) {
    if (LogService._logToAppInsights) {
      appInsights.startTrackPage(pageName);
    }

    if (LogService.logToConsole) {
      console.log(`${LogService._getTime()} [Start Track Page] - ${pageName}`);
    }
  }

  public static stopTrackPage(pageName: string, data: LogMessage) {
    if (LogService._logToAppInsights) {
      appInsights.stopTrackPage(pageName, window.location.href, data);
    }

    if (LogService.logToConsole) {
      console.log(`${LogService._getTime()} [Stop Track Page] - ${pageName}`);
    }
  }

  public static startTrackEvent(eventName: string) {
    if (LogService._logToAppInsights) {
      appInsights.startTrackEvent(eventName);
    }

    if (LogService.logToConsole) {
      console.log(`${LogService._getTime()} [Start Track Event] - ${eventName}`);
    }
  }

  public static stopTrackEvent(eventName: string, data: LogMessage) {
    LogService._validateData(data);
    if (LogService._logToAppInsights) {
      appInsights.stopTrackEvent(eventName, { ...data });
    }

    if (LogService.logToConsole) {
      console.log(`${LogService._getTime()} [Stop Track Event] - ${eventName}`);
    }
  }

  public static debug(category: LogCategory, data: LogMessage) {
    LogService._validateCategory(category);
    LogService._validateData(data);

    if (LogService.logToConsole) {
      console.debug(`${LogService._getTime()} %c[${category}] - ${LogService._getDataString(data)}`);
    }
  }

  private static readonly _logToAppInsights = process.env.NODE_ENV !== 'development' && !!appInsights;
  // TODO Allow manual turning on of console logging by providing a variable
  public static readonly logToConsole = process.env.NODE_ENV !== 'production';

  private static _getDataString(data: LogMessage): string {
    return JSON.stringify(data);
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
    appInsights.trackEvent({ name }, properties);
  }

  private static _getTrackingData(data: any) {
    const properties = typeof data === 'object' ? data : { message: data };

    return {
      ...properties,
    };
  }
}

export const LogCategory = {
  DataMapperDesigner: 'DataMapperDesigner',
  FunctionsQuery: 'FunctionsQuery',
  InputDropDown: 'InputDropDown',
  InputTextbox: 'InputTextbox',
  FunctionNodePropertiesTab: 'FunctionNodePropertiesTab',
  TestMapPanel: 'TestMapPanel',
  DataMapUtils: 'DataMapUtils',
  EdgeUtils: 'EdgeUtils',
  FunctionUtils: 'FunctionUtils',
  IconUtils: 'IconUtils',
  ReactFlowUtils: 'ReactFlowUtils',
  ConnectionUtils: 'ConnectionUtils',
  ExtensionCommands: 'ExtensionCommands',
  MapDefinitionDeserializer: 'MapDefinitionDeserializer',
  DefaultConfigView: 'DefaultConfigView',
  AddOrUpdateSchemaView: 'AddOrUpdateSchemaView',
  FunctionIcon: 'FunctionIcon',
  CodeView: 'CodeView',
  TargetSchemaPane: 'TargetSchemaPane',
  OverviewCanvas: 'OverviewCanvas',
  EditingCanvas: 'EditingCanvas',
  FunctionList: 'FunctionList',
  SchemaUtils: 'SchemaUtils',
  VsixCommands: 'VsixCommands',
  DataMapSlice: 'DataMapSlice',
} as const;
export type LogCategory = (typeof LogCategory)[keyof typeof LogCategory];
