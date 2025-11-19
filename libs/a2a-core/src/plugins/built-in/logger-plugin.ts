import type { Plugin, PluginContext } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
}

export class LoggerPlugin implements Plugin {
  name = 'logger';
  version = '1.0.0';
  description = 'Comprehensive logging for A2A SDK operations';

  private config: Required<LoggerConfig>;
  private levelOrder: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level || 'info',
      prefix: config.prefix || '[A2A]',
      timestamp: config.timestamp ?? true,
      colors: config.colors ?? true,
    };
  }

  install(context: PluginContext): void {
    context.config['logger'] = this.config;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    if (this.config.timestamp) {
      parts.push(new Date().toISOString());
    }

    parts.push(this.config.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);

    return parts.join(' ');
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message);

    const logData = data ? [formattedMessage, data] : [formattedMessage];

    switch (level) {
      case 'debug':
        console.debug(...logData);
        break;
      case 'info':
        console.log(...logData);
        break;
      case 'warn':
        console.warn(...logData);
        break;
      case 'error':
        console.error(...logData);
        break;
    }
  }

  hooks = {
    beforeRequest: async (request: any) => {
      this.log('debug', 'HTTP Request', {
        method: request.method,
        url: request.url,
        headers: request.headers,
      });
      return request;
    },

    afterResponse: async (response: any) => {
      this.log('debug', 'HTTP Response', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      return response;
    },

    beforeMessageSend: async (message: any) => {
      this.log('info', 'Sending message', {
        role: message.role,
        contentLength: message.content.length,
      });
      return message;
    },

    afterMessageReceive: async (message: any) => {
      this.log('info', 'Received message', {
        role: message.role,
        contentLength: message.content.length,
      });
      return message;
    },

    onTaskCreated: async (task: any) => {
      this.log('info', 'Task created', {
        id: task.id,
        state: task.state,
      });
    },

    onTaskCompleted: async (task: any) => {
      this.log('info', 'Task completed', {
        id: task.id,
        duration: `${task.updatedAt.getTime() - task.createdAt.getTime()}ms`,
      });
    },

    onTaskFailed: async (task: any) => {
      this.log('error', 'Task failed', {
        id: task.id,
        error: task.error,
      });
    },

    onError: async (error: Error) => {
      this.log('error', 'Error occurred', {
        message: error.message,
        stack: error.stack,
      });
    },

    onStart: async () => {
      this.log('info', 'Logger plugin started');
    },

    onStop: async () => {
      this.log('info', 'Logger plugin stopped');
    },
  };
}
