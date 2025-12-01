import { EventEmitter } from 'eventemitter3';
import type { SessionData, SessionOptions, SessionEventMap, SessionStoragePlugin } from './types';

// Default localStorage plugin implementation
export class LocalStoragePlugin implements SessionStoragePlugin {
  private storage: Storage;

  constructor(type: 'local' | 'session' = 'local') {
    this.storage = type === 'local' ? localStorage : sessionStorage;
  }

  async getItem(key: string): Promise<string | null> {
    return this.storage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.removeItem(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

export class SessionManager extends EventEmitter<SessionEventMap> {
  private session!: SessionData; // Will be initialized in constructor or initializeSession
  private options: Required<SessionOptions>;
  private storagePlugin: SessionStoragePlugin;
  private saveDebounceTimer?: NodeJS.Timeout;
  private initPromise: Promise<void>;

  constructor(options: SessionOptions = {}) {
    super();

    this.options = {
      sessionId: this.generateSessionId(),
      storage: 'local',
      storageKey: 'a2a-session-default',
      autoSave: true,
      ttl: 0, // No expiration by default
      ...options,
    } as Required<SessionOptions>;

    // Use provided storage plugin or create default one
    this.storagePlugin = options.storagePlugin || new LocalStoragePlugin(this.options.storage);

    // Create initial session synchronously
    this.session = this.createSession();

    // Initialize session asynchronously to load from storage
    this.initPromise = this.initializeSession();

    // Listen for storage events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private async initializeSession(): Promise<void> {
    // Load existing session or create new one
    const loadedSession = await this.loadSession();
    this.session = loadedSession || this.createSession();

    // Save initial session if it's new and auto-save is enabled
    if (!loadedSession && this.options.autoSave) {
      await this.persistSession();
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createSession(): SessionData {
    const now = new Date();
    const session: SessionData = {
      id: this.options.sessionId,
      createdAt: now,
      updatedAt: now,
      data: {},
    };

    if (this.options.ttl > 0) {
      session.expiresAt = new Date(now.getTime() + this.options.ttl);
    }

    return session;
  }

  private async loadSession(): Promise<SessionData | null> {
    try {
      const stored = await this.storagePlugin.getItem(this.options.storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const session: SessionData = {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
      };

      // Check if session is expired
      if (session.expiresAt && session.expiresAt < new Date()) {
        this.emit('expire');
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  private async persistSession(): Promise<void> {
    const toStore = {
      ...this.session,
      createdAt: this.session.createdAt.toISOString(),
      updatedAt: this.session.updatedAt.toISOString(),
      expiresAt: this.session.expiresAt?.toISOString(),
    };

    await this.storagePlugin.setItem(this.options.storageKey, JSON.stringify(toStore));
  }

  private debouncedSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Use setImmediate or Promise.resolve for immediate execution in tests
    if (typeof setImmediate !== 'undefined') {
      this.saveDebounceTimer = setImmediate(() => {
        this.persistSession();
      }) as any;
    } else {
      Promise.resolve().then(() => {
        this.persistSession();
      });
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== this.options.storageKey || !event.newValue) {
      return;
    }

    try {
      const newSession = JSON.parse(event.newValue);
      this.session = {
        ...newSession,
        createdAt: new Date(newSession.createdAt),
        updatedAt: new Date(newSession.updatedAt),
        expiresAt: newSession.expiresAt ? new Date(newSession.expiresAt) : undefined,
      };

      this.emit('sync', this.session);
    } catch {
      // Ignore invalid data
    }
  };

  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  getSession(): SessionData {
    return { ...this.session };
  }

  get(key: string): unknown {
    return this.session.data[key];
  }

  set(key: string, value: unknown): void {
    const previousValue = this.session.data[key];
    this.session.data[key] = value;
    this.session.updatedAt = new Date();

    this.emit('change', { key, value, previousValue });

    if (this.options.autoSave) {
      this.debouncedSave();
    }
  }

  delete(key: string): void {
    const previousValue = this.session.data[key];
    delete this.session.data[key];
    this.session.updatedAt = new Date();

    this.emit('change', { key, value: undefined, previousValue });

    if (this.options.autoSave) {
      this.debouncedSave();
    }
  }

  clear(): void {
    const oldData = { ...this.session.data };
    this.session.data = {};
    this.session.updatedAt = new Date();

    // Emit change events for each cleared key
    Object.keys(oldData).forEach((key) => {
      this.emit('change', {
        key,
        value: undefined,
        previousValue: oldData[key],
      });
    });

    if (this.options.autoSave) {
      this.debouncedSave();
    }
  }

  async save(): Promise<void> {
    await this.persistSession();
  }

  rotate(preserveKeys: string[] = []): void {
    const preservedData: Record<string, unknown> = {};

    preserveKeys.forEach((key) => {
      if (key in this.session.data) {
        preservedData[key] = this.session.data[key];
      }
    });

    // Create new session with new ID
    this.options.sessionId = this.generateSessionId();
    this.session = this.createSession();
    this.session.data = preservedData;

    if (this.options.autoSave) {
      this.persistSession();
    }
  }

  async destroy(): Promise<void> {
    await this.storagePlugin.removeItem(this.options.storageKey);
    this.session = this.createSession();
    this.emit('destroy');
  }

  cleanup(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
  }
}
