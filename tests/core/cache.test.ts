import { describe, it, expect, vi } from 'vitest';
import { InMemoryCache, setCacheForTesting, getCache } from '@/app/core/cache';

describe('InMemoryCache', () => {
  it('stores and retrieves values', async () => {
    const c = new InMemoryCache();
    await c.set('k', { a: 1, b: 'x' }, 1000);
    expect(await c.get('k')).toEqual({ a: 1, b: 'x' });
  });

  it('returns null for a missing key', async () => {
    const c = new InMemoryCache();
    expect(await c.get('nope')).toBeNull();
  });

  it('honours TTL using the injected clock', async () => {
    let t = 1_000;
    const c = new InMemoryCache(() => t);
    await c.set('k', 'v', 500);
    expect(await c.get('k')).toBe('v');

    t = 1_400; // still inside TTL
    expect(await c.get('k')).toBe('v');

    t = 1_600; // expired (1000 + 500 = 1500)
    expect(await c.get('k')).toBeNull();
  });

  it('deletes entries on demand', async () => {
    const c = new InMemoryCache();
    await c.set('k', 'v', 10_000);
    await c.delete('k');
    expect(await c.get('k')).toBeNull();
  });

  it('round-trips JSON, so Date becomes ISO string', async () => {
    const c = new InMemoryCache();
    const when = new Date('2026-03-01T00:00:00Z');
    await c.set('k', { when }, 10_000);
    const back = (await c.get<{ when: string }>('k'))!;
    expect(typeof back.when).toBe('string');
    expect(back.when).toBe(when.toISOString());
  });

  it('skips caching values that cannot be JSON-serialized', async () => {
    const c = new InMemoryCache();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await c.set('k', circular, 1000);
    expect(await c.get('k')).toBeNull();
    expect(c.size()).toBe(0);
  });

  it('drops entries whose JSON got corrupted', async () => {
    const c = new InMemoryCache();
    // Reach into the store to simulate corruption.
    await c.set('k', 'v', 10_000);
    const internal = c as unknown as { store: Map<string, { json: string; expiresAt: number }> };
    internal.store.set('k', { json: '{not json', expiresAt: Date.now() + 10_000 });
    expect(await c.get('k')).toBeNull();
    expect(c.size()).toBe(0);
  });
});

describe('cache singleton + test seam', () => {
  it('returns a stable default instance until reset', () => {
    setCacheForTesting(null);
    const a = getCache();
    const b = getCache();
    expect(a).toBe(b);
  });

  it('setCacheForTesting replaces the default', () => {
    const custom = new InMemoryCache();
    setCacheForTesting(custom);
    expect(getCache()).toBe(custom);
    setCacheForTesting(null); // reset for other tests
  });
});