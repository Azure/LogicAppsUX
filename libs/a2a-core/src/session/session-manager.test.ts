import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from './session-manager';
import type { SessionData, SessionOptions } from './types';

// Mock browser storage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Replace global storage objects
(global as any).localStorage = mockLocalStorage;
(global as any).sessionStorage = mockSessionStorage;

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create session with default options', () => {
      const manager = new SessionManager();
      const session = manager.getSession();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(0);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
      expect(session.data).toEqual({});
    });

    it('should generate unique session IDs', () => {
      const manager1 = new SessionManager();
      const manager2 = new SessionManager();

      const session1 = manager1.getSession();
      const session2 = manager2.getSession();

      expect(session1.id).not.toBe(session2.id);
    });

    it('should accept custom session ID', () => {
      const customId = 'custom-session-123';
      const manager = new SessionManager({ sessionId: customId });
      const session = manager.getSession();

      expect(session.id).toBe(customId);
    });
  });

  describe('data storage', () => {
    it('should store and retrieve session data', () => {
      const manager = new SessionManager();

      manager.set('userId', 'user-123');
      manager.set('preferences', { theme: 'dark', language: 'en' });

      expect(manager.get('userId')).toBe('user-123');
      expect(manager.get('preferences')).toEqual({ theme: 'dark', language: 'en' });
    });

    it('should update existing data', () => {
      const manager = new SessionManager();

      manager.set('counter', 1);
      expect(manager.get('counter')).toBe(1);

      manager.set('counter', 2);
      expect(manager.get('counter')).toBe(2);
    });

    it('should delete data', () => {
      const manager = new SessionManager();

      manager.set('temp', 'value');
      expect(manager.get('temp')).toBe('value');

      manager.delete('temp');
      expect(manager.get('temp')).toBeUndefined();
    });

    it('should clear all data', () => {
      const manager = new SessionManager();

      manager.set('key1', 'value1');
      manager.set('key2', 'value2');

      manager.clear();

      expect(manager.get('key1')).toBeUndefined();
      expect(manager.get('key2')).toBeUndefined();
      expect(manager.getSession().data).toEqual({});
    });
  });

  describe('persistence', () => {
    it('should persist to localStorage by default', async () => {
      const manager = new SessionManager();
      manager.set('test', 'value');

      // Manually save since auto-save might be debounced
      await manager.save();

      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      // Find the call that contains our test data
      const calls = mockLocalStorage.setItem.mock.calls;
      const dataCall = calls.find(([key, value]) => {
        try {
          const parsed = JSON.parse(value);
          return parsed.data && parsed.data.test === 'value';
        } catch {
          return false;
        }
      });

      expect(dataCall).toBeDefined();
      const [key, value] = dataCall!;
      expect(key).toContain('a2a-session');

      const stored = JSON.parse(value);
      expect(stored.data.test).toBe('value');
    });

    it('should use sessionStorage when specified', async () => {
      // Clear mocks before this test to avoid interference
      vi.clearAllMocks();

      const manager = new SessionManager({
        storage: 'session',
        autoSave: false, // Disable auto-save to prevent initial save
      });

      // Now manually trigger a save with data
      manager.set('test', 'value');
      await manager.save();

      expect(mockSessionStorage.setItem).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should use custom storage key', async () => {
      const customKey = 'my-app-session';
      const manager = new SessionManager({
        storageKey: customKey,
      });
      manager.set('test', 'value');

      // Manually save
      await manager.save();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(customKey, expect.any(String));
    });

    it('should load existing session from storage', async () => {
      const existingSession: SessionData = {
        id: 'existing-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        data: {
          userId: 'user-456',
          isAuthenticated: true,
        },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(
        JSON.stringify({
          ...existingSession,
          createdAt: existingSession.createdAt.toISOString(),
          updatedAt: existingSession.updatedAt.toISOString(),
        })
      );

      const manager = new SessionManager();
      await manager.waitForInit();
      const session = manager.getSession();

      expect(session.id).toBe('existing-123');
      expect(session.data.userId).toBe('user-456');
      expect(session.data.isAuthenticated).toBe(true);
    });

    it('should handle corrupted storage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid-json');

      const manager = new SessionManager();
      const session = manager.getSession();

      // Should create new session
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.data).toEqual({});
    });
  });

  describe('auto-save', () => {
    it('should auto-save changes when enabled', async () => {
      const manager = new SessionManager({
        autoSave: true,
      });

      manager.set('test', 'value');

      // Wait for next tick to allow auto-save
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should not auto-save when disabled', async () => {
      const manager = new SessionManager({
        autoSave: false,
      });

      manager.set('test', 'value');

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should manually save when auto-save is disabled', async () => {
      const manager = new SessionManager({
        autoSave: false,
      });

      manager.set('test', 'value');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      await manager.save();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('expiration', () => {
    it('should create new session if expired', () => {
      const expiredSession: SessionData = {
        id: 'expired-123',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-01'),
        expiresAt: new Date('2020-01-02'), // Expired
        data: { old: 'data' },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(
        JSON.stringify({
          ...expiredSession,
          createdAt: expiredSession.createdAt.toISOString(),
          updatedAt: expiredSession.updatedAt.toISOString(),
          expiresAt: expiredSession.expiresAt?.toISOString(),
        })
      );

      const manager = new SessionManager();
      const session = manager.getSession();

      expect(session.id).not.toBe('expired-123');
      expect(session.data).toEqual({});
    });

    it('should set expiration when ttl is specified', () => {
      const ttl = 3600000; // 1 hour
      const manager = new SessionManager({ ttl });
      const session = manager.getSession();

      expect(session.expiresAt).toBeDefined();
      const expirationTime = session.expiresAt!.getTime();
      const expectedTime = session.createdAt.getTime() + ttl;

      // Allow small time difference
      expect(Math.abs(expirationTime - expectedTime)).toBeLessThan(1000);
    });
  });

  describe('session lifecycle', () => {
    it('should destroy session', async () => {
      const manager = new SessionManager();
      manager.set('data', 'value');

      await manager.destroy();

      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
      expect(manager.get('data')).toBeUndefined();

      // Should create new session after destroy
      const newSession = manager.getSession();
      expect(newSession.id).toBeDefined();
      expect(newSession.data).toEqual({});
    });

    it('should merge data from old session when rotating', () => {
      const manager = new SessionManager();
      const oldId = manager.getSession().id;

      manager.set('keepThis', 'value');
      manager.set('userId', 'user-123');

      manager.rotate(['keepThis']);

      const newSession = manager.getSession();
      expect(newSession.id).not.toBe(oldId);
      expect(newSession.data.keepThis).toBe('value');
      expect(newSession.data.userId).toBeUndefined();
    });
  });

  describe('event handling', () => {
    it('should emit change events', () => {
      const manager = new SessionManager();
      const changeHandler = vi.fn();

      manager.on('change', changeHandler);
      manager.set('test', 'value');

      expect(changeHandler).toHaveBeenCalledWith({
        key: 'test',
        value: 'value',
        previousValue: undefined,
      });
    });

    it('should emit destroy event', async () => {
      const manager = new SessionManager();
      const destroyHandler = vi.fn();

      manager.on('destroy', destroyHandler);
      await manager.destroy();

      expect(destroyHandler).toHaveBeenCalled();
    });

    it('should handle storage events from other tabs', () => {
      const manager = new SessionManager();
      manager.set('initial', 'value');

      // Simulate storage event from another tab
      const updatedSession = {
        ...manager.getSession(),
        data: {
          initial: 'value',
          fromOtherTab: 'newData',
        },
      };

      const event = new StorageEvent('storage', {
        key: 'a2a-session-default',
        newValue: JSON.stringify({
          ...updatedSession,
          createdAt: updatedSession.createdAt.toISOString(),
          updatedAt: updatedSession.updatedAt.toISOString(),
        }),
      });

      window.dispatchEvent(event);

      expect(manager.get('fromOtherTab')).toBe('newData');
    });
  });
});
