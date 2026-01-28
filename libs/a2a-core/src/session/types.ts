export type SessionData = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  data: Record<string, unknown>;
};

export type StorageType = 'local' | 'session';

export interface SessionStoragePlugin {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
}

export type SessionOptions = {
  sessionId?: string;
  storage?: StorageType;
  storagePlugin?: SessionStoragePlugin;
  storageKey?: string;
  autoSave?: boolean;
  ttl?: number; // Time to live in milliseconds
};

export type SessionChangeEvent = {
  key: string;
  value: unknown;
  previousValue: unknown;
};

export type SessionEventMap = {
  change: SessionChangeEvent;
  destroy: void;
  expire: void;
  sync: SessionData;
};
