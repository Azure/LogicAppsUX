import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from './plugin-manager';
import type { Plugin, PluginContext, PluginHooks } from './types';

describe('PluginManager', () => {
  let manager: PluginManager;
  let context: PluginContext;

  beforeEach(() => {
    context = {
      client: {} as any,
      session: {} as any,
      config: {
        apiVersion: '1.0.0',
        debug: false,
      },
    };

    manager = new PluginManager(context);
  });

  describe('plugin registration', () => {
    it('should register a plugin', () => {
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };

      manager.register(plugin);

      expect(plugin.install).toHaveBeenCalledWith(context);
      expect(manager.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should prevent duplicate plugin registration', () => {
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };

      manager.register(plugin);

      expect(() => manager.register(plugin)).toThrow('Plugin test-plugin is already registered');
    });

    it('should unregister a plugin', () => {
      const uninstall = vi.fn();
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: vi.fn(),
        uninstall,
      };

      manager.register(plugin);
      manager.unregister('test-plugin');

      expect(uninstall).toHaveBeenCalled();
      expect(manager.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should list all registered plugins', () => {
      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        install: vi.fn(),
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '2.0.0',
        install: vi.fn(),
      };

      manager.register(plugin1);
      manager.register(plugin2);

      const plugins = manager.listPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContainEqual({ name: 'plugin-1', version: '1.0.0', enabled: true });
      expect(plugins).toContainEqual({ name: 'plugin-2', version: '2.0.0', enabled: true });
    });
  });

  describe('hook execution', () => {
    it('should execute beforeRequest hooks', async () => {
      const hook1 = vi.fn((request) => ({ ...request, headers: { 'X-Plugin-1': 'true' } }));
      const hook2 = vi.fn((request) => ({
        ...request,
        headers: { ...request.headers, 'X-Plugin-2': 'true' },
      }));

      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          beforeRequest: hook1,
        },
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          beforeRequest: hook2,
        },
      };

      manager.register(plugin1);
      manager.register(plugin2);

      const request = { method: 'POST', url: '/test', headers: {} };
      const result = await manager.executeHook('beforeRequest', request);

      expect(hook1).toHaveBeenCalledWith(request);
      expect(hook2).toHaveBeenCalledWith({ ...request, headers: { 'X-Plugin-1': 'true' } });
      expect(result).toEqual({
        method: 'POST',
        url: '/test',
        headers: {
          'X-Plugin-1': 'true',
          'X-Plugin-2': 'true',
        },
      });
    });

    it('should execute afterResponse hooks', async () => {
      const hook1 = vi.fn((response) => ({ ...response, modified: true }));
      const hook2 = vi.fn((response) => ({ ...response, plugin2: true }));

      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          afterResponse: hook1,
        },
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          afterResponse: hook2,
        },
      };

      manager.register(plugin1);
      manager.register(plugin2);

      const response = { status: 200, data: { message: 'ok' } };
      const result = await manager.executeHook('afterResponse', response);

      expect(result).toEqual({
        status: 200,
        data: { message: 'ok' },
        modified: true,
        plugin2: true,
      });
    });

    it('should handle async hooks', async () => {
      const asyncHook = vi.fn(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...data, async: true };
      });

      const plugin: Plugin = {
        name: 'async-plugin',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          beforeRequest: asyncHook,
        },
      };

      manager.register(plugin);

      const result = await manager.executeHook('beforeRequest', { test: true });
      expect(result).toEqual({ test: true, async: true });
    });

    it('should continue execution if a hook throws an error', async () => {
      const errorHook = vi.fn(() => {
        throw new Error('Hook error');
      });
      const successHook = vi.fn((data) => ({ ...data, success: true }));

      const plugin1: Plugin = {
        name: 'error-plugin',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          beforeRequest: errorHook,
        },
      };

      const plugin2: Plugin = {
        name: 'success-plugin',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          beforeRequest: successHook,
        },
      };

      manager.register(plugin1);
      manager.register(plugin2);

      const result = await manager.executeHook('beforeRequest', { test: true });
      expect(result).toEqual({ test: true, success: true });
    });

    it('should execute onError hooks', async () => {
      const errorHook = vi.fn();

      const plugin: Plugin = {
        name: 'error-handler',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          onError: errorHook,
        },
      };

      manager.register(plugin);

      const error = new Error('Test error');
      await manager.executeHook('onError', error);

      expect(errorHook).toHaveBeenCalledWith(error);
    });

    it('should execute message transformation hooks', async () => {
      const transformHook = vi.fn((message) => ({
        ...message,
        content: message.content.map((part: any) =>
          part.type === 'text' ? { ...part, content: part.content.toUpperCase() } : part
        ),
      }));

      const plugin: Plugin = {
        name: 'transform-plugin',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          beforeMessageSend: transformHook,
        },
      };

      manager.register(plugin);

      const message = {
        role: 'user',
        content: [{ type: 'text', content: 'hello' }],
      };

      const result = await manager.executeHook('beforeMessageSend', message);
      expect(result.content[0].content).toBe('HELLO');
    });
  });

  describe('plugin lifecycle', () => {
    it('should call onStart hook when plugin is enabled', async () => {
      const onStart = vi.fn();
      const plugin: Plugin = {
        name: 'lifecycle-plugin',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          onStart,
        },
      };

      manager.register(plugin);
      await manager.enablePlugin('lifecycle-plugin');

      expect(onStart).toHaveBeenCalled();
    });

    it('should call onStop hook when plugin is disabled', async () => {
      const onStop = vi.fn();
      const plugin: Plugin = {
        name: 'lifecycle-plugin',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          onStop,
        },
      };

      manager.register(plugin);
      await manager.enablePlugin('lifecycle-plugin');
      await manager.disablePlugin('lifecycle-plugin');

      expect(onStop).toHaveBeenCalled();
    });

    it('should track plugin enabled state', async () => {
      const plugin: Plugin = {
        name: 'state-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };

      manager.register(plugin);

      expect(manager.isEnabled('state-plugin')).toBe(true); // Default enabled

      await manager.disablePlugin('state-plugin');
      expect(manager.isEnabled('state-plugin')).toBe(false);

      await manager.enablePlugin('state-plugin');
      expect(manager.isEnabled('state-plugin')).toBe(true);
    });

    it('should not execute hooks for disabled plugins', async () => {
      const hook = vi.fn((data) => ({ ...data, modified: true }));
      const plugin: Plugin = {
        name: 'disabled-plugin',
        version: '1.0.0',
        install: vi.fn(),
        hooks: {
          beforeRequest: hook,
        },
      };

      manager.register(plugin);
      await manager.disablePlugin('disabled-plugin');

      const result = await manager.executeHook('beforeRequest', { test: true });

      expect(hook).not.toHaveBeenCalled();
      expect(result).toEqual({ test: true });
    });
  });

  describe('plugin configuration', () => {
    it('should allow plugins to access and modify context', () => {
      let capturedContext: PluginContext | undefined;

      const plugin: Plugin = {
        name: 'context-plugin',
        version: '1.0.0',
        install: (ctx) => {
          capturedContext = ctx;
          ctx.config.customValue = 'test';
        },
      };

      manager.register(plugin);

      expect(capturedContext).toBe(context);
      expect(context.config.customValue).toBe('test');
    });

    it('should support plugin dependencies', () => {
      const dependentPlugin: Plugin = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['required-plugin'],
        install: vi.fn(),
      };

      expect(() => manager.register(dependentPlugin)).toThrow(
        'Plugin dependent requires plugin required-plugin to be registered first'
      );
    });

    it('should handle circular dependencies', () => {
      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        dependencies: ['plugin-2'],
        install: vi.fn(),
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        dependencies: ['plugin-1'],
        install: vi.fn(),
      };

      // First plugin with dependency should fail
      expect(() => manager.register(plugin1)).toThrow(
        'Plugin plugin-1 requires plugin plugin-2 to be registered first'
      );

      // Second plugin with circular dependency should also fail
      expect(() => manager.register(plugin2)).toThrow(
        'Plugin plugin-2 requires plugin plugin-1 to be registered first'
      );
    });
  });

  describe('error handling', () => {
    it('should handle plugin installation errors', () => {
      const plugin: Plugin = {
        name: 'error-plugin',
        version: '1.0.0',
        install: () => {
          throw new Error('Installation failed');
        },
      };

      expect(() => manager.register(plugin)).toThrow(
        'Failed to install plugin error-plugin: Installation failed'
      );
    });

    it('should handle plugin uninstall errors gracefully', () => {
      const plugin: Plugin = {
        name: 'error-plugin',
        version: '1.0.0',
        install: vi.fn(),
        uninstall: () => {
          throw new Error('Uninstall failed');
        },
      };

      manager.register(plugin);

      // Should not throw
      expect(() => manager.unregister('error-plugin')).not.toThrow();
      expect(manager.getPlugin('error-plugin')).toBeUndefined();
    });
  });
});
