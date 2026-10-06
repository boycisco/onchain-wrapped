/**
 * Cache abstraction.
 *
 * Contract: values must be JSON-serializable. Implementations may serialize
 * on write and parse on read (which the in-memory cache does), so callers
 * should expect that Date objects come back as ISO strings after a round-trip.
 * This matches the wire format of the API exactly, so downstream code sees
 * the same shape whether a value was cached or freshly computed.
 */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Entry {
  json: string;
  expiresAt: number;
}

/**
 * In-memory cache with per-entry TTL.
 * Suitable for V1 single-process deployments. Swap for Redis by implementing
 * the same Cache interface; nothing else in the app needs to change.
 */
export class InMemoryCache implements Cache {
  private readonly store = new Map<string, Entry>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.json) as T;
    } catch {
      // Corrupt entry; drop it and miss.
      this.store.delete(key);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    let json: string;
    try {
      json = JSON.stringify(value);
    } catch {
      // Not serializable; skip caching silently rather than throw.
      return;
    }
    this.store.set(key, {
      json,
      expiresAt: this.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Test helper. */
  clear(): void {
    this.store.clear();
  }

  /** Test helper. */
  size(): number {
    return this.store.size;
  }
}

/* ---------- default singleton + test seam ---------- */

let defaultCache: Cache = new InMemoryCache();

export function getCache(): Cache {
  return defaultCache;
}

export function setCacheForTesting(c: Cache | null): void {
  defaultCache = c ?? new InMemoryCache();
}