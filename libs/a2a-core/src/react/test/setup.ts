// Global test setup for React components
import { afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();

// Polyfill DataTransfer for jsdom
class DataTransferPolyfill implements DataTransfer {
  dropEffect: DataTransfer['dropEffect'] = 'none';
  effectAllowed: DataTransfer['effectAllowed'] = 'all';
  items: DataTransferItemList;
  types: readonly string[] = [];
  files: FileList;

  constructor() {
    const items: DataTransferItem[] = [];
    const files: File[] = [];

    this.items = {
      length: 0,
      add: (data: string | File, type?: string) => {
        if (data instanceof File) {
          items.push({
            kind: 'file',
            type: data.type,
            getAsFile: () => data,
            getAsString: (_callback?: FunctionStringCallback | null) => {},
            webkitGetAsEntry: () => null,
          } as DataTransferItem);
          files.push(data);
        } else {
          items.push({
            kind: 'string',
            type: type || 'text/plain',
            getAsFile: () => null,
            getAsString: (callback?: FunctionStringCallback | null) => {
              if (callback) {
                callback(data);
              }
            },
            webkitGetAsEntry: () => null,
          } as DataTransferItem);
        }
        (this.items as any).length = items.length;
        return items[items.length - 1];
      },
      remove: (index: number) => {
        items.splice(index, 1);
        if (files[index]) {
          files.splice(index, 1);
        }
        (this.items as any).length = items.length;
      },
      clear: () => {
        items.length = 0;
        files.length = 0;
        (this.items as any).length = 0;
      },
      [Symbol.iterator]: function* () {
        for (const item of items) {
          yield item;
        }
      },
    } as DataTransferItemList;

    // Add index access
    for (let i = 0; i < 100; i++) {
      Object.defineProperty(this.items, i, {
        get: () => items[i],
      });
    }

    this.files = {
      length: files.length,
      item: (index: number) => files[index] || null,
      [Symbol.iterator]: function* () {
        for (const file of files) {
          yield file;
        }
      },
    } as FileList;

    // Add index access to files
    for (let i = 0; i < 100; i++) {
      Object.defineProperty(this.files, i, {
        get: () => files[i],
      });
    }

    // Update files length dynamically
    Object.defineProperty(this.files, 'length', {
      get: () => files.length,
    });
  }

  clearData(_format?: string): void {
    if (!_format) {
      this.items.clear();
    }
  }

  getData(_format: string): string {
    return '';
  }

  setData(_format: string, _data: string): void {
    // Not implemented
  }

  setDragImage(_image: Element, _x: number, _y: number): void {
    // Not implemented
  }
}

// @ts-ignore
global.DataTransfer = DataTransferPolyfill;

// Reset fetch mock before each test
beforeEach(() => {
  vi.mocked(global.fetch).mockReset();

  // Ensure document.body exists for happy-dom v18
  if (!document.body) {
    const body = document.createElement('body');
    document.documentElement.appendChild(body);
  }
});

// Mock TextDecoderStream for SSE parsing tests
global.TextDecoderStream = class TextDecoderStream {
  readable: ReadableStream<string>;
  writable: WritableStream<Uint8Array>;
  encoding: string;
  fatal: boolean;
  ignoreBOM: boolean;

  constructor(label: string = 'utf-8', options?: TextDecoderOptions) {
    const { readable, writable } = new TransformStream<Uint8Array, string>({
      transform(chunk, controller) {
        controller.enqueue(new TextDecoder(label, options).decode(chunk));
      },
    });
    this.readable = readable;
    this.writable = writable;
    this.encoding = label;
    this.fatal = !!options?.fatal;
    this.ignoreBOM = !!options?.ignoreBOM;
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
