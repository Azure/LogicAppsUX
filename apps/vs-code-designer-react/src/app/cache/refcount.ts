export interface RefCountCache {
  // increments refcount
  get<TValue>(key: string): TValue | null;
  add<TValue>(key: string, value: TValue, evictionDelay?: number): void;

  // doesn't increment refcount
  peek<TValue>(key: string): TValue | null;
  exists(key: string): boolean;

  // decrement refcount
  release(key: string): void;

  // force remove
  remove(key: string): void;
}

interface InMemoryCacheValue {
  value: any; // tslint:disable-line: no-any
  refCount: number;
  absoluteExpiration: number;
}

export class InMemoryRefCountCache implements RefCountCache {
  private _defaultEvictionDelay: number;
  private _cache: Record<string, InMemoryCacheValue> = {};
  private _intervalId: number | undefined;

  constructor(defaultEvictionDelay: number = 5 * 60 * 1000) {
    this._defaultEvictionDelay = defaultEvictionDelay;
  }

  get<TValue>(key: string): TValue | null {
    const cacheValue = this._getCacheValue(key);
    if (cacheValue !== undefined) {
      this._incrementRefCount(key);
      return cacheValue.value;
    } else {
      return null;
    }
  }

  add<TValue>(key: string, value: TValue, evictionDelay?: number): void {
    this._cache[key.toUpperCase()] = {
      absoluteExpiration: (evictionDelay || this._defaultEvictionDelay) + this.getCurrentTime(),
      refCount: 0,
      value,
    };

    this._incrementRefCount(key);
  }

  peek<TValue>(key: string): TValue | null {
    const cacheValue = this._getCacheValue(key);
    if (cacheValue !== undefined) {
      return cacheValue.value;
    } else {
      return null;
    }
  }

  exists(key: string): boolean {
    const cacheValue = this._getCacheValue(key);
    return !!cacheValue;
  }

  release(key: string): void {
    this._decrementRefCount(key);
  }

  remove(key: string): void {
    const canonicalKey = key.toUpperCase();
    if (this._cache[canonicalKey]) {
      delete this._cache[canonicalKey];
    }
  }

  startEvictionWorker() {
    if (this._intervalId) {
      return;
    }

    this._intervalId = window.setInterval(() => {
      const keysToRemove: string[] = [];

      for (const key of Object.keys(this._cache)) {
        const cache = this._cache[key];
        if (cache.refCount === 0 && this.getCurrentTime() >= cache.absoluteExpiration) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        delete this._cache[key];
      });
    }, 20 * 1000);
  }

  stopEvictionWorker() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = undefined;
    }
  }

  protected getCurrentTime(): number {
    return Date.now();
  }

  private _incrementRefCount(key: string): number {
    const cacheValue = this._cache[key.toUpperCase()];
    cacheValue.refCount = cacheValue.refCount + 1;
    return cacheValue.refCount;
  }

  private _decrementRefCount(key: string): number | undefined {
    const cacheValue = this._getCacheValue(key);
    if (cacheValue) {
      cacheValue.refCount = cacheValue.refCount - 1;
      return cacheValue.refCount;
    }

    return undefined;
  }

  private _getCacheValue(key: string): InMemoryCacheValue | undefined {
    const cacheValue = this._cache[key.toUpperCase()];
    if (cacheValue) {
      if (cacheValue.refCount === 0 && this.getCurrentTime() >= cacheValue.absoluteExpiration) {
        delete this._cache[key];
      }
    }

    return cacheValue;
  }
}
