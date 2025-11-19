import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IndexedDB for tests
class MockIDBRequest {
  result: any;
  error: any;
  source: any;
  transaction: any;
  readyState: string = 'pending';
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  private listeners: { [key: string]: Array<(event: any) => void> } = {};

  constructor(result?: any) {
    this.result = result;
    setTimeout(() => {
      this.readyState = 'done';
      this.dispatchEvent({ type: 'success', target: this });
    }, 0);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);

    // Also set the on* properties
    if (type === 'success') {
      this.onsuccess = listener;
    } else if (type === 'error') {
      this.onerror = listener;
    }
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  dispatchEvent(event: any) {
    const listeners = this.listeners[event.type] || [];
    listeners.forEach((listener) => listener(event));

    if (event.type === 'success' && this.onsuccess) {
      this.onsuccess(event);
    } else if (event.type === 'error' && this.onerror) {
      this.onerror(event);
    }
  }
}

class MockIDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  indexNames: string[] = [];
  transaction: any;
  autoIncrement: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.keyPath = null;
  }

  put(_value: any, _key?: any) {
    return new MockIDBRequest();
  }

  get(_key: any) {
    return new MockIDBRequest(null);
  }

  delete(_key: any) {
    return new MockIDBRequest();
  }

  clear() {
    return new MockIDBRequest();
  }
}

class MockIDBTransaction {
  objectStoreNames: string[];
  mode: string;
  db: any;
  error: any = null;
  onabort: ((event: any) => void) | null = null;
  oncomplete: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(db: any, storeNames: string[], mode: string) {
    this.db = db;
    this.objectStoreNames = storeNames;
    this.mode = mode;
    setTimeout(() => {
      if (this.oncomplete) {
        this.oncomplete({ target: this });
      }
    }, 0);
  }

  objectStore(name: string) {
    return new MockIDBObjectStore(name);
  }

  abort() {
    if (this.onabort) {
      this.onabort({ target: this });
    }
  }
}

class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;

    // Create a mock DOMStringList with contains method
    const storeNames = ['sessions'];
    this.objectStoreNames = {
      length: storeNames.length,
      item: (index: number) => storeNames[index] || null,
      contains: (name: string) => storeNames.includes(name),
      [Symbol.iterator]: () => storeNames[Symbol.iterator](),
      // Add array indexing
      ...storeNames.reduce((acc, name, i) => ({ ...acc, [i]: name }), {}),
    } as unknown as DOMStringList;
  }

  transaction(storeNames: string | string[], mode: string = 'readonly') {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, names, mode);
  }

  createObjectStore(name: string, _options?: any) {
    // Update the mock DOMStringList to include the new store
    const currentStores: string[] = [];
    for (let i = 0; i < this.objectStoreNames.length; i++) {
      currentStores.push(this.objectStoreNames.item(i)!);
    }
    currentStores.push(name);

    this.objectStoreNames = {
      length: currentStores.length,
      item: (index: number) => currentStores[index] || null,
      contains: (storeName: string) => currentStores.includes(storeName),
      [Symbol.iterator]: () => currentStores[Symbol.iterator](),
      ...currentStores.reduce((acc, storeName, i) => ({ ...acc, [i]: storeName }), {}),
    } as unknown as DOMStringList;

    return new MockIDBObjectStore(name);
  }

  close() {
    // Mock close
  }
}

const mockIndexedDB = {
  open: vi.fn((name: string, version?: number) => {
    const request = new MockIDBRequest();
    const db = new MockIDBDatabase(name, version || 1);

    // Add upgradeneeded listener support
    request.addEventListener('upgradeneeded', () => {});

    setTimeout(() => {
      // First dispatch upgradeneeded if needed
      request.result = db;
      request.dispatchEvent({ type: 'upgradeneeded', target: request });

      // Then dispatch success
      request.result = db;
      request.readyState = 'done';
      request.dispatchEvent({ type: 'success', target: request });
    }, 0);

    return request;
  }),
  deleteDatabase: vi.fn((_name: string) => {
    return new MockIDBRequest();
  }),
};

// Mock IDBIndex and IDBCursor classes (minimal implementation)
class MockIDBIndex {
  name: string;
  keyPath: string | string[] | null;
  objectStore: MockIDBObjectStore;
  unique: boolean = false;
  multiEntry: boolean = false;

  constructor(name: string, objectStore: MockIDBObjectStore) {
    this.name = name;
    this.keyPath = null;
    this.objectStore = objectStore;
  }
}

class MockIDBCursor {
  source: any;
  direction: string = 'next';
  key: any;
  primaryKey: any;
  value: any;

  constructor(source: any) {
    this.source = source;
  }

  continue() {
    // Mock continue
  }

  advance(_count: number) {
    // Mock advance
  }
}

// Add IndexedDB to global
(global as any).indexedDB = mockIndexedDB;
(global as any).IDBRequest = MockIDBRequest;
(global as any).IDBDatabase = MockIDBDatabase;
(global as any).IDBTransaction = MockIDBTransaction;
(global as any).IDBObjectStore = MockIDBObjectStore;
(global as any).IDBIndex = MockIDBIndex;
(global as any).IDBCursor = MockIDBCursor;
