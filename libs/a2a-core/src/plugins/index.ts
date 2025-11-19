export { PluginManager } from './plugin-manager';
export type {
  Plugin,
  PluginContext,
  PluginHooks,
  PluginInfo,
  PluginRegistrationOptions,
} from './types';

// Export built-in plugins
export { AnalyticsPlugin } from './built-in/analytics-plugin';
export type { AnalyticsConfig, AnalyticsEvent } from './built-in/analytics-plugin';

export { LoggerPlugin } from './built-in/logger-plugin';
export type { LoggerConfig, LogLevel } from './built-in/logger-plugin';
