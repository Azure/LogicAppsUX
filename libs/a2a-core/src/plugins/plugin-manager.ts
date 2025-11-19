import type {
  Plugin,
  PluginContext,
  PluginHooks,
  PluginInfo,
  PluginRegistrationOptions,
} from './types';

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private enabledPlugins = new Set<string>();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  register(plugin: Plugin, options: PluginRegistrationOptions = {}): void {
    // Check if already registered
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    // Check dependencies
    if (!options.skipDependencyCheck && plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin ${plugin.name} requires plugin ${dep} to be registered first`);
        }
      }
    }

    // Install plugin
    try {
      plugin.install(this.context);
      this.plugins.set(plugin.name, plugin);
      this.enabledPlugins.add(plugin.name); // Enabled by default
    } catch (error) {
      throw new Error(
        `Failed to install plugin ${plugin.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  unregister(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    // Call uninstall if provided
    try {
      plugin.uninstall?.();
    } catch (error) {
      console.error(`Error uninstalling plugin ${pluginName}:`, error);
    }

    this.plugins.delete(pluginName);
    this.enabledPlugins.delete(pluginName);
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      version: plugin.version,
      enabled: this.enabledPlugins.has(name),
    }));
  }

  async enablePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    this.enabledPlugins.add(pluginName);

    // Call onStart hook if available
    if (plugin.hooks?.onStart) {
      await plugin.hooks.onStart();
    }
  }

  async disablePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Call onStop hook if available
    if (plugin.hooks?.onStop) {
      await plugin.hooks.onStop();
    }

    this.enabledPlugins.delete(pluginName);
  }

  isEnabled(pluginName: string): boolean {
    return this.enabledPlugins.has(pluginName);
  }

  async executeHook<K extends keyof PluginHooks>(hookName: K, data: any): Promise<any> {
    let result = data;

    // Execute hooks from all enabled plugins
    for (const [pluginName, plugin] of this.plugins.entries()) {
      if (!this.enabledPlugins.has(pluginName)) continue;

      const hook = plugin.hooks?.[hookName];
      if (!hook) continue;

      try {
        result = await hook(result);
      } catch (error) {
        console.error(`Error in plugin ${pluginName} hook ${hookName}:`, error);
        // Continue with other plugins
      }
    }

    return result;
  }
}
