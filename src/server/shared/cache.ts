/**
 * In-memory server-side cache with TTL, tag-based invalidation,
 * and in-flight Promise deduplication (thundering herd protection).
 *
 * Persisted on globalThis to survive Next.js dev server rebuilds.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: Set<string>;
}

class MemoryCache {
  private entries = new Map<string, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<string>>();
  private inflight = new Map<string, Promise<unknown>>();
  private maxEntries: number;

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number, tags: string[] = []): void {
    if (this.entries.size >= this.maxEntries) {
      this.pruneExpired();
      if (this.entries.size >= this.maxEntries) {
        // Evict oldest entry if still full
        const oldestKey = this.entries.keys().next().value;
        if (oldestKey) this.delete(oldestKey);
      }
    }

    // Clean up old tags for this key if it already existed
    this.removeTagsForKey(key);

    const tagSet = new Set(tags);
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      tags: tagSet,
    });

    // Register into tag index
    for (const tag of tagSet) {
      let keySet = this.tagIndex.get(tag);
      if (!keySet) {
        keySet = new Set();
        this.tagIndex.set(tag, keySet);
      }
      keySet.add(key);
    }
  }

  delete(key: string): void {
    this.removeTagsForKey(key);
    this.entries.delete(key);
    this.inflight.delete(key);
  }

  invalidateTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;

    for (const key of Array.from(keys)) {
      this.entries.delete(key);
      this.inflight.delete(key);
    }
    this.tagIndex.delete(tag);
  }

  invalidateTags(tags: string[]): void {
    for (const tag of tags) {
      this.invalidateTag(tag);
    }
  }

  clear(): void {
    this.entries.clear();
    this.tagIndex.clear();
    this.inflight.clear();
  }

  /**
   * Transparently wraps an async fetcher:
   * 1. Returns cached value if available and fresh.
   * 2. If a request for this key is already in-flight, reuses that promise to prevent thundering herd.
   * 3. Stores fresh result with specified TTL and tags.
   */
  async wrap<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Deduplicate concurrent in-flight requests
    const running = this.inflight.get(key);
    if (running) {
      return running as Promise<T>;
    }

    const promise = fetcher()
      .then((result) => {
        this.set(key, result, ttlMs, tags);
        return result;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  private removeTagsForKey(key: string): void {
    const existing = this.entries.get(key);
    if (!existing) return;

    for (const tag of existing.tags) {
      const keySet = this.tagIndex.get(tag);
      if (keySet) {
        keySet.delete(key);
        if (keySet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
      }
    }
  }
}

const globalForCache = globalThis as unknown as {
  __crmcServerCache?: MemoryCache;
};

export const serverCache =
  globalForCache.__crmcServerCache ?? new MemoryCache();

if (process.env.NODE_ENV !== "production") {
  globalForCache.__crmcServerCache = serverCache;
}
