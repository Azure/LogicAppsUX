import type { Plugin, PluginContext } from '../types';

export interface AnalyticsConfig {
  trackingId?: string;
  endpoint?: string;
  debug?: boolean;
}

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
}

export class AnalyticsPlugin implements Plugin {
  name = 'analytics';
  version = '1.0.0';
  description = 'Track A2A SDK usage and events';

  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AnalyticsConfig = {}) {
    this.config = config;
  }

  install(context: PluginContext): void {
    // Store config in context
    context.config['analytics'] = this.config;

    // Start flush timer if endpoint is configured
    if (this.config.endpoint) {
      this.startFlushTimer();
    }
  }

  uninstall(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  private track(event: string, properties?: Record<string, unknown>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: properties || {},
      timestamp: new Date(),
    };

    this.events.push(analyticsEvent);

    if (this.config.debug) {
      console.log('[Analytics]', event, properties);
    }

    // Auto-flush if we have too many events
    if (this.events.length >= 100) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0 || !this.config.endpoint) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.trackingId && {
            'X-Tracking-ID': this.config.trackingId,
          }),
        },
        body: JSON.stringify({ events: eventsToSend }),
      });
    } catch (error) {
      if (this.config.debug) {
        console.error('[Analytics] Failed to send events:', error);
      }
      // Re-add events for retry
      this.events.unshift(...eventsToSend);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  hooks = {
    beforeMessageSend: async (message: any) => {
      this.track('message.send', {
        role: message.role,
        contentTypes: message.content.map((c: any) => c.type),
      });
      return message;
    },

    afterMessageReceive: async (message: any) => {
      this.track('message.receive', {
        role: message.role,
        contentTypes: message.content.map((c: any) => c.type),
      });
      return message;
    },

    onTaskCreated: async (task: any) => {
      this.track('task.created', {
        taskId: task.id,
        state: task.state,
      });
    },

    onTaskCompleted: async (task: any) => {
      this.track('task.completed', {
        taskId: task.id,
        duration: task.updatedAt.getTime() - task.createdAt.getTime(),
      });
    },

    onTaskFailed: async (task: any) => {
      this.track('task.failed', {
        taskId: task.id,
        error: task.error?.message,
      });
    },

    onError: async (error: Error) => {
      this.track('error', {
        message: error.message,
        stack: error.stack,
      });
    },

    onStop: async () => {
      await this.flush();
    },
  };
}
